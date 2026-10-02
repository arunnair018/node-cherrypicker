import crypto from "node:crypto";
import { createGit, withWorktree } from "./git.js";
import { createGithub, describeGithubError } from "./github.js";

const BRACKET_PREFIX = /\[(.*?)\]/g;
const STEP_DEFS = [
  { id: "branch", label: "Create branch" },
  { id: "pick", label: "Cherry-pick commits" },
  { id: "push", label: "Push branch" },
  { id: "pr", label: "Open pull request" },
];

const safeName = (s) => s.replace(/[^\w.-]+/g, "-");
const short = (sha) => sha.slice(0, 7);

class StepError extends Error {
  constructor(step, message) {
    super(message);
    this.step = step;
  }
}
class Cancelled extends Error {}
class NothingToDo extends Error {}

/**
 * Runs one cherry-pick job. State is a plain JSON object (`job`) that is re-emitted via
 * onUpdate after every change, so a client can render purely from the latest snapshot.
 * Every target branch is worked on in its own temporary git worktree, so the user's
 * checked-out branch and uncommitted changes are never touched.
 */
export const startJob = ({ params, repo, token, onUpdate, onLog }) => {
  const { prIds, envs, draft = false } = params;
  const git = createGit(repo.root, { token });
  const gh = createGithub(token, repo);
  let cancelled = false;

  const job = {
    id: crypto.randomUUID(),
    status: "running",
    stage: "Starting",
    error: null,
    startedAt: Date.now(),
    finishedAt: null,
    repo: { owner: repo.owner, repo: repo.repo },
    params: { prIds, envs, draft },
    prs: [],
    targets: envs.map((env) => ({
      env,
      status: "pending",
      steps: STEP_DEFS.map((s) => ({ ...s, status: "pending", detail: "" })),
      picks: [],
      prUrl: null,
      note: "",
      error: null,
    })),
  };

  const update = () => onUpdate(job);
  const log = (level, message) => onLog({ t: Date.now(), level, message });
  const checkCancel = () => {
    if (cancelled) throw new Cancelled();
  };
  const setStep = (target, id, status, detail = "") => {
    const step = target.steps.find((s) => s.id === id);
    step.status = status;
    step.detail = detail;
    update();
  };

  const prepare = async () => {
    job.stage = "Reading pull requests";
    update();
    const commits = new Map();
    for (const id of prIds) {
      checkCancel();
      const pr = await gh.getPull(id);
      const prCommits = await gh.getPullCommits(id);
      job.prs.push({
        number: pr.number,
        title: pr.title,
        body: pr.body || "",
        url: pr.html_url,
        author: pr.user?.login,
        merged: pr.merged,
        commits: prCommits.length,
      });
      if (!pr.merged) log("warn", `#${pr.number} is not merged yet (state: ${pr.state}).`);
      log("info", `#${pr.number} "${pr.title}": ${prCommits.length} commit(s)`);
      prCommits.forEach((c) => commits.has(c.sha) || commits.set(c.sha, c));
    }

    job.stage = "Fetching from origin";
    update();
    checkCancel();
    await git.must(["fetch", "--quiet", "origin"], { timeout: 300_000 });
    for (const id of prIds) {
      // PR commits may not be on any branch (fork, deleted head branch)
      const res = await git.run(["fetch", "--quiet", "origin", `pull/${id}/head`], { timeout: 300_000 });
      if (!res.ok) log("warn", `Could not fetch pull/${id}/head: ${res.stderr}`);
    }

    const picks = [];
    for (const c of commits.values()) {
      const exists = await git.run(["cat-file", "-e", `${c.sha}^{commit}`]);
      if (!exists.ok) throw new Error(`Commit ${short(c.sha)} isn't available locally after fetching.`);
      picks.push({
        sha: c.sha,
        subject: c.subject,
        status: c.isMerge ? "skipped" : "pending",
        message: c.isMerge ? "Merge commit, skipped" : "",
      });
    }
    return picks;
  };

  const buildPr = (env) => {
    const first = job.prs[0];
    let body = "#### Previous PR - \n";
    job.prs.forEach((p) => (body += `- #${p.number}\n\n`));
    body += first.body;
    return {
      title: `[${env}] ${first.title.replace(BRACKET_PREFIX, "").trim()}`,
      body,
    };
  };

  const applyPicks = async (wt, target) => {
    for (const pick of target.picks) {
      checkCancel();
      if (pick.status === "skipped") continue;
      pick.status = "running";
      update();
      const res = await wt.run(["cherry-pick", "-x", "--allow-empty", pick.sha]);
      if (res.ok) {
        pick.status = "done";
        update();
        continue;
      }
      const out = `${res.stderr}\n${res.stdout}`;
      const unmerged = await wt.run(["diff", "--name-only", "--diff-filter=U"]);
      const conflicts = unmerged.stdout.split("\n").filter(Boolean);
      if (conflicts.length) {
        await wt.run(["cherry-pick", "--abort"]);
        pick.status = "failed";
        pick.message = `Conflict in ${conflicts.join(", ")}`;
        throw new StepError("pick", `Conflict applying ${short(pick.sha)} in ${conflicts.join(", ")}. Resolve manually.`);
      }
      if (/now empty|nothing to commit/i.test(out)) {
        await wt.run(["cherry-pick", "--skip"]);
        pick.status = "skipped";
        pick.message = "Already on this branch";
        update();
        continue;
      }
      await wt.run(["cherry-pick", "--abort"]);
      pick.status = "failed";
      pick.message = res.stderr.split("\n")[0];
      throw new StepError("pick", `Failed applying ${short(pick.sha)}: ${res.stderr.split("\n")[0]}`);
    }
    const ahead = await wt.run(["rev-list", "--count", `refs/remotes/origin/${target.env}..HEAD`]);
    if (ahead.stdout === "0") throw new NothingToDo(`Everything is already on ${target.env}.`);
  };

  const runTarget = async (target, picks) => {
    const { env } = target;
    const branch = `pr-${prIds.join("-")}-cp-${safeName(env)}`;
    let pushed = false;
    target.status = "running";
    target.picks = picks.map((p) => ({ ...p }));
    update();
    log("info", `[${env}] starting`);

    try {
      checkCancel();
      const existing = await gh.findOpenPull(branch, env).catch(() => null);
      if (existing) {
        target.steps.forEach((s) => (s.status = "skipped"));
        target.prUrl = existing.html_url;
        target.note = "A pull request for this already exists";
        target.status = "done";
        log("info", `[${env}] PR already open: ${existing.html_url}`);
        return;
      }

      setStep(target, "branch", "running");
      const hasBase = await git.run(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${env}`]);
      if (!hasBase.ok) throw new StepError("branch", `Branch "${env}" doesn't exist on origin.`);

      await withWorktree(git, { branch, base: env }, async (wt) => {
        setStep(target, "branch", "done", branch);

        setStep(target, "pick", "running");
        await applyPicks(wt, target);
        const applied = target.picks.filter((p) => p.status === "done").length;
        setStep(target, "pick", "done", `${applied} applied`);

        checkCancel();
        setStep(target, "push", "running");
        const push = await wt.run(["push", "--force", "origin", `${branch}:refs/heads/${branch}`]);
        if (!push.ok) throw new StepError("push", `Push failed: ${push.stderr.split("\n").pop()}`);
        pushed = true;
        setStep(target, "push", "done");

        checkCancel();
        setStep(target, "pr", "running");
        try {
          const { title, body } = buildPr(env);
          const pr = await gh.createPull({ title, body, head: branch, base: env, draft });
          target.prUrl = pr.html_url;
        } catch (error) {
          throw new StepError("pr", describeGithubError(error));
        }
        setStep(target, "pr", "done", `#${target.prUrl.split("/").pop()}`);
      });
      target.status = "done";
      log("info", `[${env}] PR created: ${target.prUrl}`);
    } catch (error) {
      if (error instanceof NothingToDo) {
        target.status = "skipped";
        target.note = error.message;
        target.steps.forEach((s) => s.status === "pending" && (s.status = "skipped"));
        log("info", `[${env}] ${error.message}`);
      } else if (error instanceof Cancelled) {
        target.status = "cancelled";
        target.steps.forEach((s) => ["pending", "running"].includes(s.status) && (s.status = "skipped"));
      } else {
        const stepId = error.step || target.steps.find((s) => s.status === "running")?.id || "branch";
        const step = target.steps.find((s) => s.id === stepId);
        step.status = "failed";
        step.detail = error.message;
        target.steps.forEach((s) => s.status === "pending" && (s.status = "skipped"));
        target.status = "failed";
        target.error = error.message;
        log("error", `[${env}] ${error.message}`);
      }
      if (pushed && !target.prUrl) {
        const del = await git.run(["push", "origin", "--delete", branch]);
        log(del.ok ? "info" : "warn", `[${env}] ${del.ok ? "removed" : "could not remove"} remote branch ${branch}`);
      }
    }
    update();
  };

  const done = (async () => {
    try {
      const picks = await prepare();
      for (const target of job.targets) {
        job.stage = `Picking into ${target.env}`;
        update();
        if (cancelled) {
          target.status = "cancelled";
          continue;
        }
        await runTarget(target, picks);
      }
      const statuses = job.targets.map((t) => t.status);
      job.status = cancelled
        ? "cancelled"
        : statuses.includes("failed")
          ? "failed"
          : "done";
      job.stage = "Finished";
    } catch (error) {
      if (error instanceof Cancelled) {
        job.status = "cancelled";
      } else {
        job.status = "failed";
        job.error = error.status ? describeGithubError(error) : error.message;
        log("error", job.error);
      }
      job.targets.forEach((t) => t.status === "pending" && (t.status = "cancelled"));
    }
    job.finishedAt = Date.now();
    update();
  })();

  return {
    job,
    done,
    cancel: () => {
      cancelled = true;
      log("warn", "Cancelling after the current step…");
    },
  };
};

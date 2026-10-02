import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

export class GitError extends Error {
  constructor(message, { stdout = "", stderr = "", args = [] } = {}) {
    super(message);
    this.name = "GitError";
    this.stdout = stdout;
    this.stderr = stderr;
    this.args = args;
  }
}

/**
 * A thin wrapper around the git binary scoped to one directory.
 * Everything goes through execFile (no shell), so branch names / shas can't inject commands.
 * The GitHub token (if any) is handed to git through env config, never argv or disk.
 */
export const createGit = (cwd, { token } = {}) => {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" };
  if (token) {
    const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
    env.GIT_CONFIG_COUNT = "1";
    env.GIT_CONFIG_KEY_0 = "http.https://github.com/.extraheader";
    env.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${basic}`;
  }

  const run = async (args, { timeout = 120_000 } = {}) => {
    try {
      const { stdout, stderr } = await execFileAsync("git", ["-C", cwd, ...args], {
        env,
        timeout,
        maxBuffer: 32 * 1024 * 1024,
      });
      return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (error) {
      return {
        ok: false,
        stdout: (error.stdout || "").toString().trim(),
        stderr: (error.stderr || error.message || "").toString().trim(),
      };
    }
  };

  const must = async (args, opts) => {
    const res = await run(args, opts);
    if (!res.ok) {
      throw new GitError(res.stderr || res.stdout || `git ${args[0]} failed`, {
        ...res,
        args,
      });
    }
    return res.stdout;
  };

  return { cwd, token, run, must };
};

const expandHome = (p) =>
  p === "~" || p.startsWith("~/") ? path.join(os.homedir(), p.slice(1)) : p;

export const parseGithubRemote = (url = "") => {
  const match = url.match(/github\.com[:/]+([^/]+)\/(.+?)(?:\.git)?\/?$/i);
  return match ? { owner: match[1], repo: match[2] } : null;
};

/** Validates a user supplied path and describes the repo (owner/repo, default branch, remote branches). */
export const inspectRepo = async (inputPath) => {
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("Enter the path to a local git repository.");
  }
  const dir = path.resolve(expandHome(inputPath.trim()));
  let stat;
  try {
    stat = await fs.stat(dir);
  } catch {
    throw new Error(`Path not found: ${dir}`);
  }
  if (!stat.isDirectory()) throw new Error(`Not a directory: ${dir}`);

  const probe = createGit(dir);
  const top = await probe.run(["rev-parse", "--show-toplevel"]);
  if (!top.ok) throw new Error(`${dir} is not inside a git repository.`);

  const git = createGit(top.stdout);
  const remote = await git.run(["remote", "get-url", "origin"]);
  if (!remote.ok) throw new Error("This repository has no 'origin' remote.");
  const gh = parseGithubRemote(remote.stdout);
  if (!gh) {
    throw new Error(`origin (${remote.stdout}) doesn't look like a github.com remote.`);
  }

  const head = await git.run(["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]);
  const branchList = await git.run([
    "for-each-ref",
    "--format=%(refname:short)",
    "refs/remotes/origin",
  ]);
  const branches = branchList.stdout
    .split("\n")
    .map((b) => b.replace(/^origin\//, ""))
    .filter((b) => b && b !== "HEAD" && b !== "origin");
  const current = await git.run(["rev-parse", "--abbrev-ref", "HEAD"]);
  const status = await git.run(["status", "--porcelain"]);

  return {
    root: top.stdout,
    remoteUrl: remote.stdout,
    owner: gh.owner,
    repo: gh.repo,
    defaultBranch: head.ok ? head.stdout.replace(/^origin\//, "") : branches[0] || "main",
    currentBranch: current.stdout,
    dirty: status.stdout.length > 0,
    branches,
  };
};

/** Runs fn with a temporary worktree checked out at origin/<base> on a fresh branch. */
export const withWorktree = async (git, { branch, base }, fn) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cherrypicker-"));
  await git.run(["worktree", "prune"]);
  try {
    await git.must([
      "worktree", "add", "--no-track", "-B", branch, dir, `refs/remotes/origin/${base}`,
    ]);
    return await fn(createGit(dir, { token: git.token }), dir);
  } finally {
    await git.run(["worktree", "remove", "--force", dir]);
    await fs.rm(dir, { recursive: true, force: true });
    await git.run(["branch", "-D", branch]);
  }
};

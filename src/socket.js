import { inspectRepo } from "./git.js";
import { getToken } from "./auth.js";
import { startJob } from "./picker.js";
import { isLocalOrigin } from "./guard.js";
import { BRANCH_RE } from "./validate.js";

const MAX_LOG = 500;

const validate = (p) => {
  if (!p || typeof p !== "object") throw new Error("Bad request.");
  const prIds = [...new Set((p.prIds || []).map((n) => Number(n)))];
  if (!prIds.length || prIds.some((n) => !Number.isInteger(n) || n <= 0)) {
    throw new Error("Enter at least one valid pull request number.");
  }
  const envs = [...new Set((p.envs || []).map((e) => String(e).trim()).filter(Boolean))];
  if (!envs.length) throw new Error("Pick at least one target branch.");
  const bad = envs.find((e) => !BRANCH_RE.test(e));
  if (bad) throw new Error(`"${bad}" isn't a valid branch name.`);
  return { prIds, envs, draft: !!p.draft };
};

/**
 * Protocol (one job at a time, since jobs share one repo):
 *   client -> job:start (params, ack)   ack({ok, error?})
 *   client -> job:cancel (ack)
 *   client -> job:dismiss (ack)   forget a finished job (only allowed once it is no longer running)
 *   server -> job:snapshot  { job, log }   sent on connect (so a refresh recovers a running job)
 *   server -> job:update    job            full state after every change; clients just replace
 *   server -> job:log       entry          appended log line
 */
export const attachSocket = (io) => {
  let current = null; // { job, cancel, log: [] }
  let starting = false; // closes the gap between accepting a start request and the job existing

  io.engine.on("connection_error", () => {});
  io.on("connection", (socket) => {
    socket.emit("job:snapshot", current ? { job: current.job, log: current.log } : null);

    socket.on("job:start", async (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      if (starting || current?.job.status === "running") {
        return reply({ ok: false, error: "A run is already in progress." });
      }
      starting = true;
      try {
        const params = validate(payload);
        const token = getToken();
        if (!token) throw new Error("Sign in to GitHub first.");
        const repo = await inspectRepo(payload.repoPath);

        const entry = { log: [] };
        const run = startJob({
          params,
          repo,
          token,
          onUpdate: (job) => io.emit("job:update", job),
          onLog: (line) => {
            entry.log.push(line);
            if (entry.log.length > MAX_LOG) entry.log.shift();
            io.emit("job:log", line);
          },
        });
        entry.job = run.job;
        entry.cancel = run.cancel;
        current = entry;
        io.emit("job:snapshot", { job: run.job, log: entry.log });
        reply({ ok: true });
        run.done.catch((e) => console.error("job crashed", e));
      } catch (error) {
        reply({ ok: false, error: error.message });
      } finally {
        starting = false;
      }
    });

    socket.on("job:dismiss", (ack) => {
      if (current && current.job.status !== "running") {
        current = null;
        io.emit("job:snapshot", null);
      }
      if (typeof ack === "function") ack({ ok: true });
    });

    socket.on("job:cancel", (ack) => {
      if (current?.job.status === "running") current.cancel();
      if (typeof ack === "function") ack({ ok: true });
    });
  });
};

export const socketOptions = {
  allowRequest: (req, callback) => callback(null, isLocalOrigin(req.headers.origin)),
};

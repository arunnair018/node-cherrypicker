import { useEffect, useState } from "react";

const HISTORY_KEY = "cherrypicker.history.v1";
const USAGE_KEY = "cherrypicker.usage.v1";
const MAX_HISTORY = 10;

const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota */
  }
};

/**
 * Keeps the last 10 finished runs plus a per-branch count of PRs created
 * (used to surface frequently used targets). Both live in this browser only.
 */
export const useHistory = (job) => {
  const [history, setHistory] = useState(() => load(HISTORY_KEY, []));
  const [usage, setUsage] = useState(() => load(USAGE_KEY, {}));

  useEffect(() => {
    if (!job || job.status === "running") return;
    setHistory((prev) => {
      if (prev.some((h) => h.id === job.id)) return prev; // already recorded (e.g. page reload)
      const entry = {
        id: job.id,
        at: job.finishedAt || Date.now(),
        repo: `${job.repo.owner}/${job.repo.repo}`,
        prIds: job.params.prIds,
        status: job.status,
        targets: job.targets.map((t) => ({ env: t.env, status: t.status, prUrl: t.prUrl })),
      };
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      save(HISTORY_KEY, next);
      setUsage((u) => {
        const nu = { ...u };
        entry.targets.forEach((t) => t.prUrl && (nu[t.env] = (nu[t.env] || 0) + 1));
        save(USAGE_KEY, nu);
        return nu;
      });
      return next;
    });
  }, [job]);

  const clear = () => {
    setHistory([]);
    save(HISTORY_KEY, []);
  };

  return { history, usage, clearHistory: clear };
};

import { useEffect, useState } from "react";

const KEY = "cherrypicker.settings.v1";

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
};

export const parseServers = (text) => [...new Set(text.split(/[\s,]+/).filter(Boolean))];

/** repoPath + the raw whitespace-separated server string, persisted in the browser. */
export const useSettings = (defaults) => {
  const [settings, setSettings] = useState(() => {
    const saved = read();
    return { repoPath: saved.repoPath ?? "", serversText: saved.serversText ?? "" };
  });

  // fill blanks from server-side defaults (env / cwd) once they arrive
  useEffect(() => {
    if (!defaults) return;
    setSettings((s) => ({
      repoPath: s.repoPath || defaults.repoPath || "",
      serversText: s.serversText || (defaults.servers || []).join(" "),
    }));
  }, [defaults]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* private mode */
    }
  }, [settings]);

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));
  return [settings, update];
};

import { useEffect, useRef, useState } from "react";
import { api } from "./api";

const KEY = "cherrypicker.settings.v1";

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
};

export const parseServers = (text) => [...new Set(text.split(/[\s,]+/).filter(Boolean))];

/**
 * repoPath + the whitespace-separated server list.
 * Both are saved by the backend in an encrypted file on the machine running the app, which is the source of truth, so
 * they survive restarts, clearing the browser, switching browsers and private windows. localStorage is kept as a fast
 * first paint and a fallback.
 */
export const useSettings = (defaults) => {
  const [settings, setSettings] = useState(() => {
    const saved = read();
    return { repoPath: saved.repoPath ?? "", serversText: saved.serversText ?? "" };
  });
  // What is known to be on disk (null = nothing saved yet). repoPath is the text that was saved, as typed.
  const onDisk = useRef({ servers: null, repoPath: null });

  // Once the server answers: a saved value wins; otherwise keep what the browser had, else the first-run default.
  useEffect(() => {
    if (!defaults) return;
    const serversFromServer = (defaults.servers || []).join(" ");
    onDisk.current = {
      servers: defaults.serversStored ? serversFromServer : null,
      repoPath: defaults.repoStored ? defaults.repoPath : null,
    };
    setSettings((s) => ({
      repoPath: defaults.repoStored ? defaults.repoPath : s.repoPath || defaults.repoPath || "",
      serversText: defaults.serversStored ? serversFromServer : s.serversText || serversFromServer,
    }));
  }, [defaults]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* private mode */
    }
  }, [settings]);

  // Save the server list (debounced). Skipped until the server has answered and when nothing changed.
  useEffect(() => {
    if (!defaults) return;
    const list = parseServers(settings.serversText);
    const text = list.join(" ");
    if (onDisk.current.servers === text) return;
    if (onDisk.current.servers === null && !text) return; // nothing to save yet
    const timer = setTimeout(() => {
      api.saveSettings({ servers: list }).then(() => (onDisk.current.servers = text)).catch(() => {
        /* read-only disk etc.: localStorage still holds it */
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [settings.serversText, defaults]);

  // Save the repository path (debounced). The server only accepts real git repositories, so half-typed paths are
  // rejected quietly and only a valid one is remembered. Clearing the field clears the saved path.
  useEffect(() => {
    if (!defaults) return;
    const path = settings.repoPath.trim();
    if (onDisk.current.repoPath === path) return;
    if (onDisk.current.repoPath === null && !path) return;
    const timer = setTimeout(() => {
      api.saveSettings({ repoPath: path }).then(() => (onDisk.current.repoPath = path)).catch(() => {
        /* not a repo (yet) or read-only disk: try again on the next change */
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [settings.repoPath, defaults]);

  const update = (patch) => setSettings((s) => ({ ...s, ...patch }));
  return [settings, update];
};

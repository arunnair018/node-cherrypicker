import express from "express";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { inspectRepo } from "./git.js";
import { createGithub, describeGithubError } from "./github.js";
import { loadState, saveState } from "./store.js";
import { BRANCH_RE } from "./validate.js";
import { authStatus, getToken, loginWithGhCli, loginWithToken, logout } from "./auth.js";

const appDir = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."));

// Opens the OS-native folder dialog on this machine (the server is local) and resolves the chosen
// absolute path, or null if cancelled. Browsers can't reveal real paths, so this is done server side.
const chooseFolder = () =>
  new Promise((resolve, reject) => {
    const prompt = "Select your git repository";
    const start = os.homedir();
    const [cmd, args] =
      process.platform === "darwin"
        ? ["osascript", ["-e", `POSIX path of (choose folder with prompt "${prompt}" default location POSIX file "${start}")`]]
        : process.platform === "win32"
          ? ["powershell", ["-NoProfile", "-Command", `Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.Description = '${prompt}'; if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }`]]
          : ["zenity", ["--file-selection", "--directory", `--title=${prompt}`, `--filename=${start}/`]];
    execFile(cmd, args, { timeout: 5 * 60_000 }, (error, stdout, stderr) => {
      if (error) {
        if (error.code === "ENOENT") {
          return reject(new Error("No folder dialog available here. Type the path instead."));
        }
        // user pressed cancel (osascript -128 / zenity exit 1)
        if (/-128|User canceled/i.test(stderr) || error.code === 1) return resolve(null);
        return reject(new Error("Couldn't open the folder dialog. Type the path instead."));
      }
      resolve(stdout.trim().replace(/[\\/]+$/, "") || null);
    });
  });

export const parseList = (value = "") =>
  [...new Set(String(value).split(/[\s,]+/).filter(Boolean))];

const wrap = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (error) {
    res.status(error.status && error.status < 500 && !error.response ? error.status : 400).json({
      error: error.response ? describeGithubError(error) : error.message,
    });
  }
};

export const createRouter = () => {
  const router = express.Router();
  router.use(express.json());

  // Defaults for the UI. Everything is overridable in the sidebar.
  // First-run default for the repository: GIT_BASE_DIRECTORY+REPO, else the folder the app was started from if that is a
  // git repo. The app's own folder is skipped, otherwise a fresh clone would pre-select node-cherrypicker itself.
  const defaultRepoPath = async () => {
    const start =
      process.env.GIT_BASE_DIRECTORY && process.env.REPO
        ? path.join(process.env.GIT_BASE_DIRECTORY, process.env.REPO)
        : process.env.INIT_CWD || process.cwd();
    try {
      const root = (await inspectRepo(start)).root;
      return fs.realpathSync(root) === appDir ? "" : root;
    } catch {
      return ""; // not a repo
    }
  };

  // Saved (encrypted) settings win; env/cwd values are only first-run defaults.
  router.get("/config", wrap(async () => {
    const saved = loadState();
    const hasServers = Array.isArray(saved?.servers);
    const hasRepo = typeof saved?.repoPath === "string";
    return {
      repoPath: hasRepo ? saved.repoPath : await defaultRepoPath(),
      repoStored: hasRepo,
      servers: hasServers ? saved.servers : parseList(process.env.SERVER_BRANCHES),
      serversStored: hasServers,
    };
  }));

  // Persist settings in the encrypted store. Send any of: { servers, repoPath }.
  router.put("/settings", wrap(async (req) => {
    const { servers, repoPath } = req.body || {};
    const patch = {};
    if (servers !== undefined) {
      if (!Array.isArray(servers) || servers.length > 300) throw new Error("servers must be a list of at most 300 branch names.");
      const list = [...new Set(servers.map((s) => String(s).trim()).filter(Boolean))];
      const bad = list.find((s) => s.length > 200 || !BRANCH_RE.test(s));
      if (bad) throw new Error(`"${bad.slice(0, 40)}" isn't a valid branch name.`);
      patch.servers = list;
    }
    if (repoPath !== undefined) {
      if (typeof repoPath !== "string" || repoPath.length > 1024 || repoPath.includes("\0")) throw new Error("Invalid repository path.");
      // Only real git repositories are remembered (the verified top-level folder). An empty string clears it.
      patch.repoPath = repoPath.trim() === "" ? "" : (await inspectRepo(repoPath)).root;
    }
    if (!Object.keys(patch).length) throw new Error("Nothing to save.");
    const next = saveState(patch);
    return { servers: next.servers, repoPath: next.repoPath };
  }));

  router.get("/auth", wrap(async () => authStatus()));
  router.post("/auth/gh", wrap(async () => {
    await loginWithGhCli();
    return authStatus();
  }));
  router.post("/auth/token", wrap(async (req) => {
    await loginWithToken(req.body?.token);
    return authStatus();
  }));
  router.post("/auth/logout", wrap(async () => {
    logout();
    return authStatus();
  }));

  router.post("/repo/browse", wrap(async () => ({ path: await chooseFolder() })));
  router.post("/repo/inspect", wrap(async (req) => inspectRepo(req.body?.path)));

  // Lightweight PR preview shown under the PR input
  router.post("/prs", wrap(async (req) => {
    const token = getToken();
    if (!token) throw Object.assign(new Error("Sign in to GitHub first."), { status: 401 });
    const { owner, repo, ids } = req.body || {};
    const gh = createGithub(token, { owner, repo });
    return Promise.all(
      (ids || []).slice(0, 20).map(async (id) => {
        try {
          const pr = await gh.getPull(id);
          return {
            number: pr.number,
            title: pr.title,
            author: pr.user?.login,
            state: pr.merged ? "merged" : pr.state,
            commits: pr.commits,
            url: pr.html_url,
          };
        } catch (error) {
          return { number: id, error: describeGithubError(error) };
        }
      })
    );
  }));

  return router;
};

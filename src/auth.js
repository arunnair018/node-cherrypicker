import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Octokit } from "octokit";

const execFileAsync = promisify(execFile);

// The token only ever lives in memory: restart the tool and it re-reads the
// GitHub CLI session (or you paste a token again).
const state = { token: null, user: null, source: null };

export const getToken = () => state.token;

export const authStatus = () => ({
  signedIn: !!state.token,
  user: state.user,
  source: state.source,
});

const signIn = async (token, source) => {
  let data;
  try {
    ({ data } = await new Octokit({ auth: token, baseUrl: process.env.GITHUB_API_URL || undefined }).rest.users.getAuthenticated());
  } catch (error) {
    throw new Error(
      error.status === 401 ? "GitHub rejected that token." : `Could not reach GitHub: ${error.message}`
    );
  }
  state.token = token;
  state.source = source;
  state.user = { login: data.login, name: data.name, avatar: data.avatar_url };
};

export const loginWithToken = (token) => {
  if (!token || typeof token !== "string") throw new Error("Paste a GitHub token.");
  return signIn(token.trim(), "token");
};

export const loginWithGhCli = async () => {
  let token = "";
  try {
    ({ stdout: token } = await execFileAsync("gh", ["auth", "token"], { timeout: 10_000 }));
  } catch {
    throw new Error("GitHub CLI isn't installed or isn't logged in. Run `gh auth login`, or paste a token.");
  }
  if (!token.trim()) throw new Error("GitHub CLI returned no token. Run `gh auth login`.");
  await signIn(token.trim(), "gh");
};

export const logout = () => {
  state.token = state.user = state.source = null;
};

export const initAuth = async () => {
  try {
    if (process.env.GITHUB_ACCESS_TOKEN) await signIn(process.env.GITHUB_ACCESS_TOKEN, "env");
    else await loginWithGhCli();
  } catch {
    /* not signed in, the UI will prompt */
  }
};

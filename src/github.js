import { Octokit } from "octokit";

export const createGithub = (token, { owner, repo }) => {
  const octokit = new Octokit({ auth: token, baseUrl: process.env.GITHUB_API_URL || undefined });

  const getPull = async (number) => {
    const { data } = await octokit.rest.pulls.get({ owner, repo, pull_number: number });
    return data;
  };

  const getPullCommits = async (number) => {
    const commits = await octokit.paginate(octokit.rest.pulls.listCommits, {
      owner,
      repo,
      pull_number: number,
      per_page: 100,
    });
    return commits.map((c) => ({
      sha: c.sha,
      subject: c.commit.message.split("\n")[0],
      isMerge: c.parents.length > 1,
    }));
  };

  const findOpenPull = async (head, base) => {
    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      head: `${owner}:${head}`,
      base,
    });
    return data[0] || null;
  };

  const createPull = async ({ title, body, head, base, draft }) => {
    const { data } = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      body,
      head,
      base,
      draft,
    });
    return data;
  };

  return { getPull, getPullCommits, findOpenPull, createPull };
};

export const describeGithubError = (error) => {
  switch (error?.status) {
    case 401:
      return "GitHub rejected the token. Sign in again.";
    case 403:
      return "GitHub denied access (token scope or SSO authorisation missing?).";
    case 404:
      return "Not found on GitHub (wrong number, or the token can't see this repo).";
    case 422:
      return `GitHub refused the request: ${error.response?.data?.errors?.[0]?.message || error.message}`;
    default:
      return error?.message || "Unknown GitHub error.";
  }
};

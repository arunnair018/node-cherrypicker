export const octo_get_pull = async (octokit, pull_number) => {
  try {
    const resp = await octokit.request(
      "GET /repos/{owner}/{repo}/pulls/{pull_number}",
      {
        owner: process.env.REPO_OWNER,
        repo: process.env.REPO,
        pull_number: pull_number,
      }
    );
    return resp.data;
  } catch (error) {
    console.log(error);
  }
};

export const octo_get_commits = async (octokit, pr_ids) => {
  try {
    const res = await Promise.all(
      pr_ids.map((id) => {
        return octokit.request(
          "GET /repos/{owner}/{repo}/pulls/{pull_number}/commits{?per_page,page}",
          {
            owner: process.env.REPO_OWNER,
            repo: process.env.REPO,
            pull_number: id,
          }
        );
      })
    );
    const data = res.map((res) => res.data.map((obj) => obj.sha));
    return data;
  } catch (error) {
    console.log(error);
  }
};

export const octo_pull_request = async (octokit,{ title, body, head, base }) => {
  try {
    const resp = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
      owner: process.env.REPO_OWNER,
      repo: process.env.REPO,
      title: title,
      body: body,
      head: head,
      base: base,
    });
    return resp;
  } catch (error) {
    console.log(error);
  }
};

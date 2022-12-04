import { Octokit, App } from "octokit";

const create_octokit_instance = async () => {
  const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });
  return octokit
};

export default create_octokit_instance
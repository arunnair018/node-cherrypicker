import {
  octo_create_pull_request,
  octo_get_commits,
  octo_get_pull_request,
} from "./octokit_methods.js";
import { GIT_COMMANDS } from "../utilities/git_commands.js";
import { syscmd } from "./shell_methods.js";

const cut_branch_from_base = async (base_branch, new_branch) => {
  console.log("\n cutting new branch from ", base_branch);
  try {
    await syscmd(GIT_COMMANDS.FETCH());
    await syscmd(GIT_COMMANDS.CHECKOUT(base_branch));
    await syscmd(GIT_COMMANDS.RESET_TO_ORIGIN(base_branch));
    await syscmd(GIT_COMMANDS.CHECKOUT_NEW(new_branch));
    return new_branch;
  } catch (err) {
    console.log(err);
    return "";
  }
};

const copy_commits = async (commits) => {
  console.log("\n starting picking commit");
  const commit_resp = [];
  try {
    let i = 0;
    while (i < commits.length) {
      const [success, message] = await syscmd(
        GIT_COMMANDS.PICK_SINGLE_COMMIT(commits[i])
      );
      commit_resp.push({ commit: commits[i], success, message });
      if (!success) {
        break;
      }
      i += 1;
    }
  } catch (error) {
    console.log(error);
  }
  return commit_resp;
};

const delete_branch = async (branch) => {
  console.log("\n deleting branch ", branch);
  await syscmd(GIT_COMMANDS.ABORT());
  await syscmd(GIT_COMMANDS.CHECKOUT(process.env.BASE_BRANCH));
  await syscmd(GIT_COMMANDS.DELETE(branch));
  await syscmd(GIT_COMMANDS.DELETE_ORIGIN(branch));
};

const pull_request = async (deatils, head_branch, base_branch) => {
  const resp = await octo_create_pull_request({
    title: `[${base_branch}] ${deatils.title}`,
    body: deatils.body,
    head: head_branch,
    base: base_branch,
  });
  if (resp?.status === 201) {
    return resp.data.html_url;
  }
  return false;
};

const pick_cherries = async (deatils) => {
  const envs = deatils.envs || [];
  let break_picking = false;

  const create_new_pr = async (base_branch) => {
    const logs = [];
    let new_branch = "";
    let new_pr_url = "";

    try {
      // create branch
      new_branch = await cut_branch_from_base(
        base_branch,
        `cp-${base_branch}-${deatils.branch_name}`
      );
      if (!new_branch) {
        throw new Error(
          "failed to create branch. please refer logs for more info."
        );
      }
      logs.push(`created new branch: ${new_branch}`);

      // copy new commits
      const new_commits = await copy_commits(deatils.cp_commits);
      logs.push(new_commits);
      const false_commit = new_commits.find((pick) => !pick.success) || null;
      if (!!false_commit) {
        delete_branch(new_branch);
        throw new Error(
          "Failed to pick commits. please refer logs for more info."
        );
      }

      // push changes
      const [push_success, push_message] = await syscmd(
        GIT_COMMANDS.PUSH_ORIGIN(new_branch)
      );
      if (!push_success) {
        delete_branch(new_branch);
        throw new Error(
          "Failed to push changes to remote. please refer logs for more info."
        );
      }
      logs.push(`Pushed changes successfully to remote.`);

      // create new pull request
      new_pr_url = await pull_request(deatils, new_branch, base_branch);
      if (!new_pr_url) {
        delete_branch(new_branch);
        throw new Error(
          "Failed to create a pull request. please refer logs for more info."
        );
      }
      logs.push("pull request created successfully.")
    } catch (error) {
      console.log(error);
      logs.push(error?.message || error);
      break_picking = true;
    }
    return {
      env: base_branch,
      new_branch: new_branch,
      pr: new_pr_url,
      logs: logs,
    };
  };

  let j = 0;
  const server_resp = [];
  while (j < envs.length) {
    if (!!break_picking) {
      break;
    }
    server_resp.push(await create_new_pr(envs[j]));
    j += 1;
  }
  return server_resp;
};

const prepare_pick_criteria = async (envs, pr_ids) => {
  const details = {};
  const raw_pr = await octo_get_pull_request(pr_ids[0]);
  const commits = await octo_get_commits(pr_ids);
  details.id = raw_pr.number;
  details.title = raw_pr.title;
  details.body = raw_pr.body;
  details.branch_name = raw_pr.head.ref;
  details.cp_commits = commits;
  details.envs = envs;
  details.pr_ids = pr_ids;
  return details;
};

const cherry_pick = async ({ pr_ids = [], envs = "local" }) => {
  const criteria = await prepare_pick_criteria(envs, pr_ids);
  const basket = await pick_cherries(criteria);
  return {
    data: basket,
  };
};

export default cherry_pick;

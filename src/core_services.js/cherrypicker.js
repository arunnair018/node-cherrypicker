import create_octokit_instance from "./octokit_initializer.js";
import {
  octo_get_commits,
  octo_get_pull,
  octo_pull_request,
} from "./octo_methods.js";
import { execSync } from "child_process";
import { GIT_COMMANDS } from "../utilities/git_commands.js";

export const syscmd = (command) => {
  try {
    const output = execSync(command).toString();
    return output;
  } catch (error) {
    // console.log(error.status);
    // console.log(error.message);
    // console.log(`\n\n STD_ERR: ${error.stderr.toString()} \n\n`);
    console.log(`\n\n STD_OUTPUT: ${error.stdout.toString()} \n\n`);
    return false;
  }
};

const create_dest_branch = async (base_branch, new_branch) => {
  try {
    await syscmd(GIT_COMMANDS.FETCH());
    await syscmd(GIT_COMMANDS.CHECKOUT(base_branch));
    await syscmd(GIT_COMMANDS.RESET_TO_ORIGIN(base_branch));
    await syscmd(GIT_COMMANDS.CHECKOUT_NEW(new_branch));
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

const pick_commits = async (branch, commits) => {
  console.log(`picking commits to ${branch}`);
  const resp = [];
  try {
    let i = 0;
    while (i < commits.length) {
      const pr_commits = commits[i];
      if (pr_commits.length === 1) {
        resp.push(await syscmd(GIT_COMMANDS.PICK_SINGLE_COMMIT(pr_commits[0])));
      }
      if (pr_commits.length > 1) {
        resp.push(
          await syscmd(
            GIT_COMMANDS.PICK_MULTI_COMMIT(pr_commits[0], pr_commits.pop())
          )
        );
      }
      i += 1;
    }
  } catch (error) {
    console.log(error);
  }
  return resp;
};

const delete_branch = async (branch) => {
  await syscmd(GIT_COMMANDS.ABORT());
  await syscmd(GIT_COMMANDS.CHECKOUT(process.env.BASE_BRANCH));
  await syscmd(GIT_COMMANDS.DELETE(branch));
  await syscmd(GIT_COMMANDS.DELETE_ORIGIN(branch));
};

const pull_request = async (octo, deatils, head_branch, base_branch) => {
  const resp = await octo_pull_request(octo, {
    title: `[${base_branch}] ${deatils.title}`,
    body: deatils.body,
    head: head_branch,
    base: base_branch,
  });
  if (resp.status === 201) {
    return resp.data.html_url;
  }
  return false;
};

const pick_prs = async (octo, deatils) => {
  const envs = deatils.envs || [];
  const env_resp = [];
  let break_picker = false;

  const create_new_pr = async (server) => {
    if (!envs.includes(server) || !!break_picker) {
      return;
    }
    try {
      console.log(`working on ${server}\n`);
      const new_branch = `cp-${server}-${deatils.branch_name}`;
      const new_branch_success = await create_dest_branch(server, new_branch);
      if (!new_branch_success) {
        env_resp.push({
          env: server,
          prs: "",
          message: "failed to create branch. please refer logs for more info.",
        });
        return;
      }
      const pick_commits_success = await pick_commits(
        new_branch,
        deatils.cp_commits
      );
      const contains_false = pick_commits_success.some((value) => !value);
      if (contains_false) {
        env_resp.push({
          env: server,
          new_branch: new_branch,
          prs: "",
          message: "failed to pick commits. please refer logs for more info.",
        });
        delete_branch(new_branch);
        break_picker = true;
        return;
      }
      await syscmd(GIT_COMMANDS.PUSH_ORIGIN(new_branch));
      const new_pr = await pull_request(octo, deatils, new_branch, server);
      if (!new_pr) {
        env_resp.push({
          env: server,
          new_branch: new_branch,
          pr: "",
          message:
            "Failed to create a pull request. please refer logs for more info.",
        });
        delete_branch(new_branch);
        break_picker = true;
        return;
      }
      env_resp.push({
        env: server,
        new_branch: new_branch,
        pr: new_pr,
        message: "created PR, please get a review before merge.",
      });
      return;
    } catch (error) {
      console.log(error);
    }
  };

  let j = 0;
  while (j < envs.length) {
    if (!!break_picker) {
      break;
    }
    await create_new_pr(envs[j]);
    j += 1;
  }
  return env_resp;
};

const create_pre_detail_object = (raw_pr) => {
  const deatils = {};
  deatils.id = raw_pr.number;
  deatils.title = raw_pr.title;
  deatils.body = raw_pr.body;
  deatils.branch_name = raw_pr.head.ref;
  return deatils;
};

export const cherry_pick = async ({ pr_ids, envs = "local" }) => {
  const octo = await create_octokit_instance();
  const first_pr = await octo_get_pull(octo, pr_ids[0]);
  const new_pr_details = create_pre_detail_object(first_pr);
  const commits = await octo_get_commits(octo, pr_ids);
  new_pr_details.cp_commits = commits;
  new_pr_details.envs = envs;
  new_pr_details.pr_ids = pr_ids;
  const env_resp = await pick_prs(octo, new_pr_details);
  return {
    data: env_resp,
  };
};

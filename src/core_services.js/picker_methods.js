import {
  octo_create_pull_request,
  octo_get_commits,
  octo_get_pull_request,
} from "./octokit_methods.js";
import { GIT_COMMANDS } from "../utilities/git_commands.js";
import { syscmd } from "./shell_methods.js";

const PRE_ENV_REGEX = /\[(.*?)\]/gi;

const SOCKET_ACTIONS = {
  PICK_START: "pick_start",
  PICK_PROGRESS: "pick_progress",
  PICK_COMPLETE: "pick_complete",
  COMPLETE: "complete",
  ERROR: "error",
};

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

const copy_commits = async (socket, commits) => {
  console.log("\n starting picking commit");
  const commit_resp = [];
  try {
    let i = 0;
    while (i < commits.length) {
      const [success, message] = await syscmd(
        GIT_COMMANDS.PICK_SINGLE_COMMIT(commits[i])
      );
      commit_resp.push({
        commit: commits[i],
        success,
        message: !!message ? message : "picked",
      });
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

const delete_branch = async (socket, branch, origin = true) => {
  try {
    console.log("\n deleting branch ", branch);
    if (!!origin) {
      await syscmd(GIT_COMMANDS.ABORT());
    }
    await syscmd(GIT_COMMANDS.CHECKOUT(process.env.BASE_BRANCH));
    await syscmd(GIT_COMMANDS.DELETE(branch));
    if (!!origin) {
      await syscmd(GIT_COMMANDS.DELETE_ORIGIN(branch));
    }
    socket.emit(
      SOCKET_ACTIONS.PICK_PROGRESS,
      JSON.stringify({
        success: true,
        message: "Branch deleted",
      })
    );
  } catch {
    socket.emit(
      SOCKET_ACTIONS.PICK_PROGRESS,
      JSON.stringify({
        success: false,
        message:
          "Something went wrong while deleting branch, Please refer logs.",
      })
    );
  }
};

const pull_request = async (deatils, head_branch, base_branch) => {
  const localTitle = deatils.title.replace(PRE_ENV_REGEX, "");
  const resp = await octo_create_pull_request({
    title: `[${base_branch}] ${localTitle}`,
    body: deatils.body,
    head: head_branch,
    base: base_branch,
  });
  if (resp?.status === 201) {
    return resp.data.html_url;
  }
  return false;
};

const pick_cherries = async (socket, deatils) => {
  const envs = deatils.envs || [];
  let break_picking = false;

  const create_new_pr = async (base_branch) => {
    let new_branch = "";
    let new_pr_url = "";

    try {
      // create branch
      new_branch = await cut_branch_from_base(
        base_branch,
        `pr-${deatils.id}-cp-${base_branch}`
      );
      if (!new_branch) {
        throw new Error(
          "failed to create branch. please refer logs for more info."
        );
      }
      socket.emit(
        SOCKET_ACTIONS.PICK_PROGRESS,
        JSON.stringify({
          success: true,
          message: `Created new branch: ${new_branch}`,
        })
      );

      // copy new commits
      const new_commits = await copy_commits(socket, deatils.cp_commits);
      const false_commit = new_commits.some((pick) => !pick.success);
      socket.emit(
        SOCKET_ACTIONS.PICK_PROGRESS,
        JSON.stringify({
          success: !!false_commit ? false : true,
          message: !!false_commit ? "Something went wrong while picking commits" : "Picked commits",
          commits: new_commits,
        })
      );
      if (!!false_commit) {
        throw new Error(
          "Failed to pick commits. please refer logs for more info."
        );
      }

      // push changes
      const [push_success, push_message] = await syscmd(
        GIT_COMMANDS.PUSH_ORIGIN(new_branch)
      );
      if (!push_success) {
        throw new Error(
          "Failed to push changes to remote. please refer logs for more info."
        );
      }
      socket.emit(
        SOCKET_ACTIONS.PICK_PROGRESS,
        JSON.stringify({
          success: true,
          message: `Pushed changes to remote.`,
        })
      );

      // create new pull request
      new_pr_url = await pull_request(deatils, new_branch, base_branch);
      if (!new_pr_url) {
        throw new Error(
          "Failed to create a pull request. please refer logs for more info."
        );
      }
      socket.emit(
        SOCKET_ACTIONS.PICK_PROGRESS,
        JSON.stringify({
          success: true,
          message: "Pull request created",
        })
      );
    } catch (error) {
      console.log(error);
      socket.emit(
        SOCKET_ACTIONS.PICK_PROGRESS,
        JSON.stringify({ success: false, message: error.message })
      );
      break_picking = true;
    }

    return [new_branch, new_pr_url];
  };

  let j = 0;
  while (j < envs.length) {
    if (!!break_picking) {
      socket.emit("completed");
      break;
    }
    socket.emit(SOCKET_ACTIONS.PICK_START, envs[j]);
    const [new_branch, url] = await create_new_pr(envs[j]);
    !!url
      ? await delete_branch(socket, new_branch, false)
      : await delete_branch(socket, new_branch);
    socket.emit(SOCKET_ACTIONS.PICK_COMPLETE, `${envs[j]}|${url}`);
    j += 1;
  }
};

const prepare_pick_criteria = async (envs, pr_ids, approval = "") => {
  try {
    let previous_prs = `#### Previous PR - \n`;
    pr_ids.map((id) => {
      previous_prs += `- #${id}\n\n`;
    });
    if (!!approval) {
      previous_prs += `[QA_APPROVAL](${approval})\n\n`;
    }
    const details = {};
    const raw_pr = await octo_get_pull_request(pr_ids[0]);
    const commits = await octo_get_commits(pr_ids);
    details.id = raw_pr.number;
    details.title = raw_pr.title;
    details.body = previous_prs + raw_pr.body;
    details.branch_name = raw_pr.head.ref;
    details.cp_commits = commits;
    details.envs = envs;
    details.pr_ids = pr_ids;
    return details;
  } catch (err) {
    console.error(err);
    return false;
  }
};

const cherry_pick = async (
  socket,
  { pr_ids = [], envs = "local", approval = "" }
) => {
  console.log("GOT DATA = > ", pr_ids, envs, approval);
  const criteria = await prepare_pick_criteria(envs, pr_ids, approval);
  if (!criteria) {
    socket.emit(
      SOCKET_ACTIONS.ERROR,
      "Something went wrong while getting PR information. please check logs."
    );
    socket.emit(SOCKET_ACTIONS.COMPLETE);
    return;
  }
  await pick_cherries(socket, criteria);
  socket.emit(SOCKET_ACTIONS.COMPLETE);
};

export default cherry_pick;

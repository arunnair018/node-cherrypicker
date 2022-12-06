import { execSync } from "child_process";
import { GIT_COMMANDS } from "../utilities/git_commands.js";

const post_command_actions = (success, cmdlog) => {
  if (!!success) {
    return [true, ""];
  }
  if (cmdlog.includes("is a merge but no -m option was given")) {
    console.log("\n\ncontinuing as merge commits are okay\n\n");
    return [true, "skipped a merge commit"];
  }
  if (
    cmdlog.includes(
      "The previous cherry-pick is now empty, possibly due to conflict resolution"
    )
  ) {
    execSync(GIT_COMMANDS.SKIP_PICK());
    return [true, "ran a skip because there was an empty commit"];
  }
  if (cmdlog.includes("Merge conflict")) {
    return [false, "seems like there was a conflict with this one"];
  }
  if (cmdlog.includes("could not apply")) {
    return [false, "seems like there was a cherry pick issue"];
  }
  if (cmdlog.includes("fatal: bad object")) {
    return [false, "seems like commit hasn't been made to local"];
  }
  return [false, "unknown exception, server log check needed"];
};

export const syscmd = (command) => {
  try {
    const output = execSync(command).toString();
    return post_command_actions(true, output);
  } catch (error) {
    return post_command_actions(false, error.stderr + error.stdout);
  }
};

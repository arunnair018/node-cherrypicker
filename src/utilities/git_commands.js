const BASE_COMMAND = () =>
  `git --git-dir=${process.env.GIT_DIRECTORY} --work-tree=${process.env.GIT_BASE_DIRECTORY}`;

export const GIT_COMMANDS = {
  FETCH: () => `${BASE_COMMAND()} fetch -q`,
  CHECKOUT: (branch) => `${BASE_COMMAND()} checkout --force ${branch} -q`,
  CHECKOUT_NEW: (branch) => `${BASE_COMMAND()} checkout -B ${branch} -q`,
  PULL: (branch) => `${BASE_COMMAND()} pull origin ${branch} -q`,
  RESET_TO_ORIGIN: (branch) =>
    `${BASE_COMMAND()} reset --hard origin/${branch} -q`,
  PICK_SINGLE_COMMIT: (sha) =>
    `${BASE_COMMAND()} cherry-pick --allow-empty  ${sha}`,
  PICK_MULTI_COMMIT: (start_sha, end_sha) =>
    `${BASE_COMMAND()} cherry-pick --allow-empty ${start_sha}^..${end_sha}`,
  ABORT: () => `${BASE_COMMAND()} cherry-pick --abort`,
  DELETE: (branch) => `${BASE_COMMAND()} branch -D ${branch}`,
  DELETE_ORIGIN: (branch) => `${BASE_COMMAND()} push -d origin ${branch}`,
  PUSH_ORIGIN: (branch) => `${BASE_COMMAND()} push origin ${branch} -q`,
};

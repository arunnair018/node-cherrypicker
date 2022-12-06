"use strict";

import {
  create_log,
  parse_branches_from_env,
} from "../controllers/log_controller.js";

export const router = (app) => {
  app.route("/api/v1/cherry-pick").post(create_log);
  app.route("/api/v1/get-branches").get(parse_branches_from_env);
};

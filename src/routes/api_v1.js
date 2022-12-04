"use strict"

import { create_log, list_logs } from "../controllers/log_controller.js"

export const router = (app) => {

  app.route('/api/v1/cherry-pick')
    .get(list_logs)
    .post(create_log);
}
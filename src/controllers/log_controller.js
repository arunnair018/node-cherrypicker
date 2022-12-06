"use strict";

import cherry_pick from "../core_services.js/picker_methods.js";

export const create_log = async (req, res) => {
  const picker_resp = await cherry_pick(req.body);
  res.status(200).json(picker_resp);
};

export const parse_branches_from_env = async (req, res) => {
  const server_branches = process.env.SERVER_BRANCHES.split(',');
  res.status(200).json(server_branches);
};

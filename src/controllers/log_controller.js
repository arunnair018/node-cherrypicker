"use strict";

import cherry_pick from "../core_services.js/picker_methods.js";

export const socketHandler = (socket) => {
  socket.emit("acceptence", "server accepted");
  socket.on("start", (data) => {
    const parsedData = JSON.parse(data);
    cherry_pick(socket, parsedData);
  });
};

export const parse_branches_from_env = async (req, res) => {
  const server_branches = process?.env?.SERVER_BRANCHES?.split(",") || [];
  res.status(200).json(server_branches);
};

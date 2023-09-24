import "./config.js";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";

import { Server } from "socket.io";
import {
  parse_branches_from_env,
  socketHandler,
} from "./src/controllers/log_controller.js";

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT || 5000;

app.use("*", cors());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

console.log(__dirname);

// serve static files
// app.get("/", (req, res) => {
//   res.sendFile(__dirname + "/static/index.html");
// });

app.get("/api/v1/get-branches", parse_branches_from_env);

const server = app.listen(PORT, async () => {
  console.log(`server started, listening at port ${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
io.on("connection", (socket) => {
  socketHandler(socket);
  socket.on("disconnect", () => {
    console.log("connection terminated");
  });
});

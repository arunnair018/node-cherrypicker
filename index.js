#!/usr/bin/env node
import "./config.js";
import express from "express";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { Server } from "socket.io";

import { localOnly } from "./src/guard.js";
import { createRouter } from "./src/routes.js";
import { attachSocket, socketOptions } from "./src/socket.js";
import { initAuth } from "./src/auth.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "client-vite/client/dist");
const PORT = Number(process.env.PORT) || 8086;
const HOST = "127.0.0.1"; // never exposed on the network

const app = express();
app.disable("x-powered-by");
app.use(localOnly);
app.use("/api", createRouter());

if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const server = http.createServer(app);
attachSocket(new Server(server, socketOptions));

await initAuth();
server.listen(PORT, HOST, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Cherrypicker running at ${url}${fs.existsSync(dist) ? "" : " (API only, run the client with `npm run dev`)"}`);
  if (fs.existsSync(dist) && !process.env.NO_OPEN) {
    const opener = { darwin: "open", win32: "explorer" }[process.platform] || "xdg-open";
    execFile(opener, [url], () => {});
  }
});

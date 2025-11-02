import express from "express";
import { WebSocketServer } from "ws";
import { Client } from "ssh2";

const app = express();
const server = app.listen(process.env.PORT || 3000, () =>
  console.log("Server running on port", process.env.PORT)
);

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  // Simple token check: ?token=YOUR_ACCESS_TOKEN
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("df1e0b1a-66c9-48a0-aa0d-ce274583fd3a");

  if (token !== process.env.ACCESS_TOKEN) {
    ws.send("❌ Unauthorized: Invalid token");
    return ws.close();
  }

  ws.send("🔗 Connected to secure SSH bridge");

  const ssh = new Client();
  ssh
    .on("ready", () => {
      ws.send("✅ SSH connected\n");
      ssh.shell((err, stream) => {
        if (err) return ws.send("Shell error: " + err.message);

        ws.on("message", (msg) => stream.write(msg + "\n"));
        stream.on("data", (data) => ws.send(data.toString()));
        stream.on("close", () => ws.close());
      });
    })
    .on("error", (err) => ws.send("SSH error: " + err.message))
    .connect({
      host: process.env.SSH_HOST,
      port: 22,
      username: process.env.SSH_USER,
      password: process.env.SSH_PASS,
    });
});

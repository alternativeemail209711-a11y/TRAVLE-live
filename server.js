/* ==========================================================================
   TRAVLE — Live Edition — server.js
   A small always-on server that does two jobs:
     1. Serves the game (everything in /public) as a normal website.
     2. Optionally opens a connection to a TikTok LIVE room and forwards
        every chat comment to the browser over a WebSocket, so guesses
        typed by real viewers reach the game without you retyping them.

   The TikTok half uses the community "tiktok-live-connector" package.
   TikTok has no official public API for this — this library works by
   reverse-engineering TikTok's own web client, which means it can break
   whenever TikTok changes something on their end. That's exactly why the
   manual "type it yourself" controls in the game are never removed: if
   the auto-listener misbehaves or TikTok changes something, you can keep
   hosting without missing a beat.
   ========================================================================== */

import express from "express";
import http from "http";
import { Server } from "socket.io";
import { TikTokLiveConnection, WebcastEvent } from "tiktok-live-connector";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

/* ------------------------------------------------------------------ *
 * TikTok LIVE connection state (one room at a time, shared by anyone
 * watching this server's dashboard — fine for a single-host setup).
 * ------------------------------------------------------------------ */

let liveConn = null;
let liveUsername = null;

// Defensive extraction: the library is reverse-engineered and its event
// payload shape has drifted before (a comment can arrive as data.comment,
// data.content, data.text, or nested under data.user) — so nothing here
// trusts a single field name.
function extractComment(data) {
  const commenter =
    data?.user?.uniqueId || data?.user?.nickname ||
    data?.uniqueId || data?.nickname || "viewer";
  const text =
    (typeof data?.comment === "string" && data.comment) ||
    (typeof data?.content === "string" && data.content) ||
    (typeof data?.text === "string" && data.text) ||
    (typeof data?.message === "string" && data.message) || "";
  return { commenter: String(commenter).trim(), text: text.trim() };
}

async function stopLive() {
  if (liveConn) {
    try { await liveConn.disconnect(); } catch (e) { /* already gone, ignore */ }
  }
  liveConn = null;
  liveUsername = null;
}

io.on("connection", (socket) => {
  // tell a newly-loaded page what the current state is
  socket.emit("tiktok-status", liveConn
    ? { connected: true, username: liveUsername }
    : { connected: false });

  socket.on("tiktok-connect", async (usernameRaw) => {
    const username = String(usernameRaw || "").trim().replace(/^@/, "");
    if (!username) {
      socket.emit("tiktok-status", { connected: false, error: "Enter a TikTok username first." });
      return;
    }

    await stopLive();
    liveUsername = username;
    io.emit("tiktok-status", { connected: false, username, connecting: true });

    const conn = new TikTokLiveConnection(username, {
      signApiKey: process.env.TIKTOK_SIGN_API_KEY || undefined,
    });

    conn.on(WebcastEvent.CHAT, (data) => {
      const { commenter, text } = extractComment(data);
      if (text) io.emit("tiktok-comment", { commenter, text });
    });

    // Registered defensively — different versions of this library have used
    // different event names for "the room went offline / socket dropped".
    ["disconnected", "streamEnd", "close"].forEach((evtName) => {
      try {
        conn.on(evtName, () => {
          if (liveConn === conn) {
            liveConn = null;
            io.emit("tiktok-status", { connected: false, username, reason: "Stream ended or connection dropped." });
          }
        });
      } catch (e) { /* event name not supported by this version — fine, skip it */ }
    });

    try {
      const state = await conn.connect();
      liveConn = conn;
      io.emit("tiktok-status", { connected: true, username, roomId: state?.roomId });
    } catch (err) {
      liveConn = null;
      io.emit("tiktok-status", { connected: false, username, error: String((err && err.message) || err) });
    }
  });

  socket.on("tiktok-disconnect", async () => {
    await stopLive();
    io.emit("tiktok-status", { connected: false });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("TRAVLE live server running on port " + PORT));

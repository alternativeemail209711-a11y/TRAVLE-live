# TRAVLE — Live Edition

A host-controlled version of the geography game TRAVLE, built to run on your
Android phone and be shown to your TikTok LIVE audience through **Mobile
Gaming LIVE Mode**. You never touch code — just follow the steps below.

## What this actually is

A small always-on server (so it can optionally listen to your TikTok LIVE
chat automatically) plus the game itself:

- `server.js` — the server: hosts the game and (optionally) connects to your TikTok LIVE room
- `package.json` — tells Render which small libraries the server needs
- `public/index.html` — the game screen
- `public/style.css` — the look
- `public/app.js` — game logic: rules, scoring, leaderboard, hints
- `public/globe.js` — the interactive draggable/zoomable globe
- `public/data.js` — land-border data for 166 countries
- `public/coords.js` — rough map coordinates, used as a backup for the handful of tiny countries the globe can't draw a shape for

You never run anything yourself — GitHub stores the files, Render runs the
server continuously and gives you a permanent web address.

**Auto-chat is optional.** If you never connect a TikTok username in
Settings, the game behaves exactly like a normal webpage — you just won't
have the option to skip typing chat's guesses in yourself.

---

## PART 1 — Put the files on GitHub

1. Go to **github.com** and log in.
2. Click **+** → **New repository**. Name it `travle-live`, keep it
   **Public**, click **Create repository**.
3. Click **"uploading an existing file."**
4. Drag in `server.js`, `package.json`, and `README.md` from the top level.
5. Now you need a `public` **folder** in the repo (not just files) —
   GitHub's upload box supports this: drag in the whole `public` folder at
   once (with `index.html`, `style.css`, `app.js`, `globe.js`, `data.js`,
   `coords.js` inside it) and GitHub will recreate the folder structure
   automatically. If your browser only lets you pick files, drag the
   **folder icon itself** into the upload box rather than opening it first.
6. Scroll down, click **Commit changes**.
7. Double-check on the repo's main page that you see a `public/` folder
   link, not six loose files — if the files ended up loose at the top
   level instead of inside `public/`, open each one, click the pencil
   (edit) icon, and rename e.g. `index.html` to `public/index.html`, which
   moves it into that folder. Repeat for the 5 other frontend files.

---

## PART 2 — Deploy it on Render

This time it's a **Web Service**, not a Static Site — the server needs to
stay running so it can hold a live connection to TikTok.

1. Go to **render.com** and log in.
2. Click **New +** → **Web Service**.
3. Connect GitHub if asked, then select the `travle-live` repository.
4. On the setup screen:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** the free tier works, but see the warning below
5. Before clicking create, open **Advanced** → **Environment Variables**
   and add one (see Part 3 for how to get the value):
   - **Key:** `TIKTOK_SIGN_API_KEY`
   - **Value:** *(from eulerstream.com — Part 3)*
   You can skip this for now and add it later if you just want to try the
   game without auto-chat first.
6. Click **Create Web Service**. Wait 1–2 minutes for the first build.
   Render gives you a permanent address like
   `https://travle-live-xxxx.onrender.com` — bookmark it.

> ⚠️ **Free-tier sleep warning:** Render's free Web Services fall asleep
> after 15 minutes with no traffic, and take 30–60 seconds to wake back up
> on the next visit. That's a real risk mid-stream. Two ways to avoid it:
> open your game link and leave the tab open for a few minutes **before**
> you go live (this wakes it up, and an open page counts as traffic that
> keeps it awake), or upgrade that one service to Render's cheapest paid
> tier (a few dollars a month) so it never sleeps at all — worth it if you
> stream regularly.

> **Making changes later:** tell me what to change, I'll hand you updated
> file(s), you replace that same file in GitHub (drag it in, confirm
> "replace," commit). Render redeploys automatically within a minute or two.

---

## PART 3 — Turning on TikTok auto-chat (optional)

This uses an **unofficial** method — TikTok doesn't provide auto-chat
access to ordinary creators, so this works by the same technique real-time
chat overlay tools use. It can occasionally misbehave if TikTok changes
something on their end, which is exactly why every manual control (typing
a guess in yourself) still works at all times as a backup — you're never
stuck if auto-chat has a bad night.

1. Go to **eulerstream.com** and create a free account.
2. Find your **API key** in your dashboard.
3. In Render, open your service → **Environment** → add/edit
   `TIKTOK_SIGN_API_KEY` with that value → **Save Changes** (Render will
   redeploy automatically).
4. In the game, tap **⚙ Settings** → under "TikTok auto-chat," type your
   TikTok **username** (no @) → **Connect**.
5. You should see "Connected to @you — chat guesses are live." If it
   fails, the status box will show why — try again, or just keep using the
   manual guess box for that stream.

Once connected, real chat messages are read automatically: anything that
matches a country name becomes a guess under that viewer's name, scored
exactly like a manual guess. Everything else in chat is silently ignored,
so it won't spam your activity feed.

---

## PART 4 — Try it before you go live (Test Mode)

1. Open your Render address on your phone.
2. Tap **⚙** → set **Mode** to **Test** → tap **Apply settings & start new
   round**.
3. Play a round or two. Nothing here touches the leaderboard, so experiment
   freely — including trying TikTok auto-chat in Test mode with your own
   real stream, since Test only blocks scoring, not the chat connection.
4. Switch **Mode** back to **Live** (and Apply) when you're ready for real.

---

## PART 5 — Going live on TikTok

1. Open your Render game link in your phone's browser first.
2. *(Optional)* In Chrome: **⋮** → **Add to Home screen**, for a
   full-screen, app-like feel.
3. Open TikTok → **LIVE** → **Mobile Gaming** mode → follow TikTok's own
   on-screen steps to select your phone screen/browser as the broadcast
   source.
4. Go live. Your camera bubble sits over the game.
5. If you've connected TikTok auto-chat, guesses just appear as chat sends
   them. Otherwise (or as backup any time), read a guess, type the
   **viewer's name** and their **guessed country**, tap **Guess**.

---

## PART 6 — Sharing this with your friend

She doesn't need her own GitHub, Render, or eulerstream account — she can
open your same game link on her own phone and host her own session. Each
phone keeps its own separate leaderboard (stored on-device), so your scores
and hers never mix. If she wants to auto-connect her own TikTok chat, she'd
enter her own username in Settings — the one `TIKTOK_SIGN_API_KEY` on your
server works for anyone using the page, since it's just what unlocks the
connection method itself, not tied to a specific TikTok account.

---

## How the game actually plays

- The game picks a **start country** and an **end country**. Guessed
  countries build the trail inward from either end — a chain can grow from
  both sides until they connect. Guesses are unlimited — a round only ends
  when the trail connects, or when you tap **Reveal**.
- **Scoring:** 3 points for a guess that's on the *shortest possible* path
  between the two ends — this counts the moment it's guessed, even if it
  hasn't connected to the growing trail yet (it'll get absorbed
  automatically once the trail reaches it); 1 point for a guess that's
  valid and connects, just not the shortest route; 0 for a guess that's
  neither (you'll get a hint like "3 borders away from Germany" instead).
- **Hints are free**, no penalty either way:
  - **Outline hint** (💡, top bar) reveals the *shape* of one valid next
    country on the globe, no name shown. Tap again for a different one.
  - **Initials hint** reveals each word's first letter for that same
    mystery country (e.g. "S _ _ _ _  A _ _ _ _ _").
- The **globe** covers most of the screen and shows real country shapes on
  an ocean-blue sphere: bright violet for the two end countries, green for
  guesses on the optimal path, yellow for valid-but-longer guesses,
  red-outlined for wrong tries, and pale blue for everywhere else —
  including Palestine (a real playable country with its actual borders)
  and dozens of small island nations shown for completeness. Drag to
  rotate it in any direction; pinch, scroll, or use the +/− controls to
  zoom from 10% to 2000% (enough to make out tiny countries clearly);
  double-tap the globe or tap **Enlarge** to fill the screen, and the
  **✕** in the corner (or tap the dimmed background, or double-tap again)
  to come back. Tap **Recenter** any time to snap back to a view showing
  both countries.
- **Host controls** (guess box, New round, hints, Reveal) collapse under a
  "Host controls" tab so the game and globe can take up the full screen —
  tap it to expand or collapse.
- **Settings** (⚙) shows a live status card at the top — current mode and
  whether TikTok auto-chat is connected — so you always know what's active
  before changing anything. Mode, trail length, and auto-continue only take
  effect once you tap **Apply settings & start new round**.
- In **Live** mode the viewer-name box is hidden (auto-chat fills names in
  automatically; a manual guess without a name just goes to "Host"). It
  reappears in **Test** mode for rehearsing with fake names.
- Tap **?** any time for the full color legend, scoring breakdown, and a
  quick how-to-play reminder.
- Tap **🏆** for the Top 10 leaderboard (this game, or the all-games
  running total) — both resettable independently in Settings.
- **Offline mode** hides the viewer-name field and leaderboard entirely,
  for solo play.

## A note on country names

Chat will misspell things — the game already understands common
alternatives (USA, UK, DRC, Ivory Coast, Czech Republic, Burma, etc.).

---

I haven't been able to run this end-to-end myself (my workspace can't
reach the internet to install and test the TikTok library live), so the
auto-chat piece in particular is built carefully from documentation and
your own debugging notes, but genuinely needs a real test on your end.
If it misbehaves, the manual guess box always keeps working — tell me what
you're seeing and we'll fix it together.

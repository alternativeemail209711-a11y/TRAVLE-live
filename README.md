# TRAVLE — Live Edition

A host-controlled version of the geography game TRAVLE, built to run on your
Android phone and be shown to your TikTok LIVE audience through **Mobile
Gaming LIVE Mode**. You never touch code — just follow the steps below.

## What this actually is

Four plain files (no installs, no server, nothing to "run"):

- `index.html` — the game screen
- `style.css` — the look
- `app.js` — the game logic (243 countries' worth of land borders, all the rules, scoring, leaderboard)
- `data.js` — the country border data the game uses

These four files together ARE the whole game. GitHub just stores them.
Render just serves them as a website. Nothing else is needed.

---

## PART 1 — Put the files on GitHub

1. Go to **github.com** and log in.
2. Click the **+** icon (top right) → **New repository**.
3. Name it something like `travle-live` → keep it **Public** → click **Create repository**.
4. On the new repo's page, click **"uploading an existing file"** (a blue link in the middle of the page).
5. Drag all 4 files (`index.html`, `style.css`, `app.js`, `data.js`) into the upload box.
6. Scroll down, click the green **Commit changes** button.

That's it — your code is on GitHub.

---

## PART 2 — Deploy it on Render

1. Go to **render.com** and log in.
2. Click **New +** → **Static Site**.
3. Connect your GitHub account if it asks, then select the `travle-live` repository you just made.
4. On the setup screen:
   - **Build Command:** leave it **completely empty**
   - **Publish Directory:** type a single dot → `.`
5. Click **Create Static Site**.
6. Wait about 30–60 seconds. Render will give you a live web address at the
   top of the page, looking like:
   `https://travle-live-xxxx.onrender.com`

That address is your game. Bookmark it. Open it any time on your phone's
browser and the game is there — no login, nothing to install.

> **Anytime you want to change anything later** (colors, wording, difficulty
> defaults): tell me what you want changed, I'll hand you updated file(s),
> you re-upload just that file to the same GitHub repo (drag it in, GitHub
> asks "replace this file?", say yes, commit). Render automatically
> re-publishes within about a minute — you never touch Render again after
> today.

---

## PART 3 — Try it before you go live (Test Mode)

1. On your phone, open your Render address in Chrome (or any browser).
2. Tap the **⚙ gear icon** top-right → set **Mode** to **Test**.
3. Type any name into "Viewer name" and any country into the guess box, tap
   **Guess**, and watch how the trail fills in. Nothing here is saved to the
   leaderboard, so play around freely.
4. When you're comfortable with how it works, switch Mode back to **Live**
   for your real stream (this is what actually scores points to your
   leaderboard) — or leave it on Live the whole time and just don't
   announce it to chat while testing, since Test/Live only affects
   whether points get saved.

---

## PART 4 — Going live on TikTok

Mobile Gaming LIVE Mode broadcasts your **whole phone screen** (with your
camera as a small bubble), so the game just needs to be visible on your
screen when you start:

1. Open your Render game link in your phone's browser **first**.
2. *(Optional, makes it feel like a real app)* In Chrome, tap the **⋮** menu
   → **Add to Home screen**. Now you can launch it full-screen without
   browser address bars showing.
3. Open the **TikTok app** → tap **LIVE** → choose **Mobile Gaming** mode
   (the mode you said is already available to you).
4. TikTok will ask you to select what to broadcast — pick your phone screen
   / the game app you just opened, per TikTok's own on-screen instructions
   for that mode (this step is controlled by TikTok's system screen-share
   permission, not by the game).
5. Go live. Your camera bubble sits over the game, viewers see both.
6. As comments come in, read a viewer's guess, type their **name** into
   "Viewer name," type their **guessed country** into the guess box, tap
   **Guess**. The trail updates live and their score updates instantly.

---

## PART 5 — Sharing this with your friend

She does **not** need her own GitHub or Render account. She can simply open
your same game link (`https://travle-live-xxxx.onrender.com`) on her own
phone and host her own live session with it — each phone keeps its own
separate leaderboard automatically (leaderboards are stored on-device, not
shared between phones), so your scores and her scores never mix.

If later you'd rather she have a fully separate copy under her own name, I
can walk you through cloning the repo for her — but for now, sharing the one
link is the simplest and works immediately.

---

## How the game actually plays

- The game picks a **start country** and an **end country**.
- Someone in chat guesses a country. If it shares a land border with either
  end of the currently-revealed trail, it gets added to the board (the trail
  can grow inward from *either* end).
- If a guess is wrong, the game gives a hint: *"3 borders away from
  Germany"* — so chat knows roughly which direction to think.
- The round ends when both growing ends of the trail connect, or when
  guesses run out — either way, one valid full trail is revealed.
- **Difficulty** (in ⚙ Settings) controls how many extra wrong guesses are
  allowed beyond the shortest possible path: Easy is forgiving, Extreme
  allows zero mistakes.
- **Trail length** (also in Settings) controls how far apart the two
  countries are picked, so you can keep rounds short and fast, or long and
  challenging.
- **Auto-continue** starts the next round automatically after each result,
  with a countdown you control — so the show never stalls waiting on you.
- Tap the **🏆 trophy** icon anytime to see the Top 10 leaderboard for this
  game, or the all-games running total (ready for when we add the next
  game). Both can be reset independently from Settings.
- **Offline mode** hides the viewer-name field entirely, for when you just
  want to play solo.

## A note on country names

Chat will misspell things — the game already understands common
alternatives (USA, UK, DRC, Ivory Coast, Czech Republic, Burma, etc.) so
minor variations still work.

---

Once you've deployed this and had a chance to try Test Mode, let me know how
it feels and we'll move on to the next game from your list.

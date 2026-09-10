/* ==========================================================================
   TRAVLE — Live Edition — app.js
   Runs entirely on-device (aside from the optional TikTok relay and the
   one-time globe shape fetch), so the game starts fast and stays smooth
   mid-stream. If the enhanced globe fails to load for any reason, the game
   keeps working — it just falls back to a simpler dot-based globe.
   ========================================================================== */

(() => {
  "use strict";

  /* ------------------------------------------------------------------ *
   * 1. GRAPH SETUP
   * ------------------------------------------------------------------ */

  const GRAPH = new Map();
  const CANONICAL_BY_LOWER = new Map();

  function ensureNode(name) {
    if (!GRAPH.has(name)) GRAPH.set(name, new Set());
    return GRAPH.get(name);
  }

  Object.keys(RAW_BORDERS).forEach((name) => {
    CANONICAL_BY_LOWER.set(name.toLowerCase(), name);
    ensureNode(name);
  });

  Object.entries(RAW_BORDERS).forEach(([name, neighbors]) => {
    neighbors.forEach((nb) => {
      if (!CANONICAL_BY_LOWER.has(nb.toLowerCase())) CANONICAL_BY_LOWER.set(nb.toLowerCase(), nb);
      ensureNode(nb);
      GRAPH.get(name).add(nb);
      GRAPH.get(nb).add(name);
    });
  });

  const PLAYABLE = [...GRAPH.keys()].filter((c) => GRAPH.get(c).size > 0);

  const ALIASES = {
    "usa": "United States", "us": "United States", "u.s.": "United States",
    "u.s.a.": "United States", "united states of america": "United States", "america": "United States",
    "uk": "United Kingdom", "u.k.": "United Kingdom", "great britain": "United Kingdom", "britain": "United Kingdom", "england": "United Kingdom",
    "uae": "United Arab Emirates", "emirates": "United Arab Emirates",
    "drc": "DR Congo", "dr congo": "DR Congo", "democratic republic of congo": "DR Congo",
    "democratic republic of the congo": "DR Congo", "congo-kinshasa": "DR Congo", "congo kinshasa": "DR Congo",
    "congo": "Republic of Congo", "republic of the congo": "Republic of Congo",
    "congo-brazzaville": "Republic of Congo", "congo brazzaville": "Republic of Congo",
    "cote d'ivoire": "Ivory Coast", "côte d'ivoire": "Ivory Coast", "cote divoire": "Ivory Coast",
    "czech republic": "Czechia",
    "macedonia": "North Macedonia", "fyrom": "North Macedonia",
    "burma": "Myanmar",
    "vatican": "Vatican City", "holy see": "Vatican City",
    "bosnia": "Bosnia and Herzegovina", "bosnia & herzegovina": "Bosnia and Herzegovina",
    "swaziland": "Eswatini",
    "east timor": "Timor-Leste", "timor leste": "Timor-Leste",
    "n korea": "North Korea", "s korea": "South Korea",
    "korea": "South Korea",
    "png": "Papua New Guinea",
    "car": "Central African Republic", "central african rep": "Central African Republic",
  };

  function normalizeInput(raw) {
    let s = (raw || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (s.startsWith("the ")) s = s.slice(4);
    return s;
  }

  function resolveCountry(raw) {
    const n = normalizeInput(raw);
    if (!n) return null;
    if (CANONICAL_BY_LOWER.has(n)) return CANONICAL_BY_LOWER.get(n);
    if (ALIASES[n]) return ALIASES[n];
    return null;
  }

  function bfsDistances(source) {
    const dist = new Map([[source, 0]]);
    const q = [source];
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      const d = dist.get(cur);
      for (const nb of GRAPH.get(cur)) {
        if (!dist.has(nb)) { dist.set(nb, d + 1); q.push(nb); }
      }
    }
    return dist;
  }

  function shortestPath(a, b) {
    if (a === b) return [a];
    const prev = new Map([[a, null]]);
    const q = [a];
    let head = 0;
    while (head < q.length) {
      const cur = q[head++];
      if (cur === b) break;
      for (const nb of GRAPH.get(cur)) {
        if (!prev.has(nb)) { prev.set(nb, cur); q.push(nb); }
      }
    }
    if (!prev.has(b)) return null;
    const path = [];
    let cur = b;
    while (cur !== null) { path.push(cur); cur = prev.get(cur); }
    return path.reverse();
  }

  function pickRound(minHops, maxHops) {
    minHops = Math.max(1, minHops | 0);
    maxHops = Math.max(minHops, maxHops | 0);
    for (let attempt = 0; attempt < 250; attempt++) {
      const start = PLAYABLE[(Math.random() * PLAYABLE.length) | 0];
      const dist = bfsDistances(start);
      const pool = PLAYABLE.filter((c) => c !== start && dist.get(c) >= minHops && dist.get(c) <= maxHops);
      if (pool.length) {
        const end = pool[(Math.random() * pool.length) | 0];
        return { start, end, optimal: dist.get(end) };
      }
    }
    for (let attempt = 0; attempt < 250; attempt++) {
      const start = PLAYABLE[(Math.random() * PLAYABLE.length) | 0];
      const dist = bfsDistances(start);
      const pool = PLAYABLE.filter((c) => c !== start && dist.get(c) >= minHops);
      if (pool.length) {
        const end = pool[(Math.random() * pool.length) | 0];
        return { start, end, optimal: dist.get(end) };
      }
    }
    const start = PLAYABLE[0];
    const dist = bfsDistances(start);
    const any = PLAYABLE.find((c) => dist.has(c) && c !== start);
    return { start, end: any, optimal: dist.get(any) };
  }

  /* ------------------------------------------------------------------ *
   * 2. STORAGE / SCORES
   * ------------------------------------------------------------------ */

  const STORE_KEY = "travle_tiktok_v1";

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return { travle: {}, total: {} };
      const parsed = JSON.parse(raw);
      return { travle: parsed.travle || {}, total: parsed.total || {} };
    } catch (e) { return { travle: {}, total: {} }; }
  }

  let store = loadStore();

  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* ignore — game still works */ }
  }

  function addPoints(viewerName, points) {
    const name = (viewerName || "").trim();
    if (!name || points <= 0) return;
    store.travle[name] = (store.travle[name] || 0) + points;
    store.total[name] = (store.total[name] || 0) + points;
    saveStore();
    if (leaderboardDrawer.classList.contains("open")) renderLeaderboard();
  }

  function resetBucket(bucket) {
    store[bucket] = {};
    saveStore();
    renderLeaderboard();
  }

  /* ------------------------------------------------------------------ *
   * 3. DOM REFS
   * ------------------------------------------------------------------ */

  const $ = (id) => document.getElementById(id);

  const appEl = $("app");
  const modeBadge = $("modeBadge");
  const modeBanner = $("modeBanner");
  const guessesLeftEl = $("guessesLeft");
  const difficultyLabelEl = $("difficultyLabel");
  const routeTrack = $("routeTrack");
  const feedList = $("feedList");
  const feedCard = $("feedCard");
  const feedToggle = $("feedToggle");
  const viewerRow = $("viewerRow");
  const viewerInput = $("viewerInput");
  const guessInput = $("guessInput");
  const submitGuess = $("submitGuess");
  const newRoundBtn = $("newRoundBtn");
  const revealBtn = $("revealBtn");
  const hintOutlineBtn = $("hintOutlineBtn");
  const hostMsg = $("hostMsg");

  const scrim = $("scrim");
  const settingsBtn = $("settingsBtn");
  const settingsDrawer = $("settingsDrawer");
  const closeSettings = $("closeSettings");
  const modeSelect = $("modeSelect");
  const difficultySelect = $("difficultySelect");
  const minHopsInput = $("minHops");
  const maxHopsInput = $("maxHops");
  const autoContinueToggle = $("autoContinueToggle");
  const autoContinueDelay = $("autoContinueDelay");
  const applySettingsBtn = $("applySettingsBtn");
  const resetTravleScores = $("resetTravleScores");
  const resetTotalScores = $("resetTotalScores");

  const trophyBtn = $("trophyBtn");
  const leaderboardDrawer = $("leaderboardDrawer");
  const closeLeaderboard = $("closeLeaderboard");
  const leaderboardList = $("leaderboardList");
  const tabTravle = $("tabTravle");
  const tabTotal = $("tabTotal");

  const legendBtn = $("legendBtn");
  const legendDrawer = $("legendDrawer");
  const closeLegend = $("closeLegend");

  const roundModal = $("roundModal");
  const modalTitle = $("modalTitle");
  const modalBody = $("modalBody");
  const modalPath = $("modalPath");
  const modalNextBtn = $("modalNextBtn");
  const modalCountdown = $("modalCountdown");

  const globeCard = $("globeCard");
  const globeWrap = $("globeWrap");
  const globeMount = $("globeMount");
  const globeZoomIn = $("globeZoomIn");
  const globeZoomOut = $("globeZoomOut");
  const globeZoomSlider = $("globeZoomSlider");
  const globeRecenter = $("globeRecenter");
  const globeExpandBtn = $("globeExpandBtn");

  const tiktokUsername = $("tiktokUsername");
  const tiktokConnectBtn = $("tiktokConnectBtn");
  const tiktokDisconnectBtn = $("tiktokDisconnectBtn");
  const tiktokStatus = $("tiktokStatus");
  const tiktokBadge = $("tiktokBadge");

  /* ------------------------------------------------------------------ *
   * 4. GAME STATE
   * ------------------------------------------------------------------ */

  const DIFFICULTY_ALLOWANCE = { easy: 6, medium: 3, hard: 1, extreme: 0 };
  const DIFFICULTY_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard", extreme: "Extreme" };

  let mode = "live";
  let difficulty = "medium";
  let leaderboardTab = "travle";
  let autoTimer = null;
  let round = null;

  function currentAllowance() { return DIFFICULTY_ALLOWANCE[difficulty]; }

  function isOptimal(country) {
    if (!round) return false;
    const a = round.distFromStart.get(country);
    const b = round.distFromEnd.get(country);
    if (a === undefined || b === undefined) return false;
    return a + b === round.optimalTotal;
  }

  function startNewRound() {
    clearTimeout(autoTimer);
    closeModal();
    const minH = parseInt(minHopsInput.value, 10) || 2;
    const maxH = parseInt(maxHopsInput.value, 10) || 6;
    const picked = pickRound(minH, maxH);
    const requiredIntermediate = Math.max(picked.optimal - 1, 0);
    round = {
      start: picked.start,
      end: picked.end,
      startChain: [picked.start],
      endChain: [picked.end],
      used: new Set([picked.start, picked.end]),
      guessesUsed: 0,
      requiredIntermediate,
      maxGuesses: requiredIntermediate + currentAllowance(),
      active: true,
      wrongGuesses: [],
      distFromStart: bfsDistances(picked.start),
      distFromEnd: bfsDistances(picked.end),
      optimalTotal: picked.optimal,
      hintedOutline: null,
    };
    feedList.innerHTML = "";
    addFeed(`New trail: <span class="viewer">${picked.start}</span> → <span class="viewer">${picked.end}</span>`);
    hostMsg.textContent = "";
    if (window.Globe && window.Globe.isReady()) window.Globe.centerOn(picked.start, picked.end);
    renderRound();
  }

  function buildCountryStateMap() {
    const map = new Map();
    round.startChain.forEach((c) => { map.set(c, c === round.start ? "endpoint" : (isOptimal(c) ? "optimal" : "good")); });
    round.endChain.forEach((c) => { map.set(c, c === round.end ? "endpoint" : (isOptimal(c) ? "optimal" : "good")); });
    round.wrongGuesses.forEach((c) => { if (!map.has(c)) map.set(c, "wrong"); });
    return map;
  }

  function renderRound() {
    if (!round) return;
    guessesLeftEl.textContent = Math.max(round.maxGuesses - round.guessesUsed, 0);
    difficultyLabelEl.textContent = DIFFICULTY_LABEL[difficulty];

    routeTrack.innerHTML = "";
    const fullVisual = [...round.startChain, "…GAP…", ...[...round.endChain].reverse()];
    fullVisual.forEach((node, i) => {
      if (node === "…GAP…") {
        const c = document.createElement("div");
        c.className = "connector open";
        routeTrack.appendChild(c);
        return;
      }
      const el = document.createElement("div");
      const isEndpoint = node === round.start || node === round.end;
      const optimalNode = !isEndpoint && isOptimal(node);
      el.className = "node " + (isEndpoint ? "endpoint" : optimalNode ? "confirmed" : "good-node");
      el.textContent = node;
      routeTrack.appendChild(el);
      if (i < fullVisual.length - 1 && fullVisual[i + 1] !== "…GAP…") {
        const c = document.createElement("div");
        c.className = "connector";
        routeTrack.appendChild(c);
      }
    });

    renderGlobe();
  }

  function renderGlobe() {
    if (!round) return;
    const countryState = buildCountryStateMap();
    if (window.Globe && window.Globe.isReady()) {
      window.Globe.render({ start: round.start, end: round.end, countryState, hintedOutline: round.hintedOutline });
    } else {
      legacyRenderGlobe(countryState);
    }
  }

  /* ---- legacy dot-based globe fallback (used only if the enhanced globe
     can't load — e.g. offline, or the CDN scripts didn't reach the phone) ---- */
  function legacyRenderGlobe(countryState) {
    if (!globeMount) return;
    let svgEl = globeMount.querySelector("svg.legacy-globe");
    if (!svgEl) {
      globeMount.innerHTML = `<svg class="legacy-globe" viewBox="0 0 220 220">
        <defs><radialGradient id="legacyGrad" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stop-color="#274568"/><stop offset="100%" stop-color="#0b1526"/>
        </radialGradient></defs>
        <circle cx="110" cy="110" r="100" fill="url(#legacyGrad)"/>
        <circle cx="110" cy="110" r="100" fill="none" stroke="#26385C" stroke-width="1.5"/>
        <g id="legacyLayer"></g>
      </svg>`;
      svgEl = globeMount.querySelector("svg.legacy-globe");
    }
    const layer = svgEl.querySelector("#legacyLayer");
    layer.innerHTML = "";
    const R = 96, cx = 110, cy = 110;
    const points = [...countryState.entries()].filter(([name]) => COUNTRY_COORDS[name]);
    if (!points.length) return;
    let sx = 0, sy = 0, latSum = 0;
    points.forEach(([name]) => {
      const [lat, lon] = COUNTRY_COORDS[name];
      const r = lon * Math.PI / 180;
      sx += Math.cos(r); sy += Math.sin(r); latSum += lat;
    });
    const centerLon = Math.atan2(sy, sx) * 180 / Math.PI;
    const centerLat = Math.max(-55, Math.min(55, latSum / points.length));
    const colorFor = (cat) => cat === "endpoint" ? "#D6A24A" : cat === "optimal" ? "#4C9A6C" : cat === "good" ? "#E08A2B" : "#D9534F";
    points.forEach(([name, cat]) => {
      const [lat, lon] = COUNTRY_COORDS[name];
      const toRad = Math.PI / 180;
      const dLambda = (lon - centerLon) * toRad, phi = lat * toRad, phi1 = centerLat * toRad;
      const cosC = Math.sin(phi1) * Math.sin(phi) + Math.cos(phi1) * Math.cos(phi) * Math.cos(dLambda);
      if (cosC <= -0.08) return;
      const x = cx + R * Math.cos(phi) * Math.sin(dLambda);
      const y = cy - R * (Math.cos(phi1) * Math.sin(phi) - Math.sin(phi1) * Math.cos(phi) * Math.cos(dLambda));
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", x); dot.setAttribute("cy", y);
      dot.setAttribute("r", cat === "endpoint" ? 4.2 : 3.2);
      dot.setAttribute("fill", colorFor(cat));
      layer.appendChild(dot);
    });
  }

  function addFeed(html) {
    const li = document.createElement("li");
    li.innerHTML = html;
    feedList.insertBefore(li, feedList.firstChild);
    while (feedList.children.length > 60) feedList.removeChild(feedList.lastChild);
  }

  function arrowFor(side) { return side === "start" ? "→" : "←"; }

  function viewerLabel(viewerName) {
    if (viewerName) return viewerName;
    return mode === "offline" ? "You" : "Host";
  }

  function handleGuess() {
    if (!round || !round.active) return;
    const rawGuess = guessInput.value;
    const viewerName = mode === "offline" ? "" : viewerInput.value.trim();
    guessInput.value = "";
    guessInput.focus();
    if (!rawGuess.trim()) return;
    processGuess(rawGuess, viewerName, { silent: false });
  }

  // Shared by the manual "Guess" button and the TikTok auto-relay.
  function processGuess(rawGuess, viewerNameRaw, opts) {
    const silent = Boolean(opts && opts.silent);
    if (!round || !round.active) return;
    const viewerName = mode === "offline" ? "" : (viewerNameRaw || "").trim();

    const country = resolveCountry(rawGuess);

    if (!country) {
      if (!silent) hostMsg.textContent = `"${String(rawGuess).trim()}" isn't a country name I recognize — check spelling.`;
      return;
    }

    if (round.used.has(country)) {
      if (!silent) hostMsg.textContent = `${country} is already on the board.`;
      return;
    }

    if (round.hintedOutline === country) round.hintedOutline = null;

    const startFrontier = round.startChain[round.startChain.length - 1];
    const endFrontier = round.endChain[round.endChain.length - 1];
    const connectsStart = GRAPH.get(startFrontier).has(country);
    const connectsEnd = GRAPH.get(endFrontier).has(country);

    hostMsg.textContent = "";

    if (connectsStart && connectsEnd) {
      round.startChain.push(country);
      round.used.add(country);
      round.guessesUsed++;
      const optimal = isOptimal(country);
      const pts = optimal ? 3 : 1;
      addFeed(`<span class="viewer">${viewerLabel(viewerName)}</span> guessed <b>${country}</b> — <span class="tag-win">bridged the trail! 🎉 (+${pts})</span>`);
      if (mode === "live") addPoints(viewerName, pts);
      renderRound();
      finishRound(true);
      return;
    }

    if (connectsStart || connectsEnd) {
      if (connectsStart) { round.startChain.push(country); } else { round.endChain.push(country); }
      round.used.add(country);
      round.guessesUsed++;
      const optimal = isOptimal(country);
      const pts = optimal ? 3 : 1;
      const side = connectsStart ? round.start : round.end;
      const tag = optimal ? "tag-win" : "tag-good";
      const note = optimal ? "optimal move" : "valid, but not the shortest route";
      addFeed(`<span class="viewer">${viewerLabel(viewerName)}</span> guessed <b>${country}</b> — <span class="${tag}">${note}, connects from ${side} ${arrowFor(connectsStart ? "start" : "end")} (+${pts})</span>`);
      if (mode === "live") addPoints(viewerName, pts);
      renderRound();
      checkOutOfGuesses();
      return;
    }

    // wrong guess — give a proximity hint
    round.guessesUsed++;
    if (COUNTRY_COORDS[country]) {
      round.wrongGuesses.push(country);
      if (round.wrongGuesses.length > 8) round.wrongGuesses.shift();
    }
    const dStart = bfsDistances(country).get(startFrontier) ?? null;
    const dEnd = bfsDistances(country).get(endFrontier) ?? null;
    let hint = "not connected to the trail yet";
    if (dStart !== null || dEnd !== null) {
      const best = Math.min(dStart ?? Infinity, dEnd ?? Infinity);
      const side = (dStart ?? Infinity) <= (dEnd ?? Infinity) ? round.start : round.end;
      hint = `${best} border${best === 1 ? "" : "s"} away from ${side}`;
    }
    addFeed(`<span class="viewer">${viewerLabel(viewerName)}</span> guessed <b>${country}</b> — <span class="tag-bad">${hint} (+0)</span>`);
    renderRound();
    checkOutOfGuesses();
  }

  function useHintOutline() {
    if (!round || !round.active) return;
    if (round.maxGuesses - round.guessesUsed <= 0) {
      hostMsg.textContent = "No guesses left to spend on a hint.";
      return;
    }
    const startFrontier = round.startChain[round.startChain.length - 1];
    const endFrontier = round.endChain[round.endChain.length - 1];
    const candidates = [...GRAPH.get(startFrontier), ...GRAPH.get(endFrontier)]
      .filter((c) => !round.used.has(c) && c !== round.hintedOutline);
    if (!candidates.length) {
      hostMsg.textContent = "No hint available right now.";
      return;
    }
    const optimalCandidates = candidates.filter((c) => isOptimal(c));
    const pick = (optimalCandidates.length ? optimalCandidates : candidates)[0];
    round.hintedOutline = pick;
    round.guessesUsed++;
    addFeed(`Outline hint revealed on the globe (−1 guess).`);
    hostMsg.textContent = "";
    renderRound();
    checkOutOfGuesses();
  }

  function checkOutOfGuesses() {
    if (round.guessesUsed >= round.maxGuesses) finishRound(false);
  }

  function finishRound(solved) {
    round.active = false;
    round.hintedOutline = null;
    const finalChain = [...round.startChain, ...[...round.endChain].reverse()];
    const canonicalOptimal = shortestPath(round.start, round.end) || [];
    const rows = Math.max(finalChain.length, canonicalOptimal.length);

    modalPath.innerHTML = "";
    for (let i = 0; i < rows; i++) {
      const guessed = finalChain[i];
      const optimalC = canonicalOptimal[i];
      const row = document.createElement("div");
      row.className = "modal-path-row";

      const left = document.createElement("span");
      if (guessed) {
        const cat = guessed === round.start || guessed === round.end ? "endpoint" : (isOptimal(guessed) ? "optimal" : "good");
        left.className = "path-chip chip-" + cat;
        left.textContent = guessed;
      } else {
        left.className = "path-chip chip-empty";
        left.textContent = "—";
      }

      const right = document.createElement("span");
      right.className = "path-chip chip-reference";
      right.textContent = optimalC || "—";

      row.appendChild(left);
      row.appendChild(right);
      modalPath.appendChild(row);
    }

    if (solved) {
      const perfect = round.guessesUsed === round.requiredIntermediate;
      modalTitle.textContent = perfect ? "Solved — perfect trail!" : "Trail complete!";
      modalBody.textContent = `Connected in ${round.guessesUsed} guess${round.guessesUsed === 1 ? "" : "es"} (optimal was ${round.requiredIntermediate}).`;
    } else {
      modalTitle.textContent = "Out of guesses";
      modalBody.textContent = "Here's how your trail compares to an optimal one:";
    }

    openModal();

    if (autoContinueToggle.checked) {
      const secs = Math.max(3, parseInt(autoContinueDelay.value, 10) || 12);
      let remaining = secs;
      modalCountdown.textContent = `Next round in ${remaining}s…`;
      clearTimeout(autoTimer);
      const tick = () => {
        remaining--;
        if (remaining <= 0) { startNewRound(); }
        else { modalCountdown.textContent = `Next round in ${remaining}s…`; autoTimer = setTimeout(tick, 1000); }
      };
      autoTimer = setTimeout(tick, 1000);
    } else {
      modalCountdown.textContent = "";
    }
  }

  function revealRound() {
    if (!round || !round.active) return;
    finishRound(false);
  }

  /* ------------------------------------------------------------------ *
   * 5. MODAL / DRAWERS
   * ------------------------------------------------------------------ */

  function openModal() { roundModal.classList.add("open"); roundModal.setAttribute("aria-hidden", "false"); }
  function closeModal() { roundModal.classList.remove("open"); roundModal.setAttribute("aria-hidden", "true"); clearTimeout(autoTimer); }

  function openDrawer(drawer) { scrim.classList.add("visible"); drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); }
  function closeDrawer(drawer) { scrim.classList.remove("visible"); drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); }
  function closeAllDrawers() { closeDrawer(settingsDrawer); closeDrawer(leaderboardDrawer); closeDrawer(legendDrawer); }

  function renderLeaderboard() {
    const bucket = leaderboardTab === "travle" ? store.travle : store.total;
    const entries = Object.entries(bucket).sort((a, b) => b[1] - a[1]).slice(0, 10);
    leaderboardList.innerHTML = "";
    if (!entries.length) {
      leaderboardList.innerHTML = `<li class="leaderboard-empty">No scores yet — guesses made in Live mode will show up here.</li>`;
      return;
    }
    entries.forEach(([name, score], i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="rank">#${i + 1}</span><span class="lb-name">${name}</span><span class="lb-score">${score}</span>`;
      leaderboardList.appendChild(li);
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. GLOBE CONTROLS
   * ------------------------------------------------------------------ */

  function syncZoomUI(pct) { globeZoomSlider.value = String(pct); }

  globeZoomIn.addEventListener("click", () => {
    if (window.Globe && window.Globe.isReady()) window.Globe.setZoomPercent(window.Globe.currentPercent() + 20);
  });
  globeZoomOut.addEventListener("click", () => {
    if (window.Globe && window.Globe.isReady()) window.Globe.setZoomPercent(window.Globe.currentPercent() - 20);
  });
  globeZoomSlider.addEventListener("input", () => {
    if (window.Globe && window.Globe.isReady()) window.Globe.setZoomPercent(parseInt(globeZoomSlider.value, 10));
  });
  globeRecenter.addEventListener("click", () => {
    if (round && window.Globe && window.Globe.isReady()) { window.Globe.centerOn(round.start, round.end); syncZoomUI(window.Globe.currentPercent()); }
  });
  globeExpandBtn.addEventListener("click", () => {
    const expanding = !globeWrap.classList.contains("expanded");
    globeWrap.classList.toggle("expanded", expanding);
    scrim.classList.toggle("visible", expanding);
    globeExpandBtn.textContent = expanding ? "Shrink" : "Enlarge";
    if (window.Globe && window.Globe.isReady()) setTimeout(() => window.Globe.resize(), 50);
  });
  scrim.addEventListener("click", () => {
    if (globeWrap.classList.contains("expanded")) {
      globeWrap.classList.remove("expanded");
      globeExpandBtn.textContent = "Enlarge";
      if (window.Globe && window.Globe.isReady()) setTimeout(() => window.Globe.resize(), 50);
    }
    closeAllDrawers();
  });

  /* ------------------------------------------------------------------ *
   * 7. TIKTOK AUTO-CHAT RELAY
   * ------------------------------------------------------------------ */

  let socket = null;
  try {
    if (typeof io === "function") socket = io();
  } catch (e) { socket = null; }

  if (socket) {
    socket.on("tiktok-status", (status) => {
      if (status.connecting) {
        tiktokStatus.textContent = `Connecting to @${status.username}…`;
        tiktokStatus.className = "field-note tiktok-status";
        return;
      }
      if (status.connected) {
        tiktokStatus.textContent = `Connected to @${status.username} — chat guesses are live.`;
        tiktokStatus.className = "field-note tiktok-status ok";
        tiktokBadge.hidden = false;
      } else {
        tiktokBadge.hidden = true;
        if (status.error) {
          tiktokStatus.textContent = `Couldn't connect: ${status.error}`;
          tiktokStatus.className = "field-note tiktok-status err";
        } else if (status.reason) {
          tiktokStatus.textContent = `Disconnected — ${status.reason}`;
          tiktokStatus.className = "field-note tiktok-status err";
        } else {
          tiktokStatus.textContent = "Not connected — guesses must be typed manually.";
          tiktokStatus.className = "field-note tiktok-status";
        }
      }
    });

    let lastAutoGuessAt = 0;
    socket.on("tiktok-comment", ({ commenter, text }) => {
      const now = Date.now();
      if (now - lastAutoGuessAt < 600) return; // gentle throttle so a burst of chat doesn't flood the board
      lastAutoGuessAt = now;
      processGuess(text, commenter, { silent: true });
    });

    tiktokConnectBtn.addEventListener("click", () => {
      const uname = tiktokUsername.value.trim();
      if (!uname) { tiktokStatus.textContent = "Enter a TikTok username first."; tiktokStatus.className = "field-note tiktok-status err"; return; }
      socket.emit("tiktok-connect", uname);
    });
    tiktokDisconnectBtn.addEventListener("click", () => socket.emit("tiktok-disconnect"));
  } else {
    tiktokConnectBtn.disabled = true;
    tiktokDisconnectBtn.disabled = true;
    tiktokStatus.textContent = "Auto-chat isn't available on this deployment.";
  }

  /* ------------------------------------------------------------------ *
   * 8. EVENT WIRING
   * ------------------------------------------------------------------ */

  submitGuess.addEventListener("click", handleGuess);
  guessInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleGuess(); });

  newRoundBtn.addEventListener("click", startNewRound);
  revealBtn.addEventListener("click", revealRound);
  hintOutlineBtn.addEventListener("click", useHintOutline);
  modalNextBtn.addEventListener("click", startNewRound);

  feedToggle.addEventListener("click", () => {
    feedCard.classList.toggle("collapsed");
    feedToggle.setAttribute("aria-expanded", String(!feedCard.classList.contains("collapsed")));
  });

  settingsBtn.addEventListener("click", () => openDrawer(settingsDrawer));
  closeSettings.addEventListener("click", () => closeDrawer(settingsDrawer));
  trophyBtn.addEventListener("click", () => { renderLeaderboard(); openDrawer(leaderboardDrawer); });
  closeLeaderboard.addEventListener("click", () => closeDrawer(leaderboardDrawer));
  legendBtn.addEventListener("click", () => openDrawer(legendDrawer));
  closeLegend.addEventListener("click", () => closeDrawer(legendDrawer));

  const MODE_BANNER_TEXT = {
    live: "",
    test: "Practice round — scores won't be saved to the leaderboard.",
    offline: "Solo practice — no leaderboard, just you.",
  };

  function applyModeUI() {
    modeBadge.textContent = mode.toUpperCase();
    modeBadge.className = "badge" + (mode === "test" ? " mode-test" : mode === "offline" ? " mode-offline" : "");
    viewerRow.style.display = mode === "offline" ? "none" : "flex";
    appEl.className = "mode-" + mode;
    const text = MODE_BANNER_TEXT[mode];
    modeBanner.textContent = text;
    modeBanner.classList.toggle("show", Boolean(text));
  }

  // Settings only take effect when "Apply" is tapped — so a host can line
  // everything up (mode, difficulty, trail length) before committing.
  minHopsInput.addEventListener("change", () => {
    if (parseInt(minHopsInput.value, 10) > parseInt(maxHopsInput.value, 10)) maxHopsInput.value = minHopsInput.value;
  });
  maxHopsInput.addEventListener("change", () => {
    if (parseInt(maxHopsInput.value, 10) < parseInt(minHopsInput.value, 10)) minHopsInput.value = maxHopsInput.value;
  });

  applySettingsBtn.addEventListener("click", () => {
    mode = modeSelect.value;
    difficulty = difficultySelect.value;
    applyModeUI();
    closeDrawer(settingsDrawer);
    startNewRound();
    hostMsg.textContent = "Settings applied — new round started.";
  });

  resetTravleScores.addEventListener("click", () => {
    if (confirm("Reset the TRAVLE leaderboard? This can't be undone.")) resetBucket("travle");
  });
  resetTotalScores.addEventListener("click", () => {
    if (confirm("Reset the all-games total leaderboard? This can't be undone.")) resetBucket("total");
  });

  [tabTravle, tabTotal].forEach((tab) => {
    tab.addEventListener("click", () => {
      leaderboardTab = tab.dataset.tab;
      tabTravle.classList.toggle("active", leaderboardTab === "travle");
      tabTotal.classList.toggle("active", leaderboardTab === "total");
      renderLeaderboard();
    });
  });

  window.addEventListener("resize", () => {
    if (window.Globe && window.Globe.isReady()) window.Globe.resize();
  });

  /* ------------------------------------------------------------------ *
   * 9. INIT
   * ------------------------------------------------------------------ */

  applyModeUI();

  if (window.Globe) {
    window.Globe.onZoomChange(syncZoomUI);
    window.Globe.init(globeMount).then((ok) => {
      startNewRound(); // (re)draws once the globe is ready, or falls back gracefully if not
    }).catch(() => { startNewRound(); });
  } else {
    startNewRound();
  }
})();

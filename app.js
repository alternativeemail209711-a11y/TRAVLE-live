/* ==========================================================================
   TRAVLE — Live Edition — app.js
   No frameworks, no build step, no network calls at runtime (besides the
   page load itself) — everything below runs entirely on-device so the game
   starts fast and never stalls mid-stream.
   ========================================================================== */

(() => {
  "use strict";

  /* ------------------------------------------------------------------ *
   * 1. GRAPH SETUP
   * ------------------------------------------------------------------ */

  const GRAPH = new Map();           // canonical name -> Set(neighbor canonical names)
  const CANONICAL_BY_LOWER = new Map(); // "united states" -> "United States"

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
      if (!CANONICAL_BY_LOWER.has(nb.toLowerCase())) {
        CANONICAL_BY_LOWER.set(nb.toLowerCase(), nb);
      }
      ensureNode(nb);
      GRAPH.get(name).add(nb);
      GRAPH.get(nb).add(name); // auto-symmetrize
    });
  });

  const PLAYABLE = [...GRAPH.keys()].filter((c) => GRAPH.get(c).size > 0);

  // Common alternate names / abbreviations viewers are likely to type.
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
        if (!dist.has(nb)) {
          dist.set(nb, d + 1);
          q.push(nb);
        }
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
        if (!prev.has(nb)) {
          prev.set(nb, cur);
          q.push(nb);
        }
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
    // fallback: relax the upper bound, keep the lower bound
    for (let attempt = 0; attempt < 250; attempt++) {
      const start = PLAYABLE[(Math.random() * PLAYABLE.length) | 0];
      const dist = bfsDistances(start);
      const pool = PLAYABLE.filter((c) => c !== start && dist.get(c) >= minHops);
      if (pool.length) {
        const end = pool[(Math.random() * pool.length) | 0];
        return { start, end, optimal: dist.get(end) };
      }
    }
    // last resort: any two connected countries
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
    } catch (e) {
      return { travle: {}, total: {} };
    }
  }

  let store = loadStore();

  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable — game still works, just won't persist */ }
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
  const globeLayer = $("globeLayer");
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
  const resetTravleScores = $("resetTravleScores");
  const resetTotalScores = $("resetTotalScores");

  const trophyBtn = $("trophyBtn");
  const leaderboardDrawer = $("leaderboardDrawer");
  const closeLeaderboard = $("closeLeaderboard");
  const leaderboardList = $("leaderboardList");
  const tabTravle = $("tabTravle");
  const tabTotal = $("tabTotal");

  const roundModal = $("roundModal");
  const modalTitle = $("modalTitle");
  const modalBody = $("modalBody");
  const modalPath = $("modalPath");
  const modalNextBtn = $("modalNextBtn");
  const modalCountdown = $("modalCountdown");

  /* ------------------------------------------------------------------ *
   * 4. GAME STATE
   * ------------------------------------------------------------------ */

  const DIFFICULTY_ALLOWANCE = { easy: 6, medium: 3, hard: 1, extreme: 0 };
  const DIFFICULTY_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard", extreme: "Extreme" };

  let mode = "live";           // live | test | offline
  let difficulty = "medium";
  let leaderboardTab = "travle";
  let autoTimer = null;

  let round = null; // {start, end, optimal, startChain, endChain, used, guessesUsed, maxGuesses, active}

  function currentAllowance() { return DIFFICULTY_ALLOWANCE[difficulty]; }

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
    };
    feedList.innerHTML = "";
    addFeed(`New trail: <span class="viewer">${picked.start}</span> → <span class="viewer">${picked.end}</span>`);
    hostMsg.textContent = "";
    globeDrift = 0;
    renderRound();
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
      el.className = "node " + (isEndpoint ? "endpoint" : "confirmed");
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

  /* ---- floating globe ---- */
  let globeDrift = 0;

  function projectPoint(lat, lon, centerLat, centerLon, R, cx, cy) {
    const toRad = Math.PI / 180;
    const phi = lat * toRad, phi1 = centerLat * toRad;
    const dLambda = (lon - centerLon) * toRad;
    const cosC = Math.sin(phi1) * Math.sin(phi) + Math.cos(phi1) * Math.cos(phi) * Math.cos(dLambda);
    const x = R * Math.cos(phi) * Math.sin(dLambda);
    const y = R * (Math.cos(phi1) * Math.sin(phi) - Math.sin(phi1) * Math.cos(phi) * Math.cos(dLambda));
    return { x: cx + x, y: cy - y, visible: cosC > -0.08 };
  }

  function renderGlobe() {
    if (!round || !globeLayer) return;
    const wrongRecent = round.wrongGuesses.slice(-6);
    const points = [
      ...round.startChain.map((c, i) => ({ name: c, cls: (c === round.start) ? "endpoint" : "confirmed" })),
      ...round.endChain.map((c, i) => ({ name: c, cls: (c === round.end) ? "endpoint" : "confirmed" })),
      ...wrongRecent.map((c) => ({ name: c, cls: "wrong" })),
    ].filter((p) => COUNTRY_COORDS[p.name]);

    if (!points.length) { globeLayer.innerHTML = ""; return; }

    let sx = 0, sy = 0, latSum = 0;
    points.forEach((p) => {
      const [lat, lon] = COUNTRY_COORDS[p.name];
      const r = lon * Math.PI / 180;
      sx += Math.cos(r); sy += Math.sin(r); latSum += lat;
    });
    const centerLon = Math.atan2(sy, sx) * 180 / Math.PI + globeDrift;
    const centerLat = Math.max(-55, Math.min(55, latSum / points.length));

    const R = 96, cx = 110, cy = 110;
    globeLayer.innerHTML = "";

    // trail links between consecutive confirmed chain nodes
    const chainOrder = [...round.startChain, ...[...round.endChain].reverse()];
    for (let i = 0; i < chainOrder.length - 1; i++) {
      const [lat1, lon1] = COUNTRY_COORDS[chainOrder[i]] || [];
      const [lat2, lon2] = COUNTRY_COORDS[chainOrder[i + 1]] || [];
      if (lat1 === undefined || lat2 === undefined) continue;
      const p1 = projectPoint(lat1, lon1, centerLat, centerLon, R, cx, cy);
      const p2 = projectPoint(lat2, lon2, centerLat, centerLon, R, cx, cy);
      if (!p1.visible || !p2.visible) continue;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "globe-link");
      line.setAttribute("x1", p1.x); line.setAttribute("y1", p1.y);
      line.setAttribute("x2", p2.x); line.setAttribute("y2", p2.y);
      globeLayer.appendChild(line);
    }

    points.forEach((p) => {
      const [lat, lon] = COUNTRY_COORDS[p.name];
      const proj = projectPoint(lat, lon, centerLat, centerLon, R, cx, cy);
      if (!proj.visible) return;
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("class", "globe-marker " + p.cls);
      dot.setAttribute("cx", proj.x); dot.setAttribute("cy", proj.y);
      dot.setAttribute("r", p.cls === "endpoint" ? 4.2 : p.cls === "wrong" ? 2.6 : 3.4);
      globeLayer.appendChild(dot);

      if (p.cls !== "wrong") {
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("class", "globe-label");
        label.setAttribute("x", proj.x + 5);
        label.setAttribute("y", proj.y + 3);
        label.textContent = p.name;
        globeLayer.appendChild(label);
      }
    });
  }

  setInterval(() => {
    if (!round || !round.active) return;
    globeDrift += 0.4;
    renderGlobe();
  }, 200);

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
    if (!rawGuess.trim()) return;

    const country = resolveCountry(rawGuess);
    guessInput.value = "";
    guessInput.focus();

    if (!country) {
      hostMsg.textContent = `"${rawGuess.trim()}" isn't a country name I recognize — check spelling.`;
      return;
    }

    if (round.used.has(country)) {
      hostMsg.textContent = `${country} is already on the board.`;
      return;
    }

    const startFrontier = round.startChain[round.startChain.length - 1];
    const endFrontier = round.endChain[round.endChain.length - 1];
    const connectsStart = GRAPH.get(startFrontier).has(country);
    const connectsEnd = GRAPH.get(endFrontier).has(country);

    hostMsg.textContent = "";

    if (connectsStart && connectsEnd) {
      round.startChain.push(country);
      round.used.add(country);
      round.guessesUsed++;
      const perfect = round.guessesUsed === round.requiredIntermediate;
      const pts = 10 + 25 + (perfect ? 20 : 0);
      addFeed(`<span class="viewer">${viewerLabel(viewerName)}</span> guessed <b>${country}</b> — <span class="tag-win">bridged the trail! 🎉</span>`);
      if (mode === "live") addPoints(viewerName, pts);
      renderRound();
      finishRound(true, perfect);
      return;
    }

    if (connectsStart) {
      round.startChain.push(country);
      round.used.add(country);
      round.guessesUsed++;
      addFeed(`<span class="viewer">${viewerLabel(viewerName)}</span> guessed <b>${country}</b> — <span class="tag-good">connects from ${round.start} ${arrowFor("start")}</span>`);
      if (mode === "live") addPoints(viewerName, 10);
      renderRound();
      checkOutOfGuesses();
      return;
    }

    if (connectsEnd) {
      round.endChain.push(country);
      round.used.add(country);
      round.guessesUsed++;
      addFeed(`<span class="viewer">${viewerLabel(viewerName)}</span> guessed <b>${country}</b> — <span class="tag-good">connects from ${round.end} ${arrowFor("end")}</span>`);
      if (mode === "live") addPoints(viewerName, 10);
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
    addFeed(`<span class="viewer">${viewerLabel(viewerName)}</span> guessed <b>${country}</b> — <span class="tag-bad">${hint}</span>`);
    renderRound();
    checkOutOfGuesses();
  }

  function checkOutOfGuesses() {
    if (round.guessesUsed >= round.maxGuesses) finishRound(false, false);
  }

  function finishRound(solved, perfect) {
    round.active = false;
    const finalPath = solved
      ? [...round.startChain, ...[...round.endChain].reverse()]
      : shortestPath(round.startChain[round.startChain.length - 1], round.endChain[round.endChain.length - 1]);

    modalPath.innerHTML = "";
    (finalPath || []).forEach((c) => {
      const el = document.createElement("div");
      el.className = "node " + (c === round.start || c === round.end ? "endpoint" : "confirmed");
      el.textContent = c;
      modalPath.appendChild(el);
    });

    if (solved) {
      modalTitle.textContent = perfect ? "Solved — perfect trail!" : "Trail complete!";
      modalBody.textContent = `Connected in ${round.guessesUsed} guess${round.guessesUsed === 1 ? "" : "es"} (optimal was ${round.requiredIntermediate}).`;
    } else {
      modalTitle.textContent = "Out of guesses";
      modalBody.textContent = "Here's one valid trail that would have worked:";
    }

    openModal();

    if (autoContinueToggle.checked) {
      const secs = Math.max(3, parseInt(autoContinueDelay.value, 10) || 12);
      let remaining = secs;
      modalCountdown.textContent = `Next round in ${remaining}s…`;
      clearTimeout(autoTimer);
      const tick = () => {
        remaining--;
        if (remaining <= 0) {
          startNewRound();
        } else {
          modalCountdown.textContent = `Next round in ${remaining}s…`;
          autoTimer = setTimeout(tick, 1000);
        }
      };
      autoTimer = setTimeout(tick, 1000);
    } else {
      modalCountdown.textContent = "";
    }
  }

  function revealRound() {
    if (!round || !round.active) return;
    round.active = false;
    finishRound(false, false);
  }

  /* ------------------------------------------------------------------ *
   * 5. MODAL / DRAWERS
   * ------------------------------------------------------------------ */

  function openModal() { roundModal.classList.add("open"); roundModal.setAttribute("aria-hidden", "false"); }
  function closeModal() { roundModal.classList.remove("open"); roundModal.setAttribute("aria-hidden", "true"); clearTimeout(autoTimer); }

  function openDrawer(drawer) { scrim.classList.add("visible"); drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); }
  function closeDrawer(drawer) { scrim.classList.remove("visible"); drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); }
  function closeAllDrawers() { closeDrawer(settingsDrawer); closeDrawer(leaderboardDrawer); }

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
   * 6. EVENT WIRING
   * ------------------------------------------------------------------ */

  submitGuess.addEventListener("click", handleGuess);
  guessInput.addEventListener("keydown", (e) => { if (e.key === "Enter") handleGuess(); });

  newRoundBtn.addEventListener("click", startNewRound);
  revealBtn.addEventListener("click", revealRound);
  modalNextBtn.addEventListener("click", startNewRound);

  feedToggle.addEventListener("click", () => {
    feedCard.classList.toggle("collapsed");
    feedToggle.setAttribute("aria-expanded", String(!feedCard.classList.contains("collapsed")));
  });

  settingsBtn.addEventListener("click", () => openDrawer(settingsDrawer));
  closeSettings.addEventListener("click", () => closeDrawer(settingsDrawer));
  trophyBtn.addEventListener("click", () => { renderLeaderboard(); openDrawer(leaderboardDrawer); });
  closeLeaderboard.addEventListener("click", () => closeDrawer(leaderboardDrawer));
  scrim.addEventListener("click", closeAllDrawers);

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

  modeSelect.addEventListener("change", () => {
    mode = modeSelect.value;
    applyModeUI();
  });

  difficultySelect.addEventListener("change", () => { difficulty = difficultySelect.value; });

  minHopsInput.addEventListener("change", () => {
    if (parseInt(minHopsInput.value, 10) > parseInt(maxHopsInput.value, 10)) maxHopsInput.value = minHopsInput.value;
  });
  maxHopsInput.addEventListener("change", () => {
    if (parseInt(maxHopsInput.value, 10) < parseInt(minHopsInput.value, 10)) minHopsInput.value = maxHopsInput.value;
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

  /* ------------------------------------------------------------------ *
   * 7. INIT
   * ------------------------------------------------------------------ */

  applyModeUI();
  startNewRound();
})();

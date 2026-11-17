// ============================================================================
// 70_hud.js — everything written on top of the 3D picture: clock, money, the
// bars, the mission box, the mini-map, menus and messages.
// ============================================================================

const hud = {};

function el(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
}

function buildHud(root) {
  hud.root = root;
  const style = el("style", "", root);
  style.textContent = G.config.css;

  hud.topLeft = el("div", "lj-panel lj-topleft", root);
  hud.clock = el("div", "lj-clock", hud.topLeft, "14:00");
  hud.day = el("div", "lj-day", hud.topLeft, G.config.day.label);
  hud.mission = el("div", "lj-mission", hud.topLeft);
  hud.missionTitle = el("div", "lj-mission-title", hud.mission, G.config.mission.name.toUpperCase());
  hud.missionLines = el("div", "lj-mission-lines", hud.mission);

  hud.topRight = el("div", "lj-panel lj-topright", root);
  hud.money = el("div", "lj-money", hud.topRight, "800 kr");
  hud.bars = {};
  for (const [id, label, colour] of [["buzz", "BUZZ", "#FF471C"], ["energy", "ENERGY", "#FFC607"], ["bladder", "BLADDER", "#5FD0E0"]]) {
    const row = el("div", "lj-bar-row", hud.topRight);
    el("span", "lj-bar-label", row, label);
    const track = el("div", "lj-bar", row);
    const fill = el("div", "lj-bar-fill", track);
    fill.style.background = colour;
    hud.bars[id] = fill;
    if (id === "buzz") {
      const mark = el("div", "lj-bar-mark", track);
      mark.style.left = G.config.rules.hammered_at + "%";
    }
  }
  hud.strikes = el("div", "lj-strikes", hud.topRight);

  hud.mapWrap = el("div", "lj-map", root);
  hud.map = el("canvas", "", hud.mapWrap);
  hud.map.width = hud.map.height = 400;
  hud.mapNorth = el("div", "lj-map-n", hud.mapWrap, "N");

  hud.now = el("div", "lj-panel lj-now", root);
  hud.prompt = el("div", "lj-prompt", root);
  hud.toasts = el("div", "lj-toasts", root);
  hud.banner = el("div", "lj-banner", root);
  hud.fade = el("div", "lj-fade", root);
  hud.vignette = el("div", "lj-vignette", root);
  hud.menu = el("div", "lj-menu", root);
  hud.keys = el("div", "lj-keys", root, "WASD move · mouse look · Shift run · Space jump · E use · F dance · Tab programme · T time flies · H help");
  hud.ending = el("div", "lj-ending", root);
  buildStartScreen(root);
}

function buildStartScreen(root) {
  hud.start = el("div", "lj-start", root);
  const card = el("div", "lj-start-card", hud.start);
  el("div", "lj-start-kicker", card, G.config.day.label.toUpperCase() + " · VEJBY 3210");
  el("h1", "", card, "YOUR MISSION");
  el("h2", "", card, G.config.mission.name);
  el("p", "", card, G.config.mission.goal);
  const keys = el("div", "lj-start-keys", card);
  for (const [key, what] of [["W A S D", "walk"], ["Mouse / ← →", "look around"], ["Shift", "run"], ["Space", "jump"], ["E", "use, buy, talk"], ["F", "dance"], ["Tab", "programme"], ["T (hold)", "let time fly"], ["P", "pee in the bushes"], ["H", "help and pause"]]) {
    const row = el("div", "lj-key-row", keys);
    el("b", "", row, key);
    el("span", "", row, what);
  }
  hud.startButton = el("button", "lj-start-button", card, "ENTER THE FESTIVAL");
  hud.loading = el("div", "lj-loading", card, "");
  hud.startButton.addEventListener("click", startPlaying);
}

function startPlaying() {
  if (!G.ready || !G.paused || G.over) return;
  hud.start.style.display = "none";
  initAudio();
  G.paused = false;
  G.started = true;
  toast("Welcome to Musik i Lejet. It is " + clockText(G.minute) + ".");
  const canvas = G.renderer.domElement;
  if (canvas.requestPointerLock) { try { const promise = canvas.requestPointerLock(); if (promise && promise.catch) promise.catch(() => {}); } catch (error) { /* fine */ } }
}

// ---------- messages ----------

function toast(text, kind = "") {
  if (!hud.toasts) return;
  const node = el("div", "lj-toast " + kind, hud.toasts, text);
  while (hud.toasts.children.length > 3) hud.toasts.removeChild(hud.toasts.firstChild);
  setTimeout(() => node.classList.add("out"), 3800);
  setTimeout(() => node.remove(), 4500);
}

function showBanner(title, subtitle, colour) {
  hud.banner.innerHTML = "";
  const big = el("div", "lj-banner-title", hud.banner, title);
  big.style.color = colour || "#FFC607";
  el("div", "lj-banner-sub", hud.banner, subtitle || "");
  G.bannerTime = 4.6;
}

function updateBanner(dt) {
  if (G.bannerTime <= 0) { if (hud.banner.style.opacity !== "0") hud.banner.style.opacity = "0"; return; }
  G.bannerTime -= dt;
  const t = 4.6 - G.bannerTime;
  hud.banner.style.opacity = String(clamp(Math.min(t / 0.3, G.bannerTime / 0.8), 0, 1));
  hud.banner.style.transform = "scale(" + (1 + clamp(1 - t / 0.3, 0, 1) * 0.25).toFixed(3) + ")";
}

function fadeTo(opacity, seconds) {
  hud.fade.style.transition = "opacity " + seconds + "s";
  hud.fade.style.opacity = opacity;
}

function showEnding(title, subtitle) {
  hud.ending.innerHTML = "";
  el("div", "lj-ending-title", hud.ending, title);
  el("div", "lj-ending-sub", hud.ending, subtitle);
  el("div", "lj-ending-wait", hud.ending, "Counting your night…");
  hud.ending.classList.add("show");
}

// ---------- menus (shops, conversations, help, programme) ----------

function openMenu(title, text, choices, wide) {
  G.menuOpen = { choices: choices };
  hud.menu.innerHTML = "";
  hud.menu.className = "lj-menu show" + (wide ? " wide" : "");
  el("div", "lj-menu-title", hud.menu, title);
  if (text) el("div", "lj-menu-text", hud.menu, text);
  choices.forEach((choice, index) => {
    const row = el("button", "lj-choice", hud.menu);
    el("b", "", row, String(index + 1));
    el("span", "", row, choice.label);
    row.addEventListener("click", () => chooseMenu(index));
  });
  el("div", "lj-menu-hint", hud.menu, choices.length ? "Press a number, or E to close" : "Press E or Esc to close");
  if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock();
}

function openPage(title, html) {
  openMenu(title, "", [], true);
  const body = el("div", "lj-page", null);
  body.innerHTML = html;
  hud.menu.insertBefore(body, hud.menu.lastChild);
}

function closeMenu() {
  G.menuOpen = null;
  if (hud.menu) hud.menu.className = "lj-menu";
}

function chooseMenu(index) {
  const menu = G.menuOpen;
  if (!menu || !menu.choices[index]) return;
  const choice = menu.choices[index];
  if (!choice.keep) closeMenu();
  choice.run();
  // A shop stays open so you can order again; update the "you have X kr" line.
  if (choice.keep && G.menuOpen === menu) {
    const text = hud.menu.querySelector(".lj-menu-text");
    if (text) text.textContent = "You have " + G.player.money + " kr.";
  }
}

function programmeHtml() {
  const stages = Object.values(G.stages);
  let html = '<div class="lj-prog">';
  for (const stage of stages) {
    html += '<div class="lj-prog-col"><h3>' + stage.name + "</h3>";
    for (const act of G.config.acts.filter((a) => a.stage === stage.id)) {
      const state = G.minute >= act.end ? "past" : G.minute >= act.start ? "live" : "";
      const favourite = G.config.favourites.includes(act.artist) ? " ★" : "";
      const seen = G.counted[act.id] ? " ✔" : "";
      html += '<div class="lj-prog-act ' + state + '"><b>' + clockText(act.start) + "–" + clockText(act.end) + "</b><span>" + act.artist + favourite + seen + "</span></div>";
    }
    html += "</div>";
  }
  return html + '</div><p class="lj-small">★ your favourites · ✔ concerts that count · it is now ' + clockText(G.minute) + "</p>";
}

function helpHtml() {
  return (
    "<p><b>" + G.config.mission.name + ".</b> " + G.config.mission.goal + "</p>" +
    '<div class="lj-help"><b>W A S D</b><span>walk</span><b>Mouse or ← →</b><span>look around (click the picture to grab the mouse)</span><b>Shift</b><span>run</span><b>Space</b><span>jump</span>' +
    "<b>E</b><span>use the thing in front of you: buy, talk, toilet, go home</span><b>F</b><span>dance (hold)</span><b>Tab</b><span>tonight's programme</span>" +
    "<b>T</b><span>hold to let time fly</span><b>P</b><span>pee in the bushes by the fence (risky)</span><b>M</b><span>sound on or off</span><b>H or Esc</b><span>this page (the game pauses)</span><b>Q</b><span>on this page: end the night now and count the score</span></div>" +
    '<p class="lj-small">Beer, drinks and shots raise your BUZZ. Past the white mark you are hammered; at 100 you pass out. Water, food and coffee bring it down. ' +
    "Stand in front of a stage for 10 minutes and the concert counts. Leave through the entrance when you have had enough: the night also ends at 04:00.</p>"
  );
}

// One key was pressed. (Walking keys are read every frame in 30_player.js instead.)
function handleKeyPress(code) {
  if (!G.started) { if ((code === "Enter" || code === "Space" || code === "KeyE") && G.ready) startPlaying(); return; }
  if (G.over) return;
  if (G.menuOpen) {
    if (code.startsWith("Digit")) chooseMenu(Number(code.slice(5)) - 1);
    else if (code === "KeyQ" && G.paused) { closeMenu(); G.paused = false; endNight("went_home"); }
    else if (code === "KeyE" || code === "Escape" || code === "Tab" || code === "KeyH") { closeMenu(); G.paused = false; }
    return;
  }
  if (code === "KeyE") interact();
  else if (code === "Tab") openPage("TONIGHT · " + G.config.day.label, programmeHtml());
  else if (code === "KeyH" || code === "Escape") { openPage("HELP · the game is paused", helpHtml()); G.paused = true; }
  else if (code === "KeyM") { audio.on = !audio.on; toast(audio.on ? "Sound on" : "Sound off"); }
  else if (code === "KeyP") { if (nearBushes()) peeInBushes(); else toast("Not here. Find the bushes by the fence, or a toilet."); }
}

// ---------- the mini-map ----------

const MAP_COLOURS = { bar: "#FFC607", food: "#FF8A3D", coffee: "#C98A4A", water: "#5FD0E0", toilet: "#7FB7E6", entrance: "#ffffff", firstaid: "#F29BC4", rest: "#ffffff", dance: "#B58CFF" };

function drawMap() {
  const ctx = hud.map.getContext("2d"), size = hud.map.width, half = size / 2;
  const p = G.player, zoom = 2.6; // map pixels per metre
  ctx.save();
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath(); ctx.arc(half, half, half - 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "#3c8f4a"; ctx.fillRect(0, 0, size, size);
  ctx.translate(half, half);
  ctx.rotate(G.cam.yaw - Math.PI); // turn the map so that "ahead" is up
  // The painted ground, moved so that the player is in the middle.
  const groundScale = GROUND.pixels / GROUND.width;
  ctx.save();
  ctx.scale(zoom / groundScale, zoom / groundScale);
  ctx.drawImage(G.groundCanvas, -(p.x - GROUND.x0) * groundScale, -(p.z - GROUND.z0) * groundScale);
  ctx.restore();
  const at = (x, z) => [(x - p.x) * zoom, (z - p.z) * zoom];
  // Buildings as small coloured squares.
  for (const place of G.places) {
    const [x, y] = at(place.x, place.z);
    if (Math.hypot(x, y) > half + 20) continue;
    if (place.kind === "stage") continue;
    ctx.fillStyle = MAP_COLOURS[place.kind] || "#d9d9d9";
    const s = clamp(Math.max(place.w, place.d) * zoom * 0.5, 7, 22);
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
    ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 1.5; ctx.strokeRect(x - s / 2, y - s / 2, s, s);
  }
  // Stages: big squares that flash while someone is playing. Far-away ones stick to the rim.
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);
  const markers = [];
  for (const id in G.stages) {
    const stage = G.stages[id];
    const favouriteHere = stage.act && G.config.favourites.includes(stage.act.artist) && !G.counted[stage.act.id] && G.config.mission.id === "music";
    markers.push({ x: stage.x, z: stage.z, colour: stage.act ? (favouriteHere ? "#FFC607" : "#FF471C") : "#1b1c21", ring: !!stage.act, size: 26, label: id === "sol" ? "SOL" : id === "skov" ? "SKOV" : "3210" });
  }
  for (const npc of G.npcs) if (npc.markerSprite && npc.markerSprite.visible && !npc.hidden) markers.push({ x: npc.x, z: npc.z, colour: npc.role === "crush" ? "#FF6FA5" : "#FFC607", size: 14, round: true });
  for (const pickup of G.pickups) if (!pickup.taken) markers.push({ x: pickup.x, z: pickup.z, colour: "#FFC607", size: 14, round: true, ring: true });
  for (const buggy of G.buggies) markers.push({ x: buggy.x, z: buggy.z, colour: "#D9F23A", size: 11, round: true });
  if (G.config.mission.id === "backstage" && !G.backstage.reached) { const b = localToWorld(G.stages.sol, -2, 0, -12); markers.push({ x: b[0], z: b[2], colour: "#FFC607", size: 12, round: true, ring: true }); }
  for (const marker of markers) {
    let [x, y] = at(marker.x, marker.z);
    const d = Math.hypot(x, y), limit = half - 16;
    if (d > limit) { x = (x / d) * limit; y = (y / d) * limit; }
    if (marker.ring) { ctx.strokeStyle = marker.colour === "#1b1c21" ? "#fff" : marker.colour; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, marker.size * (0.75 + pulse * 0.55), 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = marker.colour;
    if (marker.round) { ctx.beginPath(); ctx.arc(x, y, marker.size / 2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.stroke(); }
    else {
      ctx.fillRect(x - marker.size / 2, y - marker.size / 2, marker.size, marker.size);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(x - marker.size / 2, y - marker.size / 2, marker.size, marker.size);
      if (marker.label) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(-(G.cam.yaw - Math.PI));
        ctx.font = "bold 15px " + FONT; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "#000"; ctx.strokeText(marker.label, 0, -marker.size * 0.8); ctx.fillStyle = "#fff"; ctx.fillText(marker.label, 0, -marker.size * 0.8);
        ctx.restore();
      }
    }
  }
  ctx.restore();
  // You: an arrow in the middle, pointing the way your character faces.
  ctx.save();
  ctx.translate(half, half);
  ctx.rotate(G.cam.yaw - p.heading);
  ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#111"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(11, 12); ctx.lineTo(0, 6); ctx.lineTo(-11, 12); ctx.closePath(); ctx.stroke(); ctx.fill();
  ctx.restore();
  // The N on the rim shows where north is.
  const northAngle = G.cam.yaw - Math.PI;
  hud.mapNorth.style.transform = "translate(-50%, -50%) rotate(" + northAngle + "rad) translateY(-" + 104 + "px) rotate(" + -northAngle + "rad)";
}

// ---------- every frame ----------

let hudFrame = 0;
function updateHud() {
  hudFrame++;
  const p = G.player;
  hud.clock.textContent = clockText(G.minute) + (G.fast ? " ▶▶" : "");
  hud.money.textContent = p.money + " kr";
  hud.bars.buzz.style.width = clamp(p.buzz, 0, 100) + "%";
  hud.bars.energy.style.width = p.energy + "%";
  hud.bars.bladder.style.width = p.bladder + "%";
  hud.bars.bladder.parentElement.classList.toggle("warn", p.bladder >= 88);
  hud.bars.buzz.parentElement.classList.toggle("warn", p.buzz >= G.config.rules.hammered_at);
  if (hudFrame % 3 === 0) drawMap();
  if (hudFrame % 6 === 0) {
    updateFocus();
    hud.strikes.textContent = p.strikes > 0 ? "SECURITY STRIKES  " + "■".repeat(p.strikes) + "□".repeat(3 - p.strikes) : "";
    // The mission box.
    hud.missionLines.innerHTML = "";
    for (const line of missionLines()) el("div", "lj-line" + (line.done ? " done" : "") + (line.failed ? " failed" : ""), hud.missionLines, (line.done ? "✔ " : line.failed ? "✘ " : "○ ") + line.text);
    // Who is playing right now.
    hud.now.innerHTML = "";
    for (const id in G.stages) {
      const stage = G.stages[id];
      const row = el("div", "lj-now-row" + (stage.act ? " live" : ""), hud.now);
      el("b", "", row, stage.name);
      el("span", "", row, stage.act ? "LIVE · " + stage.act.artist + " (to " + clockText(stage.act.end) + ")" : stage.nextAct ? clockText(stage.nextAct.start) + " · " + stage.nextAct.artist : "done for tonight");
    }
  }
  // "Press E to ..." at the bottom, or the concert you are watching.
  let prompt = "";
  if (!G.menuOpen && !p.frozen) {
    if (G.focus) prompt = "<b>E</b> " + G.focus.label;
    else if (G.watching) {
      const need = G.config.rules.minutes_to_count_a_concert, minutes = minutesWatched(G.watching.act);
      prompt = "♪ " + G.watching.act.artist + (minutes >= need ? " · counted ✔" : " · " + minutes + "/" + need + " min") + " · hold <b>F</b> to dance";
    }
  }
  if (prompt !== hud.promptText) { hud.promptText = prompt; hud.prompt.innerHTML = prompt; hud.prompt.style.opacity = prompt ? 1 : 0; }
  // Drunk: the picture blurs and the colours run. Tired: the edges go dark.
  const drunk = clamp((p.buzz - 30) / 70, 0, 1);
  const filter = drunk > 0.05 ? "blur(" + (drunk * 2.4).toFixed(2) + "px) saturate(" + (1 + drunk * 0.7).toFixed(2) + ") hue-rotate(" + (Math.sin(performance.now() / 900) * drunk * 18).toFixed(1) + "deg)" : "";
  if (filter !== hud.filter) { hud.filter = filter; G.renderer.domElement.style.filter = filter; }
  hud.vignette.style.opacity = clamp((25 - p.energy) / 25, 0, 1) * 0.8;
}

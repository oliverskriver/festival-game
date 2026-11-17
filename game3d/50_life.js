// ============================================================================
// 50_life.js — the evening itself: time passing, getting drunk and sobering
// up, buying things, toilets, passing out, and how the night ends.
//
// The numbers (prices, how strong a beer is, when you pass out) all come from
// game.py through G.config. This file applies them while you play and writes
// every purchase into the event list; Python's referee recounts it afterwards.
// ============================================================================

const GAME_MINUTES_PER_SECOND = 1.4; // one festival hour takes about 43 seconds
const FAST_FORWARD = 22; // hold T to let time fly

function updateTime(dt) {
  const p = G.player, rules = G.config.rules;
  const fast = G.keys.KeyT && !G.menuOpen && !p.frozen ? FAST_FORWARD : 1;
  G.fast = fast > 1;
  const minutes = dt * GAME_MINUTES_PER_SECOND * fast;
  G.minute += minutes;
  p.buzz = Math.max(0, p.buzz - minutes * rules.buzz_fade_per_minute);
  p.energy = clamp(p.energy - minutes * 0.13 - (p.dancing ? minutes * 0.2 : 0), 0, 100);
  p.bladder = clamp(p.bladder + minutes * 0.05, 0, 100);
  if (p.bladder >= 88 && !p.warnedBladder) { p.warnedBladder = true; toast("You really need a toilet. No running until you go."); }
  if (p.bladder < 60) p.warnedBladder = false;
  if (p.energy <= 3 && !p.warnedEnergy) { p.warnedEnergy = true; toast("You are exhausted. Eat something, get a coffee or rest in a tent."); }
  if (p.energy > 25) p.warnedEnergy = false;
  updateWatching();
  // The last ten minutes: fireworks over the whole site.
  if (G.minute >= rules.closes - 10 && !G.finale) { G.finale = true; launchFireworks(0, 0, 30); toast("Ten minutes left. Look up!", "live"); }
  if (G.minute >= rules.closes) endNight("closing");
}

// ---------- watching concerts ----------

// Minutes of this act you have stood at, counted exactly like game.minutes_watched in Python.
function minutesWatched(act) {
  let total = 0;
  const segments = G.events.filter((e) => e.type === "watch" && e.act === act.id).map((e) => [e.from, e.to]);
  if (G.watching && G.watching.act.id === act.id) segments.push([G.watching.from, Math.floor(G.minute)]);
  for (const [from, to] of segments) {
    const start = Math.max(from, act.start), end = Math.min(to, act.end);
    if (end > start) total += end - start;
  }
  return total;
}

function stopWatching() {
  if (!G.watching) return;
  const from = G.watching.from, to = Math.floor(G.minute);
  if (to > from) logEvent({ type: "watch", act: G.watching.act.id, from: from, to: to });
  G.watching = null;
}

function updateWatching() {
  const stage = stageAtPlayer();
  const act = stage && stage.act ? stage.act : null;
  if (G.watching && (!act || act.id !== G.watching.act.id)) stopWatching();
  if (act && !G.watching) G.watching = { act: act, from: Math.floor(G.minute), stage: stage };
  if (act) {
    const need = G.config.rules.minutes_to_count_a_concert;
    if (minutesWatched(act) >= need && !G.counted[act.id]) {
      G.counted[act.id] = true;
      toast("Concert counted: " + act.artist + " ✔", "good");
      blip("good");
    }
  }
}

// ---------- buying ----------

const DRINKS = ["beer", "drink", "shot"];

function buy(itemId, place) {
  const p = G.player, item = G.config.items[itemId];
  if (!item) return false;
  if (item.price > p.money) { toast("Not enough money for " + item.name + " (" + item.price + " kr)."); blip("bad"); return false; }
  p.money -= item.price;
  G.minute += 2; // standing in the queue
  logEvent({ type: "buy", minute: Math.floor(G.minute), item: itemId, place: place ? place.id : "" });
  if (itemId === "gift") { blip("coin"); return true; }
  p.buzz = Math.max(0, p.buzz + item.buzz);
  p.energy = clamp(p.energy + item.energy, 0, 100);
  p.bladder = clamp(p.bladder + (DRINKS.includes(itemId) ? 15 : itemId === "food" ? 0 : 8), 0, 100);
  p.drinkTime = 2.2;
  G.peakBuzz = Math.max(G.peakBuzz, p.buzz);
  blip("coin");
  const words = { beer: "Skål!", drink: "Skål!", shot: "Bunden i vejret!", water: "Ahh. Water.", food: "Mmm. That helped.", coffee: "Awake again." };
  toast(words[itemId] + " " + item.name + (item.price ? " · " + item.price + " kr" : " · free"));
  if (p.buzz >= G.config.rules.pass_out_at) passOut();
  else if (p.buzz >= G.config.rules.hammered_at && !p.saidHammered) { p.saidHammered = true; toast("You are hammered. One or two more and you fall over."); }
  if (p.buzz < G.config.rules.hammered_at - 15) p.saidHammered = false;
  return true;
}

// Too much: the screen goes black and you wake up at first aid two hours later.
function passOut() {
  const p = G.player;
  if (p.frozen) return;
  if (p.driving) leaveBuggy(true);
  p.frozen = true;
  G.passedOut = true;
  closeMenu();
  blip("bad");
  fadeTo(1, 1.2);
  showBanner("YOU PASSED OUT", "Somebody carries you to Førstehjælp…", "#FF471C");
  setTimeout(() => {
    if (G.over) return;
    stopWatching();
    G.minute += 120;
    p.buzz = Math.max(0, p.buzz - 120 * G.config.rules.buzz_fade_per_minute);
    const firstAid = G.places.find((place) => place.kind === "firstaid");
    p.x = firstAid.x + firstAid.facing.x * 5; p.z = firstAid.z + firstAid.facing.z * 5;
    // The medic makes you drink three cups of water (written down like any other purchase).
    for (let i = 0; i < 3; i++) { logEvent({ type: "buy", minute: Math.floor(G.minute), item: "water", place: firstAid.id }); p.buzz = Math.max(0, p.buzz + G.config.items.water.buzz); }
    p.energy = clamp(p.energy + 30, 0, 100);
    if (G.minute >= G.config.rules.closes) { endNight("passed_out"); return; }
    fadeTo(0, 1.5);
    p.frozen = false;
    toast("You wake up at Førstehjælp at " + clockText(G.minute) + ". The medic made you drink water.");
    if (G.config.mission.id === "party") toast("Mission failed: you did not stay standing.", "bad");
  }, 3800);
}

// ---------- using places ----------

const PLACE_ACTIONS = { bar: "buy a drink", food: "buy food", coffee: "buy coffee", water: "drink water (free)", toilet: "use the toilet", rest: "rest for 30 minutes", entrance: "go home", firstaid: "say hi to the medic", info: "look", landmark: "look", dance: "" };

function usePlace(place) {
  const p = G.player;
  if (place.sells.length > 0) {
    if (place.kind === "water") { buy("water", place); return; }
    const choices = place.sells.map((id) => ({ label: G.config.items[id].name + "  ·  " + G.config.items[id].price + " kr", run: () => buy(id, place), keep: true }));
    for (const extra of missionShopChoices(place)) choices.push(extra); // in 60_missions.js
    openMenu(place.name, "You have " + p.money + " kr.", choices);
  } else if (place.kind === "toilet") {
    const queue = 2 + Math.floor(rand() * 5);
    G.minute += queue;
    p.bladder = 0;
    toast("Much better. That took " + queue + " minutes of queueing.");
    blip("good");
  } else if (place.kind === "rest") {
    p.frozen = true;
    fadeTo(1, 0.6);
    setTimeout(() => {
      G.minute += 30;
      p.buzz = Math.max(0, p.buzz - 30 * G.config.rules.buzz_fade_per_minute);
      p.energy = clamp(p.energy + 35, 0, 100);
      p.frozen = false;
      fadeTo(0, 0.8);
      toast("You rested for half an hour in " + place.name + ". It is " + clockText(G.minute) + ".");
    }, 900);
  } else if (place.kind === "entrance") {
    openMenu("Go home?", "The night ends here and your score is counted. It is " + clockText(G.minute) + ".", [
      { label: "Yes, I am done for tonight", run: () => endNight("went_home") },
      { label: "No, stay", run: () => {} },
    ]);
  } else if (place.kind === "firstaid") {
    toast("Medic: “Drink water between the beers, and you will not see me again tonight.”");
  } else if (place.id === "fyrtaarnet") {
    toast("1664 Fyrtårnet. At night its light sweeps over the whole site.");
  } else {
    toast(place.name + ": nothing to do here tonight.");
  }
}

// How far is the player from the outside of a building?
function distanceToPlace(place) {
  const p = G.player, a = turnToAngle(place.turn);
  const dx = p.x - place.x, dz = p.z - place.z;
  const lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a);
  return Math.hypot(Math.max(Math.abs(lx) - place.w / 2, 0), Math.max(Math.abs(lz) - place.d / 2, 0));
}

// Find the thing the player can use right now: the closest person to talk to, else the closest place.
function updateFocus() {
  let best = null, bestDistance = 2.8;
  for (const npc of G.npcs) {
    if (!npc.talk || npc.hidden) continue;
    const d = dist2d(G.player.x, G.player.z, npc.x, npc.z);
    if (d < 2.6 && d < bestDistance + 1) { best = { npc: npc, label: npc.prompt || "talk to " + npc.name }; bestDistance = d - 1; }
  }
  if (!best) {
    for (const pickup of G.pickups) {
      if (pickup.taken) continue;
      const d = dist2d(G.player.x, G.player.z, pickup.x, pickup.z);
      if (d < 2.2) { best = { pickup: pickup, label: pickup.label }; break; }
    }
  }
  if (!best && !G.player.driving) {
    for (const buggy of G.buggies) {
      if (dist2d(G.player.x, G.player.z, buggy.x, buggy.z) < 2.8) { best = { buggy: buggy, label: "borrow the security buggy" }; break; }
    }
  }
  if (G.player.driving) best = { leave: true, label: "get out of the buggy" };
  if (!best) {
    for (const place of G.places) {
      const action = PLACE_ACTIONS[place.kind];
      if (!action) continue;
      const d = distanceToPlace(place);
      if (d < bestDistance) { bestDistance = d; best = { place: place, label: action + " · " + place.name }; }
    }
  }
  G.focus = best;
}

function interact() {
  const focus = G.focus;
  if (!focus || G.player.frozen) return;
  if (focus.leave) leaveBuggy();
  else if (focus.buggy) enterBuggy(focus.buggy);
  else if (focus.npc) focus.npc.talk(focus.npc);
  else if (focus.pickup) focus.pickup.take(focus.pickup);
  else if (focus.place) usePlace(focus.place);
}

// ---------- the end of the night ----------

function endNight(reason) {
  if (G.over) return;
  stopWatching();
  if (G.player.driving) leaveBuggy(true);
  const minute = Math.min(Math.floor(G.minute), G.config.rules.closes);
  logEvent({ type: "end", minute: minute, reason: reason });
  G.over = true;
  G.paused = true;
  closeMenu();
  if (document.exitPointerLock) document.exitPointerLock();
  const words = {
    closing: ["04:00 · THE LIGHTS COME ON", "The festival is closing. What a night."],
    went_home: ["GOING HOME", "You walk out through the gate at " + clockText(minute) + "."],
    passed_out: ["LIGHTS OUT", "You slept through the rest of the festival."],
    thrown_out: ["THROWN OUT", "Security walks you to the gate. Three strikes."],
  }[reason] || ["THE END", ""];
  showEnding(words[0], words[1]);
  // Hand the list of events to Python. Its referee decides what the night was worth.
  setTimeout(() => {
    G.component.setStateValue("result", { run_id: G.config.run_id, events: G.events, reason: reason });
    G.component.setTriggerValue("finished", G.config.run_id);
  }, 2600);
}

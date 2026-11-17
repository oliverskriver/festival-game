// ============================================================================
// 60_missions.js — the four missions and the people who belong to them:
// security guards, the crew member, the backstage area, and your festival flirts.
// ============================================================================

G.npcs = [];
G.pickups = [];

function addNpc(options) {
  const character = buildCharacter(options.look);
  G.scene.add(character.group);
  const npc = Object.assign({ character: character, heading: 0, mode: "idle", speed: 1.5, hidden: false }, options);
  // A floating marker above the head so you can find them.
  if (options.marker) {
    const texture = textTexture(options.marker, { bg: "rgba(0,0,0,0)", fg: options.markerColour || "#FFC607", width: 128, height: 128, size: 110 });
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, fog: false }));
    sprite.scale.set(0.9, 0.9, 1);
    sprite.position.y = 2.5;
    character.group.add(sprite);
    npc.markerSprite = sprite;
  }
  G.npcs.push(npc);
  return npc;
}

// Walk an NPC towards a point. Returns true when it has arrived.
function walkNpc(npc, tx, tz, dt) {
  const dx = tx - npc.x, dz = tz - npc.z, d = Math.hypot(dx, dz);
  if (d < 0.4) { npc.mode = "idle"; return true; }
  const want = Math.atan2(dx, dz);
  let turn = want - npc.heading;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;
  npc.heading += clamp(turn, -5 * dt, 5 * dt);
  const step = Math.min(d, npc.speed * dt);
  const free = pushOutOfColliders(npc.x + Math.sin(npc.heading) * step, npc.z + Math.cos(npc.heading) * step, 0.35);
  npc.x = free.x; npc.z = free.z;
  npc.mode = npc.speed > 3 ? "run" : "walk";
  return false;
}

function updateNpcs(dt) {
  for (const npc of G.npcs) {
    if (npc.update) npc.update(npc, dt);
    npc.character.group.visible = !npc.hidden;
    npc.character.group.position.set(npc.x, npc.y || 0, npc.z);
    npc.character.group.rotation.y = npc.heading;
    animateCharacter(npc.character, npc.mode, dt, npc.speed / 1.5);
    if (npc.markerSprite) npc.markerSprite.position.y = 2.5 + Math.sin(performance.now() / 300) * 0.08;
  }
}

const GUARD_LOOK = { skin: "#E0A878", hair: "short", hair_colour: "#1E1A18", top: "shirt", top_colour: "#D9F23A", bottom: "jeans", bottom_colour: "#22252B", hat: "cap", glasses: "sun", shoes: "boots" };

// Can this guard see the player? (Close enough, and roughly in front of the guard.)
function guardSees(guard, range = 16) {
  const p = G.player, dx = p.x - guard.x, dz = p.z - guard.z, d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d < 2.5) return true;
  const ahead = (dx * Math.sin(guard.heading) + dz * Math.cos(guard.heading)) / d;
  return ahead > 0.45;
}

// Being caught by security: one strike. Three strikes and you are out.
function caught(reason, sendTo) {
  const p = G.player;
  if (p.frozen || G.over) return;
  p.strikes += 1;
  logEvent({ type: "caught", minute: Math.floor(G.minute), reason: reason });
  blip("bad");
  showBanner("CAUGHT · STRIKE " + p.strikes + " OF 3", reason, "#FF471C");
  if (p.strikes >= 3) { setTimeout(() => endNight("thrown_out"), 1500); return; }
  if (sendTo) {
    p.frozen = true;
    fadeTo(1, 0.4);
    setTimeout(() => { p.x = sendTo[0]; p.z = sendTo[1]; p.frozen = false; fadeTo(0, 0.6); }, 700);
  }
}

// ---------- security guards on patrol ----------

function buildGuards() {
  const routes = [
    [mapPoint(640, 800), mapPoint(800, 900), mapPoint(820, 1050), mapPoint(700, 1150), mapPoint(560, 1170), mapPoint(470, 1100), mapPoint(450, 1000), mapPoint(462, 860)],
    [mapPoint(300, 940), mapPoint(400, 932), mapPoint(380, 1042), mapPoint(300, 1112), mapPoint(252, 1182), mapPoint(330, 1250)],
    [mapPoint(1000, 795), mapPoint(1012, 902), mapPoint(1000, 1100), mapPoint(902, 1150)],
  ];
  routes.forEach((route, index) => {
    addNpc({
      id: "guard" + index, name: "Security", role: "guard", look: GUARD_LOOK, x: route[0][0], z: route[0][1], route: route, at: 0, direction: 1, speed: 1.3,
      talk: () => toast(pick(["Security: “Hav en god aften. Og drik noget vand.”", "Security: “Backstage? Only with a crew wristband.”", "Security: “Toilets are that way. Use them.”"])),
      update: (npc, dt) => {
        const target = npc.route[npc.at];
        if (walkNpc(npc, target[0], target[1], dt)) {
          if (npc.at + npc.direction < 0 || npc.at + npc.direction >= npc.route.length) npc.direction *= -1;
          npc.at += npc.direction;
        }
      },
    });
  });
}

// Peeing in the bushes is quick, but not if a guard is looking.
function nearBushes() {
  const p = G.player, fence = G.config.fence;
  for (let i = 0; i < fence.length; i++) {
    const a = fence[i], b = fence[(i + 1) % fence.length];
    const abx = b[0] - a[0], abz = b[1] - a[1];
    const t = clamp(((p.x - a[0]) * abx + (p.z - a[1]) * abz) / (abx * abx + abz * abz), 0, 1);
    if (dist2d(p.x, p.z, a[0] + abx * t, a[1] + abz * t) < 5) return true;
  }
  return false;
}

function peeInBushes() {
  const p = G.player;
  if (p.bladder < 30) { toast("You do not need to go yet."); return; }
  const watcher = G.npcs.find((npc) => npc.role === "guard" && dist2d(npc.x, npc.z, p.x, p.z) < 30 && guardSees(npc, 30));
  if (watcher) { caught("Security saw you peeing in the bushes.", null); p.bladder = 0; return; }
  p.bladder = 0;
  G.minute += 1;
  toast("Nobody saw that. Probably.");
  for (const crush of G.crushes) if (dist2d(crush.x, crush.z, p.x, p.z) < 18) { crush.chemistry = Math.max(0, crush.chemistry - 20); toast(crush.name + " saw you in the bushes. Not impressed."); }
}

// ---------- backstage ----------

const BACKSTAGE = { left: -13, right: 9, back: -17, front: -7.5, gateFrom: -13.5, gateTo: -10.2 };

function buildBackstage() {
  const stage = G.stages.sol;
  const g = stage.group;
  const cloth = "#15161a";
  const wall = (x1, z1, x2, z2) => {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const panel = box(length, 2.3, 0.15, cloth, (x1 + x2) / 2, 1.15, (z1 + z2) / 2);
    panel.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    g.add(panel);
    const a = localToWorld(stage, x1, 0, z1), b = localToWorld(stage, x2, 0, z2);
    addCollider((a[0] + b[0]) / 2, (a[2] + b[2]) / 2, length / 2, 0.25, -Math.atan2(b[2] - a[2], b[0] - a[0]), "backstage");
  };
  const B = BACKSTAGE;
  wall(B.left, B.back, B.right, B.back);
  wall(B.left, B.back, B.left, B.front);
  wall(B.right, B.back, B.right, B.gateFrom);
  wall(B.right, B.gateTo, B.right, B.front);
  wall(B.left, B.front - 0.1, -15, B.front - 0.1); // closes the gap to the stage's side wall
  wall(B.right, B.front - 0.1, 15, B.front - 0.1);
  // What is inside: flight cases, a sofa, a fridge and a table with a rider.
  for (const [x, z, w, h, d] of [[-10, -15, 2, 1.2, 1.2], [-8, -15.2, 1.2, 1.8, 1.2], [-11, -10, 1.4, 1, 2.2], [4, -15.5, 2.4, 1.1, 1.1]]) g.add(box(w, h, d, "#2b2d33", x, h / 2, z, { metalness: 0.5, roughness: 0.5 }));
  g.add(box(3.2, 0.5, 1.2, "#D8342B", -3, 0.35, -15.6));
  g.add(box(3.2, 0.9, 0.3, "#D8342B", -3, 0.75, -16.2));
  g.add(box(0.9, 1.7, 0.8, "#f3f3f3", 1, 0.85, -16));
  g.add(box(2.2, 0.08, 1.0, "#c9a66b", -3, 0.8, -11.5));
  const board = sign("BACKSTAGE · CREW ONLY", 4.2, 0.8, "#111111", "#FFC607");
  board.position.set(B.right + 0.12, 2.9, (B.gateFrom + B.gateTo) / 2);
  board.rotation.y = Math.PI / 2;
  g.add(board);
  const a = localToWorld(stage, B.left, 3, B.back), b = localToWorld(stage, B.right, 3, B.back);
  addBulbString(a[0], 3, a[2], b[0], 3, b[2], "#ffd98a", 0.8);
  const centre = localToWorld(stage, (B.left + B.right) / 2, 0, (B.back + B.front) / 2);
  G.lightPools.push([centre[0], centre[2], 16]);
  G.backstage = { stage: stage, inside: false, timeInside: 0, reached: false };
}

function playerInBackstage() {
  const stage = G.stages.sol, p = G.player, a = turnToAngle(stage.turn);
  const dx = p.x - stage.x, dz = p.z - stage.z;
  const lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a);
  return lx > BACKSTAGE.left && lx < BACKSTAGE.right && lz > BACKSTAGE.back && lz < BACKSTAGE.front;
}

function buildBackstageGuard() {
  const stage = G.stages.sol;
  const post = localToWorld(stage, BACKSTAGE.right + 2.2, 0, (BACKSTAGE.gateFrom + BACKSTAGE.gateTo) / 2);
  const breakSpot = localToWorld(stage, 21, 0, 1);
  const lookOut = Math.atan2(localToWorld(stage, 30, 0, -12)[0] - post[0], localToWorld(stage, 30, 0, -12)[2] - post[2]);
  G.gateGuard = addNpc({
    id: "gateguard", name: "Backstage guard", role: "guard", look: Object.assign({}, GUARD_LOOK, { hat: "none", hair: "bald" }), x: post[0], z: post[2], heading: lookOut,
    phase: "post", timer: 9, speed: 1.4,
    talk: (npc) => {
      if (G.wristband) toast("Guard: “Crew wristband? Go on in.”");
      else toast("Guard: “Crew only. No wristband, no backstage.” (He takes a smoke break now and then…)");
    },
    update: (npc, dt) => {
      npc.timer -= dt;
      if (npc.phase === "post") { npc.mode = "idle"; npc.heading = lookOut + Math.sin(performance.now() / 1400) * 0.5; if (npc.timer <= 0) npc.phase = "leaving"; }
      else if (npc.phase === "leaving") { if (walkNpc(npc, breakSpot[0], breakSpot[2], dt)) { npc.phase = "break"; npc.timer = 9; } }
      else if (npc.phase === "break") { npc.mode = "idle"; npc.heading = Math.atan2(stage.audience.x - npc.x, stage.audience.z - npc.z); if (npc.timer <= 0) npc.phase = "returning"; }
      else if (npc.phase === "returning") { if (walkNpc(npc, post[0], post[2], dt)) { npc.phase = "post"; npc.timer = 10; } }
    },
  });
}

function updateBackstage(dt) {
  const state = G.backstage, inside = playerInBackstage();
  if (!inside) { state.timeInside = 0; return; }
  state.timeInside += dt;
  if (state.reached || G.wristband) {
    if (!state.reached) reachBackstage("The guard nods at your crew wristband.");
    return;
  }
  // Without a wristband you must not be seen.
  const guard = G.gateGuard;
  const atTheGate = guard.phase === "post" && dist2d(guard.x, guard.z, G.player.x, G.player.z) < 9;
  if (atTheGate || guardSees(guard, 15)) {
    const zone = state.stage.audience;
    caught("The guard spotted you sneaking backstage.", [zone.x, zone.z]);
    state.timeInside = 0;
  } else if (state.timeInside > 2.5) reachBackstage("You slipped in while the guard was not looking.");
}

function reachBackstage(text) {
  G.backstage.reached = true;
  logEvent({ type: "backstage", minute: Math.floor(G.minute) });
  blip("good");
  if (G.config.mission.id === "backstage") showBanner("MISSION COMPLETE", "You are backstage at Solscenen. " + text, "#FFC607");
  else toast("You are backstage! " + text, "good");
}

// The tired crew member who knows where a lost wristband is.
function buildCrew() {
  const firbenet = G.places.find((p) => p.id === "firbenet");
  const spot = [firbenet.x + firbenet.facing.x * 9, firbenet.z + firbenet.facing.z * 9];
  const hidingSpots = [mapPoint(330, 1160), mapPoint(700, 770), mapPoint(250, 1090), mapPoint(600, 1250), mapPoint(980, 900)];
  const hidden = hidingSpots[hashText(G.config.run_id) % hidingSpots.length];
  const free = pushOutOfColliders(hidden[0], hidden[1], 0.8);
  G.crew = addNpc({
    id: "crew", name: "Jonas (stage crew)", role: "crew", marker: G.config.mission.id === "backstage" ? "!" : "", look: { skin: "#F2C9A5", hair: "long", hair_colour: "#5A3A22", top: "tshirt", top_colour: "#22252B", bottom: "shorts", bottom_colour: "#22252B", hat: "none", glasses: "none", shoes: "boots" },
    x: spot[0], z: spot[1], heading: Math.atan2(firbenet.facing.x, firbenet.facing.z), stage: 0,
    talk: (npc) => {
      if (npc.stage === 0) {
        openMenu("Jonas (stage crew)", "“I have been lifting flight cases since eight this morning. I would kill for a coffee and a pølse.”", [
          { label: "I will get you something. (costs 65 kr at any coffee place)", run: () => { npc.stage = 1; toast("Buy “Something for Jonas” at The Coffee Lounge or Joe & the Juice."); } },
          { label: "Good luck with that.", run: () => {} },
        ]);
      } else if (npc.stage === 1) {
        toast("Jonas: “Coffee places are marked on your map. I will be right here.”");
      } else if (npc.stage === 2) {
        npc.stage = 3;
        if (npc.markerSprite) npc.markerSprite.visible = false;
        const name = nearestPlaceName(free.x, free.z);
        openMenu("Jonas (stage crew)", "“You are a hero. Listen: one of the roadies lost his crew wristband near " + name + ". Find it and the backstage guard will wave you through.”", [{ label: "Thanks, Jonas!", run: () => {} }]);
        addPickup(free.x, free.z, "pick up the crew wristband", () => {
          G.wristband = true;
          toast("You found a crew wristband! The backstage guard will let you in now.", "good");
          blip("good");
        });
      } else {
        toast("Jonas: “Did you find it? Near " + nearestPlaceName(free.x, free.z) + ".”");
      }
    },
  });
}

function nearestPlaceName(x, z) {
  let best = null, bestDistance = 1e9;
  for (const place of G.places) {
    const d = dist2d(x, z, place.x, place.z);
    if (d < bestDistance) { bestDistance = d; best = place; }
  }
  return best.name;
}

// A glowing thing on the ground you can pick up.
function addPickup(x, z, label, onTake) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 6, 14), glow("#FFC607"));
  mesh.position.set(x, 0.7, z);
  G.scene.add(mesh);
  const pickup = { x: x, z: z, label: label, mesh: mesh, taken: false, take: (self) => { self.taken = true; G.scene.remove(self.mesh); onTake(); } };
  G.pickups.push(pickup);
  G.updaters.push((dt) => { mesh.rotation.y += dt * 2; mesh.position.y = 0.7 + Math.sin(performance.now() / 300) * 0.15; });
  return pickup;
}

// Extra things you can buy while on a mission (shown in a shop's menu).
function missionShopChoices(place) {
  const choices = [];
  if (G.crew && G.crew.stage === 1 && place.kind === "coffee") {
    choices.push({ label: "Something for Jonas (coffee and a pølse)  ·  65 kr", run: () => { if (buy("gift", place)) { G.crew.stage = 2; toast("Now bring it to Jonas at Firbenet."); } } });
  }
  if (place.kind === "bar") {
    for (const crush of G.crushes) {
      if (!crush.hidden && dist2d(crush.x, crush.z, G.player.x, G.player.z) < 14 && !crush.treated) {
        choices.push({ label: "A drink for " + crush.name + "  ·  65 kr", run: () => { if (buy("gift", place)) { crush.treated = true; changeChemistry(crush, 25, crush.name + ": “For me? Tak!”"); } } });
      }
    }
  }
  return choices;
}

// ---------- the flirt mission ----------

G.crushes = [];

const CRUSH_NAMES = { women: ["Asta", "Freja", "Liv"], men: ["Malthe", "Villads", "Storm"] };

// Three people with different tastes. "likes" says what wins them over.
const CRUSH_TYPES = [
  {
    type: "dancer", home: "dansevand", about: "lives for the dance floor",
    hello: "“You look like someone who can dance. Can you?”",
    questions: [
      ["“Best place at this festival?”", ["Right in front of the speakers at Solscenen.", 15], ["Wherever you are dancing.", 15], ["The queue for the toilets. Great people.", -10]],
      ["“What do you do when your song comes on?”", ["Drop everything and run to the stage.", 15], ["Nod along politely.", 0], ["Check my phone.", -10]],
      ["“Dansevand at midnight. Are you in?”", ["Try to stop me.", 15], ["If my feet survive.", 5], ["I do not really dance.", -10]],
    ],
  },
  {
    type: "foodie", home: "fiskerbaren", about: "is here for the food and the drinks",
    hello: "“I have eaten at six stalls already. Do not judge me.”",
    questions: [
      ["“Fish and chips or Smæskesteg?”", ["Both. Obviously both.", 15], ["Smæskesteg, with everything on.", 10], ["I brought a sandwich from home.", -10]],
      ["“What is the right number of festival beers?”", ["One more than last time I checked.", 10], ["Enough to dance, not enough to fall over.", 15], ["Until I pass out.", -10]],
      ["“Would you share your fries with me?”", ["You can have all of them.", 15], ["Half. Maybe.", 5], ["Never. Fries are sacred.", -5]],
    ],
  },
  {
    type: "fan", home: "klub", about: "came for the music and knows every artist",
    hello: "“Did you look at the programme? There is so much I need to see.”",
    questions: [
      ["“Big headliner or small stage?”", ["Small stage. That is where you find your new favourite.", 15], ["Headliner, hands in the air.", 10], ["I mostly stay at the bar.", -10]],
      ["“What makes a concert great?”", ["When the whole crowd sings along.", 15], ["Good sound and a cold beer.", 10], ["When it is over quickly.", -15]],
      ["“Klub 3210 is my favourite corner. Yours?”", ["I think it just became mine.", 15], ["Skovscenen, among the trees.", 10], ["The exit.", -15]],
    ],
  },
];

function buildCrushes() {
  if (G.config.mission.id !== "flirt") return;
  const into = G.config.player.look.into || "everyone";
  const random = makeRandom(hashText(G.config.run_id));
  CRUSH_TYPES.forEach((type, index) => {
    const gender = into === "everyone" ? (random() < 0.5 ? "women" : "men") : into;
    const look = randomLook(random);
    look.hair = gender === "women" ? pick(["long", "bun", "long"]) : pick(["short", "short", "bald"]);
    look.bottom = gender === "women" ? pick(["skirt", "shorts"]) : pick(["shorts", "jeans"]);
    look.hat = "none";
    const home = G.places.find((p) => p.id === type.home);
    const start = home.kind === "stage" ? [home.audience.x, home.audience.z] : [home.x + home.facing.x * (home.d / 2 + 4), home.z + home.facing.z * (home.d / 2 + 4)];
    const free = pushOutOfColliders(start[0], start[1], 0.5);
    const crush = addNpc({
      id: "crush" + index, name: CRUSH_NAMES[gender][index], role: "crush", marker: "♥", markerColour: "#FF6FA5", look: look,
      x: free.x, z: free.z, homeX: free.x, homeZ: free.z, type: type, chemistry: 0, asked: 0, nextTalk: 0, treated: false, dancedWith: 0, goal: null, speed: 1.6,
      talk: talkToCrush,
      update: updateCrush,
    });
    G.crushes.push(crush);
  });
}

function changeChemistry(crush, amount, line) {
  const p = G.player;
  // Charm works best a little tipsy, and not at all when you can hardly stand.
  if (amount > 0 && p.buzz >= 15 && p.buzz <= 55) amount += 5;
  if (p.buzz > 75) { amount = Math.min(amount, 0) - 10; line = crush.name + ": “You are slurring. Maybe drink some water?”"; }
  if (p.bladder >= 88 && amount > 0) amount -= 5;
  crush.chemistry = clamp(crush.chemistry + amount, 0, 100);
  toast(line + (amount > 0 ? "  (+" + amount + " ♥)" : amount < 0 ? "  (" + amount + " ♥)" : ""), amount > 0 ? "good" : amount < 0 ? "bad" : "");
  if (amount > 0) blip("good");
  if (crush.chemistry >= 100 && !crush.goal) {
    crush.goal = "lighthouse";
    openMenu(crush.name, "“I like you. Meet me under the lighthouse. Do not make me wait.”", [{ label: "On my way.", run: () => {} }]);
  }
}

function talkToCrush(crush) {
  if (G.kissed) { toast(crush.name + " smiles at you."); return; }
  if (crush.goal === "lighthouse") {
    const lighthouse = G.places.find((p) => p.id === "fyrtaarnet");
    if (dist2d(crush.x, crush.z, lighthouse.x, lighthouse.z) < 9) { kiss(crush); return; }
    toast(crush.name + ": “See you under the lighthouse!”");
    return;
  }
  if (G.minute < crush.nextTalk) { toast(crush.name + ": “Let us talk again a bit later.” (Dance next to them or buy them a drink at a bar.)"); return; }
  const question = crush.type.questions[crush.asked % crush.type.questions.length];
  const intro = crush.asked === 0 ? crush.type.hello + "  " : "";
  const answers = question.slice(1).map(([text, points]) => ({ text: text, points: points }));
  // Mix the order so the best answer is not always number one.
  for (let i = answers.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [answers[i], answers[j]] = [answers[j], answers[i]]; }
  openMenu(crush.name + " · " + crush.type.about, intro + question[0], answers.map((answer) => ({
    label: answer.text,
    run: () => {
      crush.asked += 1;
      crush.nextTalk = G.minute + 12;
      changeChemistry(crush, answer.points, crush.name + (answer.points > 5 ? ": “Ha! I like that.”" : answer.points >= 0 ? ": “Hm. Okay.”" : ": “Oh. Right.”"));
    },
  })));
}

function updateCrush(crush, dt) {
  const p = G.player;
  if (crush.goal === "lighthouse") {
    const lighthouse = G.places.find((place) => place.id === "fyrtaarnet");
    const tx = lighthouse.x - 4.5, tz = lighthouse.z + 4.5;
    if (walkNpc(crush, tx, tz, dt)) crush.heading = Math.atan2(p.x - crush.x, p.z - crush.z);
    crush.prompt = "kiss " + crush.name;
    return;
  }
  // Dancing right next to them counts.
  const close = dist2d(crush.x, crush.z, p.x, p.z) < 4;
  if (close && p.dancing) {
    crush.mode = "dance";
    crush.dancedWith += dt;
    crush.heading = Math.atan2(p.x - crush.x, p.z - crush.z);
    if (crush.dancedWith > 6) { crush.dancedWith = -20; changeChemistry(crush, crush.type.type === "dancer" ? 25 : 12, crush.name + ": “You can move!”"); }
  } else if (walkNpc(crush, crush.homeX, crush.homeZ, dt)) {
    crush.mode = crush.type.type === "dancer" ? "dance" : "idle";
    if (close) crush.heading = Math.atan2(p.x - crush.x, p.z - crush.z);
  }
  // The music fan is impressed when you have actually seen concerts.
  if (crush.type.type === "fan" && !crush.sawFan && Object.keys(G.counted).length >= 2 && close) {
    crush.sawFan = true;
    changeChemistry(crush, 20, crush.name + ": “You have already seen two concerts? Respect.”");
  }
}

function kiss(crush) {
  if (G.kissed) return;
  G.kissed = true;
  logEvent({ type: "kiss", minute: Math.floor(G.minute) });
  const p = G.player;
  p.frozen = true;
  p.heading = Math.atan2(crush.x - p.x, crush.z - p.z);
  crush.heading = Math.atan2(p.x - crush.x, p.z - crush.z);
  blip("good");
  showBanner("MISSION COMPLETE", "A kiss under the lighthouse with " + crush.name + ".", "#FF6FA5");
  // Hearts float up while the camera circles the two of you.
  const hearts = [];
  const heartTexture = textTexture("♥", { bg: "rgba(0,0,0,0)", fg: "#FF6FA5", width: 128, height: 128, size: 110 });
  for (let i = 0; i < 24; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTexture, transparent: true, depthTest: false, fog: false }));
    sprite.scale.setScalar(0.5 + Math.random() * 0.5);
    sprite.position.set((p.x + crush.x) / 2 + (Math.random() - 0.5) * 2, 1 + Math.random() * 2, (p.z + crush.z) / 2 + (Math.random() - 0.5) * 2);
    G.scene.add(sprite);
    hearts.push(sprite);
  }
  let time = 0;
  G.updaters.push((dt) => {
    if (time > 7) return;
    time += dt;
    G.cam.yaw += dt * 0.7;
    for (const heart of hearts) { heart.position.y += dt * 0.8; heart.material.opacity = clamp(1 - time / 7, 0, 1); }
    if (time > 7) { for (const heart of hearts) G.scene.remove(heart); p.frozen = false; }
  });
}

// ---------- what the mission box on screen says ----------

function missionLines() {
  const mission = G.config.mission.id, p = G.player, rules = G.config.rules;
  if (mission === "music") {
    return G.config.favourites.map((artist) => {
      const act = G.config.acts.find((a) => a.artist === artist);
      const minutes = Math.min(minutesWatched(act), rules.minutes_to_count_a_concert);
      const stage = G.stages[act.stage].name;
      return { done: !!G.counted[act.id], text: artist + " · " + stage + " " + clockText(act.start) + (G.counted[act.id] ? "" : "  (" + minutes + "/" + rules.minutes_to_count_a_concert + " min)") };
    });
  }
  if (mission === "party") {
    const lasted = G.minute >= rules.party_must_last_until;
    return [
      { done: G.peakBuzz >= rules.hammered_at, text: "Get hammered: buzz " + rules.hammered_at + " (best so far " + Math.round(G.peakBuzz) + ")" },
      { done: lasted && !G.passedOut, failed: G.passedOut, text: G.passedOut ? "You passed out" : "Do not pass out" },
      { done: lasted, text: "Still here at " + clockText(rules.party_must_last_until) },
    ];
  }
  if (mission === "flirt") {
    if (G.kissed) return [{ done: true, text: "A kiss under the lighthouse" }];
    const lines = G.crushes.map((crush) => ({ done: crush.chemistry >= 100, text: crush.name + " " + "♥".repeat(Math.floor(crush.chemistry / 20)) + "♡".repeat(5 - Math.floor(crush.chemistry / 20)) + (crush.goal ? "  → the lighthouse!" : "") }));
    lines.push({ done: false, text: "Talk, dance (hold F) or buy them a drink" });
    return lines;
  }
  if (mission === "backstage") {
    if (G.backstage.reached) return [{ done: true, text: "You got backstage" }];
    return [
      { done: false, text: "Sneak past the guard behind Solscenen…" },
      { done: !!G.wristband, text: G.wristband ? "Crew wristband found" : "…or find a crew wristband (ask Jonas at Firbenet)" },
    ];
  }
  return [];
}

function missionIsComplete() {
  const mission = G.config.mission.id, rules = G.config.rules;
  if (mission === "music") return G.config.favourites.every((artist) => G.counted[G.config.acts.find((a) => a.artist === artist).id]);
  if (mission === "party") return G.peakBuzz >= rules.hammered_at && !G.passedOut && G.minute >= rules.party_must_last_until;
  if (mission === "flirt") return !!G.kissed;
  if (mission === "backstage") return G.backstage.reached;
  return false;
}

function updateMissions(dt) {
  updateNpcs(dt);
  updateBackstage(dt);
  if (!G.missionDone && missionIsComplete()) {
    G.missionDone = true;
    launchFireworks(G.player.x, G.player.z, 8);
    if (G.config.mission.id === "music" || G.config.mission.id === "party") { showBanner("MISSION COMPLETE", G.config.mission.name, "#FFC607"); blip("good"); }
  }
}

function buildMissions() {
  buildGuards();
  buildBackstage();
  buildBackstageGuard();
  buildCrew();
  buildCrushes();
}

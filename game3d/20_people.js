// ============================================================================
// 20_people.js — people made of boxes: your character, the special characters
// you can talk to, and the big crowd.
//
// A "character" is built from separate boxes (head, body, two arms, two legs)
// so the arms and legs can swing. The crowd is drawn in a cheaper way: all
// heads in one go, all bodies in one go, and so on (see buildCrowd).
// ============================================================================

const SKIN_TONES = ["#F2C9A5", "#E0A878", "#B97A50", "#8A5A3A", "#5E3B28", "#F6D7BD"];
const HAIR_COLOURS = ["#E8C36B", "#5A3A22", "#1E1A18", "#B5562B", "#D9D9D9", "#C99A4A", "#3B2A1E"];
const CLOTHES = ["#FFFFFF", "#FF471C", "#3374F2", "#FFC607", "#4636AA", "#22252B", "#F29BC4", "#1F7A3A", "#F7F3E3", "#D8342B", "#7FB7E6", "#C9A66B", "#8E6BBF", "#2E8B8B"];
const TROUSERS = ["#3A5A8C", "#22252B", "#F7F3E3", "#C9A66B", "#5B6B7F", "#7A8A5A", "#D8342B"];

// Build one character from an outfit ("look"). Returns the 3D group and its movable parts.
function buildCharacter(look) {
  const group = new THREE.Group();
  const skin = look.skin, topColour = look.top_colour, bottomColour = look.bottom_colour;
  const body = new THREE.Group(); // everything above the hips, so it can bob and lean
  body.position.y = 0.9;
  group.add(body);

  // Body.
  body.add(box(0.5, 0.62, 0.28, topColour, 0, 0.31, 0));
  if (look.top === "hoodie") body.add(box(0.4, 0.22, 0.2, topColour, 0, 0.62, -0.16));

  // Head with a face.
  const head = new THREE.Group();
  head.position.y = 0.66;
  body.add(head);
  head.add(box(0.12, 0.1, 0.12, skin, 0, 0.0, 0));
  head.add(box(0.34, 0.36, 0.34, skin, 0, 0.2, 0));
  head.add(box(0.05, 0.05, 0.02, "#1a1a1a", -0.08, 0.24, 0.175));
  head.add(box(0.05, 0.05, 0.02, "#1a1a1a", 0.08, 0.24, 0.175));
  head.add(box(0.12, 0.025, 0.02, "#8a3a3a", 0, 0.1, 0.175));
  if (look.glasses === "sun") head.add(box(0.32, 0.08, 0.03, "#111111", 0, 0.245, 0.185));
  if (look.hair !== "bald") {
    head.add(box(0.37, 0.12, 0.37, look.hair_colour, 0, 0.36, 0));
    head.add(box(0.37, 0.2, 0.1, look.hair_colour, 0, 0.26, -0.14));
    if (look.hair === "long") head.add(box(0.38, 0.5, 0.1, look.hair_colour, 0, 0.08, -0.16));
    if (look.hair === "bun") head.add(box(0.18, 0.18, 0.18, look.hair_colour, 0, 0.5, -0.06));
  }
  if (look.hat === "bucket") {
    head.add(cylinder(0.2, 0.24, 0.18, "#F7F3E3", 0, 0.47, 0, 10));
    head.add(cylinder(0.36, 0.36, 0.03, "#F7F3E3", 0, 0.39, 0, 12));
  } else if (look.hat === "cap") {
    head.add(box(0.36, 0.12, 0.36, "#D8342B", 0, 0.42, 0));
    head.add(box(0.3, 0.03, 0.2, "#D8342B", 0, 0.38, 0.26));
  } else if (look.hat === "cowboy") {
    head.add(cylinder(0.16, 0.19, 0.2, "#C9A66B", 0, 0.5, 0, 10));
    head.add(cylinder(0.42, 0.42, 0.03, "#C9A66B", 0, 0.4, 0, 14));
  }

  // Arms: a sleeve part and a bare part, hanging from the shoulder.
  const sleeve = look.top === "top" ? 0 : look.top === "tshirt" ? 0.24 : 0.52;
  const makeArm = (side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.33, 0.58, 0);
    if (sleeve > 0) arm.add(box(0.16, sleeve, 0.17, topColour, 0, -sleeve / 2, 0));
    arm.add(box(0.14, 0.6 - sleeve, 0.15, skin, 0, -sleeve - (0.6 - sleeve) / 2, 0));
    body.add(arm);
    return arm;
  };
  const armL = makeArm(-1), armR = makeArm(1);

  // Legs: trousers, shorts or a skirt, and shoes.
  const covered = look.bottom === "jeans" ? 0.78 : look.bottom === "shorts" ? 0.36 : 0.22;
  const shoeColour = look.shoes === "boots" ? "#5A3A26" : look.shoes === "sandals" ? "#C9A66B" : "#F3F3F3";
  const makeLeg = (side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.13, 0.9, 0);
    leg.add(box(0.2, covered, 0.22, bottomColour, 0, -covered / 2, 0));
    leg.add(box(0.17, 0.82 - covered, 0.19, look.shoes === "boots" && covered < 0.5 ? skin : skin, 0, -covered - (0.82 - covered) / 2, 0));
    const shoeHeight = look.shoes === "boots" ? 0.3 : 0.1;
    leg.add(box(0.2, shoeHeight, 0.3, shoeColour, 0, -0.9 + shoeHeight / 2, 0.04));
    group.add(leg);
    return leg;
  };
  const legL = makeLeg(-1), legR = makeLeg(1);
  if (look.bottom === "skirt") group.add(box(0.56, 0.3, 0.36, bottomColour, 0, 0.82, 0));

  // A cup that shows in the right hand while drinking.
  const cup = cylinder(0.05, 0.04, 0.14, "#f5f0dc", 0, -0.62, 0.08, 8);
  cup.visible = false;
  armR.add(cup);

  return { group: group, body: body, head: head, armL: armL, armR: armR, legL: legL, legR: legR, cup: cup, phase: 0 };
}

// Move the arms and legs. mode is "walk", "run", "idle", "dance", "drink" or "sit".
function animateCharacter(c, mode, dt, speed = 1) {
  c.phase += dt * (mode === "run" ? 13 : mode === "walk" ? 8.5 * speed : mode === "dance" ? 9 : 2);
  const p = c.phase;
  let leg = 0, arm = 0, bob = 0, lean = 0, armLift = 0, twist = 0;
  if (mode === "walk") { leg = Math.sin(p) * 0.55; arm = -Math.sin(p) * 0.45; bob = Math.abs(Math.cos(p)) * 0.03; }
  else if (mode === "run") { leg = Math.sin(p) * 0.95; arm = -Math.sin(p) * 0.9; bob = Math.abs(Math.cos(p)) * 0.07; lean = 0.16; }
  else if (mode === "dance") { bob = Math.abs(Math.sin(p)) * 0.09; leg = Math.sin(p) * 0.15; armLift = 2.5 + Math.sin(p * 0.5) * 0.35; twist = Math.sin(p * 0.5) * 0.25; }
  else { bob = Math.sin(p) * 0.008; }
  c.legL.rotation.x = leg;
  c.legR.rotation.x = -leg;
  c.body.position.y = 0.9 + bob;
  c.body.rotation.x = lean;
  c.body.rotation.y = twist;
  if (mode === "dance") {
    c.armL.rotation.x = -armLift;
    c.armR.rotation.x = -armLift + Math.sin(p) * 0.3;
    c.armL.rotation.z = -0.25;
    c.armR.rotation.z = 0.25;
  } else if (mode === "drink") {
    c.armL.rotation.x = 0; c.armL.rotation.z = 0;
    c.armR.rotation.x = -2.0; c.armR.rotation.z = -0.35;
  } else {
    c.armL.rotation.x = arm; c.armR.rotation.x = -arm;
    c.armL.rotation.z = 0; c.armR.rotation.z = 0;
  }
}

function randomLook(random = rand) {
  const from = (list) => list[Math.floor(random() * list.length)];
  return {
    skin: from(SKIN_TONES), hair: from(["short", "long", "long", "bun", "short", "bald"]), hair_colour: from(HAIR_COLOURS),
    top: from(["tshirt", "shirt", "top", "hoodie", "tshirt"]), top_colour: from(CLOTHES),
    bottom: from(["shorts", "jeans", "skirt", "shorts"]), bottom_colour: from(TROUSERS),
    hat: from(["none", "none", "none", "bucket", "cap", "cowboy"]), glasses: from(["none", "none", "sun"]), shoes: from(["sneakers", "boots", "sandals"]),
  };
}

// ---------------------------------------------------------------------------
// The crowd. Every guest is seven boxes; each kind of box is drawn for the
// whole crowd in one go, which is what lets a few hundred people walk around.
// ---------------------------------------------------------------------------

const CROWD_SIZE = 520;
const crowd = { people: [], parts: {}, frame: 0 };

function buildCrowd() {
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const material = () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
  for (const name of ["legL", "legR", "torso", "armL", "armR", "head", "hair"]) {
    const mesh = new THREE.InstancedMesh(unit, material(), CROWD_SIZE);
    mesh.castShadow = true;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    crowd.parts[name] = mesh;
    G.scene.add(mesh);
  }
  const colour = new THREE.Color();
  const crowdRandom = makeRandom(2026);
  for (let i = 0; i < CROWD_SIZE; i++) {
    const skin = SKIN_TONES[Math.floor(crowdRandom() * SKIN_TONES.length)];
    const top = CLOTHES[Math.floor(crowdRandom() * CLOTHES.length)];
    const bottom = TROUSERS[Math.floor(crowdRandom() * TROUSERS.length)];
    const hair = HAIR_COLOURS[Math.floor(crowdRandom() * HAIR_COLOURS.length)];
    const bareArms = crowdRandom() < 0.55, bareLegs = crowdRandom() < 0.5;
    crowd.parts.legL.setColorAt(i, colour.set(bareLegs ? skin : bottom));
    crowd.parts.legR.setColorAt(i, colour.set(bareLegs ? skin : bottom));
    crowd.parts.torso.setColorAt(i, colour.set(top));
    crowd.parts.armL.setColorAt(i, colour.set(bareArms ? skin : top));
    crowd.parts.armR.setColorAt(i, colour.set(bareArms ? skin : top));
    crowd.parts.head.setColorAt(i, colour.set(skin));
    crowd.parts.hair.setColorAt(i, colour.set(hair));
    const spot = randomSpotOnSite(crowdRandom);
    crowd.people.push({
      x: spot[0], z: spot[1], heading: crowdRandom() * 6.28, speed: 1.1 + crowdRandom() * 0.7,
      tx: spot[0], tz: spot[1], state: "idle", wait: crowdRandom() * 6, phase: crowdRandom() * 6,
      height: 0.92 + crowdRandom() * 0.16, longHair: crowdRandom() < 0.45, stage: null, stuck: 0, hop: 0,
    });
  }
}

// A random walkable point: somewhere along one of the paths, a little to the side.
function randomSpotOnSite(random = rand) {
  for (let tries = 0; tries < 20; tries++) {
    const path = G.config.paths[Math.floor(random() * G.config.paths.length)];
    const i = Math.floor(random() * (path.length - 1));
    const t = random();
    const x = lerp(path[i][0], path[i + 1][0], t) + (random() - 0.5) * 14;
    const z = lerp(path[i][1], path[i + 1][1], t) + (random() - 0.5) * 14;
    if (insideFence(x, z)) {
      const free = pushOutOfColliders(x, z, 0.5);
      if (insideFence(free.x, free.z)) return [free.x, free.z];
    }
  }
  return [80, 30];
}

// A spot in the audience in front of a stage: more people close to the stage than far away.
function randomSpotInAudience(stage, random = rand) {
  const zone = stage.audience;
  for (let tries = 0; tries < 12; tries++) {
    const forward = Math.pow(random(), 2.1) * zone.radius * 1.7;
    const half = zone.radius * (0.5 + 0.35 * Math.sin((forward / (zone.radius * 1.7)) * Math.PI));
    const side = (random() - 0.5) * 2 * half;
    const x = zone.frontX + stage.facing.x * forward + stage.facing.z * side;
    const z = zone.frontZ + stage.facing.z * forward - stage.facing.x * side;
    if (insideFence(x, z)) return [x, z];
  }
  return [zone.x, zone.z];
}

// Where should this guest go next? Concerts pull people in; otherwise bars, food or a stroll.
function chooseCrowdTarget(person) {
  const options = [];
  for (const id in G.stages) {
    const stage = G.stages[id];
    if (stage.act) options.push({ weight: stage.act.pull * 1.25, stage: stage });
    else if (stage.nextAct && stage.nextAct.start - G.minute < 15) options.push({ weight: stage.nextAct.pull * 0.6, stage: stage });
  }
  options.push({ weight: 2.4, bar: true });
  options.push({ weight: 1.4, stroll: true });
  if (G.night > 0.5) options.push({ weight: 0.7, dance: true });
  let total = 0;
  for (const o of options) total += o.weight;
  let roll = rand() * total, chosen = options[0];
  for (const o of options) { roll -= o.weight; if (roll <= 0) { chosen = o; break; } }
  person.stage = null;
  if (chosen.stage) {
    const spot = randomSpotInAudience(chosen.stage);
    person.tx = spot[0]; person.tz = spot[1];
    person.stage = chosen.stage;
    person.after = "watch";
  } else if (chosen.bar) {
    const shops = G.places.filter((p) => p.sells.length > 0 && p.kind !== "water");
    const shop = shops[Math.floor(rand() * shops.length)];
    const reach = Math.max(shop.w, shop.d) / 2 + 1.5 + rand() * 4;
    const angle = rand() * Math.PI * 2;
    person.tx = shop.x + Math.cos(angle) * reach; person.tz = shop.z + Math.sin(angle) * reach;
    person.after = "idle"; person.afterWait = 6 + rand() * 16;
  } else if (chosen.dance) {
    const floor = G.places.find((p) => p.kind === "dance");
    person.tx = floor.x + (rand() - 0.5) * 9; person.tz = floor.z + (rand() - 0.5) * 9;
    person.after = "dance"; person.afterWait = 10 + rand() * 20;
  } else {
    const spot = randomSpotOnSite();
    person.tx = spot[0]; person.tz = spot[1];
    person.after = "idle"; person.afterWait = 2 + rand() * 6;
  }
  if (!insideFence(person.tx, person.tz)) { const spot = randomSpotOnSite(); person.tx = spot[0]; person.tz = spot[1]; }
  person.state = "walk";
  person.stuck = 0;
}

const crowdTmp = { m: null, q: null, qy: null, qx: null, pos: null, scale: null };

function updateCrowd(dt) {
  if (!crowdTmp.m) {
    crowdTmp.m = new THREE.Matrix4(); crowdTmp.q = new THREE.Quaternion(); crowdTmp.qy = new THREE.Quaternion(); crowdTmp.qx = new THREE.Quaternion();
    crowdTmp.pos = new THREE.Vector3(); crowdTmp.scale = new THREE.Vector3();
    crowdTmp.axisY = new THREE.Vector3(0, 1, 0); crowdTmp.axisX = new THREE.Vector3(1, 0, 0);
  }
  crowd.frame++;
  // Fewer guests in the afternoon, a full site in the evening, thinning out towards 04:00.
  const arriving = smooth(840, 1200, G.minute), leaving = smooth(1530, 1680, G.minute);
  const active = Math.round(CROWD_SIZE * lerp(0.42, 1, arriving) * lerp(1, 0.35, leaving));
  const px = G.player ? G.player.x : 0, pz = G.player ? G.player.z : 0;
  const { m, q, qy, qx, pos, scale, axisY, axisX } = crowdTmp;
  const parts = crowd.parts;
  const put = (mesh, i, person, cos, sin, lx, ly, lz, sx, sy, sz, rot) => {
    pos.set(person.x + lx * cos + lz * sin, ly, person.z - lx * sin + lz * cos);
    scale.set(sx, sy, sz);
    m.compose(pos, rot, scale);
    mesh.setMatrixAt(i, m);
  };
  const hide = (mesh, i) => { m.makeScale(0, 0, 0); mesh.setMatrixAt(i, m); };

  for (let i = 0; i < CROWD_SIZE; i++) {
    const person = crowd.people[i];
    if (i >= active) {
      if (!person.hidden) { for (const name in parts) hide(parts[name], i); person.hidden = true; }
      continue;
    }
    person.hidden = false;
    const near = dist2d(person.x, person.z, px, pz) < 110;

    // --- deciding and walking ---
    if (person.state === "walk") {
      const dx = person.tx - person.x, dz = person.tz - person.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.6) {
        person.state = person.after || "idle";
        person.wait = person.afterWait || 5;
        if (person.state === "watch" && person.stage) person.heading = Math.atan2(person.stage.x - person.x, person.stage.z - person.z);
      } else {
        const step = Math.min(d, person.speed * dt);
        const want = Math.atan2(dx, dz);
        let turn = want - person.heading;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        person.heading += clamp(turn, -4 * dt, 4 * dt);
        let nx = person.x + Math.sin(person.heading) * step, nz = person.z + Math.cos(person.heading) * step;
        if ((i + crowd.frame) % 3 === 0) {
          const free = pushOutOfColliders(nx, nz, 0.35);
          if (free.x !== nx || free.z !== nz) person.stuck += dt * 3;
          nx = free.x; nz = free.z;
        }
        if (insideFence(nx, nz)) { person.x = nx; person.z = nz; } else person.stuck += 1;
        if (person.stuck > 2.5) chooseCrowdTarget(person);
        person.phase += dt * 8 * person.speed;
      }
    } else if (person.state === "watch") {
      const stage = person.stage;
      if (!stage || (!stage.act && !(stage.nextAct && stage.nextAct.start - G.minute < 15)) || rand() < dt * 0.004) chooseCrowdTarget(person);
      person.phase += dt * (stage && stage.act ? 9 : 2);
    } else {
      person.wait -= dt;
      person.phase += dt * (person.state === "dance" ? 9 : 2);
      if (person.wait <= 0) chooseCrowdTarget(person);
    }
    // Step aside for the player.
    const toPlayer = dist2d(person.x, person.z, px, pz);
    if (toPlayer < 0.75 && toPlayer > 0.01) {
      person.x += ((person.x - px) / toPlayer) * (0.75 - toPlayer);
      person.z += ((person.z - pz) / toPlayer) * (0.75 - toPlayer);
    }

    // --- drawing: far-away people are only redrawn every fourth frame ---
    if (!near && (i + crowd.frame) % 4 !== 0) continue;
    const dancing = person.state === "dance" || (person.state === "watch" && person.stage && person.stage.act);
    const walking = person.state === "walk";
    const h = person.height;
    const cos = Math.cos(person.heading), sin = Math.sin(person.heading);
    qy.setFromAxisAngle(axisY, person.heading);
    const swing = walking ? Math.sin(person.phase) * 0.55 : dancing ? Math.sin(person.phase) * 0.12 : 0;
    const bob = dancing ? Math.abs(Math.sin(person.phase)) * 0.1 : walking ? Math.abs(Math.cos(person.phase)) * 0.03 : 0;
    // Legs swing from the hips.
    const hip = 0.9 * h, legLength = 0.9 * h;
    for (const side of [-1, 1]) {
      const angle = swing * side;
      qx.setFromAxisAngle(axisX, angle);
      q.multiplyQuaternions(qy, qx);
      put(side < 0 ? parts.legL : parts.legR, i, person, cos, sin, side * 0.13, hip - Math.cos(angle) * legLength / 2, -Math.sin(angle) * legLength / 2, 0.2, legLength, 0.22, q);
    }
    put(parts.torso, i, person, cos, sin, 0, (0.9 + 0.31) * h + bob, 0, 0.5, 0.62 * h, 0.28, qy);
    // Arms: hanging and swinging, or up in the air when dancing.
    const shoulder = (0.9 + 0.58) * h + bob, armLength = 0.6 * h;
    for (const side of [-1, 1]) {
      const angle = dancing ? -(2.5 + Math.sin(person.phase * 0.5 + side) * 0.4) : -swing * side * 0.8;
      qx.setFromAxisAngle(axisX, angle);
      q.multiplyQuaternions(qy, qx);
      put(side < 0 ? parts.armL : parts.armR, i, person, cos, sin, side * 0.33, shoulder - Math.cos(angle) * armLength / 2, -Math.sin(angle) * armLength / 2, 0.15, armLength, 0.16, q);
    }
    put(parts.head, i, person, cos, sin, 0, (0.9 + 0.66 + 0.2) * h + bob, 0, 0.34, 0.36, 0.34, qy);
    if (person.longHair) put(parts.hair, i, person, cos, sin, 0, (0.9 + 0.66 + 0.2) * h + bob, -0.06, 0.39, 0.5, 0.3, qy);
    else put(parts.hair, i, person, cos, sin, 0, (0.9 + 0.66 + 0.36) * h + bob, -0.02, 0.37, 0.12, 0.36, qy);
  }
  for (const name in parts) parts[name].instanceMatrix.needsUpdate = true;
}

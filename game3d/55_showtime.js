// ============================================================================
// 55_showtime.js — the showy extras: glowing lamps, the sun and the moon,
// phone lights in the crowd, lasers, fireworks, and the security buggy.
// ============================================================================

function softDot() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

const show = { halos: null, phones: null, sparks: null, sparkList: [], lasers: [], sun: null, moon: null, pending: [] };

function buildShowtime() {
  const dot = softDot();
  show.sparkList = [];
  show.pending = [];
  show.lasers = [];

  // A soft glow around every lamp post, only visible in the dark.
  const haloSpots = G.lightPools.filter((pool) => pool[2] === 13);
  const haloGeometry = new THREE.BufferGeometry();
  haloGeometry.setAttribute("position", new THREE.Float32BufferAttribute(haloSpots.flatMap(([x, z]) => [x, 4.75, z]), 3));
  show.halos = new THREE.Points(haloGeometry, new THREE.PointsMaterial({ map: dot, color: 0xffd9a0, size: 2.6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  show.halos.frustumCulled = false;
  G.scene.add(show.halos);

  // The sun by day and the moon by night.
  show.sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xfff2c0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  show.sun.scale.setScalar(170);
  show.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: 0xcfd8ff, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  show.moon.scale.setScalar(55);
  G.scene.add(show.sun, show.moon);

  // Phone lights held up at concerts: one possible light per guest.
  const phoneGeometry = new THREE.BufferGeometry();
  phoneGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(CROWD_SIZE * 3).fill(-100), 3));
  show.phones = new THREE.Points(phoneGeometry, new THREE.PointsMaterial({ map: dot, color: 0xffffff, size: 0.75, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  show.phones.frustumCulled = false;
  G.scene.add(show.phones);

  // Fireworks: up to 2400 sparks drawn in one go.
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(2400 * 3).fill(-100), 3));
  sparkGeometry.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(2400 * 3), 3));
  show.sparks = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({ map: dot, size: 3.2, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  show.sparks.frustumCulled = false;
  G.scene.add(show.sparks);

  // Lasers on the two big stages.
  for (const id of ["sol", "skov"]) {
    const stage = G.stages[id];
    for (let i = 0; i < 6; i++) {
      const laser = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 70), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x55ff88 : 0xff5fd0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      laser.geometry.translate(0, 0, 35);
      const pivot = new THREE.Group();
      pivot.position.set((i - 2.5) * 2.2, stage.h - 1.2, stage.d / 2 - 0.4);
      pivot.add(laser);
      stage.group.add(pivot);
      show.lasers.push({ stage: stage, pivot: pivot, laser: laser, offset: i * 1.1 });
    }
  }
}

function updateShowtime(dt) {
  const now = performance.now() / 1000;
  show.halos.material.opacity = G.night * 0.6;
  // Sun and moon sit far away in the direction their light comes from.
  const sunDirection = G.sun.position.clone().sub(G.sun.target.position).normalize();
  const dark = smooth(1300, 1345, G.minute);
  show.sun.position.copy(G.camera.position).addScaledVector(sunDirection, 700);
  show.sun.material.opacity = (1 - dark) * 0.95;
  show.sun.material.color.copy(G.sun.color);
  show.moon.position.copy(G.camera.position).add(new THREE.Vector3(-380, 420, -420));
  show.moon.material.opacity = G.night;

  // Phone lights: every third guest at a live concert holds one up when it is dark.
  const phones = show.phones.geometry.attributes.position;
  for (let i = 0; i < CROWD_SIZE; i++) {
    const person = crowd.people[i];
    const lit = G.night > 0.6 && i % 3 === 0 && !person.hidden && person.state === "watch" && person.stage && person.stage.act;
    if (lit) phones.setXYZ(i, person.x + Math.sin(now * 2 + i) * 0.12, 2.15 * person.height + Math.sin(now * 3 + i) * 0.05, person.z);
    else phones.setY(i, -100);
  }
  phones.needsUpdate = true;

  // Lasers sweep over the crowd for DJ and hip hop sets at night.
  for (const item of show.lasers) {
    const act = item.stage.act;
    const on = act && (act.style === "dj" || act.style === "hiphop") ? G.night : 0;
    item.laser.material.opacity = on * 0.75;
    item.pivot.rotation.y = Math.sin(now * 0.9 + item.offset) * 0.7;
    item.pivot.rotation.x = 0.1 + Math.sin(now * 1.3 + item.offset * 2) * 0.12;
  }

  // Fireworks: launch what is due, then move every spark.
  show.pending = show.pending.filter((shot) => {
    if (now < shot.time) return true;
    burst(shot.x, shot.y, shot.z);
    return false;
  });
  const positions = show.sparks.geometry.attributes.position, colours = show.sparks.geometry.attributes.color;
  show.sparkList = show.sparkList.filter((spark) => spark.life > 0);
  for (let i = 0; i < 2400; i++) {
    const spark = show.sparkList[i];
    if (!spark) { positions.setY(i, -100); continue; }
    spark.life -= dt;
    spark.vy -= 5.5 * dt;
    spark.x += spark.vx * dt; spark.y += spark.vy * dt; spark.z += spark.vz * dt;
    spark.vx *= 1 - dt * 0.9; spark.vz *= 1 - dt * 0.9;
    const fade = clamp(spark.life / 1.2, 0, 1);
    positions.setXYZ(i, spark.x, spark.y, spark.z);
    colours.setXYZ(i, spark.r * fade, spark.g * fade, spark.b * fade);
  }
  positions.needsUpdate = true;
  colours.needsUpdate = true;
}

function burst(x, y, z) {
  const colour = new THREE.Color(pick(["#FF471C", "#FFC607", "#3374F2", "#F29BC4", "#5FD0E0", "#ffffff", "#9BE28A"]));
  for (let i = 0; i < 110 && show.sparkList.length < 2400; i++) {
    const a = Math.random() * Math.PI * 2, up = Math.acos(Math.random() * 2 - 1), speed = 9 + Math.random() * 9;
    show.sparkList.push({ x: x, y: y, z: z, vx: Math.sin(up) * Math.cos(a) * speed, vy: Math.cos(up) * speed, vz: Math.sin(up) * Math.sin(a) * speed, life: 1.4 + Math.random() * 1.1, r: colour.r, g: colour.g, b: colour.b });
  }
  if (audio.ctx && audio.on) {
    const near = clamp(1 - dist2d(G.player.x, G.player.z, x, z) / 260, 0.1, 1);
    hiss(audio.master, audio.ctx.currentTime, 0.9, 0.5 * near, 420, "lowpass");
  }
}

// Fireworks above a spot for a number of seconds.
function launchFireworks(x, z, seconds = 12) {
  const now = performance.now() / 1000;
  for (let t = 0; t < seconds; t += 0.45 + Math.random() * 0.5) {
    show.pending.push({ time: now + t, x: x + (Math.random() - 0.5) * 50, y: 34 + Math.random() * 26, z: z + (Math.random() - 0.5) * 50 });
  }
}

// ---------------------------------------------------------------------------
// The security buggy. You can "borrow" it, but security wants it back.
// ---------------------------------------------------------------------------

const BUGGY_TOP_SPEED = 12.5;
const BUGGY_SECONDS_UNTIL_CAUGHT = 35;

function buildBuggies() {
  G.buggies = [];
  const firbenet = G.places.find((p) => p.id === "firbenet");
  const spots = [
    [firbenet.x - firbenet.facing.x * 9, firbenet.z - firbenet.facing.z * 9, 0.6],
    [...mapPoint(975, 820), 2.2],
    [...mapPoint(235, 1170), 1.0],
  ];
  for (const [sx, sz, heading] of spots) {
    const free = pushOutOfColliders(sx, sz, 1.6);
    const group = new THREE.Group();
    group.add(box(1.5, 0.35, 2.7, "#f3f3f3", 0, 0.55, 0));
    group.add(box(1.5, 0.5, 0.9, "#D9F23A", 0, 0.95, -0.9));
    group.add(box(1.3, 0.12, 0.55, "#22252b", 0, 0.85, 0.05));
    group.add(box(1.3, 0.5, 0.12, "#22252b", 0, 1.1, -0.28));
    group.add(box(1.6, 0.08, 2.1, "#f3f3f3", 0, 1.95, -0.15));
    for (const [x, z] of [[-0.7, 0.8], [0.7, 0.8], [-0.7, -1.1], [0.7, -1.1]]) {
      group.add(box(0.06, 1.15, 0.06, "#888888", x, 1.38, z * 0.8));
      const wheel = cylinder(0.3, 0.3, 0.22, "#17171a", x * 1.08, 0.3, z, 10);
      wheel.rotation.z = Math.PI / 2;
      group.add(wheel);
    }
    const plate = sign("SECURITY", 1.3, 0.34, "#D9F23A", "#111111");
    plate.position.set(0, 0.98, -1.36);
    plate.rotation.y = Math.PI;
    group.add(plate);
    for (const x of [-0.5, 0.5]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.05), glow("#fff6c8"));
      lamp.position.set(x, 0.62, 1.37);
      group.add(lamp);
    }
    G.scene.add(group);
    const buggy = { x: free.x, z: free.z, heading: heading, homeX: free.x, homeZ: free.z, homeHeading: heading, speed: 0, group: group };
    buggy.collider = { x: buggy.x, z: buggy.z, hw: 0.9, hd: 1.5, cos: Math.cos(heading), sin: Math.sin(heading), tag: "buggy" };
    G.colliders.push(buggy.collider);
    G.buggies.push(buggy);
  }
  G.buggyHeat = 0;
}

function enterBuggy(buggy) {
  const p = G.player;
  if (p.buzz >= 40) { caught("Security: “Drunk in a buggy? Not tonight.”", null); return; }
  p.driving = buggy;
  buggy.collider.off = true;
  p.character.group.visible = false;
  toast("You borrowed the security buggy. W/S drive, A/D steer, E to get out. Security will want it back…");
}

function leaveBuggy(silent) {
  const p = G.player, buggy = p.driving;
  if (!buggy) return;
  p.driving = null;
  buggy.speed = 0;
  buggy.collider.off = false;
  buggy.collider.x = buggy.x; buggy.collider.z = buggy.z; buggy.collider.cos = Math.cos(buggy.heading); buggy.collider.sin = Math.sin(buggy.heading);
  const out = pushOutOfColliders(buggy.x - Math.cos(buggy.heading) * 1.8, buggy.z + Math.sin(buggy.heading) * 1.8, 0.5);
  p.x = out.x; p.z = out.z;
  p.character.group.visible = true;
  if (!silent) toast("You hop out of the buggy.");
}

function updateBuggies(dt) {
  const p = G.player, k = G.keys;
  for (const buggy of G.buggies) {
    if (p.driving === buggy) {
      const gas = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
      const steer = (k.KeyA ? 1 : 0) - (k.KeyD ? 1 : 0);
      buggy.speed += gas * 9 * dt;
      buggy.speed *= 1 - dt * (gas === 0 ? 1.4 : 0.35);
      buggy.speed = clamp(buggy.speed, -4, BUGGY_TOP_SPEED);
      buggy.heading += steer * dt * 1.9 * clamp(buggy.speed / 5, -1, 1);
      let nx = buggy.x + Math.sin(buggy.heading) * buggy.speed * dt, nz = buggy.z + Math.cos(buggy.heading) * buggy.speed * dt;
      const free = pushOutOfColliders(nx, nz, 1.2);
      if (free.x !== nx || free.z !== nz) buggy.speed *= 0.5;
      if (insideFence(free.x, free.z)) { buggy.x = free.x; buggy.z = free.z; } else buggy.speed = 0;
      p.x = buggy.x; p.z = buggy.z; p.heading = buggy.heading; p.y = 0;
      // People jump out of the way.
      if (Math.abs(buggy.speed) > 1.5) {
        for (const person of crowd.people) {
          const d = dist2d(person.x, person.z, buggy.x, buggy.z);
          if (d < 2.6 && d > 0.01) { person.x += ((person.x - buggy.x) / d) * (2.6 - d); person.z += ((person.z - buggy.z) / d) * (2.6 - d); person.wait = 0; }
        }
      }
      // The camera settles in behind the buggy.
      let swing = buggy.heading - G.cam.yaw;
      while (swing > Math.PI) swing -= Math.PI * 2;
      while (swing < -Math.PI) swing += Math.PI * 2;
      if (performance.now() - G.cam.lastMouse > 1200) G.cam.yaw += swing * Math.min(1, dt * 2.2);
      // Security notices after a while.
      G.buggyHeat += dt;
      if (G.buggyHeat > BUGGY_SECONDS_UNTIL_CAUGHT * 0.55 && !buggy.warned) { buggy.warned = true; toast("Security has noticed their buggy is gone. Park it soon!", "bad"); }
      if (G.buggyHeat > BUGGY_SECONDS_UNTIL_CAUGHT) {
        leaveBuggy(true);
        buggy.x = buggy.homeX; buggy.z = buggy.homeZ; buggy.heading = buggy.homeHeading;
        buggy.collider.x = buggy.x; buggy.collider.z = buggy.z; buggy.collider.cos = Math.cos(buggy.heading); buggy.collider.sin = Math.sin(buggy.heading);
        buggy.warned = false;
        G.buggyHeat = 0;
        caught("Security took their buggy back.", null);
      }
    }
    buggy.group.position.set(buggy.x, 0, buggy.z);
    buggy.group.rotation.y = buggy.heading;
  }
  if (!p.driving) G.buggyHeat = Math.max(0, G.buggyHeat - dt * 0.4);
}

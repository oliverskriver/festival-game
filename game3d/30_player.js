// ============================================================================
// 30_player.js — you: walking, running, jumping, and the camera behind you.
// ============================================================================

const WALK_SPEED = 4.2; // metres per second
const RUN_SPEED = 7.6;

function buildPlayer() {
  const character = buildCharacter(G.config.player.look);
  G.scene.add(character.group);
  const entrance = G.places.find((p) => p.kind === "entrance");
  // Start a few steps inside the gate, looking into the festival.
  const inwardX = -entrance.facing.x, inwardZ = -entrance.facing.z;
  G.player = {
    character: character,
    x: entrance.x + inwardX * 11, z: entrance.z + inwardZ * 11, y: 0, vy: 0,
    heading: Math.atan2(inwardX, inwardZ),
    mode: "idle", moving: false, drinkTime: 0, dancing: false, frozen: false, stumble: 0,
    money: G.config.rules.start_money, buzz: 0, energy: 100, bladder: 0, strikes: 0,
  };
  G.cam = { yaw: G.player.heading, pitch: 0.28, distance: 7.5, lastMouse: 0, roll: 0 };
}

function setupControls(canvas) {
  // Keys. "capture" makes the game see the key before the page around it does,
  // so the page's own shortcuts cannot interrupt the game.
  const gameKeys = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ShiftLeft", "ShiftRight",
    "KeyE", "KeyF", "KeyT", "KeyM", "KeyH", "KeyP", "KeyR", "KeyC", "KeyQ", "Tab", "Escape", "Enter", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6"];
  G.onKeyDown = (event) => {
    if (G.over) return;
    if (gameKeys.includes(event.code)) { event.preventDefault(); event.stopPropagation(); }
    if (event.repeat) return;
    G.keys[event.code] = true;
    handleKeyPress(event.code); // in 70_hud.js: menus, interaction, pause
  };
  G.onKeyUp = (event) => {
    if (gameKeys.includes(event.code)) { event.preventDefault(); event.stopPropagation(); }
    G.keys[event.code] = false;
  };
  window.addEventListener("keydown", G.onKeyDown, true);
  window.addEventListener("keyup", G.onKeyUp, true);

  // Mouse: click the picture to "grab" the mouse, then moving it looks around.
  canvas.addEventListener("click", () => {
    if (!G.paused && !G.menuOpen && document.pointerLockElement !== canvas && canvas.requestPointerLock) {
      try { const promise = canvas.requestPointerLock(); if (promise && promise.catch) promise.catch(() => {}); } catch (error) { /* the mouse simply stays free */ }
    }
  });
  let dragging = false;
  canvas.addEventListener("mousedown", () => (dragging = true));
  window.addEventListener("mouseup", () => (dragging = false));
  G.onMouseMove = (event) => {
    if (G.paused || G.menuOpen) return;
    if (document.pointerLockElement === canvas || dragging) {
      G.cam.yaw -= event.movementX * 0.0028;
      G.cam.pitch = clamp(G.cam.pitch + event.movementY * 0.002, -0.12, 1.1);
      G.cam.lastMouse = performance.now();
    }
  };
  window.addEventListener("mousemove", G.onMouseMove);
  canvas.addEventListener("wheel", (event) => { G.cam.distance = clamp(G.cam.distance + event.deltaY * 0.01, 3.5, 16); event.preventDefault(); }, { passive: false });
}

function updatePlayer(dt) {
  const p = G.player, k = G.keys, cam = G.cam;
  const now = performance.now() / 1000;

  // Looking around with the arrow keys (for when the mouse is not grabbed).
  if (!G.menuOpen) {
    if (k.ArrowLeft) cam.yaw += 2.0 * dt;
    if (k.ArrowRight) cam.yaw -= 2.0 * dt;
  }

  if (p.driving) {
    // In the buggy: 55_showtime.js moves it, the walking code below is skipped.
    p.moving = false; p.dancing = false; p.mode = "idle";
    p.character.group.position.set(p.x, 0, p.z);
    return;
  }

  let forward = 0, strafe = 0;
  if (!p.frozen && !G.menuOpen) {
    if (k.KeyW || k.ArrowUp) forward += 1;
    if (k.KeyS || k.ArrowDown) forward -= 1;
    if (k.KeyD) strafe += 1;
    if (k.KeyA) strafe -= 1;
  }
  p.moving = forward !== 0 || strafe !== 0;
  p.dancing = !p.moving && !p.frozen && !!k.KeyF;

  const drunk = clamp((p.buzz - 25) / 75, 0, 1); // 0 sober, 1 about to fall over
  if (p.moving) {
    // The direction on the ground, as seen from the camera.
    let angle = Math.atan2(forward * Math.sin(cam.yaw) - strafe * Math.cos(cam.yaw), forward * Math.cos(cam.yaw) + strafe * Math.sin(cam.yaw));
    // Drunk legs do not go exactly where you point them.
    angle += (Math.sin(now * 0.9) * 0.5 + Math.sin(now * 2.3) * 0.25) * drunk;
    const canRun = p.energy > 3 && p.bladder < 88;
    const running = (k.ShiftLeft || k.ShiftRight) && canRun;
    let speed = running ? RUN_SPEED : WALK_SPEED;
    if (p.energy <= 3) speed *= 0.6;
    if (p.bladder >= 88) speed *= 0.8;
    speed *= 1 - drunk * 0.25;
    p.mode = running ? "run" : "walk";
    let turn = angle - p.heading;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    p.heading += clamp(turn, -10 * dt, 10 * dt);
    // Now and then a very drunk player takes a step sideways.
    if (drunk > 0.55 && Math.random() < dt * drunk * 0.8) p.stumble = (Math.random() < 0.5 ? -1 : 1) * 2.5;
    p.stumble *= Math.pow(0.02, dt);
    const sideX = -Math.cos(p.heading), sideZ = Math.sin(p.heading);
    let nx = p.x + (Math.sin(angle) * speed + sideX * p.stumble) * dt;
    let nz = p.z + (Math.cos(angle) * speed + sideZ * p.stumble) * dt;
    const free = pushOutOfColliders(nx, nz, 0.4);
    nx = free.x; nz = free.z;
    if (insideFence(nx, nz) || G.freeRoam) { p.x = nx; p.z = nz; }
    else if (insideFence(nx, p.z)) p.x = nx;
    else if (insideFence(p.x, nz)) p.z = nz;
    if (running) p.energy = Math.max(0, p.energy - dt * 0.35);
    // With the mouse left alone, the camera slowly swings in behind you.
    if (performance.now() - cam.lastMouse > 1500 && !k.ArrowLeft && !k.ArrowRight && forward >= 0) {
      let swing = p.heading - cam.yaw;
      while (swing > Math.PI) swing -= Math.PI * 2;
      while (swing < -Math.PI) swing += Math.PI * 2;
      cam.yaw += swing * Math.min(1, dt * 1.3);
    }
  } else {
    p.mode = p.dancing ? "dance" : p.drinkTime > 0 ? "drink" : "idle";
  }
  p.drinkTime = Math.max(0, p.drinkTime - dt);
  p.character.cup.visible = p.drinkTime > 0 && !p.moving;

  // Jumping.
  if (k.Space && p.y === 0 && !p.frozen && !G.menuOpen) p.vy = 5.8;
  if (p.y > 0 || p.vy > 0) {
    p.vy -= 17 * dt;
    p.y = Math.max(0, p.y + p.vy * dt);
    if (p.y === 0) p.vy = 0;
  }

  animateCharacter(p.character, p.mode, dt);
  p.character.group.position.set(p.x, p.y, p.z);
  p.character.group.rotation.y = p.heading;
  // Swaying on the spot when drunk.
  p.character.group.rotation.z = Math.sin(now * 1.7) * 0.09 * drunk;
}

// Is this point inside something big (a building, not a lamp post or a table)?
function insideBuilding(x, z) {
  for (const c of G.colliders) {
    if (c.off || c.hw < 1.2 || c.hd < 1.2) continue;
    const dx = x - c.x, dz = z - c.z;
    const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
    if (Math.abs(lx) < c.hw + 0.4 && Math.abs(lz) < c.hd + 0.4) return true;
  }
  return false;
}

const camTarget = { x: 0, y: 0, z: 0, ready: false };
function updateCamera(dt) {
  const p = G.player, cam = G.cam;
  const drunk = clamp((p.buzz - 25) / 75, 0, 1);
  const now = performance.now() / 1000;
  // Pull the camera closer when a building would be between it and you.
  let distance = cam.distance;
  for (const share of [1, 0.8, 0.62, 0.46, 0.32, 0.2]) {
    distance = cam.distance * share;
    const reach = Math.cos(cam.pitch) * distance;
    if (!insideBuilding(p.x - Math.sin(cam.yaw) * reach, p.z - Math.cos(cam.yaw) * reach)) break;
  }
  const flat = Math.cos(cam.pitch) * distance;
  const wantX = p.x - Math.sin(cam.yaw) * flat;
  const wantY = 1.7 + p.y * 0.6 + Math.sin(cam.pitch) * distance;
  const wantZ = p.z - Math.cos(cam.yaw) * flat;
  if (!camTarget.ready) { G.camera.position.set(wantX, wantY, wantZ); camTarget.ready = true; }
  const ease = 1 - Math.pow(0.0005, dt);
  G.camera.position.x = lerp(G.camera.position.x, wantX, ease);
  G.camera.position.y = lerp(G.camera.position.y, Math.max(0.5, wantY), ease);
  G.camera.position.z = lerp(G.camera.position.z, wantZ, ease);
  G.camera.lookAt(p.x + Math.sin(now * 0.8) * drunk * 0.6, 1.55 + p.y * 0.6, p.z + Math.cos(now * 0.6) * drunk * 0.6);
  // The world tilts and breathes when you have had too many.
  G.camera.rotateZ(Math.sin(now * 0.9) * 0.07 * drunk + cam.roll);
  G.camera.fov = 62 + Math.sin(now * 0.5) * 5 * drunk;
  G.camera.updateProjectionMatrix();
}

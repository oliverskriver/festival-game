// ============================================================================
// 90_main.js — starts the game and runs it frame by frame.
//
// The app (Python, game_screens.py) hands this function the "config": the day,
// the mission, your outfit, the map, the programme and the rules. When the
// night is over the event list goes back to Python.
// ============================================================================

function resetGame() {
  Object.assign(G, {
    config: null, scene: null, camera: null, renderer: null, minute: 0, night: 0,
    colliders: [], places: [], stages: {}, events: [], paused: true, over: false, keys: {}, updaters: [],
    signMaterials: [], lightPools: [], npcs: [], pickups: [], crushes: [], counted: {}, peakBuzz: 0,
    passedOut: false, kissed: false, wristband: false, missionDone: false, watching: null, focus: null,
    menuOpen: null, started: false, ready: false, player: null, crew: null, gateGuard: null, backstage: null, fast: false,
    buggies: [], buggyHeat: 0, bannerTime: 0, finale: false,
  });
  bulbList.length = 0;
  crowd.people = [];
  crowd.parts = {};
  crowd.frame = 0;
  for (const key in materialCache) delete materialCache[key];
  camTarget.ready = false;
  hudFrame = 0;
  for (const key in hud) delete hud[key];
}

async function startGame(component) {
  const config = component.data;
  resetGame();
  G.config = config;
  G.component = component;
  G.minute = config.start_minute || config.rules.opens;

  const root = document.createElement("div");
  root.id = "lejet-root";
  document.body.appendChild(root);
  G.root = root;
  buildHud(root);
  hud.startButton.disabled = true;
  hud.loading.textContent = "Building the festival…";

  try {
    THREE = await loadThree();
  } catch (error) {
    hud.loading.textContent = error.message;
    return;
  }
  if (G.root !== root) return; // the game was closed while loading

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: !!config.debug, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.debug ? 1 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.className = "lj-view";
  root.insertBefore(renderer.domElement, root.firstChild);
  G.renderer = renderer;
  G.scene = new THREE.Scene();
  G.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.3, 1200);

  buildWorld();
  buildPlayer();
  buildCrowd();
  buildMissions();
  buildBuggies();
  buildBulbs();
  buildShowtime();
  setupControls(renderer.domElement);
  // Let the crowd spread out before the first picture is shown.
  updateConcerts(0.016);
  for (let i = 0; i < 240; i++) updateCrowd(0.25);
  updateWorld();
  updateCamera(0.016);
  updateHud();

  G.onResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    G.camera.aspect = window.innerWidth / window.innerHeight;
    G.camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", G.onResize);

  G.ready = true;
  hud.startButton.disabled = false;
  hud.loading.textContent = "";

  let last = performance.now();
  const frame = (now) => {
    if (G.root !== root) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    G.animation = requestAnimationFrame(frame);
  };
  G.animation = requestAnimationFrame(frame);
}

// One frame: move everything a little and draw the picture.
function step(dt) {
  if (!G.paused && !G.over) {
    updateTime(dt);
    updatePlayer(dt);
    updateCrowd(dt);
    updateConcerts(dt);
    updateMissions(dt);
    updateBuggies(dt);
    updateMusic();
    for (const update of G.updaters) update(dt);
  } else if (!G.started && G.ready) {
    // Behind the start screen the camera slowly circles the gate.
    G.cam.yaw += dt * 0.08;
    updateCrowd(dt);
    updateConcerts(dt);
    updateNpcs(dt);
    for (const update of G.updaters) update(dt);
  } else if (audio.ctx) updateMusic();
  if (!G.ready) return;
  updateWorld();
  updateShowtime(dt);
  updateBanner(dt);
  updateCamera(dt);
  updateHud();
  G.renderer.render(G.scene, G.camera);
}

function stopGame() {
  if (G.animation) cancelAnimationFrame(G.animation);
  window.removeEventListener("keydown", G.onKeyDown, true);
  window.removeEventListener("keyup", G.onKeyUp, true);
  window.removeEventListener("mousemove", G.onMouseMove);
  window.removeEventListener("resize", G.onResize);
  if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock();
  if (audio.ctx) { try { audio.ctx.close(); } catch (error) { /* already closed */ } audio.ctx = null; }
  if (G.renderer) { G.renderer.dispose(); if (G.renderer.forceContextLoss) G.renderer.forceContextLoss(); }
  if (G.root) G.root.remove();
  G.root = null;
  window.__lejet = null;
}

// The app calls this function when it shows the game. What it returns is called when the game is taken away.
export default function (component) {
  const config = component.data;
  if (!config || !config.run_id) return;
  // If this very game is already running (the page was only redrawn), leave it alone.
  if (window.__lejet && window.__lejet.runId === config.run_id) { G.component = component; return window.__lejet.stop; }
  if (window.__lejet) window.__lejet.stop();
  window.__lejet = {
    runId: config.run_id, G: G, stop: stopGame,
    // Helpers for testing from the browser console.
    step: (frames = 1, dt = 0.033) => { for (let i = 0; i < frames; i++) step(dt); },
    teleport: (x, z) => { G.player.x = x; G.player.z = z; camTarget.ready = false; },
    setTime: (minute) => { G.minute = minute; },
    start: () => startPlaying(),
    fn: { interact: interact, chooseMenu: chooseMenu, key: handleKeyPress, endNight: endNight, buy: buy, updateFocus: updateFocus, passOut: passOut, fireworks: launchFireworks },
  };
  startGame(component);
  return window.__lejet.stop;
}

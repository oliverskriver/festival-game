// ============================================================================
// 00_core.js — small helpers every other file uses.
//
// All files in game3d/ are glued together in file-name order into ONE script
// (see game_screens.py). So a function written in one file can be used in all
// later files. Everything about the running game lives in the object G.
// ============================================================================

const THREE_URLS = [
  "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
  "https://unpkg.com/three@0.170.0/build/three.module.js",
];

let THREE = null; // the 3D library, loaded in 90_main.js before anything is drawn

// The one object that holds the whole running game.
const G = {
  config: null, // everything Python sent: places, programme, prices, rules
  scene: null,
  camera: null,
  renderer: null,
  minute: 0, // festival time in minutes after midnight (14:00 is 840)
  night: 0, // 0 in daylight, 1 when it is fully dark
  colliders: [], // boxes you cannot walk through
  places: [], // the places from Python plus the 3D things built for them
  stages: {}, // the three stages by id
  events: [], // what happened tonight: this list is what Python's referee gets
  paused: true,
  over: false,
  keys: {},
  updaters: [], // functions called every frame with (seconds passed)
};

async function loadThree() {
  for (const url of THREE_URLS) {
    try {
      return await import(/* webpackIgnore: true */ url);
    } catch (error) {
      console.warn("Could not load the 3D library from " + url, error);
    }
  }
  throw new Error("The 3D library could not be loaded. Check the internet connection.");
}

// ---------- numbers ----------

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};
const dist2d = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// A random-number maker that gives the same numbers every time for the same seed,
// so the trees and the crowd look the same on every computer.
function makeRandom(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = makeRandom(3210);
const randBetween = (low, high) => low + rand() * (high - low);
const pick = (list) => list[Math.floor(rand() * list.length)];

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

// Festival minutes as clock text: 1500 becomes "01:00".
function clockText(minute) {
  const whole = Math.floor(minute);
  const hours = Math.floor(whole / 60) % 24;
  const mins = whole % 60;
  return String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
}

// ---------- drawing helpers ----------

const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

// Text painted on a small picture, to be put on signs and banners.
function textTexture(text, options = {}) {
  const width = options.width || 512;
  const height = options.height || 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = options.bg || "#000000";
  ctx.fillRect(0, 0, width, height);
  if (options.border) {
    ctx.strokeStyle = options.border;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, width - 10, height - 10);
  }
  let size = options.size || Math.floor(height * 0.62);
  ctx.font = "bold " + size + "px " + FONT;
  while (ctx.measureText(text).width > width * 0.9 && size > 12) {
    size -= 4;
    ctx.font = "bold " + size + "px " + FONT;
  }
  ctx.fillStyle = options.fg || "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2 + size * 0.04);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Is a colour light (so black text reads best on it)?
function isLight(hex) {
  const c = new THREE.Color(hex);
  return c.r * 0.3 + c.g * 0.6 + c.b * 0.1 > 0.5;
}

const materialCache = {};
// A plain coloured surface. The same colour is reused instead of made again.
function mat(colour, options = {}) {
  const key = colour + JSON.stringify(options);
  if (!materialCache[key]) {
    materialCache[key] = new THREE.MeshStandardMaterial(
      Object.assign({ color: colour, roughness: 0.85, metalness: 0.0, flatShading: true }, options)
    );
  }
  return materialCache[key];
}

// A surface that glows by itself (lamps, screens), not affected by daylight.
function glow(colour, options = {}) {
  return new THREE.MeshBasicMaterial(Object.assign({ color: colour }, options));
}

// Shortcut: a box of a given size and colour, placed with its centre at (x, y, z).
function box(width, height, depth, colour, x = 0, y = 0, z = 0, options = {}) {
  const material = typeof colour === "string" || typeof colour === "number" ? mat(colour, options) : colour;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(radiusTop, radiusBottom, height, colour, x = 0, y = 0, z = 0, sides = 12) {
  const material = typeof colour === "string" || typeof colour === "number" ? mat(colour) : colour;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, sides), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// A flat sign with text, readable from the front.
function sign(text, width, height, bg, fg) {
  const texture = textTexture(text, { bg: bg, fg: fg || (isLight(bg) ? "#111111" : "#ffffff"), width: 512, height: Math.max(64, Math.round((512 * height) / width)) });
  const material = new THREE.MeshBasicMaterial({ map: texture });
  material.userData.isSign = true;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  G.signMaterials.push(material);
  return mesh;
}
G.signMaterials = [];

// "turn" from Python (degrees, 0 = looking south, 90 = looking west) as a rotation for three.js.
const turnToAngle = (turn) => (-turn * Math.PI) / 180;
// The direction (x, z) something with that turn is looking at.
const facingOf = (turn) => ({ x: Math.sin(turnToAngle(turn)), z: Math.cos(turnToAngle(turn)) });

// Remember a box people cannot walk through. (x, z) is its middle, hw and hd half its size.
function addCollider(x, z, hw, hd, angle = 0, tag = "") {
  G.colliders.push({ x: x, z: z, hw: hw, hd: hd, cos: Math.cos(angle), sin: Math.sin(angle), tag: tag });
}

// Push a walker (a circle with a radius) out of every box it stands in. Returns the corrected spot.
function pushOutOfColliders(x, z, radius) {
  for (const c of G.colliders) {
    if (c.off) continue;
    const dx = x - c.x;
    const dz = z - c.z;
    if (Math.abs(dx) > c.hw + c.hd + radius || Math.abs(dz) > c.hw + c.hd + radius) continue;
    // The point seen from the box's own point of view (the box may be turned).
    const lx = dx * c.cos - dz * c.sin;
    const lz = dx * c.sin + dz * c.cos;
    const overX = c.hw + radius - Math.abs(lx);
    const overZ = c.hd + radius - Math.abs(lz);
    if (overX > 0 && overZ > 0) {
      let px = lx;
      let pz = lz;
      if (overX < overZ) px = (lx < 0 ? -1 : 1) * (c.hw + radius);
      else pz = (lz < 0 ? -1 : 1) * (c.hd + radius);
      x = c.x + px * c.cos + pz * c.sin;
      z = c.z - px * c.sin + pz * c.cos;
    }
  }
  return { x: x, z: z };
}

// Same question as world.inside_site in Python: is this point inside the fence?
function insideFence(x, z) {
  const fence = G.config.fence;
  let inside = false;
  for (let i = 0, j = fence.length - 1; i < fence.length; j = i++) {
    const x1 = fence[i][0], z1 = fence[i][1], x2 = fence[j][0], z2 = fence[j][1];
    if (z1 > z !== z2 > z && x < x1 + ((z - z1) * (x2 - x1)) / (z2 - z1)) inside = !inside;
  }
  return inside;
}

// Write down something that happened, for Python's referee.
function logEvent(event) {
  G.events.push(event);
}

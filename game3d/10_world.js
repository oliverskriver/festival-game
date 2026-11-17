// ============================================================================
// 10_world.js — the festival site: sky, light, ground, trees and every building.
//
// Nothing here knows where things stand. The positions come from world.py in
// Python (G.config.places). This file only knows what a "stall" or a "stage"
// looks like and builds one at the position it is given.
// ============================================================================

// What the sky and the light look like at different times of the evening.
// [minute, sky top, sky bottom, sun colour, sun strength, general light strength]
const SKY_STEPS = [
  [840, "#2f7fe0", "#bfe4ff", "#fff4dd", 2.7, 1.05],
  [1140, "#3a80dc", "#cfe6ff", "#ffe9c4", 2.4, 0.95],
  [1230, "#4a78cf", "#ffd7a1", "#ffc98a", 1.9, 0.8],
  [1290, "#3a4f9e", "#ff9a5a", "#ff8d4d", 1.1, 0.62],
  [1335, "#1c2560", "#8d4f7c", "#ff7a5a", 0.3, 0.45],
  [1380, "#0a1030", "#232a5c", "#8fa4ff", 0.3, 0.5],
  [1440, "#050818", "#0f1535", "#8fa4ff", 0.28, 0.46],
  [1700, "#050818", "#0f1535", "#8fa4ff", 0.28, 0.46],
];

function buildSkyAndLight() {
  const scene = G.scene;
  scene.fog = new THREE.Fog(0xbfe4ff, 90, 420);

  // The sky is a huge ball around the camera, painted from one colour at the top to another at the horizon.
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
    vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader:
      "uniform vec3 top; uniform vec3 bottom; varying vec3 vDir;" +
      "void main(){ float h = clamp(vDir.y * 1.25 + 0.08, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.55)), 1.0);\n" +
      "#include <colorspace_fragment>\n}",
  });
  G.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), skyMaterial);
  G.sky.renderOrder = -10;
  scene.add(G.sky);

  // Stars: only visible when it is dark.
  const starPositions = [];
  const starRandom = makeRandom(77);
  for (let i = 0; i < 700; i++) {
    const a = starRandom() * Math.PI * 2;
    const h = 0.12 + starRandom() * 0.88;
    const r = Math.sqrt(1 - h * h);
    starPositions.push(Math.cos(a) * r * 850, h * 850, Math.sin(a) * r * 850);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  G.stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(G.stars);

  G.hemi = new THREE.HemisphereLight(0xffffff, 0x4a6a3a, 1.0);
  scene.add(G.hemi);

  // The sun (and later the moon). It throws shadows in a square that follows the player.
  G.sun = new THREE.DirectionalLight(0xffffff, 2.5);
  G.sun.castShadow = true;
  G.sun.shadow.mapSize.set(2048, 2048);
  const shadowCamera = G.sun.shadow.camera;
  shadowCamera.left = -70; shadowCamera.right = 70; shadowCamera.top = 70; shadowCamera.bottom = -70;
  shadowCamera.near = 10; shadowCamera.far = 400;
  G.sun.shadow.bias = -0.0006;
  G.sun.shadow.normalBias = 0.05;
  scene.add(G.sun);
  scene.add(G.sun.target);

  // A soft lamp that follows the player at night so you can always see where you walk.
  G.playerLamp = new THREE.PointLight(0xffe2b8, 0, 34, 1.3);
  scene.add(G.playerLamp);
}

const skyTmpA = { top: null, bottom: null, sun: null };
function updateSkyAndLight() {
  const minute = G.minute;
  let i = 0;
  while (i < SKY_STEPS.length - 2 && minute > SKY_STEPS[i + 1][0]) i++;
  const a = SKY_STEPS[i], b = SKY_STEPS[i + 1];
  const t = clamp((minute - a[0]) / (b[0] - a[0]), 0, 1);
  const top = new THREE.Color(a[1]).lerp(new THREE.Color(b[1]), t);
  const bottom = new THREE.Color(a[2]).lerp(new THREE.Color(b[2]), t);
  const sunColour = new THREE.Color(a[3]).lerp(new THREE.Color(b[3]), t);
  const sunStrength = lerp(a[4], b[4], t);
  const ambient = lerp(a[5], b[5], t);

  G.sky.material.uniforms.top.value.copy(top);
  G.sky.material.uniforms.bottom.value.copy(bottom);
  G.scene.fog.color.copy(bottom);
  G.night = smooth(1270, 1385, minute);
  G.scene.fog.near = lerp(90, 45, G.night);
  G.scene.fog.far = lerp(420, 260, G.night);
  G.stars.material.opacity = G.night * 0.9;

  G.sun.color.copy(sunColour);
  G.sun.intensity = sunStrength;
  G.hemi.intensity = ambient;
  G.hemi.color.copy(top).lerp(new THREE.Color(0xffffff), 0.55 * (1 - G.night));
  G.hemi.groundColor.set(G.night > 0.5 ? 0x1a2238 : 0x4a6a3a);

  // The sun travels from the south-west down to the north-west and sets at about 21:50.
  // After that the same light is used as the moon, from the other side.
  const day = clamp((minute - 840) / (1310 - 840), 0, 1);
  let height = lerp(0.95, 0.06, Math.pow(day, 1.3));
  let around = lerp(-0.6, -2.2, day);
  if (minute > 1335) { height = 0.75; around = 0.9; }
  const cx = G.player ? G.player.x : 0;
  const cz = G.player ? G.player.z : 0;
  const flat = Math.cos(height);
  G.sun.position.set(cx + Math.sin(around) * flat * 160, Math.sin(height) * 160 + 12, cz + Math.cos(around) * flat * 160);
  G.sun.target.position.set(cx, 0, cz);
  G.sky.position.copy(G.camera.position);
  G.stars.position.copy(G.camera.position);

  // The lamp sits just above the camera, so it lights the side of things that you are looking at.
  G.playerLamp.intensity = G.night * 90;
  G.playerLamp.position.set(G.camera.position.x, G.camera.position.y + 2.5, G.camera.position.z);

  // Signs are painted pictures: dim them a little at night so they do not glow like screens.
  const signBrightness = lerp(1, 0.5, G.night);
  for (const material of G.signMaterials) material.color.setScalar(signBrightness);
  G.renderer.toneMappingExposure = lerp(1.0, 1.25, G.night);
}

// ---------- the ground ----------

const GROUND = { x0: -210, z0: -200, width: 420, depth: 380, pixels: 2048 };

// One point on the official map picture as metres, the same sum as world.metres in Python.
const mapPoint = (px, py) => [(px - 590) * 0.3, (py - 1035) * 0.3];

function buildGround() {
  const scale = GROUND.pixels / GROUND.width;
  const canvas = document.createElement("canvas");
  canvas.width = GROUND.pixels;
  canvas.height = Math.round(GROUND.depth * scale);
  const ctx = canvas.getContext("2d");
  const cx = (x) => (x - GROUND.x0) * scale;
  const cz = (z) => (z - GROUND.z0) * scale;
  const line = (points, width, colour) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width * scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(cx(p[0]), cz(p[1])) : ctx.lineTo(cx(p[0]), cz(p[1]))));
    ctx.stroke();
  };
  const blob = (x, z, radius, colour) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(cx(x), cz(z), radius * scale, 0, Math.PI * 2);
    ctx.fill();
  };
  const paint = makeRandom(11);

  // The fields around the festival.
  ctx.fillStyle = "#6fbf73";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 260; i++) blob(GROUND.x0 + paint() * GROUND.width, GROUND.z0 + paint() * GROUND.depth, 4 + paint() * 14, paint() < 0.5 ? "rgba(90,170,90,0.35)" : "rgba(140,205,120,0.3)");

  // Car parks and the two roads, as on the map.
  ctx.fillStyle = "#5d6066";
  const park = (a, b) => ctx.fillRect(cx(a[0]), cz(a[1]), cx(b[0]) - cx(a[0]), cz(b[1]) - cz(a[1]));
  park(mapPoint(670, 245), mapPoint(1060, 445));
  park(mapPoint(1145, 440), mapPoint(1290, 800));
  const roadEast = [mapPoint(1215, -200), mapPoint(1195, 0), mapPoint(1160, 400), mapPoint(1128, 700), mapPoint(1100, 1000), mapPoint(1078, 1200), mapPoint(1030, 1545), mapPoint(1000, 1800)];
  const roadNorth = [mapPoint(-200, 110), mapPoint(0, 165), mapPoint(480, 290), mapPoint(1160, 440)];
  for (const road of [roadEast, roadNorth]) {
    line(road, 9, "#6b6e75");
    ctx.setLineDash([2.2 * scale, 2.6 * scale]);
    line(road, 0.25, "#e9e9e9");
    ctx.setLineDash([]);
  }
  G.roadEast = roadEast;

  // The festival site itself: grass.
  const fence = G.config.fence;
  ctx.fillStyle = "#3f9a4c";
  ctx.beginPath();
  fence.forEach((p, i) => (i === 0 ? ctx.moveTo(cx(p[0]), cz(p[1])) : ctx.lineTo(cx(p[0]), cz(p[1]))));
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 900; i++) blob(-150 + paint() * 300, -125 + paint() * 255, 1.5 + paint() * 6, paint() < 0.5 ? "rgba(50,130,60,0.35)" : "rgba(95,180,90,0.28)");

  // Wood chips: the paths, the squares in front of the stages and around the stalls.
  const chips = "#b98f5c";
  for (const path of G.config.paths) line(path, 7.5, chips);
  for (const place of G.config.places) {
    if (place.kind === "stage") {
      const f = facingOf(place.turn);
      const reach = place.id === "sol" ? 30 : place.id === "skov" ? 23 : 15;
      blob(place.x + f.x * (place.d / 2 + reach * 0.8), place.z + f.z * (place.d / 2 + reach * 0.8), reach, chips);
      blob(place.x + f.x * 6, place.z + f.z * 6, place.w * 0.7, chips);
    } else if (place.kind !== "landmark") {
      blob(place.x, place.z, Math.max(place.w, place.d) * 0.5 + 3.2, chips);
    }
  }
  blob(86, 40, 16, chips); // the square inside the entrance
  // Speckles so the chips do not look like flat paint.
  for (let i = 0; i < 26000; i++) {
    const x = -150 + paint() * 300, z = -125 + paint() * 255;
    ctx.fillStyle = paint() < 0.5 ? "rgba(90,60,30,0.16)" : "rgba(255,230,180,0.13)";
    ctx.fillRect(cx(x), cz(z), 2 + paint() * 3, 1 + paint() * 2);
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = G.renderer.capabilities.getMaxAnisotropy();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND.width, GROUND.depth), new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(GROUND.x0 + GROUND.width / 2, 0, GROUND.z0 + GROUND.depth / 2);
  ground.receiveShadow = true;
  G.scene.add(ground);
  G.groundCanvas = canvas; // the mini-map reuses this picture

  // More field beyond the painted square, so the world does not end in a cliff.
  const far = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: 0x66b56c, roughness: 1 }));
  far.rotation.x = -Math.PI / 2;
  far.position.y = -0.05;
  G.scene.add(far);
}

// ---------- trees and the fence ----------

function buildTreesAndFence() {
  const spots = [];
  const treeRandom = makeRandom(5);
  const fence = G.config.fence;
  // A thick belt of trees just outside the fence, like on the real site.
  for (let i = 0; i < fence.length; i++) {
    const a = fence[i], b = fence[(i + 1) % fence.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = (b[1] - a[1]) / length, nz = -(b[0] - a[0]) / length; // points away from the site
    for (let d = 0; d < length; d += 3.4) {
      for (let row = 0; row < 3; row++) {
        const t = (d + treeRandom() * 2.5) / length;
        const out = 2.5 + row * 5.5 + treeRandom() * 3;
        spots.push([lerp(a[0], b[0], t) + nx * out, lerp(a[1], b[1], t) + nz * out, 0.8 + treeRandom() * 0.7 + row * 0.1]);
      }
    }
  }
  // Groups of trees inside the site (from world.py).
  for (const [x, z, radius, count] of G.config.trees) {
    for (let i = 0; i < count; i++) {
      const angle = treeRandom() * Math.PI * 2, r = Math.sqrt(treeRandom()) * radius;
      spots.push([x + Math.cos(angle) * r, z + Math.sin(angle) * r, 0.75 + treeRandom() * 0.5, true]);
    }
  }
  // No tree in the entrance opening or on top of a building.
  const entrance = G.config.places.find((p) => p.kind === "entrance");
  const kept = spots.filter(([x, z, size, inside]) => {
    if (dist2d(x, z, entrance.x + 14, entrance.z + 14) < 16) return false;
    if (inside) for (const p of G.config.places) if (dist2d(x, z, p.x, p.z) < Math.max(p.w, p.d) * 0.6 + 2) return false;
    return true;
  });

  const trunkGeometry = new THREE.CylinderGeometry(0.22, 0.34, 1, 6);
  const leafGeometry = new THREE.IcosahedronGeometry(1, 1);
  const pineGeometry = new THREE.ConeGeometry(1, 1, 7);
  const trunks = new THREE.InstancedMesh(trunkGeometry, mat("#6b4a2f"), kept.length);
  const leaves = new THREE.InstancedMesh(leafGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), kept.length * 2);
  const pines = new THREE.InstancedMesh(pineGeometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), kept.length * 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), colour = new THREE.Color();
  let leafCount = 0, pineCount = 0;
  kept.forEach(([x, z, size, inside], i) => {
    const isPine = treeRandom() < 0.38;
    const trunkHeight = (isPine ? 3.2 : 2.6) * size;
    m.compose(new THREE.Vector3(x, trunkHeight / 2, z), q, new THREE.Vector3(size, trunkHeight, size));
    trunks.setMatrixAt(i, m);
    const green = 0.28 + treeRandom() * 0.2;
    if (isPine) {
      colour.setRGB(0.07 + treeRandom() * 0.05, green * 0.95, 0.12 + treeRandom() * 0.05);
      for (let layer = 0; layer < 2; layer++) {
        m.compose(new THREE.Vector3(x, trunkHeight + layer * 2.2 * size + 1.2 * size, z), q, new THREE.Vector3((2.6 - layer * 0.8) * size, 4.2 * size, (2.6 - layer * 0.8) * size));
        pines.setMatrixAt(pineCount, m);
        pines.setColorAt(pineCount++, colour);
      }
    } else {
      colour.setRGB(0.1 + treeRandom() * 0.08, green + 0.12, 0.1 + treeRandom() * 0.06);
      const crown = (2.3 + treeRandom() * 0.9) * size;
      m.compose(new THREE.Vector3(x, trunkHeight + crown * 0.55, z), q, new THREE.Vector3(crown, crown * 0.95, crown));
      leaves.setMatrixAt(leafCount, m);
      leaves.setColorAt(leafCount++, colour);
      m.compose(new THREE.Vector3(x + size * 0.9, trunkHeight + crown * 0.2, z + size * 0.5), q, new THREE.Vector3(crown * 0.6, crown * 0.55, crown * 0.6));
      leaves.setMatrixAt(leafCount, m);
      leaves.setColorAt(leafCount++, colour);
    }
    if (inside) addCollider(x, z, 0.35 * size, 0.35 * size, 0, "tree");
  });
  leaves.count = leafCount;
  pines.count = pineCount;
  for (const mesh of [trunks, leaves, pines]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    G.scene.add(mesh);
  }

  // The fence: a low dark-green wall of mesh panels between posts.
  const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x1d4a2a, roughness: 1, transparent: true, opacity: 0.85 });
  for (let i = 0; i < fence.length; i++) {
    const a = fence[i], b = fence[(i + 1) % fence.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(length, 2, 0.12), fenceMaterial);
    panel.position.set((a[0] + b[0]) / 2, 1, (a[1] + b[1]) / 2);
    panel.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    G.scene.add(panel);
  }
}

// ---------- lamps: thousands of little bulbs drawn in one go ----------

const bulbList = []; // [x, y, z, colour]
function addBulb(x, y, z, colour = "#ffd98a") {
  bulbList.push([x, y, z, colour]);
}
// A sagging string of bulbs between two points.
function addBulbString(ax, ay, az, bx, by, bz, colour, every = 0.9) {
  const length = Math.hypot(bx - ax, by - ay, bz - az);
  const count = Math.max(2, Math.floor(length / every));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const sag = Math.sin(t * Math.PI) * Math.min(1.2, length * 0.06);
    addBulb(lerp(ax, bx, t), lerp(ay, by, t) - sag, lerp(az, bz, t), colour);
  }
}
function buildBulbs() {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), bulbList.length);
  const m = new THREE.Matrix4(), colour = new THREE.Color();
  bulbList.forEach(([x, y, z, c], i) => {
    m.makeTranslation(x, y, z);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, colour.set(c));
  });
  mesh.frustumCulled = false;
  G.bulbs = mesh;
  G.scene.add(mesh);

  // Soft pools of light on the ground under groups of bulbs: cheap, but it makes the night glow.
  const poolTexture = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  G.poolMaterial = new THREE.MeshBasicMaterial({ map: poolTexture, color: 0xffb060, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), G.poolMaterial, G.lightPools.length);
  const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  G.lightPools.forEach(([x, z, size], i) => {
    m.compose(new THREE.Vector3(x, 0.06 + (i % 7) * 0.004, z), flat, new THREE.Vector3(size, size, 1));
    pools.setMatrixAt(i, m);
  });
  pools.frustumCulled = false;
  pools.renderOrder = 2;
  G.scene.add(pools);
}
G.lightPools = []; // [x, z, size]

// ---------- buildings ----------

// Turn a point given in a building's own directions (right, up, forward) into a point in the world.
function localToWorld(place, lx, ly, lz) {
  const a = turnToAngle(place.turn);
  return [place.x + lx * Math.cos(a) + lz * Math.sin(a), ly, place.z - lx * Math.sin(a) + lz * Math.cos(a)];
}

function startBuilding(place) {
  const group = new THREE.Group();
  group.position.set(place.x, 0, place.z);
  group.rotation.y = turnToAngle(place.turn);
  G.scene.add(group);
  return group;
}

// A market stall: a coloured box with a counter, an awning, a roof sign and a row of bulbs.
function buildStall(place) {
  const g = startBuilding(place);
  const { w, d, h } = place;
  g.add(box(w, h * 0.82, d, place.colour, 0, h * 0.41, 0));
  g.add(box(w * 0.82, h * 0.34, 0.12, "#1c1c22", 0, h * 0.5, d / 2 + 0.02));
  g.add(box(w * 0.86, 0.12, 0.7, "#f3ead2", 0, h * 0.32, d / 2 + 0.3));
  g.add(box(w + 0.5, 0.18, d + 0.5, "#f7f3e3", 0, h * 0.85, 0));
  const awning = box(w + 0.3, 0.1, 1.7, isLight(place.colour) ? "#ffffff" : "#f7f3e3", 0, h * 0.78, d / 2 + 0.8);
  awning.rotation.x = 0.22;
  g.add(awning);
  for (const side of [1, -1]) {
    const board = sign(place.name, Math.min(w, 5.2), 0.95, isLight(place.colour) ? "#111111" : "#ffffff", isLight(place.colour) ? "#ffffff" : "#111111");
    board.position.set(0, h * 0.85 + 0.62, side * (d / 2 + 0.05));
    if (side < 0) board.rotation.y = Math.PI;
    g.add(board);
  }
  const left = localToWorld(place, -w / 2, h * 0.7, d / 2 + 1.6), right = localToWorld(place, w / 2, h * 0.7, d / 2 + 1.6);
  addBulbString(left[0], left[1], left[2], right[0], right[1], right[2], "#ffd98a", 0.6);
  const front = localToWorld(place, 0, 0, d / 2 + 2.5);
  G.lightPools.push([front[0], front[2], 9]);
  addCollider(place.x, place.z, w / 2, d / 2, turnToAngle(place.turn), place.id);
  return g;
}

// A shipping-container bar: ribbed box with an open hatch.
function buildContainer(place) {
  const g = startBuilding(place);
  const { w, d, h } = place;
  g.add(box(w, h, d, place.colour, 0, h / 2, 0));
  for (let i = -3; i <= 3; i++) g.add(box(0.08, h * 0.96, d + 0.06, "#000000", (i * w) / 7, h / 2, 0, { transparent: true, opacity: 0.25 }));
  g.add(box(0.14, h * 0.4, d * 0.7, "#15151a", w / 2 + 0.02, h * 0.55, 0));
  g.add(box(0.8, 0.12, d * 0.74, "#f3ead2", w / 2 + 0.4, h * 0.34, 0));
  for (const side of [1, -1]) {
    const board = sign(place.name, Math.min(d, 6), 1.0, "#111111", "#ffffff");
    board.position.set(side * (w / 2 + 0.06), h - 0.7, 0);
    board.rotation.y = side * Math.PI / 2;
    g.add(board);
  }
  const a = localToWorld(place, w / 2 + 1.2, h * 0.95, -d / 2), b = localToWorld(place, w / 2 + 1.2, h * 0.95, d / 2);
  addBulbString(a[0], a[1], a[2], b[0], b[1], b[2], "#ffd98a", 0.6);
  const front = localToWorld(place, w / 2 + 3, 0, 0);
  G.lightPools.push([front[0], front[2], 10]);
  addCollider(place.x, place.z, w / 2, d / 2, turnToAngle(place.turn), place.id);
  return g;
}

// A barn or big tent with a pointed roof and an open front.
function buildBarn(place) {
  const g = startBuilding(place);
  const { w, d, h } = place;
  const wall = h * 0.55;
  g.add(box(w, wall, d, place.colour, 0, wall / 2, 0));
  // The roof: a triangle pushed through the length of the building.
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.4, 0);
  shape.lineTo(0, h - wall);
  shape.lineTo(w / 2 + 0.4, 0);
  shape.closePath();
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: d + 0.8, bevelEnabled: false }), mat(new THREE.Color(place.colour).multiplyScalar(0.82).getStyle()));
  roof.position.set(0, wall, -d / 2 - 0.4);
  roof.castShadow = true;
  g.add(roof);
  g.add(box(w * 0.6, wall * 0.78, 0.15, "#17171c", 0, wall * 0.39, d / 2 + 0.03));
  const board = sign(place.name, Math.min(w * 0.9, 9), 1.4, isLight(place.colour) ? "#111111" : "#ffffff", isLight(place.colour) ? "#ffffff" : "#111111");
  board.position.set(0, wall + 0.9, d / 2 + 0.5);
  g.add(board);
  const back = sign(place.name, Math.min(w * 0.9, 9), 1.4, isLight(place.colour) ? "#111111" : "#ffffff", isLight(place.colour) ? "#ffffff" : "#111111");
  back.position.set(0, wall + 0.9, -d / 2 - 0.5);
  back.rotation.y = Math.PI;
  g.add(back);
  const a = localToWorld(place, -w / 2, wall, d / 2 + 0.6), b = localToWorld(place, w / 2, wall, d / 2 + 0.6);
  addBulbString(a[0], a[1], a[2], b[0], b[1], b[2], "#ffd98a", 0.5);
  const front = localToWorld(place, 0, 0, d / 2 + 4);
  G.lightPools.push([front[0], front[2], 14]);
  addCollider(place.x, place.z, w / 2, d / 2, turnToAngle(place.turn), place.id);
  return g;
}

// A round circus-style tent with a pointed striped roof.
function buildRoundTent(place) {
  const g = startBuilding(place);
  const radius = place.w / 2, wall = Math.min(3, place.h * 0.4);
  g.add(cylinder(radius, radius, wall, place.colour, 0, wall / 2, 0, 18));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(radius + 0.5, place.h - wall, 18), mat(place.colour));
  roof.position.y = wall + (place.h - wall) / 2;
  roof.castShadow = true;
  g.add(roof);
  // Yellow stripes on the wall and a flag on top.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    g.add(box(0.5, wall * 0.98, 0.08, "#FFC607", Math.sin(a) * (radius + 0.03), wall / 2, Math.cos(a) * (radius + 0.03))).rotation;
    g.children[g.children.length - 1].rotation.y = a;
  }
  g.add(cylinder(0.06, 0.06, 2.2, "#dddddd", 0, place.h + 1.1, 0, 5));
  g.add(box(1.1, 0.6, 0.04, "#FF471C", 0.6, place.h + 1.8, 0));
  const board = sign(place.name, Math.min(radius * 1.5, 8), 1.2, "#111111", "#ffffff");
  board.position.set(0, wall + 0.4, radius + 0.6);
  g.add(board);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, b = ((i + 1) / 14) * Math.PI * 2;
    addBulbString(place.x + Math.sin(a) * (radius + 0.5), wall + 0.1, place.z + Math.cos(a) * (radius + 0.5), place.x + Math.sin(b) * (radius + 0.5), wall + 0.1, place.z + Math.cos(b) * (radius + 0.5), "#ffd98a", 0.7);
  }
  G.lightPools.push([place.x, place.z, radius * 3.4]);
  addCollider(place.x, place.z, radius * 0.86, radius * 0.86, 0, place.id);
  addCollider(place.x, place.z, radius * 0.86, radius * 0.86, Math.PI / 4, place.id);
  return g;
}

// The entrance gate, built after the owner's photo: red banners, a yellow sun, a truss on top.
function buildGate(place) {
  const g = startBuilding(place);
  const w = place.w, h = place.h;
  for (const side of [-1, 1]) {
    g.add(box(1.2, h, 1.2, "#FF471C", side * (w / 2 + 0.6), h / 2, 0));
    g.add(box(1.3, h * 0.45, 1.3, "#FFC607", side * (w / 2 + 0.6), h * 0.23, 0));
    addCollider(...localToWorld(place, side * (w / 2 + 0.6), 0, 0).filter((v, i) => i !== 1), 0.7, 0.7, 0, "gate");
  }
  g.add(box(w + 2.4, 0.5, 1.0, "#9aa0a8", 0, h * 0.62, 0, { metalness: 0.6, roughness: 0.4 }));
  // The banner: a red cloth with a big yellow sun and the festival's name.
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 280;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FF471C"; ctx.fillRect(0, 0, 1024, 280);
  ctx.fillStyle = "#FFC607"; ctx.beginPath(); ctx.ellipse(512, 300, 330, 290, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#E23A1A"; ctx.font = "bold 92px " + FONT; ctx.textAlign = "center";
  ctx.fillText("MUSIK", 512, 150); ctx.fillText("I LEJET", 512, 240);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const bannerMaterial = new THREE.MeshBasicMaterial({ map: texture });
  G.signMaterials.push(bannerMaterial);
  for (const side of [1, -1]) {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(w + 2.4, h * 0.36), bannerMaterial);
    banner.position.set(0, h * 0.82, side * 0.52);
    if (side < 0) banner.rotation.y = Math.PI;
    g.add(banner);
  }
  g.add(box(w + 2.4, h * 0.36, 1.0, "#FF471C", 0, h * 0.82, 0));
  const a = localToWorld(place, -w / 2, h * 0.58, 0.8), b = localToWorld(place, w / 2, h * 0.58, 0.8);
  addBulbString(a[0], a[1], a[2], b[0], b[1], b[2], "#ffe2a8", 0.4);
  G.lightPools.push([place.x, place.z, 18]);
  return g;
}

// The striped lighthouse with a lamp that sweeps round at night.
function buildLighthouse(place) {
  const g = startBuilding(place);
  const h = place.h, r = place.w / 2;
  for (let i = 0; i < 6; i++) {
    const y0 = (i * h * 0.8) / 6, r0 = lerp(r, r * 0.62, i / 6), r1 = lerp(r, r * 0.62, (i + 1) / 6);
    g.add(cylinder(r1, r0, (h * 0.8) / 6, i % 2 === 0 ? "#ffffff" : "#2459c9", 0, y0 + (h * 0.8) / 12, 0, 14));
  }
  g.add(cylinder(r * 0.8, r * 0.8, 0.3, "#22252b", 0, h * 0.8 + 0.15, 0, 14));
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, h * 0.12, 10), glow("#fff3b0"));
  lamp.position.y = h * 0.8 + 0.3 + h * 0.06;
  g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.6, h * 0.08, 10), mat("#2459c9"));
  cap.position.y = h * 0.8 + 0.3 + h * 0.12 + h * 0.04;
  g.add(cap);
  const board = sign("1664", 2.6, 1.1, "#2459c9", "#ffffff");
  board.position.set(0, 2.6, r + 0.08);
  g.add(board);
  // The sweeping beam: a long see-through cone that turns.
  const beam = new THREE.Mesh(new THREE.ConeGeometry(4.5, 60, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  beam.geometry.translate(0, -30, 0);
  beam.rotation.z = Math.PI / 2 - 0.08;
  const turner = new THREE.Group();
  turner.position.y = lamp.position.y;
  turner.add(beam);
  g.add(turner);
  G.updaters.push((dt) => {
    turner.rotation.y += dt * 0.5;
    beam.material.opacity = G.night * 0.13;
  });
  G.lightPools.push([place.x, place.z, 16]);
  addCollider(place.x, place.z, r, r, 0, place.id);
  return g;
}

// A white building with a wooden terrace and parasols.
function buildTerrace(place) {
  const g = startBuilding(place);
  const { w, d, h } = place;
  g.add(box(w, h, d * 0.5, place.colour, 0, h / 2, -d * 0.25));
  g.add(box(w, 0.4, d * 0.5, "#b98f5c", 0, 0.2, d * 0.25));
  g.add(box(w * 0.7, h * 0.4, 0.12, "#17171c", 0, h * 0.5, 0.03));
  for (let i = -1; i <= 1; i++) {
    g.add(cylinder(0.05, 0.05, 2.6, "#888888", i * w * 0.3, 1.7, d * 0.28, 5));
    const parasol = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.7, 8), mat(i === 0 ? "#FFC607" : "#ffffff"));
    parasol.position.set(i * w * 0.3, 3.1, d * 0.28);
    parasol.castShadow = true;
    g.add(parasol);
  }
  const board = sign(place.name, Math.min(w * 0.8, 9), 1.2, "#111111", "#ffffff");
  board.position.set(0, h + 0.7, 0.05);
  g.add(board);
  const a = localToWorld(place, -w / 2, 3.4, d / 2), b = localToWorld(place, w / 2, 3.4, d / 2);
  addBulbString(a[0], a[1], a[2], b[0], b[1], b[2], "#ffd98a", 0.5);
  G.lightPools.push([localToWorld(place, 0, 0, d * 0.3)[0], localToWorld(place, 0, 0, d * 0.3)[2], 16]);
  addCollider(...localToWorld(place, 0, 0, -d * 0.25).filter((v, i) => i !== 1), w / 2, d * 0.25, turnToAngle(place.turn), place.id);
  return g;
}

// A row of blue toilet cabins.
function buildToilets(place) {
  const g = startBuilding(place);
  const along = place.w >= place.d;
  const length = along ? place.w : place.d;
  const count = Math.floor(length / 1.3);
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * 1.3;
    const cabin = box(1.15, 2.4, 1.2, place.colour, along ? offset : 0, 1.2, along ? 0 : offset);
    g.add(cabin);
    g.add(box(along ? 0.7 : 0.05, 1.8, along ? 0.05 : 0.7, "#dfe9f5", along ? offset : 0.6, 1.1, along ? 0.61 : offset));
  }
  const board = sign("TOILET", 2.4, 0.7, "#FFC607", "#111111");
  board.position.set(0, 3.0, 0);
  g.add(board);
  const back = board.clone();
  back.rotation.y = Math.PI;
  g.add(back);
  G.lightPools.push([place.x, place.z, 9]);
  addCollider(place.x, place.z, place.w / 2, place.d / 2, turnToAngle(place.turn), place.id);
  return g;
}

// A water post: free tap water.
function buildWaterPost(place) {
  const g = startBuilding(place);
  g.add(cylinder(0.5, 0.6, 1.1, "#d8dde3", 0, 0.55, 0, 10));
  g.add(cylinder(0.75, 0.75, 0.12, place.colour, 0, 1.15, 0, 14));
  g.add(cylinder(0.05, 0.05, 2.4, "#999999", 0, 2.2, 0, 5));
  const board = sign("VAND", 1.5, 0.6, place.colour, "#0b2a3a");
  board.position.set(0, 3.2, 0.03);
  g.add(board);
  const back = board.clone();
  back.rotation.y = Math.PI;
  back.position.z = -0.03;
  g.add(back);
  addCollider(place.x, place.z, 0.6, 0.6, 0, place.id);
  return g;
}

// The open-air dance floor: glowing tiles under a frame with a mirror ball.
function buildDanceFloor(place) {
  const g = startBuilding(place);
  const tiles = [];
  const n = 6, size = place.w / n;
  const colours = ["#FF471C", "#FFC607", "#3374F2", "#F29BC4", "#4636AA", "#5FD0E0"];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(size * 0.94, 0.12, size * 0.94), new THREE.MeshBasicMaterial({ color: colours[(i * 3 + j * 5) % colours.length] }));
    tile.position.set((i - n / 2 + 0.5) * size, 0.07, (j - n / 2 + 0.5) * size);
    g.add(tile);
    tiles.push(tile);
  }
  const r = place.w / 2 + 0.6;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(cylinder(0.12, 0.12, 5, "#9aa0a8", sx * r, 2.5, sz * r, 6));
  g.add(box(r * 2, 0.15, 0.15, "#9aa0a8", 0, 5, -r));
  g.add(box(r * 2, 0.15, 0.15, "#9aa0a8", 0, 5, r));
  g.add(box(0.15, 0.15, r * 2, "#9aa0a8", -r, 5, 0));
  g.add(box(0.15, 0.15, r * 2, "#9aa0a8", r, 5, 0));
  g.add(box(0.12, 0.12, r * 2.82, "#9aa0a8", 0, 5, 0)).rotation;
  g.children[g.children.length - 1].rotation.y = Math.PI / 4;
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.15, flatShading: true }));
  ball.position.y = 4.2;
  g.add(ball);
  const board = sign(place.name.toUpperCase(), 5, 0.9, "#4636AA", "#ffffff");
  board.position.set(0, 5.7, r);
  g.add(board);
  for (const [sx, sz, ex, ez] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) addBulbString(place.x + sx * r, 4.9, place.z + sz * r, place.x + ex * r, 4.9, place.z + ez * r, "#ff9ad0", 0.5);
  G.lightPools.push([place.x, place.z, 26]);
  G.updaters.push((dt) => {
    ball.rotation.y += dt * 0.8;
    const beat = Math.floor(performance.now() / 480);
    tiles.forEach((tile, k) => {
      const lit = (k * 7 + beat * 3) % 5 < 2;
      tile.material.color.set(colours[(k + beat) % colours.length]).multiplyScalar(lit ? lerp(0.55, 1.5, G.night) : lerp(0.35, 0.3, G.night));
    });
  });
  return g;
}

const BUILDERS = {
  stall: buildStall,
  container: buildContainer,
  barn: buildBarn,
  roundtent: buildRoundTent,
  gate: buildGate,
  lighthouse: buildLighthouse,
  terrace: buildTerrace,
  toilets: buildToilets,
  waterpost: buildWaterPost,
  dancefloor: buildDanceFloor,
};

// ---------- small things that make the place feel alive ----------

function buildProps() {
  const propRandom = makeRandom(99);
  // The blue lamp posts from the entrance photo: a blue pole with a glass cup on top.
  const lampSpots = [];
  for (const path of G.config.paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1];
      const length = Math.hypot(bx - ax, bz - az);
      for (let d = 6; d < length; d += 17) {
        const t = d / length, side = (Math.floor(d / 17) + i) % 2 === 0 ? 1 : -1;
        const x = lerp(ax, bx, t) + ((bz - az) / length) * 5 * side, z = lerp(az, bz, t) - ((bx - ax) / length) * 5 * side;
        if (insideFence(x, z) && !G.config.places.some((p) => dist2d(x, z, p.x, p.z) < Math.max(p.w, p.d) * 0.6 + 2.5)) lampSpots.push([x, z]);
      }
    }
  }
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.12, 4.6, 6), mat("#2459c9"), lampSpots.length);
  const cups = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 1.0, 3, 1, true), new THREE.MeshStandardMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.2 }), lampSpots.length);
  const m = new THREE.Matrix4(), upsideDown = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0)), none = new THREE.Quaternion();
  lampSpots.forEach(([x, z], i) => {
    m.compose(new THREE.Vector3(x, 2.3, z), none, new THREE.Vector3(1, 1, 1));
    poles.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(x, 4.9, z), upsideDown, new THREE.Vector3(1, 1, 1));
    cups.setMatrixAt(i, m);
    addBulb(x, 4.75, z, "#fff1c0");
    addBulb(x, 4.75, z, "#fff1c0");
    G.lightPools.push([x, z, 13]);
    addCollider(x, z, 0.15, 0.15, 0, "lamp");
  });
  for (const mesh of [poles, cups]) { mesh.castShadow = true; mesh.frustumCulled = false; G.scene.add(mesh); }
  // Strings of bulbs from lamp post to lamp post.
  for (let i = 0; i < lampSpots.length; i++) {
    for (let j = i + 1; j < lampSpots.length; j++) {
      const d = dist2d(lampSpots[i][0], lampSpots[i][1], lampSpots[j][0], lampSpots[j][1]);
      if (d < 20 && d > 4) addBulbString(lampSpots[i][0], 4.4, lampSpots[i][1], lampSpots[j][0], 4.4, lampSpots[j][1], "#ffd98a", 1.1);
    }
  }

  // Picnic tables and hay bales on the grass.
  const tableSpots = [];
  for (let i = 0; i < 400 && tableSpots.length < 46; i++) {
    const x = -130 + propRandom() * 260, z = -110 + propRandom() * 220;
    if (!insideFence(x, z)) continue;
    if (G.config.places.some((p) => dist2d(x, z, p.x, p.z) < Math.max(p.w, p.d) * 0.6 + (p.kind === "stage" ? 40 : 5))) continue;
    if (tableSpots.some((t) => dist2d(x, z, t[0], t[1]) < 6)) continue;
    tableSpots.push([x, z, propRandom() * Math.PI]);
  }
  const tops = new THREE.InstancedMesh(new THREE.BoxGeometry(2.0, 0.08, 0.8), mat("#c9a66b"), tableSpots.length);
  const benches = new THREE.InstancedMesh(new THREE.BoxGeometry(2.0, 0.07, 0.3), mat("#b08f58"), tableSpots.length * 2);
  const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.75, 1.5), mat("#8a6a3e"), tableSpots.length * 2);
  const q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  tableSpots.forEach(([x, z, angle], i) => {
    q.setFromEuler(new THREE.Euler(0, angle, 0));
    const put = (mesh, index, lx, y, lz) => {
      m.compose(new THREE.Vector3(x + lx * Math.cos(angle) + lz * Math.sin(angle), y, z - lx * Math.sin(angle) + lz * Math.cos(angle)), q, one);
      mesh.setMatrixAt(index, m);
    };
    put(tops, i, 0, 0.78, 0);
    put(benches, i * 2, 0, 0.45, 0.62);
    put(benches, i * 2 + 1, 0, 0.45, -0.62);
    put(legs, i * 2, 0.8, 0.38, 0);
    put(legs, i * 2 + 1, -0.8, 0.38, 0);
    addCollider(x, z, 1.0, 0.75, angle, "table");
  });
  G.tables = tableSpots;
  for (const mesh of [tops, benches, legs]) { mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; G.scene.add(mesh); }

  // Bunting: little coloured flags on lines above the stalls in the north row and by the entrance.
  const flagColours = ["#FF471C", "#FFC607", "#3374F2", "#F29BC4", "#ffffff", "#4636AA"];
  const flagLines = [
    [mapPoint(450, 720), mapPoint(640, 690), 5.2], [mapPoint(540, 880), mapPoint(560, 980), 5], [mapPoint(840, 1100), mapPoint(900, 1180), 6.5],
    [mapPoint(660, 950), mapPoint(780, 925), 5], [mapPoint(345, 990), mapPoint(350, 1100), 5], [mapPoint(700, 1020), mapPoint(790, 1090), 5.5],
  ];
  let flagTotal = 0;
  const flagPlan = [];
  for (const [a, b, height] of flagLines) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]), count = Math.floor(length / 0.7);
    const angle = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      flagPlan.push([lerp(a[0], b[0], t), height - Math.sin(t * Math.PI) * 0.9, lerp(a[1], b[1], t), angle]);
      flagTotal++;
    }
    for (const end of [a, b]) { const pole = cylinder(0.07, 0.09, height, "#8a6a3e", end[0], height / 2, end[1], 6); G.scene.add(pole); }
  }
  const flagShape = new THREE.BufferGeometry();
  flagShape.setAttribute("position", new THREE.Float32BufferAttribute([-0.25, 0, 0, 0.25, 0, 0, 0, -0.55, 0], 3));
  flagShape.computeVertexNormals();
  const flags = new THREE.InstancedMesh(flagShape, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), flagTotal);
  const flagColour = new THREE.Color();
  flagPlan.forEach(([x, y, z, angle], i) => {
    q.setFromEuler(new THREE.Euler(0, angle, 0));
    m.compose(new THREE.Vector3(x, y, z), q, one);
    flags.setMatrixAt(i, m);
    flags.setColorAt(i, flagColour.set(flagColours[i % flagColours.length]));
  });
  flags.frustumCulled = false;
  G.flags = flags;
  G.scene.add(flags);
}

function buildWorld() {
  buildSkyAndLight();
  buildGround();
  buildTreesAndFence();
  for (const place of G.config.places) {
    const entry = Object.assign({}, place, { facing: facingOf(place.turn) });
    if (place.kind === "stage") {
      entry.group = buildStage(entry); // in 40_concerts.js
      G.stages[place.id] = entry;
    } else {
      const builder = BUILDERS[place.shape] || buildStall;
      entry.group = builder(entry);
    }
    G.places.push(entry);
  }
  buildProps();
}

function updateWorld() {
  updateSkyAndLight();
  // Bulbs and light pools get stronger as it gets dark.
  G.bulbs.material.color.setScalar(lerp(0.75, 1.6, G.night));
  G.poolMaterial.opacity = G.night * 0.34;
  G.flags.material.color.setScalar(lerp(1, 0.4, G.night));
}

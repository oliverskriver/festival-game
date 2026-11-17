// ============================================================================
// 40_concerts.js — the three stages, who is playing right now, the light show
// and the music.
//
// The music is made by the computer from a few rules per style (tempo, drum
// pattern, chords). No recorded songs are used.
// ============================================================================

const STAGE_REACH = { sol: 27, skov: 20, klub: 12 }; // how far back the audience stands, in metres

function buildStage(place) {
  const g = startBuilding(place);
  const { w, d, h } = place;
  const isTent = place.shape === "roundtent";
  const platformHeight = isTent ? 1.0 : 1.5;
  place.platformHeight = platformHeight;
  let frontEdge; // how far in front of the middle the platform ends

  if (!isTent) {
    frontEdge = d / 2;
    g.add(box(w, platformHeight, d, "#1b1c21", 0, platformHeight / 2, 0));
    g.add(box(w, h - platformHeight, 0.6, place.colour, 0, platformHeight + (h - platformHeight) / 2, -d / 2 + 0.3));
    for (const side of [-1, 1]) {
      g.add(box(0.6, h - platformHeight, d * 0.55, place.colour, side * (w / 2 - 0.3), platformHeight + (h - platformHeight) / 2, -d * 0.22));
      g.add(box(0.8, h, 0.8, "#9aa0a8", side * (w / 2 + 0.2), h / 2, d / 2 - 0.4, { metalness: 0.6, roughness: 0.45 }));
      // Loudspeaker towers beside the stage.
      g.add(box(2.2, 6.5, 2.2, "#101114", side * (w / 2 + 2.6), 3.25 + 0.5, d / 2 - 1));
      g.add(box(2.6, 0.5, 2.6, "#2a2c33", side * (w / 2 + 2.6), 0.25, d / 2 - 1));
    }
    const roof = box(w + 3, 0.8, d + 2.5, "#16171b", 0, h + 0.4, 0.6);
    roof.rotation.x = 0.07;
    g.add(roof);
    g.add(box(w + 1.6, 0.5, 0.5, "#9aa0a8", 0, h - 0.6, d / 2 - 0.4, { metalness: 0.6, roughness: 0.45 }));
    const banner = sign(place.name.toUpperCase(), w * 0.62, 2.3, place.id === "sol" ? "#FFC607" : "#F7F3E3", "#111111");
    banner.position.set(0, h + 1.9, d / 2 + 1.0);
    g.add(banner);
    addCollider(place.x, place.z, w / 2 + 0.3, d / 2, turnToAngle(place.turn), place.id);
    for (const side of [-1, 1]) {
      const tower = localToWorld(place, side * (w / 2 + 2.6), 0, d / 2 - 1);
      addCollider(tower[0], tower[2], 1.3, 1.3, turnToAngle(place.turn), "pa");
    }
  } else {
    // Klub 3210: a round tent with a small stage in front of it.
    const radius = w / 2 - 1;
    frontEdge = radius + 4.2;
    g.add(cylinder(radius, radius, 3, place.colour, 0, 1.5, -1.5, 18));
    const tentRoof = new THREE.Mesh(new THREE.ConeGeometry(radius + 0.5, h - 3, 18), mat(place.colour));
    tentRoof.position.set(0, 3 + (h - 3) / 2, -1.5);
    tentRoof.castShadow = true;
    g.add(tentRoof);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const stripe = box(0.5, 2.95, 0.08, "#FFC607", Math.sin(a) * (radius + 0.03), 1.5, -1.5 + Math.cos(a) * (radius + 0.03));
      stripe.rotation.y = a;
      g.add(stripe);
    }
    g.add(box(10, platformHeight, 4.4, "#1b1c21", 0, platformHeight / 2, radius + 2));
    for (const side of [-1, 1]) g.add(box(0.35, 5.4, 0.35, "#9aa0a8", side * 5.2, 2.7, radius + 4, { metalness: 0.6, roughness: 0.45 }));
    g.add(box(10.8, 0.35, 0.35, "#9aa0a8", 0, 5.3, radius + 4, { metalness: 0.6, roughness: 0.45 }));
    const banner = sign("KLUB 3210", 7, 1.5, "#FFC607", "#111111");
    banner.position.set(0, 6.4, radius + 4.1);
    g.add(banner);
    addCollider(...localToWorld(place, 0, 0, -1.5).filter((v, i) => i !== 1), radius * 0.9, radius * 0.9, turnToAngle(place.turn), place.id);
    addCollider(...localToWorld(place, 0, 0, radius + 2).filter((v, i) => i !== 1), 5, 2.2, turnToAngle(place.turn), place.id);
  }

  // The big screen behind the band.
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 512; screenCanvas.height = 256;
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  const screenWidth = isTent ? 6 : w * 0.56, screenHeight = isTent ? 2.4 : (h - platformHeight) * 0.56;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(screenWidth, screenHeight), new THREE.MeshBasicMaterial({ map: screenTexture, fog: false }));
  screen.position.set(0, platformHeight + screenHeight / 2 + (isTent ? 1.3 : 1.4), isTent ? w / 2 - 1 + 0.25 : -d / 2 + 0.65);
  g.add(screen);
  place.screen = { canvas: screenCanvas, texture: screenTexture, tick: 0 };

  // The crowd barrier.
  const barrierZ = frontEdge + 3;
  g.add(box(isTent ? 11 : w + 2, 1.1, 0.15, "#c9ced6", 0, 0.55, barrierZ, { metalness: 0.5, roughness: 0.5 }));
  addCollider(...localToWorld(place, 0, 0, barrierZ).filter((v, i) => i !== 1), (isTent ? 11 : w + 2) / 2, 0.15, turnToAngle(place.turn), "barrier");

  // Where the audience stands: a zone that starts at the barrier and reaches back.
  const reach = STAGE_REACH[place.id] || 15;
  const front = localToWorld(place, 0, 0, barrierZ + 1);
  place.audience = { radius: reach, frontX: front[0], frontZ: front[2], x: front[0] + place.facing.x * reach, z: front[2] + place.facing.z * reach };

  // Lights: coloured lamps along the roof, sweeping beams and two real spotlights.
  const rigY = isTent ? 5.1 : h - 0.9, rigZ = isTent ? w / 2 - 1 + 4 : d / 2 - 0.4, rigWidth = isTent ? 9 : w;
  place.lamps = [];
  place.beams = [];
  const beamColours = ["#FF471C", "#FFC607", "#3374F2", "#F29BC4", "#5FD0E0", "#ffffff"];
  const beamCount = isTent ? 4 : 8;
  for (let i = 0; i < beamCount; i++) {
    const x = (i / (beamCount - 1) - 0.5) * rigWidth * 0.9;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), new THREE.MeshBasicMaterial({ color: beamColours[i % beamColours.length], fog: false }));
    lamp.position.set(x, rigY, rigZ);
    g.add(lamp);
    place.lamps.push(lamp);
    const length = isTent ? 16 : 34;
    const beam = new THREE.Mesh(new THREE.ConeGeometry(isTent ? 1.6 : 2.6, length, 10, 1, true), new THREE.MeshBasicMaterial({ color: beamColours[i % beamColours.length], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    beam.geometry.translate(0, -length / 2, 0);
    const pivot = new THREE.Group();
    pivot.position.set(x, rigY, rigZ);
    pivot.add(beam);
    g.add(pivot);
    place.beams.push({ pivot: pivot, beam: beam, offset: i * 1.7 });
  }
  place.spots = [];
  for (const side of [-1, 1]) {
    const spot = new THREE.SpotLight(0xffffff, 0, 70, 0.5, 0.6, 1.2);
    spot.position.set(side * rigWidth * 0.3, rigY, rigZ);
    g.add(spot);
    g.add(spot.target);
    spot.target.position.set(side * 4, 0, rigZ + 14);
    place.spots.push(spot);
  }
  // A warm wash on the stage itself so the band can be seen.
  const wash = new THREE.PointLight(0xfff0d0, 0, 22, 1.4);
  wash.position.set(0, platformHeight + 4.5, isTent ? w / 2 - 1 + 3 : d * 0.1);
  g.add(wash);
  place.wash = wash;

  place.band = [];
  place.bandGroup = new THREE.Group();
  g.add(place.bandGroup);
  place.act = null;
  place.nextAct = null;
  place.stageFront = isTent ? w / 2 - 1 + 2 : 0;
  G.lightPools.push([place.audience.frontX + place.facing.x * 6, place.audience.frontZ + place.facing.z * 6, reach * 1.6]);
  return g;
}

// Put a band on the stage for an act: a singer, two players and a drummer, or a DJ behind a desk.
function setBand(stage, act) {
  for (const member of stage.band) stage.bandGroup.remove(member.character.group);
  while (stage.bandGroup.children.length) stage.bandGroup.remove(stage.bandGroup.children[0]);
  stage.band = [];
  if (!act) return;
  const random = makeRandom(hashText(act.id + act.artist));
  const y = stage.platformHeight, z0 = stage.stageFront, deep = stage.shape === "roundtent" ? 1.2 : stage.d * 0.3;
  const spots = act.style === "dj" ? [[0, -0.2, "dj"], [2.2, -0.6, "hype"]] : [[0, deep * 0.75, "sing"], [-3.6, deep * 0.4, "guitar"], [3.6, deep * 0.4, "guitar"], [0, -deep * 0.5, "drums"]];
  if (stage.shape === "roundtent" && act.style !== "dj") spots.length = 3;
  for (const [x, z, role] of spots) {
    const character = buildCharacter(randomLook(random));
    character.group.position.set(x, y, z0 + z);
    if (role === "guitar") {
      const guitar = box(0.9, 0.16, 0.06, pick(["#D8342B", "#FFC607", "#F7F3E3", "#22252B"]), 0.05, 0.25, 0.2);
      guitar.rotation.z = 0.5;
      character.body.add(guitar);
    }
    if (role === "sing") character.armR.add(box(0.05, 0.05, 0.22, "#111111", 0, -0.6, 0.1));
    stage.bandGroup.add(character.group);
    stage.band.push({ character: character, role: role, baseX: x, baseZ: z0 + z, phase: random() * 6 });
  }
  if (act.style === "dj") {
    stage.bandGroup.add(box(3.4, 1.0, 1.0, "#101114", 0.8, y + 0.5, z0 + 0.8));
    stage.bandGroup.add(box(3.2, 0.06, 0.8, "#3374F2", 0.8, y + 1.03, z0 + 0.8));
  } else if (spots.length > 3) {
    const kitZ = z0 - deep * 0.5 + 0.8;
    stage.bandGroup.add(cylinder(0.45, 0.45, 0.5, "#D8342B", 0, y + 0.45, kitZ, 12));
    stage.bandGroup.add(cylinder(0.25, 0.25, 0.25, "#f3f3f3", -0.7, y + 0.8, kitZ, 10));
    stage.bandGroup.add(cylinder(0.25, 0.25, 0.25, "#f3f3f3", 0.7, y + 0.8, kitZ, 10));
    stage.bandGroup.add(cylinder(0.3, 0.3, 0.03, "#E8C36B", 1.1, y + 1.3, kitZ - 0.2, 12));
  }
}

function drawScreen(stage, beat) {
  const ctx = stage.screen.canvas.getContext("2d");
  const act = stage.act;
  if (!act) {
    ctx.fillStyle = "#0b0c10"; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#FFC607"; ctx.textAlign = "center"; ctx.font = "bold 34px " + FONT;
    if (stage.nextAct) {
      ctx.fillText("NEXT · " + clockText(stage.nextAct.start), 256, 100);
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 44px " + FONT;
      fitText(ctx, stage.nextAct.artist.toUpperCase(), 256, 165, 470, 44);
    } else {
      ctx.fillText("TAK FOR I AFTEN", 256, 140);
    }
  } else {
    const colours = ["#FF471C", "#FFC607", "#3374F2", "#4636AA", "#F29BC4"];
    const base = colours[(hashText(act.artist) + Math.floor(beat / 4)) % colours.length];
    ctx.fillStyle = beat % 2 === 0 ? base : "#0b0c10";
    ctx.fillRect(0, 0, 512, 256);
    // Bars that jump with the music.
    for (let i = 0; i < 16; i++) {
      const height = 30 + ((hashText(act.id) >> (i % 12)) % 7) * 12 + ((beat * (i + 3)) % 5) * 22;
      ctx.fillStyle = beat % 2 === 0 ? "rgba(0,0,0,0.28)" : base;
      ctx.fillRect(i * 32 + 4, 256 - height, 24, height);
    }
    ctx.fillStyle = beat % 2 === 0 ? "#0b0c10" : "#ffffff";
    ctx.textAlign = "center";
    fitText(ctx, act.artist.toUpperCase(), 256, 120, 480, 70);
  }
  stage.screen.texture.needsUpdate = true;
}

function fitText(ctx, text, x, y, maxWidth, size) {
  ctx.font = "bold " + size + "px " + FONT;
  while (ctx.measureText(text).width > maxWidth && size > 14) { size -= 3; ctx.font = "bold " + size + "px " + FONT; }
  ctx.fillText(text, x, y);
}

// Called every frame: start and stop acts on time, and run the light show.
function updateConcerts(dt) {
  const now = performance.now() / 1000;
  for (const id in G.stages) {
    const stage = G.stages[id];
    const acts = G.config.acts.filter((a) => a.stage === id);
    const act = acts.find((a) => a.start <= G.minute && G.minute < a.end) || null;
    stage.nextAct = acts.find((a) => a.start > G.minute) || null;
    if (act !== stage.act) {
      if (stage.act) {
        toast("Tak for i aften! " + stage.act.artist + " is done on " + stage.name + ".");
        playCheer(stage, 1.0);
        // The biggest names go out with fireworks.
        if (stage.act.pull >= 5 && G.night > 0.3) launchFireworks(stage.x, stage.z, 14);
      }
      stage.act = act;
      setBand(stage, act);
      if (act) { toast("LIVE NOW · " + stage.name + " · " + act.artist, "live"); playCheer(stage, 1.2); startMusic(stage, act); callTheCrowd(0.12 * act.pull); }
      else stopMusic(stage);
      drawScreen(stage, 0);
    }
    const live = !!act;
    const tempo = live ? stage.music.bpm : 100;
    const beat = Math.floor((now * tempo) / 60);
    if (live && beat !== stage.lastBeat) { stage.lastBeat = beat; drawScreen(stage, beat); }
    if (!live && Math.floor(now / 5) !== stage.lastIdleDraw) { stage.lastIdleDraw = Math.floor(now / 5); drawScreen(stage, 0); }
    // Light show: stronger at night, off when nobody plays.
    const show = live ? lerp(0.35, 1, G.night) : 0;
    const pulse = live ? 0.6 + 0.4 * Math.pow(1 - ((now * tempo) / 60) % 1, 2) : 0;
    stage.beams.forEach((b, i) => {
      b.beam.material.opacity = show * 0.16 * pulse * (0.5 + G.night * 0.5);
      b.pivot.rotation.x = 0.75 + Math.sin(now * 0.8 + b.offset) * 0.35;
      b.pivot.rotation.z = Math.sin(now * 0.6 + b.offset * 1.3) * 0.5;
    });
    stage.lamps.forEach((lamp, i) => lamp.material.color.setHSL(((beat * 0.13 + i * 0.17) % 1), 0.9, live ? 0.35 + 0.3 * pulse : 0.08));
    stage.spots.forEach((spot, i) => {
      spot.intensity = show * 900 * pulse;
      spot.color.setHSL((beat * 0.11 + i * 0.4) % 1, 0.8, 0.6);
      spot.target.position.x = Math.sin(now * 0.7 + i * 2) * 9;
    });
    stage.wash.intensity = live ? lerp(25, 90, G.night) : 0;
    // The band moves to the music.
    for (const member of stage.band) {
      member.phase += dt;
      const c = member.character;
      if (member.role === "drums") { animateCharacter(c, "idle", dt); c.armL.rotation.x = -1.2 + Math.sin(now * tempo / 60 * Math.PI * 2) * 0.5; c.armR.rotation.x = -1.2 - Math.sin(now * tempo / 60 * Math.PI * 2) * 0.5; }
      else if (member.role === "dj") { animateCharacter(c, "idle", dt); c.armR.rotation.x = -2.6 + Math.sin(now * 3) * 0.3; c.armL.rotation.x = -0.9; c.body.position.y = 0.9 + Math.abs(Math.sin(now * tempo / 60 * Math.PI)) * 0.06; }
      else if (member.role === "sing") { animateCharacter(c, "idle", dt); c.armR.rotation.x = -1.9; c.armL.rotation.x = -0.4 + Math.sin(now * 2) * 0.6; c.group.position.x = member.baseX + Math.sin(member.phase * 0.5) * 2.2; c.body.position.y = 0.9 + Math.abs(Math.sin(now * tempo / 60 * Math.PI)) * 0.05; }
      else { animateCharacter(c, member.role === "hype" ? "dance" : "idle", dt); if (member.role === "guitar") { c.armR.rotation.x = -0.9 + Math.sin(now * 12) * 0.15; c.armL.rotation.x = -1.2; c.body.rotation.y = Math.sin(member.phase) * 0.3; } }
    }
  }
}

// When an act starts, a share of the guests drop what they are doing and decide again where to go.
function callTheCrowd(share) {
  for (const person of crowd.people) if (person.state !== "watch" && rand() < share) chooseCrowdTarget(person);
}

// Which stage's audience is the player standing in right now (or null)?
function stageAtPlayer() {
  const p = G.player;
  for (const id in G.stages) {
    const stage = G.stages[id], zone = stage.audience;
    const ahead = (p.x - zone.frontX) * stage.facing.x + (p.z - zone.frontZ) * stage.facing.z;
    const aside = Math.abs((p.x - zone.frontX) * stage.facing.z - (p.z - zone.frontZ) * stage.facing.x);
    if (ahead > -3 && ahead < zone.radius * 2 + 4 && aside < zone.radius * 1.1) return stage;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Music made by the computer. Each style is a tempo, a drum pattern over 16
// steps, a bass pattern and four chords.
// ---------------------------------------------------------------------------

const STYLES = {
  pop: { bpm: 118, kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", bass: "x..x..x.x..x..x.", chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], lead: true, wave: "triangle" },
  rock: { bpm: 138, kick: "x.....x.x.......", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "x.x.x.x.x.x.x.x.", chords: [[0, 7, 12], [5, 12, 17], [7, 14, 19], [3, 10, 15]], lead: false, wave: "sawtooth" },
  hiphop: { bpm: 92, kick: "x......x..x.....", snare: "....x.......x...", hat: "x.xxx.x.x.xxx.xx", bass: "x......x..x.....", chords: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 10, 14]], lead: false, wave: "sine" },
  dj: { bpm: 126, kick: "x...x...x...x...", snare: "....x.......x...", hat: "..x...x...x...x.", bass: "..x...x...x...x.", chords: [[0, 3, 7, 10], [0, 3, 7, 10], [5, 8, 12, 15], [7, 10, 14, 17]], lead: true, wave: "sawtooth" },
  folk: { bpm: 104, kick: "x.......x.......", snare: "....x.......x...", hat: "x...x...x...x...", bass: "x.......x...x...", chords: [[0, 4, 7], [5, 9, 12], [0, 4, 7], [7, 11, 14]], lead: true, wave: "triangle" },
  soul: { bpm: 96, kick: "x.....x...x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", bass: "x..x....x.x.....", chords: [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]], lead: false, wave: "sine" },
};

const audio = { ctx: null, master: null, noise: null, on: true };

function initAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.9;
    const squash = audio.ctx.createDynamicsCompressor();
    audio.master.connect(squash);
    squash.connect(audio.ctx.destination);
    // One second of hiss, reused for drums, cheering and crowd murmur.
    const buffer = audio.ctx.createBuffer(1, audio.ctx.sampleRate, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    audio.noise = buffer;
    // The murmur of people talking: filtered hiss whose loudness follows how many people are near.
    const murmur = audio.ctx.createBufferSource();
    murmur.buffer = buffer; murmur.loop = true;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = "bandpass"; filter.frequency.value = 520; filter.Q.value = 0.6;
    audio.murmurGain = audio.ctx.createGain();
    audio.murmurGain.gain.value = 0;
    murmur.connect(filter); filter.connect(audio.murmurGain); audio.murmurGain.connect(audio.master);
    murmur.start();
  } catch (error) {
    console.warn("No sound available", error);
    audio.ctx = null;
  }
}

function startMusic(stage, act) {
  const style = STYLES[act.style] || STYLES.pop;
  const seed = hashText(act.artist);
  stage.music = { bpm: style.bpm + (seed % 9) - 4, style: style, root: 40 + (seed % 10), step: 0, nextTime: 0, on: true, leadSeed: seed };
  if (!audio.ctx) return;
  if (!stage.bus) {
    stage.bus = audio.ctx.createGain();
    stage.filter = audio.ctx.createBiquadFilter();
    stage.filter.type = "lowpass";
    stage.pan = audio.ctx.createStereoPanner ? audio.ctx.createStereoPanner() : audio.ctx.createGain();
    stage.bus.connect(stage.filter); stage.filter.connect(stage.pan); stage.pan.connect(audio.master);
    stage.bus.gain.value = 0;
  }
  stage.music.nextTime = audio.ctx.currentTime + 0.1;
}

function stopMusic(stage) {
  if (stage.music) stage.music.on = false;
}

const noteHz = (note) => 440 * Math.pow(2, (note - 69) / 12);

function tone(stage, time, note, length, wave, volume, slide) {
  const ctx = audio.ctx;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(noteHz(note), time);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, time + length);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
  osc.connect(gain); gain.connect(stage.bus);
  osc.start(time); osc.stop(time + length + 0.05);
}

function hiss(target, time, length, volume, frequency, type = "highpass") {
  const ctx = audio.ctx;
  const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  source.buffer = audio.noise;
  filter.type = type; filter.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
  source.connect(filter); filter.connect(gain); gain.connect(target);
  source.start(time, Math.random() * 0.5, length + 0.05);
}

// Write the next few notes of every playing stage into the sound card's diary.
function updateMusic() {
  if (!audio.ctx) return;
  const ctx = audio.ctx, p = G.player;
  let nearby = 0;
  for (const person of crowd.people) if (!person.hidden && Math.abs(person.x - p.x) < 14 && Math.abs(person.z - p.z) < 14) nearby++;
  audio.murmurGain.gain.setTargetAtTime(audio.on && !G.paused ? clamp(nearby / 60, 0.02, 0.5) * 0.5 : 0, ctx.currentTime, 0.4);
  for (const id in G.stages) {
    const stage = G.stages[id], music = stage.music;
    if (!stage.bus) continue;
    // Loudness, muffling and left/right follow where you stand.
    const distance = dist2d(p.x, p.z, stage.audience.frontX, stage.audience.frontZ);
    const near = clamp(1 - distance / 170, 0, 1);
    const playing = music && music.on && audio.on && !G.paused;
    stage.bus.gain.setTargetAtTime(playing ? near * near * 0.55 : 0, ctx.currentTime, 0.25);
    stage.filter.frequency.setTargetAtTime(300 + near * near * near * 14000, ctx.currentTime, 0.25);
    if (stage.pan.pan) {
      const dx = stage.x - p.x, dz = stage.z - p.z, d = Math.hypot(dx, dz) || 1;
      const right = (dx / d) * -Math.cos(G.cam.yaw) + (dz / d) * Math.sin(G.cam.yaw);
      stage.pan.pan.setTargetAtTime(clamp(right * 0.75, -1, 1) * clamp(distance / 40, 0, 1), ctx.currentTime, 0.2);
    }
    if (!playing) { if (music) music.nextTime = ctx.currentTime + 0.1; continue; }
    const style = music.style, stepLength = 60 / music.bpm / 4;
    if (music.nextTime < ctx.currentTime) music.nextTime = ctx.currentTime + 0.05;
    while (music.nextTime < ctx.currentTime + 0.25) {
      const step = music.step % 16, bar = Math.floor(music.step / 16), time = music.nextTime;
      const chord = style.chords[bar % 4];
      const fill = bar % 8 === 7 && step >= 12; // a little drum fill every eighth bar
      if (style.kick[step] === "x") tone(stage, time, 36, 0.28, "sine", 0.9, 38);
      if (style.snare[step] === "x" || fill) { hiss(stage.bus, time, 0.16, 0.45, 1500, "bandpass"); tone(stage, time, 50, 0.1, "triangle", 0.25); }
      if (style.hat[step] === "x") hiss(stage.bus, time, 0.04, 0.16, 7000);
      if (style.bass[step] === "x") tone(stage, time, music.root + chord[0] - 12, stepLength * 1.8, style.wave === "sine" ? "sine" : "square", style.wave === "sine" ? 0.7 : 0.28);
      if (step === 0 || (step === 8 && style.wave !== "sine")) for (const interval of chord) tone(stage, time, music.root + 12 + interval, stepLength * (step === 0 ? 7.5 : 3.5), style.wave, 0.07);
      if (style.lead && (music.leadSeed >> (music.step % 23)) % 3 === 0 && step % 2 === 0) {
        const pickNote = chord[(music.leadSeed + music.step * 7) % chord.length];
        tone(stage, time, music.root + 24 + pickNote, stepLength * 1.7, "triangle", 0.12);
      }
      music.step++;
      music.nextTime += stepLength;
    }
  }
}

// A cheering crowd: a swell of hiss.
function playCheer(stage, strength = 1) {
  if (!audio.ctx || !audio.on) return;
  const distance = dist2d(G.player.x, G.player.z, stage.audience.frontX, stage.audience.frontZ);
  const volume = clamp(1 - distance / 150, 0, 1) * 0.5 * strength;
  if (volume < 0.02) return;
  const ctx = audio.ctx, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  source.buffer = audio.noise; source.loop = true;
  filter.type = "bandpass"; filter.frequency.value = 1100; filter.Q.value = 0.5;
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
  source.connect(filter); filter.connect(gain); gain.connect(audio.master);
  source.start(t); source.stop(t + 3.6);
}

// Short blips for buying something, finishing an objective, being caught.
function blip(kind) {
  if (!audio.ctx || !audio.on) return;
  const ctx = audio.ctx, t = ctx.currentTime;
  const notes = kind === "good" ? [72, 76, 79, 84] : kind === "bad" ? [52, 46] : kind === "coin" ? [88, 93] : [76];
  notes.forEach((note, i) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = kind === "bad" ? "sawtooth" : "triangle";
    osc.frequency.value = noteHz(note);
    gain.gain.setValueAtTime(0.0001, t + i * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.18, t + i * 0.09 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.22);
    osc.connect(gain); gain.connect(audio.master);
    osc.start(t + i * 0.09); osc.stop(t + i * 0.09 + 0.3);
  });
}

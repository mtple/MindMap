/*
 * Mind Map: a first-person journey through Carl Jung's model of the psyche.
 * Originally a Java text adventure by Matt Lee, rebuilt in three.js.
 *
 * There is no winning. You wander the five realms, meet the archetypes,
 * integrate the complexes that roam the unconscious and write what you find
 * in your Red Book.
 */
import * as THREE from 'three';
import { REALMS, TALKS, ARCHETYPES, SYMBOLS, MEMORIES, PAGES, QUIT_MESSAGE } from './data.js';
import { buildWorld, isWalkable, realmAt, randomPointInRealm } from './world.js';
import {
  Enemy, ShadowSelf, Particles, Projectiles, buildNPC, buildMemoryOrb, buildMirror,
  buildMonolith, buildSymbol, buildScarab,
} from './entities.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';

// ---------------------------------------------------------------------------
// Core setup

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 900);
camera.rotation.order = 'YXZ';

const world = buildWorld(scene);
const ui = new UI();
const audio = new Sound();
ui.onType = () => audio.talk();
const particles = new Particles(scene);

// A small orb of light held in front of you, which flares when you cast
scene.add(camera);
const hand = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.016, 1),
  new THREE.MeshBasicMaterial({ color: 0xcfe8ff, fog: false }),
);
const handHalo = new THREE.Mesh(
  new THREE.SphereGeometry(0.034, 16, 12),
  new THREE.MeshBasicMaterial({ color: 0x6ab8ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
);
hand.add(handHalo);
hand.position.set(0.3, -0.24, -0.7);
hand.visible = false;
camera.add(hand);
let handGlow = 0;
const projectiles = new Projectiles(scene);

const SPAWN = new THREE.Vector3(0, 0, 9);
const TOTAL_PAGES = Object.keys(PAGES).length + SYMBOLS.length + MEMORIES.length + Object.keys(ARCHETYPES).length;

const player = {
  pos: SPAWN.clone(), vel: new THREE.Vector3(), vy: 0, yaw: 0, pitch: 0, onGround: true,
  hp: 100, maxHp: 100, en: 60, maxEn: 60, level: 1, xp: 0, xpNext: 60,
  castCd: 0, novaCd: 0, regenDelay: 0, dead: false, bob: 0, shake: 0,
};

const state = {
  mode: 'start', // start | playing | paused | journal | dead
  pages: [],
  pageIds: new Set(),
  talks: {},
  mirrorsBroken: 0,
  integrated: 0,
  currentRealm: null,
  startTime: 0,
};

const enemies = [];
const interactables = [];
const pickups = [];
const mirrors = [];
const npcs = [];
const obstacles = world.obstacles;
const shards = [];

// ---------------------------------------------------------------------------
// The Red Book

function addPage(id, title, text) {
  if (state.pageIds.has(id)) return false;
  state.pageIds.add(id);
  state.pages.push({ id, title, text });
  ui.pageCount(state.pages.length, TOTAL_PAGES);
  ui.toast(`New page in the Red Book: ${title}`, 'page');
  audio.pickup();
  addShard();
  return true;
}
const addNamedPage = (id) => addPage(id, PAGES[id].title, PAGES[id].text);

// Every page adds a shard of light to the mandala turning around the Self.
function addShard() {
  const i = shards.length;
  const hue = (i * 0.137) % 1;
  const m = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 0.8, 0.7) }),
  );
  m.userData = { ring: i % 3, phase: (i / 3) * 1.3 };
  scene.add(m);
  shards.push(m);
}

// ---------------------------------------------------------------------------
// Populate the psyche

function faceToward(obj, x, z) {
  obj.rotation.y = Math.atan2(-(x - obj.position.x), -(z - obj.position.z));
}

function nextTalk(id) {
  const list = TALKS[id];
  const i = state.talks[id] || 0;
  state.talks[id] = i + 1;
  return list[i % list.length];
}

function addNPC(id, opts, realmId, dx, dz, onFirst) {
  const r = REALMS[realmId];
  const mesh = buildNPC(opts);
  mesh.position.set(r.center[0] + dx, 0, r.center[1] + dz);
  scene.add(mesh);
  npcs.push(mesh);
  obstacles.push({ x: mesh.position.x, z: mesh.position.z, r: 0.7 });
  interactables.push({
    pos: mesh.position, radius: 3.5,
    label: () => `Speak with ${opts.name}`,
    action: () => {
      const first = !state.talks[id];
      ui.dialogue(nextTalk(id), () => { if (first) onFirst(); });
    },
    marker: '#ffe9a8',
  });
}

// --- Self
addNPC('philemon', { robe: 0x3a4a8a, glow: 0x9fd8ff, crown: true, name: 'Philemon', nameColor: '#cfe6ff' }, 'self', 5, 3, () => addNamedPage('philemon'));
interactables.push({
  pos: new THREE.Vector3(REALMS.self.center[0], 0, REALMS.self.center[1]), radius: 4.2,
  label: () => 'Contemplate the Self',
  action: () => {
    const n = state.pages.length;
    const text =
      n < 5 ? 'The circle has barely been sketched. The centre is there, waiting for you to look at it.'
      : n < 12 ? 'More of the mandala shows now, and light and dark both have a place in it. Neither one is the centre.'
      : n < 20 ? 'The shards turn around you like planets. Each one is something you once refused to see.'
      : 'The mandala is rich and full, and still it is unfinished. It always will be. That was the point.';
    ui.dialogue([['The Self', text]], () => addNamedPage('mandala'));
  },
  marker: '#ffc860',
});

// --- Ego
addNPC('persona', { robe: 0xe8e8f0, glow: 0xffffff, mask: true, name: 'The Persona', nameColor: '#ffffff' }, 'ego', 0, 0, () => addNamedPage('persona'));
for (let i = 0; i < 4; i++) {
  const r = REALMS.ego;
  // Offset so no mirror blocks a bridge
  const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
  const m = buildMirror();
  m.position.set(r.center[0] + Math.cos(a) * 11, 0, r.center[1] + Math.sin(a) * 11);
  faceToward(m, r.center[0], r.center[1]);
  scene.add(m);
  obstacles.push({ x: m.position.x, z: m.position.z, r: 0.9 });
  mirrors.push({ mesh: m, center: m.position.clone().setY(2.1), broken: false });
}

// --- Personal Subconscious
addNPC('anima', { robe: 0x7a2a8a, glow: 0xff9fe0, name: 'The Anima', nameColor: '#ffc0f0' }, 'personal', 0, 14, () => addNamedPage('anima'));
MEMORIES.forEach((mem, i) => {
  const r = REALMS.personal;
  const a = (i / MEMORIES.length) * Math.PI * 2 + 0.6;
  const mesh = buildMemoryOrb();
  mesh.position.set(r.center[0] + Math.cos(a) * 16, 1.4, r.center[1] + Math.sin(a) * 16);
  scene.add(mesh);
  pickups.push({ mesh, baseY: 1.4, color: '#ff9fe0', onPickup: () => addPage('memory' + i, mem.title, mem.text) });
});
for (let i = 0; i < 7; i++) {
  const [x, z] = randomPointInRealm(REALMS.personal, 6);
  enemies.push(new Enemy(scene, 'memory', 'personal', x, z));
}

// --- Shadow
for (let i = 0; i < 6; i++) {
  const [x, z] = randomPointInRealm(REALMS.shadow, 6);
  enemies.push(new Enemy(scene, 'wisp', 'shadow', x, z));
}
const shadowSelf = new ShadowSelf(scene, REALMS.shadow.center[0], REALMS.shadow.center[1] - 4);
interactables.push({
  pos: shadowSelf.pos, radius: 5.5,
  enabled: () => shadowSelf.mood !== 'angry' && !player.dead,
  label: () => shadowSelf.mood === 'companion' ? 'Talk with your Shadow' : shadowSelf.met ? 'Accept your Shadow' : 'Face your Shadow',
  action: () => {
    if (shadowSelf.mood === 'companion') {
      ui.dialogue(nextTalk('shadowCompanion'));
    } else if (!shadowSelf.met) {
      ui.dialogue(TALKS.shadowMeet, () => { shadowSelf.met = true; addNamedPage('shadowMet'); });
    } else {
      ui.dialogue(TALKS.shadowEmbrace, () => {
        shadowSelf.embrace();
        particles.burst(shadowSelf.center, 0x8a7cff, 40, 8, 1.4);
        audio.activate();
        addNamedPage('shadowEmbraced');
        gainXP(150);
      });
    }
  },
  marker: '#ff4a4a',
});

// --- Collective Unconscious
Object.entries(ARCHETYPES).forEach(([id, arch], i) => {
  const r = REALMS.collective;
  const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
  const mesh = buildMonolith(arch.symbol, arch.color);
  mesh.position.set(r.center[0] + Math.cos(a) * 19, 0, r.center[1] + Math.sin(a) * 19);
  faceToward(mesh, r.center[0], r.center[1]);
  scene.add(mesh);
  obstacles.push({ x: mesh.position.x, z: mesh.position.z, r: 1.8 });
  const mono = { awake: false };
  interactables.push({
    pos: mesh.position, radius: 4.5,
    label: () => mono.awake ? `Listen to ${arch.name}` : `Awaken ${arch.name}`,
    action: () => {
      if (!mono.awake) {
        mono.awake = true;
        mesh.userData.beam.visible = true;
        mesh.userData.light.intensity = 40;
        mesh.userData.face.emissiveIntensity = 1.2;
        audio.activate();
        particles.burst(mesh.position.clone().setY(5), new THREE.Color(arch.color).getHex(), 30, 7, 1.2);
      }
      ui.dialogue([[arch.name, arch.line]], () => addPage('arch_' + id, arch.name, arch.line));
    },
    marker: arch.color,
  });
});
for (let i = 0; i < 5; i++) {
  const [x, z] = randomPointInRealm(REALMS.collective, 8);
  enemies.push(new Enemy(scene, 'complex', 'collective', x, z));
}

// --- Dream symbols
for (const sym of SYMBOLS) {
  const r = REALMS[sym.realm];
  const [frac, ang] = sym.at;
  const mesh = buildSymbol(sym.glyph, sym.color);
  mesh.position.set(r.center[0] + Math.cos(ang) * r.radius * frac, 1.6, r.center[1] + Math.sin(ang) * r.radius * frac);
  scene.add(mesh);
  pickups.push({ mesh, baseY: 1.6, color: '#' + sym.color.toString(16).padStart(6, '0'), onPickup: () => addPage('sym_' + sym.id, sym.title, sym.text) });
}

// --- Synchronicity: a golden scarab that appears when it wants to
const scarab = { mesh: buildScarab(), active: false, timer: 50, life: 0, vel: new THREE.Vector3(), caught: 0 };
scarab.mesh.visible = false;
scene.add(scarab.mesh);

function updateScarab(dt, t) {
  const s = scarab;
  if (!s.active) {
    s.timer -= dt;
    if (s.timer <= 0 && !player.dead) {
      // Appear somewhere near the dreamer
      for (let k = 0; k < 20; k++) {
        const a = Math.random() * Math.PI * 2, d = 7 + Math.random() * 6;
        const x = player.pos.x + Math.cos(a) * d, z = player.pos.z + Math.sin(a) * d;
        if (isWalkable(x, z, 1)) {
          s.mesh.position.set(x, 1.6, z);
          s.active = true; s.life = 30; s.mesh.visible = true;
          ui.toast('Something golden glints in the air nearby…', 'gold');
          audio.arpeggio([1319, 1568, 1976], 0.06, { vol: 0.06 });
          break;
        }
      }
      if (!s.active) s.timer = 5;
    }
    return;
  }
  s.life -= dt;
  // Erratic, playful flight that stays above walkable ground
  s.vel.x += (Math.random() - 0.5) * dt * 30;
  s.vel.z += (Math.random() - 0.5) * dt * 30;
  s.vel.multiplyScalar(Math.max(0, 1 - dt * 1.5));
  const nx = s.mesh.position.x + s.vel.x * dt, nz = s.mesh.position.z + s.vel.z * dt;
  if (isWalkable(nx, nz, 1)) { s.mesh.position.x = nx; s.mesh.position.z = nz; } else s.vel.multiplyScalar(-1);
  s.mesh.position.y = 1.4 + Math.sin(t * 3) * 0.4;
  s.mesh.rotation.y = Math.atan2(-s.vel.x, -s.vel.z);
  const flap = Math.sin(t * 40) * 0.6;
  s.mesh.userData.wings[0].rotation.z = flap;
  s.mesh.userData.wings[1].rotation.z = -flap;

  const d = Math.hypot(player.pos.x - s.mesh.position.x, player.pos.z - s.mesh.position.z);
  if (d < 1.4) {
    s.caught++;
    particles.burst(s.mesh.position, 0xffc040, 30, 5, 1.2);
    if (!addNamedPage('scarab')) { ui.toast('The scarab again. Of course.', 'gold'); audio.pickup(); }
    gainXP(40);
    despawnScarab();
  } else if (s.life <= 0) {
    despawnScarab();
  }
}
function despawnScarab() {
  scarab.active = false;
  scarab.mesh.visible = false;
  scarab.timer = 70 + Math.random() * 80;
}

// ---------------------------------------------------------------------------
// Player actions

function gainXP(n) {
  player.xp += n;
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level++;
    player.xpNext = Math.round(50 * Math.pow(player.level, 1.5) + 10);
    player.maxHp += 20;
    player.maxEn += 10;
    player.hp = player.maxHp;
    player.en = player.maxEn;
    ui.toast(`Consciousness deepens: level ${player.level}`, 'level');
    audio.levelUp();
    particles.burst(player.pos.clone().setY(1), 0xffe9a8, 40, 6, 1.2);
  }
}

const tmpV = new THREE.Vector3();
function aimDir() { return camera.getWorldDirection(new THREE.Vector3()); }

function castInsight() {
  if (player.castCd > 0 || player.en < 6) { if (player.en < 6) audio.denied(); return; }
  player.castCd = 0.22;
  player.en -= 6;
  const dir = aimDir();
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  const origin = camera.position.clone().addScaledVector(dir, 0.7).addScaledVector(right, 0.28).add(tmpV.set(0, -0.22, 0));
  const target = camera.position.clone().addScaledVector(dir, 40);
  projectiles.spawn(origin, target.sub(origin), { speed: 42, damage: 16 + 6 * (player.level - 1), owner: 'player', color: 0x9fd8ff, size: 0.2 });
  audio.cast();
  handGlow = 1;
}

function releaseRadiance() {
  if (player.novaCd > 0 || player.en < 30) { audio.denied(); return; }
  player.novaCd = 3;
  player.en -= 30;
  const dmg = 30 + 10 * (player.level - 1);
  const c = player.pos.clone().setY(1);
  particles.ring(c, 0xffe9a8, 7.5);
  particles.burst(c, 0xffe9a8, 30, 9, 0.8);
  audio.nova();
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = e.pos.distanceTo(player.pos);
    if (d < 7.5 + e.def.radius) hitEnemy(e, dmg, tmpV.subVectors(e.pos, player.pos).setY(0).normalize());
  }
  if (shadowSelf.pos.distanceTo(player.pos) < 8) hitShadow();
  for (const m of mirrors) if (!m.broken && m.center.distanceTo(c) < 8) breakMirror(m);
}

function hitEnemy(e, dmg, dir) {
  const integrated = e.hit(dmg, dir);
  particles.burst(e.center, e.def.color, 6, 4, 0.4);
  audio.hit();
  if (integrated) {
    // Complexes are not destroyed: they dissolve into light and return to the Self
    state.integrated++;
    particles.burst(e.center, 0xffffff, 24, 6, 1.1);
    particles.burst(e.center, e.def.color, 16, 4, 1.0);
    audio.enemyDie();
    gainXP(e.def.xp);
    if (state.integrated === 1) addNamedPage('complex');
  }
}

function hitShadow() {
  if (shadowSelf.mood === 'companion') return;
  const wasCalm = shadowSelf.mood !== 'angry';
  shadowSelf.hit();
  particles.burst(shadowSelf.center, 0xff1a1a, 10, 5, 0.6);
  audio.hit();
  if (wasCalm) {
    ui.toast('Your Shadow grows stronger with every blow.', 'warn');
    ui.dialogue(TALKS.shadowAngry);
  }
}

function breakMirror(m) {
  m.broken = true;
  for (const g of m.mesh.userData.glass) g.visible = false;
  particles.burst(m.center, 0xcfe8ff, 40, 7, 1.2);
  audio.shatter();
  state.mirrorsBroken++;
  gainXP(10);
  if (state.mirrorsBroken === mirrors.length) {
    addNamedPage('mirrors');
  } else {
    ui.toast(`A mirror shatters (${state.mirrorsBroken}/${mirrors.length})`);
  }
}

function damagePlayer(dmg) {
  if (player.dead || state.mode !== 'playing' || ui.inDialogue) return;
  player.hp -= dmg;
  player.regenDelay = 4;
  player.shake = 0.25;
  ui.hurt();
  audio.hurt();
  if (player.hp <= 0) wake();
}

// Being overwhelmed doesn't end anything: you just wake at the centre.
function wake() {
  player.hp = 0;
  player.dead = true;
  state.mode = 'dead';
  document.exitPointerLock?.();
  ui.overlay(`
    <div class="panel">
      <h1 class="small">You wake.</h1>
      <p>The unconscious overwhelmed you for a moment and the dream let go of you.</p>
      <p class="muted">Dreams are rarely gentle, but they are always trying to tell you something.</p>
      <button id="respawn">Return to the dream</button>
    </div>`);
  document.getElementById('respawn').onclick = (ev) => { ev.stopPropagation(); respawn(); };
}

function respawn() {
  player.dead = false;
  player.hp = player.maxHp;
  player.en = player.maxEn;
  player.pos.copy(SPAWN);
  player.vel.set(0, 0, 0);
  player.yaw = 0; player.pitch = 0;
  if (shadowSelf.mood === 'angry') shadowSelf.calm();
  for (const p of projectiles.list) if (p.owner === 'enemy') p.dead = true;
  addNamedPage('waking');
  resume();
}

// ---------------------------------------------------------------------------
// Input

const keys = {};
let pointerLocked = false;
let mouseDown = false;

function lock() {
  try {
    const r = canvas.requestPointerLock();
    if (r && r.catch) r.catch(() => {});
  } catch { /* pointer lock unavailable: fall back to drag-to-look */ }
}

function resume() {
  ui.overlay(null);
  ui.showHud(true);
  state.mode = 'playing';
  lock();
}

function pause() {
  state.mode = 'paused';
  mouseDown = false;
  ui.overlay(`
    <div class="panel">
      <h1 class="small">Paused</h1>
      ${controlsHtml()}
      <button id="resume">Return to the psyche</button>
      <p class="quit">“${QUIT_MESSAGE}”</p>
    </div>`);
  document.getElementById('resume').onclick = (ev) => { ev.stopPropagation(); resume(); };
}

function toggleJournal(open = !ui.journalOpen) {
  if (open) {
    if (state.mode !== 'playing' || ui.inDialogue) return;
    state.mode = 'journal';
    mouseDown = false;
    ui.journal(true, state.pages, TOTAL_PAGES);
    document.exitPointerLock?.();
  } else {
    ui.journal(false);
    if (state.mode === 'journal') resume();
  }
}

function controlsHtml() {
  return `
    <div class="controls">
      <div><kbd>W A S D</kbd> walk</div>
      <div><kbd>Mouse</kbd> look</div>
      <div><kbd>Shift</kbd> run</div>
      <div><kbd>Space</kbd> jump</div>
      <div><kbd>Click</kbd> cast Insight</div>
      <div><kbd>F</kbd> / <kbd>Right-click</kbd> Radiance</div>
      <div><kbd>E</kbd> speak / interact</div>
      <div><kbd>J</kbd> Red Book</div>
      <div><kbd>M</kbd> mute</div>
      <div><kbd>Esc</kbd> pause</div>
    </div>`;
}

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
  if (!pointerLocked && state.mode === 'playing') pause();
});

document.addEventListener('mousemove', (e) => {
  if (state.mode !== 'playing') return;
  if (!pointerLocked && !(e.buttons & 1)) return;
  // Chrome sometimes reports a huge jump right after the pointer locks
  if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return;
  const k = pointerLocked ? 0.0022 : 0.005;
  player.yaw -= e.movementX * k;
  player.pitch -= e.movementY * k;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
});

canvas.addEventListener('mousedown', (e) => {
  if (state.mode !== 'playing') return;
  if (!pointerLocked) lock();
  if (ui.inDialogue) { ui.advance(); return; }
  if (e.button === 0) { mouseDown = true; castInsight(); }
  if (e.button === 2) releaseRadiance();
});
document.addEventListener('mouseup', (e) => { if (e.button === 0) mouseDown = false; });
document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Tab') e.preventDefault();
  if (e.code === 'KeyJ' || e.code === 'Tab') { toggleJournal(); return; }
  if (e.code === 'Escape' && state.mode === 'journal') { toggleJournal(false); return; }
  if (e.code === 'KeyM') ui.toast(audio.toggleMute() ? 'Sound muted' : 'Sound on');
  if (state.mode !== 'playing') return;
  if (e.code === 'KeyE' || (e.code === 'Space' && ui.inDialogue)) {
    if (ui.inDialogue) ui.advance();
    else if (currentInteractable) currentInteractable.action();
  }
  if (e.code === 'KeyF' && !ui.inDialogue) releaseRadiance();
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; });

document.getElementById('overlay').addEventListener('click', () => {
  if (state.mode === 'start') {
    audio.init();
    state.startTime = performance.now();
    hand.visible = true;
    resume();
    setTimeout(() => ui.toast('Philemon is waiting beside the golden crystal. Press E to speak.'), 1500);
  } else if (state.mode === 'paused') {
    resume();
  }
});
document.getElementById('journal-close').addEventListener('click', () => toggleJournal(false));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Simulation

function canStand(x, z) {
  if (!isWalkable(x, z, 0.5)) return false;
  for (const o of obstacles) if (Math.hypot(x - o.x, z - o.z) < o.r + 0.4) return false;
  return true;
}

function updatePlayer(dt) {
  const frozen = ui.inDialogue || player.dead;
  const fwd = frozen ? 0 : (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const str = frozen ? 0 : (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  const running = keys.ShiftLeft || keys.ShiftRight;
  const speed = running ? 11 : 6.5;
  const forward = tmpV.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const wish = new THREE.Vector3(
    forward.x * fwd + Math.cos(player.yaw) * str, 0,
    forward.z * fwd - Math.sin(player.yaw) * str,
  );
  if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);
  const k = Math.min(1, dt * (player.onGround ? 12 : 3));
  player.vel.x += (wish.x - player.vel.x) * k;
  player.vel.z += (wish.z - player.vel.z) * k;

  const nx = player.pos.x + player.vel.x * dt, nz = player.pos.z + player.vel.z * dt;
  if (canStand(nx, nz)) { player.pos.x = nx; player.pos.z = nz; }
  else if (canStand(nx, player.pos.z)) { player.pos.x = nx; player.vel.z = 0; }
  else if (canStand(player.pos.x, nz)) { player.pos.z = nz; player.vel.x = 0; }
  else { player.vel.x = 0; player.vel.z = 0; }

  if (!frozen && keys.Space && player.onGround) { player.vy = 7; player.onGround = false; }
  player.vy -= 20 * dt;
  player.pos.y += player.vy * dt;
  if (player.pos.y <= 0) { player.pos.y = 0; player.vy = 0; player.onGround = true; }

  // Resources
  player.castCd -= dt;
  player.novaCd -= dt;
  player.regenDelay -= dt;
  player.en = Math.min(player.maxEn, player.en + (10 + player.level) * dt);
  const inSelf = realmAt(player.pos.x, player.pos.z) === REALMS.self;
  if (inSelf) player.hp = Math.min(player.maxHp, player.hp + 30 * dt);
  else if (player.regenDelay <= 0) player.hp = Math.min(player.maxHp, player.hp + 3 * dt);
  ui.frame(dt, inSelf && player.hp < player.maxHp);

  if (mouseDown && !ui.inDialogue) castInsight();

  // Camera
  const moving = Math.hypot(player.vel.x, player.vel.z);
  if (player.onGround) player.bob += dt * moving * 1.6;
  const bobY = Math.sin(player.bob) * 0.06 * Math.min(moving / 6, 1);
  player.shake = Math.max(0, player.shake - dt);
  const sh = player.shake * 0.4;
  camera.position.set(
    player.pos.x + (Math.random() - 0.5) * sh,
    player.pos.y + 1.7 + bobY + (Math.random() - 0.5) * sh,
    player.pos.z + (Math.random() - 0.5) * sh,
  );
  camera.rotation.set(player.pitch, player.yaw, 0);

  handGlow = Math.max(0, handGlow - dt * 5);
  hand.position.y = -0.24 + bobY * 0.5 + Math.sin(performance.now() / 600) * 0.008;
  hand.rotation.y += dt * 2;
  handHalo.scale.setScalar(1 + handGlow * 0.6);
  handHalo.material.opacity = 0.3 + handGlow * 0.5;
}

function updateProjectiles(dt) {
  projectiles.update(dt);
  const chest = new THREE.Vector3(player.pos.x, player.pos.y + 1.1, player.pos.z);
  for (const p of projectiles.list) {
    if (p.dead) continue;
    const pos = p.mesh.position;
    if (p.owner === 'player') {
      for (const e of enemies) {
        if (e.alive && Projectiles.sweptDistance(p, e.center) < e.def.radius + p.size + 0.25) {
          hitEnemy(e, p.damage, p.vel.clone().setY(0).normalize());
          p.dead = true;
          break;
        }
      }
      if (!p.dead && shadowSelf.mood !== 'companion' && Projectiles.sweptDistance(p, shadowSelf.center) < shadowSelf.radius + 0.8) {
        hitShadow();
        p.dead = true;
      }
      if (!p.dead) {
        for (const m of mirrors) {
          if (!m.broken && Projectiles.sweptDistance(p, m.center) < 1.3) { breakMirror(m); p.dead = true; break; }
        }
      }
    } else if (Projectiles.sweptDistance(p, chest) < 0.85) {
      damagePlayer(p.damage);
      particles.burst(pos, p.color, 8, 3, 0.4);
      p.dead = true;
    }
    if (!p.dead) {
      for (const o of obstacles) {
        if (pos.y < 6 && Math.hypot(pos.x - o.x, pos.z - o.z) < o.r) { p.dead = true; particles.burst(pos, p.color, 5, 2, 0.3); break; }
      }
    }
  }
}

let currentInteractable = null;
function updateInteraction() {
  currentInteractable = null;
  if (ui.inDialogue || player.dead) { ui.prompt(''); return; }
  let best = Infinity;
  for (const it of interactables) {
    if (it.enabled && !it.enabled()) continue;
    const d = Math.hypot(player.pos.x - it.pos.x, player.pos.z - it.pos.z);
    if (d < it.radius && d < best) { best = d; currentInteractable = it; }
  }
  ui.prompt(currentInteractable ? `[E] ${currentInteractable.label()}` : '');
}

function updatePickups(dt, t) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.mesh.position.y = p.baseY + Math.sin(t * 2 + i) * 0.25;
    p.mesh.rotation.y = t * 0.8;
    if (p.mesh.userData.ring) p.mesh.userData.ring.rotation.x = t * 1.5;
    const d = Math.hypot(player.pos.x - p.mesh.position.x, player.pos.z - p.mesh.position.z);
    if (d < 1.5) {
      particles.burst(p.mesh.position, new THREE.Color(p.color).getHex(), 24, 5, 1);
      scene.remove(p.mesh);
      pickups.splice(i, 1);
      p.onPickup();
      gainXP(20);
    }
  }
}

function updateRealm() {
  const r = realmAt(player.pos.x, player.pos.z);
  if (r && r !== state.currentRealm) {
    state.currentRealm = r;
    ui.realm(r);
    audio.realm();
    audio.setDrone(r.drone);
    addPage(r.id, PAGES[r.id].title, PAGES[r.id].text);
  }
}

function updateShards(t) {
  const c = world.selfCrystal.position;
  shards.forEach((m, i) => {
    const ring = m.userData.ring;
    const radius = 3.2 + ring * 1.1;
    const speed = [0.5, -0.35, 0.25][ring];
    const a = t * speed + m.userData.phase;
    m.position.set(c.x + Math.cos(a) * radius, c.y + Math.sin(a * 2 + ring) * 0.3 + (ring - 1) * 0.6, c.z + Math.sin(a) * radius);
    m.rotation.y = t * 2 + i;
  });
}

function minimapMarkers() {
  const markers = [];
  for (const it of interactables) markers.push({ x: it.pos.x, z: it.pos.z, color: it.marker || '#ffffff', size: 2.2 });
  for (const p of pickups) markers.push({ x: p.mesh.position.x, z: p.mesh.position.z, color: p.color, size: 2 });
  if (scarab.active) markers.push({ x: scarab.mesh.position.x, z: scarab.mesh.position.z, color: '#ffc040', size: 3 });
  return markers;
}

// ---------------------------------------------------------------------------
// Main loop

const clock = new THREE.Clock();
const game = { player, camera, projectiles, audio, damagePlayer };
let hudTimer = 0;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  world.update(t, dt);
  particles.update(dt);
  updateShards(t);
  for (const n of npcs) {
    faceToward(n, player.pos.x, player.pos.z);
    n.userData.halo.rotation.z = t;
  }

  if (state.mode === 'start') {
    // Attract mode: drift slowly around the Self
    const a = t * 0.06;
    camera.position.set(Math.sin(a) * 24, 7 + Math.sin(t * 0.2) * 1.5, Math.cos(a) * 24);
    camera.lookAt(0, 3, 0);
    world.updateAtmosphere(camera.position.x, camera.position.z);
  } else {
    const live = state.mode === 'playing';
    if (live) {
      updatePlayer(dt);
      updateRealm();
      updateInteraction();
      updatePickups(dt, t);
      if (!ui.inDialogue) {
        for (const e of enemies) e.update(dt, t, game);
        shadowSelf.update(dt, t, game);
        updateProjectiles(dt);
        updateScarab(dt, t);
      }
    }
    world.updateAtmosphere(player.pos.x, player.pos.z);
    hudTimer -= dt;
    if (hudTimer <= 0) {
      hudTimer = 0.05;
      ui.stats(player);
      ui.minimap(player, enemies, minimapMarkers());
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// Start screen
ui.overlay(`
  <div class="panel title">
    <p class="eyebrow">A first-person journey through Carl Jung's model of the psyche</p>
    <h1>Mind Map</h1>
    <p>Walk the five realms of the psyche: the Self, the Ego, the Personal Subconscious, the Shadow and the Collective Unconscious.
    Meet the archetypes, integrate your complexes and write what you find in your Red Book.</p>
    <p class="muted">There is no ending. Individuation is a path, not a destination.</p>
    ${controlsHtml()}
    <button>Enter the psyche</button>
  </div>`);
ui.pageCount(0, TOTAL_PAGES);
frame();

// Debug handle for tinkering in the console
window.mindmap = { state, player, enemies, shadowSelf, scarab, projectiles, addPage, gainXP, castInsight };

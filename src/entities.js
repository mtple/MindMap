// Actors and objects that populate the psyche: enemies, NPCs, projectiles,
// particles, pickups and quest props.
import * as THREE from 'three';
import { ENEMY_TYPES, REALMS } from './data.js';
import { randomPointInRealm } from './world.js';

// ---------------------------------------------------------------------------
// Helpers

export function makeLabel(text, color = '#ffffff', scale = 1) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = '600 44px Georgia, serif';
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 40;
  c.width = w; c.height = 72;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.9)';
  g.shadowBlur = 10;
  g.fillStyle = color;
  g.fillText(text, w / 2, 38);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, fog: false, transparent: true }));
  sprite.scale.set((w / 72) * 0.5 * scale, 0.5 * scale, 1);
  return sprite;
}

function glyphTexture(symbol, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 256, 512);
  g.strokeStyle = color; g.lineWidth = 6;
  g.strokeRect(24, 24, 208, 464);
  g.font = '170px serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = color;
  g.shadowColor = color; g.shadowBlur = 30;
  g.fillText(symbol, 128, 230);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Particles: short-lived bursts of glowing shards

const particleGeo = new THREE.OctahedronGeometry(0.12);
const matCache = new Map();
function basicMat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial({ color, ...opts }));
  return matCache.get(key);
}

export class Particles {
  constructor(scene) { this.scene = scene; this.list = []; }

  burst(pos, color, count = 14, speed = 6, life = 0.8) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(particleGeo, basicMat(color, { transparent: true }));
      m.position.copy(pos);
      const v = new THREE.Vector3().randomDirection().multiplyScalar(speed * (0.4 + Math.random() * 0.6));
      v.y = Math.abs(v.y) * 0.8 + 1;
      this.scene.add(m);
      this.list.push({ m, v, life, max: life });
    }
  }

  ring(pos, color, radius) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.15, 8, 48), new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending }));
    m.rotation.x = Math.PI / 2;
    m.position.copy(pos);
    this.scene.add(m);
    this.list.push({ m, ring: radius, life: 0.5, max: 0.5 });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.ring) {
        const k = 1 - p.life / p.max;
        p.m.scale.setScalar(0.5 + k * p.ring);
        p.m.material.opacity = 1 - k;
      } else {
        p.v.y -= 9 * dt;
        p.m.position.addScaledVector(p.v, dt);
        p.m.rotation.x += dt * 8;
        p.m.scale.setScalar(Math.max(p.life / p.max, 0.01));
      }
      if (p.life <= 0) {
        this.scene.remove(p.m);
        if (p.ring) { p.m.geometry.dispose(); p.m.material.dispose(); }
        this.list.splice(i, 1);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Projectiles

const boltGeo = new THREE.SphereGeometry(1, 12, 8);
const seg = new THREE.Vector3(), tmp = new THREE.Vector3();

export class Projectiles {
  constructor(scene) { this.scene = scene; this.list = []; }

  spawn(pos, dir, { speed, damage, owner, color, size = 0.18, life = 2.2 }) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(boltGeo, basicMat(0xffffff));
    core.scale.setScalar(size * 0.55);
    const glow = new THREE.Mesh(boltGeo, basicMat(color, { transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(size);
    g.add(core, glow);
    g.position.copy(pos);
    this.scene.add(g);
    const p = { mesh: g, prev: pos.clone(), vel: dir.clone().normalize().multiplyScalar(speed), damage, owner, color, size, life, dead: false };
    this.list.push(p);
    return p;
  }

  // Distance from a point to the path this projectile travelled during the
  // last frame, so fast bolts can't skip past a target between frames.
  static sweptDistance(p, point) {
    const a = p.prev, b = p.mesh.position;
    seg.subVectors(b, a);
    const len2 = seg.lengthSq();
    const t = len2 > 0 ? Math.max(0, Math.min(1, tmp.subVectors(point, a).dot(seg) / len2)) : 0;
    return tmp.copy(a).addScaledVector(seg, t).distanceTo(point);
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.prev.copy(p.mesh.position);
      p.mesh.position.addScaledVector(p.vel, dt);
      p.life -= dt;
      if (p.life <= 0 || p.dead || p.mesh.position.y < -2) {
        this.scene.remove(p.mesh);
        this.list.splice(i, 1);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Enemies

function eye(color, size = 0.09) {
  return new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ color }));
}

function buildEnemyMesh(type) {
  const def = ENEMY_TYPES[type];
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  let mats = [];

  if (type === 'memory') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x9a5ad0, emissive: 0x5a1a90, emissiveIntensity: 0.8, transparent: true, opacity: 0.75, roughness: 0.2 });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), mat);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), basicMat(0xffd0ff));
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 12), mat);
    tail.rotation.x = Math.PI; tail.position.y = -0.7;
    body.add(orb, core, tail);
    const l = eye(0xffffff), r = eye(0xffffff);
    l.position.set(-0.2, 0.1, -0.52); r.position.set(0.2, 0.1, -0.52);
    body.add(l, r);
    body.position.y = 1.3;
    mats = [mat];
  } else if (type === 'wisp') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0x300000, emissiveIntensity: 1, roughness: 0.6, flatShading: true });
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), mat);
    body.add(orb);
    for (let i = 0; i < 9; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 5), mat);
      const d = new THREE.Vector3().randomDirection();
      spike.position.copy(d).multiplyScalar(0.6);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      body.add(spike);
    }
    const l = eye(0xff2200, 0.11), r = eye(0xff2200, 0.11);
    l.position.set(-0.22, 0.12, -0.55); r.position.set(0.22, 0.12, -0.55);
    body.add(l, r);
    body.position.y = 1.2;
    mats = [mat];
  } else if (type === 'complex') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a2040, emissive: 0x102050, emissiveIntensity: 1, metalness: 0.5, roughness: 0.3, flatShading: true });
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), mat);
    body.add(core);
    const ring = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.25), basicMat(0xffa040));
      const a = (i / 6) * Math.PI * 2;
      shard.position.set(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5);
      ring.add(shard);
    }
    body.add(ring);
    body.userData.ring = ring;
    const e = eye(0xffa040, 0.2);
    e.position.set(0, 0.1, -0.85);
    body.add(e);
    body.position.y = 1.8;
    mats = [mat];
  } else if (type === 'shadowBoss') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x020202, emissive: 0x200000, emissiveIntensity: 1, roughness: 0.9 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.75, 1.6, 6, 12), mat);
    torso.position.y = 1.9;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mat);
    head.position.y = 3.4;
    const robe = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 16, 1, true), mat);
    robe.position.y = 1.1;
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.4, 4, 8), mat);
    armL.position.set(-1.0, 2.1, 0); armL.rotation.z = 0.3;
    const armR = armL.clone(); armR.position.x = 1.0; armR.rotation.z = -0.3;
    body.add(torso, head, robe, armL, armR);
    const l = eye(0xff1a1a, 0.1), r = eye(0xff1a1a, 0.1);
    l.position.set(-0.2, 3.45, -0.48); r.position.set(0.2, 3.45, -0.48);
    body.add(l, r);
    body.userData.eyes = [l, r];
    body.userData.arms = [armL, armR];
    const aura = new THREE.PointLight(0xff2010, 25, 12, 1.5);
    aura.position.y = 2.5;
    body.add(aura);
    body.userData.aura = aura;
    body.scale.setScalar(1.15);
    mats = [mat];
  }

  // Health bar, shown once the enemy has been hurt
  const bar = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.12), basicMat(0x000000, { transparent: true, opacity: 0.6, depthWrite: false }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.12), basicMat(def.color, { depthWrite: false }));
  fill.position.z = 0.001;
  bar.add(bg, fill);
  bar.position.y = def.height + (type === 'shadowBoss' ? 1.2 : 0.6);
  bar.visible = false;
  g.add(bar);

  return { group: g, body, mats, bar, fill };
}

export class Enemy {
  constructor(scene, type, realmId, x, z, { respawn = true } = {}) {
    this.type = type;
    this.def = ENEMY_TYPES[type];
    this.realm = REALMS[realmId];
    this.home = new THREE.Vector3(x, 0, z);
    this.respawns = respawn;
    const built = buildEnemyMesh(type);
    Object.assign(this, built);
    this.mesh = built.group;
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.wanderTarget = new THREE.Vector3();
    this.phase = Math.random() * 10;
    this.reset();
  }

  reset() {
    this.hp = this.def.hp;
    this.alive = true;
    this.mesh.visible = true;
    this.pos.copy(this.home);
    this.attackTimer = 1;
    this.rangedTimer = 1.5 + Math.random();
    this.flash = 0;
    this.respawnTimer = 0;
    this.knock = new THREE.Vector3();
    this.pickWander();
    this.bar.visible = false;
  }

  pickWander() {
    const [x, z] = randomPointInRealm(this.realm, 0, 0.75);
    this.wanderTarget.set(x, 0, z);
    this.wanderPause = Math.random() * 2;
  }

  get center() { return new THREE.Vector3(this.pos.x, this.pos.y + this.def.height * 0.8, this.pos.z); }

  // Returns true when this hit integrates the complex.
  hit(dmg, knockDir) {
    if (!this.alive) return false;
    this.hp -= dmg;
    this.flash = 0.12;
    this.bar.visible = true;
    if (knockDir) this.knock.addScaledVector(knockDir, 8);
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.mesh.visible = false;
      this.respawnTimer = 40;
      return true;
    }
    return false;
  }

  // Returns true if the player is within this enemy's territory.
  playerInTerritory(playerPos) {
    const [cx, cz] = this.realm.center;
    return Math.hypot(playerPos.x - cx, playerPos.z - cz) < this.realm.radius + 3;
  }

  update(dt, t, game) {
    const def = this.def;
    if (!this.alive) {
      if (this.respawns) {
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0 && game.player.pos.distanceTo(this.home) > 28) {
          this.reset();
          const [x, z] = randomPointInRealm(this.realm, this.realm.radius * 0.3);
          this.pos.set(x, 0, z);
        }
      }
      return;
    }

    // Visual feedback
    this.flash -= dt;
    for (const m of this.mats) m.emissiveIntensity = this.flash > 0 ? 4 : 1;
    this.fill.scale.x = Math.max(this.hp / def.hp, 0.001);
    this.fill.position.x = -0.6 * (1 - this.fill.scale.x);
    this.bar.quaternion.copy(game.camera.quaternion);

    const player = game.player;
    const toPlayer = new THREE.Vector3().subVectors(player.pos, this.pos);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    const engaged = !player.dead && dist < def.aggro && this.playerInTerritory(player.pos);

    let moveDir = new THREE.Vector3();
    let speed = def.speed;
    if (engaged) {
      if (dist > def.radius + 0.9) moveDir.copy(toPlayer).normalize();
      if (def.ranged && dist > 8 && dist < def.ranged.range) speed *= 0.6;
      this.mesh.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);
    } else {
      const toW = new THREE.Vector3().subVectors(this.wanderTarget, this.pos);
      toW.y = 0;
      if (toW.length() < 1) {
        this.wanderPause -= dt;
        if (this.wanderPause <= 0) this.pickWander();
      } else {
        moveDir.copy(toW).normalize();
        speed *= 0.35;
        this.mesh.rotation.y = Math.atan2(-toW.x, -toW.z);
      }
    }

    this.pos.addScaledVector(moveDir, speed * dt);
    this.pos.addScaledVector(this.knock, dt);
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 6));

    // Stay inside home realm
    const [cx, cz] = this.realm.center;
    const dx = this.pos.x - cx, dz = this.pos.z - cz;
    const d = Math.hypot(dx, dz), maxR = this.realm.radius - def.radius - 0.5;
    if (d > maxR) { this.pos.x = cx + (dx / d) * maxR; this.pos.z = cz + (dz / d) * maxR; }

    // Idle animation
    this.body.position.y = def.height * 0.8 + Math.sin(t * 2.5 + this.phase) * 0.15;
    if (this.body.userData.ring) this.body.userData.ring.rotation.y = t * 2;

    if (!engaged) return;

    // Melee
    this.attackTimer -= dt;
    if (dist < def.radius + 1.3 && this.attackTimer <= 0) {
      this.attackTimer = def.attackCd;
      game.damagePlayer(def.damage, this);
    }

    // Ranged
    if (def.ranged) {
      this.rangedTimer -= dt;
      if (this.rangedTimer <= 0 && dist < def.ranged.range) {
        this.rangedTimer = def.ranged.cd * (0.8 + Math.random() * 0.4);
        const origin = this.center;
        const target = new THREE.Vector3(player.pos.x, player.pos.y + 1.2, player.pos.z);
        const base = target.sub(origin).normalize();
        const n = def.ranged.volley || 1;
        for (let i = 0; i < n; i++) {
          const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - (n - 1) / 2) * 0.16);
          game.projectiles.spawn(origin, dir, { speed: def.ranged.speed, damage: def.ranged.damage, owner: 'enemy', color: def.color, size: 0.3 });
        }
        game.audio.enemyShoot();
      }
    }

  }
}

// ---------------------------------------------------------------------------
// Your Shadow: it cannot be destroyed. Attacking it only makes it grow and
// lash out. Speak with it and accept it, and it follows you everywhere.

export class ShadowSelf {
  constructor(scene, x, z) {
    this.def = ENEMY_TYPES.shadowBoss;
    this.type = 'shadowBoss';
    this.realm = REALMS.shadow;
    const built = buildEnemyMesh('shadowBoss');
    Object.assign(this, built);
    this.mesh = built.group;
    this.bar.visible = false;
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.pos.set(x, 0, z);
    this.home = this.pos.clone();
    this.mood = 'lurking'; // lurking | angry | companion
    this.anger = 0;
    this.growth = 0;
    this.alive = true;
    this.met = false;
    this.flash = 0;
    this.attackTimer = 1;
    this.rangedTimer = 2;
    this.talkIndex = 0;
  }

  get center() { return new THREE.Vector3(this.pos.x, this.pos.y + 2.6 * this.scale, this.pos.z); }
  get scale() { return 1.15 * (1 + this.growth); }
  get radius() { return this.def.radius * (1 + this.growth); }

  // Insight is absorbed. Violence feeds the Shadow.
  hit() {
    if (this.mood === 'companion') return false;
    this.flash = 0.15;
    this.anger = 9;
    this.mood = 'angry';
    this.growth = Math.min(this.growth + 0.06, 1.5);
    return false;
  }

  calm() {
    this.mood = 'lurking';
    this.anger = 0;
  }

  embrace() {
    this.mood = 'companion';
    this.anger = 0;
    for (const e of this.body.userData.eyes) e.material.color.set(0xfff4d0);
    this.body.userData.aura.color.set(0x8a7cff);
    this.body.userData.aura.intensity = 10;
    for (const m of this.mats) { m.color.set(0x24222e); m.emissive.set(0x18143a); }
  }

  update(dt, t, game) {
    const player = game.player;
    const toPlayer = new THREE.Vector3().subVectors(player.pos, this.pos);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    const dir = dist > 0.001 ? toPlayer.clone().divideScalar(dist) : new THREE.Vector3();

    // The growth slowly fades when the Shadow is left in peace
    if (this.mood !== 'angry') this.growth = Math.max(0, this.growth - dt * 0.01);
    this.flash -= dt;
    for (const m of this.mats) m.emissiveIntensity = this.flash > 0 ? 5 : 1;
    const s = this.scale;
    this.body.scale.set(s, s, s);
    const arms = this.body.userData.arms;
    const sw = Math.sin(t * 3) * 0.3;
    arms[0].rotation.x = sw; arms[1].rotation.x = -sw;
    this.body.position.y = Math.sin(t * 1.3) * 0.1;
    this.mesh.rotation.y = Math.atan2(-toPlayer.x, -toPlayer.z);

    if (this.mood === 'companion') {
      // Walks a few paces beside you, anywhere in the psyche
      if (dist > 6.5) {
        const speed = Math.min(14, (dist - 6) * 2.2);
        this.pos.addScaledVector(dir, speed * dt);
      }
      if (dist > 40) this.pos.set(player.pos.x - dir.x * 5, 0, player.pos.z - dir.z * 5);
      this.pos.y = Math.max(0, player.pos.y * 0.5);
      return;
    }

    const [cx, cz] = this.realm.center;
    const inTerritory = Math.hypot(player.pos.x - cx, player.pos.z - cz) < this.realm.radius + 3;

    if (this.mood === 'angry') {
      this.anger -= dt;
      if (this.anger <= 0 || player.dead) { this.calm(); }
      else if (inTerritory) {
        if (dist > this.radius + 1) this.pos.addScaledVector(dir, this.def.speed * (1 + this.growth * 0.3) * dt);
        this.attackTimer -= dt;
        if (dist < this.radius + 1.6 && this.attackTimer <= 0) {
          this.attackTimer = this.def.attackCd;
          game.damagePlayer(Math.round(this.def.damage * (1 + this.growth)), this);
        }
        this.rangedTimer -= dt;
        const r = this.def.ranged;
        if (this.rangedTimer <= 0 && dist < r.range) {
          this.rangedTimer = r.cd;
          const origin = this.center;
          const base = new THREE.Vector3(player.pos.x, player.pos.y + 1.2, player.pos.z).sub(origin).normalize();
          const n = r.volley + Math.floor(this.growth * 4);
          for (let i = 0; i < n; i++) {
            const d = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (i - (n - 1) / 2) * 0.14);
            game.projectiles.spawn(origin, d, { speed: r.speed, damage: r.damage, owner: 'enemy', color: 0xff1a1a, size: 0.32 });
          }
          game.audio.enemyShoot();
        }
      }
    } else if (inTerritory && !player.dead) {
      // Lurking: keeps its distance and mirrors you, always watching
      if (dist > 9) this.pos.addScaledVector(dir, this.def.speed * 0.6 * dt);
      else if (dist < 6) this.pos.addScaledVector(dir, -this.def.speed * 0.5 * dt);
    } else {
      const toHome = new THREE.Vector3().subVectors(this.home, this.pos).setY(0);
      if (toHome.length() > 1) this.pos.addScaledVector(toHome.normalize(), this.def.speed * 0.4 * dt);
    }

    const dx = this.pos.x - cx, dz = this.pos.z - cz;
    const d = Math.hypot(dx, dz), maxR = this.realm.radius - 2;
    if (d > maxR) { this.pos.x = cx + (dx / d) * maxR; this.pos.z = cz + (dz / d) * maxR; }
  }
}

// ---------------------------------------------------------------------------
// NPCs: robed archetypal figures

export function buildNPC({ robe, glow, mask = false, crown = false, name, nameColor }) {
  const g = new THREE.Group();
  const robeMat = new THREE.MeshStandardMaterial({ color: robe, roughness: 0.8, emissive: glow, emissiveIntensity: 0.25 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.0, 16), robeMat);
  body.position.y = 1.0;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), new THREE.MeshStandardMaterial({ color: 0xe8d8c0, roughness: 0.6 }));
  head.position.y = 2.25;
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), robeMat);
  hood.position.y = 2.3;
  hood.rotation.x = 0.4;
  g.add(body, head, hood);
  if (mask) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.2, emissive: 0x99bbdd, emissiveIntensity: 0.4 }));
    m.position.set(0, 2.25, -0.1);
    m.rotation.y = Math.PI;
    g.add(m);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 8, 32), basicMat(glow));
  halo.position.y = 2.75;
  halo.rotation.x = Math.PI / 2;
  g.add(halo);
  if (crown) {
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), basicMat(glow));
      const a = (i / 5) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.45, 2.85, Math.sin(a) * 0.45);
      g.add(s);
    }
  }
  const light = new THREE.PointLight(glow, 8, 6, 1.5);
  light.position.y = 2.2;
  g.add(light);
  const label = makeLabel(name, nameColor);
  label.position.y = 3.3;
  g.add(label);
  g.userData.halo = halo;
  return g;
}

// ---------------------------------------------------------------------------
// Quest props

export function buildMemoryOrb() {
  const g = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffc0f0, emissive: 0xff70d0, emissiveIntensity: 1.4 }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.03, 6, 32), basicMat(0xffd0ff));
  const light = new THREE.PointLight(0xff80e0, 10, 8, 1.5);
  g.add(orb, ring, light);
  g.userData.ring = ring;
  return g;
}

export function buildMirror() {
  const g = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4b060, metalness: 0.9, roughness: 0.25 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.2, 0.2), frameMat);
  frame.position.y = 2.1;
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 2.9),
    new THREE.MeshStandardMaterial({ color: 0xcfe8ff, metalness: 1, roughness: 0.05, emissive: 0x6080a0, emissiveIntensity: 0.7 }),
  );
  glass.position.set(0, 2.1, 0.11);
  const glassBack = glass.clone();
  glassBack.rotation.y = Math.PI;
  glassBack.position.z = -0.11;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 0.5, 8), frameMat);
  stand.position.y = 0.25;
  g.add(frame, glass, glassBack, stand);
  g.userData.glass = [glass, glassBack];
  return g;
}

export function buildMonolith(symbol, color) {
  const g = new THREE.Group();
  const tex = glyphTexture(symbol, color);
  const stone = new THREE.MeshStandardMaterial({ color: 0x1c1c2a, roughness: 0.8 });
  const face = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.15 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 9, 1.2), [stone, stone, stone, stone, face, face]);
  slab.position.y = 4.5;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 80, 16, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  beam.position.y = 49;
  beam.visible = false;
  const light = new THREE.PointLight(color, 0, 18, 1.5);
  light.position.set(0, 5, 0);
  g.add(slab, beam, light);
  g.userData = { face, beam, light };
  return g;
}

// A floating dream symbol: a glyph card inside a slowly turning ring
export function buildSymbol(glyph, color) {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const css = '#' + color.toString(16).padStart(6, '0');
  x.font = '180px serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = css; x.shadowBlur = 40;
  x.fillStyle = '#ffffff';
  x.fillText(glyph, 128, 140);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false }));
  sprite.scale.set(1.4, 1.4, 1);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.035, 6, 48), basicMat(color));
  const light = new THREE.PointLight(color, 12, 9, 1.5);
  g.add(sprite, ring, light);
  g.userData.ring = ring;
  return g;
}

// The golden scarab of synchronicity
export function buildScarab() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc040, emissive: 0xaa6a00, emissiveIntensity: 1.2, metalness: 0.9, roughness: 0.25 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 10), gold);
  shell.scale.set(1, 0.55, 1.35);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), gold);
  head.position.z = -0.38;
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), wingMat);
  wl.position.set(-0.32, 0.12, 0); wl.rotation.x = -Math.PI / 2;
  const wr = wl.clone(); wr.position.x = 0.32;
  const light = new THREE.PointLight(0xffc040, 8, 7, 1.5);
  g.add(shell, head, wl, wr, light);
  g.userData.wings = [wl, wr];
  return g;
}

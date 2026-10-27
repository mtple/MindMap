// Builds the five realms of the psyche, the bridges between them and their
// ambient decoration. Also exposes the walkability and atmosphere queries used
// by the rest of the game.
import * as THREE from 'three';
import { REALMS, BRIDGES, BRIDGE_HALF_WIDTH } from './data.js';

const REALM_LIST = Object.values(REALMS);

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

export function isWalkable(x, z, margin = 0.4) {
  for (const r of REALM_LIST) {
    if (Math.hypot(x - r.center[0], z - r.center[1]) < r.radius - margin) return true;
  }
  for (const [a, b] of BRIDGES) {
    const A = REALMS[a].center, B = REALMS[b].center;
    if (distToSegment(x, z, A[0], A[1], B[0], B[1]) < BRIDGE_HALF_WIDTH - margin) return true;
  }
  return false;
}

export function realmAt(x, z) {
  for (const r of REALM_LIST) {
    if (Math.hypot(x - r.center[0], z - r.center[1]) < r.radius) return r;
  }
  return null;
}

// Blends each realm's atmosphere by proximity so walking across a bridge
// smoothly fades one realm into the next.
export function realmWeights(x, z) {
  let total = 0;
  const w = {};
  for (const r of REALM_LIST) {
    const d = Math.max(Math.hypot(x - r.center[0], z - r.center[1]) - r.radius, 0) + 1;
    const v = 1 / (d * d * d);
    w[r.id] = v;
    total += v;
  }
  for (const id in w) w[id] /= total;
  return w;
}

export function randomPointInRealm(realm, minR = 0, maxFrac = 0.8) {
  const a = Math.random() * Math.PI * 2;
  const r = minR + Math.sqrt(Math.random()) * (realm.radius * maxFrac - minR);
  return [realm.center[0] + Math.cos(a) * r, realm.center[1] + Math.sin(a) * r];
}

// ---------------------------------------------------------------------------
// Procedural textures

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function mandalaTexture() {
  return canvasTexture(1024, (g, s) => {
    const c = s / 2;
    g.fillStyle = '#3a2810';
    g.fillRect(0, 0, s, s);
    const grad = g.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, '#f7d98a');
    grad.addColorStop(0.5, '#a8772a');
    grad.addColorStop(1, '#2a1a08');
    g.fillStyle = grad;
    g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,240,190,0.85)';
    g.lineWidth = 3;
    for (let ring = 1; ring <= 7; ring++) {
      const r = ring * c / 7.5;
      g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke();
      const petals = ring * 4 + 4;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 + ring * 0.3;
        g.beginPath();
        g.ellipse(c + Math.cos(a) * (r - c / 15), c + Math.sin(a) * (r - c / 15), c / 18, c / 40, a, 0, Math.PI * 2);
        g.stroke();
      }
    }
    // Squared circle: the classic mandala motif of the Self
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(255,250,220,0.9)';
    const q = c * 0.62;
    g.strokeRect(c - q, c - q, q * 2, q * 2);
    g.save(); g.translate(c, c); g.rotate(Math.PI / 4); g.strokeRect(-q, -q, q * 2, q * 2); g.restore();
  });
}

function marbleTexture() {
  return canvasTexture(1024, (g, s) => {
    g.fillStyle = '#e9eef3';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = `rgba(120,140,165,${Math.random() * 0.18})`;
      g.lineWidth = Math.random() * 3;
      g.beginPath();
      let x = Math.random() * s, y = Math.random() * s;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 120; y += (Math.random() - 0.5) * 120; g.lineTo(x, y); }
      g.stroke();
    }
    g.strokeStyle = 'rgba(70,90,120,0.35)';
    g.lineWidth = 2;
    const n = 12;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(0, i * s / n); g.lineTo(s, i * s / n); g.stroke();
      g.beginPath(); g.moveTo(i * s / n, 0); g.lineTo(i * s / n, s); g.stroke();
    }
  });
}

function crackTexture() {
  return canvasTexture(1024, (g, s) => {
    g.fillStyle = '#070203';
    g.fillRect(0, 0, s, s);
    g.shadowColor = '#ff2a10';
    g.shadowBlur = 12;
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(255,${40 + Math.random() * 60},20,${0.4 + Math.random() * 0.5})`;
      g.lineWidth = 1 + Math.random() * 3;
      g.beginPath();
      let x = s / 2 + (Math.random() - 0.5) * 120, y = s / 2 + (Math.random() - 0.5) * 120;
      g.moveTo(x, y);
      const a = Math.random() * Math.PI * 2;
      for (let k = 0; k < 10; k++) {
        x += Math.cos(a + (Math.random() - 0.5) * 1.4) * 45;
        y += Math.sin(a + (Math.random() - 0.5) * 1.4) * 45;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
}

function mistTexture() {
  return canvasTexture(1024, (g, s) => {
    g.fillStyle = '#1c0e2e';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * s, y = Math.random() * s, r = 30 + Math.random() * 140;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${150 + Math.random() * 80},90,220,0.22)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

function cosmicTexture() {
  return canvasTexture(1024, (g, s) => {
    const c = s / 2;
    g.fillStyle = '#03040c';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(180,220,255,${Math.random()})`;
      g.fillRect(Math.random() * s, Math.random() * s, 1.5, 1.5);
    }
    g.strokeStyle = 'rgba(95,224,255,0.55)';
    g.lineWidth = 2;
    for (let r = 1; r <= 5; r++) { g.beginPath(); g.arc(c, c, r * c / 5.3, 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * c * 0.95, c + Math.sin(a) * c * 0.95); g.stroke();
    }
  });
}

// ---------------------------------------------------------------------------

export function buildWorld(scene) {
  const animated = []; // { update(t, dt) }
  let selfCrystal;
  const obstacles = []; // { x, z, r } circles the player cannot walk through
  const add = (o) => { scene.add(o); return o; };

  const hemi = add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.1));
  const sun = add(new THREE.DirectionalLight(0xffffff, 0.6));
  sun.position.set(30, 60, 20);

  scene.fog = new THREE.FogExp2(0x000000, 0.02);
  scene.background = new THREE.Color(0x000000);

  // --- Platforms ------------------------------------------------------------
  const floorTex = {
    self: mandalaTexture(), ego: marbleTexture(), personal: mistTexture(),
    shadow: crackTexture(), collective: cosmicTexture(),
  };
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x2a2433, roughness: 0.95 });

  for (const r of REALM_LIST) {
    const [x, z] = r.center;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(r.radius, r.radius * 0.55, 6, 64, 1), rockMat);
    base.position.set(x, -3.02, z);
    add(base);
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(r.radius, 64),
      new THREE.MeshStandardMaterial({
        map: floorTex[r.id], roughness: r.id === 'ego' ? 0.35 : 0.85,
        metalness: r.id === 'self' ? 0.35 : 0.05,
        emissive: r.id === 'shadow' || r.id === 'collective' ? 0xffffff : 0x000000,
        emissiveMap: r.id === 'shadow' || r.id === 'collective' ? floorTex[r.id] : null,
        emissiveIntensity: 0.6,
      }),
    );
    top.rotation.x = -Math.PI / 2;
    top.position.set(x, 0, z);
    add(top);
    // Glowing rim marking the edge of the realm
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(r.radius, 0.12, 8, 96),
      new THREE.MeshBasicMaterial({ color: r.color }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, 0.05, z);
    add(rim);
    const light = new THREE.PointLight(r.color, 60, r.radius * 2.2, 1.6);
    light.position.set(x, 9, z);
    add(light);
  }

  // --- Bridges --------------------------------------------------------------
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x4a4258, roughness: 0.7, metalness: 0.2 });
  for (const [a, b] of BRIDGES) {
    const A = REALMS[a], B = REALMS[b];
    const dx = B.center[0] - A.center[0], dz = B.center[1] - A.center[1];
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const span = len - A.radius - B.radius + 2;
    const mid = (A.radius - 1 + span / 2) / len;
    const cx = A.center[0] + dx * mid, cz = A.center[1] + dz * mid;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(BRIDGE_HALF_WIDTH * 2, 0.6, span), bridgeMat);
    deck.position.set(cx, -0.31, cz);
    deck.rotation.y = angle;
    add(deck);
    // Edge strips fade from one realm's colour to the next
    for (const side of [-1, 1]) {
      const geo = new THREE.BoxGeometry(0.15, 0.15, span);
      const colors = [];
      const pos = geo.attributes.position;
      const ca = new THREE.Color(A.color), cb = new THREE.Color(B.color);
      for (let i = 0; i < pos.count; i++) {
        const c = pos.getZ(i) < 0 ? ca : cb;
        colors.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const strip = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
      strip.position.set(cx, 0.05, cz);
      strip.rotation.y = angle;
      strip.translateX(side * (BRIDGE_HALF_WIDTH - 0.1));
      add(strip);
    }
    // Lanterns along the bridge
    const lanterns = Math.floor(span / 7);
    for (let i = 1; i <= lanterns; i++) {
      const t = (A.radius + (span - 2) * (i / (lanterns + 1))) / len;
      for (const side of [-1, 1]) {
        const c = new THREE.Color(A.color).lerp(new THREE.Color(B.color), i / (lanterns + 1));
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: c }));
        orb.position.set(A.center[0] + dx * t, 1.6, A.center[1] + dz * t);
        orb.rotation.y = angle;
        orb.translateX(side * (BRIDGE_HALF_WIDTH + 0.3));
        add(orb);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.4, 6), bridgeMat);
        post.position.copy(orb.position).setY(0.7);
        add(post);
        const base = orb.position.y, phase = Math.random() * 6;
        animated.push({ update: (t) => { orb.position.y = base + Math.sin(t * 1.5 + phase) * 0.12; } });
      }
    }
  }

  // --- The Self ---------------------------------------------------------------
  {
    const [x, z] = REALMS.self.center;
    const crystal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 0),
      new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffb030, emissiveIntensity: 0.9, metalness: 0.4, roughness: 0.2, flatShading: true }),
    );
    crystal.position.set(x, 3.4, z);
    add(crystal);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.06, 8, 64), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    halo.position.copy(crystal.position);
    add(halo);
    const halo2 = halo.clone();
    add(halo2);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.4, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x7a5a28, metalness: 0.5, roughness: 0.4 }));
    plinth.position.set(x, 0.4, z);
    add(plinth);
    obstacles.push({ x, z, r: 2.3 });
    const glow = new THREE.PointLight(0xffc860, 40, 22, 1.5);
    glow.position.copy(crystal.position);
    add(glow);
    animated.push({
      update: (t) => {
        crystal.rotation.y = t * 0.4;
        crystal.rotation.x = Math.sin(t * 0.3) * 0.3;
        crystal.position.y = 3.4 + Math.sin(t * 1.2) * 0.2;
        halo.rotation.set(t * 0.5, t * 0.3, 0);
        halo2.rotation.set(-t * 0.4, 0, t * 0.6);
      },
    });
    // Four pillars at the cardinal points
    for (let i = 0; i < 4; i++) {
      // Cardinal points, clear of the diagonal bridges
      const a = (i / 4) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 5, 8), new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.6, roughness: 0.35 }));
      p.position.set(x + Math.cos(a) * 12, 2.5, z + Math.sin(a) * 12);
      add(p);
      obstacles.push({ x: p.position.x, z: p.position.z, r: 0.6 });
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
      flame.position.set(p.position.x, 5.6, p.position.z);
      add(flame);
      animated.push({ update: (t) => { flame.rotation.y = t * 2 + i; flame.position.y = 5.6 + Math.sin(t * 2 + i) * 0.15; } });
    }
    selfCrystal = crystal;
  }

  // --- The Ego ------------------------------------------------------------------
  {
    const [x, z] = REALMS.ego.center;
    const colMat = new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: 0.4 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      // Leave gaps where the bridges arrive
      const toSelf = Math.atan2(REALMS.self.center[1] - z, REALMS.self.center[0] - x);
      const toPers = Math.atan2(REALMS.personal.center[1] - z, REALMS.personal.center[0] - x);
      const gap = (b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.3;
      if (gap(toSelf) || gap(toPers)) continue;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 8, 16), colMat);
      col.position.set(x + Math.cos(a) * 18, 4, z + Math.sin(a) * 18);
      add(col);
      obstacles.push({ x: col.position.x, z: col.position.z, r: 0.7 });
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 1.8), colMat);
      cap.position.set(col.position.x, 8.2, col.position.z);
      add(cap);
    }
    // Floating geometric "thoughts" overhead: ordered, rational and bright
    for (let i = 0; i < 18; i++) {
      const geo = [new THREE.BoxGeometry(1, 1, 1), new THREE.TetrahedronGeometry(0.8), new THREE.OctahedronGeometry(0.7)][i % 3];
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x6ab8ff, emissiveIntensity: 0.5, metalness: 0.3, roughness: 0.2 }));
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 12;
      m.position.set(x + Math.cos(a) * r, 9 + Math.random() * 6, z + Math.sin(a) * r);
      add(m);
      const by = m.position.y, ph = Math.random() * 6, sp = 0.3 + Math.random() * 0.6;
      animated.push({ update: (t) => { m.rotation.x = t * sp; m.rotation.y = t * sp * 1.3; m.position.y = by + Math.sin(t * sp + ph) * 0.6; } });
    }
  }

  // --- The Personal Subconscious ---------------------------------------------
  {
    const [x, z] = REALMS.personal.center;
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6a4a7a, roughness: 0.8, emissive: 0x2a1040, emissiveIntensity: 0.6 });
    const makeDoor = () => {
      const g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.6, 0.25), woodMat);
      g.add(frame);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.0), new THREE.MeshBasicMaterial({ color: 0xffb8f0, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
      panel.position.z = 0.14;
      g.add(panel);
      return g;
    };
    const makeChair = () => {
      const g = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.15, 1), woodMat); seat.position.y = 0.9; g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1, 1.1, 0.12), woodMat); back.position.set(0, 1.5, -0.45); g.add(back);
      for (const [lx, lz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), woodMat); leg.position.set(lx, 0.45, lz); g.add(leg);
      }
      return g;
    };
    const makeClock = () => {
      const g = new THREE.Group();
      const face = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.15, 32), new THREE.MeshStandardMaterial({ color: 0xf0e0ff, emissive: 0x8040a0, emissiveIntensity: 0.5 }));
      face.rotation.x = Math.PI / 2; g.add(face);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.05), new THREE.MeshBasicMaterial({ color: 0x200030 }));
      hand.position.set(0, 0.35, 0.1); g.add(hand);
      g.userData.hand = hand;
      return g;
    };
    const makers = [makeDoor, makeChair, makeClock];
    for (let i = 0; i < 16; i++) {
      const obj = makers[i % 3]();
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3, r = 8 + Math.random() * 18;
      obj.position.set(x + Math.cos(a) * r, 3 + Math.random() * 8, z + Math.sin(a) * r);
      obj.rotation.set(Math.random() - 0.5, Math.random() * 6, Math.random() - 0.5);
      add(obj);
      const by = obj.position.y, ph = Math.random() * 6, sp = 0.2 + Math.random() * 0.3;
      animated.push({
        update: (t) => {
          obj.position.y = by + Math.sin(t * sp + ph) * 0.8;
          obj.rotation.y += 0.002;
          if (obj.userData.hand) obj.userData.hand.parent.rotation.z = -t * 0.6;
        },
      });
    }
    animated.push(makeMotes(scene, x, z, REALMS.personal.radius, 400, 0xe0a0ff, 0.5, 14));
  }

  // --- The Shadow ---------------------------------------------------------------
  {
    const [x, z] = REALMS.shadow.center;
    const obsMat = new THREE.MeshStandardMaterial({ color: 0x0a0505, roughness: 0.3, metalness: 0.7, flatShading: true });
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + Math.random() * 0.15;
      const toSelf = Math.atan2(REALMS.self.center[1] - z, REALMS.self.center[0] - x);
      const toColl = Math.atan2(REALMS.collective.center[1] - z, REALMS.collective.center[0] - x);
      const gap = (b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.28;
      if (gap(toSelf) || gap(toColl)) continue;
      const h = 4 + Math.random() * 9;
      const sr = 0.8 + Math.random() * 1.2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(sr, h, 5), obsMat);
      const r = 19.5 + Math.random() * 1.5;
      spike.position.set(x + Math.cos(a) * r, h / 2 - 0.3, z + Math.sin(a) * r);
      obstacles.push({ x: spike.position.x, z: spike.position.z, r: sr * 0.8 });
      spike.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4);
      add(spike);
    }
    // Hanging chains of dark orbs
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 10;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), new THREE.MeshStandardMaterial({ color: 0x110000, emissive: 0x880000, emissiveIntensity: 0.8 }));
      orb.position.set(x + Math.cos(a) * r, 8 + Math.random() * 4, z + Math.sin(a) * r);
      add(orb);
      const by = orb.position.y, ph = Math.random() * 6;
      animated.push({ update: (t) => { orb.position.y = by + Math.sin(t * 0.7 + ph); } });
    }
    animated.push(makeMotes(scene, x, z, REALMS.shadow.radius, 300, 0xff4020, 1.2, 12, true));
  }

  // --- The Collective Unconscious -----------------------------------------------
  {
    const [x, z] = REALMS.collective.center;
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(14 + i * 7, 0.15, 8, 128),
        new THREE.MeshBasicMaterial({ color: [0x5fe0ff, 0x9f7bff, 0xffd27a][i], transparent: true, opacity: 0.6 }),
      );
      ring.position.set(x, 20 + i * 4, z);
      add(ring);
      animated.push({ update: (t) => { ring.rotation.x = Math.PI / 2 + Math.sin(t * 0.1 + i) * 0.4; ring.rotation.z = t * (0.05 + i * 0.03); } });
    }
    // Ring of floating rocks: the ancient bedrock of the psyche
    const rockMat2 = new THREE.MeshStandardMaterial({ color: 0x30304a, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 26; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + Math.random() * 2.5, 0), rockMat2);
      const a = (i / 26) * Math.PI * 2, r = 40 + Math.random() * 12;
      rock.position.set(x + Math.cos(a) * r, -4 + Math.random() * 18, z + Math.sin(a) * r);
      add(rock);
      const by = rock.position.y, ph = Math.random() * 6;
      animated.push({ update: (t) => { rock.position.y = by + Math.sin(t * 0.25 + ph) * 1.5; rock.rotation.y = t * 0.1 + ph; } });
    }
  }

  // --- Starfield ------------------------------------------------------------------
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 3000; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(300 + Math.random() * 150);
    starPos.push(v.x, Math.abs(v.y) * 0.9 - 40, v.z);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xcfe6ff, size: 2.4, map: dotTexture(), depthWrite: false, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.5 });
  const stars = add(new THREE.Points(starGeo, starMat));

  // --- Atmosphere blending -----------------------------------------------------------
  const tmp = new THREE.Color();
  const fogCol = new THREE.Color(), skyCol = new THREE.Color(), groundCol = new THREE.Color();

  function updateAtmosphere(px, pz) {
    const w = realmWeights(px, pz);
    fogCol.setRGB(0, 0, 0); skyCol.setRGB(0, 0, 0); groundCol.setRGB(0, 0, 0);
    let density = 0;
    for (const r of REALM_LIST) {
      const k = w[r.id];
      fogCol.add(tmp.set(r.fog).multiplyScalar(k));
      skyCol.add(tmp.set(r.sky).multiplyScalar(k));
      groundCol.add(tmp.set(r.ground).multiplyScalar(k));
      density += r.fogDensity * k;
    }
    scene.fog.color.copy(fogCol);
    scene.fog.density = density;
    scene.background.copy(fogCol);
    hemi.color.copy(skyCol);
    hemi.groundColor.copy(groundCol);
    sun.intensity = 0.2 + w.ego * 1.2;
    starMat.opacity = 0.15 + w.collective * 0.85 + w.self * 0.3;
    stars.position.set(px * 0.9, 0, pz * 0.9);
    return w;
  }

  function update(t, dt) {
    for (const a of animated) a.update(t, dt);
  }

  return { update, updateAtmosphere, selfCrystal, obstacles };
}

let dot = null;
function dotTexture() {
  if (!dot) {
    dot = canvasTexture(64, (g, s) => {
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
    });
  }
  return dot;
}

// Drifting particle motes within a realm. `rising` makes them float upwards like embers.
function makeMotes(scene, cx, cz, radius, count, color, size, height, rising = false) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius;
    pos[i * 3] = cx + Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * height;
    pos[i * 3 + 2] = cz + Math.sin(a) * r;
    seeds[i] = Math.random() * 10;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size: size * 0.18, map: dotTexture(), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  return {
    update: (t, dt) => {
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        if (rising) {
          pos[i * 3 + 1] += dt * (0.6 + (s % 1));
          if (pos[i * 3 + 1] > height) pos[i * 3 + 1] = 0;
        } else {
          pos[i * 3 + 1] += Math.sin(t * 0.5 + s) * dt * 0.3;
        }
        pos[i * 3] += Math.sin(t * 0.3 + s * 3) * dt * 0.2;
        pos[i * 3 + 2] += Math.cos(t * 0.3 + s * 2) * dt * 0.2;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

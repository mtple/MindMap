// HUD, dialogue, overlays and minimap. All DOM work lives here.
import { REALMS, BRIDGES } from './data.js';

const $ = (id) => document.getElementById(id);

function toRoman(n) {
  const table = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, sym] of table) while (n >= v) { out += sym; n -= v; }
  return out;
}

export class UI {
  constructor() {
    this.el = {
      hud: $('hud'), overlay: $('overlay'), dialogue: $('dialogue'),
      speaker: $('dlg-speaker'), text: $('dlg-text'),
      realmBanner: $('realm-banner'), realmName: $('realm-name'), realmDesc: $('realm-desc'),
      pageCount: $('page-count'), journal: $('journal'), journalBody: $('journal-body'), prompt: $('prompt'), toast: $('toast'),
      hpFill: $('hp-fill'), hpText: $('hp-text'), enFill: $('en-fill'), enText: $('en-text'),
      lvl: $('lvl'), xpFill: $('xp-fill'), xpText: $('xp-text'),
      vignette: $('damage-vignette'), heal: $('heal-vignette'), minimap: $('minimap'),
      crosshair: $('crosshair'),
    };
    this.map = this.el.minimap.getContext('2d');
    this.dialogueQueue = null;
    this.toastTimer = null;
    this.bannerTimer = null;
    this.vignette = 0;
  }

  showHud(v) { this.el.hud.classList.toggle('hidden', !v); }

  overlay(html) {
    if (!html) { this.el.overlay.classList.add('hidden'); return; }
    this.el.overlay.innerHTML = html;
    this.el.overlay.classList.remove('hidden');
  }

  // --- Dialogue ---------------------------------------------------------------
  get inDialogue() { return !!this.dialogueQueue; }

  dialogue(lines, onDone) {
    this.dialogueQueue = { lines: lines.slice(), onDone };
    this.el.dialogue.classList.remove('hidden');
    this.advance();
  }

  advance() {
    const q = this.dialogueQueue;
    if (!q) return;
    if (this.typing) {
      // Finish the current line immediately
      clearInterval(this.typing);
      this.typing = null;
      this.el.text.textContent = this.currentLine;
      return;
    }
    const next = q.lines.shift();
    if (!next) {
      this.el.dialogue.classList.add('hidden');
      this.dialogueQueue = null;
      q.onDone && q.onDone();
      return;
    }
    const [speaker, text] = next;
    this.el.speaker.textContent = speaker;
    this.el.text.textContent = '';
    this.currentLine = text;
    let i = 0;
    this.typing = setInterval(() => {
      i += 2;
      this.el.text.textContent = text.slice(0, i);
      if (i % 6 === 0) this.onType && this.onType();
      if (i >= text.length) { clearInterval(this.typing); this.typing = null; }
    }, 16);
  }

  // --- Banners and toasts -------------------------------------------------------
  realm(realm) {
    this.el.realmName.textContent = realm.name;
    this.el.realmName.style.color = '#' + realm.color.toString(16).padStart(6, '0');
    this.el.realmDesc.textContent = realm.desc;
    this.el.realmBanner.classList.remove('show');
    void this.el.realmBanner.offsetWidth;
    this.el.realmBanner.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.el.realmBanner.classList.remove('show'), 5000);
  }

  toast(text, cls = '') {
    const t = this.el.toast;
    t.textContent = text;
    t.className = 'show ' + cls;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { t.className = ''; }, 3200);
  }

  prompt(text) {
    this.el.prompt.textContent = text || '';
    this.el.prompt.classList.toggle('show', !!text);
  }

  // --- The Red Book -------------------------------------------------------------
  pageCount(n, total) {
    this.el.pageCount.textContent = `${n} / ${total}`;
  }

  get journalOpen() { return !this.el.journal.classList.contains('hidden'); }

  journal(open, pages, total) {
    this.el.journal.classList.toggle('hidden', !open);
    if (!open) return;
    const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    const body = pages.length
      ? pages.map((p, i) => `<article><h4><span>${toRoman(i + 1)}</span>${esc(p.title)}</h4><p>${esc(p.text)}</p></article>`).reverse().join('')
      : '<p class="empty">The pages are blank. Go and see what the psyche shows you.</p>';
    this.el.journalBody.innerHTML = `<p class="count">${pages.length} of ${total} pages written. There is no last page.</p>${body}`;
  }

  // --- Stats --------------------------------------------------------------------
  stats(p) {
    this.el.hpFill.style.width = (100 * p.hp / p.maxHp) + '%';
    this.el.hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    this.el.enFill.style.width = (100 * p.en / p.maxEn) + '%';
    this.el.enText.textContent = `${Math.floor(p.en)} / ${p.maxEn}`;
    this.el.lvl.textContent = p.level;
    this.el.xpFill.style.width = (100 * p.xp / p.xpNext) + '%';
    this.el.xpText.textContent = `${p.xp} / ${p.xpNext} XP`;
  }

  hurt() { this.vignette = 1; }

  frame(dt, healing) {
    this.vignette = Math.max(0, this.vignette - dt * 2.5);
    this.el.vignette.style.opacity = this.vignette;
    this.el.heal.style.opacity = healing ? 1 : 0;
  }

  // --- Minimap --------------------------------------------------------------------
  minimap(player, enemies, markers) {
    const g = this.map;
    const S = this.el.minimap.width;
    const scale = S / 320;
    // Centre the map on the middle of the world (roughly the Self)
    const ox = 0, oz = 3;
    const tx = (x) => S / 2 + (x - ox) * scale;
    const tz = (z) => S / 2 + (z - oz) * scale;
    g.clearRect(0, 0, S, S);
    g.fillStyle = 'rgba(8,6,16,0.75)';
    g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();

    g.lineCap = 'round';
    for (const [a, b] of BRIDGES) {
      const A = REALMS[a].center, B = REALMS[b].center;
      g.strokeStyle = 'rgba(200,190,230,0.45)';
      g.lineWidth = 6 * scale;
      g.beginPath(); g.moveTo(tx(A[0]), tz(A[1])); g.lineTo(tx(B[0]), tz(B[1])); g.stroke();
    }
    for (const r of Object.values(REALMS)) {
      const col = '#' + r.color.toString(16).padStart(6, '0');
      g.fillStyle = col + '33';
      g.strokeStyle = col;
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(tx(r.center[0]), tz(r.center[1]), r.radius * scale, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    for (const m of markers) {
      g.fillStyle = m.color;
      g.beginPath(); g.arc(tx(m.x), tz(m.z), m.size || 2.5, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = '#ff4040';
    for (const e of enemies) {
      if (!e.alive) continue;
      g.beginPath(); g.arc(tx(e.pos.x), tz(e.pos.z), 1.8, 0, Math.PI * 2); g.fill();
    }
    // Player arrow
    const px = tx(player.pos.x), pz = tz(player.pos.z);
    g.save();
    g.translate(px, pz);
    g.rotate(-player.yaw);
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(0, -7); g.lineTo(4.5, 5); g.lineTo(0, 2.5); g.lineTo(-4.5, 5); g.closePath(); g.fill();
    g.restore();
  }
}

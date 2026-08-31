/**
 * BroomSweep — vanilla JS, no dependencies.
 * Click the broom -> it sweeps forward/back twice over 1.5 s (mostly translation,
 * a tiny tilt), a dust pile appears and is swept away on each pass, plus dust puffs.
 *
 *   const broom = new BroomSweep({ stage, arm, dustA, dustB, puffs });
 *   broom.start();  broom.destroy();
 */
const PIVOT = { x: 470, y: 24 };   // hand at the end of the handle, in stage coords
const ARM   = { x: -177, y: 269 }; // pivot -> bristle tip

class BroomSweep {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({
      duration: 1.5,   // s, whole animation
      sweeps: 2,       // passes per click
      travel: 20,      // px forward/back translation at full phase
      swing: 4,        // deg tilt at full phase (deliberately small)
      dust: true,
      interactive: true,
    }, options);
    this.anim = null;
    this.puffList = [];
    const n = this.puffs ? this.puffs.children.length : 0;
    for (let i = 0; i < n; i++) this.puffList.push({ life: 0, ttl: 0, x: 0, y: 0, vx: 0, vy: 0, sc: 1, grow: 1 });
    this.reset();
    if (this.o.interactive) {
      this._click = () => this.start();
      (this.stage || this.arm).addEventListener('click', this._click);
    }
    this._loop = (t) => {
      const now = t / 1000;
      const dt = Math.min(0.05, this.last ? now - this.last : 0.016);
      this.last = now;
      if (this.anim) this.tick(now, dt);
      this.raf = requestAnimationFrame(this._loop);
    };
    this.raf = requestAnimationFrame(this._loop);
  }

  start() {
    if (this.anim) return;
    this.anim = Object.assign(this.build(), { start: performance.now() / 1000 });
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    if (this._click) (this.stage || this.arm).removeEventListener('click', this._click);
  }

  reset() {
    if (this.arm) this.arm.style.transform = 'translate(0px,0px) rotate(0deg)';
    this.setDust(this.dustA, 0, 0);
    this.setDust(this.dustB, 0, 0);
    if (this.puffs) for (const el of this.puffs.children) el.style.opacity = 0;
    for (const p of this.puffList) p.life = p.ttl = 0;
  }

  setDust(el, op, push) {
    if (!el) return;
    el.style.opacity = op.toFixed(3);
    el.style.transform = 'translate(' + (-push * 70).toFixed(1) + 'px,' + (push * -10).toFixed(1) +
      'px) scale(' + (1 + push * 0.25).toFixed(3) + ')';
  }

  /** Phase keys: a = -1 forward (left) .. +1 back (right). Times are fractions of duration. */
  build() {
    const { duration, sweeps } = this.o;
    const keys = [{ t: 0, a: 0 }];
    const windows = [];
    let t = 0.14;
    keys.push({ t, a: 1, ease: 'out' });                        // wind back
    for (let i = 0; i < sweeps; i++) {
      const t0 = t;
      t += 0.18;
      keys.push({ t, a: -1, ease: 'inout' });                   // sweep forward
      windows.push([t0 + 0.05, t]);                             // dust-emitting window
      if (i < sweeps - 1) { t += 0.15; keys.push({ t, a: 1, ease: 'inout' }); }
    }
    t += 0.12;
    keys.push({ t, a: -0.3, ease: 'out' });
    keys.push({ t: 1, a: 0, ease: 'out' });
    for (const k of keys) k.t *= duration;
    for (const w of windows) { w[0] *= duration; w[1] *= duration; }
    // dust piles: layer 0 for odd sweeps, layer 1 for even; each appears, then is swept away
    const events = [[], []];
    windows.forEach((w, i) => {
      events[i % 2].push({
        appear: i === 0 ? 0 : windows[i - 1][1] + 0.05 * duration,
        hit: w[0] + 0.03,
      });
    });
    return { keys, windows, events, dur: duration };
  }

  tick(now, dt) {
    const A = this.anim;
    const t = now - A.start;
    let a = A.keys[A.keys.length - 1].a;
    for (let i = 1; i < A.keys.length; i++) {
      const k0 = A.keys[i - 1], k1 = A.keys[i];
      if (t <= k1.t) {
        const p = Math.max(0, Math.min(1, (t - k0.t) / (k1.t - k0.t)));
        const e = k1.ease === 'inout' ? (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
          : k1.ease === 'in' ? Math.pow(p, 2.3)
          : 1 - Math.pow(1 - p, 2.6);
        a = k0.a + (k1.a - k0.a) * e;
        break;
      }
    }
    const tx = -a * this.o.travel, ty = Math.abs(a) * 3;
    this.tx = tx;
    if (this.arm) {
      this.arm.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) +
        'px) rotate(' + (a * this.o.swing).toFixed(2) + 'deg)';
    }
    if (this.o.dust) {
      this.dustLayer(this.dustA, A.events[0], t);
      this.dustLayer(this.dustB, A.events[1], t);
      this.puffTick(a, t, dt, A.windows);
    }
    if (t >= A.dur + 0.6) { this.anim = null; this.reset(); }
  }

  dustLayer(el, events, t) {
    if (!el) return;
    let ev = null;
    for (const e of events) if (t >= e.appear) ev = e;
    if (!ev) { this.setDust(el, 0, 0); return; }
    const fin = Math.min(1, (t - ev.appear) / 0.16);
    if (ev.hit === null || t < ev.hit) { this.setDust(el, fin, 0); return; }
    const k = Math.min(1, (t - ev.hit) / 0.24);
    this.setDust(el, fin * Math.pow(1 - k, 1.4), 1 - Math.pow(1 - k, 2));
  }

  tip(a) {
    const r = a * this.o.swing * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return {
      x: PIVOT.x + ARM.x * c - ARM.y * s + (this.tx || 0),
      y: PIVOT.y + ARM.x * s + ARM.y * c,
    };
  }

  puffTick(a, t, dt, windows) {
    if (!this.puffs) return;
    if (windows.some((w) => t >= w[0] && t <= w[1])) {
      this.emit = (this.emit || 0) + dt * 40;
      const tip = this.tip(a);
      while (this.emit >= 1) {
        this.emit -= 1;
        const p = this.puffList.find((q) => q.life >= q.ttl);
        if (!p) break;
        p.x = tip.x - 10 + (Math.random() - 0.5) * 30;
        p.y = tip.y - 6 + (Math.random() - 0.5) * 20;
        p.vx = -(110 + Math.random() * 190);
        p.vy = -(25 + Math.random() * 95);
        p.sc = 0.45 + Math.random() * 0.45;
        p.grow = 0.7 + Math.random() * 0.9;
        p.ttl = 0.45 + Math.random() * 0.35;
        p.life = 0;
      }
    }
    let i = 0;
    for (const el of this.puffs.children) {
      const p = this.puffList[i++];
      if (!p || p.life >= p.ttl) { el.style.opacity = 0; continue; }
      p.life += dt;
      p.vx *= Math.pow(0.25, dt);       // air drag
      p.vy += 120 * dt;                 // gentle gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.life / p.ttl;
      el.style.opacity = (Math.min(1, (1 - k) * 1.7) * 0.72).toFixed(3);
      el.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) +
        'px) scale(' + (p.sc + p.grow * k).toFixed(3) + ')';
    }
  }
}

if (typeof module !== 'undefined') module.exports = { BroomSweep };
if (typeof window !== 'undefined') window.BroomSweep = BroomSweep;

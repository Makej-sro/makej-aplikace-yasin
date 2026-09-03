/**
 * DoghouseFeed — vanilla JS, no dependencies.
 * A doghouse icon. Click it: a bag of dog food drops in from above and lands in front
 * of the house on the right (squash-and-settle), and big red hearts float up above the
 * roof. Everything resets afterwards.
 *
 *   const feed = new DoghouseFeed({
 *     stage:  document.querySelector('#stage'),
 *     bag:    document.querySelector('#bag'),
 *     hearts: document.querySelector('#hearts'),   // container of 8 heart divs
 *   }, { fall: 0.25, stay: 1.5, hearts: 4, lift: 2 });
 *   feed.feed();  feed.destroy();
 */
class DoghouseFeed {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({
      fall: 0.25,     // s the bag falls
      stay: 1.5,      // s the bag stays (hearts rise during this)
      hearts: 4,      // hearts per second
      lift: 2,        // heart rise-speed multiplier
      dropFrom: -320, // px above its resting spot
      interactive: true,
    }, options);
    this.pool = [];
    const n = this.hearts ? this.hearts.children.length : 0;
    for (let i = 0; i < n; i++) this.pool.push({ life: 0, ttl: 0, x: 0, y: 0, vx: 0, vy: 0, sc: 1, seed: Math.random() * 9 });
    this.anim = null;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.feed();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  reset() {
    if (this.bag) { this.bag.style.opacity = 0; this.bag.style.transform = 'translateY(' + this.o.dropFrom + 'px)'; }
    if (this.hearts) for (const el of this.hearts.children) el.style.opacity = 0;
    for (const h of this.pool) { h.life = 0; h.ttl = 0; }
  }

  feed() {
    this.reset();
    const { fall, stay } = this.o;
    this.anim = { start: performance.now() / 1000, fall, stay, dur: fall + stay + 0.6 };
    this.run();
  }

  run() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.last = 0;
    const loop = (t) => {
      const A = this.anim;
      if (!A) { this.raf = 0; return; }
      const now = t / 1000;
      const dt = Math.min(0.04, this.last ? now - this.last : 0.016);
      this.last = now;
      const el = now - A.start;
      this.tick(el, dt, A);
      if (el >= A.dur) { this.anim = null; this.raf = 0; this.reset(); return; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  tick(t, dt, A) {
    const clamp = (v) => Math.max(0, Math.min(1, v));
    const H = this.o.dropFrom;

    // bag: accelerating fall, then a damped squash on landing
    if (this.bag) {
      let y, sx = 1, sy = 1, rot = 0;
      if (t < A.fall) {
        const p = clamp(t / A.fall);
        y = H - H * p * p;
        rot = -7 + 7 * p;
      } else {
        const d = t - A.fall;
        y = 0;
        const k = Math.max(0, 1 - d / 0.42);
        sy = 1 - 0.16 * k * Math.cos(d * 26);
        sx = 1 + 0.14 * k * Math.cos(d * 26);
        rot = 3 * k * Math.sin(d * 22);
      }
      const out = t > A.fall + A.stay ? clamp((t - A.fall - A.stay) / 0.5) : 0;
      this.bag.style.opacity = (t > 0.02 ? 1 - out : 0).toFixed(3);
      this.bag.style.transform = 'translateY(' + y.toFixed(1) + 'px) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) +
        ') rotate(' + rot.toFixed(2) + 'deg)';
    }

    // hearts above the roof
    if (t > A.fall - 0.05 && t < A.fall + A.stay) {
      this.emit = (this.emit || 0) + dt * this.o.hearts;
      while (this.emit >= 1) {
        this.emit -= 1;
        const h = this.pool.find((q) => q.life >= q.ttl);
        if (!h) break;
        h.x = 170 + Math.random() * 170;
        h.y = 118 + Math.random() * 28;
        h.vx = (Math.random() - 0.5) * 28;
        h.vy = -(48 + Math.random() * 34) * this.o.lift;
        h.sc = 0.9 + Math.random() * 0.6;
        h.ttl = 1.2 + Math.random() * 0.5;
        h.life = 0;
        h.seed = Math.random() * 9;
      }
    }
    let i = 0;
    if (this.hearts) for (const el of this.hearts.children) {
      const h = this.pool[i++];
      if (!h || h.life >= h.ttl) { el.style.opacity = 0; continue; }
      h.life += dt;
      h.x += (h.vx + Math.sin(h.life * 3.2 + h.seed) * 20) * dt;   // sideways sway
      h.y += h.vy * dt;
      const k = h.life / h.ttl;
      el.style.opacity = (Math.min(1, k * 6) * Math.pow(1 - k, 0.9)).toFixed(3);
      el.style.transform = 'translate(' + h.x.toFixed(1) + 'px,' + h.y.toFixed(1) + 'px) scale(' +
        (h.sc * (0.75 + 0.45 * k)).toFixed(3) + ') rotate(' + (Math.sin(h.life * 2.4 + h.seed) * 12).toFixed(1) + 'deg)';
    }
  }
}

if (typeof module !== 'undefined') module.exports = { DoghouseFeed };
if (typeof window !== 'undefined') window.DoghouseFeed = DoghouseFeed;

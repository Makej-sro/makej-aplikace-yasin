/**
 * SproutWater — vanilla JS, no dependencies.
 * Click the sprout -> water drops fall straight down over the whole plant for 1.5 s;
 * every drop that reaches the soil gives the plant a small elastic nudge.
 *
 *   const w = new SproutWater({
 *     stage: document.querySelector('#stage'),
 *     plant: document.querySelector('#plant'),
 *     drops: document.querySelector('#drops'),   // container of 16 drop divs
 *   }, { duration: 1.5, rate: 20 });
 *   w.water();  w.destroy();
 */
class SproutWater {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({
      duration: 1.5,   // s per click
      rate: 20,        // drops per second
      spawnX: [150, 370],   // horizontal band the drops spawn in (stage px)
      top: -20,        // spawn height above the stage
      land: 352,       // soil level (stage px)
      interactive: true,
    }, options);
    this.anim = null;
    this.pool = [];
    const n = this.drops ? this.drops.children.length : 0;
    for (let i = 0; i < n; i++) this.pool.push({ live: false, x: 0, y: 0, vx: 0, vy: 0 });
    this.wob = 0; this.wobV = 0;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.water();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  reset() {
    if (this.plant) this.plant.style.transform = 'rotate(0deg) scaleY(1)';
    if (this.drops) for (const el of this.drops.children) el.style.opacity = 0;
    for (const d of this.pool) d.live = false;
    this.wob = 0; this.wobV = 0;
  }

  water() {
    this.reset();
    this.anim = { start: performance.now() / 1000, dur: this.o.duration };
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
      this.tick(el, dt);
      if (el >= A.dur + 0.7) { this.anim = null; this.raf = 0; this.reset(); return; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  tick(t, dt) {
    const { duration: D, rate, spawnX, top, land } = this.o;
    // emit while the shower runs; it stops at 86 % so the last drops can land
    if (t < 0.86 * D) {
      this.emit = (this.emit || 0) + dt * rate;
      while (this.emit >= 1) {
        this.emit -= 1;
        const d = this.pool.find((q) => !q.live);
        if (!d) break;
        d.live = true;
        d.x = spawnX[0] + Math.random() * (spawnX[1] - spawnX[0]);
        d.y = top - Math.random() * 40;
        d.vx = (Math.random() - 0.5) * 16;
        d.vy = 120 + Math.random() * 90;
      }
    }
    let i = 0;
    if (this.drops) for (const el of this.drops.children) {
      const d = this.pool[i++];
      if (!d || !d.live) { el.style.opacity = 0; continue; }
      d.vy += 1500 * dt;                       // gravity
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.y >= land + Math.random() * 10) {  // jittered soil line
        d.live = false;
        el.style.opacity = 0;
        this.wobV -= 24;                       // impact nudges the plant
        continue;
      }
      el.style.opacity = 1;
      el.style.transform = 'translate(' + d.x.toFixed(1) + 'px,' + d.y.toFixed(1) +
        'px) scaleY(' + (1 + Math.min(0.6, d.vy / 900)).toFixed(2) + ')';   // stretch with speed
    }
    // damped spring: plant sways from the accumulated impacts
    this.wobV += (-this.wob * 190 - this.wobV * 9) * dt;
    this.wob += this.wobV * dt;
    if (this.plant) {
      this.plant.style.transform = 'rotate(' + (this.wob * 0.06).toFixed(3) +
        'deg) scaleY(' + (1 + this.wob * 0.0012).toFixed(4) + ')';
    }
  }
}

if (typeof module !== 'undefined') module.exports = { SproutWater };
if (typeof window !== 'undefined') window.SproutWater = SproutWater;

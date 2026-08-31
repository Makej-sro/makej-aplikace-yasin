/**
 * DrillVibrate — vanilla JS, no dependencies.
 * Click the drill icon -> motor spins up, the tool vibrates and pushes
 * slightly forward, then winds down. Default run: 1.5 s.
 *
 *   const drill = new DrillVibrate(document.querySelector('#drill'), { duration: 1.5 });
 *   drill.start();     // trigger programmatically
 *   drill.destroy();
 */
class DrillVibrate {
  constructor(el, options = {}) {
    this.el = el;                                  // the <img> / element that shakes
    this.o = Object.assign({
      duration: 1.5,       // s
      power: 1,            // vibration amplitude multiplier
      push: 11,            // px forward travel at full power
      trigger: el,         // element that receives the click
      interactive: true,
    }, options);
    this.anim = null;
    this.reset();
    if (this.o.interactive) {
      this._click = () => this.start();
      this.o.trigger.addEventListener('click', this._click);
    }
    this._loop = (t) => {
      if (this.anim) this.tick(t / 1000);
      this.raf = requestAnimationFrame(this._loop);
    };
    this.raf = requestAnimationFrame(this._loop);
  }

  start() {
    if (this.anim) return;                          // ignore clicks while running
    this.anim = { start: performance.now() / 1000, dur: this.o.duration };
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    if (this._click) this.o.trigger.removeEventListener('click', this._click);
  }

  reset() { this.el.style.transform = 'translate(0px,0px) rotate(0deg)'; }

  /** 0 -> 1 -> 0 envelope: spin-up (first 18 %), full power, wind-down (last 18 %). */
  env(p) {
    if (p < 0.18) return Math.pow(p / 0.18, 1.6);
    if (p > 0.82) return Math.pow((1 - p) / 0.18, 1.2);
    return 1;
  }

  tick(now) {
    const t = now - this.anim.start;
    const p = Math.min(1, t / this.anim.dur);
    const e = this.env(p) * this.o.power;
    const T = t * 1000;
    // two detuned sines per axis => busy, non-repeating shake; slow roll on top
    const jx = e * (Math.sin(T * 0.19) * 1.7 + Math.sin(T * 0.41 + 1.7) * 1.1);
    const jy = e * (Math.sin(T * 0.23 + 0.6) * 1.5 + Math.sin(T * 0.53) * 0.9);
    const rz = e * Math.sin(T * 0.12) * 0.9;
    const push = e * this.o.push;
    this.el.style.transform =
      'translate(' + (jx + push).toFixed(2) + 'px,' + jy.toFixed(2) + 'px) rotate(' + rz.toFixed(2) + 'deg)';
    if (p >= 1) { this.anim = null; this.reset(); }
  }
}

if (typeof module !== 'undefined') module.exports = { DrillVibrate };
if (typeof window !== 'undefined') window.DrillVibrate = DrillVibrate;

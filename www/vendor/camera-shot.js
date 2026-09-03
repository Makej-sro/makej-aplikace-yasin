/**
 * CameraShot — vanilla JS, no dependencies.
 * Click the camera icon: the red LED blinks fast (~0.85 s), then the shot fires —
 * a short white flash over the scene, a bright glow on the lens, a weaker echo flash,
 * and a tiny scale "click" of the whole camera.
 *
 *   const cam = new CameraShot({
 *     stage: document.querySelector('#stage'),
 *     cam:   document.querySelector('#cam'),
 *     led:   document.querySelector('#led'),
 *     glow:  document.querySelector('#glow'),
 *     flash: document.querySelector('#flash'),
 *   }, { blink: 0.85, rate: 7, flash: 0.9 });
 *   cam.shoot();  cam.destroy();
 */
class CameraShot {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({
      blink: 0.85,   // s the LED blinks before the shot
      rate: 7,       // blinks per second
      flash: 0.9,    // flash strength 0..1
      interactive: true,
    }, options);
    this.anim = null;
    this.reset();
    if (this.o.interactive && this.stage) {
      this._tap = () => this.shoot();
      this.stage.addEventListener('click', this._tap);
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this._tap && this.stage) this.stage.removeEventListener('click', this._tap);
  }

  reset() {
    if (this.cam) this.cam.style.transform = 'scale(1)';
    for (const el of [this.led, this.glow, this.flash]) if (el) el.style.opacity = 0;
    if (this.led) this.led.style.boxShadow = 'none';
  }

  shoot() {
    this.reset();
    const blink = this.o.blink;
    this.anim = { start: performance.now() / 1000, blink, snap: blink + 0.1, dur: blink + 1.0 };
    this.run();
  }

  run() {
    if (this.raf) cancelAnimationFrame(this.raf);
    const loop = (t) => {
      const A = this.anim;
      if (!A) { this.raf = 0; return; }
      const el = t / 1000 - A.start;
      this.tick(el, A);
      if (el >= A.dur) { this.anim = null; this.raf = 0; this.reset(); return; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  tick(t, A) {
    // 1) LED blinks on its exact spot (square wave, plus a glow while lit)
    if (this.led) {
      const op = t < A.blink ? (((t * this.o.rate) % 1) < 0.5 ? 1 : 0) : 0;
      this.led.style.opacity = op.toFixed(3);
      this.led.style.boxShadow = op > 0.5 ? '0 0 16px 5px rgba(255,59,79,0.55)' : 'none';
    }

    // 2) flash: sharp rise, longer fall, then a weaker echo 0.16 s later
    const f = t - A.snap;
    const pulse = (d, up, down, amp) => d < 0 ? 0 : d < up ? amp * (d / up) : amp * Math.max(0, 1 - (d - up) / down);
    const level = Math.max(pulse(f, 0.035, 0.22, this.o.flash),
                           pulse(f - 0.16, 0.03, 0.14, this.o.flash * 0.4));
    if (this.flash) this.flash.style.opacity = (level * 0.85).toFixed(3);
    if (this.glow) this.glow.style.opacity = Math.min(1, level * 1.25).toFixed(3);

    // 3) the body barely flinches at exposure
    if (this.cam) {
      const k = pulse(f, 0.03, 0.16, 1);
      this.cam.style.transform = 'scale(' + (1 - k * 0.012).toFixed(4) + ')';
    }
  }
}

if (typeof module !== 'undefined') module.exports = { CameraShot };
if (typeof window !== 'undefined') window.CameraShot = CameraShot;

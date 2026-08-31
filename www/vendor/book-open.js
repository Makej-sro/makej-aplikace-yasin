/**
 * BookOpen — vanilla JS, no dependencies.
 * A closed book that opens in real 3D when clicked: the front cover + right page
 * are ONE leaf hinged at the spine, rotating from -180deg (closed) to 0deg (open).
 * The leaf's front face is the right page cut out of the icon, its back face is the
 * orange cover; the faces swap exactly when the leaf is edge-on, so the swap is invisible.
 * Click again to close.
 *
 *   const book = new BookOpen({
 *     stage: document.querySelector('#stage'),
 *     scene: document.querySelector('#scene'),
 *     base:  document.querySelector('#base'),    // book-base.png (inside of the open book)
 *     block: document.querySelector('#block'),   // closed-book page block
 *     leaf:  document.querySelector('#leaf'),
 *     front: document.querySelector('#front'),
 *     back:  document.querySelector('#back'),
 *     shadeFront: document.querySelector('#shadeFront'),
 *     shadeBack:  document.querySelector('#shadeBack'),
 *   }, { duration: 0.9 });
 *   book.toggle();  book.destroy();
 */
class BookOpen {
  constructor(refs, options = {}) {
    Object.assign(this, refs);
    this.o = Object.assign({
      duration: 0.9,    // s for a full open or close
      openAngle: 180,   // deg the cover travels
      toggle: true,     // false = always open
    }, options);
    this.p = 0;         // 0 closed .. 1 open
    this.anim = null;
    this.draw(0);
    this._tap = () => this.toggle();
    if (this.stage) this.stage.addEventListener('click', this._tap);
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.stage && this._tap) this.stage.removeEventListener('click', this._tap);
  }

  toggle() {
    const from = this.p;
    const to = this.o.toggle ? (from > 0.5 ? 0 : 1) : 1;
    // a click mid-animation reverses it, scaled so the reversal is not sluggish
    const dur = this.o.duration * Math.max(0.35, Math.abs(to - from));
    this.anim = { start: performance.now() / 1000, dur, from, to };
    this.run();
  }

  run() {
    if (this.raf) cancelAnimationFrame(this.raf);
    const loop = (t) => {
      const A = this.anim;
      if (!A) { this.raf = 0; return; }
      const k = Math.min(1, (t / 1000 - A.start) / A.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   // smooth cubic in/out
      this.p = A.from + (A.to - A.from) * e;
      this.draw(this.p);
      if (k >= 1) { this.p = A.to; this.draw(this.p); this.anim = null; this.raf = 0; return; }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** p: 0 = closed, 1 = open. */
  draw(p) {
    const A = this.o.openAngle;
    const th = -A + A * p;                       // cover angle
    const abs = Math.abs(th);
    const clamp = (v) => Math.max(0, Math.min(1, v));

    if (this.leaf) this.leaf.style.transform = 'rotateY(' + th.toFixed(2) + 'deg)';
    // which side of the leaf faces the viewer — driven via display:none (ne visibility),
    // aby odvrácená strana nebyla vůbec v renderu a nemohla na první frame prosvítnout.
    // Přední (krémová) strana navíc plynule nabíhá až když se list přetočí přes hranu (abs<90) —
    // při kliku je opacity 0, takže stránka nemůže probleknout hned, objeví se AŽ při otevírání.
    if (this.front) {
      const show = abs < 90;
      this.front.style.display = show ? 'block' : 'none';
      this.front.style.opacity = show ? clamp((90 - abs) / 24).toFixed(3) : '0';
    }
    if (this.back) this.back.style.display = abs >= 90 ? 'block' : 'none';
    // closed book sits on the left half; the scene centres itself as it opens
    if (this.scene) this.scene.style.transform = 'translateX(' + (89 * (1 - p)).toFixed(2) + 'px)';
    // inside of the book crossfades with the closed block while the leaf is edge-on
    if (this.base) this.base.style.opacity = clamp((96 - abs) / 12).toFixed(3);
    if (this.block) this.block.style.opacity = clamp((abs - 84) / 12).toFixed(3);
    // paper shading through the turn
    const sh = Math.sin(abs * Math.PI / 180);
    if (this.shadeFront) this.shadeFront.style.opacity = (sh * 0.3).toFixed(3);
    if (this.shadeBack) this.shadeBack.style.opacity = (sh * 0.22).toFixed(3);
  }
}

if (typeof module !== 'undefined') module.exports = { BookOpen };
if (typeof window !== 'undefined') window.BookOpen = BookOpen;

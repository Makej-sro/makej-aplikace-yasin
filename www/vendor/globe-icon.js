/**
 * GlobeIcon — vanilla JS, no dependencies.
 * Flat-icon Earth rendered as a real 3D sphere on a <canvas>.
 * Click = exactly one revolution in `duration` seconds (slow -> fast -> slow),
 * always landing back on the starting view. Drag = manual rotation with inertia.
 *
 *   const globe = new GlobeIcon(document.querySelector('canvas'), { size: 320 });
 *   globe.spin();      // trigger the animation programmatically
 *   globe.destroy();   // remove listeners + stop the RAF loop
 */
class GlobeIcon {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.o = Object.assign({
      size: 320,          // px (CSS)
      duration: 1.5,      // s per click-revolution
      tilt: 23.4,         // deg axial tilt
      home: 0.055,        // start rotation in turns (0.055 = Africa + Europe facing front)
      grid: false,        // show graticule
      interactive: true,  // click to spin / drag to rotate
      ocean: '#189aec',
      oceanDeep: '#0f8ae0',
      land: '#90dd86',
      landEdge: '#7ed07f',
    }, options);
    this.rot = this.o.home;
    this.vel = 0;
    this.spinAnim = null;
    this.drag = null;
    this.build();
    if (this.o.interactive) this.bind();
    this.loop = (t) => {
      const dt = Math.min(0.05, this.last ? (t - this.last) / 1000 : 0.016);
      this.last = t;
      this.step(dt);
      this.paint();
      this.raf = requestAnimationFrame(this.loop);
    };
    this.raf = requestAnimationFrame(this.loop);
  }

  /** One full revolution, ending on the home view. */
  spin() {
    this.vel = 0;
    const end = this.o.home + Math.ceil(this.rot - this.o.home + 0.999);
    this.spinAnim = { from: this.rot, span: end - this.rot, t: 0, dur: this.o.duration };
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    if (!this._bound) return;
    this.canvas.removeEventListener('pointerdown', this._down);
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
  }

  bind() {
    this._down = (e) => {
      this.canvas.setPointerCapture && this.canvas.setPointerCapture(e.pointerId);
      this.drag = { x: e.clientX, t: performance.now(), moved: 0, vel: 0 };
    };
    this._move = (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x;
      this.rot -= dx / (this.o.size * 1.6);
      this.drag.vel = -dx / (this.o.size * 1.6) / Math.max(0.008, (performance.now() - this.drag.t) / 1000);
      this.drag.x = e.clientX;
      this.drag.t = performance.now();
      this.drag.moved += Math.abs(dx);
    };
    this._up = () => {
      if (!this.drag) return;
      const d = this.drag; this.drag = null;
      if (d.moved < 4) this.spin();                                  // treated as a click
      else this.vel = Math.max(-1.2, Math.min(1.2, d.vel || 0));     // fling
    };
    this.canvas.addEventListener('pointerdown', this._down);
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    this._bound = true;
  }

  step(dt) {
    if (this.drag) return;
    if (this.spinAnim) {
      const s = this.spinAnim;
      s.t += dt;
      const p = Math.min(1, s.t / s.dur);
      // ease: slow start (pow 2.3) -> peak at 55% -> decelerate (pow 2.0) -> stop
      const e = p < 0.55
        ? 0.5 * Math.pow(p / 0.55, 2.3)
        : 1 - 0.5 * Math.pow((1 - p) / 0.45, 2.0);
      this.rot = s.from + e * s.span;
      if (p >= 1) { this.rot = s.from + s.span; this.spinAnim = null; }
      return;
    }
    if (this.vel !== 0) {
      this.vel *= Math.pow(0.06, dt);      // inertia decay
      if (Math.abs(this.vel) < 0.004) this.vel = 0;
      this.rot += this.vel * dt;
    }
  }

  /** Equirectangular land texture (1024x512) baked once into flat RGB arrays. */
  makeTexture() {
    const W = 1024, H = 512;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = this.o.ocean; g.fillRect(0, 0, W, H);
    g.fillStyle = this.o.oceanDeep; g.globalAlpha = 0.5;
    g.fillRect(0, 0, W, H * 0.12); g.fillRect(0, H * 0.88, W, H * 0.12);
    g.globalAlpha = 1;

    // coarse continent outlines as flat [lon, lat, lon, lat, ...] rings
    const land = [
      // Africa
      [-17,14,-16,12,-13,9,-8,5,-3,5,3,6,9,4,9,2,13,-5,12,-6,13,-11,12,-17,15,-22,17,-28,18,-32,20,-34.8,25,-34,30,-31,32,-28,33,-26,35,-22,40,-16,40,-11,42,-5,45,-2,51,-1,51,4,48,8,43,11,43,12,39,15,37,20,34,28,32,31,25,32,19,30,13,33,10,37,3,36,-2,35,-6,36,-10,32,-13,28,-16,22,-17,18],
      // Eurasia
      [-9,43,-9,39,-6,37,0,39,3,42,8,44,12,45,15,42,18,40,21,37,24,35,27,37,30,36,33,36,36,36,36,33,35,31,34,28,38,25,43,22,48,18,52,16,56,20,58,24,61,25,66,25,70,21,73,16,77,8,80,10,83,17,87,21,90,22,94,18,98,14,100,10,104,10,105,14,108,17,107,21,110,21,113,22,117,24,121,30,122,35,126,38,129,42,132,44,135,48,140,52,143,57,150,60,157,61,163,62,170,63,176,65,180,66,180,72,170,70,160,71,150,73,140,74,130,74,120,74,110,76,100,76,90,75,80,73,70,72,60,70,55,68,50,68,45,66,40,66,35,65,30,67,28,70,25,70,20,70,15,68,12,65,10,63,8,58,5,58,7,55,4,53,0,51,-2,49,-4,48],
      // North America
      [-168,66,-165,60,-160,58,-152,58,-145,60,-138,58,-130,54,-124,48,-124,40,-120,34,-114,30,-110,24,-105,20,-97,16,-92,15,-87,13,-83,9,-79,9,-77,7,-82,15,-86,21,-90,21,-95,26,-97,28,-94,30,-89,29,-84,30,-81,25,-80,32,-76,35,-70,42,-67,45,-60,47,-55,52,-64,60,-78,62,-80,70,-90,70,-95,68,-105,68,-115,70,-125,70,-135,69,-145,70,-156,71,-165,68],
      // South America
      [-77,7,-79,0,-81,-5,-76,-14,-71,-18,-70,-23,-72,-33,-74,-40,-73,-45,-75,-52,-68,-55,-65,-48,-62,-40,-57,-35,-53,-33,-48,-25,-40,-20,-35,-8,-38,-3,-44,-1,-50,0,-52,4,-60,8,-66,11,-72,12,-75,10],
      // Greenland
      [-45,60,-50,64,-53,68,-58,72,-60,76,-55,80,-45,83,-30,83,-22,78,-25,74,-30,70,-38,66,-42,62],
      // Australia
      [114,-22,113,-26,115,-32,118,-35,124,-33,130,-32,135,-35,140,-38,146,-39,150,-37,153,-30,153,-25,148,-20,145,-15,142,-11,137,-12,132,-11,129,-15,125,-14,122,-18,117,-21],
      // Antarctica
      [-180,-68,-140,-70,-100,-73,-60,-64,-20,-70,20,-69,60,-67,100,-66,140,-70,180,-70,180,-90,-180,-90],
      // Madagascar
      [43,-12,50,-15,50,-25,45,-25,43,-20],
      // Japan
      [130,33,135,34,140,36,142,40,145,44,141,45,138,37,134,34],
      // British Isles
      [-5,50,-2,51,1,52,-1,55,-3,58,-5,57,-5,53],
      // Indonesia / New Guinea
      [95,5,105,-6,115,-8,122,-9,132,-8,141,-9,141,-2,132,0,120,2,110,3,100,6],
      // New Zealand
      [174,-35,176,-38,178,-38,176,-41,172,-43,167,-46,166,-45,170,-42,172,-38],
    ];
    const toXY = (lon, lat) => [(lon + 180) / 360 * W, (90 - lat) / 180 * H];
    for (const poly of land) {
      for (const shift of [-W, 0, W]) {           // wrap seam
        g.beginPath();
        for (let i = 0; i < poly.length; i += 2) {
          const [x, y] = toXY(poly[i], poly[i + 1]);
          if (i === 0) g.moveTo(x + shift, y); else g.lineTo(x + shift, y);
        }
        g.closePath();
        g.fillStyle = this.o.land; g.fill();
        g.strokeStyle = this.o.landEdge; g.lineWidth = 2; g.stroke();
      }
    }
    if (this.o.grid) {
      g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 1.5;
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = (90 - lat) / 180 * H;
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        const x = (lon + 180) / 360 * W;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
      }
    }
    const d = g.getImageData(0, 0, W, H).data;
    const n = W * H;
    const tr = new Uint8Array(n), tg = new Uint8Array(n), tb = new Uint8Array(n);
    for (let i = 0; i < n; i++) { tr[i] = d[i * 4]; tg[i] = d[i * 4 + 1]; tb[i] = d[i * 4 + 2]; }
    return { W, H, tr, tg, tb };
  }

  /**
   * Per-pixel sphere precompute. For every pixel inside the disc we store:
   * base longitude (u0), texture row offset, shading factor and edge alpha.
   * Per frame only the longitude shifts, so painting is one lookup per pixel.
   */
  build() {
    const cv = this.canvas;
    const css = this.o.size;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = Math.round(css * dpr);
    cv.width = S; cv.height = S;
    cv.style.width = css + 'px'; cv.style.height = css + 'px';
    this.ctx = cv.getContext('2d');
    this.S = S;
    this.tex = this.makeTexture();

    const { W, H } = this.tex;
    const N = S * S;
    const u0 = new Float32Array(N), row = new Int32Array(N), shade = new Float32Array(N), alpha = new Uint8Array(N);
    const t = this.o.tilt * Math.PI / 180, ct = Math.cos(t), st = Math.sin(t);
    let lx = -0.42, ly = -0.52, lz = 0.74;            // light: upper-left, in front
    const ll = Math.hypot(lx, ly, lz); lx /= ll; ly /= ll; lz /= ll;
    const edge = 2.2 / S;                              // antialiased limb
    for (let py = 0; py < S; py++) {
      const ny = (py + 0.5) / S * 2 - 1;
      for (let px = 0; px < S; px++) {
        const i = py * S + px;
        const nx = (px + 0.5) / S * 2 - 1;
        const r = Math.hypot(nx, ny);
        if (r >= 1) { alpha[i] = 0; row[i] = 0; continue; }
        alpha[i] = r > 1 - edge ? Math.round(255 * (1 - r) / edge) : 255;
        const nz = Math.sqrt(1 - r * r);
        const wx = nx * ct + ny * st;                   // rotate out of the tilt
        const wy = -nx * st + ny * ct;
        const lat = Math.asin(Math.max(-1, Math.min(1, -wy)));
        u0[i] = Math.atan2(wx, nz) / (Math.PI * 2) + 0.5;
        let ry = Math.round((0.5 - lat / Math.PI) * H);
        if (ry < 0) ry = 0; if (ry > H - 1) ry = H - 1;
        row[i] = ry * W;
        const dif = Math.max(0, nx * lx + ny * ly + nz * lz);
        const rim = Math.pow(1 - nz, 2.2);              // limb darkening
        shade[i] = 0.62 + 0.55 * Math.pow(dif, 0.85) - 0.28 * rim;
      }
    }
    this.map = { u0, row, shade, alpha };
    this.img = this.ctx.createImageData(S, S);
  }

  paint() {
    if (!this.ctx || !this.map) return;
    const { u0, row, shade, alpha } = this.map;
    const { W, tr, tg, tb } = this.tex;
    const out = this.img.data;
    const N = this.S * this.S;
    let rot = this.rot % 1; if (rot < 0) rot += 1;
    for (let i = 0; i < N; i++) {
      const a = alpha[i];
      const o = i * 4;
      if (a === 0) { out[o + 3] = 0; continue; }
      let u = u0[i] + rot; u -= Math.floor(u);
      const ti = row[i] + (u * W | 0);
      const f = shade[i];
      const r = tr[ti] * f, g = tg[ti] * f, b = tb[ti] * f;
      out[o] = r > 255 ? 255 : r;
      out[o + 1] = g > 255 ? 255 : g;
      out[o + 2] = b > 255 ? 255 : b;
      out[o + 3] = a;
    }
    this.ctx.putImageData(this.img, 0, 0);
  }
}

if (typeof module !== 'undefined') module.exports = { GlobeIcon };
if (typeof window !== 'undefined') window.GlobeIcon = GlobeIcon;

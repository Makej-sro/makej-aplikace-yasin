// Makej Worker — Lidé (tržiště dovedností). Brigádníci si navzájem nabízejí
// pomoc; ostatní procházejí mřížku a vyhledávají. ŽÁDNÝ swipe — je to
// marketplace. Kontakt je přímý ("Napsat"). Návrh: LideTrziste.html (1a + 1b).

// Bez diakritiky + lowercase → odolné hledání ("doucovani" najde "Doučování").
const _pNorm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const _pInitials = name => (name || '?').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';
const _pShort = name => { const p = (name || '').trim().split(/\s+/); return p.length > 1 ? p[0] + ' ' + (p[p.length - 1][0] || '') + '.' : (p[0] || 'Brigádník'); };

// Kategorie do čipů. `kw` = klíčová slova bez diakritiky (hledá se v nabídce+štítcích).
const _P_KATEGORIE = [
  { key: 'vse',       label: 'Vše',        kw: null },
  // Uložené nefiltruje podle klíčových slov, ale podle srdíček (localStorage) — viz `filtered`.
  { key: 'ulozene',   label: 'Uložené',    kw: null },
  { key: 'remesla',   label: 'Řemesla',    kw: ['remesl', 'opravi', 'oprava', 'opravy', 'spravi', 'hodinar', 'hodink', 'elektro', 'instalat', 'truhl', 'kutil', 'zasuvk', 'nabytek', 'montaz'] },
  { key: 'uklid',     label: 'Úklid',      kw: ['uklid', 'zehlen', 'okna', 'domacnost', 'vysav'] },
  { key: 'zahrada',   label: 'Zahrada',    kw: ['zahrad', 'sekan', 'travnik', 'plot', 'strom', 'hraban', 'zaliv'] },
  { key: 'doucovani', label: 'Doučování',  kw: ['douc', 'matemat', 'fyzik', 'vyuk', 'jazyk', 'anglict', 'uceni', 'prijimac', 'maturit'] },
  { key: 'it',        label: 'IT',         kw: ['web', 'appk', 'program', 'kod', 'pocitac', 'e-shop', 'eshop', 'notebook', 'odvirov'] },
  { key: 'foto',      label: 'Foto/Video', kw: ['foti', 'focen', 'fotograf', 'video', 'kamer', 'reels', 'portret'] },
  { key: 'gastro',    label: 'Gastro',     kw: ['var', 'catering', 'gastro', 'kuchy', 'barist', 'kav', 'pec', 'dort', 'cukrov'] },
  { key: 'hlidani',   label: 'Hlídání',    kw: ['hlidan', 'deti', 'chuva', 'miminko', 'dite'] },
  { key: 'zvirata',   label: 'Zvířata',    kw: ['psa', 'psy', 'venc', 'kock', 'zvir', 'mazlic', 'pejsk'] },
  { key: 'krasa',     label: 'Krása',      kw: ['kader', 'nehty', 'kosmetik', 'liceni', 'rasy', 'oboci', 'manikur', 'pedikur'] },
  { key: 'stehovani', label: 'Stěhování',  kw: ['stehov', 'dodavk', 'odvoz', 'preprav', 'sila', 'vynos'] },
  { key: 'hudba',     label: 'Hudba',      kw: ['kytar', 'hud', 'hraj', 'zpev', 'nastroj', 'klavir', 'piano'] },
  { key: 'doprava',   label: 'Doprava',        kw: ['ridic', 'odvez', 'prevoz', 'prevez', 'letist', 'rozvoz', 'svez'] },
  { key: 'trenink',   label: 'Sport',          kw: ['trener', 'joga', 'fitness', 'kondic', 'cvic', 'sport', 'trenink'] },
  { key: 'pece',      label: 'Péče',           kw: ['senior', 'asisten', 'pecovat', 'doprovod', 'babick'] },
  { key: 'masaze',    label: 'Masáže',         kw: ['masaz', 'wellness', 'relax', 'fyzio', 'lymf'] },
  { key: 'admin',     label: 'Administrativa', kw: ['preklad', 'administr', 'papirov', 'ucetni', 'danov', 'formular'] },
  // „Ostatní" = catch-all: padnou sem lidi, co nesedí do žádné konkrétní kategorie (viz filtr níž).
  { key: 'ostatni',   label: 'Ostatní',        kw: [] },
];

// Emoji + typ animace pro Airbnb-styl filtr (spin = točí se, swing = zakývá „cinkne", bounce = poskočí).
const _P_KAT_META = {
  vse: ['🌍', 'spin'], ulozene: ['❤️', 'bounce'], remesla: ['🔧', 'swing'], uklid: ['🧹', 'sweep'], zahrada: ['🌱', 'bounce'],
  doucovani: ['📚', 'bounce'], it: ['💻', 'bounce'], foto: ['📸', 'bounce'], gastro: ['🍳', 'swing'],
  hlidani: ['🍼', 'bounce'], zvirata: ['🐕', 'bounce'], krasa: ['💅', 'swing'], stehovani: ['📦', 'bounce'],
  hudba: ['🎸', 'swing'], doprava: ['🚗', 'bounce'], trenink: ['🏋️', 'bounce'], pece: ['🤝', 'bounce'],
  masaze: ['💆', 'bounce'], admin: ['📋', 'bounce'], ostatni: ['✨', 'spin'],
};
const _P_ANIM = { spin: 'wCatSpin .7s ease', swing: 'wCatSwing .7s ease', bounce: 'wCatBounce .55s ease', sweep: 'wCatSweep .85s ease' };

// 3D zeměkoule (canvas) místo emoji u „Vše" — po kliknutí se jednou otočí (spinKey).
function WGlobeIcon({ size = 24, spinKey }) {
  const ref = useRefW(null);
  const inst = useRefW(null);
  useEffectW(() => {
    if (ref.current && typeof window !== 'undefined' && window.GlobeIcon) {
      inst.current = new window.GlobeIcon(ref.current, { size: size, interactive: false });
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.spin) inst.current.spin();
  }, [spinKey]);
  return <canvas ref={ref} style={{ width: size, height: size, display: 'block' }} aria-hidden="true" />;
}

// Vrtačka (SVG) místo emoji u „Řemesla" — po kliknutí se rozvibruje (DrillVibrate).
function WDrillIcon({ size = 26, spinKey }) {
  const ref = useRefW(null);
  const inst = useRefW(null);
  useEffectW(() => {
    if (ref.current && typeof window !== 'undefined' && window.DrillVibrate) {
      // Amplitudy z předlohy jsou pro 300px; na ~26px je zmenšíme (power/push), pocit zůstane.
      inst.current = new window.DrillVibrate(ref.current, { duration: 1.4, power: 0.45, push: 1.3, interactive: false });
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.start) inst.current.start();
  }, [spinKey]);
  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block', transformOrigin: '28% 86%', willChange: 'transform' }}>
      {/* tělo (motor) */}
      <rect x="7" y="12" width="33" height="19" rx="6" fill="#F9B233" />
      {/* rukojeť */}
      <path d="M14 29 h13 l-2 21 h-9 z" fill="#F4A72C" />
      {/* baterie / základna */}
      <rect x="7" y="50" width="26" height="9" rx="3" fill="#F19A00" />
      {/* spoušť */}
      <path d="M23 31 h7 l-1 5 h-6 z" fill="#7E8A9A" />
      {/* sklíčidlo */}
      <rect x="39" y="15" width="8" height="13" rx="2" fill="#8B98A8" />
      <path d="M40.6 17.6v7.8 M43 17.6v7.8 M45.4 17.6v7.8" stroke="#66717F" strokeWidth="1.4" strokeLinecap="round" />
      {/* vrták */}
      <path d="M47 17 L57 21.5 L47 26 Z" fill="#8B98A8" />
      <rect x="55" y="20.4" width="6" height="2.2" rx="1.1" fill="#66717F" />
    </svg>
  );
}

// Koště (reálný obrázek) u „Úklid" — po kliknutí zamete i s prachem a obláčky (BroomSweep, podle handoffu).
// Předloha je scéna 560×380 s koštětem 320px; tady ji jen zmenšíme (scale) a vycentrujeme na koště.
const _BROOM_PUFFS = [
  { d: 26, c: '#b6c2cb' }, { d: 20, c: '#cdd6dc' }, { d: 32, c: '#a9b6c0' }, { d: 18, c: '#c3ced6' },
  { d: 28, c: '#b6c2cb' }, { d: 22, c: '#cdd6dc' }, { d: 30, c: '#a9b6c0' }, { d: 16, c: '#c3ced6' },
  { d: 24, c: '#b6c2cb' }, { d: 19, c: '#cdd6dc' }, { d: 34, c: '#a9b6c0' }, { d: 17, c: '#c3ced6' },
  { d: 12, c: '#4c6272' }, { d: 9, c: '#3f5665' }, { d: 14, c: '#4c6272' }, { d: 8, c: '#3f5665' },
];
function WBroomIcon({ size = 26, spinKey }) {
  const stageRef = useRefW(null);
  const broomRef = useRefW(null);
  const dustARef = useRefW(null);
  const dustBRef = useRefW(null);
  const puffsRef = useRefW(null);
  const inst = useRefW(null);
  const f = size / 320;                          // scale scény na velikost ikonky
  useEffectW(() => {
    if (broomRef.current && typeof window !== 'undefined' && window.BroomSweep) {
      inst.current = new window.BroomSweep(
        { stage: stageRef.current, arm: broomRef.current, dustA: dustARef.current, dustB: dustBRef.current, puffs: puffsRef.current },
        { interactive: false, duration: 1.4 },   // travel 20 / swing 4 / dust true = originální hodnoty z handoffu
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.start) inst.current.start();
  }, [spinKey]);
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'visible' }}>
      <div ref={stageRef} style={{ position: 'absolute', left: 0, top: 0, width: 560, height: 380, transformOrigin: '0 0', transform: 'translate(' + (size / 2 - 320 * f) + 'px,' + (size / 2 - 180 * f) + 'px) scale(' + f + ')' }}>
        <img ref={dustARef} src="assets/broom-dust.png" alt="" style={{ position: 'absolute', left: 160, top: 20, width: 320, height: 320, opacity: 0, zIndex: 1 }} />
        <img ref={dustBRef} src="assets/broom-dust.png" alt="" style={{ position: 'absolute', left: 96, top: 44, width: 300, height: 300, opacity: 0, zIndex: 1 }} />
        <div ref={puffsRef} style={{ position: 'absolute', left: 0, top: 0, width: 560, height: 380, zIndex: 2 }}>
          {_BROOM_PUFFS.map((p, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: p.d, height: p.d, borderRadius: '50%', background: p.c, opacity: 0 }} />
          ))}
        </div>
        <img ref={broomRef} src="assets/broom.png" alt="" style={{ position: 'absolute', left: 160, top: 20, width: 320, height: 320, transformOrigin: '310px 4px', zIndex: 3, willChange: 'transform' }} />
      </div>
    </div>
  );
}

// Kniha (3D otevírání) u „Doučování" — po kliknutí se otevře / zavře (BookOpen, podle handoffu).
// Scéna je 520×400 s knihou 360px; zmenšíme ji (scale) a vycentrujeme na hřbet.
function WBookIcon({ size = 26, spinKey }) {
  const stageRef = useRefW(null);
  const sceneRef = useRefW(null);
  const baseRef = useRefW(null);
  const blockRef = useRefW(null);
  const leafRef = useRefW(null);
  const frontRef = useRefW(null);
  const backRef = useRefW(null);
  const shadeFrontRef = useRefW(null);
  const shadeBackRef = useRefW(null);
  const inst = useRefW(null);
  const f = size / 360;                          // scale scény na velikost ikonky (kniha je 360px)
  useEffectW(() => {
    if (baseRef.current && typeof window !== 'undefined' && window.BookOpen) {
      // stage záměrně nepředáváme → BookOpen si nenaváže vlastní klik; spouštíme přes spinKey.
      inst.current = new window.BookOpen(
        { scene: sceneRef.current, base: baseRef.current, block: blockRef.current, leaf: leafRef.current, front: frontRef.current, back: backRef.current, shadeFront: shadeFrontRef.current, shadeBack: shadeBackRef.current },
        { duration: 0.9 },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.toggle) {
      inst.current.toggle();                                  // otevři
      const id = setTimeout(() => {                           // a po 1,5 s sama zavři
        if (inst.current && inst.current.p > 0.5) inst.current.toggle();
      }, 1500);
      return () => clearTimeout(id);
    }
  }, [spinKey]);
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'visible' }}>
      {/* Zmenšení přes transform:scale (ne zoom — ten otevřenou knihu na iOS renderoval rozhozeně).
          Prosvítání řeší display:none na odvrácené straně listu, takže případné zploštění 3D už nevadí. */}
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: 'translate(' + (size / 2 - 260 * f) + 'px,' + (size / 2 - 200 * f) + 'px) scale(' + f + ')' }}>
      <div ref={stageRef} style={{ position: 'relative', width: 520, height: 400, perspective: '1600px' }}>
        <div ref={sceneRef} style={{ position: 'absolute', left: 0, top: 0, width: 520, height: 400, transformStyle: 'preserve-3d', transform: 'translateX(89px)' }}>
          <img ref={baseRef} src="assets/book-base.png" alt="" style={{ position: 'absolute', left: 80, top: 20, width: 360, height: 360, opacity: 0, zIndex: 1 }} />
          <div ref={blockRef} style={{ position: 'absolute', left: 0, top: 0, width: 520, height: 400, zIndex: 2 }}>
            <div style={{ position: 'absolute', left: 81, top: 104, width: 180, height: 226, borderRadius: '11px 3px 3px 11px', background: '#ef3c15' }} />
            <div style={{ position: 'absolute', left: 86, top: 109, width: 173, height: 216, borderRadius: '8px 2px 2px 8px', background: '#f7dfae' }} />
            <div style={{ position: 'absolute', left: 90, top: 113, width: 168, height: 208, borderRadius: '6px 2px 2px 6px', background: '#fbe9c4' }} />
            <div style={{ position: 'absolute', left: 232, top: 300, width: 16, height: 46, background: '#59617b' }} />
          </div>
          <div ref={leafRef} style={{ position: 'absolute', left: 261, top: 20, width: 180, height: 360, transformOrigin: '0% 50%', transformStyle: 'preserve-3d', zIndex: 3, transform: 'rotateY(-180deg)' }}>
            <div ref={frontRef} style={{ position: 'absolute', left: 0, top: 0, width: 180, height: 360, backfaceVisibility: 'hidden', transform: 'translateZ(1px)', display: 'none', opacity: 0 }}>
              <img src="assets/book-page-right.png" alt="" style={{ position: 'absolute', left: -181, top: 0, width: 360, height: 360, backfaceVisibility: 'hidden' }} />
              <div ref={shadeFrontRef} style={{ position: 'absolute', left: 0, top: 84, width: 180, height: 226, background: '#6b5a3a', opacity: 0, backfaceVisibility: 'hidden' }} />
            </div>
            <div ref={backRef} style={{ position: 'absolute', left: 0, top: 0, width: 180, height: 360, transformOrigin: '0% 50%', transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
              <div style={{ position: 'absolute', left: -178, top: 84, width: 178, height: 226, borderRadius: '11px 3px 3px 11px', background: '#ff5023', backfaceVisibility: 'hidden' }} />
              <div style={{ position: 'absolute', left: -15, top: 84, width: 15, height: 226, borderRadius: '0 3px 3px 0', background: '#ef3c15', backfaceVisibility: 'hidden' }} />
              <div ref={shadeBackRef} style={{ position: 'absolute', left: -178, top: 84, width: 178, height: 226, borderRadius: '11px 3px 3px 11px', background: '#000', opacity: 0, backfaceVisibility: 'hidden' }} />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// Rostlinka u „Zahrada" — po kliknutí se zalije (SproutWater, podle handoffu).
// Scéna 540×430, rostlinka 330px; zmenšíme (scale) a vycentrujeme na rostlinku.
const _SPROUT_DROPS = [
  { w: 8, h: 13, c: '#52b3e8' }, { w: 7, h: 12, c: '#79c9f2' }, { w: 9, h: 14, c: '#3fa5df' }, { w: 7, h: 11, c: '#52b3e8' },
  { w: 8, h: 13, c: '#79c9f2' }, { w: 6, h: 11, c: '#3fa5df' }, { w: 9, h: 13, c: '#52b3e8' }, { w: 7, h: 12, c: '#79c9f2' },
  { w: 8, h: 12, c: '#3fa5df' }, { w: 6, h: 10, c: '#52b3e8' }, { w: 9, h: 14, c: '#79c9f2' }, { w: 7, h: 12, c: '#3fa5df' },
  { w: 8, h: 13, c: '#52b3e8' }, { w: 7, h: 11, c: '#79c9f2' }, { w: 8, h: 12, c: '#3fa5df' }, { w: 6, h: 10, c: '#52b3e8' },
];
function WSproutIcon({ size = 26, spinKey }) {
  const stageRef = useRefW(null);
  const plantRef = useRefW(null);
  const dropsRef = useRefW(null);
  const inst = useRefW(null);
  const f = size / 330;                          // scale scény na velikost ikonky (rostlinka je 330px)
  useEffectW(() => {
    if (plantRef.current && typeof window !== 'undefined' && window.SproutWater) {
      inst.current = new window.SproutWater(
        { plant: plantRef.current, drops: dropsRef.current },
        { interactive: false, duration: 1.5, rate: 20 },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.water) inst.current.water();
  }, [spinKey]);
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'visible' }}>
      <div ref={stageRef} style={{ position: 'absolute', left: 0, top: 0, width: 540, height: 430, overflow: 'hidden', transformOrigin: '0 0', transform: 'translate(' + (size / 2 - 255 * f) + 'px,' + (size / 2 - 255 * f) + 'px) scale(' + f + ')' }}>
        <img ref={plantRef} src="assets/sprout.png" alt="" style={{ position: 'absolute', left: 90, top: 90, width: 330, height: 330, transformOrigin: '50% 92%', zIndex: 2 }} />
        <div ref={dropsRef} style={{ position: 'absolute', left: 0, top: 0, width: 540, height: 430, zIndex: 3 }}>
          {_SPROUT_DROPS.map((d, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: d.w, height: d.h, borderRadius: '4px 4px 5px 5px', background: d.c, opacity: 0 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Notebook u „IT" — po kliknutí se modrá chybová obrazovka „opraví" (načítání → zelená fajfka; LaptopFix).
// Scéna 540×420, notebook 400px; zmenšíme (scale) a vycentrujeme na notebook.
function WLaptopIcon({ size = 26, spinKey }) {
  const bsodRef = useRefW(null);
  const loadRef = useRefW(null);
  const doneRef = useRefW(null);
  const spinRef = useRefW(null);
  const checkRef = useRefW(null);
  const inst = useRefW(null);
  const f = size / 400;                          // scale scény na velikost ikonky (notebook je 400px)
  useEffectW(() => {
    if (bsodRef.current && typeof window !== 'undefined' && window.LaptopFix) {
      inst.current = new window.LaptopFix(
        { bsod: bsodRef.current, load: loadRef.current, done: doneRef.current, spin: spinRef.current, check: checkRef.current },
        { interactive: false, loading: 1.4, hold: 1.3, spin: 1.4 },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.fix) inst.current.fix();
  }, [spinKey]);
  const scr = { position: 'absolute', left: 0, top: 0, width: 252, height: 173 };
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'visible' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: 'translate(' + (size / 2 - 270 * f) + 'px,' + (size / 2 - 220 * f) + 'px) scale(' + f + ')' }}>
        <div style={{ position: 'relative', width: 540, height: 420 }}>
          <img src="assets/laptop.png" alt="" style={{ position: 'absolute', left: 70, top: 20, width: 400, height: 400, zIndex: 1 }} />
          <div style={{ position: 'absolute', left: 144, top: 64, width: 252, height: 173, overflow: 'hidden', zIndex: 2 }}>
            <div ref={bsodRef} style={{ ...scr, background: '#1273b8', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 22px', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 40, lineHeight: 1, fontWeight: 300, color: '#fff', letterSpacing: '1px' }}>:(</div>
              <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.35, color: '#fff' }}>Něco se pokazilo a systém se musí restartovat.</div>
              <div style={{ marginTop: 8, fontSize: 8, lineHeight: 1.3, color: 'rgba(255,255,255,0.82)' }}>Kód chyby: IT_TICKET_0042</div>
            </div>
            <div ref={loadRef} style={{ ...scr, background: '#0d4f7d', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
              <div ref={spinRef} style={{ width: 46, height: 46, borderRadius: '50%', border: '5px solid rgba(255,255,255,0.24)', borderTopColor: '#fff', boxSizing: 'border-box' }} />
            </div>
            <div ref={doneRef} style={{ ...scr, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }}>
              <div ref={checkRef} style={{ width: 64, height: 34, borderLeft: '10px solid #2fbe5c', borderBottom: '10px solid #2fbe5c', borderRadius: '3px', transform: 'rotate(-45deg) scale(0.2)', opacity: 0 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Foťák u „Foto" — po kliknutí blikne dioda a cvakne blesk (CameraShot).
// Scéna 540×420, foťák 400px; zmenšíme (scale) a vycentrujeme na foťák. Blesk ořízneme na ikonku (overflow hidden).
function WCameraIcon({ size = 26, spinKey }) {
  const camRef = useRefW(null);
  const ledRef = useRefW(null);
  const glowRef = useRefW(null);
  const flashRef = useRefW(null);
  const inst = useRefW(null);
  const f = size / 400;                          // scale scény na velikost ikonky (foťák je 400px)
  useEffectW(() => {
    if (camRef.current && typeof window !== 'undefined' && window.CameraShot) {
      inst.current = new window.CameraShot(
        { cam: camRef.current, led: ledRef.current, glow: glowRef.current, flash: flashRef.current },
        { interactive: false, blink: 0.85, rate: 7, flash: 0.9 },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.shoot) inst.current.shoot();
  }, [spinKey]);
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: 'translate(' + (size / 2 - 270 * f) + 'px,' + (size / 2 - 240 * f) + 'px) scale(' + f + ')' }}>
        <div style={{ position: 'relative', width: 540, height: 420 }}>
          <img ref={camRef} src="assets/camera.png" alt="" style={{ position: 'absolute', left: 70, top: 40, width: 400, height: 400, zIndex: 2 }} />
          <div ref={ledRef} style={{ position: 'absolute', left: 110, top: 156, width: 23, height: 23, borderRadius: '50%', background: '#ff3b4f', opacity: 0, zIndex: 3 }} />
          <div ref={glowRef} style={{ position: 'absolute', left: 130, top: 132, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 42%, rgba(255,255,255,0) 72%)', opacity: 0, zIndex: 4 }} />
          <div ref={flashRef} style={{ position: 'absolute', left: 0, top: 0, width: 540, height: 420, background: '#fff', opacity: 0, zIndex: 5 }} />
        </div>
      </div>
    </div>
  );
}

// Pánev u „Jídlo" — po kliknutí spadne vejce a usmaží se na volské oko (PanFryEgg).
// Scéna 540×420, pánev 380px; zmenšíme (scale) a vycentrujeme na pánev. Padající vejce ořízneme na ikonku.
function WPanIcon({ size = 26, spinKey }) {
  const panRef = useRefW(null);
  const friedRef = useRefW(null);
  const rawRef = useRefW(null);
  const inst = useRefW(null);
  const f = size / 380;                          // scale scény na velikost ikonky (pánev je 380px)
  useEffectW(() => {
    if (panRef.current && typeof window !== 'undefined' && window.PanFryEgg) {
      inst.current = new window.PanFryEgg(
        { pan: panRef.current, fried: friedRef.current, raw: rawRef.current },
        { interactive: false, fall: 0.45, hold: 1.1 },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.cook) inst.current.cook();
  }, [spinKey]);
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: 'translate(' + (size / 2 - 270 * f) + 'px,' + (size / 2 - 220 * f) + 'px) scale(' + f + ')' }}>
        <div style={{ position: 'relative', width: 540, height: 420 }}>
          <img ref={panRef} src="assets/pan.png" alt="" style={{ position: 'absolute', left: 80, top: 30, width: 380, height: 380, zIndex: 2 }} />
          <img ref={friedRef} src="assets/egg-fried.png" alt="" style={{ position: 'absolute', left: 80, top: 30, width: 380, height: 380, transformOrigin: '145px 141px', opacity: 0, zIndex: 3 }} />
          <div ref={rawRef} style={{ position: 'absolute', left: 208, top: 148, width: 34, height: 44, borderRadius: '50% 50% 48% 48% / 58% 58% 42% 42%', background: '#fff', boxShadow: 'inset -4px -6px 0 rgba(0,0,0,0.05)', opacity: 0, zIndex: 4 }}>
            <div style={{ position: 'absolute', left: 9, top: 15, width: 16, height: 16, borderRadius: '50%', background: '#edb22e' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Vláček u „Hlídání" — po kliknutí kouří z komínku (TrainSmoke).
// Scéna 540×430, vláček 400px; zmenšíme (scale) a vycentrujeme na vláček. Kouř ořízneme na ikonku.
const _TRAIN_PUFFS = [
  { d: 30, c: '#e8eef3' }, { d: 24, c: '#f2f6f9' }, { d: 34, c: '#dde5ec' }, { d: 22, c: '#eef3f7' },
  { d: 28, c: '#e3eaf0' }, { d: 20, c: '#f4f7fa' }, { d: 32, c: '#dde5ec' }, { d: 26, c: '#e8eef3' },
  { d: 18, c: '#f2f6f9' }, { d: 30, c: '#e3eaf0' }, { d: 23, c: '#eef3f7' }, { d: 36, c: '#dde5ec' },
  { d: 21, c: '#f4f7fa' }, { d: 27, c: '#e8eef3' }, { d: 31, c: '#e8eef3' }, { d: 25, c: '#f2f6f9' },
  { d: 35, c: '#dde5ec' }, { d: 22, c: '#eef3f7' }, { d: 29, c: '#e3eaf0' }, { d: 19, c: '#f4f7fa' },
  { d: 33, c: '#dde5ec' }, { d: 26, c: '#e8eef3' }, { d: 24, c: '#f2f6f9' }, { d: 30, c: '#e3eaf0' },
  { d: 20, c: '#eef3f7' }, { d: 37, c: '#dde5ec' }, { d: 23, c: '#f4f7fa' }, { d: 28, c: '#e8eef3' },
];
function WTrainIcon({ size = 26, spinKey }) {
  const trainRef = useRefW(null);
  const smokeRef = useRefW(null);
  const inst = useRefW(null);
  const f = size / 400;                          // scale scény na velikost ikonky (vláček je 400px)
  useEffectW(() => {
    if (trainRef.current && typeof window !== 'undefined' && window.TrainSmoke) {
      inst.current = new window.TrainSmoke(
        { train: trainRef.current, smoke: smokeRef.current },
        { interactive: false, duration: 1.5, rate: 12, rise: 1.2 },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.puff) inst.current.puff();
  }, [spinKey]);
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: 'translate(' + (size / 2 - 270 * f) + 'px,' + (size / 2 - 220 * f) + 'px) scale(' + f + ')' }}>
        <div style={{ position: 'relative', width: 540, height: 430 }}>
          <div ref={smokeRef} style={{ position: 'absolute', left: 0, top: 0, width: 540, height: 430, zIndex: 1 }}>
            {_TRAIN_PUFFS.map((p, i) => (
              <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: p.d, height: p.d, borderRadius: '50%', background: p.c, opacity: 0 }} />
            ))}
          </div>
          <img ref={trainRef} src="assets/toy-train.png" alt="" style={{ position: 'absolute', left: 70, top: 20, width: 400, height: 400, zIndex: 2 }} />
        </div>
      </div>
    </div>
  );
}

// Psí bouda u „Zvířata" — po kliknutí spadne pytlík krmiva a nad boudou stoupají srdíčka (DoghouseFeed).
// Scéna 560×440, bouda 400px; zmenšíme (scale) a vycentrujeme na boudu. Pytlík i srdíčka ořízneme na ikonku.
const _DOG_HEARTS = [
  { w: 64, c: '#ef3f4a' }, { w: 52, c: '#f4565f' }, { w: 76, c: '#e0323d' }, { w: 58, c: '#ef3f4a' },
  { w: 70, c: '#f4565f' }, { w: 50, c: '#e0323d' }, { w: 64, c: '#f4565f' }, { w: 54, c: '#ef3f4a' },
];
// Jedno srdíčko = 2 kolečka vedle sebe + otočený čtvereček pod nimi (poměry z předlohy).
function _wHeart(w, c) {
  const cd = Math.round(0.6 * w), cy = Math.round(0.175 * w), c2x = Math.round(0.4 * w);
  const sqx = Math.round(0.2 * w), sqy = Math.round(0.38 * w);
  return (
    <React.Fragment>
      <div style={{ position: 'absolute', left: 0, top: cy, width: cd, height: cd, borderRadius: '50%', background: c }} />
      <div style={{ position: 'absolute', left: c2x, top: cy, width: cd, height: cd, borderRadius: '50%', background: c }} />
      <div style={{ position: 'absolute', left: sqx, top: sqy, width: cd, height: cd, background: c, transform: 'rotate(45deg)', borderRadius: 3 }} />
    </React.Fragment>
  );
}
function WDoghouseIcon({ size = 26, spinKey }) {
  const bagRef = useRefW(null);
  const heartsRef = useRefW(null);
  const inst = useRefW(null);
  // Pytlík stojí daleko vpravo (kolem x496) — scénu zmenšíme tak, aby se do ikonky vešla bouda i pytlík.
  const f = size / 500;
  useEffectW(() => {
    if (heartsRef.current && typeof window !== 'undefined' && window.DoghouseFeed) {
      inst.current = new window.DoghouseFeed(
        { bag: bagRef.current, hearts: heartsRef.current },
        { interactive: false, fall: 0.25, stay: 3, hearts: 4, lift: 2.5 },   // stay delší (pytlík poleží), lift vyšší (srdíčka výš)
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.feed) inst.current.feed();
  }, [spinKey]);
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden' }}>
      {/* Vycentrováno na střed obsahu bouda+pytlík (268,225), ne na střed boudy — jinak pytlík vpravo spadne za ořez. */}
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: 'translate(' + (size / 2 - 268 * f) + 'px,' + (size / 2 - 225 * f) + 'px) scale(' + f + ')' }}>
        <div style={{ position: 'relative', width: 560, height: 440 }}>
          <img src="assets/dog-house.png" alt="" style={{ position: 'absolute', left: 40, top: 30, width: 400, height: 400, zIndex: 2 }} />
          <img ref={bagRef} src="assets/pet-food.png" alt="" style={{ position: 'absolute', left: 372, top: 282, width: 124, height: 124, transformOrigin: '50% 100%', opacity: 0, zIndex: 3 }} />
          <div ref={heartsRef} style={{ position: 'absolute', left: 0, top: 0, width: 560, height: 440, zIndex: 4 }}>
            {_DOG_HEARTS.map((h, i) => (
              <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: h.w, height: h.w, opacity: 0 }}>{_wHeart(h.w, h.c)}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Kosmetika u „Krása" — obrázek rozdělen na 3 svislá okna (zrcátko/rtěnka/štětec); po kliknutí
// každé poskočí s malým zpožděním (mexická vlna) a nakonec přejede lesk přes sklíčko zrcátka (CosmeticsWave).
function WCosmeticsIcon({ size = 30, spinKey }) {
  const aRef = useRefW(null);
  const bRef = useRefW(null);
  const cRef = useRefW(null);
  const glintRef = useRefW(null);
  const streakRef = useRefW(null);
  const inst = useRefW(null);
  useEffectW(() => {
    if (aRef.current && typeof window !== 'undefined' && window.CosmeticsWave) {
      inst.current = new window.CosmeticsWave(
        { strips: [aRef.current, bRef.current, cRef.current], glint: glintRef.current, streak: streakRef.current },
        { interactive: false, dur: 1.5 },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.wave) inst.current.wave();
  }, [spinKey]);
  // svislé hranice oken (podíl šířky): zrcátko 0..0.5, rtěnka 0.5..0.72, štětec 0.72..1
  const wa = 0.5 * size, wb = 0.22 * size, wc = 0.28 * size;
  const img = { position: 'absolute', top: 0, width: size, height: size, display: 'block' };
  const win = { position: 'absolute', top: 0, height: size, overflow: 'hidden', transformOrigin: '50% 100%', willChange: 'transform' };
  // sklíčko zrcátka (podíly z obrázku): střed ~ (0.273, 0.703), poloměr ~0.185
  const gd = 0.37 * size, gl = 0.088 * size, gt = 0.518 * size;
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'visible' }}>
      <div ref={aRef} style={{ ...win, left: 0, width: wa }}><img src="assets/cosmetics.png" alt="" style={{ ...img, left: 0 }} /></div>
      <div ref={bRef} style={{ ...win, left: wa, width: wb }}><img src="assets/cosmetics.png" alt="" style={{ ...img, left: -wa }} /></div>
      <div ref={cRef} style={{ ...win, left: wa + wb, width: wc }}><img src="assets/cosmetics.png" alt="" style={{ ...img, left: -(wa + wb) }} /></div>
      <div ref={glintRef} style={{ position: 'absolute', left: gl, top: gt, width: gd, height: gd, borderRadius: '50%', overflow: 'hidden', opacity: 0, zIndex: 5, pointerEvents: 'none' }}>
        <div ref={streakRef} style={{ position: 'absolute', left: 0, top: '-50%', width: '55%', height: '200%', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%)', transform: 'translateX(-160%) skewX(-18deg)' }} />
      </div>
    </div>
  );
}

// Krabice u „Stěhování" — po kliknutí odjede doprava, zmizí a přijede zpět zprava, s čárkami
// pohybu za sebou (jako rychlost). Bez handoffu, vlastní animace (BoxPack).
// left řídí až animace (translateX sweep), tady jen svislá pozice a délka čárky
const _BOX_LINES = [
  { top: 0.22, w: 0.34 }, { top: 0.37, w: 0.46 }, { top: 0.52, w: 0.30 },
  { top: 0.66, w: 0.44 }, { top: 0.80, w: 0.32 },
];
function WBoxIcon({ size = 24, spinKey }) {
  const boxRef = useRefW(null);
  const l0 = useRefW(null), l1 = useRefW(null), l2 = useRefW(null), l3 = useRefW(null), l4 = useRefW(null);
  const lineRefs = [l0, l1, l2, l3, l4];
  const inst = useRefW(null);
  useEffectW(() => {
    if (boxRef.current && typeof window !== 'undefined' && window.BoxPack) {
      inst.current = new window.BoxPack(
        { box: boxRef.current, lines: lineRefs.map(r => r.current) },
        { interactive: false, dur: 1.3, s: size },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.pack) inst.current.pack();
  }, [spinKey]);
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden' }}>
      {/* čárky pohybu (za krabicí) */}
      {_BOX_LINES.map((ln, i) => (
        <div key={i} ref={lineRefs[i]} style={{ position: 'absolute', left: 0, top: ln.top * size, width: ln.w * size, height: Math.max(1.5, 0.05 * size), background: 'rgba(107,74,55,0.7)', borderRadius: 2, opacity: 0, zIndex: 1, willChange: 'opacity, transform' }} />
      ))}
      {/* krabice */}
      <img ref={boxRef} src="assets/package.png" alt="" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, zIndex: 2, willChange: 'transform' }} />
    </div>
  );
}

// Kytara u „Hudba" — po kliknutí brnkne (celá se zachvěje), struny podél krku kmitají a z těla
// letí noty nahoru (GuitarStrum). Bez handoffu, vlastní animace.
const _GUITAR_NOTES = ['♪', '♫', '♩', '♪', '♫', '♩'];
function WGuitarIcon({ size = 28, spinKey }) {
  const guitarRef = useRefW(null);
  const s0 = useRefW(null), s1 = useRefW(null), s2 = useRefW(null), s3 = useRefW(null);
  const n0 = useRefW(null), n1 = useRefW(null), n2 = useRefW(null), n3 = useRefW(null), n4 = useRefW(null), n5 = useRefW(null);
  const stringRefs = [s0, s1, s2, s3];
  const noteRefs = [n0, n1, n2, n3, n4, n5];
  const inst = useRefW(null);
  useEffectW(() => {
    if (guitarRef.current && typeof window !== 'undefined' && window.GuitarStrum) {
      inst.current = new window.GuitarStrum(
        { guitar: guitarRef.current, strings: stringRefs.map(r => r.current), notes: noteRefs.map(r => r.current) },
        { interactive: false, dur: 1.7, s: size },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.strum) inst.current.strum();
  }, [spinKey]);
  const noteColors = ['#3a3a3a', '#d1273a', '#3a3a3a', '#d1273a', '#3a3a3a', '#d1273a'];
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'visible' }}>
      {/* strum wrapper – kytara + struny se hýbou společně */}
      <div ref={guitarRef} style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, transformOrigin: '45% 60%', willChange: 'transform' }}>
        <img src="assets/electric-guitar.png" alt="" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, zIndex: 1 }} />
        {/* krk se strunami – otočený kontejner podél krku, čárky kmitají napříč */}
        <div style={{ position: 'absolute', left: 0.65 * size - 0.21 * size, top: 0.33 * size - 0.06 * size, width: 0.42 * size, height: 0.12 * size, transform: 'rotate(-46deg)', transformOrigin: '50% 50%', zIndex: 2 }}>
          {stringRefs.map((r, i) => (
            <div key={i} ref={r} style={{ position: 'absolute', left: 0, top: (18 + i * 21) + '%', width: '100%', height: Math.max(1, 0.025 * size), background: 'rgba(235,235,235,0.8)', borderRadius: 1, willChange: 'transform' }} />
          ))}
        </div>
      </div>
      {/* noty – nerotují se strumem */}
      {_GUITAR_NOTES.map((g, i) => (
        <div key={i} ref={noteRefs[i]} style={{ position: 'absolute', left: 0, top: 0, fontSize: 0.5 * size, lineHeight: 1, color: noteColors[i], opacity: 0, zIndex: 3, willChange: 'transform, opacity' }}>{g}</div>
      ))}
    </div>
  );
}

// Auto u „Doprava" — po kliknutí přijede zprava další auto, narazí do stávajícího, to odletí
// doleva a narážející zůstane. Nekonečné: každé kliknutí prohodí role (CarBump). Vlastní animace.
function WCarIcon({ size = 30, spinKey }) {
  const aRef = useRefW(null);
  const bRef = useRefW(null);
  const inst = useRefW(null);
  useEffectW(() => {
    if (aRef.current && typeof window !== 'undefined' && window.CarBump) {
      inst.current = new window.CarBump(
        { carA: aRef.current, carB: bRef.current },
        { interactive: false, dur: 1.15, s: size },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.bump) inst.current.bump();
  }, [spinKey]);
  // auta zmenšená na ~2/3 a vycentrovaná, aby se vešla vedle sebe a mohla se srazit nárazníky
  const carW = 0.66 * size, off = (size - carW) / 2;
  const car = { position: 'absolute', left: off, top: off, width: carW, height: carW, display: 'block', willChange: 'transform' };
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden' }}>
      <img ref={aRef} src="assets/car.png" alt="" style={car} />
      <img ref={bRef} src="assets/car.png" alt="" style={car} />
    </div>
  );
}

// Běžec na páse u „Sport" — po kliknutí se rozběhne, pak zpomalí a zastaví (~2 s); postava se
// pohupuje v rytmu běhu a pod pásem svišti čárky rychlosti (TreadmillRun). Vlastní animace.
const _RUN_LINES = [
  { top: 0.82, w: 0.30 }, { top: 0.87, w: 0.40 }, { top: 0.92, w: 0.26 }, { top: 0.90, w: 0.36 }, { top: 0.84, w: 0.24 },
];
function WTreadmillIcon({ size = 30, spinKey }) {
  const runnerRef = useRefW(null);
  const l0 = useRefW(null), l1 = useRefW(null), l2 = useRefW(null), l3 = useRefW(null), l4 = useRefW(null);
  const lineRefs = [l0, l1, l2, l3, l4];
  const inst = useRefW(null);
  useEffectW(() => {
    if (runnerRef.current && typeof window !== 'undefined' && window.TreadmillRun) {
      inst.current = new window.TreadmillRun(
        { runner: runnerRef.current, lines: lineRefs.map(r => r.current) },
        { interactive: false, dur: 2.1, s: size },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.go) inst.current.go();
  }, [spinKey]);
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden' }}>
      {/* čárky rychlosti pod pásem */}
      {_RUN_LINES.map((ln, i) => (
        <div key={i} ref={lineRefs[i]} style={{ position: 'absolute', left: 0, top: ln.top * size, width: ln.w * size, height: Math.max(1, 0.03 * size), background: 'rgba(90,100,110,0.6)', borderRadius: 2, opacity: 0, zIndex: 1, willChange: 'opacity, transform' }} />
      ))}
      {/* běžec + pás (pohupuje se v rytmu běhu) */}
      <img ref={runnerRef} src="assets/treadmill.png" alt="" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, zIndex: 2, willChange: 'transform' }} />
    </div>
  );
}

// Basketbalová síť u „Sport" — po kliknutí prolétne shora míč sítí v popředí (před síťkou),
// síť lehce cukne (net swish) (BallDrop). Vlastní animace.
function WHoopIcon({ size = 30, spinKey }) {
  const ballRef = useRefW(null);
  const hoopRef = useRefW(null);
  const inst = useRefW(null);
  useEffectW(() => {
    if (hoopRef.current && typeof window !== 'undefined' && window.BallDrop) {
      inst.current = new window.BallDrop(
        { ball: ballRef.current, hoop: hoopRef.current },
        { interactive: false, dur: 1.2, s: size },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.shoot) inst.current.shoot();
  }, [spinKey]);
  const ballW = 0.32 * size, ballLeft = (size - ballW) / 2;
  const seam = { position: 'absolute', background: 'rgba(120,60,20,0.55)' };
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden' }}>
      {/* síť + obruč */}
      <img ref={hoopRef} src="assets/hoop.png" alt="" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, transformOrigin: '50% 12%', zIndex: 1, willChange: 'transform' }} />
      {/* míč v popředí (před sítí) */}
      <div ref={ballRef} style={{ position: 'absolute', left: ballLeft, top: 0.05 * size, width: ballW, height: ballW, borderRadius: '50%', background: 'radial-gradient(circle at 35% 32%, #f4a24a, #d9772a 70%)', opacity: 0, zIndex: 3, willChange: 'transform, opacity' }}>
        <div style={{ ...seam, left: '48%', top: 0, width: Math.max(1, 0.02 * size), height: '100%' }} />
        <div style={{ ...seam, top: '48%', left: 0, height: Math.max(1, 0.02 * size), width: '100%' }} />
      </div>
    </div>
  );
}

// Tabule u „Doučování" — po kliknutí se na ni křídou napíše „1" (nakreslí se tahem), chvíli
// vydrží a smaže se (ChalkWrite). Vlastní animace.
function WBoardIcon({ size = 30, spinKey }) {
  const pathRef = useRefW(null);
  const inst = useRefW(null);
  useEffectW(() => {
    if (pathRef.current && typeof window !== 'undefined' && window.ChalkWrite) {
      inst.current = new window.ChalkWrite({ path: pathRef.current }, { interactive: false, dur: 1.9 });
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.write) inst.current.write();
  }, [spinKey]);
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden' }}>
      <img src="assets/blackboard.png" alt="" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, zIndex: 1 }} />
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, zIndex: 2, pointerEvents: 'none' }}>
        <path ref={pathRef} d="M40,28 L48,18 L48,54" fill="none" stroke="#f2f2f2" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 300, strokeDashoffset: 300 }} />
      </svg>
    </div>
  );
}

// Ruce-srdce u „Péče" — po kliknutí se v dlaních objeví červené srdíčko (naskočí s odrazem, tluče)
// a praskne jako balónek (nafoukne, zmizí, střepy odletí) (HeartPop). Vlastní animace.
function WHeartHandsIcon({ size = 30, spinKey }) {
  const heartRef = useRefW(null);
  const sh0 = useRefW(null), sh1 = useRefW(null), sh2 = useRefW(null), sh3 = useRefW(null);
  const sh4 = useRefW(null), sh5 = useRefW(null), sh6 = useRefW(null), sh7 = useRefW(null);
  const shardRefs = [sh0, sh1, sh2, sh3, sh4, sh5, sh6, sh7];
  const inst = useRefW(null);
  useEffectW(() => {
    if (heartRef.current && typeof window !== 'undefined' && window.HeartPop) {
      inst.current = new window.HeartPop(
        { heart: heartRef.current, shards: shardRefs.map(r => r.current) },
        { interactive: false, dur: 1.6, s: size },
      );
    }
    return () => { if (inst.current && inst.current.destroy) { inst.current.destroy(); inst.current = null; } };
  }, []);
  useEffectW(() => {
    if (spinKey && inst.current && inst.current.pop) inst.current.pop();
  }, [spinKey]);
  // Dutina mezi dlaněmi — proměřeno z assets/heart-hands.png (512×512).
  // Vnitřní bbox obrysu: x 165–346, y 227–352. Přepočteno na podíl velikosti ikony.
  const CAV_CX = 0.4990, CAV_CY = 0.5654, CAV_W = 0.3555, CAV_H = 0.2461;

  // _wHeart skládá srdce ze dvou koleček a čtverce otočeného o 45°. Jeho viditelný
  // tvar se NEKRYJE s boxem, do kterého se vkládá — dolní hrot čtverce box přetéká:
  //   šířka = 1.000 × w,  výška = 0.929 × w  (od 0.175 × w po 1.104 × w)
  //   svislý střed tvaru leží na 0.640 × w, ne na 0.5 × w
  // Bez téhle korekce sedí srdce o 0.14 × w níž, než se čeká.
  const HV_H = 0.9293, HV_CY = 0.6396;

  // Velikost podle VÝŠKY dutiny — ta je těsnější než šířka, takže srdce nikdy
  // nepřeteče přes prsty nahoře ani přes hrot dole.
  const heartW = (CAV_H / HV_H) * size;
  // Dutina je širší, než odpovídá poměru stran tohohle srdce (1,44 vs 1,08),
  // proto se tvar vodorovně roztáhne, aby dutinu opravdu vyplnil.
  const heartSX = CAV_W / (heartW / size);
  const shW = 0.08 * size;
  const hcx = CAV_CX * size, hcy = CAV_CY * size;
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'visible' }}>
      <img src="assets/heart-hands.png" alt="" style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, zIndex: 1 }} />
      {/* Červené srdíčko v dlaních.
          transformOrigin míří na skutečný střed TVARU (0.640), ne na střed boxu —
          jinak by tlukot i prasknutí škálovaly kolem bodu nad srdcem a tvar by
          při animaci ujížděl dolů. HeartPop zapisuje jen scale(), origin nechává na nás. */}
      <div ref={heartRef} style={{ position: 'absolute', left: hcx - heartW / 2, top: hcy - HV_CY * heartW, width: heartW, height: heartW, transformOrigin: '50% ' + (HV_CY * 100).toFixed(2) + '%', opacity: 0, zIndex: 2, willChange: 'transform, opacity' }}>
        {/* Vlastní vrstva pro vodorovné roztažení — HeartPop přepisuje transform
            na vnějším divu, takže scaleX musí být na samostatném prvku. */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: heartW, height: heartW, transform: 'scaleX(' + heartSX.toFixed(4) + ')', transformOrigin: '50% 50%' }}>{_wHeart(heartW, '#e0323d')}</div>
      </div>
      {/* střepy po prasknutí */}
      {shardRefs.map((r, i) => (
        <div key={i} ref={r} style={{ position: 'absolute', left: hcx - shW / 2, top: hcy - shW / 2, width: shW, height: shW, background: '#e0323d', borderRadius: 2, transformOrigin: '50% 50%', opacity: 0, zIndex: 3, willChange: 'transform, opacity' }} />
      ))}
    </div>
  );
}

// Srdíčko „uložit" — jeden tvar i jedno pravidlo na barvu pro celou appku:
// uložené je VŽDY červené, neuložené jen obrys v barvě, co sedí na podklad
// (bílá přes fotku, tmavá na bílém pozadí). Stejnou červenou má i filtr „Uložené".
const _P_CERVENA = '#E0323D';
const _P_SRDCE_D = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
function WSrdceIko({ w = 18, h, saved, off = '#0B1233', tah = 2 }) {
  const c = saved ? _P_CERVENA : off;
  return (
    <svg width={w} height={h || w} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
      <path d={_P_SRDCE_D} fill={saved ? c : 'none'} stroke={c} strokeWidth={tah} strokeLinejoin="round" />
    </svg>
  );
}

// Srdce u filtru „Uložené". Je červené pořád, i když filtr zrovna neběží — ať je
// na první pohled jasné, co dělá. Po klepnutí po něm jen přejede odlesk; žádné
// poskakování ani jiskry. Odlesk = světlý pruh oříznutý tvarem srdce (clipPath),
// posouvaný přes Web Animations API, takže to jede na compositoru a netrhá to.
let _pSrdceId = 0;
function WSavedHeartIcon({ size = 26, apiRef }) {
  const leskRef = useRefW(null);
  const id = useRefW(null);
  if (id.current === null) id.current = ++_pSrdceId;
  const clipId = 'wsrdce-clip-' + id.current;
  const gradId = 'wsrdce-grad-' + id.current;
  useEffectW(() => {
    function klepni() {
      const el = leskRef.current;
      if (!el || !el.animate) return;
      el.animate([
        { transform: 'translateX(-16px) skewX(-18deg)' },
        { transform: 'translateX(30px) skewX(-18deg)' },
      ], { duration: 620, easing: 'cubic-bezier(.35,0,.25,1)' });
    }
    if (apiRef) apiRef.current = klepni;
    return () => { if (apiRef && apiRef.current === klepni) apiRef.current = null; };
  }, [apiRef]);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <clipPath id={clipId}><path d={_P_SRDCE_D} /></clipPath>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={_P_SRDCE_D} fill={_P_CERVENA} />
      <g clipPath={'url(#' + clipId + ')'}>
        {/* výchozí pozice je mimo srdce vlevo, takže v klidu není vidět */}
        <rect ref={leskRef} x="0" y="-4" width="9" height="32" fill={'url(#' + gradId + ')'}
          style={{ transform: 'translateX(-16px) skewX(-18deg)', willChange: 'transform' }} />
      </g>
    </svg>
  );
}

// Prázdný filtr „Uložené" — schválně bez ikonky, jen věta a cesta ven.
function WPrazdneUlozene({ onHledat }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 28px 46px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Zatím sis nikoho neuložil</div>
      <div style={{ marginTop: 8, maxWidth: 290, color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.55 }}>Stisknutím srdíčka na kartě člověka se ti uloží přesně sem.</div>
      <button onClick={onHledat} style={{
        marginTop: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: T.primary, color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800,
        border: 'none', borderRadius: 999, padding: '14px 28px', cursor: 'pointer',
        boxShadow: '0 10px 22px -10px rgba(0,32,246,0.65)', WebkitTapHighlightColor: 'transparent',
      }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2" /><path d="m16.3 16.3 3.7 3.7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Jdu hledat
      </button>
    </div>
  );
}

// Tři čísla pod jménem (hodnocení / hotové zakázky / doba odpovědi). Jeden
// zdroj pro kartu i pro editor — náhled v editoru se tak nemůže rozejít s tím,
// co pak uvidí ostatní. Stejný princip jako WSekHead u nadpisů sekcí.
function _pCislaDuvery(person) {
  const rating = Number(person.rating) || 0;
  const hotove = person.jobsDone || person.helpCount || person.ratingCount || 0;
  const zrusene = person.cancelled || 0;
  const reakce = Number(person.replyTime) || 0;
  return {
    hodnoceni: {
      hod: rating > 0 ? rating.toFixed(1).replace('.', ',') : '—',
      pod: person.ratingCount > 0
        ? person.ratingCount + ' ' + _wPlural(person.ratingCount, 'recenze', 'recenze', 'recenzí')
        : 'Bez recenzí',
      stred: rating > 0 && typeof WStars === 'function' ? <WStars value={rating} size={12} /> : null,
    },
    zakazky: {
      hod: String(hotove),
      pod: 'hotových zakázek',
      stred: hotove > 0 ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: '#E4F6EA', border: '1px solid #BFE6CC' }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: '#1E9E52' }} />
          <span style={{ fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800, color: '#1E7A46', whiteSpace: 'nowrap' }}>{zrusene > 0 ? Math.round(hotove / (hotove + zrusene) * 100) : 100}% úspěšně</span>
        </span>
      ) : null,
    },
    reakce: {
      hod: reakce > 0 ? _pFmtReply(reakce) : '—',
      pod: 'průměrná doba odpovědi',
      stred: reakce > 0 ? <span style={{ width: 26, height: 7, borderRadius: 999, background: reakce <= 60 ? '#1E9E52' : reakce <= 120 ? '#F0A600' : '#E8552E' }} /> : null,
    },
  };
}

// Klíčová slova pro typewriter efekt v placeholderu vyhledávání.
const _P_HLEDEJ = ['doučování', 'opravy', 'foto', 'stěhování', 'web na míru', 'dort', 'kytaru', 'hodinky', 'úklid'];

// Volby pro editor karty.
const _P_DOSTUP = ['Přes den', 'Večery', 'Víkendy', 'Flexibilně'];
const _P_KDE    = ['U tebe', 'U mě', 'Online'];

// ── Demo data — appka teprve startuje, reálné karty zatím nejsou. ──
// avatar = profilová fotka, photos = galerie práce, skills = „co umím",
// equipment = vlastní vybavení/nářadí.
// Fotky v demo-lide/ jsou vybrané k oboru i k pohlaví toho člověka, ať demo vypadá
// jako ostrý provoz. Zdroj: StockSnap + WordPress Photo Directory, vše CC0 (bez
// uvádění autora). Názvy souborů jdou podle oboru: psi-1.jpg, nehty-2.jpg…
// Průměrná doba odpovědi: pod 2 h se píše v minutách, od 2 h výš v hodinách
// (rovné dvě hodiny jsou „2 h", ne „120 min").
function _pFmtReply(mins) {
  const m = Math.round(Number(mins) || 0);
  if (m <= 0) return '';
  return m < 120 ? m + ' min' : Math.round(m / 60) + ' h';
}

function _pDemoPeople() {
  const _demo = [
    { id: 'demo-p-1', name: 'Petr Hlaváč', verified: true, city: 'Brno', district: 'Brno — Veveří', rating: 4.9, ratingCount: 23,
      avatar: 'demo-lide/p1.jpg', photos: ['demo-lide/hodinky-1.jpg', 'demo-lide/hodinky-2.jpg', 'demo-lide/hodinky-3.jpg'],
      card_obor: 'remesla',
      card_offer: 'Jednou týdně opravuju hodinky, rád pomůžu. Vyměním baterii, řemínek i sklíčko, u mechanik zvládnu vyčištění a seřízení. Přines to kdykoli večer, většinou to mám hotové do druhého dne.',
      bio: 'Hodinky mě baví od malička — začínal jsem u dědy v dílně a teď to dělám i profesionálně v servisu. Nejsem žádná velká značka, ale poctivě a rád. Když si nebudeš vědět rady, poradím i po telefonu.',
      experience: '4 roky v hodinářském servisu', equipment: 'Vlastní nářadí i běžné náhradní díly',
      skills: ['Výměna baterie', 'Řemínky', 'Sklíčka', 'Čištění mechanik', 'Seřízení'],
      price: 'Dohodou', availability: ['Večery', 'Víkendy'],
      card_tags: ['Řemesla', 'Hodinky', 'Drobné opravy'], replyTime: 'do 2 hodin', helpCount: 31, mode: 'U mě i osobně',
      reviews: [{ text: 'Vyměnil mi řemínek za dvacet minut a nechtěl za to nic. Moc příjemné jednání.', author: 'Klára V.', month: 'červenec' }] },
    { id: 'demo-p-2', name: 'Tereza Nová', verified: true, city: 'Brno', district: 'Brno — střed', rating: 4.8, ratingCount: 41,
      avatar: 'demo-lide/p2.jpg', photos: ['demo-lide/doucovani-1.jpg', 'demo-lide/doucovani-2.jpg', 'demo-lide/doucovani-3.jpg'],
      card_obor: 'doucovani',
      card_offer: 'Doučuju matiku a fyziku, základka i střední. Připravím i na přijímačky a maturitu, vysvětlím to lidsky. Chodím k tobě nebo online.',
      bio: 'Studuju učitelství matematiky a doučování je pro mě radost, ne jen přivýdělek. Umím látku vysvětlit několika způsoby, dokud to nesedne. S dětmi mám trpělivost a nebojím se ani slabších studentů.',
      experience: 'Doučuju 3 roky, studuju učitelství', equipment: 'Materiály a příklady nachystám',
      skills: ['Matematika', 'Fyzika', 'Přijímačky', 'Příprava na maturitu'],
      price: 'Od 250 Kč', availability: ['Večery', 'Víkendy'],
      card_tags: ['Doučování', 'Matematika', 'Fyzika'], replyTime: 'do 1 hodiny', helpCount: 58, mode: 'U tebe i online',
      reviews: [{ text: 'Syn konečně pochopil zlomky. Trpělivá a připravená.', author: 'Jana P.', month: 'červen' }] },
    { id: 'demo-p-3', name: 'Martin Kraus', verified: true, city: 'Praha', district: 'Praha 7', rating: 5.0, ratingCount: 12,
      avatar: 'demo-lide/p3.jpg', photos: ['demo-lide/foto-1.jpg', 'demo-lide/foto-2.jpg', 'demo-lide/foto-3.jpg', 'demo-lide/foto-4.jpg'],
      photoNotes: {
        'demo-lide/foto-1.jpg': 'Portrét do portfolia — hodina v přírodním světle, bez blesku.',
        'demo-lide/foto-2.jpg': 'Ateliérové focení mazlíčků. Tohle byla trpělivost.',
        'demo-lide/foto-3.jpg': 'Reportáž z firemní akce na střeše, Praha 7.',
      },
      card_obor: 'foto',
      card_offer: 'Fotím portréty a akce, mám vlastní techniku i světla. Portréty, produktovku i menší eventy. Fotky dodám upravené do týdne.',
      bio: 'Focení dělám pátým rokem, mám vlastní ateliér i mobilní vybavení na výjezdy. Rád domluvím koncept dopředu, ať odcházíš s fotkami, které se ti opravdu líbí. Ukázky pošlu na požádání.',
      experience: 'Fotím 5 let, vlastní ateliér', equipment: 'Vlastní technika, světla i ateliér',
      skills: ['Portréty', 'Produktovka', 'Eventy', 'Retuš'],
      price: 'Od 500 Kč', availability: ['Flexibilně'],
      card_tags: ['Foto/Video', 'Portréty', 'Eventy'], replyTime: 'do 3 hodin', helpCount: 9, mode: 'U mě',
      reviews: [{ text: 'Skvělé portréty do portfolia, rychlé dodání.', author: 'Filip N.', month: 'srpen' }] },
    { id: 'demo-p-4', name: 'Adéla Pokorná', verified: false, city: 'Ostrava', district: 'Ostrava — Poruba', rating: 4.7, ratingCount: 16,
      avatar: 'demo-lide/p4.jpg', photos: ['demo-lide/stehovani-1.jpg', 'demo-lide/stehovani-2.jpg', 'demo-lide/stehovani-3.jpg'],
      card_obor: 'stehovani',
      card_offer: 'Pomůžu se stěhováním, mám dodávku a sílu. Naložím, odvezu i vynosím do patra. Klidně i o víkendu.',
      bio: 'Stěhování dělám při škole, mám dodávku po tátovi a partu spolehlivých kluků, když je potřeba víc rukou. Na čas dorazím, s nábytkem umím a nic ti nepoškrábu.',
      experience: 'Stěhuju 2 roky, vlastní dodávka', equipment: 'Vlastní dodávka, popruhy i deky',
      skills: ['Naložení', 'Odvoz', 'Vynošení do patra', 'Demontáž nábytku'],
      price: 'Od 200 Kč', availability: ['Víkendy', 'Flexibilně'],
      card_tags: ['Stěhování', 'Dodávka'], replyTime: 'do 5 hodin', helpCount: 22, mode: 'U tebe',
      reviews: [{ text: 'Přijela na čas, byt jsme stěhovali rychle. Doporučuju.', author: 'Ondřej M.', month: 'květen' }] },
    { id: 'demo-p-5', name: 'Jakub Souček', verified: true, city: 'Brno', district: 'Brno — Královo Pole', rating: 4.6, ratingCount: 19,
      avatar: 'demo-lide/p5.jpg', photos: ['demo-lide/it-1.jpg', 'demo-lide/it-2.jpg', 'demo-lide/it-3.jpg'],
      card_obor: 'it',
      card_offer: 'Postavím jednoduchý web nebo spravím počítač. Prezentaci, e-shop na míru i odvirování a zrychlení notebooku.',
      bio: 'Programuju při studiu na VUT a weby dělám od střední. Nejsem agentura, takže cena je férová a domluva rychlá. Web ti nejen udělám, ale i tě naučím ho spravovat, ať nejsi na mně závislý.',
      experience: 'Weby dělám 4 roky, student VUT', equipment: 'Přijedu s vlastním notebookem',
      skills: ['Weby', 'E-shopy', 'Odvirování', 'Zrychlení PC'],
      price: 'Dohodou', availability: ['Večery', 'Víkendy'],
      card_tags: ['IT', 'Weby'], replyTime: 'do 4 hodin', helpCount: 14, mode: 'U tebe i online',
      reviews: [{ text: 'Web mi udělal za víkend a naučil mě ho spravovat.', author: 'Lucie H.', month: 'červenec' }] },
    { id: 'demo-p-6', name: 'Klára Veselá', verified: true, city: 'Praha', district: 'Praha 3', rating: 4.9, ratingCount: 34,
      avatar: 'demo-lide/p6.jpg', photos: ['demo-lide/peceni-1.jpg', 'demo-lide/peceni-2.jpg', 'demo-lide/peceni-3.jpg'],
      card_obor: 'gastro',
      card_offer: 'Upeču dort na oslavu, zvládnu i bezlepkový. Dorty, cupcakes i cukroví podle přání. Objednávej pár dní dopředu.',
      bio: 'Peču z lásky už roky a nejvíc mě baví, když má být dort podle konkrétní představy. Zvládnu i bezlepkové a veganské varianty. Domluvíme se na chuti i vzhledu předem, ať tě nic nepřekvapí.',
      experience: 'Peču na objednávku 4 roky', equipment: 'Vlastní formy, zdobení i suroviny',
      skills: ['Dorty', 'Cupcakes', 'Cukroví', 'Bezlepkové', 'Veganské'],
      price: 'Od 350 Kč', availability: ['Flexibilně'],
      card_tags: ['Gastro', 'Pečení', 'Dorty'], replyTime: 'do 2 hodin', helpCount: 27, mode: 'U mě',
      reviews: [{ text: 'Nejlepší dort na oslavu, všem chutnal. Domluva bez problému.', author: 'Petra K.', month: 'srpen' }] },
    { id: 'demo-p-7', name: 'Filip Marek', verified: false, city: 'Zlín', district: 'Zlín — střed', rating: 0, ratingCount: 0,
      avatar: 'demo-lide/p7.jpg', photos: ['demo-lide/elektro-1.jpg', 'demo-lide/elektro-2.jpg', 'demo-lide/elektro-3.jpg'],
      card_obor: 'remesla',
      card_offer: 'Opravím ti zásuvku nebo světlo, mám papíry na elektro. Drobné elektroinstalace a výměny po bytě.',
      bio: 'Jsem vyučený elektrikář a brigádně pomáhám i s drobnostmi po bytě, na které elektrikáři nechtějí jezdit. Dělám to bezpečně a podle předpisů — u elektřiny se nešidí.',
      experience: 'Vyučený elektrikář', equipment: 'Vlastní nářadí i měřicí přístroje',
      skills: ['Zásuvky', 'Světla', 'Drobné instalace', 'Výměny'],
      price: 'Dohodou', availability: ['Přes den', 'Víkendy'],
      card_tags: ['Řemesla', 'Elektro'], replyTime: 'do 6 hodin', helpCount: 0, mode: 'U tebe', reviews: [] },
    { id: 'demo-p-8', name: 'Nikol Urbanová', verified: false, city: 'Olomouc', district: 'Olomouc — Nová Ulice', rating: 0, ratingCount: 0,
      avatar: 'demo-lide/p8.jpg', photos: ['demo-lide/kytara-1.jpg', 'demo-lide/kytara-2.jpg', 'demo-lide/kytara-3.jpg'],
      card_obor: 'hudba',
      card_offer: 'Učím kytaru začátečníky, docházím i domů. Akordy, doprovod k písničkám, tempo dle tebe.',
      bio: 'Hraju na kytaru přes deset let a učení mě baví. Začátečníky vezmu úplně od nuly — první písničku zvládneš rychleji, než čekáš. Tempo i styl přizpůsobím tomu, co chceš hrát.',
      experience: 'Hraju 10 let', equipment: 'Kytaru na hodinu půjčím',
      skills: ['Akordy', 'Doprovod', 'Noty od nuly', 'Rytmus'],
      price: 'Od 300 Kč', availability: ['Večery'],
      card_tags: ['Hudba', 'Kytara', 'Výuka'], replyTime: 'do 1 dne', helpCount: 0, mode: 'U tebe i online', reviews: [] },
    { id: 'demo-p-9', name: 'Lucie Horáková', verified: true, city: 'Praha', district: 'Praha 4', rating: 4.9, ratingCount: 28,
      avatar: 'demo-lide/p9.jpg', photos: ['demo-lide/uklid-1.jpg', 'demo-lide/uklid-2.jpg', 'demo-lide/uklid-3.jpg'],
      card_obor: 'uklid',
      card_offer: 'Uklidím ti byt, umyju okna nebo vyžehlím. Pravidelný i jednorázový úklid domácnosti, spolehlivě a v tichosti. Přijedu s vlastní chemií.',
      bio: 'Úklidu se věnuju pár let a mám ráda, když je po mně vidět. Jsem důsledná, na čas a nešťourám se v tvých věcech. Domluvíme se na rozsahu i frekvenci, ať to sedne přesně tobě.',
      experience: 'Uklízím 4 roky', equipment: 'Vlastní úklidová chemie i pomůcky',
      skills: ['Úklid domácnosti', 'Mytí oken', 'Žehlení', 'Generální úklid'],
      price: 'Od 220 Kč', availability: ['Přes den', 'Flexibilně'],
      card_tags: ['Úklid', 'Domácnost'], replyTime: 'do 2 hodin', helpCount: 34, mode: 'U tebe',
      reviews: [{ text: 'Byt zářil, okna bez šmouh. Domluva i příchod bez problému.', author: 'Martina S.', month: 'srpen' }] },
    { id: 'demo-p-10', name: 'Jarda Beneš', verified: false, city: 'Brno', district: 'Brno — Bystrc', rating: 4.7, ratingCount: 12,
      avatar: 'demo-lide/p10.jpg', photos: ['demo-lide/zahrada-1.jpg', 'demo-lide/zahrada-2.jpg', 'demo-lide/zahrada-3.jpg'],
      card_obor: 'zahrada',
      card_offer: 'Posekám trávník, ostříhám plot nebo shrabu listí. Menší zahradní práce, mám vlastní sekačku i křovinořez. Klidně i pravidelně.',
      bio: 'Zahradě se věnuju od malička u chalupy a teď pomáhám i lidem v okolí. Práci si po sobě uklidím a poradím, co s čím. Nebojím se ani zarostlé zahrady.',
      experience: 'Zahradní práce 3 sezóny', equipment: 'Vlastní sekačka i křovinořez',
      skills: ['Sekání trávy', 'Střihání plotů', 'Hrabání listí', 'Úklid zahrady'],
      price: 'Od 200 Kč', availability: ['Víkendy', 'Flexibilně'],
      card_tags: ['Zahrada', 'Sekání'], replyTime: 'do 4 hodin', helpCount: 15, mode: 'U tebe',
      reviews: [{ text: 'Zarostlou zahradu dal do pořádku za odpoledne. Spokojenost.', author: 'Karel D.', month: 'červenec' }] },
    { id: 'demo-p-11', name: 'Bára Němcová', verified: true, city: 'Praha', district: 'Praha 8', rating: 5.0, ratingCount: 21,
      avatar: 'demo-lide/p11.jpg', photos: ['demo-lide/deti-1.jpg', 'demo-lide/deti-2.jpg', 'demo-lide/deti-3.jpg'],
      card_obor: 'hlidani',
      card_offer: 'Pohlídám ti děti — odpoledne, večer i o víkendu. Vyzvednu ze školky, pomůžu s úkoly a zabavím. Zkušenosti i s malými dětmi.',
      bio: 'Studuju pedagogiku a hlídání mě baví. Mám mladší sourozence, takže s dětmi umím a jsem trpělivá. Rodičům pošlu během hlídání zprávu, ať mají klid.',
      experience: 'Hlídám děti 3 roky, studuju pedagogiku', equipment: 'Přinesu hry i nápady na zabavení',
      skills: ['Hlídání dětí', 'Vyzvednutí ze školky', 'Pomoc s úkoly', 'Doprovod na kroužky'],
      price: 'Od 180 Kč', availability: ['Večery', 'Víkendy'],
      card_tags: ['Hlídání', 'Děti'], replyTime: 'do 1 hodiny', helpCount: 26, mode: 'U tebe',
      reviews: [{ text: 'Děti si ji hned oblíbily, spolehlivá a milá. Doporučuju.', author: 'Tereza H.', month: 'srpen' }] },
    { id: 'demo-p-12', name: 'Tomáš Král', verified: false, city: 'Ostrava', district: 'Ostrava — Mariánské Hory', rating: 4.8, ratingCount: 17,
      avatar: 'demo-lide/p12.jpg', photos: ['demo-lide/psi-1.jpg', 'demo-lide/psi-2.jpg', 'demo-lide/psi-3.jpg'],
      photoNotes: {
        'demo-lide/psi-2.jpg': 'Odpolední procházka, fotku posílám rodičům vždycky.',
      },
      card_obor: 'zvirata',
      card_offer: 'Vyvenčím ti psa nebo ho pohlídám, když jsi v práci. Procházky, krmení i pohlídání přes den. Mám psa, takže vím, jak na to.',
      bio: 'Psi jsou moje srdcovka — mám doma border kolii a venčení mě nabíjí. S pejsky umím i s těmi neposednými a pošlu ti fotku z procházky, ať máš klid.',
      experience: 'Venčím a hlídám psy 2 roky', equipment: 'Náhradní vodítko i pamlsky s sebou',
      skills: ['Venčení psů', 'Hlídání přes den', 'Krmení', 'Procházky'],
      price: 'Od 150 Kč', availability: ['Přes den', 'Flexibilně'],
      card_tags: ['Zvířata', 'Venčení psů'], replyTime: 'do 3 hodin', helpCount: 19, mode: 'U tebe',
      reviews: [{ text: 'Naše kolie ho zbožňuje, po procházce spokojený pes. Super.', author: 'Lenka V.', month: 'červen' }] },
    { id: 'demo-p-13', name: 'Denisa Fialová', verified: true, city: 'Brno', district: 'Brno — Řečkovice', rating: 4.9, ratingCount: 39,
      avatar: 'demo-lide/p13.jpg', photos: ['demo-lide/nehty-1.jpg', 'demo-lide/nehty-2.jpg', 'demo-lide/nehty-3.jpg'],
      photoNotes: {
        'demo-lide/nehty-1.jpg': 'Gel-lak, mandlový tvar, přírodní odstín. Vydrží tři týdny.',
        'demo-lide/nehty-3.jpg': 'Můj koutek doma — vlastní vybavení i materiál.',
      },
      card_obor: 'krasa',
      card_offer: 'Udělám ti nehty, řasy nebo obočí u mě doma. Manikúra, gel-lak, lash lifting i úprava obočí. Domluv se pár dní dopředu.',
      bio: 'Kráse se věnuju profesionálně i z lásky. Mám vlastní malý koutek u sebe doma, kde je klid a pohoda. Poradím i s tím, co ti bude slušet a vydrží.',
      experience: 'Nehtová a řasová stylistka 4 roky', equipment: 'Vlastní vybavení i materiál',
      skills: ['Manikúra', 'Gel-lak', 'Lash lifting', 'Úprava obočí'],
      price: 'Od 350 Kč', availability: ['Přes den', 'Večery'],
      card_tags: ['Krása', 'Nehty', 'Řasy'], replyTime: 'do 2 hodin', helpCount: 31, mode: 'U mě',
      reviews: [{ text: 'Nehty vydržely tři týdny bez ztráty lesku. Šikovná a milá.', author: 'Aneta K.', month: 'srpen' }] },
  ];
  // Doplní chybějící trust pole (počet zakázek, reakční doba, kde působí), ať je
  // důvěryhodnostní pruh plný i u starších demo lidí. Vlastní hodnoty mají přednost.
  return _demo.map((p, i) => Object.assign({
    helpCount: p.ratingCount || 0,
    cancelled: 0,
    mode: 'U tebe i online',
    radius: [10, 15, 20, 12][i % 4],
    priceUnit: i % 2 ? 'za zakázku' : 'za hodinu',
  }, p, {
    replyTime: [42, 90, 120, 180][i % 4],   // v minutách; formátuje _pFmtReply
  }));
}

// ── Malé obrysové ikonky (styl návrhu) ────────────────────────────
const _PIco = {
  search: c => <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6.6" fill="none" stroke={c} strokeWidth="1.5" /><path d="M14 14l3 3" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>,
  plus: c => <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3.2v9.6M3.2 8h9.6" stroke={c} strokeWidth="1.7" strokeLinecap="round" /></svg>,
  sort: c => <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.4 4.4h11.2M4.4 8h7.2M6.6 11.6h2.8" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>,
  back: c => <svg width="11" height="18" viewBox="0 0 12 20" aria-hidden="true"><path d="M9.4 2L2.6 10l6.8 8" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  share: c => <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><circle cx="13.5" cy="4" r="2.6" fill="none" stroke={c} strokeWidth="1.5" /><circle cx="4.5" cy="9" r="2.6" fill="none" stroke={c} strokeWidth="1.5" /><circle cx="13.5" cy="14" r="2.6" fill="none" stroke={c} strokeWidth="1.5" /><path d="M6.9 7.8l4.2-2.4M6.9 10.2l4.2 2.4" stroke={c} strokeWidth="1.5" /></svg>,
  clock: c => <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.2" fill="none" stroke={c} strokeWidth="1.5" /><path d="M9 5.2v4l2.6 1.8" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  starOutline: c => <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 1.8l2.2 4.45 4.9.72-3.55 3.45.84 4.88L9 12.99 4.61 15.3l.84-4.88L1.9 6.97l4.9-.72L9 1.8z" fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  pin: c => <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 1.6a5.2 5.2 0 0 1 5.2 5.2c0 3.6-5.2 9.6-5.2 9.6S3.8 10.4 3.8 6.8A5.2 5.2 0 0 1 9 1.6Z" fill="none" stroke={c} strokeWidth="1.5" /><circle cx="9" cy="6.8" r="1.9" fill="none" stroke={c} strokeWidth="1.5" /></svg>,
  chat: c => <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M2.8 6.6A3 3 0 0 1 5.8 3.6h8.4a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8.6L4.4 17.8v-3.2A3 3 0 0 1 2.8 11.6Z" fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" /></svg>,
  coin: c => <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.2" fill="none" stroke={c} strokeWidth="1.5" /><path d="M9 5v8M6.9 6.9c.4-.8 1.2-1.1 2.2-1.1 1.2 0 2 .5 2 1.4 0 .8-.7 1.1-2 1.3-1.3.2-2.1.6-2.1 1.4 0 .9.9 1.4 2.1 1.4 1 0 1.8-.3 2.2-1" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  calendar: c => <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><rect x="2.8" y="4" width="12.4" height="11.2" rx="2.4" fill="none" stroke={c} strokeWidth="1.5" /><path d="M6 2.6v2.8M12 2.6v2.8M2.8 7.6h12.4" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>,
};

// ── Vyhledávání s typewriter efektem v placeholderu ───────────────
// Samostatná komponenta → animace překresluje jen search bar, ne celý grid.
function WPeopleSearch({ value, onChange }) {
  const empty = !value;
  const [typed, setTyped] = useStateW('');
  const [blink, setBlink] = useStateW(true);

  useEffectW(() => {
    if (!empty) return;
    let alive = true, wi = 0, ci = 0, del = false, t = null;
    const step = () => {
      if (!alive) return;
      const w = _P_HLEDEJ[wi % _P_HLEDEJ.length];
      if (!del) { ci++; t = setTimeout(step, ci >= w.length ? 1500 : 85); if (ci >= w.length) del = true; }
      else { ci--; if (ci <= 0) { del = false; wi++; ci = 0; t = setTimeout(step, 420); } else t = setTimeout(step, 42); }
      setTyped(w.slice(0, Math.max(0, ci)));
    };
    t = setTimeout(step, 450);
    return () => { alive = false; clearTimeout(t); };
  }, [empty]);

  useEffectW(() => {
    if (!empty) return;
    const iv = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(iv);
  }, [empty]);

  const ph = empty ? ('Hledej ' + typed + (blink ? '|' : ' ')) : '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid ' + T.border, borderRadius: 16, padding: '13px 15px' }}>
      <WSearchIco size={18} color={T.muted} />
      <input value={value} onChange={onChange} placeholder={ph} aria-label="Hledat pomoc"
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontFamily: T.fontUI, fontSize: 14, color: T.ink }} />
      {value && <button onClick={() => onChange({ target: { value: '' } })} title="Vymazat" style={{ border: 'none', background: 'none', color: T.muted, cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>}
    </div>
  );
}

// ── Skeleton kartička (modrý tint) — drží rozměry skutečné karty ──
function WPersonSkeleton() {
  const bar = (w, h, r, d) => <span className={'wsk wsk--blue' + (d ? ' wsk--d' + d : '')} style={{ display: 'block', width: w, height: h, borderRadius: r }} />;
  return (
    <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span className="wsk wsk--blue" style={{ display: 'block', width: '100%', aspectRatio: '4 / 3', borderRadius: 16 }} />
      {bar('70%', 14, 8, 1)}
      {bar('50%', 12, 7, 2)}
      {bar('60%', 11, 7, 2)}
      {bar('40%', 12, 7, 3)}
    </div>
  );
}

// ── Kartička v mřížce (2 sloupce, styl Seznam Firmy zkompaktněný) ─────
function WPersonGridCard({ person, onTap, idx = 0 }) {
  const [saved, setSaved] = useStateW(() => _pIsSaved(person.id));
  const cover  = (Array.isArray(person.photos) && person.photos[0]) || '';
  const cena   = person.price || 'Dohodou';
  const maCislo = /\d/.test(cena);
  const rating = Number(person.rating) || 0;
  const offer  = person.card_offer || person.bio || '';
  const tags   = (Array.isArray(person.card_tags) && person.card_tags.length) ? person.card_tags : (Array.isArray(person.skills) ? person.skills : []);
  return (
    <div onClick={onTap} className="wpin" role="button" tabIndex={0} style={{
      cursor: 'pointer', width: '100%', minWidth: 0, WebkitTapHighlightColor: 'transparent',
      display: 'flex', flexDirection: 'column', gap: 8,
      animationDelay: Math.min(idx * 26, 360) + 'ms',
    }}>
      {/* Cover foto — srdíčko vpravo nahoře, obličej v bílém rámečku vlevo dole */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 16, overflow: 'hidden', background: T.heroGrad }}>
        {cover
          ? <img src={cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 30 }}>{_pInitials(person.name)}</span>}
        <button onClick={e => { e.stopPropagation(); const nv = !saved; setSaved(nv); _pSetSaved(person.id, nv); }} title={saved ? 'Uloženo' : 'Uložit'} style={{
          position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 999, border: 'none',
          background: 'rgba(11,18,51,0.32)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'grid', placeItems: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', padding: 0,
        }}>
          <WSrdceIko w={16} h={15} saved={saved} off="#fff" tah={2} />
        </button>
        {/* Hodnocení vlevo nahoře — zelené 4,8+, jinak tmavá pilulka; hvězda vždy zlatá */}
        {rating > 0 && (
          <span style={Object.assign({ position: 'absolute', top: 8, left: 8, display: 'inline-flex', alignItems: 'center', gap: 3, borderRadius: 999, color: '#fff', fontFamily: T.fontHead, fontSize: 11.5, fontWeight: 800, padding: '3px 8px 3px 6px' },
            rating >= 4.8 ? { background: '#1E9E52' } : { background: 'rgba(11,18,51,0.42)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' })}>
            <WStar size={11} color={T.super} />{rating.toFixed(1).replace('.', ',')}
          </span>
        )}
        {/* Spodní gradient — ať je bílé jméno na fotce čitelné */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', background: 'linear-gradient(180deg, rgba(11,18,51,0) 0%, rgba(11,18,51,0.8) 100%)', pointerEvents: 'none' }} />
        {/* Profilovka + jméno (+ověření) + hodnocení — přímo na fotce, šetří místo */}
        <span style={{ position: 'absolute', left: 9, right: 9, bottom: 9, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {person.avatar && (
            <span style={{ flex: 'none', width: 38, height: 38, borderRadius: 11, overflow: 'hidden', background: '#fff', border: '2.5px solid #fff', boxShadow: '0 2px 8px rgba(11,18,51,0.28)' }}>
              <img src={person.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 22%', display: 'block' }} />
            </span>
          )}
          <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ minWidth: 0, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, color: '#fff', letterSpacing: -0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>{_pShort(person.name)}</span>
            {person.verified && (typeof WVerifiedBadge === 'function' ? <WVerifiedBadge size={14} /> : null)}
          </span>
        </span>
      </div>
      {/* Info — jméno/hodnocení je na fotce; tady CO nabízí, dovednosti, cena */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        {/* CO nabízí — hlavní info, ať se pozná bez rozkliknutí (2 řádky) */}
        {offer && (
          <span style={{ fontFamily: T.fontUI, fontSize: 12.5, lineHeight: 1.35, color: T.muted, fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{offer}</span>
        )}

        {/* Filtry / obory — jen 2 */}
        {tags.length > 0 && (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 1 }}>
            {tags.slice(0, 2).map((t, i) => (
              <span key={i} style={{ fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 700, color: T.primary, background: 'rgba(0,32,246,0.07)', padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t}</span>
            ))}
          </span>
        )}

        {/* Peněženka + cena — menším písmem, ať se vejde i jednotka */}
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, minWidth: 0 }}>
          <Icon name="wallet-money-bold" size={14} color="#B8860B" />
          <span style={{ minWidth: 0, fontFamily: T.fontHead, fontSize: 12.5, fontWeight: 800, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {cena}{maCislo && person.priceUnit ? <span style={{ fontFamily: T.fontUI, fontWeight: 600, fontSize: 11, color: T.muted }}>{' / ' + person.priceUnit.replace(/^za\s+/i, '')}</span> : null}
          </span>
        </span>
      </div>
    </div>
  );
}

// ── Nadpisy sekcí karty (barevný kolečkový odznak) ────────────────
// Sdílí je detail člověka i editor „Moje karta" — díky tomu vypadá editor
// jako výsledná karta a člověk hned vidí, co kterou sekcí plní. Ikony jsou
// tytéž Solar ikony jako u sekcí v detailu brigády, ať je to v celé appce
// jednotné. Funkce (ne hotové JSX), protože `Icon` je globální komponenta
// z app.jsx a nemusí být v době načtení tohohle souboru ještě definovaná.
const _P_SEK = {
  // Fotky = cover karty (modrý foťák jako v ovládání appky)
  foto: { bg: '#E7EDFF', ico: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="#0020F6" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M3 8.6A2.6 2.6 0 0 1 5.6 6h1.9l1.2-2h6.6l1.2 2h1.9A2.6 2.6 0 0 1 21 8.6v8.8A2.6 2.6 0 0 1 18.4 20H5.6A2.6 2.6 0 0 1 3 17.4Z" />
      <circle cx="12" cy="13" r="3.6" />
    </svg>
  ) },
  // „Nabízí" = zelený check-trend jako „Co ti nabídneme" u brigády
  offer: { bg: '#DFF3E3', ico: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17 L10 11 L14 14 L20 7" stroke="#2FA84F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7 L20 7 L20 12" stroke="#2FA84F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) },
  // Cena — peněženka (outline) dle předlohy
  price: { bg: '#FFF4D6', ico: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="#B8860B" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8.5A2.5 2.5 0 0 1 5 6h13a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 20H5a2.5 2.5 0 0 1-2.5-2.5v-9Z" />
      <path d="M4.4 6 13.7 2.85a1.4 1.4 0 0 1 1.8.9L16.3 6" />
      <path d="M21.5 11h-3.2a2.5 2.5 0 0 0 0 5h3.2a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1Z" />
      <circle cx="18.4" cy="13.5" r="1" fill="#B8860B" stroke="none" />
    </svg>
  ) },
  // „Co umím" = palec nahoru (v čem je člověk dobrý)
  skill: { bg: '#E1F0FE', ico: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#2196F3" aria-hidden="true">
      {/* posun o 1 dolů → tvar palce (tažený nahoru) opticky sedne na střed kolečka */}
      <path transform="translate(0 1)" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
    </svg>
  ) },
  user: { bg: '#FFEDD5', ico: () => <Icon name="user-bold" size={15} color="#EA7317" /> },
  // Čísla pod jménem (hodnocení, zakázky, reakce) — štít s fajfkou
  trust: { bg: '#E4F6EA', ico: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="#1E9E52" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.8 4.8 5.6v5.9c0 4.4 3 8.2 7.2 9.7 4.2-1.5 7.2-5.3 7.2-9.7V5.6Z" />
      <path d="m8.9 12.1 2.2 2.2 4-4.4" />
    </svg>
  ) },
  list: { bg: '#EDE9FE', ico: () => <Icon name="checklist-minimalistic-bold" size={15} color="#7C3AED" /> },
};
// Nadpis sekce na kartě: stejná ikonka jako v editoru, ale písmo zůstává velké
// (18px), aby nadpis dál držel hierarchii. WSekHead má 15px kvůli hlavičkám boxů.
function WSekHeadKarta({ kind, title }) {
  const s = _P_SEK[kind] || _P_SEK.list;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 28, height: 28, flex: 'none', borderRadius: 999, background: s.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{s.ico()}</span>
      <span style={{ fontFamily: T.fontHead, fontSize: 18, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>{title}</span>
    </span>
  );
}

function WSekHead({ kind, title, right }) {
  const s = _P_SEK[kind] || _P_SEK.list;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: 26, height: 26, flex: 'none', borderRadius: 999, background: s.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{s.ico()}</span>
      <span style={{ flex: 1, minWidth: 0, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>{title}</span>
      {right || null}
    </span>
  );
}

// ── Detail člověka — styl A (sekce v bílých kartách) ──────────────
// Vedle něj žije WPersonDetailB (styl podle nové předlohy). Co se ukáže,
// řídí přepínač A / B / C v tržišti (C = B s profilovkou a pruhem čísel).
// `preview` = náhled vlastní karty z editoru: schová ⋯ (hlásit/blokovat sám
// sebe nedává smysl), spodní tlačítka nechá vidět, ale neaktivní, a nahoře
// přidá pilulku „Náhled tvé karty", ať je jasné, že to ostatní ještě nevidí.
function WPersonDetail({ person, onClose, onContact, onBlocked, preview }) {
  const [saved, setSaved] = useStateW(() => _pIsSaved(person.id));
  const [coverIdx, setCoverIdx] = useStateW(0);
  const [showReviews, setShowReviews] = useStateW(false);   // panel recenzí zespoda
  const [album, setAlbum] = useStateW(-1);            // index otevřené fotky ve fotoalbu, -1 = zavřeno
  // Nabídka ⋯ — sdílet / nahlásit / zablokovat (App Store Guideline 1.2).
  const [menuOpen, setMenuOpen] = useStateW(false);
  const [menuZavira, setMenuZavira] = useStateW(false);
  const [reportOpen, setReportOpen] = useStateW(false);
  const [blokDialog, setBlokDialog] = useStateW(false);
  const [blokuji, setBlokuji] = useStateW(false);
  const [blokChyba, setBlokChyba] = useStateW('');
  const zavriMenu = (pak) => {
    setMenuZavira(true);
    setTimeout(() => { setMenuOpen(false); setMenuZavira(false); if (pak) pak(); }, 140);
  };
  const sdilej = () => { try { navigator.share && navigator.share({ title: person.name, text: person.card_offer || '' }); } catch (e) {} };
  const coverRef = useRefW(null);

  const tags   = Array.isArray(person.card_tags) ? person.card_tags : [];
  const skills = (Array.isArray(person.skills) && person.skills.length) ? person.skills : tags;
  const reviews = Array.isArray(person.reviews) ? person.reviews : [];
  const coverPhotos = Array.isArray(person.photos) ? person.photos : [];   // swajpovatelné pozadí
  const initials = _pInitials(person.name);

  const onCoverScroll = () => { const el = coverRef.current; if (el && el.clientWidth) setCoverIdx(Math.round(el.scrollLeft / el.clientWidth)); };

  const cardBox = { background: '#fff', border: '1px solid ' + T.border, borderRadius: 22, padding: '16px 17px', display: 'flex', flexDirection: 'column', gap: 10 };
  const cardH = { fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: T.ink };

  const avail = Array.isArray(person.availability) ? person.availability.join(' · ') : '';
  // Podrobnosti (spec-sheet). Hodnocení/zakázky/reakce jsou v trust pruhu nahoře,
  // „Kde/dojezd" je u ceny v sekci Nabízí — sem nepatří, ať se nedubluje.
  const facts = [
    avail && { k: 'Dostupnost', v: avail },
    person.mode && { k: 'Kde', v: person.mode },
    person.equipment && { k: 'Vybavení', v: person.equipment },
  ].filter(Boolean);

  // Rychlá důvěra pod jménem (číslo + důkaz + popis).
  const jobsDone = person.jobsDone || person.helpCount || person.ratingCount || 0;
  // Každý sloupec se dá v editoru karty vypnout (`ukazovat`). Co tam není
  // uvedené, se ukazuje — demo lidi ani starší karty to pole nemají.
  const uk = person.ukazovat || {};
  const zobraz = { hodnoceni: uk.hodnoceni !== false, zakazky: uk.zakazky !== false, reakce: uk.reakce !== false };
  const maPruh = zobraz.hodnoceni || zobraz.zakazky || zobraz.reakce;

  // Adresu (město) ukazuje jen identita pod jménem. Způsob (u tebe / online),
  // dojezd i logistiku řeší chat — na kartě to nemá co dělat.

  // Prosvítající šedý kruh s tmavou ikonou (styl Airbnb) — fotka pod ním je
  // pořád znát, rozostření drží ikonu čitelnou i na členitém pozadí.
  const kruh = { width: 38, height: 38, flex: 'none', border: 'none', borderRadius: 999, background: 'rgba(236,237,242,0.68)', backdropFilter: 'blur(12px) saturate(1.1)', WebkitBackdropFilter: 'blur(12px) saturate(1.1)', display: 'grid', placeItems: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' };


  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      {/* Celý profil scrolluje — cover i profilovka odjedou nahoru (nic přilepeného) */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {/* ── Cover (pozadí) — swajpovatelné fotky práce, tečky ── */}
        {/* Cover bere skoro polovinu obrazovky — fotky práce jsou to hlavní,
            co člověka na kartě zaujme (stejný poměr jako u Airbnb). */}
        <div style={{ position: 'relative', height: 'min(42vh, 400px)', minHeight: 240, background: T.heroGrad }}>
          {coverPhotos.length > 0 && (
            <div ref={coverRef} onScroll={onCoverScroll} style={{ position: 'absolute', inset: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              {coverPhotos.map((src, i) => (
                <div key={i} onClick={() => setAlbum(i)} style={{ flex: '0 0 100%', width: '100%', height: '100%', scrollSnapAlign: 'center', cursor: 'pointer' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          )}
          {preview && coverPhotos.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fff', textAlign: 'center', padding: '0 30px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round"><path d="M3 8.6A2.6 2.6 0 0 1 5.6 6h1.9l1.2-2h6.6l1.2 2h1.9A2.6 2.6 0 0 1 21 8.6v8.8A2.6 2.6 0 0 1 18.4 20H5.6A2.6 2.6 0 0 1 3 17.4Z" /><circle cx="12" cy="13" r="3.6" /></svg>
              <span style={{ fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600, opacity: .88, lineHeight: 1.45 }}>Bez fotek je tady prázdno — přidej pár ukázek své práce.</span>
            </div>
          )}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 88, background: 'linear-gradient(180deg, rgba(11,18,51,.16), rgba(11,18,51,0))', pointerEvents: 'none' }} />
          {/* Počítadlo fotek — stejná pilulka jako u stylů B a C. Sedí výš (38 px),
              protože list s obsahem sem zespoda přesahuje o 26 px. */}
          {coverPhotos.length > 0 && (
            <span style={{ position: 'absolute', right: 12, bottom: 38, padding: '5px 11px', borderRadius: 999, background: 'rgba(11,18,51,0.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#fff', fontFamily: T.fontHead, fontSize: 12, fontWeight: 700, pointerEvents: 'none' }}>{(coverIdx + 1) + ' / ' + coverPhotos.length}</span>
          )}
        </div>

        {/* ── Obsah najíždí na fotku jako list se zaoblenými rohy (styl Airbnb),
               profilovka z něj přesahuje nahoru do cover fotky. ── */}
        {/* display:flow-root — jinak by záporný margin profilovky „prolnul" ven
            a vytáhl celý list nahoru místo toho, aby z něj profilovka koukala. */}
        <div style={{ position: 'relative', zIndex: 2, marginTop: -26, borderRadius: '26px 26px 0 0', background: T.bg, boxShadow: '0 -10px 26px rgba(11,18,51,0.10)', padding: '0 18px 2px', display: 'flow-root' }}>
          <div style={{ marginTop: -54, position: 'relative', zIndex: 2 }}>
            <span style={{ display: 'inline-block', width: 108, height: 108, borderRadius: 999, overflow: 'hidden', background: T.heroGrad, border: '4px solid ' + T.bg, boxShadow: '0 12px 26px -8px rgba(0,0,0,0.5)' }}>
              {person.avatar
                ? <img src={person.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 22%', display: 'block' }} />
                : <span style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 36 }}>{initials}</span>}
            </span>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: T.fontHead, fontSize: 23, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>{person.name}</span>
              {person.verified && (typeof WVerifiedBadge === 'function' ? <WVerifiedBadge size={19} /> : <Icon name="verified-check-bold" size={18} color={T.primary} />)}
            </div>
            {(person.city || person.district) && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5, fontFamily: T.fontUI, fontSize: 13.5, color: '#5B6488', fontWeight: 600 }}>
                <Icon name="map-point-bold" size={14} color={T.mutedSoft} />{person.city || person.district}
              </div>
            )}
            {/* Rychlá důvěra — 3 sloupce: číslo nahoře, drobný důkaz uprostřed,
                popiska dole. Bez škatulek. U hodnocení jen řada hvězd (částečná
                výplň poslední — 4,5 = 4 plné + půlka). */}
            {maPruh && (
            <div style={{ display: 'flex', marginTop: 13 }}>
              {/* Hodnocení — celý sloupec je proklik na recenze (číslo, hvězdy i text) */}
              {zobraz.hodnoceni && (() => {
                const obsah = (
                  <>
                    <span style={{ fontFamily: T.fontHead, fontSize: 21, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>{person.rating > 0 ? Number(person.rating).toFixed(1).replace('.', ',') : '—'}</span>
                    <span style={{ height: 14, display: 'inline-flex', alignItems: 'center' }}>
                      {person.rating > 0 && typeof WStars === 'function'
                        ? <WStars value={person.rating} size={12} />
                        : <span style={{ fontFamily: T.fontUI, fontSize: 11, color: T.mutedSoft }}>zatím nic</span>}
                    </span>
                    <span style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: person.ratingCount > 0 ? 700 : 600, color: person.ratingCount > 0 ? T.primary : '#5B6488' }}>{person.ratingCount > 0 ? person.ratingCount + ' recenzí' : 'Bez recenzí'}</span>
                  </>
                );
                const sloupec = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' };
                return person.ratingCount > 0
                  ? <button onClick={() => setShowReviews(true)} style={{ ...sloupec, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>{obsah}</button>
                  : <div style={sloupec}>{obsah}</div>;
              })()}
              {/* Zakázky */}
              {zobraz.zakazky && (
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 21, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>{jobsDone}</span>
                {/* Míra úspěšnosti — barevná pilulka (dokončené vs. zrušené) */}
                <span style={{ height: 14, display: 'inline-flex', alignItems: 'center' }}>
                  {jobsDone > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: '#E4F6EA', border: '1px solid #BFE6CC' }}>
                      <span style={{ width: 5, height: 5, borderRadius: 999, background: '#1E9E52', flexShrink: 0 }} />
                      <span style={{ fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 800, color: '#1E7A46', whiteSpace: 'nowrap' }}>{(person.cancelled || 0) > 0 ? Math.round(jobsDone / (jobsDone + person.cancelled) * 100) : 100}% úspěšně</span>
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 600, color: '#5B6488' }}>hotových zakázek</span>
              </div>
              )}
              {/* Reakce */}
              {zobraz.reakce && (
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 21, fontWeight: 800, color: T.ink, letterSpacing: -0.4, whiteSpace: 'nowrap' }}>{person.replyTime ? _pFmtReply(person.replyTime) : '—'}</span>
                {/* Malá barevná čárka podle rychlosti: do 60 zelená, do 120 žlutá, nad 2 h oranžová */}
                <span style={{ height: 14, display: 'inline-flex', alignItems: 'center' }}>
                  {Number(person.replyTime) > 0 && (
                    <span style={{ width: 26, height: 7, borderRadius: 999, background: Number(person.replyTime) <= 60 ? '#1E9E52' : Number(person.replyTime) <= 120 ? '#F0A600' : '#E8552E' }} />
                  )}
                </span>
                <span style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 600, color: '#5B6488' }}>průměrná doba odpovědi</span>
              </div>
              )}
            </div>
            )}
          </div>
        </div>

        {/* ── Sekce (normální text, scrolluje) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px calc(94px + env(safe-area-inset-bottom))' }}>
        {/* Nabízí — jen headline, cena je vlastní sekce níž */}
        {person.card_offer && (
          <div style={cardBox}>
            <WSekHead kind="offer" title="Nabízí" />
            <span style={{ fontFamily: T.fontUI, fontSize: 14, color: T.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{person.card_offer}</span>
          </div>
        )}

        {/* Cena — samostatná sekce. NENÍ povinná: kdo nechce pevnou částku, dá
            „Dohodou" / „Podle rozsahu" (bez čísla → bez základu). Prázdné = Dohodou. */}
        {(() => {
          const cena = person.price || 'Dohodou';
          const maCislo = /\d/.test(cena);
          return (
            <div style={cardBox}>
              <WSekHead kind="price" title="Cena" />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>{cena}</span>
                {maCislo && person.priceUnit && <span style={{ fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 600, color: T.muted }}>{person.priceUnit}</span>}
              </div>
              <span style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.mutedSoft, lineHeight: 1.5 }}>Cena není závazná, všechny detaily doladíte v chatu.</span>
            </div>
          );
        })()}

        {/* Co umím */}
        {skills.length > 0 && (
          <div style={cardBox}>
            <WSekHead kind="skill" title="Co umím" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {skills.map((s, i) => (
                <span key={i} style={{ fontFamily: T.fontUI, fontSize: 13, fontWeight: 700, color: T.ink, background: T.surfaceAlt, padding: '8px 13px', borderRadius: 999 }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* O mně + zkušenost */}
        {(person.bio || person.experience) && (
          <div style={cardBox}>
            <WSekHead kind="user" title="O mně" />
            {person.bio && <span style={{ fontFamily: T.fontUI, fontSize: 14, color: T.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{person.bio}</span>}
            {person.experience && <span style={{ fontFamily: T.fontUI, fontSize: 13, color: '#5B6488', marginTop: 2 }}><b style={{ color: T.ink, fontWeight: 800 }}>Zkušenost:</b> {person.experience}</span>}
          </div>
        )}

        {/* Podrobnosti — čistý „spec-sheet": popiska vlevo, hodnota vpravo, žádné
            ikonky ve čtverečcích. Elegantní a připravené na budoucí roletky. */}
        {facts.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid ' + T.border, borderRadius: 22, padding: '16px 18px 8px' }}>
            <WSekHead kind="list" title="Podrobnosti" />
            <div style={{ marginTop: 8 }}>
              {facts.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 18, padding: '12px 0', borderTop: i ? '1px solid ' + T.border : 'none' }}>
                  <span style={{ flex: 'none', fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', color: T.mutedSoft }}>{r.k}</span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'right', fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, color: T.ink, lineHeight: 1.4 }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recenze se čtou přes proklik hodnocení nahoře (panel zezhora) —
            spodní sekci „Co říkají ostatní" jsme zrušili, aby se to nedublovalo. */}
        </div>
      </div>

      {/* Zpět + sdílet — fixní přes cover, obsah pod nimi projede */}
      <button onClick={onClose} title={preview ? 'Zavřít náhled' : 'Zpět na tržiště'} style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top))', left: 16, ...kruh }}>{_PIco.back('#0B1233')}</button>
      {!preview && (
        <div style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top))', right: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => { const nv = !saved; setSaved(nv); _pSetSaved(person.id, nv); }} title={saved ? 'Uloženo' : 'Uložit'} style={kruh}>
            <WSrdceIko w={18} h={17} saved={saved} off="#0B1233" tah={2} />
          </button>
          <button onClick={() => { setMenuZavira(false); setMenuOpen(true); }} title="Další možnosti" aria-label="Další možnosti" style={kruh}>
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="1.9" fill="#0B1233" /><circle cx="12" cy="12" r="1.9" fill="#0B1233" /><circle cx="19" cy="12" r="1.9" fill="#0B1233" />
            </svg>
          </button>
        </div>
      )}
      {preview && (
        <div style={{ position: 'absolute', top: 'calc(18px + env(safe-area-inset-top))', right: 16, display: 'flex', pointerEvents: 'none' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: 'rgba(11,18,51,0.58)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#fff', fontFamily: T.fontHead, fontSize: 12.5, fontWeight: 800 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="#fff" strokeWidth="1.9"><path d="M2.6 12S6.4 5.6 12 5.6 21.4 12 21.4 12 17.6 18.4 12 18.4 2.6 12 2.6 12Z" strokeLinejoin="round" /><circle cx="12" cy="12" r="3.1" /></svg>
            Náhled tvé karty
          </span>
        </div>
      )}

      {menuOpen && (
        <React.Fragment>
          <div onClick={() => zavriMenu()} style={{ position: 'fixed', inset: 0, zIndex: 9500 }} />
          <div style={{
            position: 'fixed', top: 'calc(58px + env(safe-area-inset-top))', right: 16, zIndex: 9501,
            minWidth: 208, background: '#fff', borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 12px 34px rgba(11,18,51,0.20), 0 2px 8px rgba(11,18,51,0.10)',
            transformOrigin: 'top right',
            animation: menuZavira ? 'wMenuOut .14s ease forwards' : 'wMenuIn .16s cubic-bezier(.2,.9,.3,1)',
          }}>
            <button onClick={() => zavriMenu(sdilej)} style={_wMenuPolozka}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 15V3m0 0L8 7m4-4 4 4" stroke="#0B1233" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" stroke="#0B1233" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Sdílet
            </button>
            <div style={{ height: 1, background: '#EDEFF6' }} />
            <button onClick={() => { setMenuOpen(false); setMenuZavira(false); setReportOpen(true); }} style={{ ..._wMenuPolozka, color: '#B3243A' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 21V4m0 0h11l-2 4 2 4H5" stroke="#B3243A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Nahlásit
            </button>
            <div style={{ height: 1, background: '#EDEFF6' }} />
            <button onClick={() => { setMenuOpen(false); setMenuZavira(false); setBlokChyba(''); setBlokDialog(true); }} style={{ ..._wMenuPolozka, color: '#B3243A' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="8.4" stroke="#B3243A" strokeWidth="2" />
                <path d="m6.2 6.2 11.6 11.6" stroke="#B3243A" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Zablokovat
            </button>
          </div>
        </React.Fragment>
      )}

      {reportOpen && typeof WReportSheet === 'function' && (
        <WReportSheet typ="person" cilId={person.id} onClose={() => setReportOpen(false)} />
      )}

      {blokDialog && typeof WBlokDialog === 'function' && (
        <WBlokDialog
          jmeno={person.name || 'uživatele'}
          blokuji={blokuji}
          chyba={blokChyba}
          onClose={() => setBlokDialog(false)}
          onPotvrd={async () => {
            setBlokuji(true); setBlokChyba('');
            const r = await (window.blockUserW ? window.blockUserW(person.id) : { ok: false, reason: 'db' });
            setBlokuji(false);
            if (!r || !r.ok) {
              setBlokChyba(
                r && r.reason === 'chybi-tabulka' ? 'Blokování zatím není v databázi zapnuté.' :
                r && r.reason === 'neplatne-id'   ? 'Tenhle profil je jen ukázkový (demo), zablokovat ho nejde.' :
                r && r.reason === 'neprihlasen'   ? 'Pro zablokování musíš být přihlášený.' :
                                                    'Zablokování se nepovedlo. Zkus to prosím znovu.'
              );
              return;
            }
            setBlokDialog(false);
            if (onBlocked) onBlocked(person.id);
            onClose();
          }} />
      )}

      {/* Ulepená lišta */}
      {/* Srdce tu bylo taky — ale lajk patří k hlavičce, dole má zůstat jediná akce. */}
      <div style={{ flex: 'none', background: '#fff', borderTop: '1px solid ' + T.border, padding: '14px 16px calc(16px + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', gap: 10, pointerEvents: preview ? 'none' : 'auto' }}>
        <button onClick={() => onContact(person)} style={{ flex: 1, height: 54, border: 'none', borderRadius: 16, background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: T.fontHead, fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          <Icon name="chat-round-bold" size={19} color="#fff" />Mám zájem
        </button>
      </div>

      {showReviews && <WReviewsSheet person={person} canReply={!!(typeof W_PROFILE !== 'undefined' && W_PROFILE && (person.id === W_PROFILE.id || person._mine))} onClose={() => setShowReviews(false)} />}
      {album >= 0 && <WFotoAlbum fotky={person.photos || []} popisky={person.photoNotes} start={album} jmeno={person.name} onClose={() => setAlbum(-1)} />}
    </div>
  );
}

// ── TESTOVACÍ styl karty (B) — podle předlohy: fotka jako zaoblený blok,
// pod ním jméno, obor, hodnocení, nabídka, štítky, pás ukázek práce a
// rozklikávací řádky. Stávající styl (A) zůstává; přepíná se v tržišti
// pilulkou „Styl karty". Až se rozhodne, který zůstane, druhý se smaže.
// `hybrid` (styl C) = kostra B, ale s profilovkou u jména a pruhem tří čísel
// z původní karty. Bez fotek se cover zkrátí na barevný pruh, ať karta nespadne
// u lidí, kteří fotky práce nikdy mít nebudou (hlídání dětí, doučování…).
function WPersonDetailB({ person, onClose, onContact, onBlocked, preview, hybrid }) {
  const [saved, setSaved] = useStateW(() => _pIsSaved(person.id));
  const [coverIdx, setCoverIdx] = useStateW(0);
  const [showReviews, setShowReviews] = useStateW(false);
  const [album, setAlbum] = useStateW(-1);            // index otevřené fotky ve fotoalbu, -1 = zavřeno
  const [openRow, setOpenRow] = useStateW('');          // rozbalený řádek
  const [menuOpen, setMenuOpen] = useStateW(false);
  const [reportOpen, setReportOpen] = useStateW(false);
  const [blokDialog, setBlokDialog] = useStateW(false);
  const [blokuji, setBlokuji] = useStateW(false);
  const [blokChyba, setBlokChyba] = useStateW('');
  const coverRef = useRefW(null);

  const fotky = Array.isArray(person.photos) ? person.photos : [];
  const skills = (Array.isArray(person.skills) && person.skills.length) ? person.skills : (person.card_tags || []);
  // Obor je vlastní pole; u starších karet (a dema bez něj) padá zpátky na první štítek.
  const obor = _pOborLabel(person.card_obor) || (person.card_tags && person.card_tags[0]) || '';
  const cena = person.price || 'Dohodou';
  const maCislo = /\d/.test(cena);
  const rating = Number(person.rating) || 0;
  const avail = Array.isArray(person.availability) ? person.availability.join(' · ') : '';

  const onCoverScroll = () => { const el = coverRef.current; if (el && el.clientWidth) setCoverIdx(Math.round(el.scrollLeft / el.clientWidth)); };
  const jobsDone = person.jobsDone || person.helpCount || person.ratingCount || 0;
  const bezFotek = hybrid && fotky.length === 0;
  const kruh = { width: 38, height: 38, flex: 'none', border: 'none', borderRadius: 999, background: 'rgba(236,237,242,0.68)', backdropFilter: 'blur(12px) saturate(1.1)', WebkitBackdropFilter: 'blur(12px) saturate(1.1)', display: 'grid', placeItems: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' };

  // Rozklikávací řádek — nadpis vlevo, hodnota nebo šipka vpravo.
  function radek(klic, nazev, hodnota, obsah, klik) {
    const open = openRow === klic;
    return (
      <div key={klic} style={{ borderTop: '1px solid ' + T.border }}>
        <button onClick={() => (klik ? klik() : setOpenRow(open ? '' : klic))} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent',
        }}>
          <span style={{ flex: 1, minWidth: 0, fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 700, color: T.ink }}>{nazev}</span>
          {hodnota ? <span style={{ fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 700, color: T.muted, whiteSpace: 'nowrap' }}>{hodnota}</span> : null}
          {(obsah || klik) && (
            <svg width="9" height="15" viewBox="0 0 10 16" aria-hidden="true" style={{ flex: 'none', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
              <path d="M2 1.6 8.4 8 2 14.4" fill="none" stroke={T.mutedSoft} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        {open && obsah ? <div style={{ paddingBottom: 18, marginTop: -4 }}>{obsah}</div> : null}
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: '#fff', display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {/* ── Fotka jako zaoblený blok ── */}
        <div style={{ position: 'relative', height: bezFotek ? 132 : 'min(40vh, 380px)', minHeight: bezFotek ? 0 : 230, background: T.heroGrad, borderRadius: '0 0 22px 22px', overflow: 'hidden' }}>
          {fotky.length > 0 && (
            <div ref={coverRef} onScroll={onCoverScroll} style={{ position: 'absolute', inset: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              {fotky.map((src, i) => (
                <div key={i} onClick={() => setAlbum(i)} style={{ flex: '0 0 100%', width: '100%', height: '100%', scrollSnapAlign: 'center', cursor: 'pointer' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          )}
          {preview && fotky.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fff', textAlign: 'center', padding: '0 30px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round"><path d="M3 8.6A2.6 2.6 0 0 1 5.6 6h1.9l1.2-2h6.6l1.2 2h1.9A2.6 2.6 0 0 1 21 8.6v8.8A2.6 2.6 0 0 1 18.4 20H5.6A2.6 2.6 0 0 1 3 17.4Z" /><circle cx="12" cy="13" r="3.6" /></svg>
              <span style={{ fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600, opacity: .88, lineHeight: 1.45 }}>Bez fotek je tady prázdno — přidej pár ukázek své práce.</span>
            </div>
          )}
          {fotky.length > 0 && (
            <span style={{ position: 'absolute', right: 12, bottom: 12, padding: '5px 11px', borderRadius: 999, background: 'rgba(11,18,51,0.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#fff', fontFamily: T.fontHead, fontSize: 12, fontWeight: 700, pointerEvents: 'none' }}>{(coverIdx + 1) + ' / ' + fotky.length}</span>
          )}
        </div>

        <div style={{ padding: '18px 18px calc(104px + env(safe-area-inset-bottom))', display: 'flow-root' }}>
          {/* ── Profilovka přes spodek fotky (jen styl C) ── */}
          {hybrid && (
            <div style={{ marginTop: -54, marginBottom: 12, position: 'relative', zIndex: 2 }}>
              <span style={{ display: 'inline-block', width: 84, height: 84, borderRadius: 999, overflow: 'hidden', background: T.heroGrad, border: '4px solid #fff', boxShadow: '0 10px 22px -8px rgba(11,18,51,0.45)' }}>
                {person.avatar
                  ? <img src={person.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 22%', display: 'block' }} />
                  : <span style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 28 }}>{_pInitials(person.name)}</span>}
              </span>
            </div>
          )}
          {/* ── Jméno, obor, hodnocení ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: T.fontHead, fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: -0.6 }}>{person.name}</span>
            {person.verified && (typeof WVerifiedBadge === 'function' ? <WVerifiedBadge size={20} /> : null)}
          </div>
          <div style={{ fontFamily: T.fontUI, fontSize: 14.5, color: T.muted, marginTop: 4 }}>
            {[obor, person.city].filter(Boolean).join(' · ')}
          </div>
          {hybrid ? (
            /* Pruh důvěry z původní karty — proč věřit cizímu člověku */
            <div style={{ display: 'flex', marginTop: 16, marginBottom: 4 }}>
              {(() => { const C = _pCislaDuvery(person); return [
                { ...C.hodnoceni, klik: person.ratingCount > 0 ? () => setShowReviews(true) : null },
                C.zakazky,
                C.reakce,
              ]; })().map((c, i) => {
                const vnitrek = (
                  <>
                    <span style={{ fontFamily: T.fontHead, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: -0.4, whiteSpace: 'nowrap' }}>{c.hod}</span>
                    <span style={{ height: 14, display: 'inline-flex', alignItems: 'center' }}>{c.stred}</span>
                    {/* Popisek se u klikatelného sloupce chová jako odkaz — modrý
                        a podtržený. Jinak z pruhu čísel není poznat, že recenze
                        jdou otevřít. */}
                    <span style={{ fontFamily: T.fontUI, fontSize: 11.5, fontWeight: c.klik ? 700 : 600, color: c.klik ? T.primary : '#5B6488', textAlign: 'center', lineHeight: 1.3, textDecoration: c.klik ? 'underline' : 'none', textUnderlineOffset: 2 }}>{c.pod}</span>
                  </>
                );
                const sl = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 };
                return c.klik
                  ? <button key={i} onClick={c.klik} style={{ ...sl, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>{vnitrek}</button>
                  : <div key={i} style={sl}>{vnitrek}</div>;
              })}
            </div>
          ) : rating > 0 ? (
            <button onClick={() => person.ratingCount > 0 && setShowReviews(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <WStar size={15} color="#14162b" />
              <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: T.ink }}>{rating.toFixed(1).replace('.', ',')}</span>
              {person.ratingCount > 0 && <span style={{ fontFamily: T.fontUI, fontSize: 14.5, color: T.muted }}>· {person.ratingCount} {_wPlural(person.ratingCount, 'recenze', 'recenze', 'recenzí')}</span>}
            </button>
          ) : (
            <div style={{ marginTop: 8, fontFamily: T.fontUI, fontSize: 14, color: T.mutedSoft }}>Zatím bez hodnocení</div>
          )}

          {/* ── Nabízí ── */}
          {(obor || person.card_offer) && (
            <div style={{ marginTop: 26 }}>
              <div style={{ fontFamily: T.fontUI, fontSize: 13.5, color: T.muted, marginBottom: 4 }}>Nabízí</div>
              {obor && <div style={{ fontFamily: T.fontHead, fontSize: 23, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>{obor}</div>}
              {person.card_offer && <div style={{ fontFamily: T.fontUI, fontSize: 15, color: T.muted, lineHeight: 1.5, marginTop: 6 }}>{person.card_offer}</div>}
            </div>
          )}

          {/* ── Štítky ── */}
          {skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {skills.map((t, i) => (
                <span key={i} style={{ padding: '9px 15px', borderRadius: 999, background: '#f1f2f6', fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 600, color: T.ink }}>{t}</span>
              ))}
            </div>
          )}

          {/* ── Ukázky práce ── */}
          {fotky.length > 0 && (
            <div style={{ marginTop: 30 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ flex: 1, fontFamily: T.fontHead, fontSize: 18, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>Ukázky práce</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, color: T.primary }}>
                  {fotky.length} {_wPlural(fotky.length, 'fotka', 'fotky', 'fotek')}
                  <svg width="8" height="13" viewBox="0 0 10 16" aria-hidden="true"><path d="M2 1.6 8.4 8 2 14.4" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </div>
              <div className="wfilter-strip" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -18px', padding: '0 18px 2px', scrollbarWidth: 'none' }}>
                {fotky.map((src, i) => (
                  <button key={i} onClick={() => setAlbum(i)} style={{ flex: '0 0 148px', width: 148, aspectRatio: '3 / 4', borderRadius: 14, overflow: 'hidden', background: T.surfaceAlt, border: 'none', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Rozklikávací řádky ── */}
          <div style={{ marginTop: 28 }}>
            {radek('cena', 'Cena', cena + (maCislo && person.priceUnit ? ' ' + person.priceUnit : ''), null, null)}
            {person.bio || person.experience ? radek('ja', 'O mně', '', (
              <div>
                {person.bio && <div style={{ fontFamily: T.fontUI, fontSize: 14.5, color: T.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{person.bio}</div>}
                {person.experience && <div style={{ fontFamily: T.fontUI, fontSize: 13.5, color: T.muted, marginTop: 8 }}><b style={{ color: T.ink }}>Zkušenost:</b> {person.experience}</div>}
              </div>
            ), null) : null}
            {(avail || person.equipment || person.mode) ? radek('detail', 'Podrobnosti', '', (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[avail && ['Dostupnost', avail], person.mode && ['Kde', person.mode], person.equipment && ['Vybavení', person.equipment]].filter(Boolean).map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <span style={{ fontFamily: T.fontUI, fontSize: 13.5, color: T.muted }}>{r[0]}</span>
                    <span style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, color: T.ink, textAlign: 'right' }}>{r[1]}</span>
                  </div>
                ))}
              </div>
            ), null) : null}
            {radek('rec', 'Hodnocení', person.ratingCount > 0 ? (rating.toFixed(1).replace('.', ',') + ' · ' + person.ratingCount) : 'Zatím žádné', null, person.ratingCount > 0 ? () => setShowReviews(true) : null)}
          </div>
        </div>
      </div>

      {/* Tlačítka přes fotku */}
      <button onClick={onClose} title={preview ? 'Zavřít náhled' : 'Zpět na tržiště'} style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top))', left: 16, ...kruh }}>{_PIco.back('#0B1233')}</button>
      {preview && (
        <div style={{ position: 'absolute', top: 'calc(64px + env(safe-area-inset-top))', left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: 'rgba(11,18,51,0.58)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#fff', fontFamily: T.fontHead, fontSize: 12.5, fontWeight: 800 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="#fff" strokeWidth="1.9"><path d="M2.6 12S6.4 5.6 12 5.6 21.4 12 21.4 12 17.6 18.4 12 18.4 2.6 12 2.6 12Z" strokeLinejoin="round" /><circle cx="12" cy="12" r="3.1" /></svg>
            Náhled tvé karty
          </span>
        </div>
      )}
      {/* Srdce + „…" vpravo nahoře — stejné u A, B i C. V náhledu vlastní karty nic
          z toho nedává smysl (nelajkuješ ani nenahlašuješ sám sebe), tak se schová. */}
      {!preview && (
        <div style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top))', right: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => { const nv = !saved; setSaved(nv); _pSetSaved(person.id, nv); }} title={saved ? 'Uloženo' : 'Uložit'} style={kruh}>
            <WSrdceIko w={18} h={17} saved={saved} off="#0B1233" tah={2} />
          </button>
          <button onClick={() => setMenuOpen(true)} title="Další možnosti" style={kruh}>
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.9" fill="#0B1233" /><circle cx="12" cy="12" r="1.9" fill="#0B1233" /><circle cx="19" cy="12" r="1.9" fill="#0B1233" /></svg>
          </button>
        </div>
      )}

      {menuOpen && (
        <React.Fragment>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9500 }} />
          <div style={{ position: 'fixed', top: 'calc(58px + env(safe-area-inset-top))', right: 16, zIndex: 9501, minWidth: 208, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 34px rgba(11,18,51,0.20)', animation: 'wMenuIn .16s cubic-bezier(.2,.9,.3,1)' }}>
            <button onClick={() => { setMenuOpen(false); setReportOpen(true); }} style={{ ..._wMenuPolozka, color: '#B3243A' }}>Nahlásit</button>
            <div style={{ height: 1, background: '#EDEFF6' }} />
            <button onClick={() => { setMenuOpen(false); setBlokChyba(''); setBlokDialog(true); }} style={{ ..._wMenuPolozka, color: '#B3243A' }}>Zablokovat</button>
          </div>
        </React.Fragment>
      )}
      {reportOpen && typeof WReportSheet === 'function' && <WReportSheet typ="person" cilId={person.id} onClose={() => setReportOpen(false)} />}
      {blokDialog && typeof WBlokDialog === 'function' && (
        <WBlokDialog jmeno={person.name || 'uživatele'} blokuji={blokuji} chyba={blokChyba}
          onClose={() => setBlokDialog(false)}
          onPotvrd={async () => {
            setBlokuji(true); setBlokChyba('');
            const r = await (window.blockUserW ? window.blockUserW(person.id) : { ok: false, reason: 'db' });
            setBlokuji(false);
            if (!r || !r.ok) { setBlokChyba('Zablokování se nepovedlo.'); return; }
            setBlokDialog(false); if (onBlocked) onBlocked(person.id); onClose();
          }} />
      )}

      {/* Spodní lišta */}
      <div style={{ flex: 'none', background: '#fff', borderTop: '1px solid ' + T.border, padding: '12px 16px calc(14px + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', gap: 10, pointerEvents: preview ? 'none' : 'auto' }}>
        <button onClick={() => onContact(person)} style={{ flex: 1, height: 54, border: 'none', borderRadius: 16, background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: T.fontHead, fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
          Mám zájem
          <svg width="17" height="14" viewBox="0 0 18 14" aria-hidden="true"><path d="M1 7h15M10.5 1.5 16.5 7l-6 5.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {showReviews && <WReviewsSheet person={person} canReply={false} onClose={() => setShowReviews(false)} />}
      {album >= 0 && <WFotoAlbum fotky={person.photos || []} popisky={person.photoNotes} start={album} jmeno={person.name} onClose={() => setAlbum(-1)} />}
    </div>
  );
}

// ── Styly D a E (test) ─────────────────────────────────────────────────────
// D = magazínová podoba podle předlohy: fotka přes celou šířku, na ní obor malým
// verzálkami, velký titulek a pilulka s městem. Pod fotkou rovná bílá plocha.
//
// E (hybrid) si bere z obou stran: titulek i pilulka s lokalitou na fotce zůstávají,
// ale bez nadřazeného oboru — opakoval by to, co je v titulku. Titulek s pilulkou
// svítí jen na první fotce, po odswajpování zmizí, ať nestíní ukázkám práce.
// Pod fotku se vrací zaoblený přesah ze stylu A, profilovka je v řádku jako u D
// a pod ní pruh tří čísel ze stylu C (proto u jména není hvězdičkový řádek —
// hodnocení i doba odpovědi by se říkaly dvakrát).
//
// Titulek se skládá z dovedností (skills), protože v datech žádné krátké
// „co nabízím jednou větou" není; dvě se spojí do „X a y", když se to vejde.
function _pNadpisD(person) {
  const sk = (Array.isArray(person.skills) && person.skills.length) ? person.skills : (person.card_tags || []);
  // Obor je vlastní pole; u starších karet (a dema bez něj) padá zpátky na první štítek.
  const obor = _pOborLabel(person.card_obor) || (person.card_tags && person.card_tags[0]) || '';
  // Nezlomitelný spojovník: jinak by se „gel-lak" zalomilo uprostřed slova.
  const drz = t => t.replace(/-/g, '\u2011');
  if (!sk.length) return drz(obor || 'Nabídka');
  if (sk.length > 1) {
    const spoj = sk[0] + ' a ' + sk[1].charAt(0).toLowerCase() + sk[1].slice(1);
    if (spoj.length <= 30) return drz(spoj);
  }
  return drz(sk[0]);
}

function WPersonDetailD({ person, onClose, onContact, onBlocked, preview, hybrid }) {
  const [saved, setSaved] = useStateW(() => _pIsSaved(person.id));
  const [coverIdx, setCoverIdx] = useStateW(0);
  const [showReviews, setShowReviews] = useStateW(false);
  const [album, setAlbum] = useStateW(-1);            // index otevřené fotky ve fotoalbu, -1 = zavřeno
  const [vseUmim, setVseUmim] = useStateW(false);     // rozbalený seznam činností
  const [menuOpen, setMenuOpen] = useStateW(false);
  const [reportOpen, setReportOpen] = useStateW(false);
  const [blokDialog, setBlokDialog] = useStateW(false);
  const [blokuji, setBlokuji] = useStateW(false);
  const [blokChyba, setBlokChyba] = useStateW('');
  const coverRef = useRefW(null);

  const fotky = Array.isArray(person.photos) ? person.photos : [];
  const skills = (Array.isArray(person.skills) && person.skills.length) ? person.skills : (person.card_tags || []);
  // Obor je vlastní pole; u starších karet (a dema bez něj) padá zpátky na první štítek.
  const obor = _pOborLabel(person.card_obor) || (person.card_tags && person.card_tags[0]) || '';
  const cena = person.price || 'Dohodou';
  const maCislo = /\d/.test(cena);
  const rating = Number(person.rating) || 0;
  const nadpis = _pNadpisD(person);
  const jobsDone = person.jobsDone || person.helpCount || person.ratingCount || 0;
  const onCoverScroll = () => { const el = coverRef.current; if (el && el.clientWidth) setCoverIdx(Math.round(el.scrollLeft / el.clientWidth)); };
  const kruh = { width: 38, height: 38, flex: 'none', border: 'none', borderRadius: 999, background: 'rgba(236,237,242,0.68)', backdropFilter: 'blur(12px) saturate(1.1)', WebkitBackdropFilter: 'blur(12px) saturate(1.1)', display: 'grid', placeItems: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' };

  // Tři údaje vedle sebe oddělené linkou — cena, kde to dělá, s čím přijede.
  const udaje = [
    { t: cena, pod: maCislo && person.priceUnit ? person.priceUnit : '', silne: true },
    { t: person.mode || '' },
    { t: person.equipment || '' },
  ].filter(u => u.t);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {/* ── Fotka přes celou šířku s titulkem ── */}
        <div style={{ position: 'relative', height: 'min(46vh, 430px)', minHeight: 300, background: T.heroGrad, overflow: 'hidden' }}>
          {fotky.length > 0 && (
            <div ref={coverRef} onScroll={onCoverScroll} style={{ position: 'absolute', inset: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              {fotky.map((src, i) => (
                <div key={i} onClick={() => setAlbum(i)} style={{ flex: '0 0 100%', width: '100%', height: '100%', scrollSnapAlign: 'center', cursor: 'pointer' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          )}
          {/* Tmavé zastínění zespoda, ať je bílý text čitelný i na světlé fotce */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(11,18,51,.34) 0%, rgba(11,18,51,0) 26%, rgba(11,18,51,0) 42%, rgba(11,18,51,.72) 100%)' }} />
          {/* U E svítí titulek jen na první fotce — na dalších by clonil ukázkám práce. */}
          <div style={{
            // U E sedí titulek výš, protože přes spodek fotky přetéká zaoblený list.
            position: 'absolute', left: 20, right: 92, bottom: hybrid ? 44 : 18, pointerEvents: 'none',
            opacity: hybrid && coverIdx !== 0 ? 0 : 1, transition: 'opacity .22s ease',
          }}>
            {!hybrid && obor && <div style={{ fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.88)' }}>{obor}</div>}
            <div style={{ marginTop: hybrid ? 0 : 6, fontFamily: T.fontHead, fontSize: 38, lineHeight: 1.04, fontWeight: 800, color: '#fff', letterSpacing: -1.2, textShadow: '0 2px 18px rgba(11,18,51,0.35)' }}>{nadpis}</div>
            {person.city && (
              <span style={{ display: 'inline-block', marginTop: 12, padding: '7px 14px', borderRadius: 999, background: '#fff', color: T.ink, fontFamily: T.fontHead, fontSize: 13, fontWeight: 800 }}>{person.city} a okolí</span>
            )}
          </div>
          {fotky.length > 0 && (
            <span style={{ position: 'absolute', right: 12, bottom: hybrid ? 38 : 12, padding: '5px 11px', borderRadius: 999, background: 'rgba(11,18,51,0.62)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#fff', fontFamily: T.fontHead, fontSize: 12, fontWeight: 700, pointerEvents: 'none' }}>{(coverIdx + 1) + ' / ' + fotky.length}</span>
          )}
          {preview && fotky.length === 0 && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '52%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fff', textAlign: 'center', padding: '0 30px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round"><path d="M3 8.6A2.6 2.6 0 0 1 5.6 6h1.9l1.2-2h6.6l1.2 2h1.9A2.6 2.6 0 0 1 21 8.6v8.8A2.6 2.6 0 0 1 18.4 20H5.6A2.6 2.6 0 0 1 3 17.4Z" /><circle cx="12" cy="13" r="3.6" /></svg>
              <span style={{ fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600, opacity: .88, lineHeight: 1.45 }}>Bez fotek je tady prázdno — přidej pár ukázek své práce.</span>
            </div>
          )}
        </div>

        <div style={hybrid
          // Zaoblený přesah přes fotku ze stylu A, obsah ale začíná normálně jako u D.
          ? { position: 'relative', zIndex: 2, marginTop: -26, borderRadius: '26px 26px 0 0', background: '#fff', boxShadow: '0 -10px 26px rgba(11,18,51,0.10)', padding: '20px 20px calc(104px + env(safe-area-inset-bottom))' }
          : { background: '#fff', padding: '18px 20px calc(104px + env(safe-area-inset-bottom))' }}>
        {hybrid ? (
          <React.Fragment>
            {/* Profilovka v řádku se jménem — stejně jako u D, jen bez hvězdičkového
                řádku: hodnocení i doba odpovědi jsou hned pod tím v pruhu tří čísel.
                Pod jménem NENÍ obor — ten už velkým písmem stojí na fotce a zopakovat
                ho znamená řádek, který nic nepřidá. Místo něj zkušenost, a když ji
                člověk nevyplnil, spadne to zpátky na obor a město. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <span style={{ flex: 'none', width: 60, height: 60, borderRadius: 999, overflow: 'hidden', background: T.heroGrad, display: 'block' }}>
                {person.avatar
                  ? <img src={person.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 22%', display: 'block' }} />
                  : <span style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 21 }}>{_pInitials(person.name)}</span>}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: -0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.name}</span>
                  {person.verified && (typeof WVerifiedBadge === 'function' ? <WVerifiedBadge size={18} /> : null)}
                </div>
                <div style={{ marginTop: 3, fontFamily: T.fontUI, fontSize: 13.5, color: T.muted, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {person.experience || [obor, person.city].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
            {/* Pruh tří čísel ze stylu C — proč věřit cizímu člověku */}
            <div style={{ display: 'flex', marginTop: 18 }}>
              {(() => { const C = _pCislaDuvery(person); return [
                { ...C.hodnoceni, klik: person.ratingCount > 0 ? () => setShowReviews(true) : null },
                C.zakazky,
                C.reakce,
              ]; })().map((c, i) => {
                const vnitrek = (
                  <React.Fragment>
                    <span style={{ fontFamily: T.fontHead, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: -0.4, whiteSpace: 'nowrap' }}>{c.hod}</span>
                    <span style={{ height: 14, display: 'inline-flex', alignItems: 'center' }}>{c.stred}</span>
                    {/* Popisek se u klikatelného sloupce chová jako odkaz — modrý
                        a podtržený. Jinak z pruhu čísel není poznat, že recenze
                        jdou otevřít. */}
                    <span style={{ fontFamily: T.fontUI, fontSize: 11.5, fontWeight: c.klik ? 700 : 600, color: c.klik ? T.primary : '#5B6488', textAlign: 'center', lineHeight: 1.3, textDecoration: c.klik ? 'underline' : 'none', textUnderlineOffset: 2 }}>{c.pod}</span>
                  </React.Fragment>
                );
                const sl = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 };
                return c.klik
                  ? <button key={i} onClick={c.klik} style={{ ...sl, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>{vnitrek}</button>
                  : <div key={i} style={sl}>{vnitrek}</div>;
              })}
            </div>
          </React.Fragment>
        ) : (
          /* ── Kdo to je (styl D) ── */
          <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
            <span style={{ flex: 'none', width: 54, height: 54, borderRadius: 999, overflow: 'hidden', background: T.heroGrad, display: 'block' }}>
              {person.avatar
                ? <img src={person.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 22%', display: 'block' }} />
                : <span style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 19 }}>{_pInitials(person.name)}</span>}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: -0.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.name}</span>
                {person.verified && (typeof WVerifiedBadge === 'function' ? <WVerifiedBadge size={17} /> : null)}
              </div>
              {/* jeden řádek — dva by se praly s tlačítkem „Recenze" vpravo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, fontFamily: T.fontUI, fontSize: 13.5, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {rating > 0 ? (
                  <React.Fragment>
                    <WStar size={13} color="#14162b" />
                    <span style={{ fontFamily: T.fontHead, fontWeight: 800, color: T.ink }}>{rating.toFixed(1).replace('.', ',')}</span>
                    {person.ratingCount > 0 && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>· {person.ratingCount} {_wPlural(person.ratingCount, 'hodnocení', 'hodnocení', 'hodnocení')}</span>}
                  </React.Fragment>
                ) : <span>Zatím bez hodnocení</span>}
                {person.replyTime ? <span style={{ flex: 'none' }}>· do {_pFmtReply(person.replyTime)}</span> : null}
              </div>
            </div>
            {person.ratingCount > 0 && (
              <button onClick={() => setShowReviews(true)} style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, color: T.ink, WebkitTapHighlightColor: 'transparent' }}>
                Recenze
                <svg width="8" height="13" viewBox="0 0 10 16" aria-hidden="true"><path d="M2 1.6 8.4 8 2 14.4" fill="none" stroke={T.mutedSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            )}
          </div>
        )}

          {hybrid && <div style={{ height: 1, background: T.border, margin: '18px 0 0' }} />}
          {person.card_offer && (
            <div style={{ marginTop: hybrid ? 18 : 16, fontFamily: T.fontUI, fontSize: 15.5, color: T.ink, lineHeight: 1.5 }}>{person.card_offer}</div>
          )}

          {/* ── Co umím ──
              Vidět je nejvýš šest, zbytek za „+X další" — dlouhý seznam by kartu
              zahltil, ale nutit člověka vybrat jen pár je taky špatně.
              Věta pod tím je tam schválně: žádný výčet nebude nikdy úplný a bez
              ní si čtenář domyslí, že co nevidí, ten člověk nedělá. */}
          {skills.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <WSekHeadKarta kind="skill" title="Co umím" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {(vseUmim ? skills : skills.slice(0, 6)).map((t, i) => (
                  <span key={i} style={{ padding: '9px 15px', borderRadius: 999, background: '#f1f2f6', fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 600, color: T.ink }}>{t}</span>
                ))}
                {!vseUmim && skills.length > 6 && (
                  <button onClick={() => setVseUmim(true)} style={{ padding: '9px 15px', borderRadius: 999, background: 'none', border: '1px dashed ' + T.mutedSoft, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, color: T.muted, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>+{skills.length - 6} další</button>
                )}
              </div>
              <div style={{ marginTop: 12, fontFamily: T.fontUI, fontSize: 13.5, color: T.muted, lineHeight: 1.5 }}>
                Tohle je výběr toho nejčastějšího — napiš, domluvím se i na dalším.
              </div>
            </div>
          )}

          {/* ── Tři údaje v řadě ── */}
          {/* U E jsou podmínky psané, ne v mřížce tří sloupců. Dvě stejně vypadající
              trojice pod sebou (čísla důvěry + cena/kde/vybavení) se pletly —
              oko je četlo jako jeden blok statistik. Takhle je jasné, že nahoře
              je „proč mu věřit" a tady „za kolik a jak". */}
          {hybrid ? (
            <React.Fragment>
              <div style={{ marginTop: 18, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: T.fontHead, fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>{cena}</span>
                {maCislo && person.priceUnit ? <span style={{ fontFamily: T.fontUI, fontSize: 14, fontWeight: 600, color: T.muted }}>{person.priceUnit}</span> : null}
              </div>
              {(person.mode || person.equipment) && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[person.mode, person.equipment].filter(Boolean).map((t, i) => (
                    <span key={i} style={{ padding: '7px 13px', borderRadius: 999, background: T.surfaceAlt, border: '1px solid ' + T.border, fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600, color: T.muted }}>{t}</span>
                  ))}
                </div>
              )}
            </React.Fragment>
          ) : udaje.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 18 }}>
              {udaje.map((u, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ flex: 'none', width: 1, background: T.border, margin: '2px 0' }} />}
                  <span style={{ flex: 1, minWidth: 0, padding: '0 10px', textAlign: i === 0 ? 'left' : 'center' }}>
                    <span style={{
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      fontFamily: u.silne ? T.fontHead : T.fontUI, fontSize: u.silne ? 16 : 13.5,
                      fontWeight: u.silne ? 800 : 600, color: u.silne ? T.ink : T.muted, lineHeight: 1.35,
                    }}>{u.t}</span>
                    {u.pod ? <span style={{ display: 'block', marginTop: 2, fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 600, color: T.mutedSoft }}>{u.pod}</span> : null}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          <div style={{ height: 1, background: T.border, margin: '20px 0 0' }} />

          {/* ── Poslední práce ── */}
          {fotky.length > 0 && (
            <div style={{ marginTop: 26 }}>
              <WSekHeadKarta kind="foto" title="Poslední práce" />
              <div className="wfilter-strip" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '12px -20px 0', padding: '0 20px 2px', scrollbarWidth: 'none' }}>
                {fotky.map((src, i) => (
                  <button key={i} onClick={() => setAlbum(i)} style={{ flex: '0 0 40%', aspectRatio: '1 / 1', borderRadius: 14, overflow: 'hidden', background: T.surfaceAlt, border: 'none', padding: 0, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── O mně ── */}
          {(person.bio || person.experience) && (
            <div style={{ marginTop: 26 }}>
              <WSekHeadKarta kind="user" title="O mně" />
              {person.bio && <div style={{ marginTop: 10, fontFamily: T.fontUI, fontSize: 14.5, color: T.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{person.bio}</div>}
              {person.experience && <div style={{ marginTop: 8, fontFamily: T.fontUI, fontSize: 13.5, color: T.muted }}><b style={{ color: T.ink }}>Zkušenost:</b> {person.experience}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Tlačítka přes fotku — stejná jako u A/B/C */}
      <button onClick={onClose} title={preview ? 'Zavřít náhled' : 'Zpět na tržiště'} style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top))', left: 16, ...kruh }}>{_PIco.back('#0B1233')}</button>
      {preview && (
        <div style={{ position: 'absolute', top: 'calc(64px + env(safe-area-inset-top))', left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, background: 'rgba(11,18,51,0.58)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', color: '#fff', fontFamily: T.fontHead, fontSize: 12.5, fontWeight: 800 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="#fff" strokeWidth="1.9"><path d="M2.6 12S6.4 5.6 12 5.6 21.4 12 21.4 12 17.6 18.4 12 18.4 2.6 12 2.6 12Z" strokeLinejoin="round" /><circle cx="12" cy="12" r="3.1" /></svg>
            Náhled tvé karty
          </span>
        </div>
      )}
      {!preview && (
        <div style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top))', right: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => { const nv = !saved; setSaved(nv); _pSetSaved(person.id, nv); }} title={saved ? 'Uloženo' : 'Uložit'} style={kruh}>
            <WSrdceIko w={18} h={17} saved={saved} off="#0B1233" tah={2} />
          </button>
          <button onClick={() => setMenuOpen(true)} title="Další možnosti" style={kruh}>
            <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.9" fill="#0B1233" /><circle cx="12" cy="12" r="1.9" fill="#0B1233" /><circle cx="19" cy="12" r="1.9" fill="#0B1233" /></svg>
          </button>
        </div>
      )}

      {menuOpen && (
        <React.Fragment>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9500 }} />
          <div style={{ position: 'fixed', top: 'calc(58px + env(safe-area-inset-top))', right: 16, zIndex: 9501, minWidth: 208, background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 34px rgba(11,18,51,0.20)', animation: 'wMenuIn .16s cubic-bezier(.2,.9,.3,1)' }}>
            <button onClick={() => { setMenuOpen(false); setReportOpen(true); }} style={{ ..._wMenuPolozka, color: '#B3243A' }}>Nahlásit</button>
            <div style={{ height: 1, background: '#EDEFF6' }} />
            <button onClick={() => { setMenuOpen(false); setBlokChyba(''); setBlokDialog(true); }} style={{ ..._wMenuPolozka, color: '#B3243A' }}>Zablokovat</button>
          </div>
        </React.Fragment>
      )}
      {reportOpen && typeof WReportSheet === 'function' && <WReportSheet typ="person" cilId={person.id} onClose={() => setReportOpen(false)} />}
      {blokDialog && typeof WBlokDialog === 'function' && (
        <WBlokDialog jmeno={person.name || 'uživatele'} blokuji={blokuji} chyba={blokChyba}
          onClose={() => setBlokDialog(false)}
          onPotvrd={async () => {
            setBlokuji(true); setBlokChyba('');
            const r = await (window.blockUserW ? window.blockUserW(person.id) : { ok: false, reason: 'db' });
            setBlokuji(false);
            if (!r || !r.ok) { setBlokChyba('Zablokování se nepovedlo.'); return; }
            setBlokDialog(false); if (onBlocked) onBlocked(person.id); onClose();
          }} />
      )}

      <div style={{ flex: 'none', background: '#fff', borderTop: '1px solid ' + T.border, padding: '12px 16px calc(14px + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', gap: 10, pointerEvents: preview ? 'none' : 'auto' }}>
        <button onClick={() => onContact(person)} style={{ flex: 1, height: 54, border: 'none', borderRadius: 16, background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: T.fontHead, fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
          Mám zájem
          <svg width="17" height="14" viewBox="0 0 18 14" aria-hidden="true"><path d="M1 7h15M10.5 1.5 16.5 7l-6 5.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {showReviews && <WReviewsSheet person={person} canReply={false} onClose={() => setShowReviews(false)} />}
      {album >= 0 && <WFotoAlbum fotky={person.photos || []} popisky={person.photoNotes} start={album} jmeno={person.name} onClose={() => setAlbum(-1)} />}
    </div>
  );
}

// Fotoalbum ukázek práce — po klepnutí na jakoukoli fotku na kartě. Fotky jdou
// pod sebou na bílém, každá i s popiskem od autora („Koupelna v Řečkovicích,
// dva dny práce"). Tmavé listování do boku tu bylo dřív, ale popisek se do něj
// nevešel a stejná fotka přes celou plochu působila monotónně.
function WFotoAlbum({ fotky, popisky, start = 0, jmeno, onClose }) {
  const scrollRef = useRefW(null);
  const polozkyRef = useRefW([]);
  const [vidim, setVidim] = useStateW(start);

  // Otevři se rovnou u fotky, na kterou se kleplo (bez animace).
  useEffectW(() => {
    const el = polozkyRef.current[start];
    const box = scrollRef.current;
    if (el && box) box.scrollTop = el.offsetTop - 8;
  }, []);

  useEffectW(() => {
    const zavri = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', zavri);
    return () => document.removeEventListener('keydown', zavri);
  }, [onClose]);

  // Počítadlo nahoře ukazuje, u které fotky zrovna jsi.
  function naScroll() {
    const box = scrollRef.current;
    if (!box) return;
    const stred = box.scrollTop + box.clientHeight * 0.35;
    let i = 0;
    polozkyRef.current.forEach((el, k) => { if (el && el.offsetTop <= stred) i = k; });
    if (i !== vidim) setVidim(i);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9600, background: '#fff', display: 'flex', flexDirection: 'column', animation: 'wPop .24s cubic-bezier(.2,.8,.2,1)' }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(10px + env(safe-area-inset-top)) 16px 10px', borderBottom: '1px solid ' + T.border, background: '#fff' }}>
        <button onClick={onClose} title="Zpět na kartu" style={{ width: 38, height: 38, flex: 'none', border: 'none', borderRadius: 999, background: T.surfaceAlt, display: 'grid', placeItems: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          {_PIco.back('#0B1233')}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>Ukázky práce</div>
          {jmeno && <div style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jmeno}</div>}
        </div>
        <span style={{ flex: 'none', fontFamily: T.fontHead, fontSize: 13, fontWeight: 700, color: T.muted }}>{(vidim + 1) + ' / ' + fotky.length}</span>
      </div>

      <div ref={scrollRef} onScroll={naScroll} style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 16px calc(28px + env(safe-area-inset-bottom))' }}>
        {fotky.map((src, i) => {
          const popis = (popisky && popisky[src]) || '';
          return (
            <div key={i} ref={el => { polozkyRef.current[i] = el; }} style={{ marginBottom: i === fotky.length - 1 ? 0 : 26 }}>
              <div style={{ borderRadius: 18, overflow: 'hidden', background: T.surfaceAlt }}>
                <img src={src} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
              {popis
                ? <div style={{ marginTop: 10, fontFamily: T.fontUI, fontSize: 14.5, color: T.ink, lineHeight: 1.5 }}>{popis}</div>
                : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Panel recenzí — vyjede zespoda. Čte se tu, a majitel karty může odpovědět
// (zatím lokálně/demo; naostro se napojí na review_replies / addReviewReplyW).
function WReviewsSheet({ person, canReply, onClose }) {
  const base = Array.isArray(person.reviews) ? person.reviews : [];
  const [list, setList]     = useStateW(() => base.map((r, i) => Object.assign({ id: r.id || 'rv-' + i }, r)));
  const [replyId, setReplyId] = useStateW(null);
  const [text, setText]     = useStateW('');
  const rating = Number(person.rating || 0);
  const firstName = (person.name || '').split(/\s+/)[0] || 'majitel';

  function send(id) {
    const t = text.trim();
    if (!t) return;
    setList(prev => prev.map(r => r.id === id ? Object.assign({}, r, { reply: t }) : r));
    setReplyId(null); setText('');
    // TODO naostro: addReviewReplyW(id, t)
  }

  const R = wRoletka(onClose, { panelIn: 'wSheetUp .34s cubic-bezier(.2,.8,.2,1)' });
  return (
    <div {...R.zavojProps} style={{ position: 'fixed', inset: 0, zIndex: 9300, background: 'rgba(11,18,51,0.42)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: R.zavojAnim }}>
      <div {...R.panelProps} style={{ background: T.bg, borderRadius: '26px 26px 0 0', maxHeight: '86%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -18px 50px rgba(11,18,51,0.28)', animation: R.panelAnim }}>
        {/* Hlavička */}
        <div style={{ flexShrink: 0, padding: '10px 18px 12px', borderBottom: '1px solid ' + T.border }}>
          <div style={{ width: 40, height: 4, borderRadius: 999, background: '#D4DAE8', margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: T.fontHead, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>Recenze</span>
            {rating > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#5B6488', fontFamily: T.fontUI, fontSize: 13, fontWeight: 700 }}>
                <WStar size={13} color="#F5B301" />{rating.toFixed(1).replace('.', ',')} · {person.ratingCount}
              </span>
            )}
            <button onClick={() => R.zavri()} title="Zavřít" style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 999, border: 'none', background: T.surfaceAlt, color: T.muted, fontSize: 16, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>✕</button>
          </div>
        </div>
        {/* Seznam */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '12px 16px calc(18px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '46px 20px', color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.5 }}>Zatím žádné recenze.</div>
          ) : list.map(r => {
            const av = (r.author || '?').split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
            return (
              <div key={r.id} style={{ background: '#fff', border: '1px solid ' + T.border, borderRadius: 18, padding: '14px 15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 999, background: T.avatarGrad, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{av}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 14, fontWeight: 800 }}>{r.author || 'Zákazník'}</div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {typeof WStars === 'function' && <WStars value={r.rating || rating || 5} size={11} />}
                      {r.month && <span style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 600 }}>{r.month}</span>}
                    </div>
                  </div>
                </div>
                {r.text && <div style={{ color: T.inkSoft, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.55, marginTop: 9 }}>{r.text}</div>}

                {/* Odpověď od majitele — vidí každý. Odpovídat smí JEN majitel karty
                    (canReply), stejně jako restaurace odpovídá na svoje recenze. */}
                {r.reply ? (
                  <div style={{ marginTop: 10, marginLeft: 14, padding: '10px 13px', background: T.surfaceAlt, borderRadius: '5px 14px 14px 14px' }}>
                    <div style={{ color: T.primary, fontFamily: T.fontHead, fontSize: 12, fontWeight: 800, marginBottom: 2 }}>Odpověď od {firstName}</div>
                    <div style={{ color: T.inkSoft, fontFamily: T.fontUI, fontSize: 13, lineHeight: 1.5 }}>{r.reply}</div>
                  </div>
                ) : canReply ? (
                  replyId === r.id ? (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <input autoFocus value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(r.id); }} placeholder="Napiš odpověď…" style={{ flex: 1, minWidth: 0, border: '1px solid ' + T.border, borderRadius: 12, padding: '9px 12px', fontFamily: T.fontUI, fontSize: 13.5, outline: 'none', background: '#fff', color: T.ink }} />
                      <button onClick={() => send(r.id)} style={{ border: 'none', borderRadius: 12, background: T.primary, color: '#fff', fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, padding: '0 16px', cursor: 'pointer', flexShrink: 0 }}>Odeslat</button>
                    </div>
                  ) : (
                    <button onClick={() => { setReplyId(r.id); setText(''); }} style={{ marginTop: 8, background: 'none', border: 'none', color: T.primary, fontFamily: T.fontHead, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', padding: '2px 0', WebkitTapHighlightColor: 'transparent' }}>Odpovědět</button>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Uložené karty lidí — zatím lokálně (jako uložené brigády).
function _pSavedSet() { try { return new Set(JSON.parse(localStorage.getItem('makej-saved-people') || '[]')); } catch (e) { return new Set(); } }
function _pIsSaved(id) { return _pSavedSet().has(id); }
// Srdíčko se přepíná na čtyřech místech (mřížka + tři podoby detailu). Aby o tom
// filtr „Uložené" věděl, každá změna se rozešle posluchačům.
const _pSavedSub = new Set();
function _pOnSaved(fn) { _pSavedSub.add(fn); return () => { _pSavedSub.delete(fn); }; }
function _pSetSaved(id, on) {
  const s = _pSavedSet(); on ? s.add(id) : s.delete(id);
  try { localStorage.setItem('makej-saved-people', JSON.stringify([...s])); } catch (e) {}
  _pSavedSub.forEach(fn => { try { fn(); } catch (e) {} });
}

// ── Potvrzení kontaktu / „Nabídni se" (demo — backend Lidé zatím neběží) ──
function WPeopleInfo({ title, text, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9200, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'wPop .3s cubic-bezier(.2,.8,.2,1)' }}>
      <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '30px 34px', maxWidth: 340 }}>
        <div style={{ width: 66, height: 66, borderRadius: 999, background: T.primary, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}><Icon name="chat-round-bold" size={28} color="#fff" /></div>
        <div style={{ color: '#fff', fontFamily: T.fontHead, fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>{title}</div>
        <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 13.5, marginTop: 10, lineHeight: 1.6 }}>{text}</div>
        <button onClick={onClose} style={{ marginTop: 22, padding: '12px 34px', borderRadius: 999, background: '#fff', border: 'none', color: T.ink, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, cursor: 'pointer' }}>Rozumím</button>
      </div>
    </div>
  );
}

// ── Moje karta (Nabídni se) — editor vlastní karty ────────────────
// Editor schválně vypadá jako výsledná karta: každá sekce má stejný barevný
// odznak (WSekHead) jako v detailu, nahoře je živá dlaždice přesně v té
// podobě, v jaké tě uvidí lidé v tržišti, a tlačítko „Náhled" otevře celou
// kartu (WPersonDetail v režimu náhledu). Ukládá se zatím lokálně — backend
// Lidé ještě neběží; do profilu se propíše card_enabled / offer / tags / bio.
const _P_VZOR = 'Jednou týdně opravuju hodinky a drobnou elektroniku, rád pomůžu. Vyměním baterii, řemínek i sklíčko, u mechanik zvládnu vyčištění a seřízení. Přines to kdykoli večer.';
// Nabídka činností do „Co umím" — podle zvoleného oboru. Není to výčet, jen
// rozjezd: kdo tam svoje nenajde, napíše si vlastní. Až budou reálné karty,
// tenhle seznam vystřídá to, co lidi skutečně píšou (agregace přes card_tags).
const _P_CINNOSTI = {
  remesla:   ['Výměna zásuvky', 'Světla a lustry', 'Montáž nábytku', 'Police a věšáky', 'Vrtání do zdi', 'Malování', 'Drobné opravy', 'Výměna kohoutku', 'Oprava dveří', 'Silikonování', 'Opravy hodinek', 'Sestavení skříně'],
  uklid:     ['Úklid domácnosti', 'Mytí oken', 'Žehlení', 'Generální úklid', 'Úklid po rekonstrukci', 'Praní prádla', 'Čištění koberců', 'Úklid po oslavě', 'Mytí nádobí', 'Úklid kanceláře'],
  zahrada:   ['Sekání trávy', 'Střihání živého plotu', 'Hrabání listí', 'Úklid zahrady', 'Zalévání', 'Sázení', 'Prořez stromů', 'Odvoz bioodpadu', 'Rytí záhonů', 'Zazimování zahrady'],
  doucovani: ['Matematika', 'Fyzika', 'Čeština', 'Angličtina', 'Němčina', 'Chemie', 'Příprava na přijímačky', 'Příprava na maturitu', 'Pomoc s úkoly', 'Programování'],
  it:        ['Weby na míru', 'E-shopy', 'Oprava počítače', 'Odvirování', 'Zrychlení notebooku', 'Instalace systému', 'Zálohování dat', 'Nastavení wi-fi', 'Pomoc s mobilem', 'Grafika'],
  foto:      ['Portréty', 'Produktové fotky', 'Svatby', 'Eventy', 'Reportáž', 'Retuš fotek', 'Video', 'Střih videa', 'Reels a TikTok', 'Fotky na profil'],
  gastro:    ['Dorty na objednávku', 'Cupcakes', 'Cukroví', 'Bezlepkové pečení', 'Vaření na oslavu', 'Catering', 'Výpomoc v kuchyni', 'Obsluha na akci', 'Grilování', 'Káva na akci'],
  hlidani:   ['Hlídání dětí', 'Vyzvednutí ze školky', 'Pomoc s úkoly', 'Doprovod na kroužky', 'Hlídání večer', 'Hlídání o víkendu', 'Hlídání miminka', 'Hraní a zabavení', 'Příprava svačiny', 'Uspání'],
  zvirata:   ['Venčení psů', 'Hlídání psa', 'Hlídání kočky', 'Krmení', 'Návštěva u vás doma', 'Odvoz k veterináři', 'Dlouhé procházky', 'Hlídání přes noc', 'Výcvik základů', 'Česání'],
  krasa:     ['Manikúra', 'Gel-lak', 'Pedikúra', 'Lash lifting', 'Prodlužování řas', 'Úprava obočí', 'Líčení', 'Svatební líčení', 'Kosmetika', 'Depilace'],
  stehovani: ['Naložení a odvoz', 'Vynošení do patra', 'Demontáž nábytku', 'Montáž nábytku', 'Vyklizení bytu', 'Odvoz na sběrný dvůr', 'Přeprava dodávkou', 'Balení do krabic', 'Stěhování klavíru', 'Pomoc jen se silou'],
  hudba:     ['Výuka kytary', 'Výuka klavíru', 'Zpěv', 'Hraní na akci', 'Doprovod', 'Nahrávání', 'Ladění nástroje', 'Výuka bicích', 'Hudba na svatbu', 'Základy not'],
  doprava:   ['Odvoz na letiště', 'Přeprava věcí', 'Odvoz z akce', 'Rozvoz jídla', 'Svoz materiálu', 'Řidič s vlastním autem', 'Odvoz nábytku', 'Kurýr po městě', 'Odvoz zvířete', 'Odvoz k lékaři'],
  trenink:   ['Osobní trenér', 'Jóga', 'Kondiční trénink', 'Běh', 'Plán cvičení', 'Strečink', 'Cvičení doma', 'Posilovna', 'Funkční trénink', 'Trénink dětí'],
  pece:      ['Doprovod seniora', 'Nákupy', 'Vyzvednutí léků', 'Pomoc v domácnosti', 'Společnost a popovídání', 'Doprovod k lékaři', 'Pomoc s telefonem', 'Pomoc s papíry', 'Předčítání', 'Procházka'],
  masaze:    ['Klasická masáž', 'Sportovní masáž', 'Relaxační masáž', 'Masáž zad a šíje', 'Lymfatická masáž', 'Masáž nohou', 'Masáž hlavy', 'Baňkování', 'Těhotenská masáž', 'Masáž u vás doma'],
  admin:     ['Překlady', 'Přepis textu', 'Korektury', 'Vyplnění formulářů', 'Třídění dokumentů', 'Fakturace', 'Excel a tabulky', 'Pomoc s daněmi', 'Psaní dopisů', 'Objednávky'],
  ostatni:   ['Jednorázová výpomoc', 'Pomoc se silou', 'Nákup', 'Doprovod', 'Hlídání věcí', 'Pomoc s přípravou', 'Fronta místo tebe', 'Sestavení čehokoli'],
};
// Z činností zpátky na obor. Nikdo nemusí obor vybírat ručně — když si napíše
// „Vyzvednutí ze školky", víme, že patří pod Hlídání. Rozhoduje většina;
// při rovnosti vyhraje ta činnost, co je v seznamu první.
function _pOborZCinnosti(cinnosti) {
  const hlasy = {};
  (cinnosti || []).forEach(t => {
    const n = _pNorm(t);
    Object.keys(_P_CINNOSTI).forEach(k => {
      if (_P_CINNOSTI[k].some(c => _pNorm(c) === n)) hlasy[k] = (hlasy[k] || 0) + 1;
    });
  });
  let nej = '', max = 0;
  Object.keys(hlasy).forEach(k => { if (hlasy[k] > max) { max = hlasy[k]; nej = k; } });
  return nej;
}
// Všechny činnosti dohromady — našeptávač z nich bere, dokud obor nikdo nevybral.
const _P_CINNOSTI_VSE = (() => {
  const ven = [], videl = {};
  Object.keys(_P_CINNOSTI).forEach(k => _P_CINNOSTI[k].forEach(c => {
    const n = _pNorm(c); if (!videl[n]) { videl[n] = 1; ven.push(c); }
  }));
  return ven;
})();

// Obory, ze kterých se v editoru vybírá — „Vše" a „Uložené" jsou jen filtry v tržišti.
const _P_OBORY = _P_KATEGORIE.filter(c => c.key !== 'vse' && c.key !== 'ulozene');
const _pOborLabel = k => (_P_KATEGORIE.find(c => c.key === k) || {}).label || '';


// Cena = částka + jednotka („za co") + volitelné „Od". „Dohodou" a „Zdarma"
// částku schovají — kdo nechce psát číslo, nemusí. „Vlastní…" si jednotku
// napíše sám („za m²", „za pokoj", „za fotku").
const _P_JEDNOTKY = [
  ['dohoda',  'Dohodou'],
  ['hodina',  'za hodinu'],
  ['zakazka', 'za zakázku'],
  ['kus',     'za kus'],
  ['den',     'za den'],
  ['zdarma',  'Zdarma'],
  ['vlastni', 'Vlastní…'],
];
const _P_BEZ_CASTKY = ['dohoda', 'zdarma'];
const _P_MAXFOTO = 20;
// Strop na jeden vybraný soubor. Nesmí být nízký: iOS předává webu fotku
// převedenou z HEIC na JPEG, a ta je zhruba 1,5–2× větší než to, co ukazují
// Fotky (3,3 MB v HEIC ≈ 5,4 MB v JPEG). Na velikosti zdroje navíc nezáleží —
// fotka se stejně hned zmenší na 1600 px a skončí kolem 250 kB. Tohle je tedy
// jen pojistka proti nesmyslně velkému souboru, ne kvalitativní limit.
const _P_MAXMB = 20;
// Co se smí vybrat. Allowlist, ne blocklist — `accept="image/*"` v <input> je
// jen nápověda pro dialog, na počítači se dá přepnout na „všechny soubory".
// SVG tu schválně NENÍ: je to XML, může nést skript, a jako ukázka práce nedává
// smysl. Stejný seznam hlídá i bucket na serveru (migration_karta_fotky.sql).
const _P_TYPY = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const _pTypOk = f => _P_TYPY.indexOf((f.type || '').toLowerCase()) >= 0;
// Rozpočet platí jen na fotky, které ještě NEJSOU nahrané — ty leží v telefonu
// jako data: URL a po zvýšení ostrosti na 1600 px zaberou ~340 kB každá, takže
// se jich naráz vejde kolem devíti. Po uložení se z nich stanou krátké odkazy
// do úložiště (viz wUlozFotkyKartyW) a místo se uvolní — na dvacet fotek se
// tedy dá dostat tak, že se karta mezitím jednou uloží.
const _P_ROZPOCET = 3.2 * 1024 * 1024; // kolik smí zabrat NEnahrané fotky v telefonu
const _pNenahrana = u => /^data:/.test(u || '');

// `ukazovat` = které ze tří čísel pod jménem (hodnocení / hotové zakázky /
// doba odpovědi) se na kartě zobrazí. Chybějící pole = ukázat (starší karty
// i demo lidi to nemají).
const _P_CARD_DEF = {
  // obor = klíč z _P_KATEGORIE ('hlidani', 'remesla'…). Jeden na kartu, pevný
  // seznam — řídí pruh filtrů v tržišti i nabídku činností v „Co umím".
  enabled: false, obor: '', offer: '', bio: '', experience: '', equipment: '',
  unit: 'dohoda', unitCustom: '', priceAmount: '', priceFrom: false,
  availability: [], modes: [], tags: [], photos: [],
  // popisky u fotek: { 'odkaz na fotku': 'Koupelna v Řečkovicích, dva dny práce' }
  // Klíčem je odkaz, ne pořadí — přeskládání fotek tak popisky nerozhodí.
  popisky: {},
  ukazovat: { hodnoceni: true, zakazky: true, reakce: true },
};
function _pMyCard() {
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem('makej-my-card') || '{}') || {}; } catch (e) { raw = {}; }
  // Migrace ze starého editoru (priceType: free / deal / from) na jednotky.
  if (raw.priceType && !raw.unit) {
    raw.unit = raw.priceType === 'free' ? 'zdarma' : raw.priceType === 'from' ? 'hodina' : 'dohoda';
    raw.priceFrom = raw.priceType === 'from';
  }
  return { ..._P_CARD_DEF, ...raw, ukazovat: { ..._P_CARD_DEF.ukazovat, ...(raw.ukazovat || {}) } };
}
// Vrací false, když se to nevešlo do úložiště telefonu (typicky moc fotek).
function _pSaveMyCard(c) { try { localStorage.setItem('makej-my-card', JSON.stringify(c)); return true; } catch (e) { return false; } }

// Z editoru na kartu: `price` je velký text, `priceUnit` základ vedle něj.
function _pCenaKarty(c) {
  if (c.unit === 'zdarma') return { price: 'Zdarma', priceUnit: '' };
  const castka = String(c.priceAmount || '').trim();
  if (c.unit === 'dohoda' || !castka) return { price: 'Dohodou', priceUnit: '' };
  const jed = c.unit === 'vlastni'
    ? (c.unitCustom || '').trim()
    : (_P_JEDNOTKY.find(j => j[0] === c.unit) || ['', ''])[1];
  return { price: (c.priceFrom ? 'Od ' : '') + castka + ' Kč', priceUnit: jed };
}
// Otisk rozepsané karty — podle něj se pozná, jestli jsou změny neuložené.
function _pOtisk(k) {
  return JSON.stringify([k.enabled, k.obor, k.offer, k.bio, k.experience, k.equipment,
    k.unit, k.unitCustom, k.priceAmount, k.priceFrom, k.availability, k.modes, k.tags, k.photos, k.popisky, k.ukazovat]);
}

// Přepínač viditelnosti: zeměkoule = veřejná (vidí to celý svět), zámek =
// soukromá. Stejná dvojice, jakou má Facebook u publika nebo Google Docs
// u sdílení. Zeměkoule má silnější tah, ať vedle plného zámku opticky nezmizí.
function _pZemekoule(barva, size = 19) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      {/* Zeměkoule s kontinenty (Ionicons „earth", MIT) — plný tvar, aby seděla
          vedle plného zámku na druhé půlce přepínače. */}
      <path fill={barva} d="M414.39 97.74A224 224 0 1097.61 414.52 224 224 0 10414.39 97.74zM64 256.13a191.63 191.63 0 016.7-50.31c7.34 15.8 18 29.45 25.25 45.66 9.37 20.84 34.53 15.06 45.64 33.32 9.86 16.21-.67 36.71 6.71 53.67 5.36 12.31 18 15 26.72 24 8.91 9.08 8.72 21.52 10.08 33.36a305.36 305.36 0 007.45 41.27c0 .1 0 .21.08.31C117.8 411.13 64 339.8 64 256.13zm192 192a193.12 193.12 0 01-32-2.68c.11-2.71.16-5.24.43-7 2.43-15.9 10.39-31.45 21.13-43.35 10.61-11.74 25.15-19.68 34.11-33 8.78-13 11.41-30.5 7.79-45.69-5.33-22.44-35.82-29.93-52.26-42.1-9.45-7-17.86-17.82-30.27-18.7-5.72-.4-10.51.83-16.18-.63-5.2-1.35-9.28-4.15-14.82-3.42-10.35 1.36-16.88 12.42-28 10.92-10.55-1.41-21.42-13.76-23.82-23.81-3.08-12.92 7.14-17.11 18.09-18.26 4.57-.48 9.7-1 14.09.68 5.78 2.14 8.51 7.8 13.7 10.66 9.73 5.34 11.7-3.19 10.21-11.83-2.23-12.94-4.83-18.21 6.71-27.12 8-6.14 14.84-10.58 13.56-21.61-.76-6.48-4.31-9.41-1-15.86 2.51-4.91 9.4-9.34 13.89-12.27 11.59-7.56 49.65-7 34.1-28.16-4.57-6.21-13-17.31-21-18.83-10-1.89-14.44 9.27-21.41 14.19-7.2 5.09-21.22 10.87-28.43 3-9.7-10.59 6.43-14.06 10-21.46 1.65-3.45 0-8.24-2.78-12.75q5.41-2.28 11-4.23a15.6 15.6 0 008 3c6.69.44 13-3.18 18.84 1.38 6.48 5 11.15 11.32 19.75 12.88 8.32 1.51 17.13-3.34 19.19-11.86 1.25-5.18 0-10.65-1.2-16a190.83 190.83 0 01105 32.21c-2-.76-4.39-.67-7.34.7-6.07 2.82-14.67 10-15.38 17.12-.81 8.08 11.11 9.22 16.77 9.22 8.5 0 17.11-3.8 14.37-13.62-1.19-4.26-2.81-8.69-5.42-11.37a193.27 193.27 0 0118 14.14c-.09.09-.18.17-.27.27-5.76 6-12.45 10.75-16.39 18.05-2.78 5.14-5.91 7.58-11.54 8.91-3.1.73-6.64 1-9.24 3.08-7.24 5.7-3.12 19.4 3.74 23.51 8.67 5.19 21.53 2.75 28.07-4.66 5.11-5.8 8.12-15.87 17.31-15.86a15.4 15.4 0 0110.82 4.41c3.8 3.94 3.05 7.62 3.86 12.54 1.43 8.74 9.14 4 13.83-.41a192.12 192.12 0 019.24 18.77c-5.16 7.43-9.26 15.53-21.67 6.87-7.43-5.19-12-12.72-21.33-15.06-8.15-2-16.5.08-24.55 1.47-9.15 1.59-20 2.29-26.94 9.22-6.71 6.68-10.26 15.62-17.4 22.33-13.81 13-19.64 27.19-10.7 45.57 8.6 17.67 26.59 27.26 46 26 19.07-1.27 38.88-12.33 38.33 15.38-.2 9.81 1.85 16.6 4.86 25.71 2.79 8.4 2.6 16.54 3.24 25.21a158 158 0 004.74 30.07A191.75 191.75 0 01256 448.13z" />
    </svg>
  );
}
function _pZamek(barva, size = 18) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 11.4V7.8a6 6 0 0 1 12 0v3.6" fill="none" stroke={barva} strokeWidth="3" />
      <rect x="2.6" y="10.4" width="18.8" height="11.6" rx="2.6" fill={barva} />
    </svg>
  );
}

// Výstražný trojúhelník do potvrzení „zveřejnit kartu".
function WVarovani({ size = 62 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M27.2 8.6a5.6 5.6 0 0 1 9.6 0l21.6 37.2a5.6 5.6 0 0 1-4.8 8.4H10.4a5.6 5.6 0 0 1-4.8-8.4Z" fill="#EE4152" />
      <rect x="28.3" y="20" width="7.4" height="19.4" rx="3.7" fill="#FDF3E3" />
      <circle cx="32" cy="45.4" r="3.9" fill="#FDF3E3" />
    </svg>
  );
}

// Potvrzení „zveřejnit kartu" — roletka zespoda, stejně jako filtry a další
// panely v appce. Vlastní komponenta kvůli wRoletka (má hooky).
function WZverejnitSheet({ onPotvrd, onClose }) {
  const [uzNeptat, setUzNeptat] = useStateW(false);
  const R = wRoletka(onClose);
  return (
    <div {...R.zavojProps} style={{ position: 'fixed', inset: 0, zIndex: 9400, background: 'rgba(11,18,51,0.42)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: R.zavojAnim }}>
      <div {...R.panelProps} style={{ background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 20px calc(18px + env(safe-area-inset-bottom))', boxShadow: '0 -18px 50px rgba(11,18,51,0.28)', animation: R.panelAnim }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: '#D4DAE8', margin: '0 auto 14px' }} />
        <div style={{ textAlign: 'center' }}>
          <WVarovani size={58} />
          <div style={{ fontFamily: T.fontHead, fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: -0.3, marginTop: 12 }}>Zveřejnit kartu?</div>
          <div style={{ fontFamily: T.fontUI, fontSize: 13.5, color: T.muted, lineHeight: 1.55, marginTop: 8, maxWidth: 330, marginInline: 'auto' }}>
            Karta se ukáže ostatním uživatelům v tržišti. Uvidí všechny údaje, které jsi do ní zadal. Kdykoli ji můžeš pozastavit přepnutím na „Soukromá".
          </div>
        </div>
        <button onClick={() => setUzNeptat(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '16px auto 0', background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          <span style={{ width: 21, height: 21, flex: 'none', borderRadius: 7, border: '1.6px solid ' + (uzNeptat ? T.primary : '#C7CCDD'), background: uzNeptat ? T.primary : '#fff', display: 'grid', placeItems: 'center', transition: 'background .15s, border-color .15s' }}>
            {uzNeptat && <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.3 5.8 10 11 4.4" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </span>
          <span style={{ fontFamily: T.fontUI, fontSize: 13, fontWeight: 600, color: uzNeptat ? T.ink : T.muted }}>Příště nezobrazovat</span>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          <button onClick={() => R.zavri(() => onPotvrd(uzNeptat))} style={{ height: 52, border: 'none', borderRadius: 16, background: '#1E9E52', color: '#fff', fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Ano, zveřejnit</button>
          <button onClick={() => R.zavri()} style={{ height: 46, border: 'none', background: 'none', color: T.muted, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>Zrušit</button>
        </div>
      </div>
    </div>
  );
}

// Roletka „fotka je moc velká" — ukáže náhled odmítnuté fotky i s názvem,
// ať je jasné, o kterou jde, když jich člověk vybral víc najednou.
// Popisek k jedné fotce — roletka zespoda, stejně jako ostatní panely v editoru.
// Ukáže fotku, ať je jasné, ke které se to píše.
const _P_MAXPOPIS = 120;
function WPopisekSheet({ fotka, hodnota, onUloz, onClose }) {
  const R = wRoletka(onClose);
  const [text, setText] = useStateW(hodnota || '');
  const poleRef = useRefW(null);
  useEffectW(() => { const t = setTimeout(() => poleRef.current && poleRef.current.focus(), 260); return () => clearTimeout(t); }, []);
  return (
    <div {...R.zavojProps} style={{ position: 'fixed', inset: 0, zIndex: 9400, background: 'rgba(11,18,51,0.42)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: R.zavojAnim }}>
      <div {...R.panelProps} style={{ background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 20px calc(18px + env(safe-area-inset-bottom))', boxShadow: '0 -18px 50px rgba(11,18,51,0.28)', animation: R.panelAnim }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: '#D4DAE8', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ width: 62, height: 62, flex: 'none', borderRadius: 14, overflow: 'hidden', background: T.surfaceAlt }}>
            <img src={fotka} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.fontHead, fontSize: 17, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>Popisek fotky</div>
            <div style={{ fontFamily: T.fontUI, fontSize: 13, color: T.muted, lineHeight: 1.5, marginTop: 2 }}>Co je na ní vidět. Uvidí ho každý, kdo si fotku otevře.</div>
          </div>
        </div>
        <textarea
          ref={poleRef} className="wfield" rows={3} value={text}
          onChange={e => setText(e.target.value.slice(0, _P_MAXPOPIS))}
          placeholder="Např. Koupelna v Řečkovicích — dva dny práce"
          style={{ width: '100%', marginTop: 16, padding: '13px 14px', borderRadius: 15, border: '1.5px solid ' + T.border, background: T.surfaceAlt, fontFamily: T.fontUI, fontSize: 15, color: T.ink, lineHeight: 1.5, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
        <div style={{ textAlign: 'right', marginTop: 6, fontFamily: T.fontUI, fontSize: 12, color: T.mutedSoft }}>{text.length} / {_P_MAXPOPIS}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={onClose} style={{ flex: 1, height: 50, borderRadius: 16, border: '1px solid ' + T.border, background: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: T.ink, cursor: 'pointer' }}>Zrušit</button>
          <button onClick={() => onUloz(text.trim())} style={{ flex: 1.4, height: 50, borderRadius: 16, border: 'none', background: T.primary, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#fff', cursor: 'pointer' }}>Hotovo</button>
        </div>
      </div>
    </div>
  );
}

function WVelkaFotkaSheet({ fotky, onClose }) {
  const R = wRoletka(onClose);
  const vic = fotky.length > 1;
  // Nadpis podle toho, co všechno neprošlo. Míchaná várka (PDF + obří fotka)
  // se nesmí ohlásit jako „moc velké" — to by u toho PDF byla lež.
  const jenTyp   = fotky.every(f => f.duvod === 'typ');
  const jenVelke = fotky.every(f => f.duvod !== 'typ');
  const nadpis = jenTyp
    ? (vic ? 'Tyhle soubory nejsou fotky' : 'Tohle není fotka')
    : jenVelke
      ? (vic ? fotky.length + ' ' + _wPlural(fotky.length, 'fotka je moc velká', 'fotky jsou moc velké', 'fotek je moc velkých') : 'Fotka je moc velká')
      : fotky.length + ' ' + _wPlural(fotky.length, 'soubor neprošel', 'soubory neprošly', 'souborů neprošlo');
  return (
    <div {...R.zavojProps} style={{ position: 'fixed', inset: 0, zIndex: 9400, background: 'rgba(11,18,51,0.42)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: R.zavojAnim }}>
      <div {...R.panelProps} style={{ background: '#fff', borderRadius: '26px 26px 0 0', padding: '10px 20px calc(18px + env(safe-area-inset-bottom))', boxShadow: '0 -18px 50px rgba(11,18,51,0.28)', animation: R.panelAnim }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: '#D4DAE8', margin: '0 auto 14px' }} />
        <div style={{ textAlign: 'center' }}>
          <WVarovani size={54} />
          <div style={{ fontFamily: T.fontHead, fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: -0.3, marginTop: 12 }}>
            {nadpis}
          </div>
          <div style={{ fontFamily: T.fontUI, fontSize: 13.5, color: T.muted, lineHeight: 1.55, marginTop: 8 }}>
            {vic ? 'Tyhle jsem nepřidal:' : 'Tuhle jsem nepřidal:'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0 4px' }}>
          {fotky.slice(0, 4).map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, background: T.surfaceAlt }}>
              <span style={{ width: 52, height: 52, flex: 'none', borderRadius: 12, overflow: 'hidden', background: '#e3e7f3', display: 'grid', placeItems: 'center' }}>
                {/* HEIC z iPhonu se v náhledu nemusí vykreslit — pak zůstane jen šedý čtvereček */}
                {f.url
                  ? <img src={f.url} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : null}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.nazev}</div>
                <div style={{ fontFamily: T.fontUI, fontSize: 12.5, color: '#B3243A', fontWeight: 700, marginTop: 2 }}>
                  {f.duvod === 'typ' ? f.typ + ' — přidat jdou jen fotky' : f.mb + ' MB — maximum je ' + _P_MAXMB + ' MB'}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => R.zavri()} style={{ width: '100%', height: 52, marginTop: 10, border: 'none', borderRadius: 16, background: T.primary, color: '#fff', fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Rozumím</button>
      </div>
    </div>
  );
}

// Který styl karty je zapnutý v tržišti (TEST — viz přepínač A / B / C).
function _pStyl() { try { return localStorage.getItem('makej-karta-styl') || 'a'; } catch (e) { return 'a'; } }

// Potvrzení se ukazuje při každém zveřejnění, dokud si člověk neřekne jinak.
const _P_KLIC_VAROVANI = 'makej-karta-bez-varovani';
function _pVarovatPriZapnuti() { try { return localStorage.getItem(_P_KLIC_VAROVANI) !== '1'; } catch (e) { return true; } }

function WMyCard({ onClose }) {
  const init = _pMyCard();
  const [enabled, setEnabled] = useStateW(init.enabled);
  const [offer, setOffer] = useStateW(init.offer);
  const [bio, setBio] = useStateW(init.bio || W_PROFILE.bio || '');   // „O mně" sdílené s profilem
  const [experience, setExperience] = useStateW(init.experience || '');
  const [equipment, setEquipment] = useStateW(init.equipment || '');
  const [unit, setUnit] = useStateW(init.unit || 'dohoda');
  const [unitCustom, setUnitCustom] = useStateW(init.unitCustom || '');
  const [priceAmount, setPriceAmount] = useStateW(init.priceAmount || '');
  const [priceFrom, setPriceFrom] = useStateW(!!init.priceFrom);
  const [availability, setAvailability] = useStateW(Array.isArray(init.availability) ? init.availability : []);
  const [modes, setModes] = useStateW(Array.isArray(init.modes) ? init.modes : []);
  const [obor, setObor] = useStateW(init.obor || '');   // '' = neurčeno ručně, odvodí se z činností
  const [oborVolba, setOborVolba] = useStateW(false);  // rozbalený ruční výběr oboru
  const [tags, setTags] = useStateW(Array.isArray(init.tags) ? init.tags : []);
  const [photos, setPhotos] = useStateW(Array.isArray(init.photos) ? init.photos : []);
  const [popisky, setPopisky] = useStateW(() => ({ ...(init.popisky || {}) }));
  const [popisFoto, setPopisFoto] = useStateW(null);   // odkaz fotky, ke které se píše popisek
  const [ukazovat, setUkazovat] = useStateW(init.ukazovat);
  const [adding, setAdding] = useStateW(false);
  const [tagInput, setTagInput] = useStateW('');
  const [saved, setSaved] = useStateW(false);
  const [ukladam, setUkladam] = useStateW(false);   // nahrávají se fotky do úložiště
  const [chyba, setChyba] = useStateW('');
  const [nahled, setNahled] = useStateW(false);      // celá karta v náhledu
  const [odchod, setOdchod] = useStateW(false);      // dialog „neuložené změny"
  const [zverejnit, setZverejnit] = useStateW(false);   // roletka „zveřejnit kartu"
  const [velke, setVelke] = useStateW(null);           // roletka „fotka je moc velká"
  const fotoRef = useRefW(null);
  const MAX = 240, MAXB = 500, MAXTAGS = 10;

  const addTag = t => { const s = (t || '').trim(); if (!s || tags.includes(s) || tags.length >= MAXTAGS) return; setTags([...tags, s]); };
  const removeTag = i => setTags(tags.filter((_, idx) => idx !== i));
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const cena = _pCenaKarty({ unit, unitCustom, priceAmount, priceFrom });
  // Ručně vybraný obor má přednost; jinak se pozná z činností, co si člověk přidal.
  const oborAuto = _pOborZCinnosti(tags);
  const oborEfekt = obor || oborAuto;

  const karta = {
    enabled, obor: oborEfekt, offer: offer.slice(0, MAX), bio: bio.slice(0, MAXB), experience, equipment,
    unit, unitCustom, priceAmount, priceFrom, availability, modes, tags, photos, popisky, ukazovat,
    price: cena.price, priceUnit: cena.priceUnit, mode: modes.join(' · '),
  };
  // Při prvním vykreslení je karta shodná s tím, co je uložené → otisk = výchozí stav.
  const vychozi = useRefW(null);
  if (vychozi.current === null) vychozi.current = _pOtisk(karta);
  const zmeneno = _pOtisk(karta) !== vychozi.current;

  // ── Fotky práce (cover karty) ──
  // Fotka z mobilu má klidně pár MB; do úložiště telefonu ji dáváme zmenšenou
  // na 1000 px. Strop 5 MB je na vybraný soubor (než ho zmenšíme) a `_P_ROZPOCET`
  // hlídá, kolik smí zabrat všechny fotky dohromady — telefon dá webu kolem 5 MB
  // a karta se do nich musí vejít i s texty.
  function pridejFotky(e) {
    const soubory = Array.from(e.target.files || []);
    e.target.value = '';                                   // ať jde vybrat tutéž fotku znovu
    const volno = _P_MAXFOTO - photos.length;
    if (soubory.length > volno) setChyba('Víc než ' + _P_MAXFOTO + ' fotek karta neunese, vzal jsem prvních ' + volno + '.');
    const vybrane = soubory.slice(0, Math.max(0, volno));
    // Co neprojde (špatný typ nebo nesmyslná velikost), jde stranou do roletky
    // i s náhledem a důvodem. Typ se kontroluje jako první — u .pdf nebo .svg
    // nemá smysl řešit megabajty.
    const odmitnute = [];
    const dobre = [];
    vybrane.forEach(f => {
      if (!_pTypOk(f)) odmitnute.push({ f, duvod: 'typ' });
      else if (f.size > _P_MAXMB * 1024 * 1024) odmitnute.push({ f, duvod: 'velka' });
      else dobre.push(f);
    });
    if (odmitnute.length) {
      setVelke(odmitnute.map(({ f, duvod }) => {
        let url = ''; try { url = URL.createObjectURL(f); } catch (e) {}
        return { nazev: f.name || 'Soubor', duvod,
          mb: (f.size / 1024 / 1024).toFixed(1).replace('.', ','),
          typ: (f.type || '').replace(/^.*\//, '').toUpperCase() || 'neznámý', url };
      }));
    }
    dobre.forEach(f => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        const uloz = url => setPhotos(p => {
          if (p.length >= _P_MAXFOTO) return p;
          // Počítají se jen nenahrané — nahrané jsou jen krátké odkazy.
          const zabrano = p.filter(_pNenahrana).reduce((a, x) => a + x.length, 0);
          if (zabrano + url.length > _P_ROZPOCET) {
            setChyba('Tolik nenahraných fotek se do telefonu nevejde. Ulož kartu — fotky se nahrají a místo se uvolní.');
            return p;
          }
          return [...p, url];
        });
        img.onload = () => {
          // 1600 px na delší hranu: cover na kartě je na iPhonu 430 css × 3 = 1290
          // skutečných pixelů a fotku si navíc ořízne, takže z původních 1000 px
          // zbylo po ořezu ~800 a roztahovalo se to 1,6× → rozmazané. Dřív to
          // menší být muselo, protože fotky ležely v paměti telefonu; teď jdou
          // do úložiště, tak si můžeme dovolit ostrost.
          const max = 1600;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const ctx2 = c.getContext('2d');
          ctx2.imageSmoothingEnabled = true;
          ctx2.imageSmoothingQuality = 'high';
          ctx2.drawImage(img, 0, 0, w, h);
          // Při selhání se NEUKLÁDÁ originál — to by obešlo zmenšení i překódování.
          let url = ''; try { url = c.toDataURL('image/jpeg', 0.82); } catch (er) { url = ''; }
          if (url) uloz(url); else setChyba('Fotku „' + (f.name || '') + '" se nepodařilo zpracovat.');
        };
        // Nečitelný obrázek se zahodí. Dřív se uložil syrový soubor jako data: URL
        // — tím se dal do karty propašovat i ne-obrázek a obešlo se zmenšení.
        img.onerror = () => setChyba('Soubor „' + (f.name || '') + '" nejde načíst jako obrázek.');
        img.src = r.result;
      };
      r.readAsDataURL(f);
    });
  }

  // ── Přeskládání fotek prstem ──
  // Podrž fotku (300 ms) a táhni. Původní dlaždice zůstane jako prázdné místo,
  // pod prstem letí kopie a pořadí se mění průběžně, jak přejíždíš přes ostatní.
  // Nativní drag&drop iOS neumí, takže je to na dotykových událostech; touchmove
  // musí být registrovaný ručně (React ho dává jako pasivní a nešel by zakázat
  // scroll, takže by se místo přesouvání rolovala stránka).
  const mrizkaRef = useRefW(null);
  const dragIdx = useRefW(null);
  const casovac = useRefW(null);
  const start = useRefW(null);
  const [drag, setDrag] = useStateW(null);   // { x, y, w, h } pod prstem

  function bodZUdalosti(ev) { const t = ev.touches && ev.touches[0] ? ev.touches[0] : ev; return { x: t.clientX, y: t.clientY }; }
  function zacniDrzet(ev, i) {
    const b = bodZUdalosti(ev);
    const el = ev.currentTarget;
    start.current = b;
    clearTimeout(casovac.current);
    casovac.current = setTimeout(() => {
      const r = el.getBoundingClientRect();
      dragIdx.current = i;
      setDrag({ x: b.x, y: b.y, w: r.width, h: r.height });
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
    }, 300);
  }
  function hlidejPohyb(ev) {
    if (dragIdx.current != null || !start.current) return;
    const b = bodZUdalosti(ev);
    // ujel prst dřív, než stisk dozrál? Tak to není přesouvání, ale rolování.
    if (Math.abs(b.x - start.current.x) > 9 || Math.abs(b.y - start.current.y) > 9) clearTimeout(casovac.current);
  }
  function pustDrzeni() { clearTimeout(casovac.current); start.current = null; }

  const posun = useRefW(0);          // -1 doleva, 1 doprava, 0 stojí
  const posunCas = useRefW(null);
  const posledniBod = useRefW(null);

  // Prohodí nesenou fotku s tou, nad kterou je prst.
  function prehod(b) {
    const dlazdice = mrizkaRef.current ? [...mrizkaRef.current.querySelectorAll('[data-foto]')] : [];
    const cil = dlazdice.findIndex(el => {
      const r = el.getBoundingClientRect();
      return b.x >= r.left && b.x <= r.right && b.y >= r.top && b.y <= r.bottom;
    });
    if (cil >= 0 && cil !== dragIdx.current) {
      const z = dragIdx.current;
      setPhotos(p => { const n = [...p]; const [kus] = n.splice(z, 1); n.splice(cil, 0, kus); return n; });
      dragIdx.current = cil;
    }
  }

  useEffectW(() => {
    if (!drag) return;
    const pohyb = ev => {
      ev.preventDefault();                       // při tažení se nesmí rolovat stránka
      const b = bodZUdalosti(ev);
      posledniBod.current = b;
      setDrag(d => d && { ...d, x: b.x, y: b.y });
      prehod(b);
      // U kraje pásu se fotky posouvají samy — jinak by nešlo přetáhnout fotku
      // na místo, které zrovna není vidět.
      const box = mrizkaRef.current;
      if (box) {
        const r = box.getBoundingClientRect(), okraj = 46;
        posun.current = b.x < r.left + okraj ? -1 : b.x > r.right - okraj ? 1 : 0;
        if (posun.current && !posunCas.current) {
          posunCas.current = setInterval(() => {
            if (!mrizkaRef.current) return;
            mrizkaRef.current.scrollLeft += posun.current * 11;
            if (posledniBod.current) prehod(posledniBod.current);
          }, 16);
        } else if (!posun.current && posunCas.current) {
          clearInterval(posunCas.current); posunCas.current = null;
        }
      }
    };
    const konec = () => {
      clearInterval(posunCas.current); posunCas.current = null; posun.current = 0; posledniBod.current = null;
      dragIdx.current = null; setDrag(null);
    };
    document.addEventListener('touchmove', pohyb, { passive: false });
    document.addEventListener('touchend', konec);
    document.addEventListener('touchcancel', konec);
    document.addEventListener('mousemove', pohyb);
    document.addEventListener('mouseup', konec);
    return () => {
      document.removeEventListener('touchmove', pohyb, { passive: false });
      document.removeEventListener('touchend', konec);
      document.removeEventListener('touchcancel', konec);
      document.removeEventListener('mousemove', pohyb);
      document.removeEventListener('mouseup', konec);
    };
  }, [!!drag]);

  async function save(pak) {
    // Kontrola dřív, než se cokoli uloží — i do localStorage. Jinak by zápis do
    // databáze tiše zarazila pojistka v index.html, ale karta by si sprostý text
    // nechala uloženou u sebe a dál ho zobrazovala.
    const F = typeof window !== 'undefined' && window.MkjFiltr;
    if (F) {
      for (const txt of [offer, bio, experience, equipment, (tags || []).join(' ')]) {
        if (!txt) continue;
        const r = F.zkontroluj(txt);
        if (!r.ok) { setChyba(r.hlaska); setOdchod(false); return false; }
      }
    }
    // Fotky nejdřív do úložiště, teprve pak se ukládá karta — v telefonu ať
    // zůstanou krátké odkazy, ne celé obrázky v base64. Když nahrání selže
    // (chybí bucket, není signál), karta se uloží i tak, jen s fotkami
    // po staru v telefonu, aby se rozdělaná práce neztratila.
    setUkladam(true);
    let fotkyKarty = photos;
    let popiskyKarty = popisky;
    let chybaFotek = '';
    try {
      const uid = (await sb.auth.getSession()).data.session?.user?.id;
      if (uid && photos.some(f => /^data:/.test(f))) {
        const r = await wUlozFotkyKartyW(uid, photos, _pMyCard().photos);
        fotkyKarty = r.fotky;
        chybaFotek = r.chyba;
        // Popisky jsou klíčované odkazem, a ten se nahráním změní (data: → https:).
        // Pořadí zůstává, takže se přemapují podle indexu.
        popiskyKarty = {};
        photos.forEach((stary, i) => { if (popisky[stary]) popiskyKarty[fotkyKarty[i] || stary] = popisky[stary]; });
        if (fotkyKarty !== photos) { setPhotos(fotkyKarty); setPopisky(popiskyKarty); }
      }
    } catch (e) { chybaFotek = 'Fotky se teď nepodařilo nahrát.'; }
    const kartaKUlozeni = { ...karta, photos: fotkyKarty, popisky: popiskyKarty };
    setUkladam(false);

    if (!_pSaveMyCard(kartaKUlozeni)) {
      setChyba('Karta se nevešla do paměti telefonu — zkus ubrat fotku.');
      setOdchod(false);
      return false;
    }
    setChyba(chybaFotek ? chybaFotek + ' Karta je uložená, fotky zkus nahrát znovu.' : '');
    vychozi.current = _pOtisk(kartaKUlozeni);
    try {
      const uid = (await sb.auth.getSession()).data.session?.user?.id;
      if (uid) await updateProfileW(uid, { card_enabled: karta.enabled, card_offer: karta.offer, card_tags: karta.tags, bio: karta.bio, card_photos: fotkyKarty.filter(f => !/^data:/.test(f)) });
    } catch (e) {}
    setSaved(true); setTimeout(() => setSaved(false), 1600);
    if (pak) pak();
    return true;
  }
  function zpet() { if (zmeneno) setOdchod(true); else onClose(); }

  // ── Karta tak, jak ji uvidí ostatní ──
  // Jméno, fotka, město i hodnocení se berou z profilu, zbytek z editoru.
  const jmeno = W_PROFILE.name || W_PROFILE.full_name || 'Brigádník';
  const ja = {
    id: 'moje-karta', _mine: true,
    name: jmeno,
    verified: !!W_PROFILE.verified,
    city: W_PROFILE.city || '',
    district: W_PROFILE.city || '',
    avatar: W_PROFILE.avatar_url || W_PROFILE.avatar || '',
    photos, photoNotes: popisky,
    card_offer: offer,
    bio, experience, equipment,
    skills: tags, card_tags: tags, card_obor: oborEfekt,
    price: cena.price, priceUnit: cena.priceUnit,
    availability, mode: modes.join(' · '), ukazovat,
    rating: Number(W_PROFILE.rating) || 0,
    ratingCount: (typeof W_REVIEWS !== 'undefined' && Array.isArray(W_REVIEWS)) ? W_REVIEWS.length : 0,
    reviews: (typeof W_REVIEWS !== 'undefined' && Array.isArray(W_REVIEWS))
      ? W_REVIEWS.map((r, i) => ({ id: r.id || 'rv-' + i, author: r.author, text: r.text, rating: r.rating, month: r.when }))
      : [],
    // jobsDone napevno, ať nespadne na počet recenzí (to jsou dvě různé věci)
    jobsDone: (typeof W_TRUST !== 'undefined' && W_TRUST.dokoncene) || 0,
    helpCount: (typeof W_TRUST !== 'undefined' && W_TRUST.dokoncene) || 0,
    cancelled: (typeof W_TRUST !== 'undefined' && W_TRUST.zrusene) || 0,
    replyTime: 0,
  };

  // Kolik z karty je hotové. „Dohodou" je plnohodnotná odpověď, cena se proto
  // nepočítá — jinak by šestý dílek nešel nikdy dotáhnout.
  const kroky = [
    { ok: photos.length > 0,        co: 'fotky' },
    { ok: offer.trim().length >= 20, co: 'nabídka' },
    { ok: tags.length > 0,           co: 'co umíš' },
    { ok: bio.trim().length >= 40,   co: 'o mně' },
    { ok: availability.length > 0,   co: 'dostupnost' },
  ];
  const hotovo = kroky.filter(k => k.ok).length;
  const chybi = kroky.filter(k => !k.ok).map(k => k.co);
  const chybiText = chybi.length <= 2 ? chybi.join(' a ') : chybi.slice(0, 2).join(', ') + ' a další';

  // ── Styly ──
  const box = { background: '#fff', border: '1px solid ' + T.border, borderRadius: 22, padding: '16px 17px', display: 'flex', flexDirection: 'column', gap: 12 };
  const pole = { width: '100%', boxSizing: 'border-box', border: '1px solid ' + T.border, background: T.surfaceAlt, borderRadius: 14, padding: '12px 13px', outline: 'none', fontFamily: T.fontUI, fontSize: 14.5, color: T.ink, lineHeight: 1.55, WebkitAppearance: 'none', appearance: 'none' };
  const hint = { fontFamily: T.fontUI, fontSize: 12, color: T.mutedSoft, lineHeight: 1.5 };
  const pocet = (n, max) => <span style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: n >= max ? T.destructive : T.mutedSoft }}>{n} / {max}</span>;
  // Přepínač (stejný tvar všude v editoru)
  const prepinac = (on, onClick, popis) => (
    <button onClick={onClick} title={popis} aria-pressed={on ? 'true' : 'false'} style={{ width: 50, height: 29, flex: 'none', borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', background: on ? T.primary : 'rgba(18,18,26,0.17)', transition: 'background .2s', WebkitTapHighlightColor: 'transparent', padding: 0 }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 24 : 3, width: 23, height: 23, borderRadius: 999, background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
    </button>
  );
  const chip = (opts, sel, onT, single) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {opts.map(o => { const val = Array.isArray(o) ? o[0] : o; const lab = Array.isArray(o) ? o[1] : o; const on = single ? sel === val : sel.includes(val);
        return <button key={val} className="wchip" onClick={() => onT(val)} style={{ padding: '9px 14px', borderRadius: 999, cursor: 'pointer', border: '1px solid ' + (on ? T.primary : T.border), background: on ? T.tint : '#fff', color: on ? T.primary : T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}>{lab}</button>;
      })}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      {/* Hlavička */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: 'calc(14px + env(safe-area-inset-top)) 12px 10px 8px', borderBottom: '1px solid ' + T.border, background: '#fff' }}>
        <WZpet onClick={zpet} />
        <span style={{ flex: 1, textAlign: 'center', fontFamily: T.fontHead, fontSize: 16.5, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>Moje karta</span>
        {/* vyvážení šířky levého tlačítka, ať je nadpis opticky uprostřed */}
        <span style={{ width: 62, flex: 'none', textAlign: 'right' }}>
          {zmeneno && <span style={{ fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 700, color: T.mutedSoft }}>neuloženo</span>}
        </span>
      </div>

      {chyba ? (
        <div style={{ flex: 'none', margin: '10px 16px 0', padding: '11px 13px', borderRadius: 14, background: 'rgba(214,45,60,0.08)', color: '#B3243A', fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.45 }}>{chyba}</div>
      ) : null}

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Živý náhled: přesně ta dlaždice, co uvidí lidé v tržišti ── */}
        <div style={{ ...box, gap: 14, background: 'linear-gradient(180deg, #fff 0%, ' + T.surfaceAlt + ' 100%)' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 148px', maxWidth: 148 }}>
              <WPersonGridCard person={ja} onTap={() => setNahled(true)} />
            </div>
            {/* Vedle dlaždice jen to, co se nedá vyčíst z ní samotné: kolik chybí. */}
            <div style={{ flex: 1, minWidth: 0, alignSelf: 'center', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: hotovo === kroky.length ? T.green : T.ink, letterSpacing: -0.2 }}>
                {hotovo === kroky.length ? 'Karta je kompletní 🎉' : 'Hotovo ' + hotovo + ' z ' + kroky.length}
              </span>
              <div style={{ height: 6, borderRadius: 999, background: '#e6e9f5', overflow: 'hidden' }}>
                <div style={{ width: Math.round(hotovo / kroky.length * 100) + '%', height: '100%', borderRadius: 999, background: hotovo === kroky.length ? T.green : T.primary, transition: 'width .32s cubic-bezier(.2,.8,.2,1)' }} />
              </div>
              {hotovo < kroky.length && (
                <span style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.mutedSoft, lineHeight: 1.4 }}>Chybí {chybiText}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Viditelnost karty ── */}
        {/* Zelená = jsi vidět, červená = schovaný. Zveřejnění se ptá na
            potvrzení (jednou za člověka, dokud si nezaškrtne „příště ne"),
            schování je bez ptaní — od bezpečnějšího stavu nikoho nezdržujeme. */}
        <div style={{ ...box, padding: 5 }}>
          <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 16, background: T.surfaceAlt }}>
            {[{ val: true, lab: 'Veřejná', barva: '#1E9E52', plocha: '#E4F6EA' },
              { val: false, lab: 'Soukromá', barva: '#D6304A', plocha: '#FCE9EC' }].map(o => {
              const on = enabled === o.val;
              const klik = () => {
                if (enabled === o.val) return;
                if (o.val && _pVarovatPriZapnuti()) { setZverejnit(true); return; }
                setEnabled(o.val);
              };
              return (
                <button key={o.lab} onClick={klik} style={{
                  flex: 1, minWidth: 0, height: 44, borderRadius: 13, cursor: 'pointer',
                  border: '1px solid ' + (on ? o.barva : 'transparent'),
                  background: on ? o.plocha : 'transparent', color: on ? o.barva : T.muted,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800,
                  transition: 'background .18s, color .18s, border-color .18s',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  {o.val ? _pZemekoule(on ? o.barva : T.muted) : _pZamek(on ? o.barva : T.muted)}
                  {o.lab}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Fotky práce (cover karty) ── */}
        <div style={box}>
          <WSekHead kind="foto" title="Fotky tvojí práce" right={<span style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: T.mutedSoft }}>{photos.length} / {_P_MAXFOTO}</span>} />
          {/* Pás do boku, ne mřížka pod sebe — sedm fotek by jinak zabralo půl obrazovky.
              Přetéká pod okraj karty, ať je vidět, že se dá jet dál. */}
          <div ref={mrizkaRef} className="wfilter-strip" style={{ display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', margin: '0 -17px', padding: '0 17px 2px', scrollSnapType: drag ? 'none' : 'x proximity' }}>
            {photos.map((src, i) => {
              const nesu = drag && dragIdx.current === i;
              // klíč = pořadí: při přeskládání React jen přepíše zdroj, nic se nepřekresluje od nuly
              return (
              <div key={i} data-foto="1"
                onTouchStart={e => zacniDrzet(e, i)} onTouchMove={hlidejPohyb} onTouchEnd={pustDrzeni}
                onMouseDown={e => zacniDrzet(e, i)} onMouseMove={hlidejPohyb} onMouseUp={pustDrzeni} onMouseLeave={pustDrzeni}
                style={{
                  position: 'relative', flex: '0 0 112px', width: 112, aspectRatio: '4 / 3',
                  borderRadius: 14, overflow: 'hidden', scrollSnapAlign: 'start',
                  background: T.surfaceAlt, border: '1px solid ' + T.border,
                  opacity: nesu ? 0.25 : 1, transition: 'opacity .15s',
                  WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
                }}>
                <img src={src} alt="" draggable="false" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                {i === 0 && <span style={{ position: 'absolute', left: 6, bottom: 6, padding: '3px 7px', borderRadius: 999, background: 'rgba(11,18,51,0.62)', color: '#fff', fontFamily: T.fontHead, fontSize: 9.5, fontWeight: 800, letterSpacing: 0.2 }}>HLAVNÍ</span>}
                <button onClick={() => { setPhotos(p => p.filter((_, j) => j !== i)); setPopisky(o => { const n = { ...o }; delete n[src]; return n; }); }} title="Smazat fotku" style={{ position: 'absolute', top: 5, right: 5, width: 24, height: 24, borderRadius: 999, border: 'none', background: 'rgba(11,18,51,0.5)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" /></svg>
                </button>
                {/* Popisek k fotce — jen ikonka, ať se nepere s odznakem HLAVNÍ.
                    Modrá = popisek už napsaný, tmavá = zatím prázdný. */}
                <button onClick={() => setPopisFoto(src)} title={popisky[src] ? 'Upravit popisek' : 'Přidat popisek'} style={{ position: 'absolute', right: 5, bottom: 5, width: 24, height: 24, borderRadius: 999, border: 'none', background: popisky[src] ? T.primary : 'rgba(11,18,51,0.5)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}>
                  <svg width="11" height="11" viewBox="0 0 14 14" aria-hidden="true"><path d="M1.5 3.5h11M1.5 7h11M1.5 10.5h6.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" /></svg>
                </button>
              </div>
              );
            })}
            {photos.length < _P_MAXFOTO && (
              <button onClick={() => fotoRef.current && fotoRef.current.click()} style={{ flex: '0 0 112px', width: 112, aspectRatio: '4 / 3', borderRadius: 14, border: '1.5px dashed ' + T.mutedSoft, background: T.surfaceAlt, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, WebkitTapHighlightColor: 'transparent' }}>
                {_PIco.plus(T.muted)}
                <span style={{ fontFamily: T.fontHead, fontSize: 11.5, fontWeight: 800, color: T.muted }}>Přidat</span>
              </button>
            )}
          </div>
          {/* Kopie fotky, která letí pod prstem */}
          {drag && photos[dragIdx.current] && (
            <div style={{
              position: 'fixed', left: drag.x - drag.w / 2, top: drag.y - drag.h / 2, width: drag.w, height: drag.h,
              borderRadius: 14, overflow: 'hidden', zIndex: 9600, pointerEvents: 'none',
              boxShadow: '0 18px 34px rgba(11,18,51,0.32)', transform: 'scale(1.06)',
            }}>
              <img src={photos[dragIdx.current]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}
          <input ref={fotoRef} type="file" accept="image/*" multiple onChange={pridejFotky} style={{ display: 'none' }} />
          {/* Nápovědu si zaslouží jediná věc, která není vidět: že se fotky dají
              přetahovat. Že je první hlavní, říká odznak na dlaždici; kolik jich
              jde nahrát, říká počítadlo v nadpisu; a moc velkou fotku ohlásí
              roletka i s náhledem. Proto se tohle ukáže, až je co přehazovat. */}
          {photos.length > 1 && <span style={hint}>Podrž fotku a přetáhni ji, kam chceš.</span>}
        </div>

        {/* ── Tvoje čísla (pruh důvěry pod jménem na kartě) ── */}
        <div style={box}>
          <WSekHead kind="trust" title="Tvoje čísla" />
          {/* Vlevo přesně to, co se objeví na kartě — číslo, hvězdičky/pilulka/proužek
              i popisek. Vypnuté zešedne a zbledne, ať je vidět, že tam nebude. */}
          {(() => {
            const C = _pCislaDuvery(ja);
            const radky = [
              { k: 'hodnoceni', n: 'Hodnocení a recenze', c: C.hodnoceni },
              { k: 'zakazky',   n: 'Hotové zakázky',      c: C.zakazky },
              { k: 'reakce',    n: 'Doba odpovědi',       c: C.reakce },
            ];
            return radky.map((r, i) => {
              const on = ukazovat[r.k] !== false;
              return (
                <div key={r.k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid ' + T.border : 'none' }}>
                  <div style={{
                    flex: 'none', width: 132, padding: '10px 6px', borderRadius: 14,
                    background: on ? T.surfaceAlt : 'transparent',
                    border: '1px solid ' + (on ? T.border : 'transparent'),
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    opacity: on ? 1 : 0.4, filter: on ? 'none' : 'grayscale(1)',
                    transition: 'opacity .18s, background .18s, border-color .18s, filter .18s',
                  }}>
                    <span style={{ fontFamily: T.fontHead, fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: -0.4, whiteSpace: 'nowrap' }}>{r.c.hod}</span>
                    <span style={{ height: 14, display: 'inline-flex', alignItems: 'center' }}>{r.c.stred}</span>
                    <span style={{ fontFamily: T.fontUI, fontSize: 10.5, fontWeight: 600, color: '#5B6488', textAlign: 'center', lineHeight: 1.3 }}>{r.c.pod}</span>
                  </div>
                  {/* Stejná dvojice slov jako u přepínače viditelnosti celé karty
                      (zelená / červená), jen bez ikonek — tady je vedle přepínač,
                      takže obrázek navíc nic nepřidá. */}
                  <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
                    <span style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, color: on ? '#1E9E52' : '#D6304A' }}>{on ? 'Veřejné' : 'Soukromé'}</span>
                    {on && (r.c.hod === '—' || r.c.hod === '0') && (
                      <span style={{ display: 'block', marginTop: 2, fontFamily: T.fontUI, fontSize: 12, fontWeight: 600, color: T.mutedSoft }}>zatím prázdné</span>
                    )}
                  </div>
                  {prepinac(on, () => setUkazovat(u => ({ ...u, [r.k]: !on })), (on ? 'Skrýt' : 'Ukázat') + ' — ' + r.n)}
                </div>
              );
            });
          })()}
          <span style={hint}>Co necháš zapnuté, uvidí lidé hned pod tvým jménem. Vypnuté číslo se nikde neukáže — čísla si nevymýšlíme, berou se z toho, jak tady funguješ.</span>
        </div>

        {/* ── Nabízí ── */}
        <div style={box}>
          <WSekHead kind="offer" title="Nabízí" />
          <textarea className="wfield" value={offer} onChange={e => setOffer(e.target.value.slice(0, MAX))} rows={3}
            placeholder="Krátce, s čím pomůžeš. Např. Opravuju hodinky — baterie, řemínky, sklíčka."
            style={{ ...pole, resize: 'vertical' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <button onClick={() => setOffer(_P_VZOR)} style={{ border: 'none', background: 'none', color: T.primary, fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: 0 }}>Vložit vzorový text</button>
            {pocet(offer.length, MAX)}
          </div>
          <span style={hint}>Tahle věta je na dlaždici i nahoře na kartě. Detaily nech do „O mně".</span>
        </div>

        {/* ── Kam tě zařadit ──
            Ptát se na obor napevno bylo zbytečné břemeno: u většiny lidí se pozná
            z toho, co si přidali do „Co umím" (viz _pOborZCinnosti). Tahle sekce
            proto jen ukazuje výsledek a dává možnost ho přepsat, když nesedí. */}
        <div style={box}>
          <WSekHead kind="list" title="Kam tě zařadit" right={oborEfekt ? <span style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: T.primary }}>{_pOborLabel(oborEfekt)}</span> : null} />
          {oborEfekt && !obor && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 14, background: T.tint }}>
              <span style={{ fontSize: 17, lineHeight: 1 }}>{(_P_KAT_META[oborEfekt] || ['•'])[0]}</span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: T.fontUI, fontSize: 13, color: T.ink, lineHeight: 1.45 }}>
                Podle toho, co umíš, tě dávám do <b>{_pOborLabel(oborEfekt)}</b>.
              </span>
              <button onClick={() => setOborVolba(v => !v)} style={{ flex: 'none', border: 'none', background: 'none', color: T.primary, fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, cursor: 'pointer', padding: 0 }}>{oborVolba ? 'Zavřít' : 'Změnit'}</button>
            </div>
          )}
          {(oborVolba || obor || !oborEfekt) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {_P_OBORY.map(o => {
                const on = oborEfekt === o.key;
                const emo = (_P_KAT_META[o.key] || ['•'])[0];
                return (
                  <button key={o.key} className="wchip" onClick={() => { setObor(obor === o.key ? '' : o.key); setOborVolba(false); }} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 999,
                    background: on ? T.tint : T.surfaceAlt, border: '1px solid ' + (on ? T.primary : T.border),
                    color: on ? T.primary : T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: on ? 800 : 700,
                    cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  }}><span style={{ fontSize: 15, lineHeight: 1 }}>{emo}</span>{o.label}</button>
                );
              })}
            </div>
          )}
          <span style={hint}>{oborEfekt
            ? 'Tohle je jen pruh nahoře v tržišti, kde tě lidé najdou. Vyhledávání bere všechno, co máš na kartě.'
            : 'Vyplň „Co umím" a zařadím tě sám. Nebo si vyber rovnou tady.'}</span>
        </div>

        {/* ── Co umím (na kartě sekce „Co umím", na dlaždici štítky) ── */}
        <div style={box}>
          <WSekHead kind="skill" title="Co umím" right={<span style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, color: T.mutedSoft }}>{tags.length} / {MAXTAGS}</span>} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tags.map((t, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 999, background: T.tint, color: T.primary, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800 }}>
                {t}<span onClick={() => removeTag(i)} style={{ cursor: 'pointer', display: 'flex' }}><svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke={T.primary} strokeWidth="1.8" strokeLinecap="round" /></svg></span>
              </span>
            ))}
            {tags.length < MAXTAGS && !adding && (
              <button onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 999, background: 'none', border: '1px dashed ' + T.mutedSoft, color: T.muted, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}>{_PIco.plus(T.muted)}Přidat</button>
            )}
            {adding && (
              <input autoFocus value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); setTagInput(''); setAdding(false); } if (e.key === 'Escape') { setTagInput(''); setAdding(false); } }}
                onBlur={() => { addTag(tagInput); setTagInput(''); setAdding(false); }}
                placeholder="Např. Výměna baterie" style={{ padding: '8px 13px', borderRadius: 999, border: '1px solid ' + T.primary, outline: 'none', fontFamily: T.fontUI, fontSize: 13.5, color: T.ink, width: 160 }} />
            )}
          </div>
          {/* Nabídka činností podle oboru. Když se zrovna píše, filtruje se podle
              napsaného — většina lidí pak klepne na hotovou variantu, takže se
              štítky nerozsypou na deset různých zápisů téhož. */}
          {/* Našeptávač funguje i bez vybraného oboru: jak se píše, hledá se napříč
              všemi činnostmi. Obor se pak odvodí z toho, co si člověk vybral —
              nikdo ho nemusí volit dopředu. */}
          {(() => {
            if (tags.length >= MAXTAGS) return null;
            const hledane = _pNorm(tagInput.trim());
            const zdroj = hledane ? _P_CINNOSTI_VSE : (_P_CINNOSTI[oborEfekt] || []);
            if (!zdroj.length) {
              return (
                <div>
                  <div style={{ height: 1, background: T.border, margin: '2px 0 12px' }} />
                  <div style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>Začni psát, co děláš — budu ti napovídat.</div>
                </div>
              );
            }
            const navrh = zdroj
              .filter(t => !tags.includes(t))
              .filter(t => !hledane || _pNorm(t).includes(hledane))
              .slice(0, 8);
            if (!navrh.length) return null;
            return (
              <div>
                <div style={{ height: 1, background: T.border, margin: '2px 0 12px' }} />
                <div style={{ fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600, color: T.muted, marginBottom: 9 }}>{hledane ? 'Nabídka' : 'Co se v oboru ' + _pOborLabel(oborEfekt).toLowerCase() + ' dělá nejčastěji'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {navrh.map(t => <button key={t} className="wchip" onClick={() => { addTag(t); setTagInput(''); setAdding(false); }} style={{ padding: '8px 13px', borderRadius: 999, background: T.surfaceAlt, border: '1px solid ' + T.border, color: T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>{t}</button>)}
                </div>
              </div>
            );
          })()}
          <span style={hint}>Nejvýš {MAXTAGS}. Piš vlastními slovy — co napíšeš, podle toho tě lidé najdou. A na kartě je pod tím věta, že se dá domluvit i na dalším.</span>
        </div>

        {/* ── Cena ── */}
        <div style={box}>
          <WSekHead kind="price" title="Cena" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {_P_BEZ_CASTKY.indexOf(unit) === -1 && (
              <div style={{ position: 'relative', flex: '0 0 116px' }}>
                <input className="wfield" value={priceAmount} onChange={e => setPriceAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} inputMode="numeric" placeholder="300"
                  style={{ ...pole, paddingRight: 34, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800 }} />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, color: T.muted, pointerEvents: 'none' }}>Kč</span>
              </div>
            )}
            <div style={{ position: 'relative', flex: 1, minWidth: 128 }}>
              <select className="wfield" value={unit} onChange={e => setUnit(e.target.value)} style={{ ...pole, paddingRight: 30, fontFamily: T.fontHead, fontWeight: 700, cursor: 'pointer' }}>
                {_P_JEDNOTKY.map(j => <option key={j[0]} value={j[0]}>{j[1]}</option>)}
              </select>
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex' }}>
                <svg width="11" height="7" viewBox="0 0 12 8" aria-hidden="true"><path d="M1.4 1.6 6 6.2l4.6-4.6" fill="none" stroke={T.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </div>
          </div>
          {unit === 'vlastni' && (
            <input className="wfield" value={unitCustom} onChange={e => setUnitCustom(e.target.value.slice(0, 24))} placeholder="Za co? Např. za m², za pokoj, za fotku" style={pole} />
          )}
          {_P_BEZ_CASTKY.indexOf(unit) === -1 && (
            <button onClick={() => setPriceFrom(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
              <span style={{ width: 44, height: 26, flex: 'none', borderRadius: 999, position: 'relative', background: priceFrom ? T.primary : 'rgba(18,18,26,0.16)', transition: 'background .2s' }}>
                <span style={{ position: 'absolute', top: 3, left: priceFrom ? 21 : 3, width: 20, height: 20, borderRadius: 999, background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
              </span>
              <span style={{ fontFamily: T.fontUI, fontSize: 13.5, color: T.ink, fontWeight: 600 }}>Napsat „Od" — cena je jen orientační</span>
            </button>
          )}
          {/* Přesně tenhle řádek uvidí lidé v sekci Cena na tvé kartě */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', padding: '12px 14px', borderRadius: 14, background: '#FFF8E7' }}>
            <span style={{ fontFamily: T.fontHead, fontSize: 21, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>{cena.price}</span>
            {cena.priceUnit && <span style={{ fontFamily: T.fontUI, fontSize: 13, fontWeight: 600, color: T.muted }}>{cena.priceUnit}</span>}
          </div>
          <span style={hint}>Ať se to neřeší v každém chatu znovu. „Dohodou" je taky v pohodě.</span>
        </div>

        {/* ── O mně ── */}
        <div style={box}>
          <WSekHead kind="user" title="O mně" />
          <textarea className="wfield" value={bio} onChange={e => setBio(e.target.value.slice(0, MAXB))} rows={5}
            placeholder="Napiš pár vět o sobě — kdo jsi, odkud to umíš a proč ti lidi můžou věřit. Čím víc řekneš, tím spíš si tě vyberou."
            style={{ ...pole, resize: 'vertical' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{pocet(bio.length, MAXB)}</div>
          <div>
            <div style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: T.mutedSoft, marginBottom: 7 }}>Zkušenost</div>
            <input className="wfield" value={experience} onChange={e => setExperience(e.target.value.slice(0, 80))}
              placeholder="Např. 4 roky v servisu / samouk, dělám to 5 let" style={pole} />
          </div>
          <span style={hint}>„O mně" se sdílí s tvým profilem — píšeš to jen jednou.</span>
        </div>

        {/* ── Podrobnosti ── */}
        <div style={box}>
          <WSekHead kind="list" title="Podrobnosti" />
          <div>
            <div style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: T.mutedSoft, marginBottom: 9 }}>Dostupnost</div>
            {chip(_P_DOSTUP, availability, v => toggle(availability, setAvailability, v))}
          </div>
          <div>
            <div style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: T.mutedSoft, marginBottom: 9 }}>Kde a jak</div>
            {chip(_P_KDE, modes, v => toggle(modes, setModes, v))}
          </div>
          <div>
            <div style={{ fontFamily: T.fontUI, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: T.mutedSoft, marginBottom: 7 }}>Vybavení</div>
            <input className="wfield" value={equipment} onChange={e => setEquipment(e.target.value.slice(0, 80))}
              placeholder="Např. vlastní nářadí, dodávka, přijedu s notebookem" style={pole} />
          </div>
          <span style={hint}>Tyhle tři řádky jsou na kartě dole v „Podrobnostech".</span>
        </div>

        {/* Odkud se bere zbytek */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '14px 15px', borderRadius: 18, background: T.surfaceAlt }}>
          <span style={{ flex: 'none', display: 'flex', marginTop: 1 }}><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.2" fill="none" stroke={T.primary} strokeWidth="1.5" /><path d="M9 8.4v4" stroke={T.primary} strokeWidth="1.6" strokeLinecap="round" /><circle cx="9" cy="5.7" r="0.9" fill={T.primary} /></svg></span>
          <span style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>Jméno, profilovka, město, hodnocení i doba odpovědi se berou z tvého profilu a z toho, jak tady funguješ. Uprav je v Profilu.</span>
        </div>
      </div>

      {/* Spodní lišta — stejná jako na kartě: vlevo náhled, vpravo uložit */}
      <div style={{ flex: 'none', background: '#fff', borderTop: '1px solid ' + T.border, padding: '12px 16px calc(14px + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => setNahled(true)} style={{ flex: '0 0 auto', height: 52, padding: '0 18px', borderRadius: 16, background: '#fff', border: '1px solid ' + T.border, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: T.ink, WebkitTapHighlightColor: 'transparent' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke={T.ink} strokeWidth="1.8"><path d="M2.6 12S6.4 5.6 12 5.6 21.4 12 21.4 12 17.6 18.4 12 18.4 2.6 12 2.6 12Z" strokeLinejoin="round" /><circle cx="12" cy="12" r="3.1" /></svg>
          Náhled
        </button>
        <button onClick={() => save()} disabled={ukladam} style={{ flex: 1, height: 52, border: 'none', borderRadius: 16, background: saved ? T.green : T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800, color: '#fff', cursor: ukladam ? 'default' : 'pointer', opacity: ukladam ? 0.75 : 1, WebkitTapHighlightColor: 'transparent', transition: 'background .2s, opacity .2s' }}>
          {ukladam ? 'Nahrávám fotky…' : saved ? 'Uloženo ✓' : 'Uložit kartu'}
        </button>
      </div>

      {/* Celá karta v náhledu — přesně to, co uvidí člověk v tržišti */}
      {nahled && (_pStyl() === 'a'
        ? <WPersonDetail person={ja} preview onClose={() => setNahled(false)} onContact={() => {}} />
        : (_pStyl() === 'd' || _pStyl() === 'e')
          ? <WPersonDetailD person={ja} hybrid={_pStyl() === 'e'} preview onClose={() => setNahled(false)} onContact={() => {}} />
          : <WPersonDetailB person={ja} hybrid={_pStyl() === 'c'} preview onClose={() => setNahled(false)} onContact={() => {}} />)}

      {/* Moc velká fotka */}
      {popisFoto && (
        <WPopisekSheet
          fotka={popisFoto}
          hodnota={popisky[popisFoto]}
          onUloz={t => { setPopisky(o => { const n = { ...o }; if (t) n[popisFoto] = t; else delete n[popisFoto]; return n; }); setPopisFoto(null); }}
          onClose={() => setPopisFoto(null)} />
      )}
      {velke && (
        <WVelkaFotkaSheet fotky={velke} onClose={() => {
          velke.forEach(f => { if (f.url) { try { URL.revokeObjectURL(f.url); } catch (e) {} } });
          setVelke(null);
        }} />
      )}

      {/* Zveřejnit kartu — potvrzení zespoda */}
      {zverejnit && (
        <WZverejnitSheet
          onClose={() => setZverejnit(false)}
          onPotvrd={neptat => {
            if (neptat) { try { localStorage.setItem(_P_KLIC_VAROVANI, '1'); } catch (e) {} }
            setEnabled(true);
          }} />
      )}

      {/* Neuložené změny */}
      {odchod && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9400, background: 'rgba(11,18,51,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'wFadeIn .18s ease' }}>
          <div style={{ width: '100%', maxWidth: 330, background: '#fff', borderRadius: 24, padding: '22px 20px 18px', animation: 'wPop .26s cubic-bezier(.2,.8,.2,1)' }}>
            <div style={{ fontFamily: T.fontHead, fontSize: 18, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>Máš neuložené změny</div>
            <div style={{ fontFamily: T.fontUI, fontSize: 13.5, color: T.muted, lineHeight: 1.55, marginTop: 7 }}>Když odejdeš, karta zůstane v té podobě, jak jsi ji ukládal naposled.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
              <button onClick={() => save(onClose)} style={{ height: 48, border: 'none', borderRadius: 15, background: T.primary, color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>Uložit a zavřít</button>
              <button onClick={() => { setOdchod(false); onClose(); }} style={{ height: 46, border: '1px solid ' + T.border, borderRadius: 15, background: '#fff', color: T.ink, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>Zahodit změny</button>
              <button onClick={() => setOdchod(false)} style={{ height: 40, border: 'none', background: 'none', color: T.muted, fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Zpátky k úpravám</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hlavní záložka Lidé — tržiště ──────────────────────────────────
function WPeople({ tick }) {
  const [people, setPeople] = useStateW([]);
  const [loading, setLoading] = useStateW(true);
  const [search, setSearch] = useStateW('');
  const [cat, setCat] = useStateW('vse');
  const [katAnim, setKatAnim] = useStateW(0);   // bumpne se při výběru → přehraje animaci ikonky
  const [globeSpin, setGlobeSpin] = useStateW(0);   // bumpne se při kliknutí na „Vše" → zeměkoule se otočí
  const [drillSpin, setDrillSpin] = useStateW(0);   // bumpne se při kliknutí na „Řemesla" → vrtačka zavibruje
  const [broomSpin, setBroomSpin] = useStateW(0);   // bumpne se při kliknutí na „Úklid" → koště zamete
  const [bookSpin, setBookSpin] = useStateW(0);     // bumpne se při kliknutí na „Doučování" → kniha se otevře/zavře
  const [sproutSpin, setSproutSpin] = useStateW(0); // bumpne se při kliknutí na „Zahrada" → rostlinka se zalije
  const [laptopSpin, setLaptopSpin] = useStateW(0); // bumpne se při kliknutí na „IT" → notebook se „opraví"
  const [cameraSpin, setCameraSpin] = useStateW(0); // bumpne se při kliknutí na „Foto" → foťák cvakne
  const [panSpin, setPanSpin] = useStateW(0);       // bumpne se při kliknutí na „Jídlo" → usmaží se vejce
  const [trainSpin, setTrainSpin] = useStateW(0);   // bumpne se při kliknutí na „Hlídání" → vláček zakouří
  const [dogSpin, setDogSpin] = useStateW(0);       // bumpne se při kliknutí na „Zvířata" → nasype se krmivo + srdíčka
  const [beautySpin, setBeautySpin] = useStateW(0); // bumpne se při kliknutí na „Krása" → mexická vlna + lesk zrcátka
  const [boxSpin, setBoxSpin] = useStateW(0);       // bumpne se při kliknutí na „Stěhování" → krabice se sbalí
  const [guitarSpin, setGuitarSpin] = useStateW(0); // bumpne se při kliknutí na „Hudba" → kytara brnkne + noty
  const [carSpin, setCarSpin] = useStateW(0);       // bumpne se při kliknutí na „Doprava" → auto narazí a odjede
  const [runSpin, setRunSpin] = useStateW(0);       // bumpne se při kliknutí na „Sport" → míč propadne sítí
  const [peceSpin, setPeceSpin] = useStateW(0);     // bumpne se při kliknutí na „Péče" → srdíčko naskočí a praskne
  const heartApi = useRefW(null);                   // pustí animaci srdce hned v onClick (viz WSavedHeartIcon)
  const [savedVer, setSavedVer] = useStateW(0);     // přepnutí srdíčka kdekoli v appce → přepočítat „Uložené"
  const [detailPerson, setDetailPerson] = useStateW(null);
  // TESTOVACÍ přepínač stylu karty (A = původní sekce, B = nový podle předlohy).
  // Až se rozhodne, který zůstane, přepínač i druhá komponenta půjdou pryč.
  const [styl, setStyl] = useStateW(() => { try { return localStorage.getItem('makej-karta-styl') || 'a'; } catch (e) { return 'a'; } });
  function prepniStyl(v) { setStyl(v); try { localStorage.setItem('makej-karta-styl', v); } catch (e) {} }
  const [info, setInfo] = useStateW(null);               // { title, text }
  const [showCard, setShowCard] = useStateW(false);      // editor „Moje karta"
  const scrollRef = useRefW(null);
  const lastY = useRefW(0);
  const headRef = useRefW(null);
  const [headHidden, setHeadHidden] = useStateW(false);  // auto-schování vršku při scrollu dolů
  const accum = useRefW(0);       // naakumulovaná dráha v aktuálním směru (hystereze proti kmitání)
  const [headH, setHeadH] = useStateW(null);             // přesná výška overlaye (kvůli odsazení mřížky)

  useEffectW(() => _pOnSaved(() => setSavedVer(v => v + 1)), []);

  useEffectW(() => {
    let live = true;
    (async () => {
      setLoading(true);
      let cards = [];
      try { cards = await fetchPeopleCardsW([]); } catch (e) { cards = []; }
      if (!cards || cards.length === 0) cards = _pDemoPeople();
      if (live) { setPeople(cards); setLoading(false); }
    })();
    return () => { live = false; };
  }, [tick]);

  const q = _pNorm(search.trim());
  const catDef = _P_KATEGORIE.find(c => c.key === cat);
  // Vyhledávač platí i na filtry: relevantní kategorie hodí dopředu (Vše první, Ostatní poslední).
  const katList = !q ? _P_KATEGORIE : [..._P_KATEGORIE].sort((a, b) => {
    const skore = c => {
      if (c.key === 'vse') return 3;
      if (c.key === 'ulozene') return 2.5;
      if (c.key === 'ostatni') return -1;
      const trefa = (c.kw && c.kw.some(k => k.includes(q) || q.includes(k))) || _pNorm(c.label).includes(q);
      return trefa ? 2 : 0;
    };
    return skore(b) - skore(a);
  });
  const ulozeneSet = _pSavedSet();   // savedVer jen nutí přepočet, hodnota se čte odsud
  const jenUlozene = cat === 'ulozene';
  let filtered = people.filter(p => {
    if (jenUlozene && !ulozeneSet.has(p.id)) return false;
    const hay = _pNorm([p.name, p.card_offer, (p.card_tags || []).join(' '), (p.skills || []).join(' '), p.city].filter(Boolean).join(' '));
    if (q && !hay.includes(q)) return false;
    // Kdo má obor vyplněný, ten rozhoduje. Hádání z klíčových slov zůstává jen
    // pro starší karty a demo lidi, kteří obor ještě nemají.
    if (p.card_obor) {
      if (cat !== 'vse' && cat !== p.card_obor) return false;
    } else if (cat === 'ostatni') {
      // Ostatní = nespadá do žádné konkrétní kategorie
      const spadaNekam = _P_KATEGORIE.some(c => c.kw && c.kw.length && c.kw.some(k => hay.includes(k)));
      if (spadaNekam) return false;
    } else if (catDef && catDef.kw && catDef.kw.length && !catDef.kw.some(k => hay.includes(k))) {
      return false;
    }
    return true;
  });
  filtered = [...filtered].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  function contact(person) {
    // Backend Lidé zatím neběží → ukázka. Až se spustí: createPeopleMatchW + chat.
    setDetailPerson(null);
    setInfo({ title: 'Napsat ' + _pShort(person.name).split(' ')[0], text: 'Až se Lidé spustí naživo, tímhle se rovnou otevře chat. Teď je to ukázka rozhraní.' });
  }
  function openCard() { setShowCard(true); }

  // Přesná výška overlaye (vyhledávač+filtry) → o tolik odsadíme mřížku pod ním.
  useEffectW(() => { if (headRef.current) setHeadH(headRef.current.scrollHeight); }, [loading, cat, people.length]);

  // Auto-hide vršku (vyhledávač+filtry) — jako v prémiových appkách. Scroll dolů ho
  // po chvíli plynule schová (víc místa na obsah), scroll nahoru ho zase vytáhne
  // (nemusíš až úplně nahoru). Hystereze přes akumulovanou dráhu, ať to nekmitá;
  // plynulost řeší CSS transition na transformu (GPU). Stav přepínám jen na prahu,
  // takže re-render je minimální a nic se netrhá.
  const HIDE_AT = 52, SHOW_AT = 34;   // px v jednom směru, než se překlopí
  function onGridScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const y = el.scrollTop, delta = y - lastY.current, hh = headH || 0;
    lastY.current = y;
    if (window.wNavScroll) window.wNavScroll(y);   // zmenšení plovoucího navbaru (jako IG)
    // Dokud nescrolluješ ZA výšku hlavičky, drž ji vidět. Jinak by se schovala hned
    // na začátku a pod ní by zůstal prázdný pruh (mřížka má nahoře rezervu = headH).
    // Schová se tedy až když ti první inzeráty odjedou nahoru díky scrollu.
    if (y <= hh) { accum.current = 0; if (headHidden) setHeadHidden(false); return; }
    if (delta > 0 && accum.current < 0) accum.current = 0;   // obrat směru → počítej od nuly
    if (delta < 0 && accum.current > 0) accum.current = 0;
    accum.current += delta;
    if (accum.current > HIDE_AT && !headHidden) setHeadHidden(true);        // souvisle dolů → schovat
    else if (accum.current < -SHOW_AT && headHidden) setHeadHidden(false);  // souvisle nahoru → ukázat
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative', marginTop: 'calc(-1 * env(safe-area-inset-top))' }}>

      {/* Scroll oblast: celý vršek (název + Nabídni se + vyhledávač + filtry) je
          jeden overlay, který se při scrollu dolů celý odveze nahoru (zmizí) a při
          scrollu nahoru zase přijede — čistě transformem, mřížka se nepřeskládává. */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <div ref={headRef} style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
          background: T.bg, padding: 'calc(14px + env(safe-area-inset-top)) 16px 12px',
          transform: headHidden ? 'translateY(-' + (headH || 0) + 'px)' : 'translateY(0)',
          opacity: headHidden ? 0 : 1,
          // Odjezd i příjezd stejně smooth: příjezd měkce dosedne (ease-out), odjezd
          // plynule zrychlí ven a přitom se prolne (opacity) — ať to hezky „zmizí".
          transition: headHidden
            ? 'transform .40s cubic-bezier(.4,0,.6,1), opacity .30s ease'
            : 'transform .48s cubic-bezier(.16,1,.3,1), opacity .34s ease',
          willChange: 'transform, opacity',
        }}>
            {/* Bez nadpisu „Lidé" (je v navbaru dole) — „Nabídni se" přes celou šířku */}
            <button onClick={openCard} style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: T.primary, color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, border: 'none', padding: '13px 16px', borderRadius: 15, cursor: 'pointer', marginBottom: 12, WebkitTapHighlightColor: 'transparent' }}>{_PIco.plus('#fff')}Nabídni se</button>
            <WPeopleSearch value={search} onChange={e => setSearch(e.target.value)} />

            <div className="wfilter-strip" style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', margin: '12px -16px 0', padding: '2px 16px' }}>
              {katList.map(c => {
                const on = cat === c.key;
                const meta = _P_KAT_META[c.key] || ['•', 'bounce'];
                const isVse = c.key === 'vse';
                const isUlozene = c.key === 'ulozene';
                const isRemesla = c.key === 'remesla';
                const isUklid = c.key === 'uklid';
                const isDoucovani = c.key === 'doucovani';
                const isZahrada = c.key === 'zahrada';
                const isIt = c.key === 'it';
                const isFoto = c.key === 'foto';
                const isGastro = c.key === 'gastro';
                const isHlidani = c.key === 'hlidani';
                const isZvirata = c.key === 'zvirata';
                const isKrasa = c.key === 'krasa';
                const isStehovani = c.key === 'stehovani';
                const isHudba = c.key === 'hudba';
                const isDoprava = c.key === 'doprava';
                const isSport = c.key === 'trenink';
                const isPece = c.key === 'pece';
                return (
                  <button key={c.key} onClick={() => { setCat(c.key); setKatAnim(n => n + 1); if (isVse) setGlobeSpin(s => s + 1); if (isUlozene && heartApi.current) heartApi.current(); if (isRemesla) setDrillSpin(s => s + 1); if (isUklid) setBroomSpin(s => s + 1); if (isDoucovani) setBookSpin(s => s + 1); if (isZahrada) setSproutSpin(s => s + 1); if (isIt) setLaptopSpin(s => s + 1); if (isFoto) setCameraSpin(s => s + 1); if (isGastro) setPanSpin(s => s + 1); if (isHlidani) setTrainSpin(s => s + 1); if (isZvirata) setDogSpin(s => s + 1); if (isKrasa) setBeautySpin(s => s + 1); if (isStehovani) setBoxSpin(s => s + 1); if (isHudba) setGuitarSpin(s => s + 1); if (isDoprava) setCarSpin(s => s + 1); if (isSport) setRunSpin(s => s + 1); if (isPece) setPeceSpin(s => s + 1); }} style={{
                    flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    border: '1.5px solid ' + (on ? (isUlozene ? '#E0323D' : 'rgba(11,18,51,0.9)') : 'transparent'),
                    background: on ? '#fff' : 'transparent', padding: '7px 13px', borderRadius: 16,
                    cursor: 'pointer', WebkitTapHighlightColor: 'transparent', minWidth: 62,
                  }}>
                    {isVse
                      ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WGlobeIcon size={24} spinKey={globeSpin} /></span>
                      : isUlozene
                      ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WSavedHeartIcon size={24} apiRef={heartApi} /></span>
                      : isRemesla
                        ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WDrillIcon size={26} spinKey={drillSpin} /></span>
                        : isUklid
                          ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WBroomIcon size={26} spinKey={broomSpin} /></span>
                          : isDoucovani
                            ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WBoardIcon size={30} spinKey={bookSpin} /></span>
                            : isZahrada
                              ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WSproutIcon size={28} spinKey={sproutSpin} /></span>
                              : isIt
                                ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WLaptopIcon size={30} spinKey={laptopSpin} /></span>
                                : isFoto
                                  ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WCameraIcon size={30} spinKey={cameraSpin} /></span>
                                  : isGastro
                                    ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WPanIcon size={30} spinKey={panSpin} /></span>
                                    : isHlidani
                                      ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WTrainIcon size={30} spinKey={trainSpin} /></span>
                                      : isZvirata
                                        ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WDoghouseIcon size={30} spinKey={dogSpin} /></span>
                                        : isKrasa
                                          ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WCosmeticsIcon size={30} spinKey={beautySpin} /></span>
                                          : isStehovani
                                            ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WBoxIcon size={24} spinKey={boxSpin} /></span>
                                            : isHudba
                                              ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WGuitarIcon size={28} spinKey={guitarSpin} /></span>
                                              : isDoprava
                                                ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WCarIcon size={30} spinKey={carSpin} /></span>
                                                : isSport
                                                  ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WHoopIcon size={30} spinKey={runSpin} /></span>
                                                  : isPece
                                                    ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WHeartHandsIcon size={26} spinKey={peceSpin} /></span>
                                                    : <span key={on ? 'a' + katAnim : 'i'} style={{ fontSize: 23, lineHeight: 1, display: 'inline-block', transformOrigin: meta[1] === 'sweep' ? '72% 24%' : 'center', animation: on ? _P_ANIM[meta[1]] : 'none' }}>{meta[0]}</span>}
                    <span style={{ fontFamily: T.fontUI, fontSize: 11.5, fontWeight: on ? 800 : 600, color: on ? (isUlozene ? '#E0323D' : T.ink) : T.muted, whiteSpace: 'nowrap' }}>{c.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <div style={{ flex: 1, minWidth: 0, fontFamily: T.fontUI, fontSize: 13, fontWeight: 600, color: T.muted }}>{loading ? 'Hledáme lidi v okolí…' : jenUlozene
                ? filtered.length + ' ' + _wPlural(filtered.length, 'uložený člověk', 'uložení lidé', 'uložených lidí')
                : filtered.length + ' ' + _wPlural(filtered.length, 'člověk v okolí', 'lidé v okolí', 'lidí v okolí')}</div>
              {/* TEST: přepínač stylu karty */}
              <div style={{ flex: 'none', display: 'flex', gap: 2, padding: 2, borderRadius: 999, background: T.surfaceAlt, border: '1px solid ' + T.border }}>
                {['a', 'b', 'c', 'd', 'e'].map(val => (
                  <button key={val} onClick={() => prepniStyl(val)} style={{
                    border: 'none', borderRadius: 999, padding: '5px 12px', cursor: 'pointer',
                    background: styl === val ? '#fff' : 'transparent',
                    color: styl === val ? T.primary : T.muted,
                    boxShadow: styl === val ? '0 1px 4px rgba(11,18,51,0.10)' : 'none',
                    fontFamily: T.fontHead, fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap',
                    WebkitTapHighlightColor: 'transparent',
                  }}>{val.toUpperCase()}</button>
                ))}
              </div>
            </div>
        </div>

        {/* Mřížka lidí — pod overlayem; odsazená o jeho výšku (headH). */}
        <div ref={scrollRef} onScroll={onGridScroll} style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '0 16px calc(84px + env(safe-area-inset-bottom))', paddingTop: headH == null ? 140 : headH }} aria-busy={loading ? 'true' : 'false'}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => <WPersonSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 && jenUlozene ? (
          <WPrazdneUlozene onHledat={() => {
            setCat('vse'); setSearch(''); setGlobeSpin(n => n + 1);
            if (scrollRef.current) scrollRef.current.scrollTop = 0;
          }} />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '46px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 60, height: 60, borderRadius: 999, background: T.tint, display: 'grid', placeItems: 'center' }}><Icon name="users-group-rounded-bold" size={26} color={T.primary} /></div>
            <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 16, fontWeight: 800 }}>Zatím tu nikdo takový není</div>
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13, lineHeight: 1.5 }}>Zkus jiné hledání nebo kategorii — nebo <button onClick={openCard} style={{ border: 'none', background: 'none', color: T.primary, fontWeight: 800, cursor: 'pointer', padding: 0, fontFamily: T.fontHead, fontSize: 13 }}>buď první</button>.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
            {filtered.map((p, i) => <WPersonGridCard key={p.id} person={p} idx={i} onTap={() => setDetailPerson(p)} />)}
          </div>
        )}
        </div>
      </div>

      {detailPerson && (styl === 'a'
        ? <WPersonDetail person={detailPerson} onClose={() => setDetailPerson(null)} onContact={contact}
            onBlocked={id => setPeople(prev => prev.filter(p => p.id !== id))} />
        : (styl === 'd' || styl === 'e')
          ? <WPersonDetailD person={detailPerson} hybrid={styl === 'e'} onClose={() => setDetailPerson(null)} onContact={contact}
              onBlocked={id => setPeople(prev => prev.filter(p => p.id !== id))} />
          : <WPersonDetailB person={detailPerson} hybrid={styl === 'c'} onClose={() => setDetailPerson(null)} onContact={contact}
              onBlocked={id => setPeople(prev => prev.filter(p => p.id !== id))} />)}
      {info && <WPeopleInfo title={info.title} text={info.text} onClose={() => setInfo(null)} />}
      {showCard && <WMyCard onClose={() => setShowCard(false)} />}
    </div>
  );
}

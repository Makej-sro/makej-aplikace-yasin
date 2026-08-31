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
  { key: 'trenink',   label: 'Trénink',        kw: ['trener', 'joga', 'fitness', 'kondic', 'cvic', 'sport'] },
  { key: 'pece',      label: 'Péče',           kw: ['senior', 'asisten', 'pecovat', 'doprovod', 'babick'] },
  { key: 'masaze',    label: 'Masáže',         kw: ['masaz', 'wellness', 'relax', 'fyzio', 'lymf'] },
  { key: 'admin',     label: 'Administrativa', kw: ['preklad', 'administr', 'papirov', 'ucetni', 'danov', 'formular'] },
  // „Ostatní" = catch-all: padnou sem lidi, co nesedí do žádné konkrétní kategorie (viz filtr níž).
  { key: 'ostatni',   label: 'Ostatní',        kw: [] },
];

// Emoji + typ animace pro Airbnb-styl filtr (spin = točí se, swing = zakývá „cinkne", bounce = poskočí).
const _P_KAT_META = {
  vse: ['🌍', 'spin'], remesla: ['🔧', 'swing'], uklid: ['🧹', 'sweep'], zahrada: ['🌱', 'bounce'],
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

// Klíčová slova pro typewriter efekt v placeholderu vyhledávání.
const _P_HLEDEJ = ['doučování', 'opravy', 'foto', 'stěhování', 'web na míru', 'dort', 'kytaru', 'hodinky', 'úklid'];

// Volby pro editor karty.
const _P_ODMENA = [['free', 'Zdarma'], ['deal', 'Dohodou'], ['from', 'Od…']];
const _P_DOSTUP = ['Přes den', 'Večery', 'Víkendy', 'Flexibilně'];
const _P_KDE    = ['U tebe', 'U mě', 'Online'];
function _pPriceStr(type, amount) {
  if (type === 'free') return 'Zdarma';
  if (type === 'from') return amount ? ('Od ' + amount + ' Kč') : '';
  if (type === 'deal') return 'Dohodou';
  return '';
}

// ── Demo data — appka teprve startuje, reálné karty zatím nejsou. ──
// avatar = profilová fotka, photos = galerie práce, skills = „co umím",
// equipment = vlastní vybavení/nářadí. (Demo fotky: demo-lide/ — nahradit reálnými.)
// Průměrná doba odpovědi: do 2 h (120 min) se píše v minutách, nad 2 h v hodinách.
function _pFmtReply(mins) {
  const m = Math.round(Number(mins) || 0);
  if (m <= 0) return '';
  return m <= 120 ? m + ' min' : Math.round(m / 60) + ' h';
}

function _pDemoPeople() {
  const _demo = [
    { id: 'demo-p-1', name: 'Petr Hlaváč', verified: true, city: 'Brno', district: 'Brno — Veveří', rating: 4.9, ratingCount: 23,
      avatar: 'demo-lide/p1.jpg', photos: ['demo-lide/w1.jpg', 'demo-lide/w2.jpg', 'demo-lide/w3.jpg'],
      card_offer: 'Jednou týdně opravuju hodinky, rád pomůžu. Vyměním baterii, řemínek i sklíčko, u mechanik zvládnu vyčištění a seřízení. Přines to kdykoli večer, většinou to mám hotové do druhého dne.',
      bio: 'Hodinky mě baví od malička — začínal jsem u dědy v dílně a teď to dělám i profesionálně v servisu. Nejsem žádná velká značka, ale poctivě a rád. Když si nebudeš vědět rady, poradím i po telefonu.',
      experience: '4 roky v hodinářském servisu', equipment: 'Vlastní nářadí i běžné náhradní díly',
      skills: ['Výměna baterie', 'Řemínky', 'Sklíčka', 'Čištění mechanik', 'Seřízení'],
      price: 'Dohodou', availability: ['Večery', 'Víkendy'],
      card_tags: ['Řemesla', 'Hodinky', 'Drobné opravy'], replyTime: 'do 2 hodin', helpCount: 31, mode: 'U mě i osobně',
      reviews: [{ text: 'Vyměnil mi řemínek za dvacet minut a nechtěl za to nic. Moc příjemné jednání.', author: 'Klára V.', month: 'červenec' }] },
    { id: 'demo-p-2', name: 'Tereza Nová', verified: true, city: 'Brno', district: 'Brno — střed', rating: 4.8, ratingCount: 41,
      avatar: 'demo-lide/p2.jpg', photos: ['demo-lide/w4.jpg', 'demo-lide/w5.jpg'],
      card_offer: 'Doučuju matiku a fyziku, základka i střední. Připravím i na přijímačky a maturitu, vysvětlím to lidsky. Chodím k tobě nebo online.',
      bio: 'Studuju učitelství matematiky a doučování je pro mě radost, ne jen přivýdělek. Umím látku vysvětlit několika způsoby, dokud to nesedne. S dětmi mám trpělivost a nebojím se ani slabších studentů.',
      experience: 'Doučuju 3 roky, studuju učitelství', equipment: 'Materiály a příklady nachystám',
      skills: ['Matematika', 'Fyzika', 'Přijímačky', 'Příprava na maturitu'],
      price: 'Od 250 Kč', availability: ['Večery', 'Víkendy'],
      card_tags: ['Doučování', 'Matematika', 'Fyzika'], replyTime: 'do 1 hodiny', helpCount: 58, mode: 'U tebe i online',
      reviews: [{ text: 'Syn konečně pochopil zlomky. Trpělivá a připravená.', author: 'Jana P.', month: 'červen' }] },
    { id: 'demo-p-3', name: 'Martin Kraus', verified: true, city: 'Praha', district: 'Praha 7', rating: 5.0, ratingCount: 12,
      avatar: 'demo-lide/p3.jpg', photos: ['demo-lide/w6.jpg', 'demo-lide/w7.jpg', 'demo-lide/w8.jpg', 'demo-lide/w9.jpg'],
      card_offer: 'Fotím portréty a akce, mám vlastní techniku i světla. Portréty, produktovku i menší eventy. Fotky dodám upravené do týdne.',
      bio: 'Focení dělám pátým rokem, mám vlastní ateliér i mobilní vybavení na výjezdy. Rád domluvím koncept dopředu, ať odcházíš s fotkami, které se ti opravdu líbí. Ukázky pošlu na požádání.',
      experience: 'Fotím 5 let, vlastní ateliér', equipment: 'Vlastní technika, světla i ateliér',
      skills: ['Portréty', 'Produktovka', 'Eventy', 'Retuš'],
      price: 'Od 500 Kč', availability: ['Flexibilně'],
      card_tags: ['Foto/Video', 'Portréty', 'Eventy'], replyTime: 'do 3 hodin', helpCount: 9, mode: 'U mě',
      reviews: [{ text: 'Skvělé portréty do portfolia, rychlé dodání.', author: 'Filip N.', month: 'srpen' }] },
    { id: 'demo-p-4', name: 'Adéla Pokorná', verified: false, city: 'Ostrava', district: 'Ostrava — Poruba', rating: 4.7, ratingCount: 16,
      avatar: 'demo-lide/p4.jpg', photos: ['demo-lide/w10.jpg', 'demo-lide/w11.jpg'],
      card_offer: 'Pomůžu se stěhováním, mám dodávku a sílu. Naložím, odvezu i vynosím do patra. Klidně i o víkendu.',
      bio: 'Stěhování dělám při škole, mám dodávku po tátovi a partu spolehlivých kluků, když je potřeba víc rukou. Na čas dorazím, s nábytkem umím a nic ti nepoškrábu.',
      experience: 'Stěhuju 2 roky, vlastní dodávka', equipment: 'Vlastní dodávka, popruhy i deky',
      skills: ['Naložení', 'Odvoz', 'Vynošení do patra', 'Demontáž nábytku'],
      price: 'Od 200 Kč', availability: ['Víkendy', 'Flexibilně'],
      card_tags: ['Stěhování', 'Dodávka'], replyTime: 'do 5 hodin', helpCount: 22, mode: 'U tebe',
      reviews: [{ text: 'Přijela na čas, byt jsme stěhovali rychle. Doporučuju.', author: 'Ondřej M.', month: 'květen' }] },
    { id: 'demo-p-5', name: 'Jakub Souček', verified: true, city: 'Brno', district: 'Brno — Královo Pole', rating: 4.6, ratingCount: 19,
      avatar: 'demo-lide/p5.jpg', photos: ['demo-lide/w12.jpg', 'demo-lide/w1.jpg'],
      card_offer: 'Postavím jednoduchý web nebo spravím počítač. Prezentaci, e-shop na míru i odvirování a zrychlení notebooku.',
      bio: 'Programuju při studiu na VUT a weby dělám od střední. Nejsem agentura, takže cena je férová a domluva rychlá. Web ti nejen udělám, ale i tě naučím ho spravovat, ať nejsi na mně závislý.',
      experience: 'Weby dělám 4 roky, student VUT', equipment: 'Přijedu s vlastním notebookem',
      skills: ['Weby', 'E-shopy', 'Odvirování', 'Zrychlení PC'],
      price: 'Dohodou', availability: ['Večery', 'Víkendy'],
      card_tags: ['IT', 'Weby'], replyTime: 'do 4 hodin', helpCount: 14, mode: 'U tebe i online',
      reviews: [{ text: 'Web mi udělal za víkend a naučil mě ho spravovat.', author: 'Lucie H.', month: 'červenec' }] },
    { id: 'demo-p-6', name: 'Klára Veselá', verified: true, city: 'Praha', district: 'Praha 3', rating: 4.9, ratingCount: 34,
      avatar: 'demo-lide/p6.jpg', photos: ['demo-lide/w2.jpg', 'demo-lide/w3.jpg', 'demo-lide/w4.jpg'],
      card_offer: 'Upeču dort na oslavu, zvládnu i bezlepkový. Dorty, cupcakes i cukroví podle přání. Objednávej pár dní dopředu.',
      bio: 'Peču z lásky už roky a nejvíc mě baví, když má být dort podle konkrétní představy. Zvládnu i bezlepkové a veganské varianty. Domluvíme se na chuti i vzhledu předem, ať tě nic nepřekvapí.',
      experience: 'Peču na objednávku 4 roky', equipment: 'Vlastní formy, zdobení i suroviny',
      skills: ['Dorty', 'Cupcakes', 'Cukroví', 'Bezlepkové', 'Veganské'],
      price: 'Od 350 Kč', availability: ['Flexibilně'],
      card_tags: ['Gastro', 'Pečení', 'Dorty'], replyTime: 'do 2 hodin', helpCount: 27, mode: 'U mě',
      reviews: [{ text: 'Nejlepší dort na oslavu, všem chutnal. Domluva bez problému.', author: 'Petra K.', month: 'srpen' }] },
    { id: 'demo-p-7', name: 'Filip Marek', verified: false, city: 'Zlín', district: 'Zlín — střed', rating: 0, ratingCount: 0,
      avatar: 'demo-lide/p7.jpg', photos: ['demo-lide/w5.jpg', 'demo-lide/w6.jpg'],
      card_offer: 'Opravím ti zásuvku nebo světlo, mám papíry na elektro. Drobné elektroinstalace a výměny po bytě.',
      bio: 'Jsem vyučený elektrikář a brigádně pomáhám i s drobnostmi po bytě, na které elektrikáři nechtějí jezdit. Dělám to bezpečně a podle předpisů — u elektřiny se nešidí.',
      experience: 'Vyučený elektrikář', equipment: 'Vlastní nářadí i měřicí přístroje',
      skills: ['Zásuvky', 'Světla', 'Drobné instalace', 'Výměny'],
      price: 'Dohodou', availability: ['Přes den', 'Víkendy'],
      card_tags: ['Řemesla', 'Elektro'], replyTime: 'do 6 hodin', helpCount: 0, mode: 'U tebe', reviews: [] },
    { id: 'demo-p-8', name: 'Nikol Urbanová', verified: false, city: 'Olomouc', district: 'Olomouc — Nová Ulice', rating: 0, ratingCount: 0,
      avatar: 'demo-lide/p8.jpg', photos: ['demo-lide/w7.jpg', 'demo-lide/w8.jpg'],
      card_offer: 'Učím kytaru začátečníky, docházím i domů. Akordy, doprovod k písničkám, tempo dle tebe.',
      bio: 'Hraju na kytaru přes deset let a učení mě baví. Začátečníky vezmu úplně od nuly — první písničku zvládneš rychleji, než čekáš. Tempo i styl přizpůsobím tomu, co chceš hrát.',
      experience: 'Hraju 10 let', equipment: 'Kytaru na hodinu půjčím',
      skills: ['Akordy', 'Doprovod', 'Noty od nuly', 'Rytmus'],
      price: 'Od 300 Kč', availability: ['Večery'],
      card_tags: ['Hudba', 'Kytara', 'Výuka'], replyTime: 'do 1 dne', helpCount: 0, mode: 'U tebe i online', reviews: [] },
    { id: 'demo-p-9', name: 'Lucie Horáková', verified: true, city: 'Praha', district: 'Praha 4', rating: 4.9, ratingCount: 28,
      avatar: 'demo-lide/p9.jpg', photos: ['demo-lide/w2.jpg', 'demo-lide/w3.jpg'],
      card_offer: 'Uklidím ti byt, umyju okna nebo vyžehlím. Pravidelný i jednorázový úklid domácnosti, spolehlivě a v tichosti. Přijedu s vlastní chemií.',
      bio: 'Úklidu se věnuju pár let a mám ráda, když je po mně vidět. Jsem důsledná, na čas a nešťourám se v tvých věcech. Domluvíme se na rozsahu i frekvenci, ať to sedne přesně tobě.',
      experience: 'Uklízím 4 roky', equipment: 'Vlastní úklidová chemie i pomůcky',
      skills: ['Úklid domácnosti', 'Mytí oken', 'Žehlení', 'Generální úklid'],
      price: 'Od 220 Kč', availability: ['Přes den', 'Flexibilně'],
      card_tags: ['Úklid', 'Domácnost'], replyTime: 'do 2 hodin', helpCount: 34, mode: 'U tebe',
      reviews: [{ text: 'Byt zářil, okna bez šmouh. Domluva i příchod bez problému.', author: 'Martina S.', month: 'srpen' }] },
    { id: 'demo-p-10', name: 'Jarda Beneš', verified: false, city: 'Brno', district: 'Brno — Bystrc', rating: 4.7, ratingCount: 12,
      avatar: 'demo-lide/p10.jpg', photos: ['demo-lide/w5.jpg', 'demo-lide/w1.jpg'],
      card_offer: 'Posekám trávník, ostříhám plot nebo shrabu listí. Menší zahradní práce, mám vlastní sekačku i křovinořez. Klidně i pravidelně.',
      bio: 'Zahradě se věnuju od malička u chalupy a teď pomáhám i lidem v okolí. Práci si po sobě uklidím a poradím, co s čím. Nebojím se ani zarostlé zahrady.',
      experience: 'Zahradní práce 3 sezóny', equipment: 'Vlastní sekačka i křovinořez',
      skills: ['Sekání trávy', 'Střihání plotů', 'Hrabání listí', 'Úklid zahrady'],
      price: 'Od 200 Kč', availability: ['Víkendy', 'Flexibilně'],
      card_tags: ['Zahrada', 'Sekání'], replyTime: 'do 4 hodin', helpCount: 15, mode: 'U tebe',
      reviews: [{ text: 'Zarostlou zahradu dal do pořádku za odpoledne. Spokojenost.', author: 'Karel D.', month: 'červenec' }] },
    { id: 'demo-p-11', name: 'Bára Němcová', verified: true, city: 'Praha', district: 'Praha 8', rating: 5.0, ratingCount: 21,
      avatar: 'demo-lide/p11.jpg', photos: ['demo-lide/w4.jpg', 'demo-lide/w7.jpg'],
      card_offer: 'Pohlídám ti děti — odpoledne, večer i o víkendu. Vyzvednu ze školky, pomůžu s úkoly a zabavím. Zkušenosti i s malými dětmi.',
      bio: 'Studuju pedagogiku a hlídání mě baví. Mám mladší sourozence, takže s dětmi umím a jsem trpělivá. Rodičům pošlu během hlídání zprávu, ať mají klid.',
      experience: 'Hlídám děti 3 roky, studuju pedagogiku', equipment: 'Přinesu hry i nápady na zabavení',
      skills: ['Hlídání dětí', 'Vyzvednutí ze školky', 'Pomoc s úkoly', 'Doprovod na kroužky'],
      price: 'Od 180 Kč', availability: ['Večery', 'Víkendy'],
      card_tags: ['Hlídání', 'Děti'], replyTime: 'do 1 hodiny', helpCount: 26, mode: 'U tebe',
      reviews: [{ text: 'Děti si ji hned oblíbily, spolehlivá a milá. Doporučuju.', author: 'Tereza H.', month: 'srpen' }] },
    { id: 'demo-p-12', name: 'Tomáš Král', verified: false, city: 'Ostrava', district: 'Ostrava — Mariánské Hory', rating: 4.8, ratingCount: 17,
      avatar: 'demo-lide/p12.jpg', photos: ['demo-lide/w8.jpg', 'demo-lide/w9.jpg'],
      card_offer: 'Vyvenčím ti psa nebo ho pohlídám, když jsi v práci. Procházky, krmení i pohlídání přes den. Mám psa, takže vím, jak na to.',
      bio: 'Psi jsou moje srdcovka — mám doma border kolii a venčení mě nabíjí. S pejsky umím i s těmi neposednými a pošlu ti fotku z procházky, ať máš klid.',
      experience: 'Venčím a hlídám psy 2 roky', equipment: 'Náhradní vodítko i pamlsky s sebou',
      skills: ['Venčení psů', 'Hlídání přes den', 'Krmení', 'Procházky'],
      price: 'Od 150 Kč', availability: ['Přes den', 'Flexibilně'],
      card_tags: ['Zvířata', 'Venčení psů'], replyTime: 'do 3 hodin', helpCount: 19, mode: 'U tebe',
      reviews: [{ text: 'Naše kolie ho zbožňuje, po procházce spokojený pes. Super.', author: 'Lenka V.', month: 'červen' }] },
    { id: 'demo-p-13', name: 'Denisa Fialová', verified: true, city: 'Brno', district: 'Brno — Řečkovice', rating: 4.9, ratingCount: 39,
      avatar: 'demo-lide/p13.jpg', photos: ['demo-lide/w10.jpg', 'demo-lide/w11.jpg'],
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
          <svg width="16" height="15" viewBox="0 0 24 24" fill={saved ? '#fff' : 'none'} stroke="#fff" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
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

// ── Detail člověka (celá obrazovka) ───────────────────────────────
function WPersonDetail({ person, onClose, onContact }) {
  const [saved, setSaved] = useStateW(() => _pIsSaved(person.id));
  const [coverIdx, setCoverIdx] = useStateW(0);
  const [showReviews, setShowReviews] = useStateW(false);   // panel recenzí zespoda
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
    person.equipment && { k: 'Vybavení', v: person.equipment },
  ].filter(Boolean);

  // Rychlá důvěra pod jménem (číslo + důkaz + popis).
  const jobsDone = person.jobsDone || person.helpCount || person.ratingCount || 0;

  // Adresu (město) ukazuje jen identita pod jménem. Způsob (u tebe / online),
  // dojezd i logistiku řeší chat — na kartě to nemá co dělat.

  const kruh = { width: 38, height: 38, flex: 'none', border: 'none', borderRadius: 999, background: 'rgba(0,0,0,0.36)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' };

  // Nadpis sekce s barevným kolečkovým odznakem — stejný styl jako u inzerátu brigády.
  const sekHead = (bg, svg, title) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: 26, height: 26, flex: 'none', borderRadius: 999, background: bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{svg}</span>
      <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: '#0B1233' }}>{title}</span>
    </span>
  );
  // Reálné Solar ikony z appky (nabundlované ve vendor/icons-solar.js) — stejné
  // barvy i tvary jako u sekcí v detailu brigády, ať je to jednotné.
  // „Nabízí" = zelený check-trend jako „Co ti nabídneme" u brigády.
  const _icOffer = (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17 L10 11 L14 14 L20 7" stroke="#2FA84F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7 L20 7 L20 12" stroke="#2FA84F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const _icSkill = (   // „Co umím" = palec nahoru (co člověk umí / v čem je dobrý)
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#2196F3" aria-hidden="true">
      {/* posun o 1 dolů → tvar palce (tažený nahoru) opticky sedne na střed kolečka */}
      <path transform="translate(0 1)" d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
    </svg>
  );
  const _icUser  = <Icon name="user-bold" size={15} color="#EA7317" />;
  const _icRate = (   // Cena — peněženka (outline) dle předlohy
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="#B8860B" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8.5A2.5 2.5 0 0 1 5 6h13a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 20H5a2.5 2.5 0 0 1-2.5-2.5v-9Z" />
      <path d="M4.4 6 13.7 2.85a1.4 1.4 0 0 1 1.8.9L16.3 6" />
      <path d="M21.5 11h-3.2a2.5 2.5 0 0 0 0 5h3.2a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1Z" />
      <circle cx="18.4" cy="13.5" r="1" fill="#B8860B" stroke="none" />
    </svg>
  );
  const _icList  = <Icon name="checklist-minimalistic-bold" size={15} color="#7C3AED" />;
  // Recenze = stejná hvězda jako v kartách brigád (sdílená komponenta WStar).
  const _icStar  = (typeof WStar === 'function'
    ? <WStar size={15} color="#F5B301" />
    : <Icon name="star-bold" size={15} color="#F5B301" />);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      {/* Celý profil scrolluje — cover i profilovka odjedou nahoru (nic přilepeného) */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {/* ── Cover (pozadí) — swajpovatelné fotky práce, tečky ── */}
        <div style={{ position: 'relative', height: 212, background: T.heroGrad }}>
          {coverPhotos.length > 0 && (
            <div ref={coverRef} onScroll={onCoverScroll} style={{ position: 'absolute', inset: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              {coverPhotos.map((src, i) => (
                <div key={i} style={{ flex: '0 0 100%', width: '100%', height: '100%', scrollSnapAlign: 'center' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          )}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 88, background: 'linear-gradient(180deg, rgba(11,18,51,.32), rgba(11,18,51,0))', pointerEvents: 'none' }} />
          {coverPhotos.length > 1 && (
            <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6, pointerEvents: 'none' }}>
              {coverPhotos.map((_, i) => <span key={i} style={{ width: i === coverIdx ? 18 : 6, height: 6, borderRadius: 999, background: i === coverIdx ? '#fff' : 'rgba(255,255,255,0.55)', transition: 'width .25s' }} />)}
            </div>
          )}
        </div>

        {/* ── Kulatá profilovka — přesahuje přes cover (Facebook styl) ── */}
        <div style={{ padding: '0 18px 2px' }}>
          <div style={{ marginTop: -56, position: 'relative', zIndex: 2 }}>
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
            <div style={{ display: 'flex', marginTop: 13 }}>
              {/* Hodnocení — celý sloupec je proklik na recenze (číslo, hvězdy i text) */}
              {(() => {
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
              {/* Reakce */}
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
            </div>
          </div>
        </div>

        {/* ── Sekce (normální text, scrolluje) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px calc(94px + env(safe-area-inset-bottom))' }}>
        {/* Nabízí — jen headline, cena je vlastní sekce níž */}
        {person.card_offer && (
          <div style={cardBox}>
            {sekHead('#DFF3E3', _icOffer, 'Nabízí')}
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
              {sekHead('#FFF4D6', _icRate, 'Cena')}
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
            {sekHead('#E1F0FE', _icSkill, 'Co umím')}
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
            {sekHead('#FFEDD5', _icUser, 'O mně')}
            {person.bio && <span style={{ fontFamily: T.fontUI, fontSize: 14, color: T.ink, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{person.bio}</span>}
            {person.experience && <span style={{ fontFamily: T.fontUI, fontSize: 13, color: '#5B6488', marginTop: 2 }}><b style={{ color: T.ink, fontWeight: 800 }}>Zkušenost:</b> {person.experience}</span>}
          </div>
        )}

        {/* Podrobnosti — čistý „spec-sheet": popiska vlevo, hodnota vpravo, žádné
            ikonky ve čtverečcích. Elegantní a připravené na budoucí roletky. */}
        {facts.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid ' + T.border, borderRadius: 22, padding: '16px 18px 8px' }}>
            {sekHead('#EDE9FE', _icList, 'Podrobnosti')}
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
      <button onClick={onClose} title="Zpět na tržiště" style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top))', left: 16, ...kruh }}>{_PIco.back('#fff')}</button>
      <button onClick={() => { try { navigator.share && navigator.share({ title: person.name, text: person.card_offer || '' }); } catch (e) {} }} title="Sdílet" style={{ position: 'absolute', top: 'calc(12px + env(safe-area-inset-top))', right: 16, ...kruh }}>{_PIco.share('#fff')}</button>

      {/* Ulepená lišta */}
      <div style={{ flex: 'none', background: '#fff', borderTop: '1px solid ' + T.border, padding: '14px 16px calc(16px + env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => { const nv = !saved; setSaved(nv); _pSetSaved(person.id, nv); }} title={saved ? 'Uloženo' : 'Uložit'} style={{ width: 54, height: 54, flex: 'none', borderRadius: 16, background: '#fff', border: '1px solid ' + T.border, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <svg width="16" height="19" viewBox="0 0 16 19" fill={saved ? T.primary : 'none'} aria-hidden="true"><path d="M2.4 3.2A1.8 1.8 0 0 1 4.2 1.4h7.6a1.8 1.8 0 0 1 1.8 1.8v13.4L8 13.2l-5.6 3.4V3.2Z" stroke={saved ? T.primary : T.ink} strokeWidth="1.5" strokeLinejoin="round" /></svg>
        </button>
        <button onClick={() => onContact(person)} style={{ flex: 1, height: 54, border: 'none', borderRadius: 16, background: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: T.fontHead, fontSize: 16, fontWeight: 700, color: '#fff', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          <Icon name="chat-round-bold" size={19} color="#fff" />Mám zájem
        </button>
      </div>

      {showReviews && <WReviewsSheet person={person} canReply={!!(typeof W_PROFILE !== 'undefined' && W_PROFILE && (person.id === W_PROFILE.id || person._mine))} onClose={() => setShowReviews(false)} />}
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

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9300, background: 'rgba(11,18,51,0.42)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'wScrimIn .22s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bg, borderRadius: '26px 26px 0 0', maxHeight: '86%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -18px 50px rgba(11,18,51,0.28)', animation: 'wSheetUp .34s cubic-bezier(.2,.8,.2,1)' }}>
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
            <button onClick={onClose} title="Zavřít" style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 999, border: 'none', background: T.surfaceAlt, color: T.muted, fontSize: 16, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>✕</button>
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
function _pSetSaved(id, on) { const s = _pSavedSet(); on ? s.add(id) : s.delete(id); try { localStorage.setItem('makej-saved-people', JSON.stringify([...s])); } catch (e) {} }

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
const _P_VZOR = 'Jednou týdně opravuju hodinky a drobnou elektroniku, rád pomůžu. Vyměním baterii, řemínek i sklíčko, u mechanik zvládnu vyčištění a seřízení. Přines to kdykoli večer.';
const _P_STITKY_NAV = ['Doučování', 'Stěhování', 'Foto/Video', 'Řemesla', 'IT', 'Gastro', 'Hudba', 'Úklid'];

// Karta se zatím ukládá lokálně (backend Lidé neběží). Až se spustí, `save`
// zapíše i do profilu (card_enabled/offer/tags) — to už je připravené.
const _P_CARD_DEF = { enabled: false, offer: '', bio: '', experience: '', priceType: 'deal', priceAmount: '', availability: [], modes: [], tags: [] };
function _pMyCard() { try { return { ..._P_CARD_DEF, ...JSON.parse(localStorage.getItem('makej-my-card') || '{}') }; } catch (e) { return { ..._P_CARD_DEF }; } }
function _pSaveMyCard(c) { try { localStorage.setItem('makej-my-card', JSON.stringify(c)); } catch (e) {} }

function WMyCard({ onClose }) {
  const init = _pMyCard();
  const [enabled, setEnabled] = useStateW(init.enabled);
  const [offer, setOffer] = useStateW(init.offer);
  const [bio, setBio] = useStateW(init.bio || W_PROFILE.bio || '');   // „O mně" sdílené s profilem
  const [experience, setExperience] = useStateW(init.experience || '');
  const [priceType, setPriceType] = useStateW(init.priceType || 'deal');
  const [priceAmount, setPriceAmount] = useStateW(init.priceAmount || '');
  const [availability, setAvailability] = useStateW(Array.isArray(init.availability) ? init.availability : []);
  const [modes, setModes] = useStateW(Array.isArray(init.modes) ? init.modes : []);
  const [tags, setTags] = useStateW(Array.isArray(init.tags) ? init.tags : []);
  const [adding, setAdding] = useStateW(false);
  const [tagInput, setTagInput] = useStateW('');
  const [saved, setSaved] = useStateW(false);
  const MAX = 240, MAXB = 500, MAXTAGS = 5;

  const addTag = t => { const s = (t || '').trim(); if (!s || tags.includes(s) || tags.length >= MAXTAGS) return; setTags([...tags, s]); };
  const removeTag = i => setTags(tags.filter((_, idx) => idx !== i));
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  const priceStr = _pPriceStr(priceType, priceAmount);

  async function save() {
    const card = { enabled, offer: offer.slice(0, MAX), bio: bio.slice(0, MAXB), experience, priceType, priceAmount, availability, modes, tags, price: priceStr, mode: modes.join(' · ') };
    _pSaveMyCard(card);
    try { const uid = (await sb.auth.getSession()).data.session?.user?.id; if (uid) await updateProfileW(uid, { card_enabled: card.enabled, card_offer: card.offer, card_tags: card.tags, bio: card.bio }); } catch (e) {}
    setSaved(true); setTimeout(() => setSaved(false), 1600);
  }

  const name = W_PROFILE.name || W_PROFILE.full_name || 'Brigádník';
  const city = W_PROFILE.city || '';
  const rating = Number(W_PROFILE.rating) || 0;
  const verified = !!W_PROFILE.verified;
  const suggest = _P_STITKY_NAV.filter(t => !tags.includes(t)).slice(0, 4);

  const label = { fontFamily: T.fontUI, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: T.mutedSoft, margin: '4px 2px 10px' };
  const hint = { fontFamily: T.fontUI, fontSize: 12.5, color: T.mutedSoft, lineHeight: 1.5, margin: '9px 2px 0' };
  const cardBox = { background: '#fff', border: '1px solid ' + T.border, borderRadius: 20, padding: '16px 17px' };
  const chip = (opts, sel, onT, single) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {opts.map(o => { const val = Array.isArray(o) ? o[0] : o; const lab = Array.isArray(o) ? o[1] : o; const on = single ? sel === val : sel.includes(val);
        return <button key={val} onClick={() => onT(val)} style={{ padding: '9px 14px', borderRadius: 999, cursor: 'pointer', border: '1px solid ' + (on ? T.primary : T.border), background: on ? T.tint : '#fff', color: on ? T.primary : T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}>{lab}</button>;
      })}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: T.bg, display: 'flex', flexDirection: 'column', animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)' }}>
      {/* Header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '48px 16px 12px' }}>
        <button onClick={onClose} title="Zpět" style={{ width: 40, height: 40, flex: 'none', border: '1px solid ' + T.border, borderRadius: 999, background: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{_PIco.back(T.ink)}</button>
        <span style={{ flex: 1, fontFamily: T.fontHead, fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>Moje karta</span>
        <button onClick={save} style={{ border: 'none', background: 'none', color: T.primary, fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800, cursor: 'pointer', padding: '6px 4px' }}>{saved ? 'Uloženo ✓' : 'Uložit'}</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px calc(28px + env(safe-area-inset-bottom))' }}>
        {/* Switch */}
        <div style={{ ...cardBox, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <span style={{ width: 44, height: 44, flex: 'none', borderRadius: 14, background: T.tint, display: 'grid', placeItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.2" fill="none" stroke={T.primary} strokeWidth="1.5" /><path d="M5.6 9.2L8 11.5 12.4 6.4" fill="none" stroke={T.primary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800, color: T.ink }}>Karta je {enabled ? 'zapnutá' : 'vypnutá'}</div>
            <div style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{enabled ? 'Objevíš se v tržišti a lidé ti můžou napsat' : 'V tržišti tě nikdo nevidí'}</div>
          </div>
          <button onClick={() => setEnabled(v => !v)} title="Zapnout / vypnout" style={{ width: 52, height: 30, flex: 'none', borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative', background: enabled ? T.primary : 'rgba(18,18,26,0.18)', transition: 'background .2s' }}>
            <span style={{ position: 'absolute', top: 3, left: enabled ? 25 : 3, width: 24, height: 24, borderRadius: 999, background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
          </button>
        </div>

        {/* Co nabízíš */}
        <div style={label}>Co nabízíš</div>
        <div style={{ ...cardBox, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea value={offer} onChange={e => setOffer(e.target.value.slice(0, MAX))} rows={3}
            placeholder="Krátce, s čím pomůžeš. Např. Opravuju hodinky — baterie, řemínky, sklíčka."
            style={{ width: '100%', border: 'none', outline: 'none', background: 'none', resize: 'vertical', fontFamily: T.fontUI, fontSize: 14.5, color: T.ink, lineHeight: 1.55 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <button onClick={() => setOffer(_P_VZOR)} style={{ border: 'none', background: 'none', color: T.primary, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 800, cursor: 'pointer', padding: 0 }}>Vložit vzorový text</button>
            <span style={{ fontFamily: T.fontUI, fontSize: 12.5, color: offer.length >= MAX ? T.destructive : T.mutedSoft, fontWeight: 600 }}>{offer.length} / {MAX}</span>
          </div>
        </div>
        <div style={hint}>Krátká věta navrch. Detaily napiš do „O mně".</div>

        {/* O mně */}
        <div style={{ ...label, marginTop: 20 }}>O mně</div>
        <div style={{ ...cardBox, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea value={bio} onChange={e => setBio(e.target.value.slice(0, MAXB))} rows={5}
            placeholder="Napiš pár vět o sobě — kdo jsi, odkud to umíš a proč ti lidi můžou věřit. Čím víc řekneš, tím spíš si tě vyberou."
            style={{ width: '100%', border: 'none', outline: 'none', background: 'none', resize: 'vertical', fontFamily: T.fontUI, fontSize: 14.5, color: T.ink, lineHeight: 1.6 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: T.fontUI, fontSize: 12.5, color: bio.length >= MAXB ? T.destructive : T.mutedSoft, fontWeight: 600 }}>{bio.length} / {MAXB}</span>
          </div>
        </div>
        <div style={hint}>Sdílí se s tvým profilem — píšeš jen jednou. Uvidí to lidé v tvém detailu.</div>

        {/* Zkušenost */}
        <div style={{ ...label, marginTop: 20 }}>Zkušenost</div>
        <div style={cardBox}>
          <input value={experience} onChange={e => setExperience(e.target.value.slice(0, 80))}
            placeholder="Např. 4 roky v servisu / samouk, dělám to 5 let"
            style={{ width: '100%', border: 'none', outline: 'none', background: 'none', fontFamily: T.fontUI, fontSize: 14.5, color: T.ink }} />
        </div>
        <div style={hint}>Odkud to umíš — praxe, škola, koníček. Klidně stručně.</div>

        {/* Odměna */}
        <div style={{ ...label, marginTop: 20 }}>Odměna</div>
        <div style={{ ...cardBox, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {chip(_P_ODMENA, priceType, setPriceType, true)}
          {priceType === 'from' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: T.fontUI, fontSize: 14, color: T.muted }}>Od</span>
              <input value={priceAmount} onChange={e => setPriceAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} inputMode="numeric" placeholder="300"
                style={{ width: 90, padding: '10px 12px', borderRadius: 12, border: '1px solid ' + T.border, outline: 'none', fontFamily: T.fontHead, fontSize: 15, fontWeight: 700, color: T.ink }} />
              <span style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, color: T.ink }}>Kč</span>
            </div>
          )}
        </div>
        <div style={hint}>Ať se to neřeší v každém chatu znovu. „Dohodou" je taky v pohodě.</div>

        {/* Dostupnost */}
        <div style={{ ...label, marginTop: 20 }}>Dostupnost</div>
        <div style={cardBox}>{chip(_P_DOSTUP, availability, v => toggle(availability, setAvailability, v))}</div>
        <div style={hint}>Kdy se ti to hodí. Vyber klidně víc.</div>

        {/* Kde a jak */}
        <div style={{ ...label, marginTop: 20 }}>Kde a jak</div>
        <div style={cardBox}>{chip(_P_KDE, modes, v => toggle(modes, setModes, v))}</div>
        <div style={hint}>U tebe, u sebe, nebo online — jak to obvykle děláš.</div>

        {/* Štítky */}
        <div style={{ ...label, marginTop: 20 }}>Štítky</div>
        <div style={cardBox}>
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
                placeholder="Štítek…" style={{ padding: '8px 13px', borderRadius: 999, border: '1px solid ' + T.primary, outline: 'none', fontFamily: T.fontUI, fontSize: 13.5, color: T.ink, width: 120 }} />
            )}
          </div>
          {suggest.length > 0 && tags.length < MAXTAGS && (
            <>
              <div style={{ height: 1, background: T.border, margin: '14px 0' }} />
              <div style={{ fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600, color: T.muted, marginBottom: 10 }}>Nejčastěji hledané</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {suggest.map(t => <button key={t} onClick={() => addTag(t)} style={{ padding: '8px 13px', borderRadius: 999, background: T.surfaceAlt, border: '1px solid ' + T.border, color: T.ink, fontFamily: T.fontHead, fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>{t}</button>)}
              </div>
            </>
          )}
        </div>
        <div style={hint}>Nejvýš pět štítků. Podle nich tě lidé najdou ve vyhledávání.</div>

        {/* Náhled */}
        <div style={{ ...label, marginTop: 20 }}>Náhled</div>
        <div style={cardBox}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 48, height: 48, flex: 'none', borderRadius: 999, background: T.heroGrad, color: '#fff', display: 'grid', placeItems: 'center', fontFamily: T.fontHead, fontWeight: 800, fontSize: 16 }}>{_pInitials(name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{_pShort(name)}</span>
                  {verified && (typeof WVerifiedBadge === 'function' ? <WVerifiedBadge size={14} /> : <Icon name="verified-check-bold" size={13} color={T.primary} />)}
                </span>
                {rating > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T.fontHead, fontSize: 13, fontWeight: 800, color: T.ink }}><WStar size={13} color={T.super} />{rating.toFixed(1).replace('.', ',')}</span>}
              </div>
              <div style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.muted, marginTop: 1 }}>{city || 'Tvé město'}</div>
              <div style={{ fontFamily: T.fontUI, fontSize: 13, color: T.ink, marginTop: 6, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{offer || 'Sem přijde tvoje nabídka…'}</div>
              {(priceStr || tags.length > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {priceStr && <span style={{ fontFamily: T.fontHead, fontSize: 11.5, fontWeight: 800, color: T.primary, background: T.tint, padding: '5px 10px', borderRadius: 999 }}>{priceStr}</span>}
                  {tags.slice(0, 1).map((t, i) => <span key={i} style={{ fontFamily: T.fontUI, fontSize: 11, fontWeight: 700, color: T.primary, background: T.tint, padding: '5px 9px', borderRadius: 999 }}>{t}</span>)}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={hint}>Takhle tě uvidí ostatní v tržišti. Odměnu, dostupnost i „O mně" uvidí po otevření tvé karty.</div>

        {/* Info */}
        <div style={{ ...cardBox, display: 'flex', alignItems: 'flex-start', gap: 11, marginTop: 16, background: T.surfaceAlt, borderColor: 'transparent' }}>
          <span style={{ flex: 'none', display: 'flex', marginTop: 1 }}><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.2" fill="none" stroke={T.primary} strokeWidth="1.5" /><path d="M9 8.4v4" stroke={T.primary} strokeWidth="1.6" strokeLinecap="round" /><circle cx="9" cy="5.7" r="0.9" fill={T.primary} /></svg></span>
          <span style={{ fontFamily: T.fontUI, fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>Jméno, fotka, město a hodnocení se berou z tvého profilu. Uprav je v Profilu.</span>
        </div>
      </div>
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
  const [detailPerson, setDetailPerson] = useStateW(null);
  const [info, setInfo] = useStateW(null);               // { title, text }
  const [showCard, setShowCard] = useStateW(false);      // editor „Moje karta"
  const scrollRef = useRefW(null);
  const lastY = useRefW(0);
  const headRef = useRefW(null);
  const [headHidden, setHeadHidden] = useStateW(false);  // auto-schování vršku při scrollu dolů
  const accum = useRefW(0);       // naakumulovaná dráha v aktuálním směru (hystereze proti kmitání)
  const [headH, setHeadH] = useStateW(null);             // přesná výška overlaye (kvůli odsazení mřížky)

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
      if (c.key === 'ostatni') return -1;
      const trefa = (c.kw && c.kw.some(k => k.includes(q) || q.includes(k))) || _pNorm(c.label).includes(q);
      return trefa ? 2 : 0;
    };
    return skore(b) - skore(a);
  });
  let filtered = people.filter(p => {
    const hay = _pNorm([p.name, p.card_offer, (p.card_tags || []).join(' '), (p.skills || []).join(' '), p.city].filter(Boolean).join(' '));
    if (q && !hay.includes(q)) return false;
    if (cat === 'ostatni') {
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
                const isRemesla = c.key === 'remesla';
                const isUklid = c.key === 'uklid';
                const isDoucovani = c.key === 'doucovani';
                const isZahrada = c.key === 'zahrada';
                return (
                  <button key={c.key} onClick={() => { setCat(c.key); setKatAnim(n => n + 1); if (isVse) setGlobeSpin(s => s + 1); if (isRemesla) setDrillSpin(s => s + 1); if (isUklid) setBroomSpin(s => s + 1); if (isDoucovani) setBookSpin(s => s + 1); if (isZahrada) setSproutSpin(s => s + 1); }} style={{
                    flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    border: '1.5px solid ' + (on ? 'rgba(11,18,51,0.9)' : 'transparent'),
                    background: on ? '#fff' : 'transparent', padding: '7px 13px', borderRadius: 16,
                    cursor: 'pointer', WebkitTapHighlightColor: 'transparent', minWidth: 62,
                  }}>
                    {isVse
                      ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WGlobeIcon size={24} spinKey={globeSpin} /></span>
                      : isRemesla
                        ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WDrillIcon size={26} spinKey={drillSpin} /></span>
                        : isUklid
                          ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WBroomIcon size={26} spinKey={broomSpin} /></span>
                          : isDoucovani
                            ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WBookIcon size={28} spinKey={bookSpin} /></span>
                            : isZahrada
                              ? <span style={{ display: 'inline-flex', height: 24, alignItems: 'center' }}><WSproutIcon size={28} spinKey={sproutSpin} /></span>
                              : <span key={on ? 'a' + katAnim : 'i'} style={{ fontSize: 23, lineHeight: 1, display: 'inline-block', transformOrigin: meta[1] === 'sweep' ? '72% 24%' : 'center', animation: on ? _P_ANIM[meta[1]] : 'none' }}>{meta[0]}</span>}
                    <span style={{ fontFamily: T.fontUI, fontSize: 11.5, fontWeight: on ? 800 : 600, color: on ? T.ink : T.muted, whiteSpace: 'nowrap' }}>{c.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ fontFamily: T.fontUI, fontSize: 13, fontWeight: 600, color: T.muted, marginTop: 12 }}>{loading ? 'Hledáme lidi v okolí…' : filtered.length + ' ' + _wPlural(filtered.length, 'člověk v okolí', 'lidé v okolí', 'lidí v okolí')}</div>
        </div>

        {/* Mřížka lidí — pod overlayem; odsazená o jeho výšku (headH). */}
        <div ref={scrollRef} onScroll={onGridScroll} style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '0 16px calc(84px + env(safe-area-inset-bottom))', paddingTop: headH == null ? 140 : headH }} aria-busy={loading ? 'true' : 'false'}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => <WPersonSkeleton key={i} />)}
          </div>
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

      {detailPerson && <WPersonDetail person={detailPerson} onClose={() => setDetailPerson(null)} onContact={contact} />}
      {info && <WPeopleInfo title={info.title} text={info.text} onClose={() => setInfo(null)} />}
      {showCard && <WMyCard onClose={() => setShowCard(false)} />}
    </div>
  );
}

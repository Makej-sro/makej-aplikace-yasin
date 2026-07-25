// Makej Worker — Messages (chat)

// Ikona z PNG obarvená maskou — obrázky jsou černé na průhledném, takže
// se z nich bere jen tvar a barva se dá měnit jedním parametrem.
function WIkonaPng({ src, size, color }) {
  const s = size || 19;
  return (
    <span style={{
      width: s, height: s, display: 'block',
      background: color || '#fff',
      WebkitMaskImage: `url(icons/${src})`, maskImage: `url(icons/${src})`,
      WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center', maskPosition: 'center',
      WebkitMaskSize: 'contain', maskSize: 'contain',
    }} />
  );
}

// Fotka v bublině. Bucket je neveřejný, takže se adresa musí nejdřív podepsat —
// než se podpis vrátí, drží místo šedý obdélník, ať zpráva neposkakuje.
function WPrilohaFotka({ priloha, nahravam, chyba, onOtevri }) {
  const [url, setUrl] = useStateW(priloha.nahled || null);

  useEffectW(() => {
    if (priloha.nahled) { setUrl(priloha.nahled); return; }
    if (!priloha.cesta) return;
    let zivy = true;
    wOdkazPrilohy(priloha.cesta).then(u => { if (zivy) setUrl(u); });
    return () => { zivy = false; };
  }, [priloha.cesta, priloha.nahled]);

  return (
    <div
      onClick={() => url && !nahravam && onOtevri && onOtevri(url)}
      style={{
        position: 'relative', width: 220, maxWidth: '100%',
        minHeight: url ? 0 : 150,
        borderRadius: 18, overflow: 'hidden', background: T.surfaceAlt,
        border: '1px solid ' + T.border,
        cursor: url && !nahravam ? 'zoom-in' : 'default',
      }}>
      {url && (
        <img src={url} alt={priloha.nazev || 'Fotka'} style={{
          display: 'block', width: '100%', height: 'auto',
          opacity: nahravam ? 0.55 : 1, transition: 'opacity .25s',
        }} />
      )}
      {nahravam && (
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          background: 'rgba(255,255,255,0.35)',
        }}>
          <span style={{
            width: 26, height: 26, borderRadius: 999,
            border: '2.5px solid rgba(255,255,255,0.7)', borderTopColor: T.primary,
            animation: 'wSpin .7s linear infinite',
          }} />
        </div>
      )}
      {chyba && (
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 12,
          background: 'rgba(255,255,255,0.9)', color: T.destructive,
          fontFamily: T.fontUI, fontSize: 12, fontWeight: 700, textAlign: 'center',
        }}>{chyba}</div>
      )}
    </div>
  );
}

// Ostatní přílohy (dokumenty) — zatím se neposílají, ale kdyby dorazily
// z firemního dashboardu, ať se neztratí a jdou stáhnout.
function WPrilohaSoubor({ priloha }) {
  async function stahni() {
    const url = await wOdkazPrilohy(priloha.cesta);
    if (url) window.open(url, '_blank', 'noopener');
  }
  return (
    <button onClick={stahni} style={{
      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
      padding: '11px 14px', borderRadius: 14, cursor: 'pointer',
      background: '#fff', border: '1px solid ' + T.border, maxWidth: 240,
    }}>
      <WIkonaPng src="attachment.png" size={18} color={T.primary} />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', color: T.ink, fontFamily: T.fontUI, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{priloha.nazev}</span>
        {priloha.velikost > 0 && <span style={{ display: 'block', color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11 }}>{wVelikostPrilohy(priloha.velikost)}</span>}
      </span>
    </button>
  );
}

// Fotka přes celou obrazovku po klepnutí
function WLupa({ url, onClose }) {
  useEffectW(() => {
    const esc = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 160, background: 'rgba(0,0,0,0.92)',
      display: 'grid', placeItems: 'center', padding: 16, cursor: 'zoom-out',
      animation: 'wPop .2s ease',
    }}>
      <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 10 }} />
    </div>
  );
}

// ── Hlasovky ───────────────────────────────────────────────────
// Ikony přehrávače kreslíme jako SVG, ať nemusíme přidávat další PNG.
function WIkonaPlay({ color }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" style={{ display: 'block', marginLeft: 2 }}>
      <path d="M7 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 7 5.5z" fill={color} />
    </svg>
  );
}
function WIkonaPauza({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: 'block' }}>
      <rect x="6" y="5" width="4" height="14" rx="1.4" fill={color} />
      <rect x="14" y="5" width="4" height="14" rx="1.4" fill={color} />
    </svg>
  );
}
function WIkonaKos({ color }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M4 7h16" />
      <path d="M10 4h4M9 7l.7 12.1a1 1 0 0 0 1 .9h2.6a1 1 0 0 0 1-.9L16 7" />
    </svg>
  );
}

function _wFmtDelka(s) {
  s = Math.max(0, Math.round(s || 0));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return m + ':' + (ss < 10 ? '0' + ss : ss);
}

// Vybere formát, který zvládne nahrávat prohlížeč v telefonu.
// Safari na iPhonu umí jen mp4/aac, Chrome/Android webm/opus.
function _wVyberMime() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  const kandidati = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus'];
  for (let i = 0; i < kandidati.length; i++) if (MediaRecorder.isTypeSupported(kandidati[i])) return kandidati[i];
  return '';
}

// Ustálené sloupečky waveformu pro hotovou nahrávku. Nepočítáme skutečnou
// hlasitost (to by znamenalo stahovat a dekódovat zvuk) — jen z pevného
// semínka vyrobíme stále stejný „hlasovkový" vzhled, ať to nepoblikává.
function _wVlnka(seed, pocet) {
  const s = String(seed || 'x');
  let x = 0;
  for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) % 2147483647;
  x = x || 1;
  const out = [];
  for (let i = 0; i < pocet; i++) {
    x = (x * 48271) % 2147483647;
    out.push(0.22 + (x % 1000) / 1000 * 0.78);   // 0.22 .. 1.0
  }
  return out;
}

// Hláška po zamítnutém mikrofonu — porovnává se v UI, ať se u ní ukáže
// tlačítko do nastavení. Proto je to konstanta, ne jen text na místě.
const W_CHYBA_MIKROFON = 'Bez přístupu k mikrofonu to nahrát nejde — povol ho níž.';

// Běžíme uvnitř nativní appky (Capacitor), nebo jen v prohlížeči?
function _wJeNativni() {
  try {
    const c = window.Capacitor;
    return !!(c && (c.isNativePlatform ? c.isNativePlatform() : c.isNative));
  } catch (e) { return false; }
}

// Prohlížeč rozliší, ať postup na povolení sedí na to, co člověk vidí.
function _wProhlizec() {
  const ua = navigator.userAgent || '';
  if (/CriOS/i.test(ua)) return 'chrome-ios';                       // Chrome na iPhonu
  if (/Android/i.test(ua) && /Chrome/i.test(ua)) return 'chrome-android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'safari-ios';
  return 'jiny';
}

// Kroky, jak mikrofon povolit u dané stránky přímo v prohlížeči.
// (Do Nastavení telefonu web skočit nesmí — a povolení pro web tam ani není.)
function _wPostupMik() {
  switch (_wProhlizec()) {
    case 'chrome-android': return [
      'Vlevo od adresy nahoře klepni na ikonku zámku (nebo posuvníků).',
      'Ťukni na „Oprávnění" a pak na „Mikrofon".',
      'Přepni na „Povolit".',
      'Vrať se sem, obnov stránku a znovu podrž mikrofon.',
    ];
    case 'safari-ios': return [
      'Nahoře v Safari klepni na „ᴬA" vlevo od adresy.',
      'Vyber „Nastavení webu" a u „Mikrofon" dej „Povolit".',
      'Obnov stránku a znovu podrž mikrofon.',
    ];
    case 'chrome-ios': return [
      'Chrome na iPhonu mikrofon pro weby spolehlivě neumí.',
      'Klepni na „•••" (nebo Sdílet) a dej „Otevřít v Safari".',
      'V Safari pak podrž mikrofon a povolení odsouhlas.',
    ];
    default: return [
      'V liště prohlížeče klepni na ikonku zámku vlevo od adresy.',
      'Najdi „Mikrofon" a přepni na „Povolit".',
      'Obnov stránku a znovu podrž mikrofon.',
    ];
  }
}

// Nahrávání hlasovky: mikrofon, živé úrovně hlasitosti a čas.
// Stavy: idle → (podrž) nahravam → (pusť) nahled → (odeslat/zahodit) idle
function useHlasovka(onChyba) {
  const [stav,    setStav]    = useStateW('idle');
  const [sekundy, setSekundy] = useStateW(0);
  const [urovne,  setUrovne]  = useStateW([]);
  const [nahled,  setNahled]  = useStateW(null);   // { url, delka }
  const d = useRefW({});

  function uklid() {
    const x = d.current;
    if (x.timer)    { clearInterval(x.timer); x.timer = null; }
    if (x.stream)   { x.stream.getTracks().forEach(t => t.stop()); x.stream = null; }
    if (x.audioCtx) { try { x.audioCtx.close(); } catch (e) {} x.audioCtx = null; }
    x.analyser = null; x.buf = null; x.rec = null;
  }

  async function start() {
    const x = d.current;
    x.zrusenoPredStartem = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      onChyba && onChyba('Tvůj telefon zatím neumí nahrávat zvuk.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      onChyba && onChyba((e && e.name === 'NotAllowedError')
        ? W_CHYBA_MIKROFON
        : 'Mikrofon se nepodařilo zapnout.');
      return;
    }
    // Uživatel mohl pustit tlačítko dřív, než dorazilo povolení → nezačínej
    if (x.zrusenoPredStartem) { stream.getTracks().forEach(t => t.stop()); return; }

    x.stream = stream;
    x.chunks = [];
    const mime = _wVyberMime();
    try { x.rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); }
    catch (e) { x.rec = new MediaRecorder(stream); }

    x.rec.ondataavailable = e => { if (e.data && e.data.size) x.chunks.push(e.data); };
    x.rec.onstop = () => {
      const blob  = new Blob(x.chunks, { type: (x.rec && x.rec.mimeType) || 'audio/webm' });
      const delka = Math.max(0, (Date.now() - x.startTs) / 1000);
      uklid();
      // Zrušené, prázdné nebo omylem cvaknuté (moc krátké) → zahoď
      if (x.cancelled || !blob.size || delka < 0.7) {
        if (x.url) { URL.revokeObjectURL(x.url); x.url = null; }
        x.blob = null; x.delka = 0;
        setStav('idle'); setUrovne([]); setSekundy(0); setNahled(null);
        if (!x.cancelled && delka < 0.7) onChyba && onChyba('Podrž mikrofon déle pro nahrání.');
        return;
      }
      x.blob = blob; x.delka = delka; x.url = URL.createObjectURL(blob);
      setNahled({ url: x.url, delka: delka });
      setStav('nahled');
    };

    // Živé úrovně přes AnalyserNode — bez něj to nahraje taky, jen bez vizualizace
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      x.audioCtx = new AC();
      // iOS startuje kontext uspaný — bez resume by úrovně byly ploché
      if (x.audioCtx.resume) x.audioCtx.resume().catch(() => {});
      const src = x.audioCtx.createMediaStreamSource(stream);
      x.analyser = x.audioCtx.createAnalyser();
      x.analyser.fftSize = 256;
      src.connect(x.analyser);
      x.buf = new Uint8Array(x.analyser.frequencyBinCount);
    } catch (e) { x.analyser = null; }

    x.cancelled = false;
    x.startTs = Date.now();
    try { x.rec.start(); }
    catch (e) { uklid(); onChyba && onChyba('Nahrávání se nepodařilo spustit.'); return; }
    setUrovne([]); setSekundy(0); setNahled(null); setStav('nahravam');

    x.timer = setInterval(() => {
      let uroven = 0;
      if (x.analyser && x.buf) {
        x.analyser.getByteTimeDomainData(x.buf);
        let sum = 0;
        for (let i = 0; i < x.buf.length; i++) { const v = (x.buf[i] - 128) / 128; sum += v * v; }
        uroven = Math.min(1, Math.sqrt(sum / x.buf.length) * 3.6);
      }
      setUrovne(prev => { const n = prev.concat(uroven); return n.length > 44 ? n.slice(n.length - 44) : n; });
      setSekundy((Date.now() - x.startTs) / 1000);
    }, 90);
  }

  // Pustil tlačítko → dokonči nahrávku (spadne do náhledu)
  function stop() {
    const x = d.current;
    if (x.rec && x.rec.state !== 'inactive') { x.cancelled = false; x.rec.stop(); }
    else { x.zrusenoPredStartem = true; }   // stream ještě nedorazil
  }

  // Koš — zahoď nahrávku (funguje během nahrávání i v náhledu)
  function zrus() {
    const x = d.current;
    if (x.rec && x.rec.state !== 'inactive') { x.cancelled = true; x.rec.stop(); return; }
    if (x.url) { URL.revokeObjectURL(x.url); x.url = null; }
    x.blob = null; x.delka = 0;
    uklid();
    setStav('idle'); setUrovne([]); setSekundy(0); setNahled(null);
  }

  // Odeber hotovou nahrávku k odeslání a vrať se do klidu.
  // Adresu (url) přebírá volající — ať ji po odeslání uklidí sám.
  function vezmi() {
    const x = d.current;
    const out = { blob: x.blob, delka: x.delka, url: x.url };
    x.blob = null; x.delka = 0; x.url = null;
    setStav('idle'); setUrovne([]); setSekundy(0); setNahled(null);
    return out;
  }

  useEffectW(() => () => { const x = d.current; if (x.url) URL.revokeObjectURL(x.url); uklid(); }, []);

  return { stav, sekundy, urovne, nahled, start, stop, zrus, vezmi };
}

// Živý waveform během nahrávání — sloupečky rostou podle hlasitosti
// a odsouvají se doleva, jak přibývají nové.
function WMicVlny({ urovne }) {
  const POCET = 44;
  const chybi = Math.max(0, POCET - urovne.length);
  const bary = [];
  for (let i = 0; i < chybi; i++) bary.push(0.03);
  for (let i = 0; i < urovne.length; i++) bary.push(urovne[i]);
  return (
    <div style={{ flex: 1, minWidth: 0, height: 30, display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden' }}>
      {bary.map((v, i) => (
        <span key={i} style={{
          flex: 1, minWidth: 2, maxWidth: 5,
          height: Math.max(3, Math.round(v * 28)),
          borderRadius: 3, background: T.primary,
          opacity: 0.3 + v * 0.7, transition: 'height .08s linear',
        }} />
      ))}
    </div>
  );
}

// Hlasovka v bublině (a v kompaktní podobě i v náhledu před odesláním).
// Bucket je neveřejný → adresa se musí nejdřív podepsat; než podpis přijde,
// drží místo spinner na tlačítku play.
function WPrilohaHlasovka({ priloha, mine, nahravam, kompakt }) {
  const [url,    setUrl]    = useStateW(priloha.nahled || null);
  const [hraje,  setHraje]  = useStateW(false);
  const [pozice, setPozice] = useStateW(0);   // 0..1
  const audioRef = useRefW(null);

  useEffectW(() => {
    if (priloha.nahled) { setUrl(priloha.nahled); return; }
    if (!priloha.cesta) return;
    let zivy = true;
    wOdkazPrilohy(priloha.cesta).then(u => { if (zivy) setUrl(u); });
    return () => { zivy = false; };
  }, [priloha.cesta, priloha.nahled]);

  const delka = priloha.delka || 0;
  const vlnka = React.useMemo(() => _wVlnka(priloha.cesta || ('d' + delka), 30), [priloha.cesta, delka]);

  function prehraj() {
    const a = audioRef.current;
    if (!a || !url) return;
    if (hraje) { a.pause(); return; }
    a.play().catch(() => {});
  }
  function seek(e) {
    const a = audioRef.current;
    if (!a || !url) return;
    const r = e.currentTarget.getBoundingClientRect();
    const pomer = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const dd = (a.duration && isFinite(a.duration) && a.duration > 0) ? a.duration : delka;
    if (dd) { try { a.currentTime = pomer * dd; setPozice(pomer); } catch (err) {} }
  }

  const popredi = mine ? '#fff' : T.primary;
  const klid    = mine ? 'rgba(255,255,255,0.42)' : 'rgba(0,32,246,0.20)';
  const cas     = (hraje || pozice > 0) ? (delka * pozice) : delka;

  return (
    <div style={kompakt ? {
      display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, padding: '2px 4px',
    } : {
      display: 'flex', alignItems: 'center', gap: 11, width: 244, maxWidth: '100%',
      padding: '10px 14px', borderRadius: 18,
      background: mine ? T.primary : '#fff',
      border: mine ? 'none' : '1px solid ' + T.border,
      boxShadow: mine ? '0 6px 16px rgba(0,32,246,0.22)' : '0 2px 8px rgba(20,22,40,0.05)',
      borderBottomRightRadius: mine ? 5 : 18,
      borderBottomLeftRadius: mine ? 18 : 5,
      opacity: nahravam ? 0.7 : 1,
    }}>
      <button onClick={prehraj} disabled={!url} title={hraje ? 'Pauza' : 'Přehrát'} style={{
        width: 38, height: 38, borderRadius: 999, flexShrink: 0, border: 'none', padding: 0,
        cursor: url ? 'pointer' : 'default', display: 'grid', placeItems: 'center',
        background: mine ? '#fff' : T.primary, WebkitTapHighlightColor: 'transparent',
      }}>
        {!url
          ? <span style={{ width: 16, height: 16, borderRadius: 999,
              border: '2px solid ' + (mine ? 'rgba(0,32,246,0.25)' : 'rgba(255,255,255,0.5)'),
              borderTopColor: mine ? T.primary : '#fff', animation: 'wSpin .7s linear infinite' }} />
          : hraje ? <WIkonaPauza color={mine ? T.primary : '#fff'} />
                  : <WIkonaPlay  color={mine ? T.primary : '#fff'} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div onClick={seek} style={{ height: 26, display: 'flex', alignItems: 'center', gap: 2, cursor: url ? 'pointer' : 'default' }}>
          {vlnka.map((v, i) => {
            const hotovo = (i + 0.5) / vlnka.length <= pozice;
            return <span key={i} style={{
              flex: 1, minWidth: 2, maxWidth: 4,
              height: Math.max(3, Math.round(v * 24)),
              borderRadius: 2, background: hotovo ? popredi : klid, transition: 'background .12s',
            }} />;
          })}
        </div>
        <div style={{ marginTop: 3, fontFamily: T.fontUI, fontSize: 11, fontWeight: 600,
          fontVariantNumeric: 'tabular-nums', color: mine ? 'rgba(255,255,255,0.85)' : T.mutedSoft }}>
          {_wFmtDelka(cas)}
        </div>
      </div>

      <audio ref={audioRef} src={url || undefined} preload="metadata"
        onPlay={() => setHraje(true)}
        onPause={() => setHraje(false)}
        onEnded={() => { setHraje(false); setPozice(0); }}
        onTimeUpdate={e => {
          const a = e.currentTarget;
          const dd = (a.duration && isFinite(a.duration) && a.duration > 0) ? a.duration : delka;
          if (dd) setPozice(Math.min(1, a.currentTime / dd));
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
}

function WMessages({ tick, chatTarget, onChatOpened, onGoJobs, onThreadOpen, onRead }) {
  const [threads,  setThreads]  = useStateW(() => [...W_THREADS]);
  // Na mobilu začínáme seznamem — vlákno se otevře až po kliknutí (nebo přes chatTarget)
  const [active,   setActive]   = useStateW(null);

  // Otevři konkrétní vlákno na požádání (z detailu brigády)
  useEffectW(() => {
    if (chatTarget) {
      setActive(chatTarget);
      onChatOpened && onChatOpened();
    }
  }, [chatTarget]);
  const [msgInput, setMsgInput] = useStateW('');
  const [sending,  setSending]  = useStateW(false);
  const [q,        setQ]        = useStateW('');
  const [confirmShift, setConfirmShift] = useStateW(null); // { shift }
  const [lupa,     setLupa]     = useStateW(null);          // fotka přes celou obrazovku
  const [chybaPrilohy, setChybaPrilohy] = useStateW('');
  const [ukazPostup,   setUkazPostup]   = useStateW(false); // rozbalený návod na povolení mikrofonu
  const hlas = useHlasovka(setChybaPrilohy);               // nahrávání hlasovky
  const souborInput = useRefW(null);
  const scrollRef = useRefW(null);
  const userId    = useRefW(null);
  const activeRef = useRefW(active);

  useEffectW(() => { activeRef.current = active; }, [active]);

  // Přečteno je jen to, co má člověk opravdu otevřené — ne celá záložka.
  // Otevření vlákna označí jeho oznámení na serveru za přečtená, takže tučné
  // zmizí natrvalo (přežije refresh i jiný telefon). Běží jen když vlákno
  // vážně nějaké nepřečtené má, ať se to nevolá zbytečně při každém otevření.
  useEffectW(() => {
    if (!active || !userId.current) return;
    const t = threads.find(x => x.id === active);
    if (!t || !t.unread) return;
    setThreads(prev => prev.map(x => x.id === active ? { ...x, unread: 0 } : x));
    markThreadReadW(userId.current, active).then(ids => onRead && onRead(active, ids));
  }, [active, threads]);

  // Otevřený chat schová spodní nav bar — jinak leží přes psací pole.
  // Při odchodu ze Zpráv ho vždy vrať, i když vlákno zůstalo otevřené.
  useEffectW(() => {
    onThreadOpen && onThreadOpen(!!active);
    return () => { onThreadOpen && onThreadOpen(false); };
  }, [active]);

  // Sync threads when tick changes (new data loaded)
  useEffectW(() => {
    setThreads([...W_THREADS]);
  }, [tick]);

  useEffectW(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      userId.current = session?.user?.id || null;
    });
  }, []);

  // Auto-scroll
  useEffectW(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [active, threads]);

  // Global subscription — sidebar preview updates
  useEffectW(() => {
    const chan = sb.channel('w-msgs-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new;
        const preview = msg.file_url ? wNahledPrilohy(msg)
          : msg.type === 'shift_offer' ? 'Nabídka směny'
          : msg.type === 'interview_offer' ? 'Pozvánka na pohovor' : msg.text;
        setThreads(prev => prev.map(t => {
          if (t.id !== msg.match_id) return t;
          const isMine = msg.sender_id === userId.current;
          if (t.id === activeRef.current) return { ...t, last: preview };
          return { ...t, last: preview, unread: isMine ? t.unread : (t.unread || 0) + 1 };
        }));
      })
      .subscribe();
    return () => { try { sb.removeChannel(chan); } catch (e) {} };
  }, []);

  // Per-thread subscription for active thread
  useEffectW(() => {
    if (!active) return;
    const chan = sb.channel('w-thread-' + active)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: 'match_id=eq.' + active,
      }, (payload) => {
        const msg = payload.new;
        setThreads(prev => prev.map(t => {
          if (t.id !== active) return t;
          if (t.msgs.some(m => m.id === msg.id)) return t;
          const from = msg.sender_id === userId.current ? 'me' : 'them';
          const isShift = msg.type === 'shift_offer' && msg.metadata;
          const isInterview = msg.type === 'interview_offer' && msg.metadata;
          const jePriloha = !!msg.file_url;
          const newMsg = jePriloha
            ? { from, kind: 'file', file: _wPrilohaZRadku(msg), t: _wFmtTime(msg.created_at), ts: msg.created_at, id: msg.id }
            : isShift
            ? { from, kind: 'shift', shift: msg.metadata, t: _wFmtTime(msg.created_at), ts: msg.created_at, id: msg.id }
            : isInterview
            ? { from, kind: 'interview', interview: msg.metadata, t: _wFmtTime(msg.created_at), ts: msg.created_at, id: msg.id }
            : { from, text: msg.text, t: _wFmtTime(msg.created_at), ts: msg.created_at, id: msg.id };
          return {
            ...t,
            last: jePriloha ? wNahledPrilohy(msg) : isShift ? 'Nabídka směny' : isInterview ? 'Pozvánka na pohovor' : msg.text,
            msgs: [...t.msgs, newMsg],
          };
        }));
      })
      .subscribe();
    return () => { try { sb.removeChannel(chan); } catch (e) {} };
  }, [active]);

  async function handleSend() {
    const text = msgInput.trim();
    if (!text || !active || !userId.current || sending) return;
    setMsgInput('');
    setSending(true);
    const tempId = 'tmp-' + Date.now();
    setThreads(prev => prev.map(t => t.id !== active ? t : {
      ...t, last: text,
      msgs: [...t.msgs, { from: 'me', text, t: _wFmtTime(new Date().toISOString()), id: tempId }],
    }));
    const { data } = await sb.from('messages').insert({
      match_id: active, sender_id: userId.current, text,
    }).select().single();
    if (data) {
      setThreads(prev => prev.map(t => t.id !== active ? t : {
        ...t, msgs: t.msgs.map(m => m.id === tempId ? { ...m, id: data.id, t: _wFmtTime(data.created_at), ts: data.created_at } : m),
      }));
    }
    setSending(false);
  }

  // Fotka se ukáže v chatu hned z paměti telefonu a teprve pak putuje na server.
  // Kdyby nahrání selhalo, bublina zmizí a důvod se napíše nad psacím polem —
  // tiché zmizení fotky by vypadalo, že se odeslala.
  async function handleFotka(file) {
    if (!file || !active || !userId.current) return;
    setChybaPrilohy('');
    const tempId = 'tmp-img-' + Date.now();
    const nahled = URL.createObjectURL(file);
    const docasna = {
      from: 'me', kind: 'file', nahravam: true, id: tempId,
      file: { typ: 'image', nahled, nazev: file.name, velikost: file.size },
      t: _wFmtTime(new Date().toISOString()),
    };
    setThreads(prev => prev.map(t => t.id !== active ? t : {
      ...t, last: 'Fotka', msgs: [...t.msgs, docasna],
    }));

    const vysledek = await wPosliPrilohu(active, userId.current, file);

    if (!vysledek.ok) {
      URL.revokeObjectURL(nahled);
      setThreads(prev => prev.map(t => t.id !== active ? t : {
        ...t, msgs: t.msgs.filter(m => m.id !== tempId),
      }));
      setChybaPrilohy(vysledek.error);
      return;
    }

    const z = vysledek.zprava;
    setThreads(prev => prev.map(t => t.id !== active ? t : {
      ...t,
      // Realtime odběr může tutéž zprávu přinést dřív — ať tu není dvakrát
      msgs: t.msgs.some(m => m.id === z.id)
        ? t.msgs.filter(m => m.id !== tempId)
        : t.msgs.map(m => m.id !== tempId ? m : {
            ...m, id: z.id, nahravam: false, ts: z.created_at,
            t: _wFmtTime(z.created_at),
            // Náhled z telefonu si necháme — je po ruce a ušetří stahování
            file: { ..._wPrilohaZRadku(z), nahled },
          }),
    }));
  }

  // Podržení mikrofonu = nahrávej. Puštění posluchač na okně zachytí, i když
  // se prst mezitím sesune mimo tlačítko (to během nahrávání zmizí).
  // V hotové (nativní) appce skočí rovnou do nastavení appky s přepínačem
  // mikrofonu. V prohlížeči to iOS/Android webu nedovolí — a povolení pro web
  // stejně není v Nastavení telefonu, ale v prohlížeči — tak ukážeme postup.
  function otevriNastaveni() {
    if (_wJeNativni()) {
      try { window.location.href = 'app-settings:'; return; } catch (e) {}
    }
    setUkazPostup(true);
  }

  function drzMikrofon(e) {
    if (e && e.cancelable) e.preventDefault();
    if (!active || !userId.current) return;
    setChybaPrilohy(''); setUkazPostup(false);
    hlas.start();
    const pust = () => {
      hlas.stop();
      window.removeEventListener('pointerup', pust);
      window.removeEventListener('pointercancel', pust);
    };
    window.addEventListener('pointerup', pust);
    window.addEventListener('pointercancel', pust);
  }

  // Hlasovka se ukáže v chatu hned z paměti telefonu a teprve pak putuje na
  // server — stejně jako fotka. Když nahrání selže, bublina zmizí a důvod
  // se napíše nad psacím polem.
  async function handleHlasovka() {
    const { blob, delka, url } = hlas.vezmi();
    if (!blob || !active || !userId.current) return;
    setChybaPrilohy('');
    const tempId = 'tmp-aud-' + Date.now();
    const docasna = {
      from: 'me', kind: 'file', nahravam: true, id: tempId,
      file: { typ: 'audio', nahled: url, nazev: 'Hlasová zpráva', velikost: blob.size, delka: Math.round(delka) },
      t: _wFmtTime(new Date().toISOString()),
    };
    setThreads(prev => prev.map(t => t.id !== active ? t : {
      ...t, last: 'Hlasová zpráva', msgs: [...t.msgs, docasna],
    }));

    const vysledek = await wPosliHlasovku(active, userId.current, blob, delka);

    if (!vysledek.ok) {
      if (url) URL.revokeObjectURL(url);
      setThreads(prev => prev.map(t => t.id !== active ? t : {
        ...t, msgs: t.msgs.filter(m => m.id !== tempId),
      }));
      setChybaPrilohy(vysledek.error);
      return;
    }

    const z = vysledek.zprava;
    setThreads(prev => prev.map(t => t.id !== active ? t : {
      ...t,
      msgs: t.msgs.some(m => m.id === z.id)
        ? t.msgs.filter(m => m.id !== tempId)
        : t.msgs.map(m => m.id !== tempId ? m : {
            ...m, id: z.id, nahravam: false, ts: z.created_at, t: _wFmtTime(z.created_at),
            file: { ..._wPrilohaZRadku(z), nahled: url },
          }),
    }));
  }

  async function handleRespondToShift(response) {
    if (!active || !userId.current) return;
    const text = response === 'accepted'
      ? '✓ Přijímám nabídku směny!'
      : 'Bohužel tuto směnu nemohu přijmout.';
    const tempId = 'tmp-resp-' + Date.now();
    setThreads(prev => prev.map(t => t.id !== active ? t : {
      ...t, last: text,
      msgs: [...t.msgs, { from: 'me', text, t: _wFmtTime(new Date().toISOString()), id: tempId }],
    }));
    const { data } = await sb.from('messages').insert({
      match_id: active, sender_id: userId.current, text,
    }).select().single();
    if (data) {
      setThreads(prev => prev.map(t => t.id !== active ? t : {
        ...t, msgs: t.msgs.map(m => m.id === tempId ? { ...m, id: data.id, ts: data.created_at } : m),
      }));
    }
  }

  async function handleRespondToInterview(response) {
    if (!active || !userId.current) return;
    const text = response === 'accepted'
      ? '✓ Přijímám pozvánku na pohovor!'
      : 'Bohužel se pohovoru nemohu zúčastnit.';
    const tempId = 'tmp-int-resp-' + Date.now();
    setThreads(prev => prev.map(t => t.id !== active ? t : {
      ...t, last: text,
      msgs: [...t.msgs, { from: 'me', text, t: _wFmtTime(new Date().toISOString()), id: tempId }],
    }));
    const { data } = await sb.from('messages').insert({
      match_id: active, sender_id: userId.current, text,
    }).select().single();
    if (data) {
      setThreads(prev => prev.map(t => t.id !== active ? t : {
        ...t, msgs: t.msgs.map(m => m.id === tempId ? { ...m, id: data.id, ts: data.created_at } : m),
      }));
    }
  }

  const thread   = threads.find(t => t.id === active) || null;
  const totalUnread = threads.reduce((s, t) => s + (t.unread || 0), 0);
  const filtered = q.trim()
    ? threads.filter(t => (t.name + ' ' + (t.last || '')).toLowerCase().includes(q.trim().toLowerCase()))
    : threads;

  if (threads.length === 0) {
    // Nový účet. Místo prázdné plochy vysvětli, jak se sem chat dostane,
    // a nabídni cestu dál — sem se nikdo neproklikne omylem.
    const krok = { display: 'flex', gap: 12, alignItems: 'flex-start' };
    const cislo = {
      width: 24, height: 24, borderRadius: 999, flexShrink: 0,
      background: T.tint, color: T.primary, display: 'grid', placeItems: 'center',
      fontFamily: T.fontHead, fontSize: 12, fontWeight: 800,
    };
    return (
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 460, margin: '0 auto', width: '100%', padding: '24px 20px 40px' }}>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.6, marginBottom: 18 }}>Zprávy</div>

          <div style={{ background: '#fff', borderRadius: 22, padding: '22px 20px', boxShadow: '0 4px 20px rgba(0,32,246,0.06)' }}>
            <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 17, fontWeight: 800, marginBottom: 4 }}>
              Zatím tu nemáš žádnou konverzaci
            </div>
            <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.55, marginBottom: 20 }}>
              Chat se otevře sám, jakmile firmu zaujmeš. Psát jí předtím nemusíš.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'Projdi nabídky na záložce Práce a ty zajímavé posuň doprava.',
                'Firma uvidí tvůj profil a rozhodne se.',
                'Když tě přijme, objeví se tady chat a přijde ti upozornění.',
              ].map((t, i) => (
                <div key={i} style={krok}>
                  <span style={cislo}>{i + 1}</span>
                  <span style={{ flex: 1, color: T.inkSoft, fontFamily: T.fontUI, fontSize: 13.5, lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>

            {onGoJobs && (
              <button onClick={onGoJobs} style={{
                width: '100%', marginTop: 22, height: 50, borderRadius: 16,
                background: T.primary, color: '#fff', border: 'none', cursor: 'pointer',
                fontFamily: T.fontHead, fontSize: 15, fontWeight: 800,
                boxShadow: '0 14px 28px -14px rgba(0,32,246,0.55)',
              }}>Projít brigády</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

      {/* Seznam konverzací — na mobilu celá šířka (jeden panel) */}
      {!thread && (
      <aside style={{
        flex: 1, width: '100%', minWidth: 0,
        display: 'flex', flexDirection: 'column',
        background: 'transparent',
      }}>
        <div style={{ padding: '20px 18px 12px' }}>
          <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 26, fontWeight: 800, letterSpacing: -0.6, marginBottom: 14 }}>Zprávy</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 999, background: '#fff', border: '1px solid ' + T.border, boxShadow: '0 2px 8px rgba(20,22,40,0.05)' }}>
            <Icon name="magnifer-linear" size={16} color={T.mutedSoft} />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Hledat konverzaci"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: T.ink, fontFamily: T.fontUI, fontSize: 13.5 }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
          {filtered.map((t, idx) => {
            const unread = t.unread > 0;
            return (
              <div key={t.id}>
                {/* Řádek jako v iMessage: všechny stejné, nepřečtené pozná modrá
                    tečka vlevo — ne jiné pozadí, to seznam roztrhalo na kusy. */}
                {/* Značku přečtení posune efekt výš — tady stačí vlákno otevřít */}
                <button onClick={() => setActive(t.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 8px 11px 4px', textAlign: 'left', borderRadius: 16,
                  background: 'transparent', border: 'none', position: 'relative',
                  cursor: 'pointer', color: 'inherit', fontFamily: 'inherit',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 999, flexShrink: 0,
                    background: unread ? T.primary : 'transparent',
                  }} />
                  <div style={{
                    position: 'relative', overflow: 'hidden',
                    width: 52, height: 52, borderRadius: 999, background: t.color || T.avatarGrad,
                    display: 'grid', placeItems: 'center',
                    color: '#fff', fontFamily: T.fontHead, fontWeight: 700, fontSize: 17, flexShrink: 0,
                  }}>
                    <span>{t.avatar}</span>
                    {t.logoUrl && (
                      <img src={t.logoUrl} alt=""
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {t.online && <span style={{ position: 'absolute', bottom: 1, right: 1, width: 13, height: 13, borderRadius: 999, background: T.green, border: '2.5px solid #fff' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                        <span style={{ color: T.ink, fontFamily: T.fontUI, fontSize: 15, fontWeight: unread ? 800 : 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                        {t.verified && <Icon name="verified-check-bold" size={13} color={T.green} />}
                      </span>
                      <span style={{ color: unread ? T.primary : T.mutedSoft, fontFamily: T.fontUI, fontSize: 11.5, fontWeight: unread ? 700 : 500, flexShrink: 0 }}>{t.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, color: unread ? T.inkSoft : T.muted, fontSize: 13, fontFamily: T.fontUI, fontWeight: unread ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.last}</div>
                      {unread && (
                        <span style={{ minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999, background: T.primary, color: '#fff', fontSize: 10.5, fontWeight: 800, fontFamily: T.fontHead, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{t.unread}</span>
                      )}
                    </div>
                  </div>
                </button>
                {/* Dělicí linka pod každým řádkem kromě posledního, zarovnaná
                    pod text — jako v iMessage. Dřív u nepřečtených chyběla. */}
                {idx < filtered.length - 1 && (
                  <div style={{ height: 1, background: T.border, margin: '0 8px 0 76px' }} />
                )}
              </div>
            );
          })}
        </div>
      </aside>
      )}

      {/* Otevřené vlákno — na mobilu celá šířka + tlačítko zpět */}
      {thread && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Thread header */}
          <div style={{ padding: '14px 60px 14px 8px', borderBottom: '1px solid ' + T.border, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, background: '#fff' }}>
            <WZpet onClick={() => setActive(null)} title="Zpět na konverzace" />
            <button
              onClick={() => window.wOpenEmployer && window.wOpenEmployer(thread.employerId, { name: thread.name, color: thread.color, rating: thread.rating, verified: thread.verified })}
              title="Zobrazit profil firmy"
              style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'none', border: 'none', padding: 0, cursor: 'pointer', flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: T.avatarGrad, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: T.fontHead, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{thread.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 15.5, fontWeight: 800 }}>{thread.name}</span>
                  {thread.verified && <Icon name="verified-check-bold" size={14} color={T.green} />}
                  <Icon name="alt-arrow-right-bold" size={13} color={T.mutedSoft} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.muted, fontSize: 12.5, fontFamily: T.fontUI }}>
                  Zaměstnavatel
                  <span style={{ width: 4, height: 4, borderRadius: 999, background: T.mutedSoft }} />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: T.green }} /> online
                  </span>
                </div>
              </div>
            </button>
            {thread.rating > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 999, background: '#fff', border: '1px solid ' + T.border, boxShadow: '0 2px 8px rgba(20,22,40,0.06)', flexShrink: 0 }}>
                <Icon name="star-bold" size={14} color={T.super} />
                <span style={{ color: T.ink, fontFamily: T.fontHead, fontWeight: 800, fontSize: 14 }}>{thread.rating.toFixed(1).replace('.', ',')}</span>
              </div>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ textAlign: 'center', color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 12, fontWeight: 600, margin: '2px 0 6px' }}>Dnes</div>
            {thread.msgs.map((m, i) => {
              if (m.kind === 'shift') {
                const laterMsgs = thread.msgs.slice(i + 1);
                const responseMsg = laterMsgs.find(lm =>
                  lm.from === 'me' && (
                    lm.text === '✓ Přijímám nabídku směny!' ||
                    lm.text === 'Bohužel tuto směnu nemohu přijmout.'
                  )
                );
                const alreadyResponded = thread.confirmed
                  ? 'accepted'                                   // směna potvrzena (stav matche) — spolehlivé i po refetchi
                  : (responseMsg ? (responseMsg.text.includes('Přijímám') ? 'accepted' : 'rejected') : null);
                return (
                  <WShiftCard
                    key={m.id || i}
                    msg={m}
                    isMe={m.from === 'me'}
                    alreadyResponded={alreadyResponded}
                    onAccept={() => setConfirmShift({ shift: m.shift, company: thread.name })}
                    onReject={() => handleRespondToShift('rejected')}
                  />
                );
              }
              if (m.kind === 'interview') {
                const laterMsgs = thread.msgs.slice(i + 1);
                const responseMsg = laterMsgs.find(lm =>
                  lm.from === 'me' && (
                    lm.text === '✓ Přijímám pozvánku na pohovor!' ||
                    lm.text === 'Bohužel se pohovoru nemohu zúčastnit.'
                  )
                );
                const alreadyResponded = responseMsg ? (responseMsg.text.includes('Přijímám') ? 'accepted' : 'rejected') : null;
                return (
                  <WInterviewCard
                    key={m.id || i}
                    msg={m}
                    isMe={m.from === 'me'}
                    alreadyResponded={alreadyResponded}
                    onAccept={() => handleRespondToInterview('accepted')}
                    onReject={() => handleRespondToInterview('rejected')}
                  />
                );
              }
              const mine = m.from === 'me';
              if (m.kind === 'file') {
                // Příloha nemá bublinu — obrázek je sám o sobě dost výrazný
                return (
                  <div key={m.id || i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                    {m.file.typ === 'image'
                      ? <WPrilohaFotka priloha={m.file} nahravam={m.nahravam} onOtevri={setLupa} />
                      : m.file.typ === 'audio'
                      ? <WPrilohaHlasovka priloha={m.file} mine={mine} nahravam={m.nahravam} />
                      : <WPrilohaSoubor priloha={m.file} />}
                    <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, marginTop: 4, textAlign: mine ? 'right' : 'left' }}>
                      {m.nahravam ? 'Odesílám…' : m.t}
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id || i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '68%' }}>
                  <div style={{
                    padding: '12px 16px', borderRadius: 18,
                    background: mine ? T.primary : '#fff',
                    color: mine ? '#fff' : T.ink, fontFamily: T.fontUI, fontSize: 14, lineHeight: 1.45,
                    border: mine ? 'none' : '1px solid ' + T.border,
                    boxShadow: mine ? '0 6px 16px rgba(0,32,246,0.22)' : '0 2px 8px rgba(20,22,40,0.05)',
                    borderBottomRightRadius: mine ? 5 : 18,
                    borderBottomLeftRadius: mine ? 18 : 5,
                  }}>{m.text}</div>
                  <div style={{ color: T.mutedSoft, fontFamily: T.fontUI, fontSize: 11, marginTop: 4, textAlign: mine ? 'right' : 'left' }}>{m.t}</div>
                </div>
              );
            })}
          </div>

          {/* Psací pole — jeden oválek, uvnitř text i odesílací tlačítko (jako Instagram) */}
          <div style={{ padding: '10px 14px calc(12px + env(safe-area-inset-bottom))', borderTop: '1px solid ' + T.border, flexShrink: 0, background: '#fff' }}>
            {chybaPrilohy === W_CHYBA_MIKROFON ? (
              /* Zamítnutý mikrofon — hláška s tlačítkem do nastavení a návodem */
              <div style={{
                marginBottom: 8, padding: '12px 14px', borderRadius: 14,
                background: T.tint, border: '1px solid rgba(0,32,246,0.14)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <WIkonaPng src="voice.png" size={18} color={T.primary} />
                  <span style={{ flex: 1, color: T.ink, fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 700 }}>
                    Mikrofon je zakázaný. Povol ho a zkus to znovu.
                  </span>
                  <span onClick={() => { setChybaPrilohy(''); setUkazPostup(false); }} style={{
                    cursor: 'pointer', color: T.muted, fontFamily: T.fontUI, fontSize: 18, lineHeight: 1, padding: '0 2px',
                  }}>×</span>
                </div>
                <button onClick={otevriNastaveni} style={{
                  marginTop: 10, width: '100%', padding: '10px 14px', borderRadius: 999,
                  background: T.primary, color: '#fff', border: 'none', cursor: 'pointer',
                  fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 700,
                }}>
                  {_wJeNativni() ? 'Otevřít nastavení' : 'Jak mikrofon povolit'}
                </button>
                {ukazPostup && (
                  <ol style={{
                    margin: '12px 0 2px', paddingLeft: 20, color: T.ink,
                    fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 500, lineHeight: 1.55,
                  }}>
                    {_wPostupMik().map((krok, i) => <li key={i} style={{ marginBottom: 3 }}>{krok}</li>)}
                  </ol>
                )}
              </div>
            ) : chybaPrilohy ? (
              <div onClick={() => setChybaPrilohy('')} style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                padding: '9px 12px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(220,38,38,0.08)', color: T.destructive,
                fontFamily: T.fontUI, fontSize: 12.5, fontWeight: 600,
              }}>
                {chybaPrilohy}
              </div>
            ) : null}
            {/* Skrytý výběr souboru — sponka na něj jen klepne. `accept` pustí
                fotoaparát i galerii, na počítači obrázky ze složek. */}
            <input
              ref={souborInput}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files && e.target.files[0];
                e.target.value = '';        // ať jde stejná fotka poslat i podruhé
                if (f) handleFotka(f);
              }}
            />
            {hlas.stav === 'nahravam' ? (
              /* Nahrávání běží — místo psaní běží živý waveform podle hlasitosti a čas.
                 Puštění prstu (kdekoli) nahrávku dokončí a přepne do náhledu. */
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '6px 10px 6px 16px', borderRadius: 999,
                background: T.surfaceAlt, border: '1px solid ' + T.border,
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: T.destructive, animation: 'wRecPulse 1s ease-in-out infinite' }} />
                  <span style={{ fontFamily: T.fontUI, fontSize: 14, fontWeight: 700, color: T.ink, fontVariantNumeric: 'tabular-nums', minWidth: 36 }}>{_wFmtDelka(hlas.sekundy)}</span>
                </span>
                <WMicVlny urovne={hlas.urovne} />
                <span style={{ fontFamily: T.fontUI, fontSize: 11.5, fontWeight: 600, color: T.muted, flexShrink: 0, paddingRight: 4, whiteSpace: 'nowrap' }}>Pusť pro dokončení</span>
              </div>
            ) : hlas.stav === 'nahled' ? (
              /* Nahráno — přehraj si to, zahoď košem, nebo pošli vlaštovkou */
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 5px 5px 8px', borderRadius: 999,
                background: T.surfaceAlt, border: '1px solid ' + T.border,
              }}>
                <button onClick={hlas.zrus} title="Zahodit" style={{ ...ikonaTlacitko, width: 40, height: 40, flexShrink: 0 }}>
                  <WIkonaKos color={T.muted} />
                </button>
                <WPrilohaHlasovka kompakt mine={false} priloha={{ nahled: hlas.nahled && hlas.nahled.url, delka: hlas.nahled && hlas.nahled.delka }} />
                <button onClick={handleHlasovka} title="Odeslat" style={{
                  width: 40, height: 40, borderRadius: 999, flexShrink: 0,
                  background: T.primary, border: 'none', cursor: 'pointer',
                  display: 'grid', placeItems: 'center', padding: 0,
                }}>
                  <span style={{ display: 'block', transform: 'translate(-0.8px, 0.9px)' }}>
                    <WIkonaPng src="send.png" size={21} color="#fff" />
                  </span>
                </button>
              </div>
            ) : (
              /* Klid — normální psací oválek */
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 5px 5px 18px', borderRadius: 999,
                background: T.surfaceAlt, border: '1px solid ' + T.border,
              }}>
                <input
                  placeholder="Napiš zprávu…"
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  style={{
                    flex: 1, minWidth: 0, padding: '10px 0', border: 'none', background: 'transparent',
                    color: T.ink, fontSize: 15, outline: 'none', fontFamily: T.fontUI,
                  }}
                />
                {/* Prázdné pole → sponka a mikrofon. Jakmile něco napíšeš →
                    vlaštovka. Stejné střídání jako na Instagramu. */}
                {msgInput.trim() ? (
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    title="Odeslat"
                    style={{
                      width: 40, height: 40, borderRadius: 999, flexShrink: 0,
                      background: T.primary, border: 'none', cursor: 'pointer',
                      display: 'grid', placeItems: 'center', padding: 0,
                      opacity: sending ? 0.5 : 1, transition: 'opacity .18s',
                    }}>
                    {/* Vlaštovka má hmotu vychýlenou doprava nahoru (těžiště +20/−21 px
                        na plátně 512), takže na geometrickém středu vypadá posunutá.
                        Tenhle posun ji srovná opticky. */}
                    <span style={{ display: 'block', transform: 'translate(-0.8px, 0.9px)' }}>
                      <WIkonaPng src="send.png" size={21} color="#fff" />
                    </span>
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, paddingRight: 6 }}>
                    <button onClick={() => souborInput.current && souborInput.current.click()} title="Přiložit fotku" style={ikonaTlacitko}>
                      <WIkonaPng src="attachment.png" size={21} color={T.muted} />
                    </button>
                    {/* Podrž = nahrávej, pusť = náhled. touchAction/none, ať držení
                        na mobilu nerozjede scroll ani výběr textu. */}
                    <button
                      onPointerDown={drzMikrofon}
                      onContextMenu={e => e.preventDefault()}
                      title="Podrž pro nahrání hlasovky"
                      style={{ ...ikonaTlacitko, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
                      <WIkonaPng src="voice.png" size={23} color={T.muted} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {lupa && <WLupa url={lupa} onClose={() => setLupa(null)} />}

      {confirmShift && (
        <WShiftConfirmDialog
          shift={confirmShift.shift}
          company={confirmShift.company}
          onConfirm={async () => {
            const mid = active;
            setConfirmShift(null);
            await confirmShiftW(mid);            // match -> confirmed (naplní job)
            await handleRespondToShift('accepted');
          }}
          onClose={() => setConfirmShift(null)}
        />
      )}
    </div>
  );
}

// ── Potvrzení přijetí směny ────────────────────────────────────
function WShiftConfirmDialog({ shift, company, onConfirm, onClose }) {
  const s = shift || {};
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 140,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
      display: 'grid', placeItems: 'center', padding: 20,
      animation: 'wPop .28s cubic-bezier(.2,.8,.2,1)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 380, background: T.card,
        borderRadius: 24, border: '1px solid ' + T.border, padding: 26, textAlign: 'center',
        boxShadow: '0 24px 60px rgba(20,22,40,0.28)',
      }}>
        <div style={{ width: 60, height: 60, borderRadius: 17, background: 'T.tint', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
          <Icon name="calendar-bold" size={26} color={T.primary} />
        </div>
        <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 21, fontWeight: 800, letterSpacing: -0.4 }}>Přijmout směnu?</div>
        {(s.role || company) && (
          <div style={{ color: T.muted, fontFamily: T.fontUI, fontSize: 14, marginTop: 6 }}>
            {s.role || 'Směna'}{company ? <> u <b style={{ color: T.ink }}>{company}</b></> : null}
          </div>
        )}

        <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 14, background: T.surfaceAlt, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {(s.date || s.time) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: T.ink, fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 600 }}>
              <Icon name="calendar-minimalistic-bold" size={16} color={T.muted} /> {[s.date, s.time].filter(Boolean).join(' · ')}
            </div>
          )}
          {s.pay > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: T.ink, fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 600 }}>
              <Icon name="dollar-bold" size={16} color={T.muted} /> Odměna <b>{s.pay} Kč</b>
            </div>
          )}
          {s.location && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, color: T.ink, fontFamily: T.fontUI, fontSize: 13.5, fontWeight: 600 }}>
              <Icon name="map-point-bold" size={16} color={T.muted} /> {s.location}
            </div>
          )}
        </div>

        <button onClick={onConfirm} style={{ width: '100%', marginTop: 18, padding: '14px', borderRadius: 14, background: T.primary, border: 'none', color: '#fff', fontFamily: T.fontHead, fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,32,246,0.28)' }}>Přijmout směnu</button>
        <button onClick={onClose} style={{ width: '100%', marginTop: 10, padding: '13px', borderRadius: 14, background: T.surfaceAlt, border: '1px solid ' + T.border, color: T.muted, fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800, cursor: 'pointer' }}>Zpět</button>
      </div>
    </div>
  );
}

// ── Shift offer card (worker view) ─────────────────────────────
function WShiftCard({ msg, isMe, alreadyResponded, onAccept, onReject }) {
  const [localResponded, setLocalResponded] = useStateW(null);
  const responded = localResponded || alreadyResponded;
  const s = msg.shift || {};

  const handleAccept = () => {
    onAccept?.();   // otevře potvrzovací dialog; skutečné přijetí až po potvrzení
  };
  const handleReject = () => {
    setLocalResponded('rejected');
    onReject?.();
  };

  return (
    <div style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
      <div style={{
        borderRadius: 18, overflow: 'hidden',
        background: '#fff', border: '1px solid ' + T.border,
        boxShadow: '0 8px 20px rgba(20,22,40,0.08)',
      }}>
        <div style={{ padding: '16px 18px 14px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: T.primary, fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: T.fontUI, marginBottom: 12 }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: 'T.tint', display: 'grid', placeItems: 'center' }}>
              <Icon name="calendar-bold" size={13} color={T.primary} />
            </span>
            Nabídka směny
          </div>
          {s.role && (
            <div style={{ color: T.ink, fontFamily: T.fontHead, fontSize: 20, fontWeight: 800, letterSpacing: -0.4, marginBottom: 12 }}>{s.role}</div>
          )}
          <div style={{ color: T.inkSoft, fontFamily: T.fontUI, fontSize: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {s.date && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="calendar-minimalistic-bold" size={16} color={T.muted} /> {s.date}{s.time ? (' · ' + s.time) : ''}</div>}
            {s.pay > 0 && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="dollar-bold" size={16} color={T.muted} /> Odměna <span style={{ color: T.ink, fontWeight: 800 }}>{s.pay} Kč</span></div>}
            {s.location && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="map-point-bold" size={16} color={T.muted} /> {s.location}</div>}
          </div>
        </div>

        {!isMe && (
          responded ? (
            <div style={{
              padding: '13px', textAlign: 'center',
              background: responded === 'accepted' ? T.greenSoft : 'rgba(244,63,94,0.1)',
              color: responded === 'accepted' ? T.green : '#f43f5e',
              fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              <Icon name={responded === 'accepted' ? 'check-circle-bold' : 'close-circle-bold'} size={16} color={responded === 'accepted' ? T.green : '#f43f5e'} />
              {responded === 'accepted' ? 'Přijato' : 'Odmítnuto'}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 1, borderTop: '1px solid ' + T.border }}>
              <button
                onClick={handleReject}
                style={{
                  flex: 1, padding: '13px 0', border: 'none', background: '#fff',
                  color: '#f43f5e', fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                }}>Odmítnout</button>
              <button
                onClick={handleAccept}
                style={{
                  flex: 1, padding: '13px 0', border: 'none', background: T.primary,
                  color: '#fff', fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                }}>Přijmout</button>
            </div>
          )
        )}
      </div>
      <div style={{ color: T.mutedSoft, fontFamily: T.fontMono, fontSize: 10, marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>{msg.t}</div>
    </div>
  );
}

function WInterviewCard({ msg, isMe, alreadyResponded, onAccept, onReject }) {
  const [localResponded, setLocalResponded] = useStateW(null);
  const responded = localResponded || alreadyResponded;
  const iv = msg.interview || {};

  const handleAccept = () => { setLocalResponded('accepted'); onAccept?.(); };
  const handleReject = () => { setLocalResponded('rejected'); onReject?.(); };

  return (
    <div style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
      <div style={{
        borderRadius: 18, overflow: 'hidden',
        background: '#fff', border: '1px solid ' + T.border,
        boxShadow: '0 8px 20px rgba(20,22,40,0.08)',
      }}>
        <div style={{ padding: '16px 18px 14px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: T.primary, fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: T.fontUI, marginBottom: 12 }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: 'T.tint', display: 'grid', placeItems: 'center' }}>
              <Icon name="users-group-rounded-bold" size={13} color={T.primary} />
            </span>
            Pozvánka na pohovor
          </div>
          <div style={{ color: T.inkSoft, fontFamily: T.fontUI, fontSize: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {iv.date && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="calendar-minimalistic-bold" size={16} color={T.muted} /> {iv.date}{iv.time ? (' · ' + iv.time) : ''}</div>}
            {iv.location && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}><Icon name="map-point-bold" size={16} color={T.muted} /> {iv.location}</div>}
            {iv.note && <div style={{ color: T.muted, fontSize: 13 }}>{iv.note}</div>}
          </div>
        </div>

        {!isMe && (
          responded ? (
            <div style={{
              padding: '13px', textAlign: 'center',
              background: responded === 'accepted' ? T.greenSoft : 'rgba(244,63,94,0.1)',
              color: responded === 'accepted' ? T.green : '#f43f5e',
              fontFamily: T.fontHead, fontSize: 14.5, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              <Icon name={responded === 'accepted' ? 'check-circle-bold' : 'close-circle-bold'} size={16} color={responded === 'accepted' ? T.green : '#f43f5e'} />
              {responded === 'accepted' ? 'Přijato' : 'Odmítnuto'}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 1, borderTop: '1px solid ' + T.border }}>
              <button
                onClick={handleReject}
                style={{
                  flex: 1, padding: '13px 0', border: 'none', background: '#fff',
                  color: '#f43f5e', fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                }}>Nemohu</button>
              <button
                onClick={handleAccept}
                style={{
                  flex: 1, padding: '13px 0', border: 'none', background: T.primary,
                  color: '#fff', fontFamily: T.fontHead, fontSize: 14, fontWeight: 800, cursor: 'pointer',
                }}>Přijmout</button>
            </div>
          )
        )}
      </div>
      <div style={{ color: T.mutedSoft, fontFamily: T.fontMono, fontSize: 10, marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>{msg.t}</div>
    </div>
  );
}

// Holá ikona v psacím poli — bez pozadí, jako přílohy na Instagramu
const ikonaTlacitko = {
  width: 34, height: 34, borderRadius: 999, flexShrink: 0,
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  display: 'grid', placeItems: 'center',
  WebkitTapHighlightColor: 'transparent',
};

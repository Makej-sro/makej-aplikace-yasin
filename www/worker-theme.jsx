// Makej Worker — Light theme (redesign: Inter, modrá #0020F6)
// Přepisuje sdílené tokeny T (z app.jsx) na světlý vzhled dle redesign mockupu.
// Běží jen na worker stránce → employer dashboard zůstává tmavý.

Object.assign(T, {
  bg:        '#f7f8fc',           // klidná skoro bílá plocha — karty na ní zůstanou čitelné
  card:      '#ffffff',           // bílé karty
  cardSoft:  'rgba(16,24,64,0.04)',
  surfaceAlt:'#f4f6fc',           // jemná modro-šedá plocha (chipy)
  tint:      '#e9edff',           // modrý tint (ikonové boxy, badge)
  primary:   '#0020F6',
  primaryDeep:'#0014A3',
  ink:       '#14162b',           // hlavní tmavý text
  inkSoft:   '#3a3f5c',
  light:     '#565c78',           // sekundární tmavý text
  text:      '#ffffff',           // text NA barevných plochách (avatary, hero, tmavá tlačítka)
  muted:     '#9096ad',
  mutedSoft: '#a6abc4',
  destructive:'#e2564a',
  super:     '#f5b23c',           // zlatá hvězda
  green:     '#1f9d5c',           // úspěch / hotovo
  greenSoft: '#e6f6ee',
  border:    '#edf0f7',           // světlé okraje karet
  navBg:     '#14162b',           // tmavě-modrý navbar
  black:     '#14162b',           // primární tmavé tlačítko
  heroGrad:  'radial-gradient(120% 130% at 78% 0%, #0020F6, #0014A3 82%)',
  avatarGrad:'linear-gradient(150deg, #6F80FF, #6F80FF)',
  // Jednotné písmo pro celou appku — Inter pokrývá řezy 400–900 (Instrument Sans jen 400–700)
  fontUI:    '"Inter", -apple-system, system-ui, sans-serif',
  fontHead:  '"Inter", -apple-system, system-ui, sans-serif',
  fontMono:  '"Inter", ui-monospace, monospace',
});

// ── Tlačítko „Zpět" ────────────────────────────────────────────
// Jediná podoba pro celou aplikaci: chevron z webu (icons/chevron.png,
// tentýž soubor jako v přihlašovacím okně) + popisek, obojí zmodrá
// a šipka se posune o 2 px doleva. Na počítači při najetí myší,
// na mobilu při doteku — hover se na telefonu nikdy nespustí.
// Používej všude, kde se jde o krok zpět. Nekopíruj styl ručně.
function WZpet({ onClick, label, title }) {
  const [aktivni, setAktivni] = React.useState(false);
  const klid = 'rgba(10,13,46,0.55)';
  return (
    <button
      onClick={onClick}
      title={title || 'Zpět'}
      onMouseEnter={() => setAktivni(true)}
      onMouseLeave={() => setAktivni(false)}
      onTouchStart={() => setAktivni(true)}
      onTouchEnd={() => setAktivni(false)}
      onTouchCancel={() => setAktivni(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6.5, flexShrink: 0,
        border: 'none', background: 'none', cursor: 'pointer',
        padding: '8px 10px 8px 8px',
        color: aktivni ? T.primary : klid,
        fontFamily: T.fontUI, fontSize: 13.6, fontWeight: 600,
        transition: 'color .2s ease',
        WebkitTapHighlightColor: 'transparent',
      }}>
      <span style={{
        width: 13, height: 13, flexShrink: 0,
        background: aktivni ? T.primary : klid,
        transform: aktivni ? 'translateX(-2px)' : 'none',
        transition: 'background-color .2s ease, transform .2s ease',
        WebkitMaskImage: 'url(icons/chevron.png)', maskImage: 'url(icons/chevron.png)',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
        WebkitMaskSize: 'contain', maskSize: 'contain',
      }} />
      {label || 'Zpět'}
    </button>
  );
}

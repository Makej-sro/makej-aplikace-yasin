// Makej Worker — Light theme (redesign: Inter, modrá #0020F6)
// Přepisuje sdílené tokeny T (z app.jsx) na světlý vzhled dle redesign mockupu.
// Běží jen na worker stránce → employer dashboard zůstává tmavý.

Object.assign(T, {
  bg:        '#f5f7fd',           // světle modro-bílé pozadí obrazovek
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

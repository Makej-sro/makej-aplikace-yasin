const F = require('./www/text-filtr.js');

// ═══ MUSÍ ZACHYTIT ═══
const chytit = [
  // základ a zápis
  ['kurva', 'základ'], ['KURVA', 'velká písmena'], ['kůrvá', 'diakritika'],
  ['k u r v a', 'mezery'], ['k.u.r.v.a', 'tečky'], ['k-u-r-v-a', 'pomlčky'],
  ['k_u_r_v_a', 'podtržítka'], ['kuuurvaaa', 'zdvojená písmena'],
  ['k0k0t', 'nuly'], ['k@kot', 'zavináč'], ['kurv@', 'symbol na konci'],
  ['ku®va', '® místo r'], ['кurva', 'cyrilice'], ['k​urva', 'neviditelný znak'],
  ['avruk', 'pozpátku'], ['tokok', 'kokot pozpátku'],
  // skloňování a odvozeniny
  ['kokotina', 'odvozenina'], ['kokotem', 'skloňování'], ['kurvě', 'skloňování'],
  ['kurvou', 'skloňování'], ['zkurvenej', 'předpona'], ['vykurvenej', 'předpona'],
  ['negrovi', 'skloňování'], ['debilové', 'množné číslo'], ['debilní', 'přídavné jméno'],
  ['vyjebanej', 'předpona'], ['posranej', 'předpona'], ['sračky', 'množné číslo'],
  ['píčovina', 'odvozenina'], ['čůráku', 'skloňování'],
  // extremismus
  ['hitler', 'extremismus'], ['Heil Hitler', 'fráze'], ['nacista', 'extremismus'],
  ['nacistický', 'odvozenina'], ['fašista', 'extremismus'], ['white power', 'fráze'],
  ['cikáni do plynu', 'nenávistná fráze'], ['hakenkříž', 'symbol'],
  // nadávky
  ['negr', 'nadávka'], ['n3gr', 'leet'], ['cigán', 'nadávka'], ['buzerant', 'nadávka'],
  ['židák', 'nadávka'], ['retardovaný', 'nadávka'],
  // sexuální
  ['pussy', 'sexuální'], ['puuussssy', 'zdvojené'], ['porno', 'sexuální'],
  ['pornografie', 'odvozenina'], ['masturbovat', 'odvozenina'],
  // anglické
  ['fuck', 'anglicky'], ['fucking', 'odvozenina'], ['5h1t', 'leet'],
  ['f  u  c  k', 'mezery'], ['bitch', 'anglicky'],
  // ve větě
  ['Jsi debil', 've větě'], ['ty jsi zmrd a nic víc', 've větě'],
  ['Hledám práci ty kokote', 've větě'],
];

// ═══ NESMÍ ZACHYTIT ═══
const pustit = [
  ['analýza dat', 'anal uvnitř'], ['kanál na vodu', 'anal uvnitř'],
  ['penál do školy', 'anal'], ['banální úkol', 'anal'], ['signalizace', 'signál'],
  ['geniální nápad', 'anal'], ['finále soutěže', 'anal'],
  ['kurz vaření', 'blízko kurva'], ['kurzy angličtiny', 'kurz'],
  ['sraz v 8:00 u vchodu', 'sraz obsahuje sra'], ['srazil jsem se', 'sraz'],
  ['pusy', 'jen jedno s'], ['sexuální výchova', 'kontext'],
  ['asistentka v kavárně', 'ass uvnitř'], ['dokumenty k brigádě', 'dokument'],
  ['specialista na úklid', 'specialista'], ['klasická kuchyně', 'klasika'],
  ['Picasso výstava', 'pica uvnitř'], ['cocktail bar', 'cock uvnitř'],
  ['fagot a klarinet', 'jedno g, ne faggot'], ['Mongolsko', 'stát, ne nadávka'],
  ['svinout koberec', 'svin uvnitř'], ['volejbal o víkendu', 'vole uvnitř'],
  ['dovolená v srpnu', 'vole uvnitř'], ['volno na víkend', 'vol'],
  ['Hledám brigádu na víkend', 'běžná věta'],
  ['Umím vařit, uklízet a hlídat děti', 'běžná věta'],
  ['Doučuju matematiku a fyziku', 'běžná věta'],
  ['Diskuze o platu', 'diskuze'], ['Mám kondici na fyzickou práci', 'kondice'],
  ['Práce v pekárně od 6:00', 'běžná věta'],
  ['Jsem spolehlivý a nadšený do práce', 'nadšený'],
  ['Roznáška letáků, 1488 kusů', 'číslo nesmí blokovat'],
  ['Cena 88 Kč za hodinu', 'číslo nesmí blokovat'],
];

let chyby = 0;
function sekce(nazev, data, cekano) {
  console.log(`\n═══ ${nazev} ═══`);
  for (const [t, popis] of data) {
    const r = F.zkontroluj(t);
    const proslo = cekano === 'blok' ? !r.ok : r.ok;
    if (!proslo) chyby++;
    const znacka = proslo ? '✔' : (cekano === 'blok' ? '✘ NEZACHYTIL' : '✘ PLANÝ POPLACH');
    const info = proslo && cekano === 'blok' ? `  → ${r.kategorie}/${r.nalezeno}`
               : (!proslo && cekano === 'ok' ? `  → chytlo „${r.nalezeno}"` : '');
    console.log(`  ${znacka}  ${t.padEnd(34)} ${popis}${info}`);
  }
}
sekce('MUSÍ ZACHYTIT', chytit, 'blok');
sekce('NESMÍ ZACHYTIT', pustit, 'ok');

const s = F._seznamy;
const pocet = s.vulgarity.length + s.nadavky.length + s.extremismus.length + s.sexualni.length;
console.log(`\nSeznamy: ${s.vulgarity.length} vulgarit · ${s.nadavky.length} nadávek · ` +
            `${s.extremismus.length} extremismus · ${s.sexualni.length} sexuálních = ${pocet} záznamů`);
console.log(`Povolené výjimky: ${s.povolena.length}`);
console.log(`Testů celkem: ${chytit.length + pustit.length}`);
console.log(chyby === 0 ? '\n✅ všechny testy prošly\n' : `\n❌ chyb: ${chyby}\n`);
process.exit(chyby ? 1 : 0);

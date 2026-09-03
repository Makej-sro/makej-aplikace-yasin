/* ═══════════════════════════════════════════════════════════════════════
   FILTR NEVHODNÉHO TEXTU
   ───────────────────────────────────────────────────────────────────────
   Preventivní kontrola obsahu od uživatelů — jméno, profil, nabídka,
   recenze, zprávy. Vyžaduje ji App Store Guideline 1.2 (User-Generated
   Content): appka musí mít metodu, která nevhodný obsah nepustí ven.

   ── Odolá těmto způsobům obcházení ──────────────────────────────────
     KURVA          velká písmena
     kůrvá          diakritika navíc
     k u r v a      mezery
     k.u.r.v.a      tečky, pomlčky, podtržítka
     k0k0t          číslice místo písmen
     k@kot / ku®va  symboly místo písmen
     kuuurvaaa      zdvojená písmena
     avruk          pozpátku
     кurva          cyrilice, která vypadá jako latinka
     k​urva     neviditelné znaky mezi písmeny
     kokotina       skloňování a odvozeniny
     zkurvenej      předpony před kořenem slova

   ── Tři režimy shody ────────────────────────────────────────────────
   Čeština skloňuje a lepí předpony, takže hledat přesné slovo nestačí:
   „kokot" by nechytlo „kokotina" ani „zkurvenej". Proto má každý záznam
   režim, který se pozná podle zápisu:

     'kurv*'   KOŘEN — kdekoli uvnitř slova.  Chytne zkurvený, vykurvit,
               kurvě, kurvou. Používat jen tam, kde žádné slušné české
               slovo daný řetězec neobsahuje.
     '=anal'   PŘESNĚ — jen celé slovo. Pro krátké a dvojznačné výrazy,
               kde by cokoli volnějšího trefilo „analýzu" nebo „kanál".
     'negr'    VÝCHOZÍ — celé slovo plus až tři písmena na konci, aby
               prošlo skloňování: negrovi, negři, kokotem, debilové.

   Seznam POVOLENA je stejně důležitý jako ty zakázané: jsou v něm slova,
   která by se do vzorců omylem trefila („sraz", „analýza", „kurz",
   „Picasso"). Odstraní se z textu dřív, než kontrola začne.
   ═══════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  // Písmena, která jde napsat i jinak.
  var ZAMENY = {
    a: 'a@4åæ', b: 'b8ß', c: 'c(©¢', d: 'd', e: 'e3€',
    f: 'f', g: 'g69', h: 'h', i: 'i1!|¡', j: 'j', k: 'k', l: 'l1|£',
    m: 'm', n: 'n', o: 'o0@ø°', p: 'p', q: 'q', r: 'r®',
    s: 's5$§', t: 't7+†', u: 'uµ', v: 'v', w: 'w', x: 'x',
    y: 'y¥', z: 'z2',
  };

  // Znaky z jiných abeced, které vypadají jako latinka.
  var HOMOGLYFY = {
    'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c',
    'х': 'x', 'у': 'y', 'к': 'k', 'в': 'b', 'м': 'm',
    'н': 'h', 'і': 'i', 'ѕ': 's', 'ј': 'j', 'г': 'r',
    'α': 'a', 'ο': 'o', 'ρ': 'p', 'υ': 'u', 'ν': 'v',
    'ı': 'i', 'ɡ': 'g',
  };

  var NEVIDITELNE = /[​-‏‪-‮⁠-⁤﻿­]/g;

  /* ─── Sprostá slova ──────────────────────────────────────────────── */
  var VULGARITY = [
    // České kořeny — bezpečné jako „kdekoli", žádné slušné slovo je neobsahuje
    'kurv*', 'mrd*', 'jeb*', 'hovn*', 'curak*', 'curack*', 'zmrd*',
    'hajzl*', 'parchant*', 'srack*', 'posra*', 'nasra*', 'zasra*', 'vysra*',
    'kokot', 'kokoti', 'debil', 'kreten', 'idiot', 'blbec', 'blbost',
    'prdel', 'prdet', 'srat', 'svine', 'svinstvo', 'pica', 'picus',
    'picovin', 'picka', 'zmetek', 'hnusak', 'sracka', 'chcanky',
    '=vole', '=vul', '=zmrde',
    // Anglicky
    'fuck*', 'shit*', 'bitch', 'bastard', 'asshole', 'motherfuck*',
    'wanker', 'dumbass', 'jackass', 'douchebag', 'bollocks', 'crap',
    '=cunt', '=dick', '=twat',
  ];

  /* ─── Nadávky na skupiny lidí ────────────────────────────────────── */
  var NADAVKY = [
    'negr', 'negri', 'cikan', 'cigan', 'cigos', 'zidak', 'zidack',
    'buzer*', 'buzn*', 'teplous', 'retard*', 'mongoloid*', 'debilko',
    'zrudo', 'zmrzacen',
    'nigger', 'nigga', 'negro', 'faggot', 'retarded', 'tranny', 'shemale',
    'chink', 'gypsy',
  ];

  /* ─── Extremismus a nenávist ─────────────────────────────────────── */
  // Bez holé „88" nebo „1488" — to jsou i běžná čísla (cena, adresa)
  // a blokovat je by dělalo víc škody než užitku.
  var EXTREMISMUS = [
    'hitler', 'hitlerov', 'nacis*', 'nazismus', 'nazista', 'nazisti',
    'heil', 'siegheil', 'heilhitler', 'hakenkriz', 'fasis*', 'fasoun',
    'whitepower', 'whitepride', 'blutundehre', 'combat18',
    '=kkk', 'kuklux*', 'doplynu', 'doplynovekomory', 'plynovekomory',
    'rasovacistota', 'bilarasa', 'smrtzidum', 'smrtcikanum',
  ];

  /* ─── Sexuálně explicitní ────────────────────────────────────────── */
  var SEXUALNI = [
    'kunda', 'kundy', 'sperma', 'penis', 'vagina', 'porno', 'pornograf*',
    'masturb*', 'onanov*', 'orgasmus', 'mrdka', 'sexchat', 'sexting',
    'nahafotk', 'nudefotk',
    'pussy', 'blowjob', 'handjob', 'hentai', 'milf', 'bdsm', 'gangbang',
    'creampie', 'deepthroat', 'dickpic',
    '=anal', '=cock', '=porn', '=nudes', '=nude', '=tits', '=boobs',
  ];

  /* ─── Slušná slova, která by se do vzorců trefila ────────────────── */
  var POVOLENA = [
    'analyza', 'analyz', 'analytik', 'analytick', 'kanal', 'kanalizac',
    'penal', 'banal', 'signal', 'genial', 'diagonal', 'finale',
    'kurz', 'kurzy', 'kurzu', 'kurzovn',
    'sraz', 'srazy', 'srazu', 'srazit', 'srazen', 'srazk',
    'diskuze', 'diskuse', 'sexualni', 'asexualni',
    'asistent', 'klasik', 'klasick', 'specialist', 'dokument', 'kondice',
    'picasso', 'picture', 'picnic', 'pickup', 'epicentrum', 'tropick',
    'cocktail', 'cockpit', 'scunthorpe', 'penistav',
    'svinout', 'svinovac', 'volej', 'volno', 'volant', 'dovolen',
    'fagot', 'mongolsk', 'mongolie', 'heilbronn', 'retarder', 'retardacn',
    'krab', 'skrabk', 'nakupni', 'pocitac', 'nadsen',
  ];

  // ─── Očista textu ──────────────────────────────────────────────────
  // Mezery a interpunkce ZŮSTÁVAJÍ — slouží jako hranice slov.
  function ocisti(text) {
    var s = String(text == null ? '' : text);
    s = s.replace(NEVIDITELNE, '');
    s = s.toLowerCase();
    s = s.replace(/[Ѐ-ӿͰ-Ͽıɡ]/g, function (z) {
      return HOMOGLYFY[z] || z;
    });
    if (s.normalize) s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    return s;
  }

  var ZAC = '(?:^|[^a-z0-9])';   // začátek slova
  var KON = '(?![a-z0-9])';      // konec slova
  var SEP = '[^a-z0-9]*';        // co smí být mezi písmeny

  function naVzorec(zaznam) {
    var rezim = 'vychozi', slovo = zaznam;
    if (slovo.charAt(0) === '=') { rezim = 'presne'; slovo = slovo.slice(1); }
    else if (slovo.charAt(slovo.length - 1) === '*') { rezim = 'koren'; slovo = slovo.slice(0, -1); }

    var casti = [];
    for (var i = 0; i < slovo.length; i++) {
      var trida = ZAMENY[slovo[i]] || slovo[i];
      casti.push('[' + trida.replace(/[\\\]^-]/g, '\\$&') + ']+');
    }
    var jadro = casti.join(SEP);

    if (rezim === 'koren')  return { re: new RegExp(jadro, 'i'), slovo: slovo };
    if (rezim === 'presne') return { re: new RegExp(ZAC + jadro + KON, 'i'), slovo: slovo };
    // Výchozí: celé slovo + až tři písmena na konci (české koncovky).
    return { re: new RegExp(ZAC + jadro + '[a-z]{0,3}' + KON, 'i'), slovo: slovo };
  }

  function sestav(seznam) { return seznam.map(naVzorec); }
  var RE = {
    vulgarita:   sestav(VULGARITY),
    nadavka:     sestav(NADAVKY),
    extremismus: sestav(EXTREMISMUS),
    sexualni:    sestav(SEXUALNI),
  };

  function odstranPovolena(s) {
    for (var i = 0; i < POVOLENA.length; i++) s = s.split(POVOLENA[i]).join(' ');
    return s;
  }

  function hledej(s, seznam) {
    for (var i = 0; i < seznam.length; i++) if (seznam[i].re.test(s)) return seznam[i].slovo;
    return null;
  }

  var HLASKY = {
    extremismus: 'Tohle sem opravdu nepatří. Nenávistný obsah tady nemá místo.',
    nadavka:     'Tohle si nech od cesty. Urážky tu nemají místo.',
    sexualni:    'Sexuálně explicitní obsah sem nepatří.',
    vulgarita:   'Zkus to bez sprostých slov.',
  };
  var PORADI = ['extremismus', 'nadavka', 'sexualni', 'vulgarita'];

  /**
   * Zkontroluje text od uživatele.
   * @returns {{ok:boolean, kategorie:?string, nalezeno:?string, hlaska:?string}}
   */
  function zkontroluj(text) {
    var cisty = odstranPovolena(ocisti(text));
    var pozpatku = cisty.split('').reverse().join('');
    for (var i = 0; i < PORADI.length; i++) {
      var kat = PORADI[i];
      var n = hledej(cisty, RE[kat]) || hledej(pozpatku, RE[kat]);
      if (n) return { ok: false, kategorie: kat, nalezeno: n, hlaska: HLASKY[kat] };
    }
    return { ok: true, kategorie: null, nalezeno: null, hlaska: null };
  }

  var API = {
    zkontroluj: zkontroluj,
    ocisti: ocisti,
    _seznamy: {
      vulgarity: VULGARITY, nadavky: NADAVKY,
      extremismus: EXTREMISMUS, sexualni: SEXUALNI, povolena: POVOLENA,
    },
  };
  global.MkjFiltr = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);

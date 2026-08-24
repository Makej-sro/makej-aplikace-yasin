// Makej — logika typu smlouvy → badge + validace inzerátu.
// JEDINÝ ZDROJ PRAVDY. Sdílí appka (karta + filtr) i firemní dashboard (formulář).
//
// Základní invariant: badge se NIKDY nezadává ručně — vždy se odvozuje z typu
// smlouvy a počtu hodin. Firma vyplňuje jen contract_types + hours_per_week.
// Tím je vyloučeno, aby si badge a typ smlouvy odporovaly.
//
// Čistý JS bez JSX schválně — ať jde soubor spustit i v Node (self-test).

// ── Enumy ─────────────────────────────────────────────────────────────
var ContractType = {
  DPP: 'DPP',                          // dohoda o provedení práce
  DPC: 'DPC',                          // dohoda o pracovní činnosti
  EMPLOYMENT_CONTRACT: 'EMPLOYMENT_CONTRACT', // pracovní smlouva (lidově HPP)
  SELF_EMPLOYED: 'SELF_EMPLOYED',      // IČO / OSVČ
};

// Badge = marketingová kategorie pro rychlé oko při swipování, NE právní pojem.
var Badge = {
  BRIGADA: 'BRIGADA',
  CASTECNY_UVAZEK: 'CASTECNY_UVAZEK',
  ZKRACENY_UVAZEK: 'ZKRACENY_UVAZEK',
  PLNY_UVAZEK: 'PLNY_UVAZEK',
  NA_ICO: 'NA_ICO',
  DLE_DOMLUVY: 'DLE_DOMLUVY',
};

// Lidské popisky (čeština) — pro zobrazení na kartě.
var BADGE_LABEL = {
  BRIGADA: 'Brigáda',
  CASTECNY_UVAZEK: 'Částečný úvazek',
  ZKRACENY_UVAZEK: 'Zkrácený úvazek',
  PLNY_UVAZEK: 'Plný úvazek',
  NA_ICO: 'Na IČO',
  DLE_DOMLUVY: 'Dle domluvy',
};
var CONTRACT_LABEL = {
  DPP: 'DPP',
  DPC: 'DPČ',
  EMPLOYMENT_CONTRACT: 'Pracovní smlouva',
  SELF_EMPLOYED: 'IČO',
};

// ── Konfigurace ───────────────────────────────────────────────────────
// POZOR: tyhle hodnoty se mění KAŽDÝ LEDEN. Do kódu patří jen jako výchozí
// nouzová hodnota — v produkci je přepiš za běhu přes window.MAKEJ_BADGE_CONFIG
// (načteno z DB/API, s platností od data). Ověřit v prosinci na další rok.
// Hodnoty níže jsou ORIENTAČNÍ k srpnu 2026 a NEJSOU právní poradenství.
var DEFAULT_BADGE_CONFIG = {
  effective_from: '2026-01-01',
  MIN_HOURLY_RATE: 124.40,        // min. mzda přepočtená na hodinu — OVĚŘIT
  DPP_INSURANCE_THRESHOLD: 11500, // hranice odvodů u DPP (25 % prům. mzdy) — OVĚŘIT
  DPC_INSURANCE_THRESHOLD: 4500,  // hranice odvodů u DPČ — OVĚŘIT
  DPP_ANNUAL_HOUR_LIMIT: 300,     // roční limit hodin u DPP u jednoho zaměstnavatele
  DPC_WEEKLY_HOUR_LIMIT: 20,      // DPČ: průměrně max. 20 h/týden
  MAX_WEEKLY_HOURS: 40,
  MAX_SHIFT_HOURS: 12,
  MAX_FIXED_TERM_MONTHS: 36,      // doba určitá max. 3 roky
};

function badgeConfig() {
  var rt = (typeof window !== 'undefined' && window.MAKEJ_BADGE_CONFIG) || {};
  var out = {};
  for (var k in DEFAULT_BADGE_CONFIG) out[k] = DEFAULT_BADGE_CONFIG[k];
  for (var j in rt) out[j] = rt[j];
  return out;
}

// ── Odvození badge ────────────────────────────────────────────────────
// smlouva + hodiny → badge. NIKDY opačně.
function deriveBadge(contract_types, hours_per_week) {
  var types = (contract_types || []).filter(Boolean);

  // 1. Víc typů smlouvy → firma to nechává otevřené.
  if (types.length > 1) return Badge.DLE_DOMLUVY;

  // 2. Jediný typ.
  switch (types[0]) {
    case ContractType.SELF_EMPLOYED:
      return Badge.NA_ICO;
    case ContractType.DPP:
      return Badge.BRIGADA;
    case ContractType.DPC:
      return Badge.BRIGADA;
    case ContractType.EMPLOYMENT_CONTRACT:
      if (hours_per_week >= 36) return Badge.PLNY_UVAZEK;
      if (hours_per_week >= 20) return Badge.ZKRACENY_UVAZEK;
      return Badge.CASTECNY_UVAZEK;
    default:
      return Badge.DLE_DOMLUVY; // prázdné/neznámé — bezpečný fallback (blok B6 řeší formulář)
  }
}

// ── Povolený override ─────────────────────────────────────────────────
// Firma smí navrženou badge změnit, ale jen na hodnotu z povolené množiny.
// Pravidlo: override nesmí NIKDY zvýšit vnímaný rozsah práce (dolů vadí míň).
// Mimo množinu se volba VŮBEC nenabízí (ne disabled).
function allowedOverrides(derived) {
  switch (derived) {
    case Badge.BRIGADA:         return [Badge.CASTECNY_UVAZEK];
    case Badge.CASTECNY_UVAZEK: return [Badge.BRIGADA];
    case Badge.ZKRACENY_UVAZEK: return [Badge.CASTECNY_UVAZEK];
    default:                    return []; // PLNY_UVAZEK, NA_ICO, DLE_DOMLUVY — nic
  }
}

// Skutečná badge k zobrazení: override respektuj JEN když je v povolené množině.
function effectiveBadge(offer) {
  offer = offer || {};
  var derived = deriveBadge(offer.contract_types, offer.hours_per_week);
  var ov = offer.badge_override;
  if (ov && allowedOverrides(derived).indexOf(ov) !== -1) return ov;
  return derived;
}

// ── Validace ──────────────────────────────────────────────────────────
// Vrací { blocks: [{code,message}], warnings: [{code,message}], canPublish }.
// blocks = tvrdý blok (publikaci nepovolit). warnings = zobrazit, ale povolit.
function validateOffer(offer, cfg) {
  cfg = cfg || badgeConfig();
  offer = offer || {};
  var types = (offer.contract_types || []).filter(Boolean);
  var h = Number(offer.hours_per_week) || 0;
  var shift = offer.shift_length_hours != null ? Number(offer.shift_length_hours) : null;
  var rate = offer.hourly_rate != null && offer.hourly_rate !== '' ? Number(offer.hourly_rate) : null;
  var weeks = offer.duration_weeks != null ? Number(offer.duration_weeks) : null;
  var fixedMonths = offer.fixed_term_months != null ? Number(offer.fixed_term_months) : null;

  var has = function (t) { return types.indexOf(t) !== -1; };
  var anyNonSelf = types.some(function (t) { return t !== ContractType.SELF_EMPLOYED; });
  var monthly = rate != null ? rate * h * 52 / 12 : null; // hrubý měsíční odhad

  var blocks = [];
  var warnings = [];
  var B = function (code, message) { blocks.push({ code: code, message: message }); };
  var W = function (code, message) { warnings.push({ code: code, message: message }); };

  // ── Tvrdé bloky ──
  if (types.length === 0)                                                    // B6
    B('B6', 'Vyber alespoň jeden typ smlouvy.');
  if (has(ContractType.DPC) && h > cfg.DPC_WEEKLY_HOUR_LIMIT)                 // B1
    B('B1', 'DPČ je zákonem omezená na průměrně ' + cfg.DPC_WEEKLY_HOUR_LIMIT + ' h/týden. Zvol DPP nebo pracovní smlouvu.');
  if (anyNonSelf && h > cfg.MAX_WEEKLY_HOURS)                                 // B2
    B('B2', 'Nad ' + cfg.MAX_WEEKLY_HOURS + ' h/týden nelze sjednat. Uprav rozsah.');
  if (anyNonSelf && shift != null && shift > cfg.MAX_SHIFT_HOURS)            // B3
    B('B3', 'Směna nesmí přesáhnout ' + cfg.MAX_SHIFT_HOURS + ' hodin.');
  if (rate != null && rate < cfg.MIN_HOURLY_RATE)                            // B4
    B('B4', 'Odměna je pod minimální mzdou. Ta platí i pro DPP a DPČ.');
  if (has(ContractType.EMPLOYMENT_CONTRACT) && fixedMonths != null && fixedMonths > cfg.MAX_FIXED_TERM_MONTHS) // B5
    B('B5', 'Pracovní poměr na dobu určitou lze sjednat max. na ' + (cfg.MAX_FIXED_TERM_MONTHS / 12) + ' roky.');

  // ── Varování (nikdy neblokovat) ──
  if (has(ContractType.DPP) && weeks != null && h * weeks > cfg.DPP_ANNUAL_HOUR_LIMIT) // W1
    W('W1', 'Tahle nabídka vyjde na ' + (h * weeks) + ' h. Roční limit DPP je ' + cfg.DPP_ANNUAL_HOUR_LIMIT + ' h u jednoho zaměstnavatele. Zvaž DPČ nebo pracovní smlouvu.');
  if (has(ContractType.DPP) && h >= 36 && weeks == null)                     // W2
    W('W2', 'Na plný úvazek vydrží DPP zhruba 7,5 týdne (limit ' + cfg.DPP_ANNUAL_HOUR_LIMIT + ' h/rok). Doplň délku spolupráce.');
  if (has(ContractType.DPP) && monthly != null && monthly > cfg.DPP_INSURANCE_THRESHOLD) // W3
    W('W3', 'Nad ' + cfg.DPP_INSURANCE_THRESHOLD + ' Kč/měsíc se z DPP odvádí sociální a zdravotní pojištění.');
  if (has(ContractType.DPC) && monthly != null && monthly > cfg.DPC_INSURANCE_THRESHOLD) // W4
    W('W4', 'Nad ' + cfg.DPC_INSURANCE_THRESHOLD + ' Kč/měsíc se z DPČ odvádí sociální a zdravotní pojištění.');
  if (has(ContractType.SELF_EMPLOYED) && (offer.fixed_schedule || offer.has_shifts || offer.at_employer_workplace)) // W5
    W('W5', 'Práce na IČO se znaky závislé práce může být posouzena jako švarcsystém. Ověř si to.');
  if (offer.title && _titleMismatchesContracts(offer.title, types))         // W6
    W('W6', 'V názvu inzerátu je uvedena jiná forma než ve formuláři. Sjednoť to.');
  if (rate == null)                                                          // W7
    W('W7', 'Inzeráty s uvedenou mzdou mají výrazně víc reakcí.');

  return { blocks: blocks, warnings: warnings, canPublish: blocks.length === 0 };
}

// W6 pomocník: názvem zmíněná forma se neshoduje s vybranými contract_types.
function _titleMismatchesContracts(title, types) {
  var t = String(title).toLowerCase();
  var has = function (x) { return types.indexOf(x) !== -1; };
  var mentioned = false, mismatch = false;
  if (/dpp/.test(t))        { mentioned = true; if (!has(ContractType.DPP)) mismatch = true; }
  if (/dpč|dpc/.test(t))    { mentioned = true; if (!has(ContractType.DPC)) mismatch = true; }
  if (/hpp/.test(t))        { mentioned = true; if (!has(ContractType.EMPLOYMENT_CONTRACT)) mismatch = true; }
  if (/brigád|brigad/.test(t)) { mentioned = true; if (!(has(ContractType.DPP) || has(ContractType.DPC))) mismatch = true; }
  return mentioned && mismatch;
}

// ── Zobrazovací pomocníci ─────────────────────────────────────────────
function badgeLabel(badge) { return BADGE_LABEL[badge] || ''; }

// contract_types → „DPP · DPČ" (seznam všech hodnot, čárkou/tečkou oddělené).
function formatContractTypes(types) {
  return (types || []).filter(Boolean).map(function (t) { return CONTRACT_LABEL[t] || t; }).join(' · ');
}

// ── Adaptér starých demo dat ──────────────────────────────────────────
// Karta v appce nese buď nový model (contract_types[]), nebo staré pole
// contract:'DPP'|'HPP'|'OSVČ'|… + rozsah. Sjednotíme na enum.
function normalizeContractTypes(job) {
  if (Array.isArray(job.contract_types) && job.contract_types.length) return job.contract_types.filter(Boolean);
  var c = String(job.contract || job.smlouva || job.contractType || '').toUpperCase().trim();
  if (c === 'DPP') return [ContractType.DPP];
  if (c === 'DPC' || c === 'DPČ') return [ContractType.DPC];
  if (c === 'HPP' || c === 'PRACOVNÍ SMLOUVA') return [ContractType.EMPLOYMENT_CONTRACT];
  if (c === 'OSVČ' || c === 'OSVC' || c === 'IČO' || c === 'ICO') return [ContractType.SELF_EMPLOYED];
  return []; // např. 'Agentura' — nový model to nepokrývá; badge padne na legacy fallback
}
function normalizeHours(job) {
  if (typeof job.hours_per_week === 'number') return job.hours_per_week;
  var roz = String(job.rozsah || '').toLowerCase().trim();
  if (roz === 'plný' || roz === 'plny') return 40;
  if (roz === '0,75') return 30;
  if (roz === '0,5')  return 20;
  if (roz === '0,25') return 10;
  return 40;
}

// Modul → CommonJS pro Node self-test (v prohlížeči nemá efekt).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ContractType: ContractType, Badge: Badge, BADGE_LABEL: BADGE_LABEL, CONTRACT_LABEL: CONTRACT_LABEL,
    DEFAULT_BADGE_CONFIG: DEFAULT_BADGE_CONFIG, badgeConfig: badgeConfig,
    deriveBadge: deriveBadge, allowedOverrides: allowedOverrides, effectiveBadge: effectiveBadge,
    validateOffer: validateOffer, badgeLabel: badgeLabel, formatContractTypes: formatContractTypes,
    normalizeContractTypes: normalizeContractTypes, normalizeHours: normalizeHours,
  };
}

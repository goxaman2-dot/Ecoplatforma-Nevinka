// Баланс бенефициаров экоплатформы и стратегический контур (горизонт 2026–2040 гг.).
//
// Правило замыкания: платформа создаёт новую стоимость только в размере ΔE(t).
// Цена обмена, дивиденд, налоги, компенсация σ и межбюджетный B_внеш — переливы между
// участниками. Плата за НВОС — выигрыш предприятий и равная потеря бюджета.
// Поэтому Σ чистых выигрышей всех бенефициаров = ΔE(t) − ΔНВОС(t) (расширенная граница с бюджетом).
//
// Нормативы (проверено 15.10.2026; перед защитой сверить с текущей редакцией):
//  • налог на прибыль 25 %: 8 % — федеральный бюджет, 17 % — бюджет субъекта (с 2025 г.);
//  • плата за НВОС с 01.01.2026 зачисляется в бюджет субъекта на 100 % (ФЗ от 26.12.2024 № 488-ФЗ),
//    норматив отчислений городу устанавливает субъект — параметр класса C;
//  • льготы резидентов ТОСЭР по налогу на прибыль — параметр (федеральная часть 0 %, региональная 5 %), класс C.

export interface Flows { heatNet: number; co2Net: number; recycleNet: number; nvosNet: number; }

export type StrategyId = 'chem' | 'lowcarbon' | 'tor' | 'krai';

export const STRATEGIES: { id: StrategyId; label: string; doc: string; horizon: string; effect: string }[] = [
  { id: 'chem', label: 'Рост химического комплекса', doc: 'Стратегия развития химического и нефтехимического комплекса до 2030 г. (приказ Минпромторга № 651, Минэнерго № 172, 2014)', horizon: '2030', effect: 'выпуск аммиака растёт на g в год' },
  { id: 'lowcarbon', label: 'Низкоуглеродное развитие', doc: 'Стратегия социально-экономического развития РФ с низким уровнем выбросов ПГ до 2050 г. (распоряжение от 29.10.2021 № 3052-р)', horizon: '2050', effect: 'цена выбросов для якоря с 2030 г.; вычет за переданный CO₂ только при μ = 1' },
  { id: 'tor', label: 'Продление режима ТОР', doc: 'Стратегия пространственного развития РФ до 2030 г. с прогнозом до 2036 г. (распоряжение от 28.12.2024 № 4146-р); режим ТОСЭР «Невинномысск» (ПП РФ от 22.12.2017 № 1606)', horizon: '2036', effect: 'льготы резидентов до 2032 г. вместо 2027 г.' },
  { id: 'krai', label: 'Краевая политика до 2035 г.', doc: 'Стратегия социально-экономического развития Ставропольского края до 2035 г. (закон СК от 27.12.2019 № 110-кз)', horizon: '2035', effect: 'межбюджетный B_внеш краем городу с 2028 г.' },
];

export interface BenefInputs {
  kScenario: number;     // k: 3 / 5 / 7
  cStart: number;        // C_инд в 2026 г.
  cTarget: number;       // целевая связность
  yearTarget: number;    // год достижения цели
  flows: Flows;
  platformCost: number;  // Z_пл
  alpha: number;
  mult: number;
  regimeWeights: { operator: number; suppliers: number; corporation: number };
  omega: number;         // доля выигрыша обмена у поставщика (положение цены в коридоре)
  nvosCityShare: number; // норматив отчисления платы за НВОС городу
  sigma: number;         // компенсация затрат подключения краем
  connCost: number;      // затраты подключения резидентов, млн руб./год
  bExt: number;          // B_внеш с вкладки «Симуляция»
  bExtKrai: number;      // B_внеш по краевой стратегии
  cLiq: number;          // C_ликв в 2026 г.
  resTaxReg: number;     // ставка резидентов ТОСЭР в бюджет края
  strategies: Set<StrategyId>;
  chemGrowth: number;    // g, доля в год (до 2030 г.; после — g/2)
  carbonPrice: number;   // руб./т CO₂ в 2030 г., рост 10 % в год
  mu: number;            // доля переданного CO₂ с вычетом (постоянное связывание/хранение)
  e2026: number;         // выбросы якоря в 2026 г., тыс. т CO₂-экв.
  dQ: number;            // прирост продаж CO₂ при полной реализации, тыс. т
  kappa: number;         // κ — выбросы при подготовке и использовании переданного CO₂
  r: number;             // ставка дисконтирования
}

export const BENEFICIARIES = [
  { id: 'gres', label: 'Невинномысская ГРЭС', level: 'Участники' },
  { id: 'azot', label: 'АО «Невинномысский Азот»', level: 'Участники' },
  { id: 'epp', label: 'Экопромышленный парк', level: 'Участники' },
  { id: 'res', label: 'Резиденты ТОСЭР', level: 'Участники' },
  { id: 'oper', label: 'Оператор платформы', level: 'Участники' },
  { id: 'fed', label: 'Федеральный бюджет', level: 'Бюджеты' },
  { id: 'krai', label: 'Бюджет Ставропольского края', level: 'Бюджеты' },
  { id: 'city', label: 'Бюджет г. Невинномысска', level: 'Бюджеты' },
  { id: 'eco', label: 'Экофонд (8 % дивиденда)', level: 'Целевые фонды' },
  { id: 'corp', label: 'Корпорация развития края', level: 'Целевые фонды' },
] as const;
export type BenId = typeof BENEFICIARIES[number]['id'];

const phiOf = (C: number, k: number) => 1 - Math.exp(-k * C);

export function kAt(kScenario: number, t: number) {
  return kScenario + Math.min(1, (t - 2026) / 10) * 2.5;      // как в симуляторе, после 2036 г. не растёт
}
export function cAt(inp: BenefInputs, t: number) {
  if (t >= inp.yearTarget) return inp.cTarget;
  const w = (t - 2026) / Math.max(1, inp.yearTarget - 2026);
  return inp.cStart + (inp.cTarget - inp.cStart) * w;
}

export function computeYear(inp: BenefInputs, t: number) {
  const k = kAt(inp.kScenario, t);
  const C = cAt(inp, t);
  const phi = C < 0.05 ? 0 : phiOf(C, k);
  const f = inp.flows;
  const ω = inp.omega;
  // Выигрыш обмена, реализованный при связности C (за вычетом аннуитетов узлов)
  const gross: Record<string, number> = {
    gres: ω * f.heatNet * phi,
    azot: ω * f.co2Net * phi,
    epp: ω * f.recycleNet * phi,
    res: ((1 - ω) * (f.heatNet + f.co2Net + f.recycleNet) + f.nvosNet) * phi,   // НВОС — у образователей отходов
  };
  const G = Object.values(gross).reduce((s, v) => s + v, 0);
  const dE = G - inp.platformCost;                                   // ΔE(t)
  const sd = inp.alpha * inp.mult * Math.max(0, dE);
  // Сервисный платёж и изъятие дивиденда — пропорционально выигрышу участников
  const firms = ['gres', 'azot', 'epp', 'res'];
  const base = firms.reduce((s, id) => s + Math.abs(gross[id]), 0) || 1;
  const beta = 0.45 * phi + 0.25 * (1 - phi);
  const rest = Math.max(0, 1 - beta - 0.08);
  const rw = inp.regimeWeights;
  const rwSum = rw.operator + rw.suppliers + rw.corporation;
  const sh = { city: beta, eco: 0.08, oper: rest * rw.operator / rwSum, sup: rest * rw.suppliers / rwSum, corp: rest * rw.corporation / rwSum };
  const supBase = (gross.gres + gross.azot + gross.epp) || 1;

  const torEnd = inp.strategies.has('tor') ? 2032 : 2027;
  const resTaxed = t <= torEnd;
  const pre: Record<string, number> = {};
  const rows: Record<BenId, { gain: number; fee: number; div: number; tax: number; transfer: number; net: number }> = {} as never;
  const blank = () => ({ gain: 0, fee: 0, div: 0, tax: 0, transfer: 0, net: 0 });
  BENEFICIARIES.forEach((b) => { rows[b.id] = blank(); });

  firms.forEach((id) => {
    const w = Math.abs(gross[id]) / base;
    rows[id as BenId].gain = gross[id];
    rows[id as BenId].fee = -inp.platformCost * w;
    let d = -sd * w;
    if (id !== 'res') d += sd * sh.sup * (gross[id] / supBase);
    rows[id as BenId].div = d;
  });
  rows.oper.div = sd * sh.oper;
  rows.city.div = sd * sh.city;
  rows.eco.div = sd * sh.eco;
  rows.corp.div = sd * sh.corp;

  // Компенсация σ и межбюджетный трансферт
  const sigmaPay = inp.sigma * inp.connCost;
  rows.res.transfer += sigmaPay;
  rows.krai.transfer -= sigmaPay;
  const bExt = inp.bExt + (inp.strategies.has('krai') && t >= 2028 ? inp.bExtKrai : 0);
  rows.krai.transfer -= bExt;
  rows.city.transfer += bExt;
  // Плата за НВОС: предприятия её не платят, бюджет её не получает
  const nvos = f.nvosNet * phi;
  rows.city.transfer -= nvos * inp.nvosCityShare;
  rows.krai.transfer -= nvos * (1 - inp.nvosCityShare);

  // Налог на прибыль с прироста прибыли (убыток налога не создаёт)
  [...firms, 'oper'].forEach((id) => {
    const r = rows[id as BenId];
    const profit = r.gain + r.fee + r.div + (id === 'res' ? r.transfer : 0);
    pre[id] = profit;
    if (profit <= 0) return;
    const isRes = id === 'res';
    const fedRate = isRes && resTaxed ? 0 : 0.08;
    const regRate = isRes && resTaxed ? inp.resTaxReg : 0.17;
    r.tax = -profit * (fedRate + regRate);
    rows.fed.tax += profit * fedRate;
    rows.krai.tax += profit * regRate;
  });

  BENEFICIARIES.forEach((b) => {
    const r = rows[b.id];
    r.net = r.gain + r.fee + r.div + r.tax + r.transfer;
  });
  const total = BENEFICIARIES.reduce((s, b) => s + rows[b.id].net, 0);
  const expected = dE - nvos;

  // Ущерб: бюджет города + экофонд против C_ликв (рост 0,5 млн руб. в год, как в симуляторе)
  const cLiq = inp.cLiq + (t - 2026) * 0.5;
  const ecoCover = rows.city.div + rows.eco.div + bExt;

  return { t, k, C, phi, G, dE, sd, nvos, rows, total, expected, balanceOk: Math.abs(total - expected) < 1e-6, cLiq, ecoCover, bExt };
}

export function computeHorizon(inp: BenefInputs, from = 2026, to = 2040) {
  const years = [];
  for (let t = from; t <= to; t++) years.push(computeYear(inp, t));
  const npv: Record<BenId, number> = {} as never;
  BENEFICIARIES.forEach((b) => {
    npv[b.id] = years.reduce((s, y) => s + y.rows[b.id].net / Math.pow(1 + inp.r, y.t - from), 0);
  });
  const npvTotal = Object.values(npv).reduce((s, v) => s + v, 0);
  return { years, npv, npvTotal };
}

// Выбросы якоря: стратегический рост выпуска и передача CO₂ платформой
export function emissionsPath(inp: BenefInputs, withChem: boolean, withPlatform: boolean, from = 2026, to = 2040) {
  const out: { t: number; E: number; Q: number; u: number; carbonCost: number }[] = [];
  let Q = 1;
  for (let t = from; t <= to; t++) {
    if (t > from && withChem) Q *= 1 + (t <= 2030 ? inp.chemGrowth : inp.chemGrowth / 2);
    const Eraw = inp.e2026 * Q;
    const phi = phiOf(cAt(inp, t), kAt(inp.kScenario, t));
    const phiT = phiOf(inp.cTarget, kAt(inp.kScenario, inp.yearTarget));
    const dQt = withPlatform ? inp.dQ * Math.min(1, phi / Math.max(phiT, 1e-9)) : 0;
    const u = dQt / Eraw;
    const E = Eraw * (1 - u * (1 - inp.kappa));                    // (3.28) без отдачи, вызванной самим симбиозом
    const pC = inp.strategies.has('lowcarbon') && t >= 2030 ? inp.carbonPrice * Math.pow(1.1, t - 2030) : 0;
    const carbonCost = (E - inp.mu * dQt) * pC / 1000;             // млн руб.: тыс. т × руб./т / 1000
    out.push({ t, E, Q, u, carbonCost });
  }
  return out;
}

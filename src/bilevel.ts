// Двухуровневая модель равновесной связности экосистемы с якорным предприятием (§ 3.2).
// Нижний уровень — решение резидента об участии (3.15)–(3.17), равновесие (3.18);
// верхний уровень — выбор механизма θ, цена закрытия разрыва (3.19)–(3.23);
// эффект отдачи якоря (3.28)–(3.30); сравнение моделей поведения и механизмов.
//
// Популяция резидентов ДЕМОНСТРАЦИОННАЯ (класс C): типы A–D по табл. 2.12,
// диапазоны выигрыша в цене и затрат участия — по § 2.6.2. Заменяется реестром
// платформы после обследования участников (§ 3.3).
//
// Редакция 15.10.2026:
//  • одно значение k для SD(C) и Π(C);
//  • затраты платформы Z_пл постоянны и на φ не умножаются: SD(C) = α·max(0; φ·ΣE − Z_пл);
//  • дивиденд резидента нормируется на потенциальный эффект ВСЕЙ группы (2.20′),
//    доля неподключённых остаётся в резерве — размывания нет, Γ(C) не убывает (условие Тарского).

export type ResType = 'A' | 'B' | 'C' | 'D';

export interface Resident {
  id: number;
  type: ResType;
  n: number;       // n_j — число допустимых связей с участием резидента
  gBar: number;    // ḡ_j — выигрыш в цене обмена при зрелой сети, млн руб./год
  a: number;       // доля выигрыша в цене, доступная уже в двусторонней сделке
  c: number;       // c_j — годовые затраты подключения, млн руб.
  lambda: number;  // λ_j — доля продаж якорю в выручке инвестпроекта
  m: number;       // m_j — доля маржинального дохода
  fc: number;      // FC_j / R_j^пр
}

export const TYPE_INFO: Record<ResType, { label: string; count: number }> = {
  A: { label: 'Естественные партнёры', count: 6 },
  B: { label: 'Партнёры-конкуренты', count: 10 },
  C: { label: 'Осторожные', count: 10 },
  D: { label: 'Безразличные', count: 26 },
};

// Детерминированный генератор, чтобы популяция и испытания воспроизводились
export function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function makePopulation(): Resident[] {
  const r = lcg(2027);
  const u = (lo: number, hi: number) => lo + (hi - lo) * r();
  const out: Resident[] = [];
  let id = 1;
  // резиденты-поставщики якоря: λ_j, m_j, FC_j/R_j
  const sellersB = [[0.35, 0.25, 0.15], [0.45, 0.40, 0.12], [0.55, 0.30, 0.10], [0.62, 0.35, 0.14]];
  const sellersC = [[0.40, 0.22, 0.12], [0.70, 0.40, 0.12]];
  (['A', 'B', 'C', 'D'] as ResType[]).forEach((t) => {
    for (let i = 0; i < TYPE_INFO[t].count; i++) {
      let res: Resident;
      if (t === 'A') res = { id, type: t, n: 2, gBar: u(2.0, 5.0), a: 0.5, c: u(0.3, 0.5), lambda: 0, m: 0, fc: 0 };
      else if (t === 'B') res = { id, type: t, n: i % 2 === 0 ? 2 : 1, gBar: u(0.5, 1.4), a: 0.2, c: u(0.3, 0.5), lambda: 0, m: 0, fc: 0 };
      else if (t === 'C') res = { id, type: t, n: 1, gBar: u(0.6, 1.3), a: 0.2, c: u(0.9, 1.6), lambda: 0, m: 0, fc: 0 };
      else res = { id, type: t, n: 1, gBar: u(0, 0.08), a: 0.2, c: u(0.3, 0.6), lambda: 0, m: 0, fc: 0 };
      if (t === 'B' && i < sellersB.length) [res.lambda, res.m, res.fc] = sellersB[i];
      if (t === 'C' && i < sellersC.length) [res.lambda, res.m, res.fc] = sellersC[i];
      out.push(res);
      id++;
    }
  });
  return out;
}

// Возмущённая копия популяции для испытаний Монте-Карло: множители выигрыша и затрат
export function perturbPopulation(pop: Resident[], rnd: () => number, spread = 0.25): Resident[] {
  return pop.map((j) => ({
    ...j,
    gBar: j.gBar * (1 - spread + 2 * spread * rnd()),
    c: j.c * (1 - spread + 2 * spread * rnd()),
  }));
}

export const N_DOP = 130; // N_доп — число допустимых связей (2.3), демонстрационное значение

// Параметры Π(C) главы 2 (2.12)–(2.13); k берётся тот же, что и в SD(C)
export const PI = { G: 400, T0: 30, tauPlatform: 1200, tauNone: 2000 };

export const phiOf = (C: number, k: number) => 1 - Math.exp(-k * C);

export function piOf(C: number, k: number, tau: number) {
  return PI.G * phiOf(C, k) - PI.T0 - tau * C * C;   // (2.12)
}

// C* из (2.13): G·k·e^(−kC) = 2τC, решение бисекцией
export function cStar(k: number, tau: number) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const f = PI.G * k * Math.exp(-k * mid) - 2 * tau * mid;
    if (f > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ─── Механизмы верхнего уровня ───
export type MechId = 'none' | 'coord' | 'divA' | 'divB' | 'divC' | 'sigma' | 'trust';
export type BehaviorId = 'myopic' | 'farsighted' | 'learning' | 'imitation' | 'planner';

export const MECHS: { id: MechId; label: string; note: string }[] = [
  { id: 'none', label: 'Без платформы', note: 'k − 2, τ = 2000, дивиденда нет, Z_пл = 0' },
  { id: 'coord', label: 'Координация без дивиденда', note: 'платформа, α = 0' },
  { id: 'divA', label: 'Дивиденд, схема А', note: 'постоянные доли: резиденты 0,25, публичный партнёр 0,30' },
  { id: 'divB', label: 'Дивиденд, схема Б', note: 'γ_гос(C) убывает с φ (2.17)' },
  { id: 'divC', label: 'Дивиденд, схема В', note: 'β(C) растёт с φ (2.18), экофонд 0,08' },
  { id: 'sigma', label: 'Компенсация σ = 0,3', note: 'схема А + 30 % затрат подключения из бюджета' },
  { id: 'trust', label: 'Доверительное управление данными', note: 'схема А; c_j типов B и C × 0,7; 3 млн руб./год' },
];

export const BEHAVIORS: { id: BehaviorId; label: string; note: string }[] = [
  { id: 'myopic', label: 'Близорукий порог', note: 'входит при U_j(C) ≥ 0 (3.15)' },
  { id: 'farsighted', label: 'Дальновидный', note: 'оценивает U_j при ожидаемом росте сети на 0,05' },
  { id: 'learning', label: 'Обучение', note: 'k растёт с долей честных исходов: k + 4·C' },
  { id: 'imitation', label: 'Подражание', note: 'порог затрат снижается на 40 % доли своего типа в сети' },
  { id: 'planner', label: 'Планировщик (эталон)', note: 'C = C*, без учёта стимулов' },
];

export interface Context {
  k: number;            // k(t) с вкладки «Симуляция»
  alpha: number;        // α
  mult: number;         // множитель режима распределения M
  flowsNet: number;     // Σ чистых вкладов потоков при φ = 1, млн руб. (187,1 по табл. 2.6)
  platformCost: number; // Z_пл, млн руб./год (69,6)
  lambdaBar: number;    // λ̄
  cLiq: number;         // C_ликв
}

export interface Theta {
  mech: MechId;
  behavior: BehaviorId;
  sigma: number;        // доля затрат подключения из бюджета
  ctx: Context;
}

// Параметры, которые задаёт механизм
export function mechParams(th: Theta) {
  const { ctx } = th;
  const none = th.mech === 'none';
  const k = none ? Math.max(1, ctx.k - 2) : ctx.k;
  const tau = none ? PI.tauNone : PI.tauPlatform;
  const alpha = none || th.mech === 'coord' ? 0 : ctx.alpha;
  const sigma = th.mech === 'sigma' ? Math.max(0.3, th.sigma) : th.sigma;
  const platformCost = none ? 0 : ctx.platformCost;
  const trustCost = th.mech === 'trust' ? 3 : 0;
  return { k, tau, alpha, sigma, platformCost, trustCost };
}

// Доли получателей дивиденда по схемам (2.16)–(2.18)
export function shares(mech: MechId, phi: number) {
  if (mech === 'divB') {
    const gov = 0.15 + 0.25 * (1 - phi);
    return { res: (1 - gov) * 0.25 / 0.70, pub: gov };
  }
  if (mech === 'divC') {
    const beta = 0.45 * phi + 0.25 * (1 - phi);
    return { res: (1 - beta - 0.08) * 0.15 / 0.52, pub: beta };
  }
  return { res: 0.25, pub: 0.30 }; // схема А (и механизмы на её основе)
}

export function sdOf(C: number, th: Theta, kOverride?: number) {
  const mp = mechParams(th);
  const k = kOverride ?? mp.k;
  const dE = th.ctx.flowsNet * phiOf(C, k) - mp.platformCost;   // ΔE(t), затраты платформы постоянны
  return { sd: mp.alpha * th.ctx.mult * Math.max(0, dE), dE };
}

const effK = (C: number, th: Theta) => {
  const k = mechParams(th).k;
  return th.behavior === 'learning' ? Math.min(k + 4 * C, 9) : k;
};

// U_j(C; θ), формула (3.15), с дивидендом по правилу (2.20′)
export function utility(j: Resident, C: number, th: Theta, pop: Resident[], peerShare = 0) {
  const Ce = th.behavior === 'farsighted' ? Math.min(1, C + 0.05) : C;
  const k = effK(Ce, th);
  const phi = phiOf(Ce, k);
  const e = (r: Resident) => r.gBar * (r.a + (1 - r.a) * phi);
  const g = e(j);
  const { sd } = sdOf(Ce, th, k);
  const eAll = pop.reduce((s, r) => s + e(r), 0);           // потенциальный эффект всей группы
  const div = shares(th.mech, phi).res * sd * (g / Math.max(eAll, 1e-9));
  const mp = mechParams(th);
  let c = j.c;
  if (th.mech === 'trust' && (j.type === 'B' || j.type === 'C')) c *= 0.7;
  if (th.behavior === 'imitation') c *= 1 - 0.4 * peerShare;
  return { U: g + div - (1 - mp.sigma) * c, g, div, cEff: (1 - mp.sigma) * c };
}

const admissible = (j: Resident, th: Theta) => j.lambda <= th.ctx.lambdaBar;

// Γ(C; θ), формула (3.17); для подражания нужен состав участников предыдущего шага
export function gammaMap(pop: Resident[], C: number, th: Theta, prev?: Set<number>) {
  const typeShare: Record<string, number> = {};
  if (th.behavior === 'imitation') {
    (['A', 'B', 'C', 'D'] as ResType[]).forEach((t) => {
      const all = pop.filter((j) => j.type === t);
      typeShare[t] = prev ? all.filter((j) => prev.has(j.id)).length / all.length : 0;
    });
  }
  let links = 0;
  const part = new Set<number>();
  for (const j of pop) {
    if (!admissible(j, th)) continue;                                  // (3.16)
    if (utility(j, C, th, pop, typeShare[j.type] ?? 0).U >= 0) { links += j.n; part.add(j.id); }
  }
  return { C: links / N_DOP, part };
}

// C** — наименьшая неподвижная точка (3.18): итерация из C = 0
export function equilibrium(pop: Resident[], th: Theta) {
  const mp = mechParams(th);
  if (th.behavior === 'planner') {
    const C = cStar(mp.k, mp.tau);
    return { C, path: [0, C], part: [] as Resident[], excludedLambda: pop.filter((j) => !admissible(j, th)), Z: 0, costSum: 0 };
  }
  let C = 0;
  let prev: Set<number> | undefined;
  const path: number[] = [0];
  for (let i = 0; i < 300; i++) {
    const nx = gammaMap(pop, C, th, prev);
    path.push(nx.C);
    prev = nx.part;
    if (Math.abs(nx.C - C) < 1e-9) { C = nx.C; break; }
    C = nx.C;
  }
  const part = pop.filter((j) => prev?.has(j.id));
  const excludedLambda = pop.filter((j) => !admissible(j, th));
  const costSum = part.reduce((s, j) => s + j.c * (th.mech === 'trust' && (j.type === 'B' || j.type === 'C') ? 0.7 : 1), 0);
  return { C, path, part, excludedLambda, Z: mp.sigma * costSum + mp.trustCost, costSum };
}

// Итоги механизма при равновесии: W (3.20), бюджет (3.21)
export function evaluate(pop: Resident[], th: Theta) {
  const mp = mechParams(th);
  const eq = equilibrium(pop, th);
  const pi = piOf(eq.C, mp.k, mp.tau);
  const phi = phiOf(eq.C, mp.k);
  const { sd, dE } = sdOf(eq.C, th);
  const pub = shares(th.mech, phi).pub * sd;
  return { ...eq, pi, W: pi - eq.Z, sd, dE, pub, gap: Math.max(0, th.ctx.cLiq - pub), phi, cs: cStar(mp.k, mp.tau) };
}

// Проверка монотонности Γ на сетке (условие теоремы Тарского)
export function monotoneCheck(pop: Resident[], th: Theta) {
  if (th.behavior === 'imitation' || th.behavior === 'planner') return { ok: true, worst: 0 };
  let last = -1, worst = 0;
  for (let c = 0; c <= 0.6001; c += 0.005) {
    const g = gammaMap(pop, c, th).C;
    if (last >= 0 && g < last) worst = Math.max(worst, last - g);
    last = g;
  }
  return { ok: worst < 1e-12, worst };
}

// Z_min(C̃), формула (3.22): самый дешёвый σ, при котором C** ≥ C̃
export function zMinCurve(pop: Resident[], th: Theta, cFrom: number, cTo: number) {
  const mp = mechParams(th);
  const sigmas: { sigma: number; C: number; Z: number }[] = [];
  for (let s = 0; s <= 1.0001; s += 0.01) {
    const e = equilibrium(pop, { ...th, sigma: s, mech: th.mech === 'sigma' ? 'divA' : th.mech });
    sigmas.push({ sigma: s, C: e.C, Z: s * e.costSum + mp.trustCost });
  }
  const rows: { c: number; zmin: number | null; sigma: number | null; pi: number; net: number | null }[] = [];
  const step = 0.005;
  for (let c = cFrom; c <= cTo + 1e-9; c += step) {
    let best: { Z: number; sigma: number } | null = null;
    for (const s of sigmas) {
      if (s.C >= c - 1e-9 && (!best || s.Z < best.Z)) best = { Z: s.Z, sigma: s.sigma };
    }
    const pi = piOf(c, mp.k, mp.tau);
    rows.push({ c, zmin: best ? best.Z : null, sigma: best ? best.sigma : null, pi, net: best ? pi - best.Z : null });
  }
  let hat = rows[0];
  for (const r of rows) if (r.net !== null && (hat.net === null || r.net > hat.net)) hat = r;   // Ĉ, (3.23)
  return { rows, hat, sigmas };
}

// Сравнение «поведение × механизм» на одной популяции
export function compareMatrix(pop: Resident[], ctx: Context, sigma = 0) {
  return BEHAVIORS.map((b) => MECHS.map((m) => evaluate(pop, { mech: m.id, behavior: b.id, sigma, ctx })));
}

// Монте-Карло: доля испытаний, в которых механизм даёт наибольший W при данном поведении
export function monteCarlo(base: Resident[], ctx: Context, n = 200, seed = 15) {
  const rnd = lcg(seed);
  const wins = BEHAVIORS.map(() => MECHS.map(() => 0));
  const sumW = BEHAVIORS.map(() => MECHS.map(() => 0));
  for (let t = 0; t < n; t++) {
    const pop = perturbPopulation(base, rnd);
    const c2: Context = {
      ...ctx,
      k: Math.max(2, ctx.k + (rnd() * 2 - 1)),                 // k ± 1
      flowsNet: ctx.flowsNet * (0.8 + 0.4 * rnd()),            // ±20 %
      platformCost: ctx.platformCost * (0.8 + 0.4 * rnd()),
    };
    BEHAVIORS.forEach((b, bi) => {
      if (b.id === 'planner') return;
      const Ws = MECHS.map((m) => evaluate(pop, { mech: m.id, behavior: b.id, sigma: 0, ctx: c2 }).W);
      Ws.forEach((W, mi) => { sumW[bi][mi] += W; });
      const best = Math.max(...Ws);
      const tied = Ws.map((W, mi) => (W >= best - 1e-6 ? mi : -1)).filter((mi) => mi >= 0);
      tied.forEach((mi) => { wins[bi][mi] += 1 / tied.length; });   // ничья делится поровну
    });
  }
  return { n, share: wins.map((r) => r.map((w) => w / n)), meanW: sumW.map((r) => r.map((w) => w / n)) };
}

// Эффект отдачи, формулы (3.28)–(3.29)
export function rebound(eps: number, Q0: number, dQshare: number, u: number, kappa: number) {
  const dQ = Q0 * dQshare;
  const dEm = eps * ((Q0 + dQ) * (1 - u * (1 - kappa)) - Q0);
  const lhs = u * (1 - kappa);
  const rhs = dQ / (Q0 + dQ);
  const threshold = lhs / (1 - lhs);  // предельный прирост выпуска ΔQ/Q0, при котором ΔEm = 0
  return { dEm, lhs, rhs, ok: lhs > rhs, threshold };
}

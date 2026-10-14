// Двухуровневая модель равновесной связности экосистемы с якорным предприятием (§ 3.2).
// Нижний уровень — решение резидента об участии (3.15)–(3.17), равновесие (3.18);
// верхний уровень — выбор механизма θ, цена закрытия разрыва (3.19)–(3.23);
// эффект отдачи якоря (3.28)–(3.30).
//
// Популяция резидентов ДЕМОНСТРАЦИОННАЯ (класс C): типы A–D по табл. 2.12,
// диапазоны выигрыша в цене и затрат участия — по § 2.6.2. Заменяется реестром
// платформы после обследования участников (§ 3.3).

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

// Детерминированный генератор, чтобы популяция не менялась между запусками
function lcg(seed: number) {
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

export const N_DOP = 130; // N_доп — число допустимых связей (2.3), демонстрационное значение

// Параметры Π(C) главы 2 (2.12)–(2.13), режим «с платформой»
export const PI = { G: 400, T0: 30, tau: 1200, k: 7 };

export const phiOf = (C: number, k: number) => 1 - Math.exp(-k * C);

export function piOf(C: number, p = PI) {
  return p.G * phiOf(C, p.k) - p.T0 - p.tau * C * C;   // (2.12)
}

// C* из (2.13): G·k·e^(−kC) = 2τC, решение бисекцией
export function cStar(p = PI) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const f = p.G * p.k * Math.exp(-p.k * mid) - 2 * p.tau * mid;
    if (f > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface Theta {
  alpha: number;        // α
  sigma: number;        // σ — доля затрат подключения, компенсируемая публичным партнёром
  lambdaBar: number;    // λ̄ — предел ТОСЭР
  k: number;            // k(t) симулятора
  deltaEBase: number;   // ΔE_base, млн руб.
  gammaRes: (phi: number) => number; // доля группы резидентов в дивиденде
  mult?: number;        // множитель режима распределения M (как в симуляторе)
}

// U_j(C; θ), формула (3.15)
export function utility(j: Resident, C: number, th: Theta) {
  const phi = phiOf(C, th.k);
  const g = j.gBar * (j.a + (1 - j.a) * phi);
  const sd = Math.max(0, th.alpha * th.deltaEBase * phi * (th.mult ?? 1)); // (2.11)
  const w = j.n / Math.max(j.n, C * N_DOP);                         // вес в группе участников
  const div = w * th.gammaRes(phi) * sd;
  return { U: g + div - (1 - th.sigma) * j.c, g, div };
}

// Γ(C; θ), формула (3.17)
export function gammaMap(pop: Resident[], C: number, th: Theta) {
  let links = 0;
  for (const j of pop) {
    if (j.lambda > th.lambdaBar) continue;                          // (3.16)
    if (utility(j, C, th).U >= 0) links += j.n;
  }
  return links / N_DOP;
}

// C** — наименьшая неподвижная точка (3.18): итерация из C = 0
export function equilibrium(pop: Resident[], th: Theta) {
  let C = 0;
  const path: number[] = [0];
  for (let i = 0; i < 300; i++) {
    const next = gammaMap(pop, C, th);
    path.push(next);
    if (Math.abs(next - C) < 1e-9) { C = next; break; }
    C = next;
  }
  const part = pop.filter((j) => j.lambda <= th.lambdaBar && utility(j, C, th).U >= 0);
  const excludedLambda = pop.filter((j) => j.lambda > th.lambdaBar);
  const costSum = part.reduce((s, j) => s + j.c, 0);
  return { C, path, part, excludedLambda, Z: th.sigma * costSum, costSum };
}

// Z_min(C̃), формула (3.22): самый дешёвый σ, при котором C** ≥ C̃
export function zMinCurve(pop: Resident[], th: Theta, cFrom: number, cTo: number) {
  const sigmas: { sigma: number; C: number; Z: number }[] = [];
  for (let s = 0; s <= 1.0001; s += 0.01) {
    const e = equilibrium(pop, { ...th, sigma: s });
    sigmas.push({ sigma: s, C: e.C, Z: e.Z });
  }
  const rows: { c: number; zmin: number | null; sigma: number | null; pi: number; net: number | null }[] = [];
  const step = 0.005;
  for (let c = cFrom; c <= cTo + 1e-9; c += step) {
    let best: { Z: number; sigma: number } | null = null;
    for (const s of sigmas) {
      if (s.C >= c - 1e-9 && (!best || s.Z < best.Z)) best = { Z: s.Z, sigma: s.sigma };
    }
    const pi = piOf(c);
    rows.push({ c, zmin: best ? best.Z : null, sigma: best ? best.sigma : null, pi, net: best ? pi - best.Z : null });
  }
  // Ĉ, формула (3.23)
  let hat = rows[0];
  for (const r of rows) if (r.net !== null && (hat.net === null || r.net > hat.net)) hat = r;
  return { rows, hat, sigmas };
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

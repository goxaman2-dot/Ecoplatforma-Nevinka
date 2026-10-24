// Расчёты для страниц тезисов Н1–Н6: результат, интервал 5–95 % и чувствительность.
// Используются функции ядра без изменений; разброс параметров — как в Монте-Карло главы 3:
// k ± 1, вклады потоков и затраты платформы ± 20 %, выигрыш и затраты резидентов ± 25 %.

import { CALIB, calcMetrics } from './core';
import { BASE_PARAMS } from './selfcheck';
import {
  makePopulation, perturbPopulation, equilibrium, evaluate, zMinCurve, monteCarlo, lcg,
  cStar, PI, type Context, type Resident, type MechId,
} from './bilevel';
import { computeYear, type BenefInputs } from './beneficiaries';

export const POP = makePopulation();

export function baseCtx(year = 2027): Context {
  const m = calcMetrics({ ...BASE_PARAMS, year });
  return { k: m.k, alpha: 0.10, mult: 1, flowsNet: m.flowsNetSum, platformCost: m.flows.platformCost, lambdaBar: CALIB.lambdaBar, cLiq: 15.5 };
}

export const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)));
  return s[i];
};
export interface Interval { mid: number; lo: number; hi: number; n: number }
const interval = (base: number, xs: number[]): Interval => ({ mid: base, lo: pct(xs, 0.05), hi: pct(xs, 0.95), n: xs.length });

export interface TornadoRow { factor: string; low: number; high: number; lowLabel: string; highLabel: string }

const scaleCost = (pop: Resident[], f: number) => pop.map((j) => ({ ...j, c: j.c * f }));
const perturbCtx = (ctx: Context, rnd: () => number): Context => ({
  ...ctx,
  k: Math.max(2, ctx.k + (rnd() * 2 - 1)),
  flowsNet: ctx.flowsNet * (0.8 + 0.4 * rnd()),
  platformCost: ctx.platformCost * (0.8 + 0.4 * rnd()),
});

// ── Н1: равновесная связность и разрыв ──
export function n1(ctx: Context, mech: MechId, sigma: number, n = 300) {
  const th = { mech, behavior: 'myopic' as const, sigma, ctx };
  const ev = evaluate(POP, th);
  const rnd = lcg(31);
  const cs: number[] = [], gaps: number[] = [];
  for (let i = 0; i < n; i++) {
    const c2 = perturbCtx(ctx, rnd);
    const e = evaluate(perturbPopulation(POP, rnd), { ...th, ctx: c2 });
    cs.push(e.C); gaps.push(e.cs - e.C);
  }
  const at = (c: Context, pop = POP) => equilibrium(pop, { ...th, ctx: c }).C;
  const tornado: TornadoRow[] = [
    { factor: 'k (институциональная среда)', low: at({ ...ctx, k: ctx.k - 1 }), high: at({ ...ctx, k: ctx.k + 1 }), lowLabel: '−1', highLabel: '+1' },
    { factor: 'Σ вкладов потоков', low: at({ ...ctx, flowsNet: ctx.flowsNet * 0.8 }), high: at({ ...ctx, flowsNet: ctx.flowsNet * 1.2 }), lowLabel: '−20 %', highLabel: '+20 %' },
    { factor: 'Затраты платформы Z_пл', low: at({ ...ctx, platformCost: ctx.platformCost * 1.2 }), high: at({ ...ctx, platformCost: ctx.platformCost * 0.8 }), lowLabel: '+20 %', highLabel: '−20 %' },
    { factor: 'Затраты подключения c_j', low: at(ctx, scaleCost(POP, 1.25)), high: at(ctx, scaleCost(POP, 0.75)), lowLabel: '+25 %', highLabel: '−25 %' },
    { factor: 'α (доля дивиденда)', low: at({ ...ctx, alpha: 0.08 }), high: at({ ...ctx, alpha: 0.12 }), lowLabel: '0,08', highLabel: '0,12' },
  ];
  return { ev, C: interval(ev.C, cs), gap: interval(ev.cs - ev.C, gaps), tornado, base: ev.C };
}

// ── Н2: цена закрытия разрыва и целевая связность ──
export function n2(ctx: Context, n = 40) {
  const th = { mech: 'divA' as MechId, behavior: 'myopic' as const, sigma: 0, ctx };
  const run = (c: Context, pop = POP) => {
    const e0 = equilibrium(pop, { ...th, ctx: c });
    const cs = cStar(c.k, PI.tauPlatform);
    const cur = zMinCurve(pop, { ...th, ctx: c }, e0.C, Math.max(cs, e0.C));
    const last = cur.rows[cur.rows.length - 1];
    return { hat: cur.hat.c, zFull: last && last.zmin !== null ? last.zmin : NaN, cur, cs, c0: e0.C };
  };
  const base = run(ctx);
  const rnd = lcg(47);
  const hats: number[] = [], zs: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = run(perturbCtx(ctx, rnd), perturbPopulation(POP, rnd));
    hats.push(r.hat); if (Number.isFinite(r.zFull)) zs.push(r.zFull);
  }
  const tz = (c: Context, pop = POP) => run(c, pop).hat;
  const tornado: TornadoRow[] = [
    { factor: 'k (институциональная среда)', low: tz({ ...ctx, k: ctx.k - 1 }), high: tz({ ...ctx, k: ctx.k + 1 }), lowLabel: '−1', highLabel: '+1' },
    { factor: 'Σ вкладов потоков', low: tz({ ...ctx, flowsNet: ctx.flowsNet * 0.8 }), high: tz({ ...ctx, flowsNet: ctx.flowsNet * 1.2 }), lowLabel: '−20 %', highLabel: '+20 %' },
    { factor: 'Затраты подключения c_j', low: tz(ctx, scaleCost(POP, 1.25)), high: tz(ctx, scaleCost(POP, 0.75)), lowLabel: '+25 %', highLabel: '−25 %' },
  ];
  return { base, hat: interval(base.hat, hats), zFull: interval(base.zFull, zs), tornado };
}

// ── Н3: доля якоря по Шепли с риском и критическая доля λ*_j ──
export function n3(piA: number) {
  const m = calcMetrics(BASE_PARAMS);
  const share = (p: number, dE = m.deltaE_base) => (1 - p) * CALIB.anchorShapley * dE;
  const sellers = POP.filter((j) => j.lambda > 0).map((j) => ({ id: j.id, type: j.type, lambda: j.lambda, lamStar: Math.max(0, 1 - j.fc / j.m) }));
  const tornado: TornadoRow[] = [
    { factor: 'π_A (риск остановки)', low: share(0.094), high: share(0.028), lowLabel: '0,094', highLabel: '0,028' },
    { factor: 'ΔE при φ = 1', low: share(piA, m.deltaE_base * 0.8), high: share(piA, m.deltaE_base * 1.2), lowLabel: '−20 %', highLabel: '+20 %' },
  ];
  return {
    share: { mid: share(piA), lo: share(0.094), hi: share(0.028), n: 0 } as Interval,
    noRisk: CALIB.anchorShapley * m.deltaE_base, sellers, tornado, base: share(piA),
    outside: sellers.filter((s) => s.lamStar < 0.45 || s.lamStar > 0.55).length,
  };
}

// ── Н4: порог окупаемости платформы ──
export function cMinOf(flowsNet: number, platformCost: number, k: number) {
  return flowsNet > platformCost ? -Math.log(1 - platformCost / flowsNet) / k : Infinity;
}
export function n4(year: number, n = 2000) {
  const m = calcMetrics({ ...BASE_PARAMS, year });
  const base = cMinOf(m.flowsNetSum, m.flows.platformCost, m.k);
  const rnd = lcg(53);
  const xs: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = cMinOf(m.flowsNetSum * (0.8 + 0.4 * rnd()), m.flows.platformCost * (0.8 + 0.4 * rnd()), Math.max(2, m.k + (rnd() * 2 - 1)));
    if (Number.isFinite(v)) xs.push(v);
  }
  const tornado: TornadoRow[] = [
    { factor: 'k (институциональная среда)', low: cMinOf(m.flowsNetSum, m.flows.platformCost, m.k + 1), high: cMinOf(m.flowsNetSum, m.flows.platformCost, m.k - 1), lowLabel: '+1', highLabel: '−1' },
    { factor: 'Σ вкладов потоков', low: cMinOf(m.flowsNetSum * 1.2, m.flows.platformCost, m.k), high: cMinOf(m.flowsNetSum * 0.8, m.flows.platformCost, m.k), lowLabel: '+20 %', highLabel: '−20 %' },
    { factor: 'Затраты платформы Z_пл', low: cMinOf(m.flowsNetSum, m.flows.platformCost * 0.8, m.k), high: cMinOf(m.flowsNetSum, m.flows.platformCost * 1.2, m.k), lowLabel: '−20 %', highLabel: '+20 %' },
  ];
  return { m, cMin: interval(base, xs), tornado, base };
}

// ── Н5: какой механизм выигрывает (Монте-Карло главы 3, 200 испытаний) ──
export function n5(ctx: Context, n = 200) {
  const res = monteCarlo(POP, ctx, n, 15);
  const e2 = equilibrium(POP, { mech: 'divC', behavior: 'myopic', sigma: 0, ctx });
  const es = equilibrium(POP, { mech: 'sigma', behavior: 'myopic', sigma: 0.3, ctx });
  return { res, addSigma: es.part.length - e2.part.length, costSigma: es.Z, cP2: e2.C, cS: es.C };
}

// ── Н6: баланс бенефициаров и покрытие ущерба ──
export function benefInputs(year = 2030, over: Partial<BenefInputs> = {}): BenefInputs {
  const m = calcMetrics(BASE_PARAMS);
  return {
    kScenario: 5, cStart: 0.15, cTarget: 0.23, yearTarget: 2030,
    flows: { heatNet: m.flows.heatNet, co2Net: m.flows.co2Net, recycleNet: m.flows.recycleNet, nvosNet: m.flows.nvosNet },
    platformCost: m.flows.platformCost, alpha: 0.10, mult: 1,
    regimeWeights: { operator: 0.25, suppliers: 0.15, corporation: 0.12 },
    omega: 0.5, nvosCityShare: 0.6, sigma: 0, connCost: 6, bExt: 0, bExtKrai: 10, cLiq: 15.5,
    resTaxReg: 0.05, strategies: new Set(), chemGrowth: 0.02, carbonPrice: 1000, mu: 0, e2026: 0, dQ: 12, kappa: 0.2, r: 0.10,
    ...over,
  };
}
// Покрытие C_ликв по условию (3.21) при равновесной связности: γ_пуб·SD(C**) / C_ликв (без B_внеш)
export function n6(year: number, mech: MechId = 'divC', n = 300) {
  const cLiq = 15.5 + (year - 2026) * 0.5;
  const ctx = { ...baseCtx(year), cLiq };
  const th = { mech, behavior: 'myopic' as const, sigma: 0, ctx };
  const ev = evaluate(POP, th);
  const rnd = lcg(61);
  const xs: number[] = [];
  for (let i = 0; i < n; i++) xs.push(evaluate(perturbPopulation(POP, rnd), { ...th, ctx: perturbCtx(ctx, rnd) }).pub / cLiq);
  const cov = (c: Context) => evaluate(POP, { ...th, ctx: c }).pub / cLiq;
  const tornado: TornadoRow[] = [
    { factor: 'α (доля дивиденда)', low: cov({ ...ctx, alpha: 0.08 }), high: cov({ ...ctx, alpha: 0.12 }), lowLabel: '0,08', highLabel: '0,12' },
    { factor: 'k (институциональная среда)', low: cov({ ...ctx, k: ctx.k - 1 }), high: cov({ ...ctx, k: ctx.k + 1 }), lowLabel: '−1', highLabel: '+1' },
    { factor: 'Σ вкладов потоков', low: cov({ ...ctx, flowsNet: ctx.flowsNet * 0.8 }), high: cov({ ...ctx, flowsNet: ctx.flowsNet * 1.2 }), lowLabel: '−20 %', highLabel: '+20 %' },
  ];
  const city = computeYear(benefInputs(year), year);
  return { ev, cLiq, cover: interval(ev.pub / cLiq, xs), tornado, base: ev.pub / cLiq, city };
}

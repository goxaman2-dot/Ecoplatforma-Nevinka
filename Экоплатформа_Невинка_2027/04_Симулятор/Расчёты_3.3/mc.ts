import { makePopulation, perturbPopulation, evaluate, lcg } from './bilevel';
import { calc } from './metrics';
const base = makePopulation();
const tri = (r: () => number, a: number, c: number, b: number) => { // a=min, c=mode, b=max
  const u = r(); const F = (c - a) / (b - a || 1);
  return u < F ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
};
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
type Res = Record<string, any>;
export function run(opts: { N: number; year: number; downDays?: number; switchShare?: number; seed?: number }) {
  const r = lcg(opts.seed ?? 2026);
  const mechs = ['coord', 'divC', 'sigma'] as const;
  const out: Record<string, { C: number[]; dE: number[]; dEexp: number[]; sd: number[]; pub: number[]; W: number[]; above: number[]; cmin: number[] }> = {};
  mechs.forEach(m => out[m] = { C: [], dE: [], dEexp: [], sd: [], pub: [], W: [], above: [], cmin: [] });
  for (let t = 0; t < opts.N; t++) {
    const pop = perturbPopulation(base, r, 0.25);
    const k0 = 4 + 2 * r();
    const a = tri(r, 0.3, 0.5, 0.7), dQ = tri(r, 8, 12, 15), pA = tri(r, 6000, 8000, 8000), cA = tri(r, 2000, 2000, 2500);
    const recV = tri(r, 20, 30, 40), recS = tri(r, 1000, 2000, 3000), nv = tri(r, 40, 60, 80);
    const capP = tri(r, 90, 120, 150), opP = tri(r, 20, 30, 40), dlP = tri(r, 10, 15, 20);
    const piA = tri(r, 0.028, 0.05, 0.094);
    const platMul = (capP * 0.2054 + opP + dlP) / (120 * 0.2054 + 45);
    const m = calc({ investment: 15, year: opts.year, kScenario: k0, alpha: 0.1, dQ, switchShare: opts.switchShare ?? 0, downDays: opts.downDays ?? 0,
      heatMul: a / 0.5, recMul: (recV / 30) * (recS / 2000), nvosMul: nv / 60, platMul, co2Price: pA, co2Cost: cA, piA });
    const ctx = { k: m.k, alpha: 0.1, mult: 1, flowsNet: m.flowsNetSum, platformCost: m.platformCost, lambdaBar: 0.5, cLiq: m.c_liq };
    for (const mech of mechs) {
      const e = evaluate(pop, { mech, behavior: 'myopic', sigma: 0, ctx });
      const phi = 1 - Math.exp(-m.k * e.C);
      const dEexp = (m.flowsNetSum - piA * m.flows.co2Gross) * phi - m.platformCost;
      const o = out[mech];
      o.C.push(e.C); o.dE.push(e.dE); o.dEexp.push(dEexp); o.sd.push(e.sd); o.pub.push(e.pub); o.W.push(e.W); o.above.push(e.C >= m.cMin ? 1 : 0); o.cmin.push(m.cMin);
    }
  }
  const summ: Res = {};
  for (const mech of mechs) {
    const o = out[mech];
    summ[mech] = { C: [mean(o.C), q(o.C, .05), q(o.C, .95)], dEexp: [mean(o.dEexp), q(o.dEexp, .05), q(o.dEexp, .95)], PdE: mean(o.dEexp.map(x => x > 0 ? 1 : 0)),
      Pabove: mean(o.above), cmin: [mean(o.cmin), q(o.cmin, .05), q(o.cmin, .95)], sd: [mean(o.sd), q(o.sd, .05), q(o.sd, .95)], pub: [mean(o.pub), q(o.pub, .05), q(o.pub, .95)], W: [mean(o.W), q(o.W, .05), q(o.W, .95)] };
  }
  return { summ, raw: out };
}
if (process.argv[2] === 'go') {
  const N = Number(process.argv[3] ?? 1000);
  const res: Res = {};
  for (const [name, o] of [['base2030', { year: 2030 }], ['base2027', { year: 2027 }], ['down30', { year: 2030, downDays: 30 }], ['down60', { year: 2030, downDays: 60 }], ['switch50', { year: 2030, switchShare: 0.5 }]] as const) {
    const t0 = Date.now(); const r = run({ N, ...(o as any) }); res[name] = r.summ;
    if (name === 'base2030') require('fs').writeFileSync('mc_raw_2030.json', JSON.stringify(r.raw));
    console.error(name, (Date.now() - t0) / 1000, 's');
  }
  require('fs').writeFileSync('mc.json', JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v, 1));
}

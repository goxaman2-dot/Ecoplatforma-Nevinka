import { makePopulation, evaluate, equilibrium, zMinCurve, cStar } from './bilevel';
import { calc } from './metrics';
const pop = makePopulation(); const R: any = {};
// состояния
R.states = [];
for (const year of [2027, 2036]) for (const c of [3, 8, 19]) { const m = calc({ investment: c, year, kScenario: 5, alpha: 0.1 });
  R.states.push({ year, C: c / 100, k: m.k, phi: m.phi, dE: m.deltaE_t, sd: m.sd, sdb: m.sd_budget, cmin: m.cMin, cliq: m.c_liq }); }
// кривые ΔE(C)
R.curves = {}; for (const year of [2027, 2036]) { const pts = []; for (let c = 0; c <= 30; c += 0.5) { const m = calc({ investment: c, year, kScenario: 5, alpha: 0.1 }); pts.push([c / 100, m.deltaE_t, m.phi]); } R.curves[year] = pts; }
// равновесия
R.eq = [];
for (const year of [2027, 2030, 2036]) { const m = calc({ investment: 15, year, kScenario: 5, alpha: 0.1 });
  const ctx = { k: m.k, alpha: 0.1, mult: 1, flowsNet: m.flowsNetSum, platformCost: m.platformCost, lambdaBar: 0.5, cLiq: m.c_liq };
  for (const mech of ['none', 'coord', 'divA', 'divC', 'sigma'] as const) { const e = evaluate(pop, { mech, behavior: 'myopic', sigma: 0, ctx });
    R.eq.push({ year, mech, C: e.C, n: e.part.length, links: Math.round(e.C * 130), cs: e.cs, gap: e.cs - e.C, phi: e.phi, dE: e.dE, sd: e.sd, pub: e.pub, Z: e.Z, need: e.gap, cliq: m.c_liq, cmin: m.cMin, types: ['A','B','C','D'].map(t => e.part.filter(j => j.type === t).length).join('/') }); }
  const z = zMinCurve(pop, { mech: 'divC', behavior: 'myopic', sigma: 0, ctx }, 0, 0.35);
  R['zmin' + year] = { chat: z.hat.c, zmin: z.hat.zmin, sigma: z.hat.sigma }; }
// информационный барьер
const m27 = calc({ investment: 15, year: 2027, kScenario: 5, alpha: 0.1 });
const ctx27 = { k: m27.k, alpha: 0.1, mult: 1, flowsNet: m27.flowsNetSum, platformCost: m27.platformCost, lambdaBar: 0.5, cLiq: m27.c_liq };
let xmin = null; for (let x = 0; x <= 4; x += 0.05) { const e = equilibrium(pop.map(j => ({ ...j, c: j.c + x })), { mech: 'none', behavior: 'myopic', sigma: 0, ctx: ctx27 }); if (e.C <= 1 / 130 + 1e-9) { xmin = x; break; } }
R.xmin = xmin;
const A = pop.filter(j => j.type === 'A'); R.typeA = { gMin: Math.min(...A.map(j => j.gBar * j.a)), gMax: Math.max(...A.map(j => j.gBar * j.a)), cMin: Math.min(...A.map(j => j.c)), cMax: Math.max(...A.map(j => j.c)) };
require('fs').writeFileSync('nums.json', JSON.stringify(R));
console.log(JSON.stringify({ states: R.states, eq: R.eq, z: [R.zmin2027, R.zmin2030, R.zmin2036], xmin, typeA: R.typeA }, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v));

import { makePopulation, gammaMap, evaluate, equilibrium, cStar } from './bilevel';
import { calc } from './metrics';
import { computeHorizon, emissionsPath, BENEFICIARIES } from './beneficiaries';
const pop = makePopulation();
const rows: any[] = [];
for (const mech of ['coord', 'divC', 'sigma'] as const) {
  let C = 0; let npv = 0, npvExp = 0;
  for (let t = 2027; t <= 2036; t++) {
    const m = calc({ investment: 15, year: t, kScenario: 5, alpha: 0.1 });
    const ctx = { k: m.k, alpha: 0.1, mult: 1, flowsNet: m.flowsNetSum, platformCost: m.platformCost, lambdaBar: 0.5, cLiq: m.c_liq };
    const th = { mech, behavior: 'myopic' as const, sigma: 0, ctx };
    C = Math.max(C, gammaMap(pop, C, th).C);         // один раунд решений в год
    const phi = 1 - Math.exp(-m.k * C);
    const dE = m.flowsNetSum * phi - m.platformCost;
    const dEexp = (m.flowsNetSum - 0.05 * m.flows.co2Gross) * phi - m.platformCost;
    const sdv = mech === 'coord' ? 0 : Math.max(0, 0.1 * dE);
    const beta = 0.45 * phi + 0.25 * (1 - phi);
    const pub = mech === 'divC' ? sdv * beta : mech === 'sigma' ? sdv * 0.30 : 0;
    // затраты σ: доля 0,3 затрат подключения участников
    const eq = equilibrium(pop, th);
    const Z = mech === 'sigma' ? 0.3 * eq.part.filter(j => true).reduce((s, j) => s + j.c, 0) * (C >= eq.C - 1e-9 ? 1 : C / eq.C) : 0;
    npv += (dE - Z) / Math.pow(1.1, t - 2026); npvExp += (dEexp - Z) / Math.pow(1.1, t - 2026);
    rows.push({ mech, t, k: m.k, C, cMin: m.cMin, phi, dE, dEexp, sd: sdv, pub, cLiq: m.c_liq, gap: m.c_liq - pub, Z });
  }
  console.log(mech, 'NPV27-36', npv.toFixed(1), 'NPVexp', npvExp.toFixed(1));
}
console.table(rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 1000) / 1000 : v]))));
require('fs').writeFileSync('traj.json', JSON.stringify(rows));
// Бенефициары
const m0 = calc({ investment: 15, year: 2026, kScenario: 5, alpha: 0.1 });
const e2026B = 1814 + 2394, e2026A = 1814 + 487;
const mk = (sigma: number, e: number, strategies: any[] = []) => ({ kScenario: 5, cStart: 0.008, cTarget: 0.192, yearTarget: 2028,
  flows: { heatNet: m0.flows.heatNet, co2Net: m0.flows.co2Net, recycleNet: m0.flows.recycleNet, nvosNet: m0.flows.nvosNet },
  platformCost: m0.platformCost, alpha: 0.1, mult: 1, regimeWeights: { operator: 0.25, suppliers: 0.15, corporation: 0.12 }, omega: 0.5, nvosCityShare: 0.6,
  sigma, connCost: 6, bExt: 0, bExtKrai: 10, cLiq: 15.5, resTaxReg: 0.05, strategies: new Set(strategies), chemGrowth: 0.02, carbonPrice: 1000, mu: 0,
  e2026: e, dQ: 12, kappa: 0.2, r: 0.1 });
for (const [name, inp] of [['P2', mk(0, e2026B)], ['P2sigma', mk(0.3, e2026B)]] as const) {
  const h = computeHorizon(inp as any, 2026, 2036);
  console.log(name, 'NPVtotal', h.npvTotal.toFixed(1), BENEFICIARIES.map(b => `${b.id}:${h.npv[b.id].toFixed(1)}`).join(' '));
  const y = h.years.find(y => y.t === 2030)!;
  console.log(' 2030 dE', y.dE.toFixed(1), 'nvos', y.nvos.toFixed(1), 'total', y.total.toFixed(2), 'expected', y.expected.toFixed(2), 'ok', y.balanceOk, 'ecoCover', y.ecoCover.toFixed(2), 'cLiq', y.cLiq);
  console.log(' 2030 rows', BENEFICIARIES.map(b => `${b.id}:${y.rows[b.id].net.toFixed(2)}`).join(' '));
}
for (const [nm, e] of [['N2O_B', e2026B], ['N2O_A', e2026A]] as const) {
  const withP = emissionsPath(mk(0, e, ['lowcarbon']) as any, false, true, 2026, 2036);
  const noP = emissionsPath(mk(0, e, ['lowcarbon']) as any, false, false, 2026, 2036);
  const chem = emissionsPath(mk(0, e, ['lowcarbon', 'chem']) as any, true, true, 2026, 2036);
  console.log(nm, 'E2030 noP', noP[4].E.toFixed(1), 'withP', withP[4].E.toFixed(1), 'diff', (noP[4].E - withP[4].E).toFixed(2), 'u', withP[4].u.toFixed(4),
    'carbon2030', withP[4].carbonCost.toFixed(0), 'carbon2036', withP[10].carbonCost.toFixed(0), 'chemE2036', chem[10].E.toFixed(0), 'chemCarbon2036', chem[10].carbonCost.toFixed(0));
}

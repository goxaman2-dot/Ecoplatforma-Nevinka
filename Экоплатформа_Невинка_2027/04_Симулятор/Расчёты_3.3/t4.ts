import { makePopulation, equilibrium, evaluate } from './bilevel';
import { calc } from './metrics';
const pop = makePopulation();
for (const year of [2027, 2036]) {
  const m = calc({ investment: 15, year, kScenario: 5, alpha: 0.1 });
  const ctx = { k: m.k, alpha: 0.1, mult: 1, flowsNet: m.flowsNetSum, platformCost: m.platformCost, lambdaBar: 0.5, cLiq: m.c_liq };
  const p1 = evaluate(pop, { mech: 'divC', behavior: 'myopic', sigma: 0, ctx }).dE;
  for (let x = 0; x <= 2; x += 0.05) { const e = evaluate(pop.map(j => ({ ...j, c: j.c + x })), { mech: 'none', behavior: 'myopic', sigma: 0, ctx });
    if (e.dE <= p1) { console.log(year, 'x*', x.toFixed(2), 'none dE', e.dE.toFixed(1), 'C', e.C.toFixed(3), 'P2 dE', p1.toFixed(1)); break; } }
}

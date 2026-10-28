import { makePopulation, equilibrium, evaluate } from './bilevel';
import { calc } from './metrics';
const pop = makePopulation();
const m = calc({ investment: 15, year: 2026, kScenario: 5, alpha: 0.1 });
const ctx = { k: m.k, alpha: 0.1, mult: 1, flowsNet: m.flowsNetSum, platformCost: m.platformCost, lambdaBar: 0.5, cLiq: m.c_liq };
for (const mech of ['none','coord','divA','sigma'] as const) {
  const e = equilibrium(pop, { mech, behavior: 'myopic', sigma: 0, ctx });
  console.log(mech, e.path.map(x=>x.toFixed(3)).join(' > '), 'types', ['A','B','C','D'].map(t=>e.part.filter(j=>j.type===t).length).join('/'));
}
// информационный барьер: добавочные затраты x ко всем c_j в режиме без платформы
for (const x of [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]) {
  const p2 = pop.map(j => ({ ...j, c: j.c + x }));
  const e = equilibrium(p2, { mech: 'none', behavior: 'myopic', sigma: 0, ctx });
  console.log('x', x, 'C**none', e.C.toFixed(3), e.part.length);
}
console.log(pop.filter(j=>j.type==='A').map(j=>`g${j.gBar.toFixed(2)} c${j.c.toFixed(2)}`).join('; '));
console.log('lambda excl', pop.filter(j=>j.lambda>0.5).map(j=>`${j.type}:${j.lambda}`).join(','), 'sellers', pop.filter(j=>j.lambda>0).map(j=>`${j.type} λ${j.lambda} λ*${(1-j.fc/j.m).toFixed(2)}`).join('; '));

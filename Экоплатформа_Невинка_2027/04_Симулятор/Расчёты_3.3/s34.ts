import { makePopulation, gammaMap, equilibrium } from './bilevel';
import { calc } from './metrics';
import { computeYear } from './beneficiaries';
const pop = makePopulation();
const YEARS = Array.from({ length: 10 }, (_, i) => 2027 + i);
// Траектория связности Р2σ по раундам (3.33); delay — задержка на год (стресс)
function cPath(mech: 'sigma' | 'divC', delay = 0) {
  const out: Record<number, { C: number; n: number }> = {}; let C = 0; let held = 0;
  for (const t of YEARS) {
    const m = calc({ investment: 15, year: t, kScenario: 5, alpha: 0.1 });
    const ctx = { k: m.k, alpha: 0.1, mult: 1, flowsNet: m.flowsNetSum, platformCost: m.platformCost, lambdaBar: 0.5, cLiq: m.c_liq };
    const th = { mech, behavior: 'myopic' as const, sigma: 0, ctx };
    if (held < delay) { held++; out[t] = { C: 0.008, n: 0 }; continue; }
    const g = gammaMap(pop, C, th); C = Math.max(C, g.C);
    out[t] = { C, n: g.part.size };
  }
  return out;
}
const E_CO2 = 1814, N2O_B = 2394, N2O_A = 487;
type Sc = { id: string; label: string; platform: boolean; delay: number; switch: number; downYears: number[]; tor: boolean; krai: boolean; carbon: boolean; n2o: 'A' | 'B'; abate2030: boolean; sigma: number };
const SC: Sc[] = [
  { id: 'S1', label: 'Инерционный', platform: false, delay: 0, switch: 0, downYears: [], tor: false, krai: false, carbon: false, n2o: 'B', abate2030: false, sigma: 0 },
  { id: 'S1c', label: 'Инерционный при цене выбросов', platform: false, delay: 0, switch: 0, downYears: [], tor: false, krai: false, carbon: true, n2o: 'B', abate2030: false, sigma: 0 },
  { id: 'S2', label: 'Координируемый', platform: true, delay: 0, switch: 0, downYears: [], tor: true, krai: true, carbon: false, n2o: 'B', abate2030: false, sigma: 0.3 },
  { id: 'S3', label: 'Углеродно-жёсткий', platform: true, delay: 0, switch: 0, downYears: [], tor: true, krai: true, carbon: true, n2o: 'B', abate2030: false, sigma: 0.3 },
  { id: 'S3a', label: 'Углеродно-жёсткий с очисткой N2O', platform: true, delay: 0, switch: 0, downYears: [], tor: true, krai: true, carbon: true, n2o: 'B', abate2030: true, sigma: 0.3 },
  { id: 'S4', label: 'Стрессовый', platform: true, delay: 1, switch: 0.5, downYears: [2027, 2028], tor: true, krai: true, carbon: false, n2o: 'B', abate2030: false, sigma: 0.3 },
];
const norm = (x: number, x0: number, xs: number) => Math.min(1, Math.max(0, (x - x0) / (xs - x0)));
const res: any = {};
for (const s of SC) {
  const path = s.platform ? cPath('sigma', s.delay) : null;
  const rows: any[] = []; let Q = 1;
  let npv = 0, npvBud = 0, carbonSum = 0, eSum = 0;
  for (const t of YEARS) {
    Q *= 1 + (t <= 2030 ? 0.02 : 0.01);
    const m = calc({ investment: 15, year: 2026, kScenario: 5, alpha: 0.1, switchShare: s.switch, downDays: s.downYears.includes(t) ? 60 : 0 });
    const C = path ? path[t].C : 0.008, n = path ? path[t].n : 0;
    const strategies = new Set<any>([...(s.tor ? ['tor'] : []), ...(s.krai ? ['krai'] : []), ...(s.carbon ? ['lowcarbon'] : [])]);
    const inp: any = { kScenario: 5, cStart: C, cTarget: C, yearTarget: 2026, flows: { heatNet: m.flows.heatNet, co2Net: m.flows.co2Net, recycleNet: m.flows.recycleNet, nvosNet: m.flows.nvosNet },
      platformCost: s.platform ? m.platformCost : 0, alpha: s.platform ? 0.1 : 0, mult: 1, regimeWeights: { operator: 0.25, suppliers: 0.15, corporation: 0.12 }, omega: 0.5, nvosCityShare: 0.6,
      sigma: s.platform ? s.sigma : 0, connCost: 6, bExt: 0, bExtKrai: 10, cLiq: 15.5, resTaxReg: 0.05, strategies, chemGrowth: 0.02, carbonPrice: 1000, mu: 0, e2026: 0, dQ: 12, kappa: 0.2, r: 0.1 };
    let y = s.platform ? computeYear(inp, t) : null;
    const dE = y ? y.dE : 0, nvos = y ? y.nvos : 0;
    const phi = y ? y.phi : 0;
    const bud = y ? y.rows.fed.net + y.rows.krai.net + y.rows.city.net : 0;
    const city = y ? y.rows.city.net : 0;
    const fedkrai = y ? y.rows.fed.net + y.rows.krai.net : 0;
    const eco = y ? y.ecoCover : 0;
    const cLiq = 15.5 + (t - 2026) * 0.5;
    // выбросы якоря (тыс. т CO2-экв.): CO2 и N2O растут с выпуском; передача CO2 платформой; очистка N2O с 2030 г.
    const dQt = s.platform ? 12 * Math.min(1, phi / 0.789) * (1 - s.switch) : 0;
    const n2o = (s.n2o === 'B' ? N2O_B : N2O_A) * Q * (s.abate2030 && t >= 2030 ? N2O_A / N2O_B : 1);
    const E = E_CO2 * Q - dQt * (1 - 0.2) + n2o;
    const pC0 = 0; const pC = s.carbon && t >= 2030 ? 1000 * Math.pow(1.1, t - 2030) : 0;
    const carbon = E * pC / 1000; // млн руб.
    // показатели индекса
    const x = {
      e1: norm(dE, 0, 117.434),                 // реализация потенциала эффекта
      e2: norm(fedkrai, -15, 15),               // налоговый баланс федерального и краевого бюджетов
      e3: norm(carbon, 8549, 0),                // углеродная нагрузка якоря (худшее — S3 в 2036 г.)
      g1: phi,                                  // доля отходов, выведенных из размещения (60 тыс. т × φ)
      g2: norm(eco, 0, cLiq),                   // покрытие ликвидации накопленного ущерба
      g3: norm(E, (E_CO2 + N2O_B) * 1.15, E_CO2 + N2O_A), // выбросы якоря: от худшего (вариант B с ростом) до варианта A 2026 г.
      s1: Math.min(1, n / 26),                  // вовлечённость резидентов типов A–C
      s2: norm(city, -23.9, 0),                 // бюджет города: от полной потери доли НВОС до нуля
    };
    const Iec = (x.e1 + x.e2 + x.e3) / 3, Igr = (x.g1 + x.g2 + x.g3) / 3, Iso = (x.s1 + x.s2) / 2;
    const I = (Iec + Igr + Iso) / 3;
    const df = Math.pow(1.1, t - 2026);
    npv += (dE - (s.platform ? s.sigma * 6 : 0)) / df; npvBud += bud / df; carbonSum += carbon / df; eSum += E;
    rows.push({ t, C, n, phi, dE, nvos, bud, city, fedkrai, eco, cLiq, E, carbon, ...x, Iec, Igr, Iso, I });
  }
  res[s.id] = { label: s.label, rows, npv, npvBud, carbonNPV: carbonSum, Emean: eSum / 10,
    Imean: rows.reduce((a, r) => a + r.I, 0) / 10, comp: ['Iec', 'Igr', 'Iso'].map(k => rows.reduce((a, r) => a + r[k], 0) / 10) };
}
// устойчивость ранжирования к весам (Дирихле(1,1,1))
let rnd = 7; const R = () => { rnd = (1103515245 * rnd + 12345) % 2147483648; return rnd / 2147483648; };
const ids = Object.keys(res); const wins: any = {}; ids.forEach(i => wins[i] = 0); let p21 = 0, p34 = 0, p31 = 0; const N = 10000;
for (let k = 0; k < N; k++) {
  const g = [0, 0, 0].map(() => -Math.log(1 - R())); const s = g.reduce((a, b) => a + b); const w = g.map(v => v / s);
  const sc = ids.map(i => res[i].comp[0] * w[0] + res[i].comp[1] * w[1] + res[i].comp[2] * w[2]);
  wins[ids[sc.indexOf(Math.max(...sc))]]++;
  if (sc[ids.indexOf('S2')] > sc[0]) p21++;
  if (sc[ids.indexOf('S4')] > sc[0]) p34++; if (sc[ids.indexOf('S3')] > sc[ids.indexOf('S1c')]) p31++;
}
res.weights = { wins: Object.fromEntries(ids.map(i => [i, wins[i] / N])), pS2gtS1: p21 / N, pS4gtS1: p34 / N, pS3gtS1c: p31 / N };
require('fs').writeFileSync('s34.json', JSON.stringify(res));
for (const i of ids) { const r = res[i]; console.log(i, r.label, 'NPV', r.npv.toFixed(1), 'budNPV', r.npvBud.toFixed(1), 'carbonNPV', r.carbonNPV.toFixed(0), 'Emean', r.Emean.toFixed(0), 'I', r.Imean.toFixed(3), r.comp.map((v: number) => v.toFixed(3)).join('/'));
  console.log('  ', [2027, 2030, 2036].map(t => { const y = r.rows.find((z: any) => z.t === t); return `${t}: C${y.C.toFixed(3)} n${y.n} dE${y.dE.toFixed(1)} bud${y.bud.toFixed(1)} city${y.city.toFixed(1)} eco${y.eco.toFixed(1)}/${y.cLiq} E${y.E.toFixed(0)} carb${y.carbon.toFixed(0)} I${y.I.toFixed(3)} [${['e1','e2','e3','g1','g2','g3','s1','s2'].map(k=>y[k].toFixed(2)).join(' ')}]`; }).join('\n   ')); }
console.log(res.weights);

// Самопроверка: модель пересчитывает контрольные числа глав 2–3 теми же функциями,
// что и Лаборатория. Совпадение — при округлении до числа знаков, приведённого в тексте.

import { CALIB, calcMetrics, type MetricsParams } from './core';
import { cStar, shares, makePopulation, equilibrium, evaluate, type Context } from './bilevel';

export interface Check {
  id: string;
  label: string;
  expected: number;
  digits: number;
  actual: number;
  source: string;
  ok: boolean;
}

export const BASE_PARAMS: MetricsParams = {
  resourceEfficiency: 40, turbineEff: 80, heatExchanger: 80, filterResource: 80,
  investment: 15, year: 2026, kScenario: 5, alpha: 0.10, distRegime: 'fiscal',
};

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

export function runSelfCheck(): Check[] {
  const m = calcMetrics(BASE_PARAMS);
  const sw = calcMetrics({ ...BASE_PARAMS, switchShare: 0.5 });
  const y27 = calcMetrics({ ...BASE_PARAMS, year: 2027 });
  const y36 = calcMetrics({ ...BASE_PARAMS, year: 2036 });
  const phi = (c: number, k: number) => 1 - Math.exp(-k * c);
  const phi10 = phi(0.10, 5);
  const lam = (mj: number, fc: number) => 1 - fc / mj;

  // Двухуровневая модель в 2027 г. (k = 5,25), как в § 3.3.3
  const pop = makePopulation();
  const ctx: Context = { k: y27.k, alpha: 0.10, mult: 1, flowsNet: y27.flowsNetSum, platformCost: y27.flows.platformCost, lambdaBar: CALIB.lambdaBar, cLiq: 15.5 };
  const eqP1 = equilibrium(pop, { mech: 'coord', behavior: 'myopic', sigma: 0, ctx });
  const eqP2 = equilibrium(pop, { mech: 'divC', behavior: 'myopic', sigma: 0, ctx });
  const eqS = equilibrium(pop, { mech: 'sigma', behavior: 'myopic', sigma: 0.3, ctx });
  const ctx36: Context = { ...ctx, k: y36.k, flowsNet: y36.flowsNetSum, platformCost: y36.flows.platformCost, cLiq: 20.5 };
  const pub36 = (mech: 'divA' | 'divB' | 'divC') => evaluate(pop, { mech, behavior: 'myopic', sigma: 0, ctx: ctx36 }).pub;

  const rows: Omit<Check, 'ok'>[] = [
    { id: 'sum', label: 'Сумма чистых вкладов потоков, млн руб./год', expected: 187.1, digits: 1, actual: m.flowsNetSum, source: 'табл. 2.6' },
    { id: 'dEbase', label: 'Дополнительный эффект ΔE при φ = 1, млн руб./год', expected: 117.4, digits: 1, actual: m.deltaE_base, source: 'табл. 2.6' },
    { id: 'sd', label: 'Симбиотический дивиденд при α = 0,10, млн руб./год', expected: 11.7, digits: 1, actual: 0.10 * m.deltaE_base, source: 'табл. 2.6, (2.11)' },
    { id: 'switch', label: 'ΔE при переключении половины поставок CO₂, млн руб./год', expected: 81.4, digits: 1, actual: sw.deltaE_base, source: '§ 2.3.2' },
    { id: 'phi10', label: 'φ(0,10) при k = 5', expected: 0.39, digits: 2, actual: phi10, source: '§ 2.2.3' },
    { id: 'phi25', label: 'φ(0,25) при k = 5', expected: 0.71, digits: 2, actual: phi(0.25, 5), source: '§ 2.2.3' },
    { id: 'c0', label: 'C* без платформы (k = 5, τ = 2000)', expected: 0.19, digits: 2, actual: cStar(5, 2000), source: '§ 2.3.3, (2.13)' },
    { id: 'c1', label: 'C* с платформой (k = 7, τ = 1200)', expected: 0.23, digits: 2, actual: cStar(7, 1200), source: '§ 2.3.3, (2.13)' },
    { id: 'shA', label: 'Доля публичного партнёра, схема А, при C = 0,10', expected: 0.300, digits: 3, actual: shares('divA', phi10).pub, source: 'табл. 2.10' },
    { id: 'shB', label: 'Доля публичного партнёра, схема Б, при C = 0,10', expected: 0.302, digits: 3, actual: shares('divB', phi10).pub, source: 'табл. 2.10, (2.17)' },
    { id: 'shC', label: 'Доля бюджета, схема В, при C = 0,10', expected: 0.329, digits: 3, actual: shares('divC', phi10).pub, source: 'табл. 2.10, (2.18)' },
    { id: 'cmin27', label: 'Порог окупаемости C_min, 2027 г.', expected: 0.089, digits: 3, actual: y27.cMin, source: '§ 3.3.2, (3.34)' },
    { id: 'cmin36', label: 'Порог окупаемости C_min, 2036 г.', expected: 0.062, digits: 3, actual: y36.cMin, source: '§ 3.3.2, (3.34)' },
    { id: 'shap', label: 'Доля «Азота» по Шепли с поправкой на π_A, млн руб./год', expected: 27.9, digits: 1, actual: m.anchorShareRisk, source: '§ 3.2.4, (3.25)' },
    { id: 'lam1', label: 'λ*_j при m_j = 0,25 и FC_j/R_j = 0,15', expected: 0.40, digits: 2, actual: lam(0.25, 0.15), source: '§ 3.2.4, (3.27)' },
    { id: 'lam2', label: 'λ*_j при m_j = 0,40 и FC_j/R_j = 0,12', expected: 0.70, digits: 2, actual: lam(0.40, 0.12), source: '§ 3.2.4, (3.27)' },
    { id: 'p1', label: 'C** режима Р1 (координация), 2027 г.', expected: 0.169, digits: 3, actual: eqP1.C, source: '§ 3.3.3' },
    { id: 'p2', label: 'C** режима Р2 (дивиденд, схема В), 2027 г.', expected: 0.169, digits: 3, actual: eqP2.C, source: '§ 3.3.3' },
    { id: 'pubA', label: 'Доля бюджета в дивиденде, схема А, 2036 г., млн руб.', expected: 2.20, digits: 2, actual: pub36('divA'), source: 'табл. 3.14' },
    { id: 'pubB', label: 'То же, схема Б, 2036 г., млн руб.', expected: 1.53, digits: 2, actual: pub36('divB'), source: 'табл. 3.14' },
    { id: 'pubC', label: 'То же, схема В, 2036 г., млн руб.', expected: 2.95, digits: 2, actual: pub36('divC'), source: 'табл. 3.14' },
    { id: 'sig', label: 'Прирост участников при σ = 0,3 против Р2, 2027 г.', expected: 4, digits: 0, actual: eqS.part.length - eqP2.part.length, source: 'вывод 5, табл. 3.14' },
  ];
  return rows.map((r) => ({ ...r, ok: round(r.actual, r.digits) === round(r.expected, r.digits) }));
}

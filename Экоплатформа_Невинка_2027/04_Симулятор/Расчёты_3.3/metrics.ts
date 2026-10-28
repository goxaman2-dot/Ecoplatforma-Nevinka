// Порт calculateMetrics из App.tsx (симулятор v4.x, коммит bab1ca2) — без изменений формул
export const CALIB = { piA: 0.05, mu: 0, sigmaEps: 0.073, anchorShapley: 0.25 };
export interface MP { resourceEfficiency?: number; turbineEff?: number; heatExchanger?: number; filterResource?: number;
  investment: number; year: number; kScenario: number; alpha: number; distRegime?: 'fiscal'|'tech'|'industrial';
  dQ?: number; switchShare?: number; downDays?: number; piA?: number; bExt?: number;
  // расширения для Монте-Карло (по табл. 2.5): множители потоков и затрат платформы
  heatMul?: number; recMul?: number; nvosMul?: number; platMul?: number; co2Price?: number; co2Cost?: number; }
export function calc(p: MP) {
  const resourceEfficiency = p.resourceEfficiency ?? 40, turbineEff = p.turbineEff ?? 80, heatExchanger = p.heatExchanger ?? 80, filterResource = p.filterResource ?? 80;
  const { investment, year, kScenario, alpha } = p; const distRegime = p.distRegime ?? 'fiscal';
  const dQ = p.dQ ?? 12, switchShare = p.switchShare ?? 0, downDays = p.downDays ?? 0, piA = p.piA ?? CALIB.piA, bExt = p.bExt ?? 0;
  const c_ind = investment / 100;
  const timeProgress = (year - 2026) / 10;
  const k = kScenario + timeProgress * 2.5;
  let phi_val = 1 - Math.exp(-k * c_ind); if (investment < 5) phi_val = 0;
  const e_it_factor = (turbineEff / 100) * 0.6 + (heatExchanger / 100) * 0.4;
  const e_f_factor = filterResource / 100;
  const ANN15 = 0.1315, ANN7 = 0.2054;
  const downFactor = 1 - downDays / 365;   // в симуляторе d_t действует в 2026 г.; здесь — в году расчёта
  const heatGross = 438 * 0.5 * (360 - 50) / 1000 * (e_it_factor / 0.8) * (p.heatMul ?? 1);
  const heatNet = heatGross - 300 * ANN15;
  const co2Gross = dQ * ((p.co2Price ?? 8000) - (p.co2Cost ?? 2000)) / 1000 * (1 - switchShare) * downFactor;
  const co2Capex = dQ > 0 ? 100 * ANN15 : 0;
  const co2Net = co2Gross - co2Capex;
  const recycleNet = 30 * 2000 / 1000 * (1 + (resourceEfficiency - 40) / 100) * (p.recMul ?? 1);
  const nvosNet = 60 * 663.2 / 1000 * (e_f_factor / 0.8) * (p.nvosMul ?? 1);
  const platformCost = (120 * ANN7 + 30 + 15) * (p.platMul ?? 1);
  const deltaE_base = heatNet + co2Net + recycleNet + nvosNet - platformCost;
  const flowsNetSum = deltaE_base + platformCost;
  const deltaE_t = flowsNetSum * phi_val - platformCost;
  const cMin = flowsNetSum > platformCost ? -Math.log(1 - platformCost / flowsNetSum) / k : Infinity;
  const deltaE_exp = (flowsNetSum - piA * co2Gross) * phi_val - platformCost;
  const c_liq = 15.5 + (year - 2026) * 0.5;
  const shares: any = { fiscal: { operator: 0.25, suppliers: 0.15, corporation: 0.12, multiplier: 1.0 }, tech: { operator: 0.40, suppliers: 0.15, corporation: 0.12, multiplier: 1.12 }, industrial: { operator: 0.15, suppliers: 0.40, corporation: 0.12, multiplier: 1.18 } };
  const cs = shares[distRegime];
  let sd = Math.max(0, alpha * deltaE_t * cs.multiplier); if (investment < 5) sd = 0;
  const beta = 0.45 * phi_val + 0.25 * (1 - phi_val);
  const sd_budget = sd * beta;
  return { k, phi: phi_val, deltaE_base, flowsNetSum, platformCost, deltaE_t, deltaE_exp, cMin, sd, sd_budget, beta, c_liq,
    ecofund: sd * 0.08, budgetOk: sd_budget + bExt >= c_liq, flows: { heatGross, heatNet, co2Gross, co2Capex, co2Net, recycleNet, nvosNet } };
}

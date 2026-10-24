// Расчётное ядро модели (главы 2–3): общие функции для Лаборатории, паспорта и страниц тезисов.
// Вынесено из App.tsx без изменения формул (версия 5.0).

// ─── Калибровка § 3.1 (редакция 14.10.2026), таблица 3.7 «Перенос в симулятор» ───
// Класс качества: A — нормативный или наблюдаемый факт, B — перенос по аналогам, C — допущение.
export const CALIB = {
  capAz: 1160,        // Cap_Аз, тыс. т NH3/год (1000–1350), C
  eFull: 1.88,        // полный CO2 на т мощности, т (1,79–2,10), B; было 2,16
  eProc: 1.125,       // процессный CO2 на т мощности, т (1,01–1,32), B; было 1,27; 1160·1,125 = 1305
  urea: 500,          // U, выпуск карбамида, тыс. т (300–700), C
  ureaCO2: 0.733,     // 44/60 ≈ 0,733 т CO2 в тонне карбамида
  rN2O: 0.3732,       // медиана r_k (квартили 0,18; 0,37; 0,70), формула (3.5)
  an: 1200,           // AN, выпуск аммиачной селитры, тыс. т (1000–1400), C
  hno3PerAN: 63 / 80, // 0,7875 т HNO3 на т селитры
  efN2O: 8.5,         // EF, кг N2O на т HNO3 (8–9), Öko-Institut (2023)
  gwpN2O: 298,
  climateTrace: 1444, // модельная оценка Climate TRACE, тыс. т CO2-экв.
  q0: 32,             // Q_0, базовые продажи пищевой CO2, тыс. т/год, A (с декабря 2018 г.)
  mu: 0,              // μ (CBAM): переданный CO2 не вычитается из встроенных выбросов, A
  piA: 0.05,          // π_A (0,028–0,094), B
  sigmaDelta: 0.22,   // σ_Δ — годовые изменения процессного CO2 у аналогов (для π_A), B
  sigmaEps: 0.073,    // σ_ε — остатки модели (3.2), шум имитации, B
  lambdaBar: 0.5,     // λ̄ — предел продаж якорю, доля выручки инвестпроекта (ТОР), A
  anchorShapley: 0.25 // доля «Азота» в векторе Шепли при s = 0,3 (§ 2.5.3)
};

// γ_t — индекс активности аналогов (модель 3.2); 2024–2026 приняты равными 1
export const GAMMA_T: Record<number, number> = {
  2017: 0.922, 2018: 0.953, 2019: 0.954, 2020: 1.015, 2021: 0.953,
  2022: 0.970, 2023: 1.000, 2024: 1.000, 2025: 1.000, 2026: 1.000
};

// Продажи пищевой CO2 по годам: до декабря 2018 г. их не было
export const foodCO2 = (y: number) => (y < 2018 ? 0 : y === 2018 ? CALIB.q0 / 12 : CALIB.q0);

export interface AnchorParams {
  capAz: number; eFull: number; eProc: number; urea: number;
  an: number; efN2O: number; n2oAbated: boolean; downDays: number;
}

// Формулы (3.3)–(3.7): уровень выбросов «Азота» и ряды 2017–2026 гг.
export function calcAnchor(p: AnchorParams) {
  const co2EPA = p.capAz * p.eFull;                                   // (3.3)
  const ureaBound = CALIB.ureaCO2 * p.urea;
  const co2IPCC = co2EPA - ureaBound;                                 // (3.4)
  const n2oA = p.capAz * p.eProc * CALIB.rN2O;                        // (3.5)
  const n2oB = p.an * CALIB.hno3PerAN * p.efN2O * CALIB.gwpN2O / 1000; // (3.6)
  const n2o = p.n2oAbated ? n2oA : n2oB;
  const proc = p.capAz * p.eProc;
  const freeCO2 = proc - ureaBound - CALIB.q0;
  const total = co2IPCC + n2o;
  const ctRatio = total / CALIB.climateTrace;
  const series = Object.keys(GAMMA_T).map(Number).map((y) => {
    // (3.7): Ê_t = Ê_2023 · exp(γ_t − γ_2023) · (1 − d_t/365); d_t задаётся для 2025–2026 гг.
    const g = GAMMA_T[y] * (y >= 2025 ? 1 - p.downDays / 365 : 1);
    return {
      year: String(y),
      gamma: g,
      co2EPA: co2EPA * g,
      co2: co2IPCC * g,
      n2oB: n2oB * g,
      n2oA: n2oA * g,
      proc: proc * g,
      free: proc * g - ureaBound * g - foodCO2(y)
    };
  });
  return { co2EPA, co2IPCC, ureaBound, n2oA, n2oB, n2o, proc, freeCO2, total, ctRatio, series,
    foodUse: CALIB.q0 / freeCO2 };
}


export type MetricsParams = {
  resourceEfficiency: number,
  turbineEff: number,
  heatExchanger: number,
  filterResource: number,
  investment: number,
  year: number,
  kScenario: number,
  alpha: number,
  distRegime: 'fiscal' | 'tech' | 'industrial',
  dQ?: number,
  switchShare?: number,
  downDays?: number,
  piA?: number,
  bExt?: number
};

export function calcMetrics(params: MetricsParams) {
  const { resourceEfficiency, turbineEff, heatExchanger, filterResource, investment, year, kScenario, alpha, distRegime } = params;
  const dQ = params.dQ ?? 12;
  const switchShare = params.switchShare ?? 0;
  const downDays = params.downDays ?? 0;
  const piA = params.piA ?? CALIB.piA;
  const bExt = params.bExt ?? 0;
  
  // C_ind is investment in decimal (0-0.30)
  const c_ind = investment / 100;
  
  // k: institutional speed parameter (Formula 2)
  // Time factor: k increases as institutional measures are implemented (2026-2036)
  const timeProgress = (year - 2026) / 10; // 0 to 1
  const k = kScenario + timeProgress * 2.5; // k grows over 10 years
  
  // Formula (2): phi = 1 - exp(-k * C_ind)
  // IMPORTANT: C_ind is in fractions (0.10 for 10%)
  let phi_val = 1 - Math.exp(-k * c_ind);
  if (investment < 5) {
    phi_val = 0;
  }
  const phi = phi_val * 100; // in percent for display
  
  // Resource Efficiency Effect (E_it)
  // Er (turbine) and Ew (heat exchanger) influence energy savings
  const e_it_factor = (turbineEff / 100) * 0.6 + (heatExchanger / 100) * 0.4;
  
  // Ecological Effect (E_f)
  // Ef (filter) influences fines and emissions
  const e_f_factor = filterResource / 100;

  // Calibration Anchors for k=5:
  // phi(0.10) ≈ 0.39
  // phi(0.25) ≈ 0.71
  const anchor10 = 1 - Math.exp(-5 * 0.10);
  const anchor25 = 1 - Math.exp(-5 * 0.25);

  // ΔE_base — ЧИСТЫЙ дополнительный эффект по формулам (2.7)–(2.9), табл. 2.6, млн руб./год.
  // Прежнее значение 250 соответствовало валовой экономии и заменено (табл. 3.7).
  // Ползунки Er/Ew масштабируют тепловой поток, «Эффективность ресурсов» — вторсырьё,
  // фильтр Ef — сокращение платы за НВОС; при значениях по умолчанию ΔE_base = 117,4.
  const ANN15 = 0.1315, ANN7 = 0.2054;
  const downFactor = year === 2026 ? 1 - downDays / 365 : 1; // d_t: простой «Азота» в 2026 г.
  const heatGross = 438 * 0.5 * (360 - 50) / 1000 * (e_it_factor / 0.8);
  const heatNet = heatGross - 300 * ANN15;
  // (3.11): ΔE_CO2 = (Q_1 − Q_0)·(p_альт − c) − A_CO2; засчитывается только прирост сверх Q_0 = 32 тыс. т,
  // переключение прежних покупателей прироста не даёт
  const co2Gross = dQ * (8000 - 2000) / 1000 * (1 - switchShare) * downFactor;
  const co2Capex = dQ > 0 ? 100 * ANN15 : 0;
  // (3.12): углеродная часть μ·q·p_C; для всех каналов CO2 Невинномысска μ = 0 (CBAM)
  const co2Carbon = CALIB.mu * dQ * 0;
  const co2Net = co2Gross - co2Capex + co2Carbon;
  const recycleNet = 30 * 2000 / 1000 * (1 + (resourceEfficiency - 40) / 100);
  const nvosNet = 60 * 663.2 / 1000 * (e_f_factor / 0.8);
  const platformCost = 120 * ANN7 + 30 + 15;
  const deltaE_base = heatNet + co2Net + recycleNet + nvosNet - platformCost;
  const flows = { heatGross, heatNet, co2Gross, co2Capex, co2Carbon, co2Net, recycleNet, nvosNet, platformCost };

  // Formula (14): Verified savings Delta E(t) = Delta E_base * phi
  // Постоянные затраты платформы от связности не зависят и на φ не умножаются:
  // ΔE(t) = φ(C)·Σ чистых вкладов потоков − Z_пл. Отсюда порог окупаемости платформы C_min.
  const flowsNetSum = deltaE_base + platformCost;
  const deltaE_t = flowsNetSum * phi_val - platformCost;
  const cMin = flowsNetSum > platformCost ? -Math.log(1 - platformCost / flowsNetSum) / k : Infinity;
  // Ожидаемый эффект с учётом риска остановки якоря (3.24)–(3.25) § 3.2: во время остановки
  // выпадает валовой поток CO2, аннуитет вложений сохраняется
  const deltaE_exp = (flowsNetSum - piA * co2Gross) * phi_val - platformCost;
  const anchorShare = CALIB.anchorShapley * deltaE_base;
  const anchorShareRisk = (1 - piA) * anchorShare;

  // Constraint 2: Budget sufficiency; SD_б + B_внеш ≥ C_ликв
  const c_liq = 15.5 + (year - 2026) * 0.5; // 15,5–20,5 млн руб., класс C
  
  // Distribution Regimes
  const shares = {
    fiscal: { budget: 0.40, operator: 0.25, suppliers: 0.15, corporation: 0.12, multiplier: 1.0 },
    tech: { budget: 0.25, operator: 0.40, suppliers: 0.15, corporation: 0.12, multiplier: 1.12 },
    industrial: { budget: 0.25, operator: 0.15, suppliers: 0.40, corporation: 0.12, multiplier: 1.18 }
  };

  const currentShares = shares[distRegime];
  
  // Ecofund share: фиксированные 8% согласно Таблице 1 статьи (формула 6.2)
  const ecofundShare = 0.08;

  // Formula (15): Symbiotic Dividend SD = alpha * Delta E(t) * Multiplier
  // Отрицательный чистый эффект дивиденда не образует
  let sd = Math.max(0, alpha * deltaE_t * currentShares.multiplier);
  if (investment < 5) {
    sd = 0;
  }
  
  // Нелинейная функция доли бюджета β(C_инд) = β₀·φ + β₁·(1−φ)
  // β₀ = 0.45 (экосистемный режим), β₁ = 0.25 (низкая связность) — формула (11)
  const beta = 0.45 * phi_val + 0.25 * (1 - phi_val);
  const sd_budget = sd * beta;

  // Доли бюджета (β) и экофонда (8%) заданы формулами (11) и (6.2);
  // остаток 1 − β − 0.08 делится между оператором, поставщиками и корпорацией
  // в пропорциях выбранного режима, поэтому сумма долей всегда равна 100% SD
  const restWeight = currentShares.operator + currentShares.suppliers + currentShares.corporation;
  const rest = Math.max(0, 1 - beta - ecofundShare);
  const effShares = {
    budget: beta,
    operator: rest * currentShares.operator / restWeight,
    suppliers: rest * currentShares.suppliers / restWeight,
    corporation: rest * currentShares.corporation / restWeight,
    ecofund: ecofundShare,
    multiplier: currentShares.multiplier
  };

  const distribution = {
    budget: sd_budget,
    operator: sd * effShares.operator,
    suppliers: sd * effShares.suppliers,
    corporation: sd * effShares.corporation,
    ecofund: sd * ecofundShare,
    shares: effShares
  };

  // Constraints check
  const constraints = {
    density: investment >= 15, // C_ind >= 15%
    budget: sd_budget + bExt >= c_liq
  };

  // U: Utility Function (Target)
  // Экологическая безопасность: покрытие C_ликв дивидендом бюджета и внешним источником B_внеш
  const ecoSafety = Math.min(1.2, (sd_budget + bExt) / (c_liq || 1));
  const u = (phi * 0.5 + (sd / 9.75 * 100) * 0.3 + (ecoSafety * 20));

  // Индекс Устойчивости Экоплатформы (ИУ)
  // ИУ = (φ·0.35 + EcoSafety/1.2·0.30 + E_it·0.20 + E_f·0.15) · 100
  const iu = (phi_val * 0.35 + (ecoSafety / 1.2) * 0.30 + e_it_factor * 0.20 + e_f_factor * 0.15) * 100;

  return {
    sd, phi, distribution, u, c: investment, deltaE_base, deltaE_t, alpha, k, c_ind,
    anchor10, anchor25, c_liq, sd_budget, constraints, ecoSafety, iu,
    flows, deltaE_exp, anchorShare, anchorShareRisk, bExt, piA, cMin, flowsNetSum
  };
}

import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, Cell, LabelList,
} from 'recharts';
import { Landmark, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  BENEFICIARIES, STRATEGIES, computeHorizon, computeYear, emissionsPath,
  type BenefInputs, type Flows, type StrategyId, type BenId,
} from './beneficiaries';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
const ru = (x: number, d = 0) => x.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
const sgn = (x: number, d = 1) => (x > 0 ? '+' : x < 0 ? '−' : '') + ru(Math.abs(x), d);

// Проверенная категориальная палитра (слоты 1–3) и полюса «выигрыш / потеря»
const COL = { s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a', gain: '#2a78d6', loss: '#eb6834' };

interface Props {
  isDarkMode: boolean;
  kScenario: number;
  cInd: number;
  flows: Flows;
  platformCost: number;
  alpha: number;
  mult: number;
  regimeWeights: { operator: number; suppliers: number; corporation: number };
  bExt: number;
  cLiq: number;
  dQ: number;
  e2026: number;          // выбросы якоря (CO₂ МГЭИК + N₂O выбранного варианта), тыс. т CO₂-экв.
}

const Slider = ({ label, value, min, max, step, onChange, fmt, note }: {
  label: React.ReactNode; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt: (v: number) => string; note?: string;
}) => (
  <div className="space-y-1">
    <div className="flex justify-between items-end gap-2">
      <span className="text-[10px] font-bold tracking-wide opacity-70">{label}</span>
      <span className="text-[10px] font-bold font-mono whitespace-nowrap">{fmt(value)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1 appearance-none cursor-pointer bg-gray-500/20 accent-emerald-500" />
    {note && <div className="text-[8px] font-mono opacity-40">{note}</div>}
  </div>
);

export default function BeneficiaryPanel(p: Props) {
  const [cTarget, setCTarget] = useState(0.23);
  const [yearTarget, setYearTarget] = useState(2030);
  const [omega, setOmega] = useState(0.5);
  const [nvosCity, setNvosCity] = useState(0.6);
  const [sigma, setSigma] = useState(0);
  const [connCost, setConnCost] = useState(6);
  const [bExtKrai, setBExtKrai] = useState(10);
  const [resTaxReg, setResTaxReg] = useState(0.05);
  const [chemGrowth, setChemGrowth] = useState(0.02);
  const [carbonPrice, setCarbonPrice] = useState(1000);
  const [mu, setMu] = useState(0);
  const [kappa, setKappa] = useState(0.2);
  const [year, setYear] = useState(2030);
  const [strats, setStrats] = useState<Set<StrategyId>>(new Set());

  const toggle = (id: StrategyId) => {
    const n = new Set(strats);
    if (n.has(id)) n.delete(id); else n.add(id);
    setStrats(n);
  };

  const inp: BenefInputs = {
    kScenario: p.kScenario, cStart: p.cInd, cTarget, yearTarget, flows: p.flows, platformCost: p.platformCost,
    alpha: p.alpha, mult: p.mult, regimeWeights: p.regimeWeights, omega, nvosCityShare: nvosCity, sigma, connCost,
    bExt: p.bExt, bExtKrai, cLiq: p.cLiq, resTaxReg, strategies: strats, chemGrowth, carbonPrice, mu,
    e2026: p.e2026, dQ: p.dQ, kappa, r: 0.10,
  };
  const deps = [p, cTarget, yearTarget, omega, nvosCity, sigma, connCost, bExtKrai, resTaxReg, strats, chemGrowth, carbonPrice, mu, kappa];
  const hz = useMemo(() => computeHorizon(inp), deps);
  const y = useMemo(() => computeYear(inp, year), [...deps, year]);
  // Инерционный эталон стратегий: те же параметры, стратегии выключены
  const base0 = useMemo(() => computeHorizon({ ...inp, strategies: new Set() }), deps);

  const npvData = BENEFICIARIES.map((b) => ({ name: b.label, v: hz.npv[b.id] }))
    .sort((a, b) => b.v - a.v);

  const emis = useMemo(() => {
    const inert = emissionsPath({ ...inp, strategies: new Set() }, false, false);
    const chem = emissionsPath(inp, strats.has('chem'), false);
    const chemPl = emissionsPath(inp, strats.has('chem'), true);
    return inert.map((r, i) => ({ t: r.t, inert: r.E, chem: chem[i].E, chemPl: chemPl[i].E, cost: chemPl[i].carbonCost }));
  }, deps);

  // Матрица согласованности: сравнение с инерционным эталоном в 2035 и 2040 гг.
  const at = (h: typeof hz, t: number) => h.years.find((r) => r.t === t)!;
  const coherence = STRATEGIES.map((s) => {
    const only = new Set<StrategyId>([s.id]);
    const hS = computeHorizon({ ...inp, strategies: only });
    const eS = emissionsPath({ ...inp, strategies: only }, s.id === 'chem', true);
    const eB = emissionsPath({ ...inp, strategies: new Set() }, false, true);
    const ind = (t: number) => {
      const a = at(hS, t), b = at(base0, t);
      const ei = t - 2026;
      return {
        output: s.id === 'chem' ? eS[ei].Q - 1 : 0,
        emis: eS[ei].E - eB[ei].E,
        krai: hS.npv.krai - base0.npv.krai,                       // NPV 2026–2040, а не точка года:
        city: hS.npv.city - base0.npv.city,                       // льготы ТОР и трансферты разнесены во времени
        res: hS.npv.res - base0.npv.res,
        carbon: eS[ei].carbonCost,
      };
    };
    return { s, y35: ind(2035), y40: ind(2040) };
  });

  const box = cn('border p-6 transition-colors duration-300',
    p.isDarkMode ? 'bg-[#1A1A1A] border-[#E4E3E0]/20' : 'bg-white border-[#141414]');
  const axis = { fontSize: 9, fill: p.isDarkMode ? '#c3c2b7' : '#52514e' };
  const grid = p.isDarkMode ? '#ffffff14' : '#00000012';
  const chip = (on: boolean) => cn('px-2 py-1.5 text-[9px] font-bold border text-left leading-tight',
    on ? (p.isDarkMode ? 'bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]' : 'bg-[#141414] text-[#E4E3E0] border-[#141414]') : 'border-gray-500/30 opacity-70 hover:opacity-100');

  const losers = BENEFICIARIES.filter((b) => hz.npv[b.id] < -0.05);
  const arrow = (v: number, eps = 0.05) => (v > eps ? '↑' : v < -eps ? '↓' : '—');

  return (
    <div className="space-y-6">
      <div className={box}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-gray-500/30 pb-3 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <Landmark size={16} /> Бенефициары экоплатформы и стратегический контур, 2026–2040 гг.
          </h2>
          <span className="text-[9px] font-mono opacity-60">Платформа создаёт только ΔE; цена, дивиденд, налоги и трансферты его перераспределяют</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-3">
            <div className="text-[9px] font-mono opacity-60">ТРАЕКТОРИЯ СВЯЗНОСТИ</div>
            <div className="flex justify-between text-[10px]"><span className="font-bold opacity-70">C_инд в 2026 г.</span><span className="font-mono font-bold">{ru(p.cInd, 2)}</span></div>
            <div className="text-[8px] font-mono opacity-40 -mt-2">задаётся индексом инвестиций на вкладке «Симуляция»</div>
            <Slider label="Целевая связность" value={cTarget} min={0.05} max={0.4} step={0.01} onChange={setCTarget} fmt={(v) => ru(v, 2)} note="C* = 0,23 по (2.13) с платформой" />
            <Slider label="Год достижения" value={yearTarget} min={2027} max={2040} step={1} onChange={setYearTarget} fmt={(v) => String(v)} />
            <div className="text-[9px] font-mono opacity-60 pt-2">РАСПРЕДЕЛЕНИЕ И БЮДЖЕТЫ</div>
            <Slider label="ω — доля выигрыша обмена у поставщика" value={omega} min={0} max={1} step={0.05} onChange={setOmega} fmt={(v) => ru(v, 2)} note="0,5 — середина коридора (решение Нэша)" />
            <Slider label="Норматив платы за НВОС городу" value={nvosCity} min={0} max={1} step={0.05} onChange={setNvosCity} fmt={(v) => `${ru(v * 100)} %`} note="с 2026 г. устанавливает край (488-ФЗ), класс C" />
            <Slider label="Ставка резидентов ТОСЭР в бюджет края" value={resTaxReg} min={0} max={0.17} step={0.01} onChange={setResTaxReg} fmt={(v) => `${ru(v * 100)} %`} note="федеральная часть 0 % в период льготы" />
            <Slider label="σ — компенсация подключения краем" value={sigma} min={0} max={1} step={0.05} onChange={setSigma} fmt={(v) => `${ru(v * 100)} %`} />
            <Slider label="Затраты подключения резидентов" value={connCost} min={0} max={20} step={0.5} onChange={setConnCost} fmt={(v) => `${ru(v, 1)} млн руб.`} note="Σc_j участников (двухуровневая модель)" />
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold opacity-70">Год для годового баланса:</span>
              <input type="range" min={2026} max={2040} value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-48 h-1 accent-emerald-500" />
              <span className="text-sm font-bold font-mono text-emerald-500">{year}</span>
              {year > 2036 && <span className="text-[9px] font-mono px-2 py-0.5 border border-amber-500/50 text-amber-500">за горизонтом стратегических документов — экстраполяция</span>}
            </div>
            <div className="text-[9px] font-mono opacity-60">
              C = {ru(y.C, 3)}; k = {ru(y.k, 2)}; φ = {ru(y.phi, 3)}; Σ вкладов = {ru(y.G, 1)}; ΔE(t) = {ru(y.dE, 1)}; SD = {ru(y.sd, 2)}; ΔНВОС = {ru(y.nvos, 1)} млн руб.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono min-w-[640px]">
                <thead><tr className="opacity-60 border-b border-gray-500/20 text-left">
                  <th className="py-1 font-normal">Бенефициар</th>
                  <th className="py-1 font-normal text-right">Выигрыш обмена</th>
                  <th className="py-1 font-normal text-right">Плата платформе</th>
                  <th className="py-1 font-normal text-right">Дивиденд ±</th>
                  <th className="py-1 font-normal text-right">Налог ±</th>
                  <th className="py-1 font-normal text-right">Трансферты, НВОС</th>
                  <th className="py-1 font-normal text-right">Итог, млн руб.</th>
                </tr></thead>
                <tbody>
                  {BENEFICIARIES.map((b, i) => {
                    const r = y.rows[b.id];
                    const head = i === 0 || BENEFICIARIES[i - 1].level !== b.level;
                    return (
                      <React.Fragment key={b.id}>
                        {head && <tr><td colSpan={7} className="pt-2 pb-0.5 text-[9px] opacity-50 uppercase">{b.level}</td></tr>}
                        <tr className="border-b border-gray-500/10">
                          <td className="py-1">{b.label}</td>
                          <td className="py-1 text-right">{r.gain ? sgn(r.gain) : '—'}</td>
                          <td className="py-1 text-right">{r.fee ? sgn(r.fee) : '—'}</td>
                          <td className="py-1 text-right">{Math.abs(r.div) > 0.005 ? sgn(r.div, 2) : '—'}</td>
                          <td className="py-1 text-right">{Math.abs(r.tax) > 0.005 ? sgn(r.tax, 2) : '—'}</td>
                          <td className="py-1 text-right">{Math.abs(r.transfer) > 0.005 ? sgn(r.transfer, 1) : '—'}</td>
                          <td className={cn('py-1 text-right font-bold', r.net < -0.005 && 'text-orange-600')}>{sgn(r.net, 1)}</td>
                        </tr>
                      </React.Fragment>);
                  })}
                  <tr className="font-bold">
                    <td className="py-1.5">Итого по всем бенефициарам</td><td colSpan={5} />
                    <td className="py-1.5 text-right">{sgn(y.total, 1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className={cn('flex items-center gap-2 text-[10px] font-mono p-2 border',
              y.balanceOk ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5')}>
              {y.balanceOk ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertCircle size={14} className="text-rose-500" />}
              Баланс {y.balanceOk ? 'замыкается' : 'НЕ замыкается'}: Σ = {ru(y.total, 2)} = ΔE(t) − ΔНВОС = {ru(y.dE, 2)} − {ru(y.nvos, 2)}.
              В границе участников (гл. 2) эффект {ru(y.dE, 1)}, в расширенной границе с бюджетом {ru(y.expected, 1)} млн руб.
            </div>
            <div className="text-[10px] font-mono">
              Покрытие ущерба (3.21): бюджет города из дивиденда + экофонд + B_внеш = {ru(y.ecoCover, 2)} против C_ликв = {ru(y.cLiq, 1)} млн руб. —{' '}
              <b className={y.ecoCover >= y.cLiq ? 'text-emerald-500' : 'text-orange-600'}>{y.ecoCover >= y.cLiq ? 'покрыто' : `недостаёт ${ru(y.cLiq - y.ecoCover, 1)}`}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={box}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1">Чистая приведённая стоимость по бенефициарам, 2026–2040 гг.</div>
          <div className="text-[9px] font-mono opacity-60 mb-3">r = 0,10, млн руб.; Σ NPV = {ru(hz.npvTotal, 1)} (= NPV эффекта в расширенной границе)</div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={npvData} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }} barCategoryGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                <XAxis type="number" tick={axis} tickFormatter={(v) => ru(v)} />
                <YAxis type="category" dataKey="name" tick={axis} width={150} />
                <ReferenceLine x={0} stroke={p.isDarkMode ? '#c3c2b7' : '#52514e'} />
                <Tooltip formatter={(v: any) => `${ru(Number(v), 1)} млн руб.`} contentStyle={{ fontSize: 10 }} />
                <Bar dataKey="v" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {npvData.map((d, i) => <Cell key={i} fill={d.v >= 0 ? COL.gain : COL.loss} />)}
                  <LabelList dataKey="v" position="right" formatter={(v: any) => ru(Number(v))} style={{ fontSize: 9, fill: axis.fill }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-[9px] font-mono opacity-70 mt-1">
            <span className="flex items-center gap-1"><span className="w-3 h-2" style={{ background: COL.gain }} />выигрывает</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2" style={{ background: COL.loss }} />теряет</span>
          </div>
          <p className="text-[10px] opacity-70 leading-relaxed mt-3">
            {losers.length
              ? <>Индивидуальная рациональность нарушена для: <b>{losers.map((b) => b.label).join(', ')}</b>. Эти участники будут против платформы, пока потеря не компенсирована.</>
              : 'Все бенефициары в плюсе: условие индивидуальной рациональности выполнено на всём горизонте.'}
          </p>
        </div>

        <div className={box}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1">Выбросы якоря при стратегических сценариях, тыс. т CO₂-экв.</div>
          <div className="text-[9px] font-mono opacity-60 mb-3">
            Рост выпуска g = {ru(chemGrowth * 100, 1)} % в год до 2030 г., затем вдвое меньше; платформа передаёт до {ru(p.dQ)} тыс. т CO₂, κ = {ru(kappa, 2)}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={emis} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                <ReferenceArea x1={2036} x2={2040} {...({ fill: p.isDarkMode ? '#ffffff' : '#000000', fillOpacity: 0.05,
                  label: { value: 'экстраполяция', position: 'insideTop', fontSize: 9, fill: axis.fill } } as any)} />
                <XAxis dataKey="t" tick={axis} />
                <YAxis tick={axis} domain={['auto', 'auto']} tickFormatter={(v) => ru(v)} width={48} />
                <Tooltip formatter={(v: any) => ru(Number(v))} labelFormatter={(l: any) => `${l} г.`} contentStyle={{ fontSize: 10 }} />
                <Line dataKey="inert" name="Инерционный, без платформы" stroke={COL.s1} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="chem" name="Сценарий стратегий, без платформы" stroke={COL.s2} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="chemPl" name="Сценарий стратегий + платформа" stroke={COL.s3} strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 text-[9px] font-mono opacity-80 mt-1">
            <span className="flex items-center gap-1"><span className="w-4 h-0.5" style={{ background: COL.s1 }} />инерционный, без платформы</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5" style={{ background: COL.s2 }} />выбранные стратегии, без платформы</span>
            <span className="flex items-center gap-1"><span className="w-4 h-0.5 border-t-2 border-dashed" style={{ borderColor: COL.s3 }} />выбранные стратегии + платформа</span>
          </div>
          <p className="text-[10px] opacity-70 leading-relaxed mt-3">
            {strats.has('chem')
              ? `К 2035 г. рост выпуска добавляет ${ru(emis[9].chem - emis[9].inert)} тыс. т, а платформа снимает лишь ${ru(emis[9].chem - emis[9].chemPl)} тыс. т: симбиоз не компенсирует прирост выбросов от отраслевой стратегии.`
              : 'Включите «Рост химического комплекса», чтобы увидеть противоречие отраслевой и низкоуглеродной стратегий.'}
            {strats.has('lowcarbon') && ` Углеродная нагрузка на якорь в 2035 г. — ${ru(emis[9].cost, 0)} млн руб.; вычет за переданный CO₂ ${mu > 0 ? `при μ = ${ru(mu, 2)}` : 'равен нулю (μ = 0)'}.`}
          </p>
        </div>
      </div>

      <div className={box}>
        <div className="text-[10px] font-bold uppercase tracking-widest mb-1">Стратегии: включение и согласованность целей</div>
        <div className="text-[9px] font-mono opacity-60 mb-3">
          Стратегии задают направления и параметры (класс C); числовые цели документов сверить по полным текстам. 2037–2040 гг. — экстраполяция за горизонтом документов.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          {STRATEGIES.map((s) => (
            <button key={s.id} onClick={() => toggle(s.id)} className={chip(strats.has(s.id))} title={s.doc}>
              <div>{strats.has(s.id) ? '■' : '□'} {s.label} (до {s.horizon})</div>
              <div className="font-normal opacity-70 mt-0.5">{s.effect}</div>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <Slider label="g — рост выпуска аммиака" value={chemGrowth} min={0} max={0.05} step={0.005} onChange={setChemGrowth} fmt={(v) => `${ru(v * 100, 1)} % в год`} />
          <Slider label="Цена выбросов в 2030 г." value={carbonPrice} min={0} max={5000} step={100} onChange={setCarbonPrice} fmt={(v) => `${ru(v)} руб./т`} note="далее +10 % в год" />
          <Slider label="μ — доля CO₂ с вычетом" value={mu} min={0} max={1} step={0.05} onChange={setMu} fmt={(v) => ru(v, 2)} note="0 для напитков, теплиц, карбамида" />
          <Slider label="B_внеш по краевой стратегии" value={bExtKrai} min={0} max={20} step={0.5} onChange={setBExtKrai} fmt={(v) => `${ru(v, 1)} млн руб.`} note="с 2028 г." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] font-mono min-w-[760px]">
            <thead><tr className="opacity-60 border-b border-gray-500/20 text-left">
              <th className="py-1 font-normal">Стратегия (документ)</th>
              <th className="py-1 font-normal text-right">Выпуск аммиака</th>
              <th className="py-1 font-normal text-right">Выбросы якоря</th>
              <th className="py-1 font-normal text-right">Бюджет края</th>
              <th className="py-1 font-normal text-right">Бюджет города</th>
              <th className="py-1 font-normal text-right">Резиденты</th>
              <th className="py-1 font-normal text-right">Углеродная нагрузка</th>
            </tr></thead>
            <tbody>{coherence.map(({ s, y35, y40 }) => (
              <tr key={s.id} className="border-b border-gray-500/10 align-top">
                <td className="py-1.5 pr-2">
                  <div className="font-bold">{s.label}</div>
                  <div className="opacity-60 text-[9px] leading-tight max-w-[280px]">{s.doc}</div>
                </td>
                {([['output', 100, '%'], ['emis', 1, 'тыс. т'], ['krai', 1, 'млн'], ['city', 1, 'млн'], ['res', 1, 'млн'], ['carbon', 1, 'млн']] as const).map(([key, scale, unit]) => (
                  <td key={key} className="py-1.5 text-right whitespace-nowrap">
                    {arrow(y35[key] * scale)} {sgn(y35[key] * scale, 0)} <span className="opacity-50">{unit}</span>
                    <div className="opacity-50 text-[9px]">{key === 'krai' || key === 'city' || key === 'res' ? 'NPV 2026–2040' : `2040: ${sgn(y40[key] * scale, 0)}`}</div>
                  </td>))}
              </tr>))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] opacity-70 leading-relaxed mt-3">
          Каждая строка — отклонение от инерционного эталона при включении только этой стратегии: выпуск, выбросы и углеродная нагрузка — в 2035 г. (под ним 2040 г.), бюджеты и резиденты — по NPV за 2026–2040 гг.
          Противоречие целей видно по столбцам: отраслевая стратегия поднимает выпуск и выбросы якоря, низкоуглеродная делает их платными,
          а платформа при μ = 0 углеродную нагрузку не снижает. Продление ТОР переносит налог резидентов из бюджета края в их прибыль;
          краевой B_внеш закрывает дефицит города за счёт края.
        </p>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Layers } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  makePopulation, equilibrium, gammaMap, zMinCurve, rebound, evaluate, monotoneCheck, compareMatrix, monteCarlo,
  mechParams, N_DOP, PI, TYPE_INFO, MECHS, BEHAVIORS,
  type ResType, type Theta, type Context, type MechId, type BehaviorId,
} from './bilevel';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
const ru = (x: number, d = 0) => x.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });

interface Props {
  isDarkMode: boolean;
  alpha: number;
  flowsNet: number;       // Σ чистых вкладов потоков при φ = 1, млн руб.
  platformCost: number;   // Z_пл, млн руб./год
  k: number;
  regime: 'fiscal' | 'tech' | 'industrial';
  bExt: number;
  setBExt: (v: number) => void;
  cLiq: number;
  capAz: number;          // мощность якоря по аммиаку, тыс. т
  eFull: number;          // ε — т CO2 (граница EPA) на т мощности
  // Ряды 2017–2026 гг. (рабочая книга «Азот_выбросы_модель_2017_2026.xlsx», формулы 3.3–3.7)
  series: { year: string; gamma: number; co2EPA: number; co2: number; n2oA: number; n2oB: number; proc: number; free: number }[];
  dQco2: number;          // Q_1 − Q_0 — прирост продаж CO2, вызванный платформой, тыс. т
  n2oAbated: boolean;     // вариант N2O из вкладки «Симуляция»
}

const MULT = { fiscal: 1.0, tech: 1.0, industrial: 1.0 }; // множитель M исключён: (2.11) без множителя

const Slider = ({ label, value, min, max, step, onChange, fmt, note, term }: {
  label: React.ReactNode; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt: (v: number) => string; note?: string; term?: string;
}) => (
  <div className="space-y-1" data-term={term}>
    <div className="flex justify-between items-end gap-2">
      <span className="text-[length:calc(12px*var(--ui,1))] font-bold tracking-wide opacity-70">{label}</span>
      <span className="text-[length:calc(12px*var(--ui,1))] font-bold font-mono whitespace-nowrap">{fmt(value)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1 appearance-none cursor-pointer bg-gray-500/20 accent-emerald-500" />
    {note && <div className="text-[length:calc(10px*var(--ui,1))] font-mono opacity-40">{note}</div>}
  </div>
);

const Stat = ({ label, value, sub, tone, term }: { label: React.ReactNode; value: string; sub?: React.ReactNode; tone?: 'ok' | 'bad'; term?: string }) => (
  <div data-term={term} className={cn('p-3 border',
    tone === 'ok' ? 'border-emerald-500/40 bg-emerald-500/5' : tone === 'bad' ? 'border-rose-500/40 bg-rose-500/5' : 'border-gray-500/20')}>
    <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60">{label}</div>
    <div className="text-lg font-bold font-mono">{value}</div>
    {sub && <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 leading-tight">{sub}</div>}
  </div>
);

export default function BilevelPanel(p: Props) {
  const pop = useMemo(() => makePopulation(), []);
  const [sigma, setSigma] = useState(0);
  const [lambdaBar, setLambdaBar] = useState(0.5);
  const [mech, setMech] = useState<MechId>('divC');
  const [behavior, setBehavior] = useState<BehaviorId>('myopic');
  const [dqShare, setDqShare] = useState(0.0);
  const [kappa, setKappa] = useState(0.2);
  const [baseYear, setBaseYear] = useState('2023');
  const [withN2O, setWithN2O] = useState(false);
  const [uOverride, setUOverride] = useState<number | null>(null);
  const [mc, setMc] = useState<ReturnType<typeof monteCarlo> | null>(null);
  const [mcRunning, setMcRunning] = useState(false);

  const ctx: Context = useMemo(() => ({
    k: p.k, alpha: p.alpha, mult: MULT[p.regime], flowsNet: p.flowsNet, platformCost: p.platformCost, lambdaBar, cLiq: p.cLiq,
  }), [p.k, p.alpha, p.regime, p.flowsNet, p.platformCost, lambdaBar, p.cLiq]);
  const ctx0: Context = useMemo(() => ({ ...ctx, lambdaBar: 0.5 }), [ctx]);
  const th: Theta = { mech, behavior, sigma, ctx };
  const th0: Theta = { mech, behavior, sigma: 0, ctx: ctx0 };
  const mp = mechParams(th);

  const ev = useMemo(() => evaluate(pop, th), [pop, ctx, mech, behavior, sigma]);
  const eq = ev;
  const ev0 = useMemo(() => evaluate(pop, th0), [pop, ctx0, mech, behavior]);
  const eq0 = ev0;
  const cs = ev.cs;
  const piStar = PI.G * (1 - Math.exp(-mp.k * cs)) - PI.T0 - mp.tau * cs * cs;
  const curve = useMemo(() => zMinCurve(pop, th, eq0.C, Math.max(cs, eq0.C)),
    [pop, ctx, mech, behavior, eq0.C, cs]);
  const mono = useMemo(() => monotoneCheck(pop, th), [pop, ctx, mech, behavior, sigma]);
  const matrix = useMemo(() => compareMatrix(pop, ctx, 0), [pop, ctx]);

  const piEq = ev.pi;
  const W = ev.W;                                                          // (3.20)
  const dC = cs - eq.C;                                                    // (3.19)
  const phiEq = ev.phi;
  const sdEq = ev.sd;
  const pubEq = ev.pub;
  const budgetOk = pubEq + p.bExt >= p.cLiq;                               // (3.21)

  // Следствие 2 табл. 3.8: отклик участия на 1 млн руб. затрат механизма.
  // Цена α — перераспределяемая сумма Δα·M·ΔE(t): её несут остальные получатели дивиденда.
  const resp = useMemo(() => {
    const base: Theta = { mech: 'divA', behavior: 'myopic', sigma: 0, ctx: ctx0 };
    const e0 = equilibrium(pop, base);
    const s1 = equilibrium(pop, { ...base, sigma: 0.5 });
    const a1 = equilibrium(pop, { ...base, ctx: { ...ctx0, alpha: 0.12 } });
    const dE0 = Math.max(0, ctx0.flowsNet * (1 - Math.exp(-ctx0.k * e0.C)) - ctx0.platformCost);
    const costAlpha = Math.max(1e-6, Math.max(0, 0.12 - ctx0.alpha) * ctx0.mult * dE0);
    return {
      sigma: (s1.part.length - e0.part.length) / Math.max(s1.Z, 1e-6),
      alpha: ctx0.alpha >= 0.12 ? 0 : (a1.part.length - e0.part.length) / costAlpha,
    };
  }, [pop, ctx0]);

  const gammaData = useMemo(() => {
    const rows = [];
    for (let c = 0; c <= 0.5001; c += 0.005) rows.push({ c: Number(c.toFixed(3)), gamma: gammaMap(pop, c, th).C, diag: c });
    return rows;
  }, [pop, ctx, mech, behavior, sigma]);

  const zData = curve.rows.map((r) => ({
    c: Number(r.c.toFixed(3)), pi: r.pi, zmin: r.zmin, net: r.net,
  }));

  const byType = (['A', 'B', 'C', 'D'] as ResType[]).map((t) => ({
    t, label: TYPE_INFO[t].label, total: TYPE_INFO[t].count,
    part: eq.part.filter((j) => j.type === t).length,
    excl: eq.excludedLambda.filter((j) => j.type === t).length,
  }));

  const sellers = pop.filter((j) => j.lambda > 0).map((j) => {
    const lamStar = Math.max(0, 1 - j.fc / j.m);                        // (3.27)
    const status = j.lambda > lambdaBar ? 'исключён нормой (3.16)'
      : j.lambda > lamStar ? 'не переживёт остановку якоря' : 'устойчив';
    return { ...j, lamStar, status };
  });
  const outsideBand = sellers.filter((s) => s.lamStar < 0.45 || s.lamStar > 0.55).length;

  // Эффект отдачи по рядам 2017–2026: Q₀ = Cap·γ_t, ε·Q₀ = выбросы года t.
  // u — доля выбросов, дополнительно переданная потребителям платформой: (Q_1 − Q_0)/E_t;
  // базовые 32 тыс. т пищевой CO₂ есть и в контрфактическом состоянии, поэтому в u не входят.
  const emis = (r: Props['series'][number]) => r.co2EPA + (withN2O ? (p.n2oAbated ? r.n2oA : r.n2oB) : 0);
  const reboundRows = p.series.map((r) => {
    const Q0 = p.capAz * r.gamma;
    const E0 = emis(r);
    const uY = uOverride ?? p.dQco2 / E0;
    return { year: r.year, Q0, E0, u: uY, ...rebound(E0 / Q0, Q0, dqShare, uY, kappa) };
  });
  const rbRow = reboundRows.find((r) => r.year === baseYear) ?? reboundRows[reboundRows.length - 1];
  const u = rbRow.u;
  const rb = rbRow;

  const runMc = () => {
    setMcRunning(true);
    setTimeout(() => { setMc(monteCarlo(pop, ctx0, 200, 15)); setMcRunning(false); }, 30);
  };
  const btn = (active: boolean) => cn('px-2 py-1.5 text-[length:calc(11px*var(--ui,1))] font-bold border text-left leading-tight transition-all',
    active ? (p.isDarkMode ? 'bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]' : 'bg-[#141414] text-[#E4E3E0] border-[#141414]')
      : 'border-gray-500/30 opacity-70 hover:opacity-100');

  const box = cn('border p-6 transition-colors duration-300',
    p.isDarkMode ? 'bg-[#1A1A1A] border-[#E4E3E0]/20' : 'bg-white border-[#141414]');
  const axis = { fontSize: 11 };

  const checks = [
    { n: 1, text: 'Без мер поддержки C**(θ₀) < C*', val: `${ru(eq0.C, 3)} против ${ru(cs, 3)}`, ok: eq0.C < cs },
    { n: 2, text: 'σ поднимает участие сильнее, чем α, на 1 млн руб. затрат', val: `σ: ${ru(resp.sigma, 2)} · α: ${ru(resp.alpha, 2)} уч./млн`, ok: resp.sigma > resp.alpha },
    { n: 3, text: 'λ*_j части поставщиков якоря вне 0,45–0,55', val: `${outsideBand} из ${sellers.length}`, ok: outsideBand > 0 },
    { n: 4, text: 'При выполнении (3.29) выбросы якоря не растут', val: rb.ok ? `ΔEm = ${ru(rb.dEm, 1)} тыс. т` : 'условие (3.29) не выполнено', ok: rb.ok ? rb.dEm < 0 : false },
  ];

  return (
    <div className="space-y-6">
      <div className={box} data-nov="N1" data-nov-tag="Н1">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-gray-500/30 pb-3 mb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
            <Layers size={16} /> Двухуровневая модель равновесной связности (§ 3.2)
          </h2>
          <span className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60">
            Популяция: 52 резидента ТОСЭР, типы A–D (табл. 2.12) — демонстрационные значения, класс C, до обследования § 3.3
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Верхний уровень: θ */}
          <div className="space-y-4">
            <div data-term="W" className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60">МЕХАНИЗМ ВЕРХНЕГО УРОВНЯ</div>
            <div className="grid grid-cols-1 gap-1">
              {MECHS.map((m) => (
                <button key={m.id} data-term={m.id === 'sigma' ? 'sigmaMech' : m.id} onClick={() => setMech(m.id)} className={btn(mech === m.id)} title={m.note}>{m.label}</button>
              ))}
            </div>
            <div data-term="U_j" className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60 pt-2">МОДЕЛЬ ПОВЕДЕНИЯ РЕЗИДЕНТОВ</div>
            <div className="grid grid-cols-1 gap-1">
              {BEHAVIORS.map((b) => (
                <button key={b.id} data-term={b.id} onClick={() => setBehavior(b.id)} className={btn(behavior === b.id)} title={b.note}>{b.label}</button>
              ))}
            </div>
          </div>

          {/* Параметры верхнего уровня, графики и результаты */}
          <div className="lg:col-span-3 space-y-5">
            <div className="space-y-3">
              <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60">ВЕРХНИЙ УРОВЕНЬ: θ = (α, γ_h, σ, F)</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <Slider term="sigma" label="σ — компенсация затрат подключения" value={sigma} min={0} max={1} step={0.01}
                  onChange={setSigma} fmt={(v) => `${ru(v * 100)} %`} note="доля c_j, которую несёт публичный партнёр" />
                <Slider term="lambda" label="λ̄ — предел продаж якорю (ТОСЭР)" value={lambdaBar} min={0.3} max={1} step={0.05}
                  onChange={setLambdaBar} fmt={(v) => ru(v, 2)} note="норма ПП РФ № 614: 0,5 от выручки инвестпроекта" />
                <Slider term="B_ext" label="B_внеш — внешний источник" value={p.bExt} min={0} max={20} step={0.5}
                  onChange={p.setBExt} fmt={(v) => `${ru(v, 1)} млн руб.`} />
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pt-4 border-t border-dashed border-gray-500/30">
              <div data-nov="N1" data-nov-tag="Н1" className="min-w-0">
                <div data-term="Gamma" className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest mb-1">Отображение Γ(C; θ) и неподвижная точка</div>
                <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60 mb-3">Формулы (3.17)–(3.18): C** — первое пересечение Γ с биссектрисой при старте из нуля</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={gammaData} margin={{ top: 20, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#88888833" />
                      <XAxis dataKey="c" type="number" domain={[0, 0.5]} ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5]} tick={axis} tickFormatter={(v) => ru(v, 1)} />
                      <YAxis domain={[0, 0.5]} ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5]} tick={axis} tickFormatter={(v) => ru(v, 1)} />
                      <Tooltip formatter={(v: any) => ru(Number(v), 3)} labelFormatter={(l: any) => `C = ${ru(Number(l), 3)}`} contentStyle={{ fontSize: 12 }} />
                      <Line dataKey="diag" name="C" stroke="#94a3b8" strokeDasharray="4 3" dot={false} isAnimationActive={false} />
                      <Line dataKey="gamma" name="Γ(C)" stroke="#10b981" strokeWidth={2} dot={false} type="stepAfter" isAnimationActive={false} />
                      <ReferenceLine x={eq.C} stroke="#10b981" label={{ value: 'C**', position: 'top', fontSize: 11, fill: '#10b981' }} />
                      <ReferenceLine x={cs} stroke="#e11d48" strokeDasharray="3 3" label={{ value: 'C*', position: 'top', fontSize: 11, fill: '#e11d48' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div data-nov="N2" data-nov-tag="Н2" className="min-w-0">
                <div data-term="Z_min" className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest mb-1">Цена закрытия разрыва</div>
                <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60 mb-3">Формулы (3.22)–(3.23): Π(C̃), Z_min(C̃) и их разность на отрезке [C**(θ₀); C*], млн руб./год</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={zData} margin={{ top: 20, right: 12, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#88888833" />
                      <XAxis dataKey="c" type="number" domain={['dataMin', 'dataMax']} tick={axis} tickFormatter={(v) => ru(v, 3)} />
                      <YAxis yAxisId="l" tick={axis} domain={['auto', 'auto']} />
                      <YAxis yAxisId="r" orientation="right" tick={axis} />
                      <Tooltip formatter={(v: any) => (v === null ? '—' : ru(Number(v), 2))} labelFormatter={(l: any) => `C̃ = ${ru(Number(l), 3)}`} contentStyle={{ fontSize: 12 }} />
                      <Line yAxisId="l" dataKey="pi" name="Π(C̃)" stroke="#0ea5e9" dot={false} isAnimationActive={false} />
                      <Line yAxisId="l" dataKey="net" name="Π − Z_min" stroke="#10b981" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                      <Line yAxisId="r" dataKey="zmin" name="Z_min (правая ось)" stroke="#f59e0b" type="stepAfter" dot={false} connectNulls={false} isAnimationActive={false} />
                      <ReferenceLine yAxisId="l" x={curve.hat.c} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Ĉ', position: 'top', fontSize: 11, fill: '#10b981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 text-[length:calc(11px*var(--ui,1))] font-mono opacity-70 mt-2">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-sky-500" />Π(C̃)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500" />Π − Z_min</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500" />Z_min (правая ось)</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 content-start pt-4 border-t border-dashed border-gray-500/30">
              <Stat term="C_eq" label="C** — равновесная (3.18)" value={ru(eq.C, 3)} sub={`участников: ${eq.part.length}, связей: ${ru(eq.C * N_DOP)}`} />
              <Stat term="C_star" label="C* — оптимальная (2.13)" value={ru(cs, 3)} sub={`Π(C*) = ${ru(piStar, 1)} млн руб.`} />
              <Stat term="dC" label="Δ_C — разрыв (3.19)" value={ru(dC, 3)} tone={dC > 0.0005 ? 'bad' : 'ok'}
                sub={dC < 0 ? 'сеть шире оптимума' : dC > 0.0005 ? 'сеть недобирает связи' : 'разрыв закрыт'} />
              <Stat term="W" label="W = Π(C**) − Z (3.20)" value={ru(W, 1)} sub={`Π = ${ru(piEq, 1)}; Z = ${ru(eq.Z, 2)} млн руб.`} />
              <Stat term="C_hat" label="Ĉ — целевая связность (3.23)" value={ru(curve.hat.c, 3)}
                sub={`Z_min = ${ru(curve.hat.zmin ?? 0, 2)} млн руб. при σ = ${ru((curve.hat.sigma ?? 0) * 100)} %`} />
              <Stat term="Z_min" label="Z_min(C*) — цена полного закрытия" value={(() => {
                const last = curve.rows[curve.rows.length - 1];
                return last && last.zmin !== null ? ru(last.zmin, 2) : 'недостижимо';
              })()} sub="млн руб./год, (3.22)" />
              <Stat term="C_liq" label="γ_пуб·SD(C**) + B_внеш ≥ C_ликв (3.21)" value={`${ru(pubEq + p.bExt, 2)} / ${ru(p.cLiq, 1)}`}
                tone={budgetOk ? 'ok' : 'bad'} sub={`из дивиденда ${ru(pubEq, 2)}; недостаёт ${ru(Math.max(0, p.cLiq - pubEq - p.bExt), 2)}`} />
              <Stat term="SD" label="SD(C**) — дивиденд" value={ru(sdEq, 2)} sub={`φ(C**) = ${ru(phiEq, 3)}`} />
            </div>
            <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60 leading-relaxed">
                Из вкладки «Симуляция»: α = {ru(p.alpha, 3)}; k(t) = {ru(p.k, 2)};
                Σ вкладов потоков = {ru(p.flowsNet, 1)}, Z_пл = {ru(p.platformCost, 1)} млн руб.<br />
                Механизм: k = {ru(mp.k, 2)} (одно значение для SD и Π), τ = {mp.tau}, G = {PI.G}, T₀ = {PI.T0}; N_доп = {N_DOP}.<br />
                Γ(C) {mono.ok ? 'не убывает — условие Тарского выполнено' : `убывает на ${ru(mono.worst, 3)} — условие Тарского нарушено`}.
              </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={box} data-nov="N1" data-nov-tag="Н1">
          <div data-term="N_dop" className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest mb-1">Участие резидентов по типам при C**</div>
          <table className="w-full text-[length:calc(12px*var(--ui,1))] font-mono">
            <thead><tr className="opacity-50 border-b border-gray-500/20 text-left">
              <th className="py-1 font-normal">Тип резидента</th><th className="py-1 font-normal text-right">Участвуют</th>
              <th className="py-1 font-normal text-right">Всего</th><th className="py-1 font-normal text-right">Исключены (3.16)</th>
            </tr></thead>
            <tbody>{byType.map((r) => (
              <tr key={r.t} className="border-b border-gray-500/10">
                <td className="py-1">{r.t}. {r.label}</td><td className="py-1 text-right font-bold">{r.part}</td>
                <td className="py-1 text-right">{r.total}</td><td className="py-1 text-right">{r.excl || '—'}</td>
              </tr>))}
            </tbody>
          </table>
        </div>

        <div className={box} data-nov="N2" data-nov-tag="Н2">
          <div className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest mb-2">Вывод о целевой связности</div>
          <p className="text-[length:calc(13px*var(--ui,1))] opacity-80 leading-relaxed">
            {curve.hat.c < cs - 0.0025
              ? `Цена закрытия растёт быстрее выигрыша: целевая связность Ĉ = ${ru(curve.hat.c, 3)} лежит между C** и C*, добиваться оптимума бюджету невыгодно.`
              : `Разрыв выгодно закрыть полностью: Ĉ = C*, обоснованная сумма поддержки — Z_min(C*).`}
            {' '}Отклик участия на 1 млн руб.: σ — {ru(resp.sigma, 2)}, α — {ru(resp.alpha, 2)} резидента.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={box} data-nov="N3" data-nov-tag="Н3">
          <div data-term="lambda_star" className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest mb-1">Резиденты-поставщики якоря</div>
          <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60 mb-3">Условие (3.16) и критическая доля λ*_j = 1 − FC_j/(m_j·R_j) (3.27)</div>
          <table className="w-full text-[length:calc(12px*var(--ui,1))] font-mono">
            <thead><tr className="opacity-50 border-b border-gray-500/20 text-left">
              <th className="py-1 font-normal">№</th><th className="py-1 font-normal">Тип</th>
              <th className="py-1 font-normal text-right">λ_j</th><th className="py-1 font-normal text-right">m_j</th>
              <th className="py-1 font-normal text-right">FC/R</th><th className="py-1 font-normal text-right">λ*_j</th>
              <th className="py-1 font-normal pl-3">Статус</th>
            </tr></thead>
            <tbody>{sellers.map((s) => (
              <tr key={s.id} className="border-b border-gray-500/10">
                <td className="py-1">{s.id}</td><td className="py-1">{s.type}</td>
                <td className="py-1 text-right">{ru(s.lambda, 2)}</td><td className="py-1 text-right">{ru(s.m, 2)}</td>
                <td className="py-1 text-right">{ru(s.fc, 2)}</td><td className="py-1 text-right font-bold">{ru(s.lamStar, 2)}</td>
                <td className={cn('py-1 pl-3', s.status === 'устойчив' ? 'text-emerald-500' : 'text-rose-500')}>{s.status}</td>
              </tr>))}
            </tbody>
          </table>
          <p className="text-[length:calc(12px*var(--ui,1))] opacity-70 leading-relaxed mt-3">
            Единая норма λ̄ = {ru(lambdaBar, 2)} мягка для низкомаржинальных резидентов и жёстка для высокомаржинальных.
            Закупки CO₂ и тепла у «Азота» под предел не подпадают.
          </p>
        </div>

        <div className={box} data-nov="A2" data-nov-tag="А2">
          <div data-term="rebound" className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest mb-1">Поправка на эффект отдачи</div>
          <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60 mb-3">
            Формулы (3.28)–(3.30) на рядах 2017–2026 гг.: Q₀ = Cap·γ_t, ε·Q₀ = выбросы года (рабочая книга «Азот_выбросы_модель_2017_2026.xlsx»)
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[length:calc(12px*var(--ui,1))] font-bold opacity-70">База:</span>
            {[{ v: false, l: 'CO₂ (EPA)' }, { v: true, l: `CO₂ + N₂O (вар. ${p.n2oAbated ? 'A' : 'B'})` }].map((o) => (
              <button key={String(o.v)} onClick={() => setWithN2O(o.v)}
                className={cn('px-2 py-1 text-[length:calc(11px*var(--ui,1))] font-bold border',
                  withN2O === o.v ? (p.isDarkMode ? 'bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]' : 'bg-[#141414] text-[#E4E3E0] border-[#141414]') : 'border-gray-500/30 opacity-70')}>
                {o.l}
              </button>
            ))}
            {uOverride !== null && (
              <button onClick={() => setUOverride(null)} className="px-2 py-1 text-[length:calc(11px*var(--ui,1))] font-bold border border-amber-500/50 text-amber-500">
                u по расчёту
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Slider term="rebound" label="ΔQ/Q₀ — прирост выпуска" value={dqShare} min={0} max={0.1} step={0.002}
              onChange={setDqShare} fmt={(v) => `${ru(v * 100, 1)} %`} note="только вызванный симбиозом" />
            <Slider term="u" label="u — доля переданного побочного продукта" value={u} min={0} max={0.1} step={0.0005}
              onChange={setUOverride} fmt={(v) => ru(v, 4)}
              note={uOverride === null ? `расчёт: ${ru(p.dQco2)} тыс. т / E_t` : 'задано вручную'} />
            <Slider term="kappa" label="κ — выбросы при подготовке и использовании" value={kappa} min={0} max={0.5} step={0.01}
              onChange={setKappa} fmt={(v) => ru(v, 2)} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Stat term="rebound" label="ΔEm, тыс. т CO₂ (3.28)" value={ru(rb.dEm, 1)} tone={rb.dEm < 0 ? 'ok' : 'bad'} />
            <Stat term="rebound" label="u·(1−κ) против ΔQ/(Q₀+ΔQ) (3.29)" value={`${ru(rb.lhs, 3)} ${rb.ok ? '>' : '≤'} ${ru(rb.rhs, 3)}`} tone={rb.ok ? 'ok' : 'bad'} />
            <Stat term="rebound" label="Порог прироста выпуска" value={`${ru(rb.threshold * 100, 1)} %`} sub="выше — выбросы растут" />
          </div>
          <table className="w-full text-[length:calc(12px*var(--ui,1))] font-mono mt-4">
            <thead><tr className="opacity-50 border-b border-gray-500/20 text-left">
              <th className="py-1 font-normal">Год</th><th className="py-1 font-normal text-right">γ_t</th>
              <th className="py-1 font-normal text-right">Q₀, тыс. т NH₃</th><th className="py-1 font-normal text-right">E_t, тыс. т</th>
              <th className="py-1 font-normal text-right">u</th><th className="py-1 font-normal text-right">ΔEm, тыс. т</th>
            </tr></thead>
            <tbody>{reboundRows.map((r) => (
              <tr key={r.year} onClick={() => setBaseYear(r.year)}
                className={cn('border-b border-gray-500/10 cursor-pointer hover:bg-emerald-500/5', r.year === baseYear && 'bg-emerald-500/10 font-bold')}>
                <td className="py-0.5">{r.year}</td>
                <td className="py-0.5 text-right">{ru(p.series.find((x) => x.year === r.year)!.gamma, 3)}</td>
                <td className="py-0.5 text-right">{ru(r.Q0)}</td><td className="py-0.5 text-right">{ru(r.E0)}</td>
                <td className="py-0.5 text-right">{ru(r.u, 4)}</td>
                <td className={cn('py-0.5 text-right', r.dEm > 0 ? 'text-rose-500' : 'text-emerald-500')}>{ru(r.dEm, 1)}</td>
              </tr>))}
            </tbody>
          </table>
          <div className="text-[length:calc(10px*var(--ui,1))] font-mono opacity-50 mt-1">Щелчок по строке выбирает базовый год; 2024–2026 гг. — индекс 1,0 с учётом дней простоя d_t.</div>
          <p className="text-[length:calc(12px*var(--ui,1))] opacity-70 leading-relaxed mt-3">
            Ставка платы за НВОС для парниковых газов в России не установлена (s_НВОС = 0), поэтому по (3.30) денежная поправка ΔE
            для CO₂ равна нулю, а прирост выбросов учитывается в натуральном выражении.
          </p>
        </div>
      </div>

      <div className={box} data-nov="N5" data-nov-tag="Н5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <div data-term="W" className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest">Какой механизм даёт наибольший эффект: поведение × механизм</div>
          <button data-term="mc" onClick={runMc} disabled={mcRunning}
            className={cn('px-3 py-1.5 text-[length:calc(11px*var(--ui,1))] font-bold uppercase border', mcRunning ? 'opacity-50' : 'border-emerald-500 text-emerald-500 hover:bg-emerald-500/10')}>
            {mcRunning ? 'Идёт расчёт…' : 'Монте-Карло: 200 испытаний'}
          </button>
        </div>
        <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60 mb-3">
          Критерий — W = Π(C**) − Z (3.20), млн руб./год, а не дивиденд: SD растёт просто от роста α. В ячейке: C** / W; лучший механизм в строке выделен. Та же матрица для 2027 г. на 1000 испытаниях — табл. 3.11а § 3.3.3 (σ лучший в 54–81 % испытаний).
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[length:calc(12px*var(--ui,1))] font-mono min-w-[760px]">
            <thead><tr className="opacity-60 border-b border-gray-500/20 text-left">
              <th className="py-1 pr-2 font-normal">Поведение \ механизм</th>
              {MECHS.map((m) => <th key={m.id} data-term={m.id === 'sigma' ? 'sigmaMech' : m.id} className="py-1 px-1 font-normal text-right" title={m.note}>{m.label}</th>)}
            </tr></thead>
            <tbody>{BEHAVIORS.map((b, bi) => {
              const row = matrix[bi];
              const best = Math.max(...row.map((r) => r.W));
              return (
                <tr key={b.id} className={cn('border-b border-gray-500/10', behavior === b.id && 'bg-emerald-500/5')}>
                  <td data-term={b.id} className="py-1 pr-2" title={b.note}>{b.label}</td>
                  {row.map((r, mi) => (
                    <td key={mi} onClick={() => { setBehavior(b.id); setMech(MECHS[mi].id); }}
                      className={cn('py-1 px-1 text-right cursor-pointer whitespace-nowrap',
                        r.W >= best - 1e-6 && b.id !== 'planner' ? 'text-emerald-500 font-bold' : '',
                        behavior === b.id && mech === MECHS[mi].id && 'outline outline-1 outline-emerald-500')}>
                      {ru(r.C, 3)} / {ru(r.W, 0)}
                    </td>))}
                </tr>);
            })}</tbody>
          </table>
        </div>
        {mc && (
          <div className="overflow-x-auto mt-4">
            <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60 mb-1">
              Доля испытаний (из {mc.n}), в которых механизм дал наибольший W: выигрыш и затраты резидентов ±25 %, k ± 1, вклады потоков и Z_пл ±20 %; ничьи делятся поровну
            </div>
            <table className="w-full text-[length:calc(12px*var(--ui,1))] font-mono min-w-[760px]">
              <tbody>{BEHAVIORS.map((b, bi) => b.id === 'planner' ? null : (
                <tr key={b.id} className="border-b border-gray-500/10">
                  <td className="py-1 pr-2">{b.label}</td>
                  {mc.share[bi].map((sh, mi) => (
                    <td key={mi} className="py-1 px-1 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <div className="h-1.5 bg-emerald-500/70" style={{ width: `${Math.round(sh * 40)}px` }} />
                        <span className={sh >= 0.5 ? 'font-bold text-emerald-500' : ''}>{ru(sh * 100)} %</span>
                      </div>
                    </td>))}
                </tr>))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[length:calc(12px*var(--ui,1))] opacity-70 leading-relaxed mt-3">
          Модели поведения — гипотезы, а не наблюдения. Матрица показывает, какой механизм выигрывает при каком типе поведения;
          какой тип поведения есть у резидентов Невинномысска, определит обследование (§ 3.3). Строка «Планировщик» — эталон C = C*, достижимый без учёта стимулов.
        </p>
      </div>

      <div className={box}>
        <div className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest mb-3">Проверяемые следствия модели (табл. 3.8) при текущих параметрах</div>
        <table className="w-full text-[length:calc(12px*var(--ui,1))] font-mono">
          <tbody>{checks.map((c) => (
            <tr key={c.n} className="border-b border-gray-500/10">
              <td className="py-2 pr-3 opacity-60">{c.n}</td>
              <td className="py-2 pr-3">{c.text}</td>
              <td className="py-2 pr-3 text-right whitespace-nowrap">{c.val}</td>
              <td className={cn('py-2 text-right font-bold whitespace-nowrap', c.ok ? 'text-emerald-500' : 'text-rose-500')}>
                {c.ok ? 'выполняется' : 'не выполняется'}
              </td>
            </tr>))}
          </tbody>
        </table>
        <p className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 mt-3">
          Проверка на демонстрационной популяции показывает работу модели, но не подтверждает следствия: для этого нужны реестр связей платформы,
          отчётность резидентов и данные «Азота» о выпуске и выбросах (§ 3.3).
        </p>
      </div>
    </div>
  );
}

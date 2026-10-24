import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  Activity,
  Zap,
  Leaf,
  TrendingUp,
  Settings,
  Cpu,
  AlertCircle,
  CheckCircle2,
  Gauge,
  HelpCircle,
  Award,
  Thermometer,
  Wind,
  Droplets,
  Sun,
  Moon,
  Recycle,
  Users,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpLeft,
  Coins,
  Factory,
  Shield,
  BookOpen
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import BilevelPanel from './BilevelPanel';
import { CALIB, calcAnchor, calcMetrics, type AnchorParams } from './core';
import BeneficiaryPanel from './BeneficiaryPanel';
import HelpPanel, { NOV_COLOR } from './HelpPanel';
import Defense, { type Audience } from './Defense';
import { AUTHOR, MODEL_VERSION } from './v5content';
import { NOVELTY, NOVELTY_ORDER } from './novelty';
import { AvatarGRES, AvatarAzot, AvatarEPP, AvatarResidents, AvatarOperator, AvatarBudget, AvatarPlatform } from './avatars';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FlowEdge = ({ id, d, color, width, active, duration = "3s" }: any) => (
  <>
    <path 
      id={id}
      d={d}
      stroke={color}
      strokeWidth={width}
      fill="none"
      className={cn("transition-all duration-500", active ? "opacity-20" : "opacity-0")}
    />
    {active && [0, 1, 2].map((i) => (
      <path key={i} d="M -1.5,-1.2 L 1.5,0 L -1.5,1.2 Z" fill={color}>
        <animateMotion 
          dur={duration} 
          repeatCount="indefinite" 
          rotate="auto"
          begin={`${i * (parseFloat(duration) / 3)}s`}
        >
          <mpath href={`#${id}`} />
        </animateMotion>
      </path>
    ))}
  </>
);

interface DataPoint {
  time: string;
  u: number;
  sdt: number;
  er: number;
  ef: number;
}

const MiniSlider = ({ label, value, min, max, step, onChange, fmt, cls, note, term }: {
  label: React.ReactNode; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt: (v: number) => string; cls?: string; note?: string; term?: string;
}) => (
  <div className="space-y-1" data-term={term}>
    <div className="flex justify-between items-end gap-2">
      <span className="text-[length:calc(12px*var(--ui,1))] font-bold tracking-wide opacity-70">{label}</span>
      <span className="text-[length:calc(12px*var(--ui,1))] font-bold font-mono whitespace-nowrap">{fmt(value)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn("w-full h-1 appearance-none cursor-pointer bg-gray-500/20 accent-emerald-500", cls)} />
    {note && <div className="text-[length:calc(10px*var(--ui,1))] font-mono opacity-40">{note}</div>}
  </div>
);

const ru = (x: number, d = 0) => x.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });

// Нормальная случайная величина (Бокса — Мюллера) для шума σ_ε
const gauss = () => {
  const u = 1 - Math.random(), v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

export default function App() {
  // Theme State with persistence and system preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('eco-platform-theme');
    if (saved !== null) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Persist theme changes
  useEffect(() => {
    localStorage.setItem('eco-platform-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Simulation States (Sliders)
  const [synergyFactor, setSynergyFactor] = useState(75); // 0-100%
  const [resourceEfficiency, setResourceEfficiency] = useState(40); // 0-100%
  const [turbineEff, setTurbineEff] = useState(80); // Er: 50, 65, 80, 95
  const [heatExchanger, setHeatExchanger] = useState(80); // Ew: 50, 65, 80, 95
  const [filterResource, setFilterResource] = useState(80); // Ef: 50, 65, 80, 95
  const [investment, setInvestment] = useState(15); // C index: 0-30
  const [year, setYear] = useState(2026); // 2026-2036
  const [kScenario, setKScenario] = useState(5); // k: 3 (Органическая), 5 (Умеренная), 7 (Координируемая)
  const [alpha, setAlpha] = useState(0.10); // alpha: 0.08 - 0.12
  const [distRegime, setDistRegime] = useState<'fiscal' | 'tech' | 'industrial'>('fiscal');

  // Перенос § 3.1: поток CO2 сверх Q_0, риск якоря, внешний источник бюджета
  const [dQ, setDQ] = useState(12);              // Q_1 − Q_0, тыс. т/год (табл. 2.5: 8–15)
  const [switchShare, setSwitchShare] = useState(0); // доля поставок резидентам за счёт переключения покупателей
  const [downDays, setDownDays] = useState(0);   // d_t, дни простоя «Азота» (0–60)
  const [piA, setPiA] = useState(CALIB.piA);     // π_A
  const [bExt, setBExt] = useState(0);           // B_внеш, млн руб./год
  const [anchor, setAnchor] = useState<AnchorParams>({
    capAz: CALIB.capAz, eFull: CALIB.eFull, eProc: CALIB.eProc, urea: CALIB.urea,
    an: CALIB.an, efN2O: CALIB.efN2O, n2oAbated: false, downDays: 0
  });
  const [marginJ, setMarginJ] = useState(0.25);  // m_j для (3.27)
  const [fcJ, setFcJ] = useState(0.15);          // FC_j / R_j^пр
  const anchorCalc = useMemo(() => calcAnchor({ ...anchor, downDays }), [anchor, downDays]);

  // Derived States
  const [history, setHistory] = useState<DataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  // Масштаб интерфейса для презентации: 90–160 %, запоминается в браузере
  const [uiScale, setUiScale] = useState<number>(() => {
    try { const v = Number(localStorage.getItem('eco-ui-scale')); return v >= 0.9 && v <= 1.6 ? v : 1; } catch { return 1; }
  });
  useEffect(() => {
    // Масштаб через корневой размер шрифта: rem-размеры и размеры calc(px·var(--ui)) растут вместе, вёрстка перестраивается
    document.documentElement.style.fontSize = `${130 * uiScale}%`;
    document.documentElement.style.setProperty('--ui', String(uiScale));
    try { localStorage.setItem('eco-ui-scale', String(uiScale)); } catch { /* хранилище недоступно */ }
  }, [uiScale]);
  const [helpOpen, setHelpOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1280);
  const [activeTab, setActiveTab] = useState<'simulation' | 'participants' | 'bilevel' | 'benef'>('simulation');
  // Версия 5.0: «Модель» (генезис — тезис — проблемы) и «Лаборатория» (прежние вкладки)
  const [view, setView] = useState<'model' | 'lab'>('model');
  const [audience, setAudience] = useState<Audience>('council');
  const [focus, setFocus] = useState(false);
  useEffect(() => { if (view === 'model') setHelpOpen(false); }, [view]);
  // Режим защиты: подсветка блоков, реализующих научную новизну главы 3
  const [defense, setDefense] = useState<boolean>(() => {
    try { return localStorage.getItem('eco-defense') === '1'; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.classList.toggle('defense', defense);
    try { localStorage.setItem('eco-defense', defense ? '1' : '0'); } catch { /* хранилище недоступно */ }
  }, [defense]);
  const goNovelty = useCallback((id: string) => {
    const n = NOVELTY[id];
    if (!n) return;
    setView('lab');
    setDefense(true);
    setActiveTab(n.tab);
    setHelpOpen(true);
    window.dispatchEvent(new CustomEvent('eco-nov', { detail: id }));
    // блок появляется после смены вкладки; ждём отрисовки
    let tries = 0;
    const seek = () => {
      const el = document.querySelector(`[data-nov="${id}"]`) as HTMLElement | null;
      if (el) {
        const head = (document.querySelector('header') as HTMLElement | null)?.offsetHeight ?? 0;
        const r = el.getBoundingClientRect();
        const room = window.innerHeight - head;
        const y = r.height < room - 40 ? r.top - head - (room - r.height) / 2 : r.top - head - 16;
        window.scrollTo({ top: window.scrollY + y, behavior: 'smooth' });
        el.classList.remove('nov-flash'); void el.offsetWidth; el.classList.add('nov-flash');
      } else if (tries++ < 20) setTimeout(seek, 100);
    };
    setTimeout(seek, 60);
  }, []);

  const participants = [
    {
      name: 'Бюджет дестинации ★ (Невинномысск)',
      functions: 'Получает долю β(C_инд) = 25–45% SD (формула 11); финансирует экофонд, рекультивацию фосфогипса, инфраструктуру; заказывает независимый аудит ΔE через СКФУ',
      contribution: 'Политическая воля; госмониторинг; данные о накопленном ущербе',
      share: 40,
      amount: 10.0
    },
    {
      name: 'Оператор платформы (ООО/АО)',
      functions: 'Разрабатывает и эксплуатирует IoT-платформу, AI-матчинг, цифровые двойники; организует сетевую координацию',
      contribution: 'Программный продукт; алгоритмы верификации ΔE; команда координатора',
      share: 25,
      amount: 6.25
    },
    {
      name: 'Резиденты-поставщики ресурсов (Азот, ГРЭС, ЭПП)',
      functions: 'Поставляют тепло, CO₂, вторсырьё; раскрывают данные о потоках; заключают долгосрочные симбиотические контракты',
      contribution: 'Производственные данные в реальном времени; объёмы вторичных ресурсов',
      share: 15,
      amount: 3.75
    },
    {
      name: 'Корпорация развития Ставропольского края',
      functions: 'Реинвестирует долю SD в новых резидентов ТОСЭР; обеспечивает правовую базу; Стратегия-2035',
      contribution: 'Льготы ТОСЭР; нормативная база; административный ресурс',
      share: 12,
      amount: 3.0
    },
    {
      name: 'Экофонд ликвидации ущерба',
      functions: 'Аккумулирует средства для рекультивации отвалов фосфогипса (18 млн т), очистки грунтовых вод, р. Кубань',
      contribution: 'Экологический аудит; отчётность по ликвидации ущерба',
      share: 8,
      amount: 2.0
    }
  ];

  const calculateMetrics = useCallback(calcMetrics, []);

  // Baseline metrics for 2026 with default settings
  const baseline = useMemo(() => calculateMetrics({
    resourceEfficiency: 40,
    turbineEff: 80,
    heatExchanger: 80,
    filterResource: 80,
    investment: 15,
    year: 2026,
    kScenario: 5,
    alpha: 0.10,
    distRegime: 'fiscal'
  }), [calculateMetrics]);

  // Calculate current metrics based on provided formulas
  const metrics = useMemo(() => {
    const current = calculateMetrics({
      resourceEfficiency,
      turbineEff,
      heatExchanger,
      filterResource,
      investment,
      year,
      kScenario,
      alpha,
      distRegime,
      dQ, switchShare, downDays, piA, bExt
    });

    // Calculate trends relative to baseline
    const calculateTrend = (currentVal: number, baselineVal: number) => {
      if (baselineVal === 0) return currentVal > 0 ? "+100%" : "0.0%";
      const diff = ((currentVal - baselineVal) / baselineVal) * 100;
      return (diff >= 0 ? "+" : "") + diff.toFixed(1) + "%";
    };

    return {
      ...current,
      turbineEff,
      heatExchanger,
      filterResource,
      trends: {
        u: calculateTrend(current.u, baseline.u),
        sd: calculateTrend(current.sd, baseline.sd),
        phi: calculateTrend(current.phi, baseline.phi),
        ecofund: calculateTrend(current.distribution.ecofund, baseline.distribution.ecofund),
        iu: calculateTrend(current.iu, baseline.iu),
        deltaE: calculateTrend(current.deltaE_t, baseline.deltaE_t)
      }
    };
  }, [calculateMetrics, resourceEfficiency, turbineEff, heatExchanger, filterResource, investment, year, kScenario, alpha, distRegime, dQ, switchShare, downDays, piA, bExt, baseline]);

  const getStatusColor = (val: number) => {
    if (val <= 50) return "accent-red-500";
    if (val <= 65) return "accent-orange-500";
    if (val <= 80) return "accent-emerald-400";
    return "accent-green-500";
  };

  const getIconColor = (val: number) => {
    if (val <= 50) return "text-red-500";
    if (val <= 65) return "text-orange-500";
    if (val <= 80) return "text-emerald-400";
    return "text-green-500";
  };

  // Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory((prev) => {
        const newPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          // Шум имитации задаётся σ_ε = 0,073 (остатки модели 3.2), а не σ_Δ
          u: metrics.u * (1 + CALIB.sigmaEps * 0.3 * gauss()),
          sdt: metrics.sd * 10 * (1 + CALIB.sigmaEps * gauss()),
          er: metrics.phi,
          ef: metrics.sd,
          iu: metrics.iu + (Math.random() - 0.5) * 0.5,
        };
        const next = [...prev, newPoint];
        if (next.length > 20) return next.slice(1);
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [metrics]);

  // Determine Regime based on C (Investment Index) and Phi (Synergy)
  const currentRegime = useMemo(() => {
    if (investment < 5) return 0; // Линейный (Отходы)
    if (investment <= 15) return 1; // Переходный
    return 2; // Экосистемный
  }, [investment, metrics.phi]);

  // Диапазоны φ и SD в таблице режимов считаются той же моделью на границах C_инд
  // (5%, 15%, 30%) при текущих настройках, а не задаются вручную
  const regimeBounds = useMemo(() => {
    const at = (c: number) => calculateMetrics({
      resourceEfficiency, turbineEff, heatExchanger, filterResource,
      investment: c, year, kScenario, alpha, distRegime, dQ, switchShare, downDays, piA, bExt
    });
    const m5 = at(5), m15 = at(15), m30 = at(30);
    const f2 = (x: number) => x.toFixed(2);
    const f1 = (x: number) => x.toFixed(1);
    return {
      phi2: `${f2(m5.phi / 100)}–${f2(m15.phi / 100)}`,
      phi3: `${f2(m15.phi / 100)}–${f2(m30.phi / 100)}`,
      sd2: `${f1(m5.sd)}–${f1(m15.sd)}`,
      sd3: `${f1(m15.sd)}–${f1(m30.sd)}`
    };
  }, [calculateMetrics, resourceEfficiency, turbineEff, heatExchanger, filterResource, year, kScenario, alpha, distRegime, dQ, switchShare, downDays, piA, bExt]);

  const regimes = [
    { 
      id: 1, 
      label: 'Линейный (Отходы)', 
      c: '< 5%', 
      phi: '≈ 0', 
      desc: 'Участники разрознены; нет симбиоза; возникают только ОТХОДЫ; SD = 0.', 
      tooltip: 'Низкая связность участников экоплатформы, C < 5, симбиотический дивиденд практически отсутствует (SD ≈ 0)',
      sd: '0',
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    { 
      id: 2, 
      label: 'Переходный', 
      c: '5–15%', 
      phi: regimeBounds.phi2, 
      desc: 'Формируются симбиотические контракты; нелинейный рост SD [цель Фазы I, 2026–2029]', 
      tooltip: 'Средняя связность, формирование симбиотических цепочек, 5 ≤ C ≤ 15, нелинейный рост дивиденда',
      sd: regimeBounds.sd2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    { 
      id: 3, 
      label: 'Экосистемный', 
      c: '15–30%', 
      phi: regimeBounds.phi3, 
      desc: 'Сеть сформирована; устойчивость без льгот ТОСЭР [цель 2031–2035]', 
      tooltip: 'Высокая связность (экосистема), C > 15, устойчивое развитие и максимальный синергетический эффект',
      sd: regimeBounds.sd3,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10'
    }
  ];

  // Chart Colors based on theme
  const chartColors = {
    grid: isDarkMode ? "rgba(228, 227, 224, 0.1)" : "rgba(20, 20, 20, 0.1)",
    text: isDarkMode ? "#E4E3E0" : "#141414",
    area: isDarkMode ? "#E4E3E0" : "#141414",
    tooltipBg: isDarkMode ? "#E4E3E0" : "#141414",
    tooltipText: isDarkMode ? "#141414" : "#E4E3E0",
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300 font-sans selection:bg-emerald-500 selection:text-white",
      isDarkMode && "theme-dark",
      helpOpen && view === 'lab' && "sm:pr-[360px]",
      isDarkMode ? "bg-[#141414] text-[#E4E3E0]" : "bg-[#E4E3E0] text-[#141414]"
    )}>
      {/* Header */}
      <header className={cn(
        "border-b px-6 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 backdrop-blur-sm sticky top-0 z-10 transition-colors duration-300",
        isDarkMode ? "bg-[#141414]/80 border-[#E4E3E0]/20" : "bg-white/50 border-[#141414]"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-sm flex items-center justify-center transition-colors duration-300",
            isDarkMode ? "bg-[#E4E3E0] text-[#141414]" : "bg-[#141414] text-[#E4E3E0]"
          )}>
            <Cpu size={24} />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest whitespace-nowrap">Имитационная модель экоплатформы</h1>
            <p className="text-[length:calc(12px*var(--ui,1))] font-mono opacity-60">г. Невинномысск · автор: {AUTHOR.role} {AUTHOR.name} · v{MODEL_VERSION}</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setView('model')}
            className={cn("px-3 py-2 text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-wider whitespace-nowrap border-2 transition-colors",
              view === 'model' ? "text-white" : "")}
            style={view === 'model' ? { background: 'var(--c-nov)', borderColor: 'var(--c-nov)' } : { borderColor: 'var(--c-nov)', color: 'var(--c-nov)' }}
          >
            Модель
          </button>
          <span className="px-2 text-[length:calc(11px*var(--ui,1))] font-mono uppercase opacity-50">Лаборатория:</span>
          <button 
            onClick={() => { setView('lab'); setActiveTab('simulation'); }}
            className={cn(
              "px-3 py-2 text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 border-b-2",
              view === 'lab' && activeTab === 'simulation' 
                ? (isDarkMode ? "border-[#E4E3E0] text-[#E4E3E0]" : "border-[#141414] text-[#141414]")
                : "border-transparent opacity-50 hover:opacity-100"
            )}
          >
            Симуляция
          </button>
          <button 
            onClick={() => { setView('lab'); setActiveTab('participants'); }}
            className={cn(
              "px-3 py-2 text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 border-b-2",
              view === 'lab' && activeTab === 'participants' 
                ? (isDarkMode ? "border-[#E4E3E0] text-[#E4E3E0]" : "border-[#141414] text-[#141414]")
                : "border-transparent opacity-50 hover:opacity-100"
            )}
          >
            Участники
          </button>
          <button 
            onClick={() => { setView('lab'); setActiveTab('bilevel'); }}
            className={cn(
              "px-3 py-2 text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 border-b-2",
              view === 'lab' && activeTab === 'bilevel' 
                ? (isDarkMode ? "border-[#E4E3E0] text-[#E4E3E0]" : "border-[#141414] text-[#141414]")
                : "border-transparent opacity-50 hover:opacity-100"
            )}
          >
            Двухуровневая модель
          </button>
          <button 
            onClick={() => { setView('lab'); setActiveTab('benef'); }}
            className={cn(
              "px-3 py-2 text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-300 border-b-2",
              view === 'lab' && activeTab === 'benef' 
                ? (isDarkMode ? "border-[#E4E3E0] text-[#E4E3E0]" : "border-[#141414] text-[#141414]")
                : "border-transparent opacity-50 hover:opacity-100"
            )}
          >
            Бенефициары и стратегии
          </button>
        </nav>
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={cn(
                "p-2 rounded-full transition-all duration-300 hover:scale-110",
                isDarkMode ? "bg-[#E4E3E0]/10 text-yellow-400" : "bg-[#141414]/5 text-blue-600"
              )}
              title={isDarkMode ? "Переключить на светлую тему" : "Переключить на темную тему"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className={cn("flex items-center border text-[length:calc(12px*var(--ui,1))] font-bold font-mono", isDarkMode ? "border-[#E4E3E0]/30" : "border-[#141414]/30")}
              title="Масштаб интерфейса для презентации">
              <button onClick={() => setUiScale(Math.max(0.9, Math.round((uiScale - 0.1) * 10) / 10))} className="px-2 py-1.5 hover:bg-emerald-500/10" aria-label="Уменьшить масштаб">A−</button>
              <button onClick={() => setUiScale(1)} className="px-1.5 py-1.5 opacity-70 hover:opacity-100" title="Сбросить масштаб">{Math.round(uiScale * 100)}%</button>
              <button onClick={() => setUiScale(Math.min(1.6, Math.round((uiScale + 0.1) * 10) / 10))} className="px-2 py-1.5 hover:bg-emerald-500/10" aria-label="Увеличить масштаб">A+</button>
            </div>
            {view === 'model' && (
              <div className={cn("flex items-center border text-[length:calc(12px*var(--ui,1))] font-bold", isDarkMode ? "border-[#E4E3E0]/30" : "border-[#141414]/30")} title="Адресат показа">
                {([['council', 'Учёный совет'], ['gov', 'Правительство']] as const).map(([id, l]) => (
                  <button key={id} onClick={() => setAudience(id)} aria-pressed={audience === id}
                    className={cn("px-2.5 py-1.5", audience === id && (isDarkMode ? "bg-[#E4E3E0] text-[#141414]" : "bg-[#141414] text-white"))}>{l}</button>
                ))}
              </div>
            )}
            {view === 'model' && (
              <button onClick={() => setFocus(!focus)} aria-pressed={focus} title="Скрыть боковые меню (клавиша F или двойной щелчок по свободному полю)"
                className={cn("px-2.5 py-1.5 text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest border", focus ? (isDarkMode ? "bg-[#E4E3E0] text-[#141414]" : "bg-[#141414] text-white") : (isDarkMode ? "border-[#E4E3E0]/30" : "border-[#141414]/30"))}>
                Фокус
              </button>
            )}
            {view === 'lab' && <button
              onClick={() => { const v = !defense; setDefense(v); if (v) setHelpOpen(true); }}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest border transition-colors",
                defense ? "text-white" : (isDarkMode ? "border-[#E4E3E0]/30" : "border-[#141414]/30"))}
              style={defense ? { background: NOV_COLOR, borderColor: NOV_COLOR } : undefined}
              title="Режим защиты: подсветить блоки, реализующие научную новизну главы 3"
              aria-pressed={defense}
            >
              <Award size={14} /> Новизна
            </button>}
            <button
              onClick={() => setHelpOpen(!helpOpen)}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest border transition-colors",
                helpOpen ? "border-emerald-500 text-emerald-500" : (isDarkMode ? "border-[#E4E3E0]/30" : "border-[#141414]/30"))}
              title="Справка: что означает каждый член модели"
            >
              <BookOpen size={14} /> Справка
            </button>
            
          </div>
        </div>
        {defense && view === 'lab' && (
          <div className="-mx-6 -mb-3 mt-1 px-6 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[length:calc(12px*var(--ui,1))] border-t"
            style={{ width: 'calc(100% + 3rem)', borderColor: NOV_COLOR, background: isDarkMode ? '#241a36' : '#f1ecfb' }}>
            <span className="font-bold uppercase tracking-widest" style={{ color: NOV_COLOR }}>Научная новизна (гл. 3):</span>
            {NOVELTY_ORDER.map((id) => {
              const n = NOVELTY[id];
              return (
                <button key={id} onClick={() => goNovelty(id)} title={n.title}
                  className="px-2 py-0.5 font-mono font-bold text-white hover:opacity-85"
                  style={{ background: n.level === 'N' ? NOV_COLOR : '#a78bfa' }}>{n.tag}</button>
              );
            })}
            <span className="opacity-70">сплошная рамка — положение, выносимое на защиту; пунктир — авторская адаптация метода; наведите на рамку блока</span>
          </div>
        )}

      </header>

      <main className="p-6 pb-14">
        {view === 'model' ? (
          <Defense isDarkMode={isDarkMode} audience={audience} focus={focus} setFocus={setFocus}
            onOpenLab={(id) => { if (id) goNovelty(id); else setView('lab'); }} />
        ) : activeTab === 'benef' ? (
          <BeneficiaryPanel
            isDarkMode={isDarkMode}
            kScenario={kScenario}
            cInd={investment / 100}
            flows={{ heatNet: metrics.flows.heatNet, co2Net: metrics.flows.co2Net, recycleNet: metrics.flows.recycleNet, nvosNet: metrics.flows.nvosNet }}
            platformCost={metrics.flows.platformCost}
            alpha={alpha}
            mult={metrics.distribution.shares.multiplier}
            regimeWeights={({ fiscal: { operator: 0.25, suppliers: 0.15, corporation: 0.12 }, tech: { operator: 0.40, suppliers: 0.15, corporation: 0.12 }, industrial: { operator: 0.15, suppliers: 0.40, corporation: 0.12 } })[distRegime]}
            bExt={bExt}
            cLiq={15.5}
            dQ={dQ}
            e2026={(() => { const r = anchorCalc.series.find((x) => x.year === '2026')!; return r.co2 + (anchor.n2oAbated ? r.n2oA : r.n2oB); })()}
          />
        ) : activeTab === 'bilevel' ? (
          <BilevelPanel
            isDarkMode={isDarkMode}
            alpha={alpha}
            flowsNet={metrics.flowsNetSum}
            platformCost={metrics.flows.platformCost}
            k={metrics.k}
            regime={distRegime}
            bExt={bExt}
            setBExt={setBExt}
            cLiq={metrics.c_liq}
            capAz={anchor.capAz}
            eFull={anchor.eFull}
            series={anchorCalc.series}
            dQco2={dQ}
            n2oAbated={anchor.n2oAbated}
          />
        ) : activeTab === 'simulation' ? (
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar Controls */}
            <aside className="col-span-12 lg:col-span-3 space-y-6">
          <section className={cn(
            "border p-5 space-y-6 transition-colors duration-300",
            isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
          )}>
            <div className={cn(
              "flex items-center justify-between border-b pb-2 transition-colors duration-300",
              isDarkMode ? "border-[#E4E3E0]/10" : "border-[#141414]/10"
            )}>
              <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Settings size={14} /> Управление процессом
              </h2>
            </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-widest opacity-50">Горизонт прогноза (t)</label>
                    <span className="text-lg font-bold font-mono text-emerald-500 tracking-wider">{year} год</span>
                  </div>
                  <div className="relative pt-2 pb-6">
                    <input 
                      type="range" 
                      min="2026" 
                      max="2036" 
                      step="1"
                      value={year} 
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      className="w-full h-1 bg-gray-500/20 rounded-lg appearance-none cursor-pointer accent-emerald-500 relative z-10"
                    />
                    {/* Annual notches */}
                    <div className="absolute top-2.5 left-0 w-full flex justify-between px-[2px] pointer-events-none">
                      {Array.from({ length: 11 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "w-[1px] h-2 transition-colors duration-300",
                            (2026 + i) <= year ? "bg-emerald-500/50" : "bg-gray-500/30"
                          )} 
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[length:calc(10px*var(--ui,1))] font-mono opacity-40 uppercase mt-2">
                      <span>2026</span>
                      <span>2031</span>
                      <span>2036</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label data-term="k" className="text-xs font-bold uppercase tracking-widest opacity-50">Институциональная среда (k)</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { 
                        val: 3, 
                        label: 'Органическая', 
                        sub: 'Kalundborg',
                        tooltip: 'Органическая среда — это слабокоординируемая среда, где симбиоз развивается преимущественно самопроизвольно, за счёт инициативы компаний и рыночных стимулов, без жёсткого управления.'
                      },
                      { 
                        val: 5, 
                        label: 'Умеренная', 
                        sub: 'Nevinnomyssk',
                        tooltip: 'Умеренная среда — это частично координируемая среда, где есть базовые правила и поддержка (льготы, сервисы экоплатформы), но значительная часть связей всё ещё формируется «снизу».'
                      },
                      { 
                        val: 7,
                        label: 'Координируемая',
                        sub: 'TEDA',
                        tooltip: 'Координируемая среда — это среда с сильной институциональной координацией, где экоплатформа и органы управления целенаправленно проектируют и поддерживают сети симбиоза, доводя связность до экосистемного режима'
                      }
                    ].map((s) => (
                      <div key={s.val} className="group relative">
                        <button
                          onClick={() => setKScenario(s.val)}
                          className={cn(
                            "w-full py-2 px-3 text-[length:calc(11px*var(--ui,1))] font-bold uppercase tracking-tight border transition-all duration-300 flex flex-row items-center justify-between gap-2",
                            kScenario === s.val 
                              ? (isDarkMode ? "bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]" : "bg-[#141414] text-[#E4E3E0] border-[#141414]")
                              : (isDarkMode ? "border-[#E4E3E0]/20 hover:border-[#E4E3E0]/50" : "border-[#141414]/20 hover:border-[#141414]/50")
                          )}
                        >
                          <span>{s.label}</span>
                          <span className="opacity-50 font-normal mt-0.5">{s.sub}</span>
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl pointer-events-none text-center">
                          {s.tooltip}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-1.5 group relative">
                      <label data-term="alpha" className="text-xs font-bold uppercase tracking-widest opacity-50">Коэф. дивиденда (α)</label>
                      <HelpCircle size={10} className="opacity-30 hover:opacity-100 cursor-help transition-opacity" />
                      <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl">
                        Коэффициент дивиденда (α) — это доля симбиотического дивиденда, закреплённая за конкретной группой получателей (например, Экофонд, компании-резиденты, город), в рамках распределения общего SD по экобюджету назначения (вторая вкладка участники).
                      </div>
                    </div>
                    <span className="text-xs font-bold font-mono">{alpha.toFixed(3)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.08" max="0.12" 
                    step="0.001"
                    value={alpha} 
                    onChange={(e) => setAlpha(Number(e.target.value))}
                    className={cn(
                      "w-full h-1 appearance-none cursor-pointer transition-colors duration-300",
                      isDarkMode ? "bg-[#E4E3E0]/10 accent-[#E4E3E0]" : "bg-[#E4E3E0] accent-[#141414]"
                    )}
                  />
                  <div className="flex justify-between text-[length:calc(10px*var(--ui,1))] font-mono opacity-40 uppercase">
                    <span>0.08</span>
                    <span>0.10</span>
                    <span>0.12</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label data-term="regime" className="text-xs font-bold uppercase tracking-widest opacity-50">Выбор режима (Пресеты)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {regimes.map((r, idx) => (
                      <div key={r.id} className="group relative">
                        <button
                          onClick={() => {
                            if (idx === 0) { setInvestment(2); setSynergyFactor(5); setResourceEfficiency(20); }
                            if (idx === 1) { setInvestment(10); setSynergyFactor(45); setResourceEfficiency(55); }
                            if (idx === 2) { setInvestment(25); setSynergyFactor(90); setResourceEfficiency(85); }
                          }}
                          className={cn(
                            "w-full py-2 text-[length:calc(11px*var(--ui,1))] font-bold uppercase tracking-tighter border transition-all duration-300",
                            currentRegime === idx 
                              ? (isDarkMode ? "bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]" : "bg-[#141414] text-[#E4E3E0] border-[#141414]")
                              : (isDarkMode ? "border-[#E4E3E0]/20 hover:border-[#E4E3E0]/50" : "border-[#141414]/20 hover:border-[#141414]/50")
                          )}
                        >
                          Режим {r.id}
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl pointer-events-none text-center">
                          {r.tooltip}
                        </div>
                      </div>
                    ))}
                  </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-1.5 group relative">
                    <label data-term="phi" className="text-xs font-bold uppercase tracking-widest opacity-50">Коэффициент синергии (φ)</label>
                    <HelpCircle size={10} className="opacity-30 hover:opacity-100 cursor-help transition-opacity" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl">
                      Коэффициент синергии (φ) — это интегральный показатель, отражающий долю реализованного симбиотического эффекта (полученного симбиотического дивиденда) от потенциально возможного эффекта в экосистеме кластера
                    </div>
                  </div>
                  <span className={cn("text-xs font-bold font-mono", metrics.phi === 0 ? "text-red-500" : "text-emerald-500")}>
                    {metrics.phi.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1 w-full bg-gray-500/20 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", metrics.phi === 0 ? "bg-red-500" : "bg-emerald-500")}
                    style={{ width: `${metrics.phi}%` }}
                  />
                </div>
                <p className="text-[length:calc(10px*var(--ui,1))] opacity-50 italic leading-tight">
                  {metrics.phi === 0 ? "Связи отсутствуют (разрозненность)" : "Рассчитано на основе k и C_инд"}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-1.5 group relative">
                    <label data-term="Er" className="text-xs font-bold uppercase tracking-widest opacity-50">Эффективность ресурсов (Er)</label>
                    <HelpCircle size={10} className="opacity-30 hover:opacity-100 cursor-help transition-opacity" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl">
                      Эффективность ресурсов (Er) — это показатель, отражающий, насколько полно и результативно используются материальные и энергетические ресурсы кластера в результате симбиоза (с учётом предотвращённых потерь и экономии)
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono">{resourceEfficiency}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={resourceEfficiency} 
                  onChange={(e) => setResourceEfficiency(Number(e.target.value))}
                  className={cn(
                    "w-full h-1 appearance-none cursor-pointer transition-colors duration-300",
                    isDarkMode ? "bg-[#E4E3E0]/10 accent-[#E4E3E0]" : "bg-[#E4E3E0] accent-[#141414]"
                  )}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-1.5 group relative">
                    <label data-term="C_ind" className="text-xs font-bold uppercase tracking-widest opacity-50">Связность C_инд</label>
                    <HelpCircle size={10} className="opacity-30 hover:opacity-100 cursor-help transition-opacity" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl">
                      Связность C_инд = N_действ / N_доп — доля допустимых межфирменных обменов (технически возможных, законных и выгодных), которые реально действуют по договору и с учётом объёмов. Это не инвестиции и не число предприятий.
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono">{(investment / 100).toFixed(2)} <span className="opacity-60 font-normal">({investment} % связей)</span></span>
                </div>
                <input 
                  type="range" 
                  min="0" max="30" 
                  value={investment} 
                  onChange={(e) => setInvestment(Number(e.target.value))}
                  className={cn(
                    "w-full h-1 appearance-none cursor-pointer transition-colors duration-300",
                    isDarkMode ? "bg-[#E4E3E0]/10 accent-[#E4E3E0]" : "bg-[#E4E3E0] accent-[#141414]"
                  )}
                />
              </div>
            </div>

            <div className={cn(
              "pt-4 border-t transition-colors duration-300",
              isDarkMode ? "border-[#E4E3E0]/10" : "border-[#141414]/10"
            )}>
              <div className={cn(
                "px-3 py-2 border flex items-center justify-between transition-colors duration-300",
                isDarkMode ? "bg-white/5 border-[#E4E3E0]/20" : "bg-black/5 border-[#141414]"
              )}>
                <span className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-tighter">Текущий режим</span>
                <span className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase text-emerald-500">{regimes[currentRegime].label}</span>
              </div>
            </div>
          </section>

          <section className={cn(
            "p-5 space-y-4 transition-colors duration-300",
            "bg-[#0f172a] text-[#E4E3E0]"
          )}>
            <h3 className="text-xs font-bold uppercase tracking-widest opacity-50">Система ограничений</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 group relative">
                    <span data-term="density" className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest">1. Синерг. плотность (C ≥ 15%)</span>
                    <HelpCircle size={10} className="opacity-30 hover:opacity-100 cursor-help transition-opacity" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl">
                      C≥15% — это уровень связности экосистемы, при котором не менее 15% потенциально возможных симбиотических связей между участниками кластера фактически реализованы (начало экосистемного режима).
                    </div>
                  </div>
                  {metrics.constraints.density ? (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  ) : (
                    <AlertCircle size={14} className="text-red-500" />
                  )}
                </div>
                <div className="h-1 w-full bg-gray-500/20 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", metrics.constraints.density ? "bg-emerald-500" : "bg-red-500")}
                    style={{ width: `${Math.min(100, (metrics.c / 15) * 100)}%` }}
                  />
                </div>
              </div>

              <div data-nov="N6" data-nov-tag="Н6" className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 group relative">
                    <span data-term="C_liq" className="text-[length:calc(12px*var(--ui,1))] font-bold tracking-wide">2. БЮДЖЕТ (SD_б + B_внеш ≥ C_ликв)</span>
                    <HelpCircle size={10} className="opacity-30 hover:opacity-100 cursor-help transition-opacity" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl">
                      SD_б + B_внеш ≥ C_ликв — условие, что дивиденд в бюджете назначения вместе с внешним источником (B_внеш: целевые средства бюджета, экологические платежи, грант) покрывает стоимость ликвидации накопленного ущерба. Одним SD_б оно не выполняется ни в одном сценарии главы 2 (3,6–3,9 против 15,5 млн руб.).
                    </div>
                  </div>
                  {metrics.constraints.budget ? (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  ) : (
                    <AlertCircle size={14} className="text-red-500" />
                  )}
                </div>
                <div className="flex justify-between text-[length:calc(10px*var(--ui,1))] font-mono opacity-60">
                  <span>SD_б: {metrics.sd_budget.toFixed(2)}</span>
                  <span>B_внеш: {metrics.bExt.toFixed(1)}</span>
                  <span>C_ликв: {metrics.c_liq.toFixed(2)}</span>
                </div>
                <div className="h-1 w-full bg-gray-500/20 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", metrics.constraints.budget ? "bg-emerald-500" : "bg-red-500")}
                    style={{ width: `${Math.min(100, ((metrics.sd_budget + metrics.bExt) / metrics.c_liq) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span data-term="B_ext" className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-70">Внешний источник B_внеш</span>
                  <span className="text-[length:calc(12px*var(--ui,1))] font-bold font-mono">{bExt.toFixed(1)} млн руб.</span>
                </div>
                <input type="range" min="0" max="20" step="0.5" value={bExt}
                  onChange={(e) => setBExt(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                <p className="text-[length:calc(10px*var(--ui,1))] font-mono opacity-50 leading-tight">
                  Дефицит без B_внеш: {Math.max(0, metrics.c_liq - metrics.sd_budget).toFixed(2)} млн руб.
                </p>
              </div>
            </div>
          </section>

          <section className={cn(
            "p-5 space-y-4 transition-colors duration-300",
            "bg-[#064e3b] text-[#E4E3E0]"
          )}>
            <div className="flex items-center gap-1.5 group relative">
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-50">Устойчивость экосистемы</h3>
              <HelpCircle size={10} className="opacity-30 hover:opacity-100 cursor-help transition-opacity" />
              <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl">
                Устойчивость экосистемы — это экран мониторинга, который в реальном времени показывает техническое состояние ключевого оборудования кластера (турбина, теплообменник, фильтр выбросов и др.) на основе датчиков и IoT-систем.
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2 group relative">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={14} className={getIconColor(turbineEff)} />
                  <span data-term="Er" className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest cursor-help">Эффективность турбины (Er): {turbineEff}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" max="95" step="15"
                  value={turbineEff} 
                  onChange={(e) => setTurbineEff(Number(e.target.value))}
                  className={cn("w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer", getStatusColor(turbineEff))}
                />
                <div className="flex justify-between text-[length:calc(9px*var(--ui,1))] font-mono opacity-40">
                  <span>50%</span>
                  <span>65%</span>
                  <span>80%</span>
                  <span>95%</span>
                </div>
                <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl">
                  Эффективность турбины — это текущий КПД турбины, показывающий, какую долю подведённой энергии она превращает в полезную работу; значение берётся из потока телеметрии оборудования, подключённого к экоплатформе.
                </div>
              </div>

              <div className="space-y-2 group relative">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={14} className={getIconColor(heatExchanger)} />
                  <span data-term="Er" className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest cursor-help">Теплообменник (Ew): {heatExchanger}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" max="95" step="15"
                  value={heatExchanger} 
                  onChange={(e) => setHeatExchanger(Number(e.target.value))}
                  className={cn("w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer", getStatusColor(heatExchanger))}
                />
                <div className="flex justify-between text-[length:calc(9px*var(--ui,1))] font-mono opacity-40">
                  <span>50%</span>
                  <span>65%</span>
                  <span>80%</span>
                  <span>95%</span>
                </div>
                <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl">
                  Теплообменник — это узел, который сейчас работает в штатном режиме и задействован в контуре теплосети; статус поступает из системы оперативного дистекчерского управления и IoT-датчиков.
                </div>
              </div>

              <div className="space-y-2 group relative">
                <div className="flex items-center gap-3">
                  <AlertCircle size={14} className={getIconColor(filterResource)} />
                  <span className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest cursor-help">Фильтр выбросов (Ef): {filterResource}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" max="95" step="15"
                  value={filterResource} 
                  onChange={(e) => setFilterResource(Number(e.target.value))}
                  className={cn("w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer", getStatusColor(filterResource))}
                />
                <div className="flex justify-between text-[length:calc(9px*var(--ui,1))] font-mono opacity-40">
                  <span>50%</span>
                  <span>65%</span>
                  <span>80%</span>
                  <span>95%</span>
                </div>
                <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl">
                  Фильтр выбросов — это показатель расчётного срока службы или пропускной способности до регламентной замены/обслуживания; рассчитывается по наработке, загрузке и данным датчиков экоплатформы.
                </div>
              </div>
            </div>
          </section>
        </aside>

        {/* Main Dashboard Area */}
        <div className="col-span-12 lg:col-span-9">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ═══ ЛЕВАЯ КОЛОНКА: Научная цепочка показателей φ→ΔE→SD→U→SD_e→ИУ ═══ */}
            <div className="lg:col-span-4 flex flex-col gap-3">

              {/* Заголовок цепочки */}
              <div className={cn("px-3 py-2 border-l-2 border-emerald-500", isDarkMode ? "bg-emerald-500/5" : "bg-emerald-50")}>
                <p className="text-[length:calc(10px*var(--ui,1))] font-bold uppercase tracking-widest opacity-60">Причинно-следственная цепочка</p>
                <p className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-40">φ → ΔE → SD → U → ИУ</p>
              </div>

              {/* 1. φ — Синергия (механизм) */}
              <KPICard
                label="① Синергия (φ)"
                term="phi"
                value={metrics.phi.toFixed(1)}
                unit="%"
                icon={<Zap size={16} />}
                trend={metrics.trends.phi}
                isDarkMode={isDarkMode}
                tooltip="Коэффициент синергии (φ) — доля реализованного симбиотического эффекта от потенциально возможного. Ключевой нелинейный механизм модели."
                formula={<span>φ = 1 - e<sup className="text-[length:calc(12px*var(--ui,1))] -top-1 relative">-k·C</sup>, &nbsp; k ≈ {metrics.k.toFixed(1)}</span>}
                trendLarge={true}
              />

              {/* Стрелка */}
              <div className="flex items-center gap-2 px-2 opacity-30">
                <div className="flex-1 h-[1px] bg-emerald-500" />
                <ArrowRight size={10} className="text-emerald-500" />
              </div>

              {/* 2. ΔE(t) — Верифицированная экономия */}
              <KPICard
                label="② Экономия ΔE(t)"
                term="dE_t"
                value={metrics.deltaE_t.toFixed(1)}
                unit="млн.руб/год"
                icon={<Thermometer size={16} />}
                trend={metrics.trends.deltaE}
                isDarkMode={isDarkMode}
                tooltip="Верифицированная экономия от симбиоза. ΔE(t) = φ(C_инд)·Σ(E_i − A_i) − Z_пл: чистые вклады потоков (тепло ГРЭС, CO₂ «Азота» сверх 32 тыс. т, вторсырьё ЭПП, плата за НВОС; 187,1 млн руб.) реализуются в доле φ, а затраты платформы Z_пл = 69,6 млн руб. постоянны. При полной реализации ΔE = 117,4 млн руб. (табл. 2.6)."
                formula={<span>ΔE(t) = Σ<sub className="text-[length:calc(12px*var(--ui,1))]">i</sub> E<sub className="text-[length:calc(12px*var(--ui,1))]">i</sub>(t) · φ(C<sub className="text-[length:calc(12px*var(--ui,1))]">инд</sub>)</span>}
                trendLarge={true}
              />

              {/* Стрелка */}
              <div className="flex items-center gap-2 px-2 opacity-30">
                <div className="flex-1 h-[1px] bg-emerald-500" />
                <ArrowRight size={10} className="text-emerald-500" />
              </div>

              {/* 3. SD — Симбиотический дивиденд */}
              <KPICard
                label="③ Дивиденд SD(t)"
                term="SD"
                value={metrics.sd.toFixed(2)}
                unit="млн.руб"
                icon={<TrendingUp size={16} />}
                trend={metrics.trends.sd}
                isDarkMode={isDarkMode}
                formula={<span>SD<sub className="text-[length:calc(12px*var(--ui,1))]">t</sub> = α · ΔE(t) · M<sub className="text-[length:calc(12px*var(--ui,1))]">режим</sub></span>}
                trendLarge={true}
              />

              {/* Стрелка */}
              <div className="flex items-center gap-2 px-2 opacity-30">
                <div className="flex-1 h-[1px] bg-emerald-500" />
                <ArrowRight size={10} className="text-emerald-500" />
              </div>

              {/* 4. U — Целевая функция */}
              <KPICard
                label="④ Целевая функция U"
                term="U"
                value={metrics.u.toFixed(2)}
                icon={<Gauge size={16} />}
                trend={metrics.trends.u}
                isDarkMode={isDarkMode}
                formula="max U = φ·0.5 + SD·0.3 + EcoSafety·0.2"
                trendLarge={true}
                tooltip="Интегральный показатель полезности экоплатформы. Объединяет синергию, дивиденд и экобезопасность."
              />

              {/* Стрелка */}
              <div className="flex items-center gap-2 px-2 opacity-30">
                <div className="flex-1 h-[1px] bg-emerald-500" />
                <ArrowRight size={10} className="text-emerald-500" />
              </div>

              {/* 5. SD_e — Экофонд */}
              <KPICard
                label="⑤ Экофонд SD_e"
                term="ecofund"
                value={metrics.distribution.ecofund.toFixed(2)}
                unit="млн.руб"
                icon={<Leaf size={16} />}
                trend={metrics.trends.ecofund}
                isDarkMode={isDarkMode}
                formula={<span>SD<sub className="text-[length:calc(12px*var(--ui,1))]">e</sub> = 0.08 · SD<sub className="text-[length:calc(12px*var(--ui,1))]">t</sub></span>}
                trendLarge={true}
              />

              {/* Стрелка */}
              <div className="flex items-center gap-2 px-2 opacity-30">
                <div className="flex-1 h-[1px] bg-emerald-500" />
                <ArrowRight size={10} className="text-emerald-500" />
              </div>

              {/* 6. ИУ — Индекс Устойчивости (финальный интегратор) */}
              <div className={cn(
                "border p-4 space-y-3 transition-all duration-300 hover:-translate-y-1 relative group",
                isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
              )}>
                <div className="flex items-center justify-between opacity-50">
                  <div className="flex items-center gap-1.5 group/tooltip relative">
                    <span className="text-xs font-bold uppercase tracking-widest">⑥ Индекс Устойчивости (ИУ)</span>
                    <HelpCircle size={10} className="opacity-30 hover:opacity-100 cursor-help transition-opacity" />
                    <div className="absolute bottom-full left-0 mb-2 w-72 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover/tooltip:visible z-50 shadow-xl">
                      ИУ = φ·0.35 + (EcoSafety/1.2)·0.30 + E_it·0.20 + E_f·0.15 — интегральный индекс: &lt;45 Критический, 45–70 Умеренный, 70–85 Устойчивый, &gt;85 Стабильно устойчивый.
                    </div>
                  </div>
                  <Shield size={16} className={metrics.iu >= 85 ? "text-cyan-400" : metrics.iu >= 70 ? "text-emerald-500" : metrics.iu >= 45 ? "text-orange-400" : "text-red-500"} />
                </div>
                <div className="text-xl font-serif italic text-emerald-600 leading-none py-1 opacity-100">
                  ИУ = φ·0.35 + ES·0.30 + E_it·0.20 + E_f·0.15
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-2xl font-bold tracking-tighter", metrics.iu >= 85 ? "text-cyan-400" : metrics.iu >= 70 ? "text-emerald-500" : metrics.iu >= 45 ? "text-orange-400" : "text-red-500")}>
                    {metrics.iu.toFixed(1)}
                  </span>
                  <span className="text-[length:calc(12px*var(--ui,1))] font-mono uppercase opacity-50">/ 100</span>
                  <span className={cn("flex items-center gap-1 font-bold uppercase tracking-tighter text-emerald-600 text-base")}>
                    <TrendingUp size={14} />({metrics.trends.iu})
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-500/20 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full transition-all duration-700 rounded-full", metrics.iu >= 85 ? "bg-cyan-400" : metrics.iu >= 70 ? "bg-emerald-500" : metrics.iu >= 45 ? "bg-orange-400" : "bg-red-500")}
                    style={{ width: `${Math.min(100, metrics.iu)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[length:calc(9px*var(--ui,1))] font-mono opacity-30">
                  <span>Критич.</span><span>Умерен.</span><span>Устойч.</span><span className="text-cyan-400">Стабильно</span>
                </div>
              </div>

            </div>

            {/* ═══ ПРАВАЯ ЧАСТЬ: Графики и визуализации ═══ */}
            <div className="lg:col-span-8 space-y-6">

          {/* Top Row: Process Visualization & Distribution */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className={cn(
              "xl:col-span-2 border p-6 transition-colors duration-300",
              isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
            )}>
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 mb-8">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold uppercase tracking-widest leading-tight">
                    Граф функционирования<br />экосистемы G = (V, E)
                  </h3>
                  <p className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 uppercase mt-1">Ориентированные потоки ресурсов (Er), отходов (Ew) и финансов (Ef)</p>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  <div className="flex items-center gap-2 group relative">
                    <div className="w-3 h-[2px] bg-red-500" />
                    <span className="text-[length:calc(12px*var(--ui,1))] font-mono uppercase">Ресурсы (Er)</span>
                    <HelpCircle size={10} className="opacity-30 hover:opacity-100 cursor-help transition-opacity" />
                    <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover:visible z-50 shadow-xl">
                      Эффективность ресурсов (Er) — это показатель, отражающий, насколько полно и результативно используются материальные и энергетические ресурсы кластера в результате симбиоза (с учётом предотвращённых потерь и экономии)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-[2px] border-b border-dashed border-blue-500" />
                    <span className="text-[length:calc(12px*var(--ui,1))] font-mono uppercase">Отходы (Ew)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-[2px] bg-emerald-500" />
                    <span className="text-[length:calc(12px*var(--ui,1))] font-mono uppercase">Финансы (Ef)</span>
                  </div>
                </div>
              </div>
              
              <div className={cn(
                "relative h-[450px] border border-dashed flex items-center justify-center transition-colors duration-300 overflow-hidden",
                isDarkMode ? "border-[#E4E3E0]/10" : "border-[#141414]/20"
              )}>
                {/* Central Hub */}
                <div className="absolute z-20">
                  <ProcessNode 
                    icon={<Leaf />} 
                    avatar={<AvatarPlatform />}
                    label="ЭКОПЛАТФОРМА" 
                    sub="г. Невинномысск" 
                    active={true} 
                    isDarkMode={isDarkMode} 
                    highlight 
                  />
                </div>

                {/* Nodes V */}
                {/* Top Left: ГРЭС */}
                <div className="absolute top-8 left-8 z-10">
                  <ProcessNode 
                    icon={<Zap />} 
                    avatar={<AvatarGRES />}
                    label="ГРЭС" 
                    sub={metrics.sd === 0 ? "Отходы" : "Тепло, пар"} 
                    active={synergyFactor > 20 || metrics.sd === 0} 
                    isDarkMode={isDarkMode} 
                  />
                </div>
                {/* Top Right: АЗОТ */}
                <div className="absolute top-8 right-8 z-10">
                  <ProcessNode 
                    icon={<Factory />} 
                    avatar={<AvatarAzot />}
                    label="АЗОТ" 
                    sub={metrics.sd === 0 ? "Отходы" : "CO2, тепло"} 
                    active={synergyFactor > 30 || metrics.sd === 0} 
                    isDarkMode={isDarkMode} 
                  />
                </div>
                {/* Bottom Left: ЭПП */}
                <div className="absolute bottom-8 left-8 z-10">
                  <ProcessNode 
                    icon={<Recycle />} 
                    avatar={<AvatarEPP />}
                    label="ЭПП" 
                    sub={metrics.sd === 0 ? "Отходы" : "Вторсырьё"} 
                    active={resourceEfficiency > 40 || metrics.sd === 0} 
                    isDarkMode={isDarkMode} 
                  />
                </div>
                {/* Bottom Right: РЕЗИДЕНТЫ */}
                <div className="absolute bottom-8 right-8 z-10">
                  <ProcessNode 
                    icon={<Users />} 
                    avatar={<AvatarResidents />}
                    label="РЕЗИДЕНТЫ" 
                    sub={metrics.sd === 0 ? "Разрозненность" : "Потребители"} 
                    active={metrics.sd > 5 || metrics.sd === 0} 
                    isDarkMode={isDarkMode} 
                  />
                </div>
                {/* Left: ОПЕРАТОР */}
                <div className="absolute top-1/2 -translate-y-1/2 left-3 z-10">
                  <ProcessNode 
                    icon={<Cpu />} 
                    avatar={<AvatarOperator />}
                    label="ОПЕРАТОР" 
                    sub={metrics.sd === 0 ? "Бездействие" : "AI-Матчинг"} 
                    active={metrics.sd > 0} 
                    isDarkMode={isDarkMode} 
                  />
                </div>
                {/* Right: БЮДЖЕТ */}
                <div className="absolute top-1/2 -translate-y-1/2 right-3 z-10">
                  <ProcessNode 
                    icon={<Coins />} 
                    avatar={<AvatarBudget />}
                    label="БЮДЖЕТ" 
                    sub={metrics.sd === 0 ? "Дефицит" : "Ef: дивиденд SD"} 
                    active={metrics.sd > 2} 
                    isDarkMode={isDarkMode} 
                  />
                </div>

                {/* Edges E (Arrows) */}
                <svg className="absolute inset-0 z-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Flows INTO Platform (Resources & Waste) */}
                  {/* ГРЭС -> Platform */}
                  <FlowEdge 
                    id="flow-gres"
                    d="M 15 20 L 45 45"
                    color={metrics.sd === 0 ? "#3b82f6" : "#ef4444"}
                    width={0.5 + metrics.phi/200}
                    active={metrics.phi > 10 || metrics.sd === 0}
                    duration="4s"
                  />
                  
                  {/* АЗОТ -> Platform */}
                  <FlowEdge 
                    id="flow-azot-res"
                    d="M 85 20 L 55 45"
                    color={metrics.sd === 0 ? "#3b82f6" : "#ef4444"}
                    width={0.5 + metrics.phi/200}
                    active={metrics.phi > 20 || metrics.sd === 0}
                    duration="4s"
                  />
                  <FlowEdge 
                    id="flow-azot-waste"
                    d="M 85 22 L 56 46"
                    color="#3b82f6"
                    width={0.4}
                    active={resourceEfficiency < 90 || metrics.sd === 0}
                    duration="3s"
                  />

                  {/* ЭПП -> Platform */}
                  <FlowEdge 
                    id="flow-epp"
                    d="M 15 80 L 45 55"
                    color="#3b82f6"
                    width={0.5 + resourceEfficiency/200}
                    active={resourceEfficiency > 30 || metrics.sd === 0}
                    duration="3s"
                  />

                  {/* Flows OUT of Platform (Coordinated Resources & Finance) */}
                  {/* Platform -> Резиденты */}
                  <FlowEdge 
                    id="flow-residents"
                    d="M 55 55 L 85 80"
                    color={metrics.sd === 0 ? "#3b82f6" : "#ef4444"}
                    width={0.5 + metrics.sd/20}
                    active={metrics.sd > 3 || (metrics.sd === 0 && investment < 5)}
                    duration="3s"
                  />

                  {/* Platform -> Бюджет (Finance) */}
                  <FlowEdge 
                    id="flow-budget"
                    d="M 55 50 L 85 50"
                    color="#10b981"
                    width={0.5 + metrics.sd/15}
                    active={metrics.sd > 2}
                    duration="2.5s"
                  />

                  {/* Platform -> Оператор (Finance) */}
                  <FlowEdge 
                    id="flow-operator"
                    d="M 45 50 L 15 50"
                    color="#10b981"
                    width={0.5 + metrics.sd/20}
                    active={metrics.sd > 1}
                    duration="2.5s"
                  />
                </svg>

                {/* Labels for flows */}
                <div className="absolute z-20 top-[33%] left-[30%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[length:calc(10px*var(--ui,1))] font-bold uppercase text-[#ef4444] bg-white/80 dark:bg-[#141414]/80 px-1 py-0.5 rounded">
                  {metrics.sd === 0 ? "Ew: Отходы" : "Er: Тепло"}
                </div>
                <div className="absolute z-20 top-[33%] right-[30%] translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[length:calc(10px*var(--ui,1))] font-bold uppercase text-[#ef4444] bg-white/80 dark:bg-[#141414]/80 px-1 py-0.5 rounded">
                  {metrics.sd === 0 ? "Ew: Отходы" : "Er: CO2"}
                </div>
                <div className="absolute z-20 bottom-[33%] left-[30%] -translate-x-1/2 translate-y-1/2 whitespace-nowrap text-[length:calc(10px*var(--ui,1))] font-bold uppercase text-[#3b82f6] bg-white/80 dark:bg-[#141414]/80 px-1 py-0.5 rounded">
                  {metrics.sd === 0 ? "Ew: Отходы" : "Ew: Вторсырьё"}
                </div>
                <div className="absolute z-20 bottom-[33%] right-[30%] translate-x-1/2 translate-y-1/2 whitespace-nowrap text-[length:calc(10px*var(--ui,1))] font-bold uppercase text-[#ef4444] bg-white/80 dark:bg-[#141414]/80 px-1 py-0.5 rounded">
                  {metrics.sd === 0 ? "Ew: Отходы" : "Er: Ресурсы"}
                </div>
                              </div>
            </div>

            <div className={cn(
              "border p-6 transition-colors duration-300",
              isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
            )}>
              <h3 className="text-xs font-bold uppercase tracking-normal mb-6 hyphens-auto">Распределение SD</h3>
              <div className="space-y-4">
                <DistributionItem label={<>Бюджет дестинации (<span className="is-number">{(metrics.distribution.shares.budget * 100).toFixed(1)}</span>%)</>} value={metrics.distribution.budget} color="bg-blue-500" isDarkMode={isDarkMode} />
                <DistributionItem label={<>Оператор платформы (<span className="is-number">{(metrics.distribution.shares.operator * 100).toFixed(1)}</span>%)</>} value={metrics.distribution.operator} color="bg-emerald-500" isDarkMode={isDarkMode} />
                <DistributionItem label={<>Поставщики ресурсов (<span className="is-number">{(metrics.distribution.shares.suppliers * 100).toFixed(1)}</span>%)</>} value={metrics.distribution.suppliers} color="bg-indigo-500" isDarkMode={isDarkMode} />
                <DistributionItem label={<>Корпорация развития (<span className="is-number">{(metrics.distribution.shares.corporation * 100).toFixed(1)}</span>%)</>} value={metrics.distribution.corporation} color="bg-orange-500" isDarkMode={isDarkMode} />
                <DistributionItem label={<>Экофонд (<span className="is-number">{(metrics.distribution.shares.ecofund * 100).toFixed(0)}</span>%)</>} value={metrics.distribution.ecofund} color="bg-rose-500" isDarkMode={isDarkMode} />
              </div>
              <div className="mt-6 pt-4 border-t border-dashed border-gray-500/30">
                <div className="flex justify-between items-center">
                  <span className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase opacity-50">Итого SD:</span>
                  <span className="text-sm font-bold font-mono text-emerald-500">
                    <span className="is-number">{metrics.sd.toFixed(2)}</span> млн.руб
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartContainer 
              title="Целевая функция полезности U(t)" 
              subtitle="Динамический отклик эффективности системы"
              isDarkMode={isDarkMode}
              tooltip="Целевая функция U — это интегральный показатель полезности экоплатформы, который экоплатформа максимизирует, одновременно учитывая четыре ключевых фактора: синергетическую плотность (связность) C_инд, эффективность ресурсов V (через Er, Ew, Ef) и уровень цифрового управления M."
            >
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.area} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={chartColors.area} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis 
                    dataKey="time" 
                    hide 
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{fontSize: 20, fontFamily: 'monospace', fill: chartColors.text}} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: chartColors.tooltipBg, 
                      border: 'none', 
                      color: chartColors.tooltipText, 
                      fontSize: '13px', 
                      fontFamily: 'monospace' 
                    }}
                    itemStyle={{ color: chartColors.tooltipText }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="u" 
                    stroke={chartColors.area} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorU)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer 
              title="Симбиотический Дивиденд SD" 
              subtitle="Экономический эффект экосистемы"
              isDarkMode={isDarkMode}
            >
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="time" hide />
                  <YAxis 
                    tick={{fontSize: 20, fontFamily: 'monospace', fill: chartColors.text}} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: chartColors.tooltipBg, 
                      border: 'none', 
                      color: chartColors.tooltipText, 
                      fontSize: '13px', 
                      fontFamily: 'monospace' 
                    }}
                  />
                  <Line 
                    type="stepAfter" 
                    dataKey="sdt" 
                    stroke={chartColors.area} 
                    strokeWidth={2} 
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Regimes Table */}
          <div className={cn(
            "border p-6 transition-colors duration-300",
            isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
          )}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-6">Режимы функционирования экосистемы</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={cn("text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-wider border-b", isDarkMode ? "border-[#E4E3E0]/10" : "border-[#141414]/10")}>
                    <th className="pb-3 pr-4">Режим</th>
                    <th className="pb-3 pr-4">C_инд</th>
                    <th className="pb-3 pr-4">φ (синергия)</th>
                    <th className="pb-3 pr-4">Характеристика</th>
                    <th className="pb-3">SD, млн руб./год</th>
                  </tr>
                </thead>
                <tbody className="text-[length:calc(13px*var(--ui,1))]">
                  {regimes.map((r, idx) => (
                    <tr 
                      key={r.id} 
                      className={cn(
                        "transition-colors duration-300 border-b last:border-0",
                        isDarkMode ? "border-[#E4E3E0]/5" : "border-[#141414]/5",
                        currentRegime === idx ? (isDarkMode ? "bg-white/5" : "bg-black/5") : "opacity-60"
                      )}
                    >
                      <td className="py-4 pr-4 font-bold">
                        <div className="flex items-center gap-2">
                          {currentRegime === idx && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          {r.id}. {r.label}
                        </div>
                      </td>
                      <td className="py-4 pr-4 font-mono">
                        <span className="is-number">{r.c}</span>
                      </td>
                      <td className="py-4 pr-4 font-mono">
                        {r.phi}
                      </td>
                      <td className="py-4 pr-4 italic leading-relaxed">
                        {r.desc}
                      </td>
                      <td className="py-4 font-bold">
                        {r.sd.includes('≈') ? r.sd : <><span className="is-number">{r.sd}</span></>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Formulas Section */}
          <div className={cn(
            "border p-6 transition-colors duration-300",
            isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
          )}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-6">Математический аппарат модели</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div data-term="dE_base" className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 uppercase">Базовая экономия (12)</div>
                <div className="text-xs font-bold font-mono">ΔE_base = Σ(ΔE_i − A_i) − Z_пл = <span className="is-number">{metrics.deltaE_base.toFixed(1)}</span></div>
                <p className="text-[length:calc(11px*var(--ui,1))] opacity-70 italic leading-tight">Чистый эффект по потокам (табл. 2.6) за вычетом аннуитетов и затрат платформы; заменяет валовые 250 млн руб.</p>
              </div>
              <div className="space-y-2">
                <div data-term="phi" className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 uppercase">Коэф. синергии (13)</div>
                <div className="text-xs font-bold font-mono">φ = 1 − e^(−k·C) = <span className="is-number">{(metrics.phi / 100).toFixed(3)}</span></div>
                <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-40 uppercase mt-1">
                  k(t) = {metrics.k.toFixed(2)} | C = {metrics.c_ind.toFixed(2)}
                </div>
                {kScenario === 5 && (
                  <div className="mt-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded space-y-1">
                    <div className="text-[length:calc(10px*var(--ui,1))] font-mono uppercase opacity-60">Якорные калибровки (k=5):</div>
                    <div className="flex justify-between text-[length:calc(11px*var(--ui,1))] font-mono">
                      <span>φ(0.10) ≈ 0.39</span>
                      <span className="text-emerald-500">Факт: {metrics.anchor10.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-[length:calc(11px*var(--ui,1))] font-mono">
                      <span>φ(0.25) ≈ 0.71</span>
                      <span className="text-emerald-500">Факт: {metrics.anchor25.toFixed(3)}</span>
                    </div>
                  </div>
                )}
                <p className="text-[length:calc(11px*var(--ui,1))] opacity-70 italic leading-tight">Реализуемый потенциал при k={metrics.k} и C={metrics.c/100}.</p>
              </div>
              <div data-nov="N4" data-nov-tag="Н4" className="space-y-2">
                <div data-term="dE_t" className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 uppercase">Вериф. экономия (14)</div>
                <div className="text-xs font-bold font-mono">ΔE(t) = φ(Cинд)·Σ(E_i − A_i) − Z_пл = <span className="is-number">{metrics.deltaE_t.toFixed(2)}</span></div>
                <div data-term="C_min" className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60">Порог окупаемости платформы C_min = {Number.isFinite(metrics.cMin) ? metrics.cMin.toFixed(3) : '—'} (при k = {metrics.k.toFixed(1)})</div>
                <p className="text-[length:calc(11px*var(--ui,1))] opacity-70 italic leading-tight">Затраты платформы постоянны и на φ не умножаются: ниже C_min платформа убыточна.</p>
              </div>
              <div className="space-y-2">
                <div data-term="SD" className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 uppercase">Симб. дивиденд (15)</div>
                <div className="text-xs font-bold font-mono">SD(t) = α · ΔE(t) · M<sub>режим</sub> = <span className="is-number">{metrics.sd.toFixed(2)}</span></div>
                <p className="text-[length:calc(11px*var(--ui,1))] opacity-70 italic leading-tight">Распределяемый доход при α={metrics.alpha}, M={metrics.distribution.shares.multiplier}.</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-dashed border-gray-500/30">
              <div data-term="k" className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 uppercase mb-2">Калибровка параметра k (16)</div>
              <div className="text-[length:calc(12px*var(--ui,1))] font-mono italic">k_i = −ln(1 − φ_i) / C_инд,i</div>
            </div>
          </div>

          {/* Якорь: калибровка § 3.1 и перенос в симулятор (табл. 3.7) */}
          <div className={cn(
            "border p-6 transition-colors duration-300 space-y-6",
            isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
          )}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-dashed border-gray-500/30 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <Factory size={14} /> Якорь: АО «Невинномысский Азот» — калибровка § 3.1
              </h3>
              <span className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 uppercase">Классы данных: A — факт/норма · B — аналоги · C — допущение</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Входные параметры якоря */}
              <div className="space-y-3">
                <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 uppercase">Входные параметры</div>
                <MiniSlider term="cap" label="Cap_Аз, мощность NH₃ (C)" value={anchor.capAz} min={1000} max={1350} step={10}
                  onChange={(v) => setAnchor({ ...anchor, capAz: v })} fmt={(v) => `${ru(v)} тыс. т`} />
                <MiniSlider term="co2" label="Полный CO₂ на т мощности (B)" value={anchor.eFull} min={1.79} max={2.10} step={0.01}
                  onChange={(v) => setAnchor({ ...anchor, eFull: v })} fmt={(v) => `${ru(v, 2)} т`} note="медиана 5 заводов CF, 2022–2023" />
                <MiniSlider term="co2" label="Процессный CO₂ на т мощности (B)" value={anchor.eProc} min={1.01} max={1.32} step={0.005}
                  onChange={(v) => setAnchor({ ...anchor, eProc: v })} fmt={(v) => `${ru(v, 3)} т`} />
                <MiniSlider term="co2" label="U, выпуск карбамида (C)" value={anchor.urea} min={300} max={700} step={10}
                  onChange={(v) => setAnchor({ ...anchor, urea: v })} fmt={(v) => `${ru(v)} тыс. т`} note="запросить у предприятия" />
                <div className="space-y-1">
                  <span data-term="n2o" className="text-[length:calc(11px*var(--ui,1))] font-bold uppercase tracking-wider opacity-60">N₂O: очистка на агрегатах HNO₃</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ v: true, l: 'Есть · вариант A' }, { v: false, l: 'Нет · вариант B' }].map((o) => (
                      <button key={String(o.v)} onClick={() => setAnchor({ ...anchor, n2oAbated: o.v })}
                        className={cn("py-1.5 text-[length:calc(11px*var(--ui,1))] font-bold uppercase border transition-all",
                          anchor.n2oAbated === o.v
                            ? (isDarkMode ? "bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]" : "bg-[#141414] text-[#E4E3E0] border-[#141414]")
                            : "border-gray-500/30 opacity-70")}>{o.l}</button>
                    ))}
                  </div>
                </div>
                {!anchor.n2oAbated && (<>
                  <MiniSlider term="n2o" label="AN, выпуск селитры (C)" value={anchor.an} min={1000} max={1400} step={20}
                    onChange={(v) => setAnchor({ ...anchor, an: v })} fmt={(v) => `${ru(v)} тыс. т`} />
                  <MiniSlider term="n2o" label="EF, кг N₂O на т HNO₃" value={anchor.efN2O} min={8} max={9} step={0.1}
                    onChange={(v) => setAnchor({ ...anchor, efN2O: v })} fmt={(v) => ru(v, 1)} note="Öko-Institut (2023)" />
                </>)}
                <MiniSlider term="downDays" label="d_t, дни простоя 2025–2026 (C)" value={downDays} min={0} max={60} step={1}
                  onChange={setDownDays} fmt={(v) => `${v} дн. (−${ru(v / 365 * 100, 1)} %)`} note="влияет на ряды и на поток CO₂ в 2026 г." />
                <MiniSlider term="pi_A" label="π_A, доля периода без поставок якоря (B)" value={piA} min={0.028} max={0.094} step={0.001}
                  onChange={setPiA} fmt={(v) => ru(v, 3)} />
              </div>

              {/* Оценка выбросов, табл. 3.2 */}
              <div className="space-y-2">
                <div data-term="co2" className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 uppercase">Оценка выбросов, тыс. т (табл. 3.2)</div>
                <table className="w-full text-[length:calc(12px*var(--ui,1))] font-mono">
                  <tbody>
                    {[
                      ['CO₂ в границе EPA (3.3)', anchorCalc.co2EPA],
                      ['− CO₂, связанный в карбамиде', -anchorCalc.ureaBound],
                      ['CO₂ в атмосферу, МГЭИК (3.4)', anchorCalc.co2IPCC],
                      ['N₂O при очистке, CO₂-экв. (3.5)', anchorCalc.n2oA],
                      ['N₂O без очистки, CO₂-экв. (3.6)', anchorCalc.n2oB],
                      ['Процессный CO₂', anchorCalc.proc],
                      ['Свободный технологический CO₂', anchorCalc.freeCO2],
                      ['Итого CO₂ + N₂O (выбранный вар.)', anchorCalc.total],
                    ].map(([l, v], i) => (
                      <tr key={i} className={cn("border-b border-gray-500/10", i === 7 && "font-bold")}>
                        <td className="py-1 pr-2 opacity-80">{l as string}</td>
                        <td className="py-1 text-right">{ru(v as number)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="grid grid-cols-2 gap-2 pt-2 text-[length:calc(11px*var(--ui,1))] font-mono">
                  <div className="p-2 border border-gray-500/20">
                    <div className="opacity-60">Отношение к Climate TRACE</div>
                    <div className="text-sm font-bold">{ru(anchorCalc.ctRatio, 2)}</div>
                    <div className="opacity-50">диапазон аналогов 0,83–2,8</div>
                  </div>
                  <div className="p-2 border border-gray-500/20">
                    <div data-term="Q0" className="opacity-60">Пищевая CO₂ / свободный поток</div>
                    <div className="text-sm font-bold">{ru(anchorCalc.foodUse * 100, 1)} %</div>
                    <div className="opacity-50">Q₀ = 32 тыс. т (A)</div>
                  </div>
                  <div className="p-2 border border-gray-500/20">
                    <div data-term="sigma_eps" className="opacity-60">σ_Δ — риск π_A</div>
                    <div className="text-sm font-bold">{ru(CALIB.sigmaDelta, 2)}</div>
                    <div className="opacity-50">годовые изменения, аналоги</div>
                  </div>
                  <div className="p-2 border border-gray-500/20">
                    <div data-term="sigma_eps" className="opacity-60">σ_ε — шум имитации</div>
                    <div className="text-sm font-bold">{ru(CALIB.sigmaEps, 3)}</div>
                    <div className="opacity-50">остатки модели (3.2)</div>
                  </div>
                </div>
              </div>

              {/* Ряды 2017–2026, табл. 3.3 */}
              <div data-nov="A1" data-nov-tag="А1" className="space-y-2">
                <div data-term="gamma_t" className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60">РЯДЫ 2017–2026, тыс. т (3.7), по γ_t аналогов</div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={anchorCalc.series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#88888833" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: any) => ru(Number(v))} contentStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="co2" name="CO₂, МГЭИК" stroke="#64748b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey={anchor.n2oAbated ? 'n2oA' : 'n2oB'} name="N₂O, CO₂-экв." stroke="#e11d48" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="proc" name="Процессный CO₂" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="free" name="Свободный CO₂" stroke="#10b981" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 text-[length:calc(10px*var(--ui,1))] font-mono uppercase opacity-70">
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-500" />CO₂ МГЭИК</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-rose-600" />N₂O</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-sky-500" />Процессный</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500" />Свободный</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-dashed border-gray-500/30">
              {/* Разложение ΔE_base */}
              <div data-nov="A1" data-nov-tag="А1" className="lg:col-span-2 space-y-2">
                <div data-term="flows" className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 uppercase">Состав ΔE_base, млн руб./год (табл. 2.6; формулы 3.11–3.12)</div>
                <table className="w-full text-[length:calc(12px*var(--ui,1))] font-mono">
                  <thead>
                    <tr className="opacity-50 text-left border-b border-gray-500/20">
                      <th className="py-1 font-normal">Поток</th><th className="py-1 font-normal text-right">Валовая</th>
                      <th className="py-1 font-normal text-right">Аннуитет</th><th className="py-1 font-normal text-right">Чистый</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Тепло ГРЭС', metrics.flows.heatGross, metrics.flows.heatGross - metrics.flows.heatNet, metrics.flows.heatNet],
                      [`CO₂ «Азота» сверх Q₀ (μ = ${CALIB.mu})`, metrics.flows.co2Gross, metrics.flows.co2Capex, metrics.flows.co2Net],
                      ['Вторичное сырьё ЭПП', metrics.flows.recycleNet, 0, metrics.flows.recycleNet],
                      ['Плата за НВОС', metrics.flows.nvosNet, 0, metrics.flows.nvosNet],
                      ['Платформа: аннуитет, эксплуатация, сделки', 0, metrics.flows.platformCost, -metrics.flows.platformCost],
                    ].map(([l, g, a, n], i) => (
                      <tr key={i} className="border-b border-gray-500/10">
                        <td className="py-1 pr-2 opacity-80">{l as string}</td>
                        <td className="py-1 text-right">{(g as number) ? ru(g as number, 1) : '—'}</td>
                        <td className="py-1 text-right">{(a as number) ? ru(a as number, 1) : '—'}</td>
                        <td className="py-1 text-right">{ru(n as number, 1)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="py-1">ΔE_base</td><td /><td /><td className="py-1 text-right">{ru(metrics.deltaE_base, 1)}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <MiniSlider term="dQ" label="Q₁ − Q₀, прирост продаж CO₂" value={dQ} min={0} max={30} step={1}
                    onChange={setDQ} fmt={(v) => `${v} тыс. т`} note="табл. 2.5: 8–15 тыс. т" />
                  <MiniSlider term="switch" label="Доля поставок за счёт переключения" value={switchShare} min={0} max={1} step={0.05}
                    onChange={setSwitchShare} fmt={(v) => `${ru(v * 100)} %`} note="при 50 % ΔE_base снижается до 81,4" />
                </div>
              </div>

              {/* Риск якоря и предел ТОР */}
              <div data-nov="N3" data-nov-tag="Н3" className="space-y-3 text-[length:calc(12px*var(--ui,1))] font-mono">
                <div data-term="pi_A" className="text-[length:calc(11px*var(--ui,1))] opacity-50 uppercase">Риск остановки якоря (§ 3.2)</div>
                <div className="flex justify-between"><span className="opacity-70">ΔE(t) при работающем якоре</span><span>{ru(metrics.deltaE_t, 1)}</span></div>
                <div data-term="dE_exp" className="flex justify-between"><span className="opacity-70 pr-2">ΔE(t) ожидаемый, π_A = {ru(piA, 3)}</span><span className="font-bold">{ru(metrics.deltaE_exp, 1)}</span></div>
                <div data-term="shapley" className="flex justify-between"><span className="opacity-70">Доля «Азота» по Шепли, 25 %</span><span>{ru(metrics.anchorShare, 1)}</span></div>
                <div className="flex justify-between"><span className="opacity-70">То же с поправкой (1 − π_A), (3.25)</span><span className="font-bold">{ru(metrics.anchorShareRisk, 1)}</span></div>
                <div className="pt-3 border-t border-dashed border-gray-500/30 space-y-2">
                  <div data-term="lambda_star" className="text-[length:calc(11px*var(--ui,1))] opacity-50 uppercase">Критическая доля продаж якорю (3.27)</div>
                  <MiniSlider term="lambda_star" label="m_j, маржинальный доход" value={marginJ} min={0.1} max={0.6} step={0.01}
                    onChange={setMarginJ} fmt={(v) => ru(v, 2)} />
                  <MiniSlider term="lambda_star" label="FC_j / R_j, постоянные затраты" value={fcJ} min={0.02} max={0.3} step={0.01}
                    onChange={setFcJ} fmt={(v) => ru(v, 2)} />
                  {(() => {
                    const lam = Math.max(0, 1 - fcJ / marginJ);
                    const ok = lam >= CALIB.lambdaBar;
                    return (
                      <div className={cn("p-2 border", ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5")}>
                        λ*_j = 1 − FC/(m·R) = <b>{ru(lam, 2)}</b> {ok ? '≥' : '<'} λ̄ = {ru(CALIB.lambdaBar, 1)}
                        <div className="text-[length:calc(11px*var(--ui,1))] opacity-70 mt-1">
                          {ok ? 'Предел ТОР 50 % жёстче, чем требует устойчивость резидента.' : 'Предел ТОР 50 % мягок: при остановке якоря резидент не покроет постоянные затраты.'}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>
        </div>
        ) : (
          <div className="space-y-6">
            <div className={cn(
              "border p-8 transition-colors duration-300",
              isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
            )}>
              <div className="flex items-center justify-between mb-8 border-b pb-4 border-dashed border-gray-500/30">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-widest flex items-center gap-3">
                    <Users size={24} /> Участники экоплатформы
                  </h2>
                  <p className="text-[length:calc(12px*var(--ui,1))] font-mono opacity-50 uppercase mt-1">Распределение симбиотического дивиденда и функциональные роли</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[length:calc(11px*var(--ui,1))] font-mono uppercase opacity-50">Год:</span>
                    <span className="text-[length:calc(13px*var(--ui,1))] font-bold font-mono text-emerald-500">{year}</span>
                    <input
                      type="range"
                      min="2026" max="2036" step="1"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-32 h-1 appearance-none cursor-pointer accent-emerald-500"
                    />
                    <span className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-30">2026–2036</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: 'fiscal', label: 'Фискальный', sub: 'Приоритет бюджета' },
                    { id: 'tech', label: 'Технологический', sub: 'Приоритет оператора' },
                    { id: 'industrial', label: 'Промышленный', sub: 'Приоритет резидентов' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setDistRegime(r.id as any)}
                      className={cn(
                        "px-4 py-2 border transition-all duration-300 flex flex-col items-center",
                        distRegime === r.id 
                          ? (isDarkMode ? "bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]" : "bg-[#141414] text-[#E4E3E0] border-[#141414]")
                          : (isDarkMode ? "border-[#E4E3E0]/20 hover:border-[#E4E3E0]/50" : "border-[#141414]/20 hover:border-[#141414]/50")
                      )}
                    >
                      <span className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-tighter">{r.label}</span>
                      <span className="text-[length:calc(10px*var(--ui,1))] opacity-50 uppercase mt-0.5">{r.sub}</span>
                    </button>
                  ))}
                </div>
                <div className="text-right">
                  <span className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase opacity-50">Текущий SD (с учетом режима):</span>
                  <div className="text-2xl font-bold font-mono text-emerald-500">
                    <span className="is-number">{metrics.sd.toFixed(2)}</span> млн.руб
                  </div>
                  {metrics.distribution.shares.multiplier > 1.0 && (
                    <div className="text-[length:calc(11px*var(--ui,1))] font-mono text-emerald-400 uppercase mt-1">
                      Эффект режима: +{((metrics.distribution.shares.multiplier - 1) * 100).toFixed(0)}% к синергии
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={cn("text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-wider border-b", isDarkMode ? "border-[#E4E3E0]/10" : "border-[#141414]/10")}>
                      <th className="pb-4 pr-6 w-1/4">Участник</th>
                      <th className="pb-4 pr-6 w-1/3">Функции</th>
                      <th className="pb-4 pr-6">Что вносит</th>
                      <th className="pb-4 pr-6 text-right">Доля SD, %</th>
                      <th className="pb-4 pr-6 text-right">Сумма SD*, млн руб./год</th>
                      <th className="pb-4 text-right text-red-400">Долг перед экоплатформой, млн руб.</th>
                    </tr>
                  </thead>
                  <tbody className="text-[length:calc(13px*var(--ui,1))] leading-relaxed">
                    {participants.map((p, idx) => {
                      const shareKey = idx === 0 ? 'budget' : 
                                     idx === 1 ? 'operator' : 
                                     idx === 2 ? 'suppliers' : 
                                     idx === 3 ? 'corporation' : 'ecofund';
                      const currentShare = metrics.distribution.shares[shareKey as keyof typeof metrics.distribution.shares] * 100;
                      
                      return (
                        <tr 
                          key={idx} 
                          className={cn(
                            "transition-colors duration-300 border-b last:border-0 hover:bg-black/5 dark:hover:bg-white/5",
                            isDarkMode ? "border-[#E4E3E0]/5" : "border-[#141414]/5"
                          )}
                        >
                          <td className="py-5 pr-6 font-bold text-xs">
                            {p.name}
                          </td>
                          <td className="py-5 pr-6 opacity-80">
                            {p.functions}
                          </td>
                          <td className="py-5 pr-6 italic opacity-80">
                            {p.contribution}
                          </td>
                          <td className="py-5 pr-6 text-right font-mono">
                            <span className="is-number">{currentShare.toFixed(1)}</span>%
                          </td>
                          <td className="py-5 pr-6 text-right font-bold text-emerald-500 font-mono">
                            <span className="is-number">{(metrics.sd * currentShare / 100).toFixed(2)}</span>
                          </td>
                          <td className="py-5 text-right font-mono">
                            {(() => {
                              const received = metrics.sd * currentShare / 100;
                              const potential = metrics.deltaE_base * (currentShare / 100) * metrics.alpha;
                              const debt = Math.max(0, potential - received);
                              return debt > 0.01
                                ? <span className="text-red-400">−{debt.toFixed(2)}</span>
                                : <span className="text-emerald-500 opacity-60">0.00</span>;
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className={cn("border-t-2 font-bold", isDarkMode ? "border-[#E4E3E0]/20" : "border-[#141414]/20")}>
                      <td colSpan={3} className="py-6 text-right uppercase tracking-widest text-[length:calc(12px*var(--ui,1))]">Итого</td>
                      <td className="py-6 text-right font-mono text-xs">
                        <span className="is-number">100</span>%
                      </td>
                      <td className="py-6 pr-6 text-right font-mono text-xs text-emerald-500">
                        <span className="is-number">{metrics.sd.toFixed(2)}</span>
                      </td>
                      <td className="py-6 text-right font-mono text-xs text-red-400">
                        <span className="is-number">{Math.max(0, metrics.deltaE_base * metrics.alpha - metrics.sd).toFixed(2)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-8 p-4 border border-dashed border-gray-500/30 text-[length:calc(11px*var(--ui,1))] font-mono opacity-50 uppercase leading-relaxed">
                * Сумма рассчитывается динамически на основе текущего значения Симбиотического Дивиденда (SD). 
                Текущие значения соответствуют выбранному режиму симуляции.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={cn(
                "border p-6 transition-colors duration-300",
                isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
              )}>
                <h4 className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest mb-4 opacity-50">Стратегический приоритет</h4>
                <p className="text-xs leading-relaxed">
                  Основной фокус распределения SD направлен на <span className="font-bold">Бюджет дестинации (β = {(metrics.distribution.shares.budget * 100).toFixed(1)}%)</span>, 
                  что обеспечивает легитимность платформы и финансирование критической инфраструктуры.
                </p>
              </div>
              <div className={cn(
                "border p-6 transition-colors duration-300",
                isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
              )}>
                <h4 className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest mb-4 opacity-50">Технологическое ядро</h4>
                <p className="text-xs leading-relaxed">
                  <span className="font-bold">Оператор платформы (25%)</span> получает ресурсы для непрерывного совершенствования 
                  AI-алгоритмов матчинга и поддержания цифрового двойника потоков.
                </p>
              </div>
              <div className={cn(
                "border p-6 transition-colors duration-300",
                isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
              )}>
                <h4 className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest mb-4 opacity-50">Экологический эффект</h4>
                <p className="text-xs leading-relaxed">
                  <span className="font-bold">Экофонд (8%)</span> гарантирует целевое использование части прибыли на ликвидацию 
                  исторического ущерба, накопленного в регионе.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} onOpen={() => setHelpOpen(true)} isDarkMode={isDarkMode} defense={defense} onGo={goNovelty} />

      {/* Footer Status Bar */}
      <footer className={cn(
        "border-t px-6 py-2 flex items-center justify-between fixed bottom-0 left-0 right-0 z-10 transition-colors duration-300",
        helpOpen && view === 'lab' && "sm:right-[360px]",
        isDarkMode ? "bg-[#141414] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
      )}>
        <div className="text-[length:calc(11px*var(--ui,1))] font-mono tracking-tight opacity-70 truncate">
          Имитационная модель · платформа не создана · классы данных A / B / C · версия {MODEL_VERSION}
        </div>
        <div className="text-[length:calc(11px*var(--ui,1))] font-mono tracking-tight opacity-60 whitespace-nowrap pl-4">
          {AUTHOR.role} {AUTHOR.name}, СКФУ, <span className="is-number">2026</span>
        </div>
      </footer>
    </div>
  );
}

function KPICard({ label, value, unit, icon, trend, isDarkMode, formula, trendLarge, tooltip, term }: { label: string, value: string, unit?: string, icon: React.ReactNode, trend: string, isDarkMode: boolean, formula?: React.ReactNode, trendLarge?: boolean, tooltip?: string, term?: string }) {
  return (
    <div data-term={term} className={cn(
      "border p-4 space-y-3 transition-all duration-300 hover:-translate-y-1 relative group",
      isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
    )}>
      <div className="flex items-center justify-between opacity-50">
        <div className="flex items-center gap-1.5 group/tooltip relative">
          <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
          {tooltip && (
            <>
              <HelpCircle size={10} className="opacity-30 hover:opacity-100 cursor-help transition-opacity" />
              <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover/tooltip:visible z-50 shadow-xl normal-case tracking-normal">
                {tooltip}
              </div>
            </>
          )}
        </div>
        {icon}
      </div>
      {formula && (
        <div className="text-xl font-serif italic opacity-100 text-emerald-600 leading-none py-1">
          {formula}
        </div>
      )}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tighter">
            <span className="is-number">{value}</span>
          </span>
          {unit && <span className="text-[length:calc(12px*var(--ui,1))] font-mono uppercase opacity-50">{unit}</span>}
        </div>
        <div className={cn(
          "flex items-center gap-1 font-bold uppercase tracking-tighter text-emerald-600",
          trendLarge ? "text-base" : "text-[length:calc(11px*var(--ui,1))]"
        )}>
          <TrendingUp size={trendLarge ? 14 : 10} />
          <span>({trend})</span>
        </div>
      </div>
    </div>
  );
}

function ChartContainer({ title, subtitle, children, isDarkMode, tooltip }: { title: string, subtitle: string, children: React.ReactNode, isDarkMode: boolean, tooltip?: string }) {
  return (
    <div className={cn(
      "border p-6 space-y-4 transition-colors duration-300",
      isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
    )}>
      <div>
        <div className="flex items-center gap-1.5 group/tooltip relative">
          <h3 className="text-xs font-bold uppercase tracking-widest">{title}</h3>
          {tooltip && (
            <>
              <HelpCircle size={10} className="opacity-30 hover:opacity-100 cursor-help transition-opacity" />
              <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-[#141414] text-[#E4E3E0] text-[length:calc(11px*var(--ui,1))] font-mono leading-tight border border-[#E4E3E0]/20 invisible group-hover/tooltip:visible z-50 shadow-xl normal-case tracking-normal">
                {tooltip}
              </div>
            </>
          )}
        </div>
        <p className="text-[length:calc(12px*var(--ui,1))] font-mono uppercase opacity-50">{subtitle}</p>
      </div>
      <div className="pt-4">
        {children}
      </div>
    </div>
  );
}

function FlowLine({ color, thickness, dashed, active, isDarkMode }: { color: string, thickness: number, dashed?: boolean, active: boolean, isDarkMode: boolean }) {
  return (
    <div className="relative w-full flex items-center" style={{ height: `${thickness * 3}px` }}>
      {/* The Line */}
      <div 
        className={cn(
          "flex-1 transition-all duration-500",
          active ? "opacity-100" : "opacity-10"
        )}
        style={{ 
          height: dashed ? '0px' : `${thickness}px`,
          backgroundColor: dashed ? 'transparent' : color,
          borderColor: dashed ? color : 'transparent',
          borderBottomWidth: dashed ? `${thickness}px` : '0px',
          borderStyle: dashed ? 'dashed' : 'solid'
        }}
      />
      {/* Arrow Head */}
      <div 
        className={cn("w-0 h-0 border-y-transparent transition-all duration-500", active ? "opacity-100" : "opacity-10")}
        style={{ 
          borderTopWidth: `${thickness * 1.5}px`, 
          borderBottomWidth: `${thickness * 1.5}px`, 
          borderLeftWidth: `${thickness * 2.5}px`,
          borderLeftColor: color,
          marginLeft: '-1px'
        }}
      />
      {/* Moving Arrow */}
      {active && (
        <div className="absolute inset-0 animate-flow-right pointer-events-none">
          <div 
            className="w-0 h-0 border-y-transparent border-l-white/60"
            style={{ 
              borderTopWidth: `${thickness}px`, 
              borderBottomWidth: `${thickness}px`, 
              borderLeftWidth: `${thickness * 1.5}px`,
              marginTop: dashed ? `-${thickness}px` : '0px'
            }}
          />
        </div>
      )}
    </div>
  );
}

function FlowVertical({ color, thickness, active, isDarkMode }: { color: string, thickness: number, active: boolean, isDarkMode: boolean }) {
  return (
    <div className="relative h-full flex flex-col items-center" style={{ width: `${thickness * 3}px` }}>
      {/* The Line */}
      <div 
        className={cn(
          "flex-1 transition-all duration-500",
          active ? "opacity-100" : "opacity-10"
        )}
        style={{ 
          width: `${thickness}px`,
          backgroundColor: color,
        }}
      />
      {/* Arrow Head */}
      <div 
        className={cn("w-0 h-0 border-x-transparent transition-all duration-500", active ? "opacity-100" : "opacity-10")}
        style={{ 
          borderLeftWidth: `${thickness * 1.5}px`, 
          borderRightWidth: `${thickness * 1.5}px`, 
          borderTopWidth: `${thickness * 2.5}px`,
          borderTopColor: color,
          marginTop: '-1px'
        }}
      />
      {/* Moving Arrow */}
      {active && (
        <div className="absolute inset-0 animate-flow-down pointer-events-none flex justify-center">
          <div 
            className="w-0 h-0 border-x-transparent border-t-white/60"
            style={{ 
              borderLeftWidth: `${thickness}px`, 
              borderRightWidth: `${thickness}px`, 
              borderTopWidth: `${thickness * 1.5}px`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function ProcessNode({ icon, avatar, label, sub, active, isDarkMode, highlight }: { icon: React.ReactNode, avatar?: React.ReactElement, label: string, sub?: React.ReactNode, active: boolean, isDarkMode: boolean, highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 z-10">
      {avatar ? (
        <div className={cn(
          "transition-all duration-500 overflow-hidden rounded-lg shadow-md border-2",
          highlight ? "w-16 h-16 sm:w-20 sm:h-20" : "w-11 h-11 sm:w-14 sm:h-14",
          isDarkMode ? "border-[#E4E3E0]/70" : "border-[#141414]",
          active ? "opacity-100" : "grayscale opacity-40",
          highlight && "ring-4 ring-emerald-500/40 ring-offset-2 ring-offset-transparent"
        )}>
          {React.cloneElement(avatar, { className: "w-full h-full block" })}
        </div>
      ) : (
        <div className={cn(
          "transition-all duration-500 border flex items-center justify-center",
          highlight ? "w-20 h-20" : "w-12 h-12",
          active 
            ? (isDarkMode ? "bg-[#E4E3E0] text-[#141414]" : "bg-[#141414] text-[#E4E3E0]") 
            : (isDarkMode ? "bg-[#141414] text-[#E4E3E0] border-[#E4E3E0]/20 opacity-30" : "bg-white text-[#141414] border-[#141414] opacity-30"),
          highlight && "ring-4 ring-emerald-500/30 ring-offset-2 ring-offset-transparent"
        )}>
          {React.cloneElement(icon as React.ReactElement, { size: highlight ? 32 : 20 })}
        </div>
      )}
      <div className={cn(
        "flex flex-col items-center px-1 rounded",
        isDarkMode ? "bg-[#1A1A1A]/80" : "bg-white/80"
      )}>
        <span className={cn(
          "font-bold uppercase tracking-widest text-center", 
          highlight ? "text-[length:calc(12px*var(--ui,1))]" : "text-[length:calc(11px*var(--ui,1))]",
          active ? "opacity-100" : "opacity-30"
        )}>
          {label}
        </span>
        {sub && <span className="text-[length:calc(9px*var(--ui,1))] font-mono uppercase opacity-40 text-center">{sub}</span>}
      </div>
    </div>
  );
}

function DistributionItem({ label, value, color, isDarkMode }: { label: React.ReactNode, value: number, color: string, isDarkMode: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap justify-between items-baseline gap-x-2 text-[length:calc(11px*var(--ui,1))] font-mono uppercase">
        <span className="opacity-60 min-w-0">{label}</span>
        <span className="font-bold whitespace-nowrap">
          <span className="is-number">{value.toFixed(2)}</span> млн
        </span>
      </div>
      <div className={cn("h-1 w-full rounded-full overflow-hidden", isDarkMode ? "bg-white/5" : "bg-black/5")}>
        <div 
          className={cn("h-full transition-all duration-1000", color)} 
          style={{ width: `${Math.min(100, (value / 9.75 * 100) * 2.5)}%` }} 
        />
      </div>
    </div>
  );
}

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
  Factory
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  const [investment, setInvestment] = useState(15); // C index: 0-30
  const [year, setYear] = useState(2025); // 2025-2035
  const [kScenario, setKScenario] = useState(5); // k: 3 (Organic), 5 (Moderate), 8 (Coordinated)
  const [alpha, setAlpha] = useState(0.10); // alpha: 0.08 - 0.12
  const [distRegime, setDistRegime] = useState<'fiscal' | 'tech' | 'industrial'>('fiscal');

  // Derived States
  const [history, setHistory] = useState<DataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [activeTab, setActiveTab] = useState<'simulation' | 'participants'>('simulation');

  const participants = [
    {
      name: 'Бюджет дестинации ★ (Невинномысск)',
      functions: 'Получает 40% SD; финансирует экофонд, рекультивацию фосфогипса, инфраструктуру; заказывает независимый аудит ΔE через СКФУ',
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

  // Calculate current metrics based on provided formulas
  const metrics = useMemo(() => {
    // C_ind is investment in decimal (0-0.30)
    const c_ind = investment / 100;
    
    // k: institutional speed parameter (Formula 2)
    // Time factor: k increases as institutional measures are implemented (2025-2035)
    const timeProgress = (year - 2025) / 10; // 0 to 1
    const k = kScenario + timeProgress * 2.5; // k grows over 10 years
    
    // Formula (2): phi = 1 - exp(-k * C_ind)
    // IMPORTANT: C_ind is in fractions (0.10 for 10%)
    let phi_val = 1 - Math.exp(-k * c_ind);
    if (investment < 5) {
      phi_val = 0;
    }
    const phi = phi_val * 100; // in percent for display
    
    // Calibration Anchors for k=5:
    // phi(0.10) ≈ 0.39
    // phi(0.25) ≈ 0.71
    const anchor10 = 1 - Math.exp(-5 * 0.10);
    const anchor25 = 1 - Math.exp(-5 * 0.25);
    
    // Formula (12): Base potential Delta E (scales with resource efficiency)
    const deltaE_base = 250 * (1 + (resourceEfficiency - 40) / 100);
    
    // Formula (14): Verified savings Delta E(t) = Delta E_base * phi
    const deltaE_t = deltaE_base * phi_val;
    
    // Constraint 2: Budget sufficiency
    // C_liq(t): Planned costs for reclamation (phosphogypsum 18m tons, Kuban river)
    const c_liq = 15.5 + (year - 2025) * 0.5; // Example: 15.5 to 20.5 mln rub
    
    // Distribution Regimes
    const shares = {
      fiscal: { budget: 0.40, operator: 0.25, suppliers: 0.15, corporation: 0.12, ecofund: 0.08, multiplier: 1.0 },
      tech: { budget: 0.25, operator: 0.40, suppliers: 0.15, corporation: 0.12, ecofund: 0.08, multiplier: 1.12 },
      industrial: { budget: 0.25, operator: 0.15, suppliers: 0.40, corporation: 0.12, ecofund: 0.08, multiplier: 1.18 }
    };

    const currentShares = shares[distRegime];
    
    // Formula (15): Symbiotic Dividend SD = alpha * Delta E(t) * Multiplier
    // Regime 1 check: if investment < 5, SD is 0 (scattered participants)
    let sd = alpha * deltaE_t * currentShares.multiplier;
    if (investment < 5) {
      sd = 0;
    }
    
    const sd_budget = sd * currentShares.budget;
    
    const distribution = {
      budget: sd_budget,
      operator: sd * currentShares.operator,
      suppliers: sd * currentShares.suppliers,
      corporation: sd * currentShares.corporation,
      ecofund: sd * currentShares.ecofund,
      shares: currentShares
    };

    // Constraints check
    const constraints = {
      density: investment >= 15, // C_ind >= 15%
      budget: sd_budget >= c_liq
    };

    // U: Utility Function (Target)
    const u = (phi * 0.6 + (sd / 9.75 * 100) * 0.4);

    return { 
      sd, phi, distribution, u, c: investment, deltaE_base, deltaE_t, alpha, k, c_ind,
      anchor10, anchor25, c_liq, sd_budget, constraints
    };
  }, [resourceEfficiency, investment, year, kScenario, alpha, distRegime]);

  // Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory((prev) => {
        const newPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          u: metrics.u + (Math.random() - 0.5) * 2,
          sdt: metrics.sd * 10 + (Math.random() - 0.5) * 1,
          er: metrics.phi,
          ef: metrics.sd,
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

  const regimes = [
    { 
      id: 1, 
      label: 'Линейный (Отходы)', 
      c: '< 5%', 
      phi: '≈ 0', 
      desc: 'Участники разрознены; нет симбиоза; возникают только ОТХОДЫ; SD = 0.', 
      sd: '0',
      color: 'text-red-500',
      bg: 'bg-red-500/10'
    },
    { 
      id: 2, 
      label: 'Переходный', 
      c: '5–15%', 
      phi: '0 < φ < 0.78', 
      desc: 'Формируются симбиотические контракты; нелинейный рост SD [цель Фазы I, 2025–2028]', 
      sd: '15–25',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    { 
      id: 3, 
      label: 'Экосистемный', 
      c: '15–30%', 
      phi: '0.78–0.95', 
      desc: 'Сеть сформирована; устойчивость без льгот ТОСЭР [цель 2031–2035]', 
      sd: '75–125',
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
      isDarkMode ? "bg-[#141414] text-[#E4E3E0]" : "bg-[#E4E3E0] text-[#141414]"
    )}>
      {/* Header */}
      <header className={cn(
        "border-b px-6 py-4 flex items-center justify-between backdrop-blur-sm sticky top-0 z-10 transition-colors duration-300",
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
            <h1 className="text-sm font-bold uppercase tracking-widest">Симулятор Эко-Платформы</h1>
            <p className="text-[10px] font-mono opacity-50 uppercase">Интегрированный интерфейс Dynsim v4.2.0</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <button 
            onClick={() => setActiveTab('simulation')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border-b-2",
              activeTab === 'simulation' 
                ? (isDarkMode ? "border-[#E4E3E0] text-[#E4E3E0]" : "border-[#141414] text-[#141414]")
                : "border-transparent opacity-50 hover:opacity-100"
            )}
          >
            Симуляция
          </button>
          <button 
            onClick={() => setActiveTab('participants')}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border-b-2",
              activeTab === 'participants' 
                ? (isDarkMode ? "border-[#E4E3E0] text-[#E4E3E0]" : "border-[#141414] text-[#141414]")
                : "border-transparent opacity-50 hover:opacity-100"
            )}
          >
            Участники
          </button>
        </nav>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", isConnected ? "bg-emerald-500" : "bg-red-500")} />
            <span className="text-[10px] font-mono uppercase tracking-tighter">
              {isConnected ? "DYNSIM: ПОДКЛЮЧЕНО" : "DYNSIM: ОФФЛАЙН"}
            </span>
          </div>
          <div className={cn("h-8 w-[1px] transition-colors duration-300", isDarkMode ? "bg-[#E4E3E0]/20" : "bg-[#141414]/10")} />
          
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

            <Settings size={18} className="opacity-50 hover:opacity-100 cursor-pointer transition-opacity" />
            
            <div className={cn(
              "px-3 py-1 text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-colors duration-300",
              isDarkMode ? "bg-[#E4E3E0] text-[#141414] hover:bg-[#E4E3E0]/90" : "bg-[#141414] text-[#E4E3E0] hover:bg-[#141414]/90"
            )}>
              Export Data
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        {activeTab === 'simulation' ? (
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
                    <label className="text-[10px] font-mono uppercase opacity-50">Горизонт прогноза (t)</label>
                    <span className="text-[10px] font-bold font-mono text-emerald-500">{year} год</span>
                  </div>
                  <input 
                    type="range" 
                    min="2025" 
                    max="2035" 
                    step="1"
                    value={year} 
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-500/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[8px] font-mono opacity-40 uppercase">
                    <span>2025</span>
                    <span>2030</span>
                    <span>2035</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-mono uppercase opacity-50">Институциональная среда (k)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 3, label: 'Органическая', sub: 'Kalundborg' },
                      { val: 5, label: 'Умеренная', sub: 'Nevinnomyssk' },
                      { val: 8, label: 'Координируемая', sub: 'TEDA' }
                    ].map((s) => (
                      <button
                        key={s.val}
                        onClick={() => setKScenario(s.val)}
                        className={cn(
                          "py-2 px-1 text-[8px] font-bold uppercase tracking-tighter border transition-all duration-300 flex flex-col items-center",
                          kScenario === s.val 
                            ? (isDarkMode ? "bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]" : "bg-[#141414] text-[#E4E3E0] border-[#141414]")
                            : (isDarkMode ? "border-[#E4E3E0]/20 hover:border-[#E4E3E0]/50" : "border-[#141414]/20 hover:border-[#141414]/50")
                        )}
                      >
                        <span>{s.label}</span>
                        <span className="opacity-50 font-normal mt-0.5">{s.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-mono uppercase opacity-50">Коэф. дивиденда (α)</label>
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
                  <div className="flex justify-between text-[8px] font-mono opacity-40 uppercase">
                    <span>0.08</span>
                    <span>0.10</span>
                    <span>0.12</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-mono uppercase opacity-50">Выбор режима (Пресеты)</label>
                <div className="grid grid-cols-3 gap-2">
                  {regimes.map((r, idx) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        if (idx === 0) { setInvestment(2); setSynergyFactor(5); setResourceEfficiency(20); }
                        if (idx === 1) { setInvestment(10); setSynergyFactor(45); setResourceEfficiency(55); }
                        if (idx === 2) { setInvestment(25); setSynergyFactor(90); setResourceEfficiency(85); }
                      }}
                      className={cn(
                        "py-2 text-[9px] font-bold uppercase tracking-tighter border transition-all duration-300",
                        currentRegime === idx 
                          ? (isDarkMode ? "bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]" : "bg-[#141414] text-[#E4E3E0] border-[#141414]")
                          : (isDarkMode ? "border-[#E4E3E0]/20 hover:border-[#E4E3E0]/50" : "border-[#141414]/20 hover:border-[#141414]/50")
                      )}
                    >
                      Режим {r.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-mono uppercase opacity-50">Коэффициент синергии (φ)</label>
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
                <p className="text-[8px] opacity-50 italic leading-tight">
                  {metrics.phi === 0 ? "Связи отсутствуют (разрозненность)" : "Рассчитано на основе k и C_инд"}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-mono uppercase opacity-50">Эффективность ресурсов (Er)</label>
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
                  <label className="text-[10px] font-mono uppercase opacity-50">Индекс инвестиций (C)</label>
                  <span className="text-xs font-bold font-mono">{investment}</span>
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
                <span className="text-[10px] font-bold uppercase tracking-tighter">Текущий режим</span>
                <span className="text-[10px] font-bold uppercase text-emerald-500">{regimes[currentRegime].label}</span>
              </div>
            </div>
          </section>

          <section className={cn(
            "p-5 space-y-4 transition-colors duration-300",
            isDarkMode ? "bg-[#E4E3E0] text-[#141414]" : "bg-[#141414] text-[#E4E3E0]"
          )}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Система ограничений</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase">1. Синерг. плотность (C ≥ 15%)</span>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase">2. Бюджет (SD_б ≥ C_ликв)</span>
                  {metrics.constraints.budget ? (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  ) : (
                    <AlertCircle size={14} className="text-red-500" />
                  )}
                </div>
                <div className="flex justify-between text-[8px] font-mono opacity-60">
                  <span>SD_б: {metrics.sd_budget.toFixed(2)}</span>
                  <span>C_ликв: {metrics.c_liq.toFixed(2)}</span>
                </div>
                <div className="h-1 w-full bg-gray-500/20 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", metrics.constraints.budget ? "bg-emerald-500" : "bg-red-500")}
                    style={{ width: `${Math.min(100, (metrics.sd_budget / metrics.c_liq) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className={cn(
            "p-5 space-y-4 transition-colors duration-300",
            isDarkMode ? "bg-[#E4E3E0] text-[#141414]" : "bg-[#141414] text-[#E4E3E0]"
          )}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-50">Диагностика системы</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={14} className={isDarkMode ? "text-emerald-600" : "text-emerald-400"} />
                <span className="text-[10px] font-mono uppercase">Эффективность турбины: 94.2%</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={14} className={isDarkMode ? "text-emerald-600" : "text-emerald-400"} />
                <span className="text-[10px] font-mono uppercase">Теплообменник: Активен</span>
              </div>
              <div className="flex items-center gap-3">
                <AlertCircle size={14} className={isDarkMode ? "text-orange-600" : "text-orange-400"} />
                <span className="text-[10px] font-mono uppercase">Фильтр выбросов: Ресурс 82%</span>
              </div>
            </div>
          </section>
        </aside>

        {/* Main Dashboard Area */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KPICard 
              label="Целевая функция (U)" 
              value={metrics.u.toFixed(2)} 
              icon={<Gauge size={16} />} 
              trend="+2.4%"
              isDarkMode={isDarkMode}
            />
            <KPICard 
              label="Симбиотический Дивиденд (SD)" 
              value={metrics.sd.toFixed(2)} 
              unit="млн.руб"
              icon={<TrendingUp size={16} />} 
              trend="+1.8%"
              isDarkMode={isDarkMode}
            />
            <KPICard 
              label="Функция синергии (φ)" 
              value={metrics.phi.toFixed(1)} 
              unit="%"
              icon={<Zap size={16} />} 
              trend="+5.2%"
              isDarkMode={isDarkMode}
            />
            <KPICard 
              label="Экофонд (SD_e)" 
              value={metrics.distribution.ecofund.toFixed(2)} 
              unit="млн.руб"
              icon={<Leaf size={16} />} 
              trend="+0.9%"
              isDarkMode={isDarkMode}
            />
          </div>

          {/* Top Row: Process Visualization & Distribution */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className={cn(
              "xl:col-span-2 border p-6 transition-colors duration-300",
              isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
            )}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest leading-tight">
                    Граф функционирования<br />экосистемы G = (V, E)
                  </h3>
                  <p className="text-[9px] font-mono opacity-50 uppercase mt-1">Ориентированные потоки ресурсов (Er), отходов (Ew) и финансов (Ef)</p>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-[2px] bg-red-500" />
                    <span className="text-[10px] font-mono uppercase">Ресурсы (Er)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-[2px] border-b border-dashed border-blue-500" />
                    <span className="text-[10px] font-mono uppercase">Отходы (Ew)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-[2px] bg-emerald-500" />
                    <span className="text-[10px] font-mono uppercase">Финансы (Ef)</span>
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
                    label="ЭКОПЛАТФОРМА" 
                    sub="г. Невинномысск" 
                    active={true} 
                    isDarkMode={isDarkMode} 
                    highlight 
                  />
                </div>

                {/* Nodes V */}
                {/* Top Left: ГРЭС */}
                <div className="absolute top-10 left-10">
                  <ProcessNode 
                    icon={<Zap />} 
                    label="ГРЭС" 
                    sub={metrics.sd === 0 ? "Отходы" : "Тепло, пар"} 
                    active={synergyFactor > 20 || metrics.sd === 0} 
                    isDarkMode={isDarkMode} 
                  />
                </div>
                {/* Top Right: АЗОТ */}
                <div className="absolute top-10 right-10">
                  <ProcessNode 
                    icon={<Factory />} 
                    label="АЗОТ" 
                    sub={metrics.sd === 0 ? "Отходы" : "CO2, тепло"} 
                    active={synergyFactor > 30 || metrics.sd === 0} 
                    isDarkMode={isDarkMode} 
                  />
                </div>
                {/* Bottom Left: ЭПП */}
                <div className="absolute bottom-10 left-10">
                  <ProcessNode 
                    icon={<Recycle />} 
                    label="ЭПП" 
                    sub={metrics.sd === 0 ? "Отходы" : "Вторсырьё"} 
                    active={resourceEfficiency > 40 || metrics.sd === 0} 
                    isDarkMode={isDarkMode} 
                  />
                </div>
                {/* Bottom Right: РЕЗИДЕНТЫ */}
                <div className="absolute bottom-10 right-10">
                  <ProcessNode 
                    icon={<Users />} 
                    label="РЕЗИДЕНТЫ" 
                    sub={metrics.sd === 0 ? "Разрозненность" : "Потребители"} 
                    active={metrics.sd > 5 || metrics.sd === 0} 
                    isDarkMode={isDarkMode} 
                  />
                </div>
                {/* Left: ОПЕРАТОР */}
                <div className="absolute top-1/2 -translate-y-1/2 left-4">
                  <ProcessNode 
                    icon={<Cpu />} 
                    label="ОПЕРАТОР" 
                    sub={metrics.sd === 0 ? "Бездействие" : "AI-Матчинг"} 
                    active={metrics.sd > 0} 
                    isDarkMode={isDarkMode} 
                  />
                </div>
                {/* Right: БЮДЖЕТ */}
                <div className="absolute top-1/2 -translate-y-1/2 right-4">
                  <ProcessNode 
                    icon={<Coins />} 
                    label="БЮДЖЕТ" 
                    sub={metrics.sd === 0 ? "Дефицит" : "Дестинация"} 
                    active={metrics.sd > 2} 
                    isDarkMode={isDarkMode} 
                  />
                </div>

                {/* Edges E (Arrows) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
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
                <div className="absolute top-1/4 left-1/4 -translate-x-1/2 text-[8px] font-bold uppercase text-[#ef4444] bg-white/80 dark:bg-[#141414]/80 px-1 py-0.5 rounded">
                  {metrics.sd === 0 ? "Ew: Отходы" : "Er: Тепло"}
                </div>
                <div className="absolute top-1/4 right-1/4 translate-x-1/2 text-[8px] font-bold uppercase text-[#ef4444] bg-white/80 dark:bg-[#141414]/80 px-1 py-0.5 rounded">
                  {metrics.sd === 0 ? "Ew: Отходы" : "Er: CO2"}
                </div>
                <div className="absolute bottom-1/4 left-1/4 -translate-x-1/2 text-[8px] font-bold uppercase text-[#3b82f6] bg-white/80 dark:bg-[#141414]/80 px-1 py-0.5 rounded">
                  {metrics.sd === 0 ? "Ew: Отходы" : "Ew: Вторсырьё"}
                </div>
                <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 text-[8px] font-bold uppercase text-[#ef4444] bg-white/80 dark:bg-[#141414]/80 px-1 py-0.5 rounded">
                  {metrics.sd === 0 ? "Ew: Отходы" : "Er: Ресурсы"}
                </div>
                {metrics.sd > 0 && (
                  <div className="absolute top-1/2 right-[20%] -translate-y-6 text-[8px] font-bold uppercase text-[#10b981] bg-white/80 dark:bg-[#141414]/80 px-1 py-0.5 rounded">Ef: Дивиденд</div>
                )}
              </div>
            </div>

            <div className={cn(
              "border p-6 transition-colors duration-300",
              isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
            )}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-6">Распределение SD</h3>
              <div className="space-y-4">
                <DistributionItem label={<>Бюджет дестинации (<span className="is-number">40</span>%)</>} value={metrics.distribution.budget} color="bg-blue-500" isDarkMode={isDarkMode} />
                <DistributionItem label={<>Оператор платформы (<span className="is-number">25</span>%)</>} value={metrics.distribution.operator} color="bg-emerald-500" isDarkMode={isDarkMode} />
                <DistributionItem label={<>Поставщики ресурсов (<span className="is-number">15</span>%)</>} value={metrics.distribution.suppliers} color="bg-indigo-500" isDarkMode={isDarkMode} />
                <DistributionItem label={<>Корпорация развития (<span className="is-number">12</span>%)</>} value={metrics.distribution.corporation} color="bg-orange-500" isDarkMode={isDarkMode} />
                <DistributionItem label={<>Экофонд (<span className="is-number">8</span>%)</>} value={metrics.distribution.ecofund} color="bg-rose-500" isDarkMode={isDarkMode} />
              </div>
              <div className="mt-6 pt-4 border-t border-dashed border-gray-500/30">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase opacity-50">Итого SD:</span>
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
                  <tr className={cn("text-[10px] font-bold uppercase tracking-wider border-b", isDarkMode ? "border-[#E4E3E0]/10" : "border-[#141414]/10")}>
                    <th className="pb-3 pr-4">Режим</th>
                    <th className="pb-3 pr-4">C_инд</th>
                    <th className="pb-3 pr-4">φ (синергия)</th>
                    <th className="pb-3 pr-4">Характеристика</th>
                    <th className="pb-3">SD, млн руб./год</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
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
                <div className="text-[9px] font-mono opacity-50 uppercase">Базовая экономия (12)</div>
                <div className="text-xs font-bold font-mono">ΔE = Σ E_i = <span className="is-number">{metrics.deltaE_base.toFixed(1)}</span></div>
                <p className="text-[9px] opacity-70 italic leading-tight">Суммарная экономия без учета синергетических эффектов.</p>
              </div>
              <div className="space-y-2">
                <div className="text-[9px] font-mono opacity-50 uppercase">Коэф. синергии (13)</div>
                <div className="text-xs font-bold font-mono">φ = 1 − e^(−k·C) = <span className="is-number">{(metrics.phi / 100).toFixed(3)}</span></div>
                <div className="text-[9px] font-mono opacity-40 uppercase mt-1">
                  k(t) = {metrics.k.toFixed(2)} | C = {metrics.c_ind.toFixed(2)}
                </div>
                {kScenario === 5 && (
                  <div className="mt-2 p-2 bg-emerald-500/5 border border-emerald-500/20 rounded space-y-1">
                    <div className="text-[8px] font-mono uppercase opacity-60">Якорные калибровки (k=5):</div>
                    <div className="flex justify-between text-[9px] font-mono">
                      <span>φ(0.10) ≈ 0.39</span>
                      <span className="text-emerald-500">Факт: {metrics.anchor10.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between text-[9px] font-mono">
                      <span>φ(0.25) ≈ 0.71</span>
                      <span className="text-emerald-500">Факт: {metrics.anchor25.toFixed(3)}</span>
                    </div>
                  </div>
                )}
                <p className="text-[9px] opacity-70 italic leading-tight">Реализуемый потенциал при k={metrics.k} и C={metrics.c/100}.</p>
              </div>
              <div className="space-y-2">
                <div className="text-[9px] font-mono opacity-50 uppercase">Вериф. экономия (14)</div>
                <div className="text-xs font-bold font-mono">ΔE(t) = ΔE · φ = <span className="is-number">{metrics.deltaE_t.toFixed(2)}</span></div>
                <p className="text-[9px] opacity-70 italic leading-tight">Экономия, скорректированная на синергетическую реализуемость.</p>
              </div>
              <div className="space-y-2">
                <div className="text-[9px] font-mono opacity-50 uppercase">Симб. дивиденд (15)</div>
                <div className="text-xs font-bold font-mono">SD = α · ΔE(t) = <span className="is-number">{metrics.sd.toFixed(2)}</span></div>
                <p className="text-[9px] opacity-70 italic leading-tight">Распределяемый доход при α={metrics.alpha}.</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-dashed border-gray-500/30">
              <div className="text-[9px] font-mono opacity-50 uppercase mb-2">Калибровка параметра k (16)</div>
              <div className="text-[10px] font-mono italic">k_i = −ln(1 − φ_i) / C_инд,i</div>
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
                  <p className="text-[10px] font-mono opacity-50 uppercase mt-1">Распределение симбиотического дивиденда и функциональные роли</p>
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
                      <span className="text-[10px] font-bold uppercase tracking-tighter">{r.label}</span>
                      <span className="text-[8px] opacity-50 uppercase mt-0.5">{r.sub}</span>
                    </button>
                  ))}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase opacity-50">Текущий SD (с учетом режима):</span>
                  <div className="text-2xl font-bold font-mono text-emerald-500">
                    <span className="is-number">{metrics.sd.toFixed(2)}</span> млн.руб
                  </div>
                  {metrics.distribution.shares.multiplier > 1.0 && (
                    <div className="text-[9px] font-mono text-emerald-400 uppercase mt-1">
                      Эффект режима: +{((metrics.distribution.shares.multiplier - 1) * 100).toFixed(0)}% к синергии
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={cn("text-[10px] font-bold uppercase tracking-wider border-b", isDarkMode ? "border-[#E4E3E0]/10" : "border-[#141414]/10")}>
                      <th className="pb-4 pr-6 w-1/4">Участник</th>
                      <th className="pb-4 pr-6 w-1/3">Функции</th>
                      <th className="pb-4 pr-6">Что вносит</th>
                      <th className="pb-4 pr-6 text-right">Доля SD, %</th>
                      <th className="pb-4 text-right">Сумма*, млн руб./год</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] leading-relaxed">
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
                            <span className="is-number">{currentShare.toFixed(0)}</span>%
                          </td>
                          <td className="py-5 text-right font-bold text-emerald-500 font-mono">
                            <span className="is-number">{(metrics.sd * currentShare / 100).toFixed(2)}</span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className={cn("border-t-2 font-bold", isDarkMode ? "border-[#E4E3E0]/20" : "border-[#141414]/20")}>
                      <td colSpan={3} className="py-6 text-right uppercase tracking-widest text-[10px]">Итого</td>
                      <td className="py-6 text-right font-mono text-xs">
                        <span className="is-number">100</span>%
                      </td>
                      <td className="py-6 text-right font-mono text-xs text-emerald-500">
                        <span className="is-number">{metrics.sd.toFixed(2)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-8 p-4 border border-dashed border-gray-500/30 text-[9px] font-mono opacity-50 uppercase leading-relaxed">
                * Сумма рассчитывается динамически на основе текущего значения Симбиотического Дивиденда (SD). 
                Текущие значения соответствуют выбранному режиму симуляции.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={cn(
                "border p-6 transition-colors duration-300",
                isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
              )}>
                <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-50">Стратегический приоритет</h4>
                <p className="text-xs leading-relaxed">
                  Основной фокус распределения SD направлен на <span className="font-bold">Бюджет дестинации (40%)</span>, 
                  что обеспечивает легитимность платформы и финансирование критической инфраструктуры.
                </p>
              </div>
              <div className={cn(
                "border p-6 transition-colors duration-300",
                isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
              )}>
                <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-50">Технологическое ядро</h4>
                <p className="text-xs leading-relaxed">
                  <span className="font-bold">Оператор платформы (25%)</span> получает ресурсы для непрерывного совершенствования 
                  AI-алгоритмов матчинга и поддержания цифрового двойника потоков.
                </p>
              </div>
              <div className={cn(
                "border p-6 transition-colors duration-300",
                isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
              )}>
                <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 opacity-50">Экологический эффект</h4>
                <p className="text-xs leading-relaxed">
                  <span className="font-bold">Экофонд (8%)</span> гарантирует целевое использование части прибыли на ликвидацию 
                  исторического ущерба, накопленного в регионе.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className={cn(
        "border-t px-6 py-2 flex items-center justify-between fixed bottom-0 w-full z-10 transition-colors duration-300",
        isDarkMode ? "bg-[#141414] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
      )}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-emerald-500" />
            <span className="text-[9px] font-mono uppercase tracking-tighter">Система: Норма</span>
          </div>
          <div className={cn("w-[1px] h-3 transition-colors duration-300", isDarkMode ? "bg-[#E4E3E0]/20" : "bg-[#141414]/20")} />
          <span className="text-[9px] font-mono uppercase tracking-tighter opacity-50">Буфер: <span className="is-number">1024</span>МБ</span>
          <span className="text-[9px] font-mono uppercase tracking-tighter opacity-50">Задержка: <span className="is-number">12</span>мс</span>
        </div>
        <div className="text-[9px] font-mono uppercase tracking-tighter opacity-50">
          © <span className="is-number">2026</span> Eco-Platform Dynamics • Конфиденциально
        </div>
      </footer>
    </div>
  );
}

function KPICard({ label, value, unit, icon, trend, isDarkMode }: { label: string, value: string, unit?: string, icon: React.ReactNode, trend: string, isDarkMode: boolean }) {
  return (
    <div className={cn(
      "border p-4 space-y-3 transition-all duration-300 hover:-translate-y-1",
      isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
    )}>
      <div className="flex items-center justify-between opacity-50">
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tighter">
          <span className="is-number">{value}</span>
        </span>
        {unit && <span className="text-[10px] font-mono uppercase opacity-50">{unit}</span>}
      </div>
      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-tighter text-emerald-600">
        <TrendingUp size={10} />
        <span className="is-number">{trend}</span>
      </div>
    </div>
  );
}

function ChartContainer({ title, subtitle, children, isDarkMode }: { title: string, subtitle: string, children: React.ReactNode, isDarkMode: boolean }) {
  return (
    <div className={cn(
      "border p-6 space-y-4 transition-colors duration-300",
      isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
    )}>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest">{title}</h3>
        <p className="text-[10px] font-mono uppercase opacity-50">{subtitle}</p>
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

function ProcessNode({ icon, label, sub, active, isDarkMode, highlight }: { icon: React.ReactNode, label: string, sub?: React.ReactNode, active: boolean, isDarkMode: boolean, highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 z-10">
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
      <div className="flex flex-col items-center">
        <span className={cn(
          "font-bold uppercase tracking-widest text-center", 
          highlight ? "text-[10px]" : "text-[9px]",
          active ? "opacity-100" : "opacity-30"
        )}>
          {label}
        </span>
        {sub && <span className="text-[7px] font-mono uppercase opacity-40 text-center">{sub}</span>}
      </div>
    </div>
  );
}

function DistributionItem({ label, value, color, isDarkMode }: { label: React.ReactNode, value: number, color: string, isDarkMode: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[9px] font-mono uppercase">
        <span className="opacity-60">{label}</span>
        <span className="font-bold">
          <span className="is-number">{value.toFixed(2)}</span> млн
        </span>
      </div>
      <div className={cn("h-1 w-full rounded-full overflow-hidden", isDarkMode ? "bg-white/5" : "bg-black/5")}>
        <div 
          className={cn("h-full transition-all duration-1000", color)} 
          style={{ width: `${(value / 9.75 * 100) * 2.5}%` }} 
        />
      </div>
    </div>
  );
}

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
  Recycle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

  // Derived States
  const [history, setHistory] = useState<DataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(true);

  // Calculate current metrics based on sliders
  const metrics = useMemo(() => {
    // SD: Symbiotic Dividend (depends on synergy and efficiency)
    // Base SD is around 9.75 as in the image
    const baseSD = 9.75;
    const sd = baseSD * (synergyFactor / 75) * (1 + (resourceEfficiency - 40) / 100);
    
    // Synergy function: phi = 1 - exp(-k * SD)
    const k = 0.15;
    const phi = (1 - Math.exp(-k * (sd / 2))) * 100;
    
    // Distribution
    const distribution = {
      budget: sd * 0.40,
      operator: sd * 0.20,
      infrastructure: sd * 0.10,
      suppliers: sd * 0.15,
      consumers: sd * 0.15
    };

    // U: Utility Function (Target)
    const cPenalty = investment > 15 ? (investment - 15) * 0.5 : 0;
    const u = (phi * 0.6 + (sd / baseSD * 100) * 0.4) - cPenalty;

    return { sd, phi, distribution, u, c: investment };
  }, [synergyFactor, resourceEfficiency, investment]);

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

  // Determine Regime based on C (Investment Index)
  const regime = useMemo(() => {
    if (investment <= 5) return { label: 'Low Impact', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    if (investment <= 15) return { label: 'Optimal Growth', color: 'text-blue-500', bg: 'bg-blue-500/10' };
    return { label: 'High Intensity', color: 'text-orange-500', bg: 'bg-orange-500/10' };
  }, [investment]);

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

      <main className="p-6 grid grid-cols-12 gap-6">
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

            {/* Sliders */}
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-mono uppercase opacity-50">Коэффициент синергии (φ)</label>
                  <span className="text-xs font-bold font-mono">{synergyFactor}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={synergyFactor} 
                  onChange={(e) => setSynergyFactor(Number(e.target.value))}
                  className={cn(
                    "w-full h-1 appearance-none cursor-pointer transition-colors duration-300",
                    isDarkMode ? "bg-[#E4E3E0]/10 accent-[#E4E3E0]" : "bg-[#E4E3E0] accent-[#141414]"
                  )}
                />
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
                isDarkMode ? "border-[#E4E3E0]/20" : "border-[#141414]",
                regime.bg
              )}>
                <span className="text-[10px] font-bold uppercase tracking-tighter">Текущий режим</span>
                <span className={cn("text-[10px] font-bold uppercase", regime.color)}>{regime.label}</span>
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
              label="Инфраструктура (SD_i)" 
              value={metrics.distribution.infrastructure.toFixed(2)} 
              unit="млн.руб"
              icon={<Activity size={16} />} 
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
                <h3 className="text-xs font-bold uppercase tracking-widest">Потоки ресурсов и отходов</h3>
                <div className="flex gap-4">
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
                "relative h-80 border border-dashed flex items-center justify-around px-10 transition-colors duration-300",
                isDarkMode ? "border-[#E4E3E0]/10" : "border-[#141414]/20"
              )}>
                <div className="flex flex-col gap-12">
                  <ProcessNode icon={<Zap />} label="ГРЭС" sub="Тепло, пар" active={synergyFactor > 20} isDarkMode={isDarkMode} />
                  <ProcessNode icon={<Recycle />} label="ЭПП" sub="Вторсырьё" active={resourceEfficiency > 40} isDarkMode={isDarkMode} />
                </div>
                
                <div className="flex-1 flex flex-col gap-16 px-2">
                  <div className="relative">
                    <FlowLine 
                      color="#ef4444" 
                      thickness={2 + (synergyFactor / 20)} 
                      active={synergyFactor > 10} 
                      isDarkMode={isDarkMode} 
                    />
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase text-[#ef4444] opacity-70">Тепло</span>
                  </div>
                  <div className="relative">
                    <FlowLine 
                      color="#3b82f6" 
                      thickness={2 + ((100 - resourceEfficiency) / 20)} 
                      dashed 
                      active={resourceEfficiency < 90} 
                      isDarkMode={isDarkMode} 
                    />
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase text-[#3b82f6] opacity-70">Отходы</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <ProcessNode icon={<Leaf />} label="ЭКОПЛАТФОРМА" sub="AI & IoT" active={true} isDarkMode={isDarkMode} highlight />
                  <div className="h-16 w-12 flex justify-center">
                    <FlowVertical 
                      color="#10b981" 
                      thickness={2 + (metrics.sd / 2)} 
                      active={metrics.sd > 1} 
                      isDarkMode={isDarkMode} 
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-16 px-2">
                  <div className="relative">
                    <FlowLine 
                      color="#ef4444" 
                      thickness={2 + (synergyFactor / 20)} 
                      active={synergyFactor > 30} 
                      isDarkMode={isDarkMode} 
                    />
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase text-[#ef4444] opacity-70">Ресурсы</span>
                  </div>
                  <div className="relative">
                    <FlowLine 
                      color="#3b82f6" 
                      thickness={2 + ((100 - resourceEfficiency) / 20)} 
                      dashed 
                      active={resourceEfficiency < 80} 
                      isDarkMode={isDarkMode} 
                    />
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase text-[#3b82f6] opacity-70">Отходы</span>
                  </div>
                </div>

                <div className="flex flex-col gap-12">
                  <ProcessNode icon={<Cpu />} label="АЗОТ" sub={<>CO<span className="is-number">2</span>, NH<span className="is-number">3</span></>} active={resourceEfficiency > 30} isDarkMode={isDarkMode} />
                  <ProcessNode icon={<Activity />} label="ТОСЭР" sub="Резиденты" active={synergyFactor > 50} isDarkMode={isDarkMode} />
                </div>
              </div>
            </div>

            <div className={cn(
              "border p-6 transition-colors duration-300",
              isDarkMode ? "bg-[#1A1A1A] border-[#E4E3E0]/20" : "bg-white border-[#141414]"
            )}>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-6">Распределение SD</h3>
              <div className="space-y-4">
                <DistributionItem label={<>Бюджет дестинации (<span className="is-number">40</span>%)</>} value={metrics.distribution.budget} color="bg-blue-500" isDarkMode={isDarkMode} />
                <DistributionItem label={<>Оператор платформы (<span className="is-number">20</span>%)</>} value={metrics.distribution.operator} color="bg-emerald-500" isDarkMode={isDarkMode} />
                <DistributionItem label={<>Инфраструктура (<span className="is-number">10</span>%)</>} value={metrics.distribution.infrastructure} color="bg-orange-500" isDarkMode={isDarkMode} />
                <DistributionItem label={<>Поставщики (<span className="is-number">15</span>%)</>} value={metrics.distribution.suppliers} color="bg-indigo-500" isDarkMode={isDarkMode} />
                <DistributionItem label={<>Потребители (<span className="is-number">15</span>%)</>} value={metrics.distribution.consumers} color="bg-rose-500" isDarkMode={isDarkMode} />
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
        </div>
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

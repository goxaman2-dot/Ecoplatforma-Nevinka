import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, BarChart, Bar, Cell, LabelList,
} from 'recharts';
import { ChevronLeft, ChevronRight, ShieldCheck, FlaskConical, Network, Landmark, RefreshCw, BookMarked, AlertTriangle, History } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { NOVELTY, POSITIONS } from './novelty';
import { GENESIS, PROBLEMS, THESIS_EXTRA, STATUS_LABEL, ROADMAP, GOV_DECISIONS, AUTHOR, MODEL_VERSION, type Status } from './v5content';
import { runSelfCheck } from './selfcheck';
import { n1, n2, n3, n4, n5, n6, baseCtx, POP, type Interval, type TornadoRow, barrierCurve, barrierMin, barrierBreakEven, grid05, C0_OBS } from './thesisLab';
import { gammaMap, MECHS, BEHAVIORS, evaluate, type MechId, type BehaviorId } from './bilevel';
import { calcMetrics, BASE_PARAMS } from './core';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
const ru = (x: number, d = 0) => (Number.isFinite(x) ? x.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');

export type Audience = 'council' | 'gov';
type Page =
  | { kind: 'passport' } | { kind: 'gov' } | { kind: 'bridge' } | { kind: 'retro' }
  | { kind: 'gen'; id: string } | { kind: 'prob'; id: string } | { kind: 'thesis'; id: string };

export const THESES = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'];
const STATUS_VAR: Record<Status, string> = { yes: 'var(--c-ok)', partial: 'var(--c-mid)', no: 'var(--c-bad)' };

interface Props {
  isDarkMode: boolean;
  audience: Audience;
  focus: boolean;
  setFocus: (v: boolean) => void;
  onOpenLab: (novId?: string) => void;
}

export default function Defense({ isDarkMode, audience, focus, setFocus, onOpenLab }: Props) {
  const [page, setPage] = useState<Page>(() => (audience === 'gov' ? { kind: 'gov' } : { kind: 'passport' }));
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1500);
  const [peek, setPeek] = useState<'left' | 'right' | null>(null);
  const centerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setPage(audience === 'gov' ? { kind: 'gov' } : { kind: 'passport' }); }, [audience]);

  // На узком экране раскрыто не более одного меню
  const narrow = () => window.innerWidth < 1500;
  const openLeft = (v: boolean) => { setLeftOpen(v); if (v && narrow()) setRightOpen(false); };
  const openRight = (v: boolean) => { setRightOpen(v); if (v && narrow()) setLeftOpen(false); };

  // Клавиши: F — фокус; ← → — соседний тезис
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'KeyF') { e.preventDefault(); setFocus(!focus); }
      if (page.kind === 'thesis' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const i = THESES.indexOf(page.id);
        const j = (i + (e.key === 'ArrowRight' ? 1 : THESES.length - 1)) % THESES.length;
        setPage({ kind: 'thesis', id: THESES[j] });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus, setFocus, page]);

  useEffect(() => { centerRef.current?.scrollTo?.({ top: 0 }); window.scrollTo({ top: 0 }); }, [page]);

  // Двойной щелчок только по свободному полю
  const isBg = (el: EventTarget | null) => (el as HTMLElement | null)?.dataset?.bg === '1';
  const onDbl = (e: React.MouseEvent) => { if (isBg(e.target)) { e.preventDefault(); setFocus(!focus); window.getSelection()?.removeAllRanges(); } };
  const onDown = (e: React.MouseEvent) => { if (e.detail > 1 && isBg(e.target)) e.preventDefault(); };

  // Связи текущей страницы: что подсвечивать в меню
  const rel = useMemo(() => {
    const g = new Set<string>(), p = new Set<string>(), t = new Set<string>();
    if (page.kind === 'gen') { const s = GENESIS.find((x) => x.id === page.id); s?.theses.forEach((x) => t.add(x)); s?.problems.forEach((x) => p.add(x)); }
    if (page.kind === 'prob') { const s = PROBLEMS.find((x) => x.id === page.id); if (s?.genesis) g.add(s.genesis); s?.theses.forEach((x) => t.add(x)); }
    if (page.kind === 'thesis') {
      const ex = THESIS_EXTRA[page.id]; ex?.genesis.forEach((x) => g.add(x)); ex?.problems.forEach((x) => p.add(x));
      PROBLEMS.filter((x) => x.theses.includes(page.id)).forEach((x) => p.add(x.id));
      GENESIS.filter((x) => x.theses.includes(page.id)).forEach((x) => g.add(x.id));
    }
    return { g, p, t };
  }, [page]);

  const muted = isDarkMode ? 'text-[#c3c2b7]' : 'text-[#52514e]';
  const card = cn('border p-5 transition-colors', isDarkMode ? 'bg-[#1A1A1A] border-[#E4E3E0]/20' : 'bg-white border-[#141414]');
  const sel = (on: boolean) => on ? (isDarkMode ? 'bg-white/10' : 'bg-black/[0.05]') : '';
  const ctx = { isDarkMode, muted, card, go: setPage, onOpenLab };

  const leftShown = !focus && leftOpen;
  const rightShown = !focus && rightOpen;

  const LeftRail = ({ overlay = false }: { overlay?: boolean }) => (
    <nav aria-label="Генезис" className={cn('border flex flex-col', isDarkMode ? 'bg-[#1A1A1A] border-[#E4E3E0]/20' : 'bg-white border-[#141414]',
      overlay ? 'fixed left-0 top-24 bottom-10 w-[260px] z-40 shadow-2xl overflow-y-auto' : 'sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto')}
      onMouseLeave={overlay ? () => setPeek(null) : undefined}>
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--c-gen)' }}>
        <span className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest" style={{ color: 'var(--c-gen)' }}>Генезис</span>
        {!overlay && <button onClick={() => openLeft(false)} className="p-1 opacity-60 hover:opacity-100" title="Свернуть"><ChevronLeft size={15} /></button>}
      </div>
      <div className={cn('px-3 pt-2 pb-1 text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest', muted)}>Понятие</div>
      {GENESIS.filter((s) => s.kind === 'concept').map((s) => (
        <RailItem key={s.id} tag={s.id} text={s.title} color="var(--c-gen)" active={page.kind === 'gen' && page.id === s.id}
          related={rel.g.has(s.id)} onClick={() => setPage({ kind: 'gen', id: s.id })} sel={sel} />
      ))}
      <div className={cn('px-3 pt-3 pb-1 text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest border-t mt-1', muted, isDarkMode ? 'border-[#E4E3E0]/15' : 'border-[#141414]/15')}>Объект: Невинномысск</div>
      {GENESIS.filter((s) => s.kind === 'object').map((s, i) => (
        <RailItem key={s.id} tag={s.id} text={s.title} color={`color-mix(in srgb, var(--c-gen) ${55 + i * 15}%, transparent)`} active={page.kind === 'gen' && page.id === s.id}
          related={rel.g.has(s.id)} onClick={() => setPage({ kind: 'gen', id: s.id })} sel={sel} />
      ))}
    </nav>
  );

  const RightRail = ({ overlay = false }: { overlay?: boolean }) => (
    <nav aria-label="Проблемы" className={cn('border flex flex-col', isDarkMode ? 'bg-[#1A1A1A] border-[#E4E3E0]/20' : 'bg-white border-[#141414]',
      overlay ? 'fixed right-0 top-24 bottom-10 w-[260px] z-40 shadow-2xl overflow-y-auto' : 'sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto')}
      onMouseLeave={overlay ? () => setPeek(null) : undefined}>
      <div className={cn('flex items-center justify-between px-3 py-2 border-b', isDarkMode ? 'border-[#E4E3E0]/20' : 'border-[#141414]/30')}>
        {!overlay && <button onClick={() => openRight(false)} className="p-1 opacity-60 hover:opacity-100" title="Свернуть"><ChevronRight size={15} /></button>}
        <span className="text-[length:calc(12px*var(--ui,1))] font-bold uppercase tracking-widest">Проблемы территории</span>
      </div>
      {PROBLEMS.map((p) => (
        <RailItem key={p.id} tag={p.id} text={p.title} color={STATUS_VAR[p.status]} icon={STATUS_LABEL[p.status].icon}
          active={page.kind === 'prob' && page.id === p.id} related={rel.p.has(p.id)} onClick={() => setPage({ kind: 'prob', id: p.id })} sel={sel} />
      ))}
      <div className={cn('px-3 py-2 mt-1 border-t text-[length:calc(11px*var(--ui,1))] leading-snug', muted, isDarkMode ? 'border-[#E4E3E0]/15' : 'border-[#141414]/15')}>
        <span style={{ color: 'var(--c-ok)' }}>✓ решает</span> · <span style={{ color: 'var(--c-mid)' }}>~ частично</span> · <span style={{ color: 'var(--c-bad)' }}>✗ не решает</span>
      </div>
    </nav>
  );

  const Collapsed = ({ side }: { side: 'left' | 'right' }) => (
    <button onClick={() => (side === 'left' ? openLeft(true) : openRight(true))}
      className={cn('sticky top-28 w-[44px] border flex flex-col items-center gap-1 py-2', isDarkMode ? 'bg-[#1A1A1A] border-[#E4E3E0]/20' : 'bg-white border-[#141414]')}
      title={side === 'left' ? 'Раскрыть генезис' : 'Раскрыть проблемы'}>
      {side === 'left' ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      {(side === 'left' ? GENESIS.map((g) => ({ id: g.id, c: 'var(--c-gen)' })) : PROBLEMS.map((p) => ({ id: p.id, c: STATUS_VAR[p.status] }))).map((x) => (
        <span key={x.id} className="text-[length:calc(10px*var(--ui,1))] font-mono font-bold" style={{ color: x.c }}>{x.id}</span>
      ))}
    </button>
  );

  return (
    <div className="relative" data-bg="1" onDoubleClick={onDbl} onMouseDown={onDown}>
      {focus && (
        <>
          <button onMouseEnter={() => setPeek('left')} onClick={() => setPeek('left')} aria-label="Генезис"
            className="fixed left-0 top-1/2 -translate-y-1/2 z-30 w-3 h-40 flex items-center justify-center" style={{ background: 'var(--c-gen)' }}>
            <span className="text-white text-[9px] font-bold [writing-mode:vertical-rl] rotate-180 tracking-widest">ГЕНЕЗИС</span>
          </button>
          <button onMouseEnter={() => setPeek('right')} onClick={() => setPeek('right')} aria-label="Проблемы"
            className={cn('fixed right-0 top-1/2 -translate-y-1/2 z-30 w-3 h-40 flex items-center justify-center', isDarkMode ? 'bg-[#E4E3E0]' : 'bg-[#141414]')}>
            <span className={cn('text-[9px] font-bold [writing-mode:vertical-rl] tracking-widest', isDarkMode ? 'text-[#141414]' : 'text-white')}>ПРОБЛЕМЫ</span>
          </button>
          {peek === 'left' && LeftRail({ overlay: true })}
          {peek === 'right' && RightRail({ overlay: true })}
        </>
      )}

      <div className="flex gap-4 items-start" data-bg="1">
        {!focus && (leftShown ? <div className="w-[248px] shrink-0">{LeftRail({})}</div> : Collapsed({ side: 'left' }))}

        <section ref={centerRef} className="flex-1 min-w-0 space-y-4" data-bg="1">
          <PageNav page={page} go={setPage} audience={audience} isDarkMode={isDarkMode} onOpenLab={onOpenLab} />
          {page.kind === 'passport' && <Passport {...ctx} />}
          {page.kind === 'gov' && <GovPage {...ctx} />}
          {page.kind === 'bridge' && <Bridge {...ctx} />}
          {page.kind === 'retro' && <Retro {...ctx} />}
          {page.kind === 'gen' && <GenesisPage id={page.id} {...ctx} />}
          {page.kind === 'prob' && <ProblemPage id={page.id} {...ctx} />}
          {page.kind === 'thesis' && <ThesisPage key={page.id} id={page.id} {...ctx} />}
          <div className={cn('text-[length:calc(11px*var(--ui,1))] font-mono pt-2 pb-4', muted)} data-bg="1">
            Двойной щелчок по свободному полю или клавиша F — скрыть и вернуть боковые меню · ← → — соседний тезис
          </div>
        </section>

        {!focus && (rightShown ? <div className="w-[248px] shrink-0">{RightRail({})}</div> : Collapsed({ side: 'right' }))}
      </div>
    </div>
  );
}

function RailItem({ tag, text, color, active, related, onClick, sel, icon }: {
  key?: React.Key; tag: string; text: string; color: string; active: boolean; related: boolean; onClick: () => void; sel: (b: boolean) => string; icon?: string;
}) {
  return (
    <button onClick={onClick} className={cn('w-full text-left px-3 py-1.5 flex items-start gap-2 border-l-4 text-[length:calc(12px*var(--ui,1))] leading-snug hover:opacity-100', sel(active),
      related || active ? 'opacity-100' : 'opacity-80')}
      style={{ borderColor: active || related ? color : 'transparent' }}>
      <span className="font-mono font-bold shrink-0 w-7" style={{ color }}>{tag}</span>
      <span className={cn(active && 'font-bold')}>{text}</span>
      {icon && <span className="ml-auto font-bold shrink-0" style={{ color }}>{icon}</span>}
    </button>
  );
}

type Ctx = { isDarkMode: boolean; muted: string; card: string; go: (p: Page) => void; onOpenLab: (id?: string) => void };

function PageNav({ page, go, audience, isDarkMode, onOpenLab }: { page: Page; go: (p: Page) => void; audience: Audience; isDarkMode: boolean; onOpenLab: (id?: string) => void }) {
  const b = (on: boolean) => cn('px-2.5 py-1.5 text-[length:calc(12px*var(--ui,1))] font-bold border transition-colors',
    on ? (isDarkMode ? 'bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]' : 'bg-[#141414] text-white border-[#141414]') : (isDarkMode ? 'border-[#E4E3E0]/25' : 'border-[#141414]/25'));
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-bg="1">
      {audience === 'gov' && <button className={b(page.kind === 'gov')} onClick={() => go({ kind: 'gov' })}><Landmark size={13} className="inline -mt-0.5 mr-1" />Решения</button>}
      <button className={b(page.kind === 'passport')} onClick={() => go({ kind: 'passport' })}><ShieldCheck size={13} className="inline -mt-0.5 mr-1" />Паспорт модели</button>
      {THESES.map((id) => {
        const on = page.kind === 'thesis' && page.id === id;
        return (
          <button key={id} onClick={() => go({ kind: 'thesis', id })} title={NOVELTY[id].title}
            className="px-2.5 py-1.5 text-[length:calc(12px*var(--ui,1))] font-bold font-mono border-2"
            style={on ? { background: 'var(--c-nov)', borderColor: 'var(--c-nov)', color: '#fff' } : { borderColor: 'var(--c-nov)', color: 'var(--c-nov)' }}>
            {NOVELTY[id].tag}
          </button>
        );
      })}
      <button className={b(page.kind === 'retro')} onClick={() => go({ kind: 'retro' })}><History size={13} className="inline -mt-0.5 mr-1" />Ретропрогноз</button>
      <button className={b(page.kind === 'bridge')} onClick={() => go({ kind: 'bridge' })}><Network size={13} className="inline -mt-0.5 mr-1" />Мост</button>
      <button className={cn(b(false), 'ml-auto')} onClick={() => onOpenLab(page.kind === 'thesis' ? page.id : undefined)}>
        <FlaskConical size={13} className="inline -mt-0.5 mr-1" />Лаборатория
      </button>
    </div>
  );
}

const H = ({ children, color }: { children: React.ReactNode; color?: string }) => (
  <div className="text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest mb-1.5 opacity-80" style={color ? { color, opacity: 1 } : undefined}>{children}</div>
);
const P = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn('text-[length:calc(14px*var(--ui,1))] leading-relaxed', className)}>{children}</p>
);

// ─── Паспорт модели ───
function Passport({ card, muted, isDarkMode, go, onOpenLab }: Ctx) {
  const [checks, setChecks] = useState(() => runSelfCheck());
  const okN = checks.filter((c) => c.ok).length;
  return (
    <div className="space-y-4">
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <H>Паспорт модели · версия {MODEL_VERSION}</H>
            <h2 className="text-xl font-bold leading-tight">Имитационная модель экоплатформы промышленного комплекса г. Невинномысска</h2>
            <P className="mt-2">Модель к диссертации «{AUTHOR.topic}», специальность {AUTHOR.spec}.</P>
            <P className={cn('mt-1', muted)}>Автор: {AUTHOR.role} {AUTHOR.name}, {AUTHOR.org}.</P>
          </div>
          <div className="border-2 px-4 py-3 text-center" style={{ borderColor: okN === checks.length ? 'var(--c-ok)' : 'var(--c-bad)' }}>
            <div className={cn('text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest', muted)}>Самопроверка</div>
            <div className="text-3xl font-bold font-mono" style={{ color: okN === checks.length ? 'var(--c-ok)' : 'var(--c-bad)' }}>{okN} / {checks.length}</div>
            <div className={cn('text-[length:calc(11px*var(--ui,1))]', muted)}>контрольных чисел глав 2–3</div>
          </div>
        </div>
        <div className="mt-4 p-3 border-l-4 text-[length:calc(14px*var(--ui,1))] leading-relaxed" style={{ borderColor: 'var(--c-mid)', background: isDarkMode ? 'rgba(212,160,23,.08)' : 'rgba(212,160,23,.08)' }}>
          <AlertTriangle size={15} className="inline -mt-0.5 mr-1.5" style={{ color: 'var(--c-mid)' }} />
          <b>Платформа не создана.</b> Модель не показывает её работу, а проверяет положения, выносимые на защиту, на откалиброванных данных и формулирует условные прогнозы, которые можно опровергнуть после запуска. Параметры имеют класс A (факт, норма), B (перенос по аналогам) или C (допущение).
        </div>
      </div>

      <div className={card}>
        <H color="var(--c-nov)">Положения, выносимые на защиту · утверждены 24.10.2026</H>
        <div className="space-y-2.5 mt-1">
          {POSITIONS.map((p) => (
            <div key={p.n} className={cn('flex flex-wrap items-start gap-3 pb-2.5 border-b last:border-b-0', isDarkMode ? 'border-[#E4E3E0]/10' : 'border-[#141414]/10')}>
              <span className="w-8 h-8 shrink-0 flex items-center justify-center text-white font-bold font-mono" style={{ background: 'var(--c-nov)' }}>{p.n}</span>
              <div className="flex-1 min-w-[260px]">
                <P className="font-bold leading-snug">{p.title}</P>
                <div className={cn('text-[length:calc(12px*var(--ui,1))] font-mono mt-0.5', muted)}>{p.where}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p.n === 1 && <button onClick={() => go({ kind: 'gen', id: 'Г1' })} className="px-2 py-1 font-mono font-bold border-2 text-[length:calc(12px*var(--ui,1))]" style={{ borderColor: 'var(--c-gen)', color: 'var(--c-gen)' }}>Генезис Г1–Г6</button>}
                {p.n === 2 && <button onClick={() => onOpenLab()} className="px-2 py-1 font-mono font-bold border-2 text-[length:calc(12px*var(--ui,1))]" style={{ borderColor: 'var(--c-nov)', color: 'var(--c-nov)' }}>Лаборатория: расчёт ΔE и SD</button>}
                {p.theses.map((t) => (
                  <button key={t} onClick={() => (t.startsWith('N') ? go({ kind: 'thesis', id: t }) : onOpenLab(t))} title={NOVELTY[t].title}
                    className="px-2 py-1 font-mono font-bold border-2 text-[length:calc(12px*var(--ui,1))]"
                    style={{ borderColor: NOVELTY[t].level === 'N' ? 'var(--c-nov)' : 'var(--c-nov-a)', color: NOVELTY[t].level === 'N' ? 'var(--c-nov)' : 'var(--c-nov-a)' }}>{NOVELTY[t].tag}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className={card}>
          <H>Чем модель доказывает научность</H>
          <table className="w-full text-[length:calc(13px*var(--ui,1))]">
            <tbody>
              {[
                ['Объяснительность', 'Воспроизводит наблюдаемое: ряды 2017–2026 гг. и одну действующую связь при барьере ≥ 1,75 млн руб.', 'О1'],
                ['Прогностичность', 'Условный прогноз «если механизм θ, то C**, ΔE, баланс бюджетов» с интервалом 5–95 %', 'О3'],
                ['Фальсифицируемость', 'Для каждого тезиса названо наблюдение, которое его отвергает (табл. 3.8, 3.14, 3.22)', 'О4'],
                ['Воспроизводимость', 'Самопроверка пересчитывает контрольные числа глав теми же функциями', ''],
                ['Строгость', 'Класс данных у параметров; диаграмма чувствительности на каждой странице тезиса', ''],
              ].map(([a, b]) => (
                <tr key={a} className={cn('border-b', isDarkMode ? 'border-[#E4E3E0]/10' : 'border-[#141414]/10')}>
                  <td className="py-1.5 pr-3 font-bold align-top whitespace-nowrap">{a}</td>
                  <td className="py-1.5 leading-snug">{b}{a === 'Объяснительность' && <> <button onClick={() => go({ kind: 'retro' })} className="underline font-bold" style={{ color: 'var(--c-gen)' }}>Ретропрогноз →</button></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={card}>
          <H>Цветовая система</H>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[length:calc(13px*var(--ui,1))]">
            {[
              ['var(--c-nov)', 'Новизна: положения 3–5 (метки Н3а–Н5)'],
              ['var(--c-nov-a)', 'Авторская адаптация метода: А1–А2'],
              ['var(--c-gen)', 'Генезис: история науки и объекта'],
              ['var(--c-part)', 'Участники: производственная сторона'],
              ['var(--c-bud)', 'Бюджеты: публичная сторона'],
              ['var(--c-ok)', '✓ проблема решается'],
              ['var(--c-mid)', '~ решается частично или при условии'],
              ['var(--c-bad)', '✗ вне возможностей платформы'],
            ].map(([c, t]) => (
              <div key={t} className="flex items-center gap-2"><span className="w-4 h-4 shrink-0" style={{ background: c }} />{t}</div>
            ))}
          </div>
          <div className={cn('mt-3 text-[length:calc(12px*var(--ui,1))] leading-relaxed', muted)}>
            Класс данных — начертанием: A сплошной линией, B пунктиром, C точечной линией. Цвет нигде не несёт смысл в одиночку: у новизны есть метка Н/А, у статуса — значок.
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="flex items-center justify-between mb-2">
          <H>Самопроверка: контрольные числа глав 2–3</H>
          <button onClick={() => setChecks(runSelfCheck())} className={cn('flex items-center gap-1.5 px-2.5 py-1 text-[length:calc(12px*var(--ui,1))] font-bold border', isDarkMode ? 'border-[#E4E3E0]/30' : 'border-[#141414]/30')}>
            <RefreshCw size={13} /> Проверить ещё раз
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[length:calc(13px*var(--ui,1))] font-mono">
            <thead><tr className={cn('text-left border-b', muted, isDarkMode ? 'border-[#E4E3E0]/20' : 'border-[#141414]/20')}>
              <th className="py-1 font-normal">Величина</th><th className="py-1 font-normal text-right">В тексте</th><th className="py-1 font-normal text-right">Модель</th><th className="py-1 font-normal pl-3">Источник</th><th />
            </tr></thead>
            <tbody>{checks.map((c) => (
              <tr key={c.id} className={cn('border-b', isDarkMode ? 'border-[#E4E3E0]/10' : 'border-[#141414]/10')}>
                <td className="py-1 pr-2 font-sans">{c.label}</td>
                <td className="py-1 text-right">{ru(c.expected, c.digits)}</td>
                <td className="py-1 text-right">{ru(c.actual, c.digits + 1)}</td>
                <td className={cn('py-1 pl-3 whitespace-nowrap', muted)}>{c.source}</td>
                <td className="py-1 pl-2 font-bold" style={{ color: c.ok ? 'var(--c-ok)' : 'var(--c-bad)' }}>{c.ok ? '✓' : '✗'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className={cn('mt-2 text-[length:calc(12px*var(--ui,1))]', muted)}>
          Совпадение — при округлении до числа знаков, приведённого в тексте. Если число в главе изменится, расхождение будет видно до защиты.
        </div>
      </div>
    </div>
  );
}

const OutOfText = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-2 inline-block px-2 py-0.5 text-[length:calc(11px*var(--ui,1))] font-mono border border-dashed" style={{ borderColor: 'var(--c-mid)', color: 'var(--c-mid)' }}>{children}</div>
);

// ─── Ретропрогноз: информационный барьер (3.35) ───
function Retro({ card, muted, isDarkMode }: Ctx) {
  const d = useMemo(() => {
    const ctx = baseCtx(2027);
    const xs = Array.from({ length: 61 }, (_, i) => +(i * 0.05).toFixed(2));
    const curve = barrierCurve(ctx, xs).map((r) => ({ ...r, Cpct: r.C * 100 }));
    const xmin = barrierMin(ctx);
    const be = barrierBreakEven(ctx, 'coord');
    return { curve, xmin, xminG: grid05(xmin), be: grid05(be), beRaw: be };
  }, []);
  const grid = isDarkMode ? '#333' : '#e5e5e5';
  const ax = isDarkMode ? '#c3c2b7' : '#52514e';
  return (
    <div className="space-y-4">
      <div className={cn(card, 'border-l-8')} style={{ borderLeftColor: 'var(--c-gen)' }}>
        <H color="var(--c-gen)">Объяснительность · § 3.3.3, табл. 3.11, формула (3.35)</H>
        <h2 className="text-xl font-bold leading-tight">Ретропрогноз: почему за 2017–2026 гг. возникла одна межзаводская связь</h2>
        <P className="mt-2">Режим Р0 (двусторонние сделки без платформы) дополняется информационным барьером x — затратами одного резидента на поиск партнёра и проверку его данных, млн руб./год. Модель ищет такое x, при котором равновесная доля связей C** опускается до наблюдаемой: одна связь из 130 возможных пар (C₀ = 1/130 ≈ {ru(C0_OBS * 100, 2)} %).</P>
      </div>
      <div className={card}>
        <H>C** режима Р0 в зависимости от барьера x, 2027 г.</H>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.curve} margin={{ top: 28, right: 24, bottom: 28, left: 8 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" />
              <XAxis dataKey="x" type="number" domain={[0, 3]} ticks={[0, 0.5, 1, 1.5, 2, 2.5, 3]} tickFormatter={(v) => ru(v, 1)} stroke={ax}
                label={{ value: 'барьер x, млн руб./год', position: 'insideBottom', offset: -16, fill: ax, fontSize: 12 }} />
              <YAxis stroke={ax} tickFormatter={(v) => ru(v, 0)} label={{ value: 'C**, %', angle: -90, position: 'insideLeft', fill: ax, fontSize: 12 }} />
              <Tooltip formatter={(v: number) => ru(v, 2) + ' %'} labelFormatter={(v) => 'x = ' + ru(Number(v), 2)} />
              <ReferenceLine y={C0_OBS * 100} stroke="var(--c-gen)" strokeDasharray="4 3" label={{ value: 'наблюдаемо: 1/130', position: 'insideTopLeft', dx: 40, fill: 'var(--c-gen)', fontSize: 12 }} />
              <ReferenceLine x={d.xminG} stroke="var(--c-nov)" label={{ value: 'x_min = ' + ru(d.xminG, 2), position: 'top', fill: 'var(--c-nov)', fontSize: 12 }} />
              <ReferenceLine x={d.be} stroke="var(--c-mid)" strokeDasharray="6 3" label={{ value: 'безубыточность ' + ru(d.be, 2), position: 'insideTopLeft', fill: 'var(--c-mid)', fontSize: 12 }} />
              <Line type="stepAfter" dataKey="Cpct" stroke="var(--c-gen)" strokeWidth={2.5} dot={false} isAnimationActive={false} name="C** Р0" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={card}><H>Минимальный барьер</H><div className="text-3xl font-bold font-mono" style={{ color: 'var(--c-nov)' }}>{ru(d.xminG, 2)}</div>
          <div className={cn('text-[length:calc(12px*var(--ui,1))]', muted)}>млн руб./год на сетке 0,05 (точно {ru(d.xmin, 3)}); в тексте — 1,75</div></div>
        <div className={card}><H>Порог безубыточности платформы</H><div className="text-3xl font-bold font-mono" style={{ color: 'var(--c-mid)' }}>{ru(d.be, 2)}</div>
          <div className={cn('text-[length:calc(12px*var(--ui,1))]', muted)}>выше этого барьера платформа (координация, Р1) даёт больший ΔE, чем сделки без неё; в тексте — 0,9–1,05</div></div>
        <div className={card}><H>Что отвергло бы объяснение</H>
          <P>Если обследование покажет, что резиденты тратят на поиск и согласование договора заметно меньше 1 млн руб. в год, а обмены всё равно не начинаются, причина лежит вне информационного барьера, и вклад платформы требует пересмотра (§ 3.3.3).</P></div>
      </div>
    </div>
  );
}

// ─── Генезис и проблемы ───
function GenesisPage({ id, card, muted, go }: Ctx & { id: string }) {
  const s = GENESIS.find((x) => x.id === id)!;
  const obj = s.kind === 'object';
  return (
    <div className={cn(card, 'border-l-8')} style={{ borderLeftColor: 'var(--c-gen)' }}>
      <div className="flex items-start gap-3">
        <span className="px-2 py-0.5 text-white text-lg font-bold font-mono shrink-0" style={{ background: 'var(--c-gen)' }}>{s.id}</span>
        <div>
          <H color="var(--c-gen)">{obj ? 'Генезис объекта' : 'Генезис понятия'} · {s.source}</H>
          <h2 className="text-xl font-bold leading-tight">{s.title}</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <div><H>{obj ? 'Состояние' : 'Что дала ступень'}</H><P>{s.gave}</P></div>
        <div className="p-3 border-l-4" style={{ borderColor: 'var(--c-gen)' }}>
          <H color="var(--c-gen)">{obj ? 'Что доказывает модель' : 'Что осталось открытым'}</H><P className="font-bold">{s.open}</P>
        </div>
      </div>
      <div className="mt-5"><H>Куда ведёт в модели</H><P>{s.leads}</P></div>
      {s.id === 'О1' && <button onClick={() => go({ kind: 'retro' })} className="mt-3 px-3 py-1.5 font-bold border-2" style={{ borderColor: 'var(--c-gen)', color: 'var(--c-gen)' }}><History size={13} className="inline -mt-0.5 mr-1" />Ретропрогноз: барьер (3.35)</button>}
      <Links theses={s.theses} problems={s.problems} go={go} muted={muted} />
    </div>
  );
}

function ProblemPage({ id, card, muted, go }: Ctx & { id: string }) {
  const p = PROBLEMS.find((x) => x.id === id)!;
  const c = STATUS_VAR[p.status];
  return (
    <div className={cn(card, 'border-l-8')} style={{ borderLeftColor: c }}>
      <div className="flex items-start gap-3">
        <span className="px-2 py-0.5 text-white text-lg font-bold font-mono shrink-0" style={{ background: c }}>{p.id}</span>
        <div>
          <H>Проблема территории · {p.source}</H>
          <h2 className="text-xl font-bold leading-tight">{p.title}</h2>
        </div>
        <span className="ml-auto px-3 py-1 font-bold text-white whitespace-nowrap" style={{ background: c }}>{STATUS_LABEL[p.status].icon} {STATUS_LABEL[p.status].label}</span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <div><H>Факт</H><P className="font-bold">{p.fact}</P></div>
        <div className="p-3 border-l-4" style={{ borderColor: c }}><H>Что даёт модель</H><P>{p.answer}</P></div>
      </div>
      {p.japan && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          <div><H>Как решала Япония</H><P>{p.japan}</P><OutOfText>Вне текста глав · источник проверен (GEC 2005; Van Berkel et al. 2009; Hashimoto et al. 2010)</OutOfText></div>
          <div><H>Чем отличается Невинномысск</H><P>{p.differs}</P></div>
        </div>
      )}
      <Links theses={p.theses} genesis={p.genesis ? [p.genesis] : []} go={go} muted={muted} />
    </div>
  );
}

function Links({ theses = [], problems = [], genesis = [], go, muted }: { theses?: string[]; problems?: string[]; genesis?: string[]; go: (p: Page) => void; muted: string }) {
  if (!theses.length && !problems.length && !genesis.length) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className={cn('text-[length:calc(12px*var(--ui,1))] font-mono uppercase tracking-widest mr-1', muted)}>Связано:</span>
      {genesis.map((g) => <button key={g} onClick={() => go({ kind: 'gen', id: g })} className="px-2 py-1 font-mono font-bold border-2" style={{ borderColor: 'var(--c-gen)', color: 'var(--c-gen)' }}>{g}</button>)}
      {theses.filter((t) => NOVELTY[t]).map((t) => (
        <button key={t} onClick={() => (t.startsWith('N') ? go({ kind: 'thesis', id: t }) : undefined)} title={NOVELTY[t].title}
          className="px-2 py-1 font-mono font-bold border-2" style={{ borderColor: NOVELTY[t].level === 'N' ? 'var(--c-nov)' : 'var(--c-nov-a)', color: NOVELTY[t].level === 'N' ? 'var(--c-nov)' : 'var(--c-nov-a)' }}>
          {NOVELTY[t].tag}
        </button>
      ))}
      {problems.map((p) => {
        const pr = PROBLEMS.find((x) => x.id === p)!;
        return <button key={p} onClick={() => go({ kind: 'prob', id: p })} className="px-2 py-1 font-mono font-bold border-2" style={{ borderColor: STATUS_VAR[pr.status], color: STATUS_VAR[pr.status] }}>{p} {STATUS_LABEL[pr.status].icon}</button>;
      })}
    </div>
  );
}

// ─── Страница тезиса ───
function IntervalView({ v, d, unit = '', label }: { v: Interval; d: number; unit?: string; label: string }) {
  return (
    <div>
      <div className="text-[length:calc(12px*var(--ui,1))] opacity-80">{label}</div>
      <div className="text-3xl font-bold font-mono leading-tight" style={{ color: 'var(--c-nov)' }}>{ru(v.mid, d)}{unit && <span className="text-base font-bold">{unit}</span>}</div>
      <div className="text-[length:calc(13px*var(--ui,1))] font-mono">интервал 5–95 %: [{ru(v.lo, d)}; {ru(v.hi, d)}]{unit}</div>
      {v.n > 0 && <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60">{v.n} испытаний в браузере · расчёт модели; в тексте — точечное значение</div>}
    </div>
  );
}

function Tornado({ rows, base, d, isDarkMode }: { rows: TornadoRow[]; base: number; d: number; isDarkMode: boolean }) {
  const vals = rows.flatMap((r) => [r.low, r.high, base]).filter(Number.isFinite);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.max(hi - lo, Math.abs(base) * 0.02 || 1e-6);
  const x = (v: number) => ((v - (lo - span * 0.08)) / (span * 1.16)) * 100;
  const sorted = [...rows].sort((a, b) => Math.abs(b.high - b.low) - Math.abs(a.high - a.low));
  return (
    <div className="space-y-2">
      {sorted.map((r) => {
        const a = Math.min(r.low, r.high), b = Math.max(r.low, r.high);
        const flat = Math.abs(b - a) < Math.abs(base) * 1e-3 + 1e-9;
        return (
          <div key={r.factor} className="grid grid-cols-[minmax(120px,38%)_1fr] items-center gap-3 text-[length:calc(12px*var(--ui,1))]">
            <div className="leading-tight">{r.factor}</div>
            <div className="relative h-7">
              <div className="absolute top-0 bottom-0 w-px" style={{ left: `${x(base)}%`, background: isDarkMode ? '#E4E3E0' : '#141414' }} />
              {flat ? (
                <div className="absolute top-1.5 text-[length:calc(11px*var(--ui,1))] font-mono opacity-70" style={{ left: `calc(${x(base)}% + 6px)` }}>не влияет ({r.lowLabel} / {r.highLabel})</div>
              ) : (
                <>
                  <div className="absolute top-1.5 h-4" style={{ left: `${x(a)}%`, width: `${Math.max(0.6, x(b) - x(a))}%`, background: 'var(--c-nov-a)' }} />
                  <div className="absolute top-1.5 text-[length:calc(10px*var(--ui,1))] font-mono whitespace-nowrap" style={{ right: `calc(${100 - x(a)}% + 4px)` }}>{ru(r.low < r.high ? r.low : r.high, d)} ({r.low < r.high ? r.lowLabel : r.highLabel})</div>
                  <div className="absolute top-1.5 text-[length:calc(10px*var(--ui,1))] font-mono whitespace-nowrap" style={{ left: `calc(${x(b)}% + 4px)` }}>{ru(r.low < r.high ? r.high : r.low, d)} ({r.low < r.high ? r.highLabel : r.lowLabel})</div>
                </>
              )}
            </div>
          </div>
        );
      })}
      <div className="text-[length:calc(11px*var(--ui,1))] font-mono opacity-60">Вертикальная линия — значение при базовых параметрах ({ru(base, d)}).</div>
    </div>
  );
}

const Legend = ({ items }: { items: [string, string][] }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[length:calc(12px*var(--ui,1))]">
    {items.map(([c, t]) => <span key={t} className="flex items-center gap-1.5"><span className="w-4 h-[3px]" style={{ background: c }} />{t}</span>)}
  </div>
);

const Slider = ({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt: (v: number) => string }) => (
  <label className="block space-y-1">
    <div className="flex justify-between gap-2 text-[length:calc(12px*var(--ui,1))] font-bold"><span>{label}</span><span className="font-mono">{fmt(value)}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
  </label>
);

function ThesisPage({ id, card, muted, isDarkMode, go, onOpenLab }: Ctx & { id: string; key?: React.Key }) {
  const nv = NOVELTY[id];
  const ex = THESIS_EXTRA[id];
  const axis = { fontSize: 11 };
  const grid = isDarkMode ? '#E4E3E033' : '#14141422';
  const block = (n: number, title: string, body: React.ReactNode, accent = false) => (
    <div className={cn(card, accent && 'border-2')} style={accent ? { borderColor: 'var(--c-nov)' } : undefined}>
      <H color={accent ? 'var(--c-nov)' : undefined}>{n}. {title}</H>
      {body}
    </div>
  );

  // Эксперимент и результат — свои для каждого тезиса
  let experiment: React.ReactNode = null, result: React.ReactNode = null, sens: React.ReactNode = null;
  const ctx27 = useMemo(() => baseCtx(2027), []);

  // Н1
  const [sigma, setSigma] = useState(0);
  const [lamBar, setLamBar] = useState(0.5);
  const [mech1, setMech1] = useState<MechId>('divC');
  const r1 = useMemo(() => (id === 'N1' ? n1({ ...ctx27, lambdaBar: lamBar }, mech1, sigma) : null), [id, ctx27, lamBar, mech1, sigma]);
  const g1 = useMemo(() => {
    if (id !== 'N1') return [];
    const th = { mech: mech1, behavior: 'myopic' as BehaviorId, sigma, ctx: { ...ctx27, lambdaBar: lamBar } };
    const rows = [];
    for (let c = 0; c <= 0.4001; c += 0.005) rows.push({ c: Number(c.toFixed(3)), g: gammaMap(POP, c, th).C, d: c });
    return rows;
  }, [id, ctx27, lamBar, mech1, sigma]);
  if (id === 'N1' && r1) {
    experiment = (
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1">{(['coord', 'divC', 'sigma'] as MechId[]).map((m) => (
            <button key={m} onClick={() => setMech1(m)} className={cn('px-2 py-1 text-[length:calc(12px*var(--ui,1))] font-bold border', mech1 === m ? (isDarkMode ? 'bg-[#E4E3E0] text-[#141414]' : 'bg-[#141414] text-white') : 'opacity-70')}>
              {MECHS.find((x) => x.id === m)!.label}</button>))}</div>
          <Slider label="σ — компенсация затрат подключения" value={sigma} min={0} max={1} step={0.01} onChange={setSigma} fmt={(v) => `${ru(v * 100)} %`} />
          <Slider label="λ̄ — предел продаж якорю" value={lamBar} min={0.3} max={1} step={0.05} onChange={setLamBar} fmt={(v) => ru(v, 2)} />
          <div className={cn('text-[length:calc(12px*var(--ui,1))]', muted)}>2027 г., k = {ru(ctx27.k, 2)}; популяция 52 резидента (класс C).</div>
        </div>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={g1} margin={{ top: 16, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="c" type="number" domain={[0, 0.4]} ticks={[0, 0.1, 0.2, 0.3, 0.4]} tick={axis} tickFormatter={(v) => ru(v, 1)} />
            <YAxis domain={[0, 0.4]} ticks={[0, 0.1, 0.2, 0.3, 0.4]} tick={axis} tickFormatter={(v) => ru(v, 1)} />
            <Tooltip formatter={(v: any) => ru(Number(v), 3)} labelFormatter={(l: any) => `C = ${ru(Number(l), 3)}`} />
            <Line dataKey="d" name="C" stroke="#94a3b8" strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            <Line dataKey="g" name="Γ(C)" stroke="var(--c-nov)" strokeWidth={2} dot={false} type="stepAfter" isAnimationActive={false} />
            <ReferenceLine x={r1.ev.C} stroke="var(--c-nov)" label={{ value: 'C**', position: 'top', fontSize: 11, fill: 'var(--c-nov)' }} />
            <ReferenceLine x={r1.ev.cs} stroke="var(--c-bad)" strokeDasharray="3 3" label={{ value: 'C*', position: 'top', fontSize: 11, fill: 'var(--c-bad)' }} />
          </LineChart>
        </ResponsiveContainer></div>
      </div>
    );
    result = (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <IntervalView v={r1.C} d={3} label="Равновесная связность C**" />
        <IntervalView v={r1.gap} d={3} label="Разрыв Δ_C = C* − C**" />
        <div><div className="text-[length:calc(12px*var(--ui,1))] opacity-80">Участников в равновесии</div><div className="text-3xl font-bold font-mono">{r1.ev.part.length}</div>
          <div className="text-[length:calc(13px*var(--ui,1))] font-mono">C* = {ru(r1.ev.cs, 3)}</div></div>
      </div>
    );
    sens = <Tornado rows={r1.tornado} base={r1.base} d={3} isDarkMode={isDarkMode} />;
  }

  // Н2 (тяжёлый расчёт — асинхронно)
  const [r2, setR2] = useState<ReturnType<typeof n2> | null>(null);
  useEffect(() => { if (id !== 'N2') return; setR2(null); const t = setTimeout(() => setR2(n2(ctx27)), 30); return () => clearTimeout(t); }, [id, ctx27]);
  if (id === 'N2') {
    const rows = r2 ? r2.base.cur.rows.map((r) => ({ c: Number(r.c.toFixed(3)), pi: r.pi, z: r.zmin, net: r.net })) : [];
    experiment = r2 ? (
      <div className="h-64"><ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="c" type="number" domain={['dataMin', 'dataMax']} tick={axis} tickFormatter={(v) => ru(v, 3)} />
          <YAxis yAxisId="l" tick={axis} domain={['auto', 'auto']} />
          <YAxis yAxisId="r" orientation="right" tick={axis} />
          <Tooltip formatter={(v: any) => (v === null ? '—' : ru(Number(v), 2))} labelFormatter={(l: any) => `C̃ = ${ru(Number(l), 3)}`} />
          <Line yAxisId="l" dataKey="pi" name="Π(C̃)" stroke="var(--c-part)" dot={false} isAnimationActive={false} />
          <Line yAxisId="l" dataKey="net" name="Π − Z_min" stroke="var(--c-nov)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line yAxisId="r" dataKey="z" name="Z_min (правая ось)" stroke="var(--c-bud)" type="stepAfter" dot={false} isAnimationActive={false} />
          <ReferenceLine yAxisId="l" x={r2.base.hat} stroke="var(--c-nov)" strokeDasharray="3 3" label={{ value: 'Ĉ', position: 'top', fontSize: 12, fill: 'var(--c-nov)' }} />
        </LineChart>
      </ResponsiveContainer></div>
    ) : <div className={muted}>Считаю цену закрытия разрыва…</div>;
    if (r2) experiment = (<div>{experiment}<Legend items={[['var(--c-part)', 'Π(C̃) — чистый результат сети'], ['var(--c-nov)', 'Π − Z_min'], ['var(--c-bud)', 'Z_min, правая ось, млн руб./год']]} /></div>);
    result = r2 ? (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <IntervalView v={r2.hat} d={3} label="Целевая связность Ĉ" />
        <IntervalView v={r2.zFull} d={2} unit=" млн руб./год" label="Z_min(C*) — цена полного закрытия" />
        <div><div className="text-[length:calc(12px*var(--ui,1))] opacity-80">Оптимум и старт</div><div className="text-[length:calc(14px*var(--ui,1))] font-mono">C* = {ru(r2.base.cs, 3)}<br />C**(θ₀) = {ru(r2.base.c0, 3)}</div></div>
      </div>
    ) : null;
    sens = r2 ? <Tornado rows={r2.tornado} base={r2.base.hat} d={3} isDarkMode={isDarkMode} /> : null;
  }

  // Н3
  const [piA, setPiA] = useState(0.05);
  const [mj, setMj] = useState(0.25);
  const [fcj, setFcj] = useState(0.15);
  const r3 = useMemo(() => (id === 'N3' ? n3(piA) : null), [id, piA]);
  if (id === 'N3' && r3) {
    const lam = Math.max(0, 1 - fcj / mj);
    const data = [...r3.sellers.map((s) => ({ name: `№${s.id} (${s.type})`, v: s.lamStar })), { name: 'Ваш пример', v: lam }];
    experiment = (
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <div className="space-y-4">
          <Slider label="π_A — вероятность остановки якоря" value={piA} min={0.028} max={0.094} step={0.002} onChange={setPiA} fmt={(v) => ru(v, 3)} />
          <Slider label="m_j — доля маржинального дохода" value={mj} min={0.1} max={0.6} step={0.01} onChange={setMj} fmt={(v) => ru(v, 2)} />
          <Slider label="FC_j / R_j — постоянные затраты" value={fcj} min={0.02} max={0.3} step={0.01} onChange={setFcj} fmt={(v) => ru(v, 2)} />
          <div className="text-[length:calc(14px*var(--ui,1))]">λ*_j = <b className="font-mono">{ru(lam, 2)}</b> — норма 0,5 для этого резидента <b>{lam < 0.5 ? 'мягка' : 'жёстка'}</b>.</div>
        </div>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
            <YAxis domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tick={axis} tickFormatter={(v) => ru(v, 2)} />
            <Tooltip formatter={(v: any) => ru(Number(v), 2)} />
            <ReferenceLine y={0.5} stroke="var(--c-bad)" strokeDasharray="4 3" label={{ value: 'норма 0,5', position: 'insideTopRight', fontSize: 11, fill: 'var(--c-bad)' }} />
            <Bar dataKey="v" isAnimationActive={false}>
              {data.map((d, i) => <Cell key={i} fill={i === data.length - 1 ? 'var(--c-nov)' : 'var(--c-part)'} />)}
              <LabelList dataKey="v" position="top" formatter={(v: any) => ru(Number(v), 2)} style={{ fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer></div>
      </div>
    );
    result = (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <IntervalView v={r3.share} d={1} unit=" млн руб." label="Доля «Азота» по Шепли с поправкой (3.25)" />
        <div><div className="text-[length:calc(12px*var(--ui,1))] opacity-80">Без поправки на риск</div><div className="text-3xl font-bold font-mono">{ru(r3.noRisk, 1)}</div><div className="text-[length:calc(13px*var(--ui,1))] font-mono">интервал — по диапазону π_A 0,028–0,094 (класс B)</div></div>
        <div><div className="text-[length:calc(12px*var(--ui,1))] opacity-80">Поставщики с λ*_j вне 0,45–0,55</div><div className="text-3xl font-bold font-mono">{r3.outside} из {r3.sellers.length}</div></div>
      </div>
    );
    sens = <Tornado rows={r3.tornado} base={r3.base} d={1} isDarkMode={isDarkMode} />;
  }

  // Н4
  const [year4, setYear4] = useState(2027);
  const [c4, setC4] = useState(0.15);
  const r4 = useMemo(() => (id === 'N4' ? n4(year4) : null), [id, year4]);
  if (id === 'N4' && r4) {
    const data = [];
    for (let c = 0; c <= 0.3001; c += 0.005) data.push({ c: Number(c.toFixed(3)), dE: r4.m.flowsNetSum * (1 - Math.exp(-r4.m.k * c)) - r4.m.flows.platformCost });
    const cur = r4.m.flowsNetSum * (1 - Math.exp(-r4.m.k * c4)) - r4.m.flows.platformCost;
    experiment = (
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <div className="space-y-4">
          <Slider label="Год прогноза" value={year4} min={2026} max={2036} step={1} onChange={setYear4} fmt={(v) => String(v)} />
          <Slider label="Связность C_инд" value={c4} min={0} max={0.3} step={0.005} onChange={setC4} fmt={(v) => ru(v, 3)} />
          <div className="text-[length:calc(14px*var(--ui,1))]">k = {ru(r4.m.k, 2)}; ΔE(t) при C = {ru(c4, 3)}: <b className="font-mono" style={{ color: cur >= 0 ? 'var(--c-ok)' : 'var(--c-bad)' }}>{ru(cur, 1)} млн руб.</b></div>
          <div className={cn('text-[length:calc(12px*var(--ui,1))]', muted)}>Сценарные пороги главы 2 — 0,05 и 0,15; экономическая граница — C_min.</div>
        </div>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="c" type="number" domain={[0, 0.3]} ticks={[0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3]} tick={axis} tickFormatter={(v) => ru(v, 2)} />
            <YAxis tick={axis} />
            <Tooltip formatter={(v: any) => ru(Number(v), 1)} labelFormatter={(l: any) => `C = ${ru(Number(l), 3)}`} />
            <ReferenceLine y={0} stroke={isDarkMode ? '#E4E3E0' : '#141414'} />
            <ReferenceLine x={0.05} stroke="#94a3b8" strokeDasharray="2 4" />
            <ReferenceLine x={0.15} stroke="#94a3b8" strokeDasharray="2 4" />
            <ReferenceLine x={r4.base} stroke="var(--c-nov)" label={{ value: 'C_min', position: 'top', fontSize: 12, fill: 'var(--c-nov)' }} />
            <ReferenceLine x={c4} stroke="var(--c-part)" strokeDasharray="3 3" />
            <Line dataKey="dE" name="ΔE(t), млн руб." stroke="var(--c-part)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer></div>
      </div>
    );
    result = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <IntervalView v={r4.cMin} d={3} label={`Порог окупаемости C_min, ${year4} г.`} />
        <div><div className="text-[length:calc(12px*var(--ui,1))] opacity-80">Постоянные затраты платформы</div><div className="text-3xl font-bold font-mono">{ru(r4.m.flows.platformCost, 1)}</div><div className="text-[length:calc(13px*var(--ui,1))] font-mono">млн руб./год; Σ вкладов {ru(r4.m.flowsNetSum, 1)}</div></div>
      </div>
    );
    sens = <Tornado rows={r4.tornado} base={r4.base} d={3} isDarkMode={isDarkMode} />;
  }

  // Н5 (асинхронно)
  const [r5, setR5] = useState<ReturnType<typeof n5> | null>(null);
  const [beh, setBeh] = useState<BehaviorId>('myopic');
  useEffect(() => { if (id !== 'N5') return; setR5(null); const t = setTimeout(() => setR5(n5(ctx27)), 30); return () => clearTimeout(t); }, [id, ctx27]);
  if (id === 'N5') {
    const bi = BEHAVIORS.findIndex((b) => b.id === beh);
    const data = r5 ? MECHS.map((m, mi) => ({ name: m.label, v: r5.res.share[bi][mi] * 100, id: m.id })) : [];
    const sigmaIdx = MECHS.findIndex((m) => m.id === 'sigma');
    const divIdx = MECHS.map((m, i) => (m.id.startsWith('div') ? i : -1)).filter((i) => i >= 0);
    const sigmaShares = r5 ? BEHAVIORS.filter((b) => b.id !== 'planner').map((b) => r5.res.share[BEHAVIORS.findIndex((x) => x.id === b.id)][sigmaIdx]) : [];
    const divShares = r5 ? BEHAVIORS.filter((b) => b.id !== 'planner').map((b) => { const i = BEHAVIORS.findIndex((x) => x.id === b.id); return divIdx.reduce((s, j) => s + r5.res.share[i][j], 0); }) : [];
    experiment = (
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
        <div className="space-y-1">
          <div className={cn('text-[length:calc(12px*var(--ui,1))] font-mono uppercase', muted)}>Модель поведения резидентов</div>
          {BEHAVIORS.filter((b) => b.id !== 'planner').map((b) => (
            <button key={b.id} onClick={() => setBeh(b.id)} className={cn('w-full text-left px-2 py-1 text-[length:calc(12px*var(--ui,1))] font-bold border', beh === b.id ? (isDarkMode ? 'bg-[#E4E3E0] text-[#141414]' : 'bg-[#141414] text-white') : 'opacity-70')}>{b.label}</button>
          ))}
        </div>
        <div className="h-72">{r5 ? (<ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={axis} unit=" %" />
            <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: any) => `${ru(Number(v), 0)} %`} />
            <Bar dataKey="v" isAnimationActive={false}>
              {data.map((d, i) => <Cell key={i} fill={d.id === 'sigma' ? 'var(--c-nov)' : 'var(--c-part)'} />)}
              <LabelList dataKey="v" position="right" formatter={(v: any) => `${ru(Number(v), 0)} %`} style={{ fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>) : <div className={muted}>Идут 200 испытаний Монте-Карло…</div>}</div>
      </div>
    );
    result = r5 ? (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <IntervalView v={{ mid: sigmaShares[bi] ?? 0, lo: Math.min(...sigmaShares), hi: Math.max(...sigmaShares), n: r5.res.n }} d={2} label="Доля испытаний, где лучший механизм — σ (по моделям поведения)" />
        <IntervalView v={{ mid: divShares[bi] ?? 0, lo: Math.min(...divShares), hi: Math.max(...divShares), n: r5.res.n }} d={2} label="То же, три схемы дивиденда вместе" />
        <div><div className="text-[length:calc(12px*var(--ui,1))] opacity-80">Компенсация σ = 0,3 против Р2, 2027 г.</div><div className="text-3xl font-bold font-mono">+{r5.addSigma}</div><div className="text-[length:calc(13px*var(--ui,1))] font-mono">резидента при затратах {ru(r5.costSigma, 2)} млн руб./год</div></div>
      </div>
    ) : null;
    sens = <div className={cn('text-[length:calc(14px*var(--ui,1))] leading-relaxed')}>Устойчивость выбора механизма проверяется самим Монте-Карло: в каждом испытании возмущаются выигрыш и затраты резидентов (±25 %), k (±1), вклады потоков и затраты платформы (±20 %); ничьи делятся поровну. В браузере — 200 испытаний; в табл. 3.11а главы 3 — 1000. Монте-Карло § 3.3.4 (5000 × 5 сценариев рисков) относится к другому эксперименту.</div>;
  }

  // Н6
  const [year6, setYear6] = useState(2030);
  const [mech6, setMech6] = useState<MechId>('divC');
  const r6 = useMemo(() => (id === 'N6' ? n6(year6, mech6) : null), [id, year6, mech6]);
  const path6 = useMemo(() => {
    if (id !== 'N6') return [];
    const out = [];
    for (let y = 2027; y <= 2036; y++) {
      const cLiq = 15.5 + (y - 2026) * 0.5;
      const ctx = { ...baseCtx(y), cLiq };
      const row: Record<string, number> = { y };
      (['divA', 'divB', 'divC'] as MechId[]).forEach((m) => { row[m] = evaluate(POP, { mech: m, behavior: 'myopic', sigma: 0, ctx }).pub / cLiq * 100; });
      out.push(row);
    }
    return out;
  }, [id]);
  if (id === 'N6' && r6) {
    const city = r6.city.rows.city;
    experiment = (
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <div className="space-y-4">
          <Slider label="Год" value={year6} min={2027} max={2036} step={1} onChange={setYear6} fmt={(v) => String(v)} />
          <div className="flex flex-wrap gap-1">{(['divA', 'divB', 'divC'] as MechId[]).map((m) => (
            <button key={m} onClick={() => setMech6(m)} className={cn('px-2 py-1 text-[length:calc(12px*var(--ui,1))] font-bold border', mech6 === m ? (isDarkMode ? 'bg-[#E4E3E0] text-[#141414]' : 'bg-[#141414] text-white') : 'opacity-70')}>
              {MECHS.find((x) => x.id === m)!.label.replace('Дивиденд, ', '')}</button>))}</div>
          <div className="text-[length:calc(14px*var(--ui,1))] leading-relaxed">Бюджет города в {year6} г.: <b className="font-mono" style={{ color: city.net < 0 ? 'var(--c-bad)' : 'var(--c-ok)' }}>{ru(city.net, 1)} млн руб.</b> (потеря платы за НВОС {ru(city.transfer, 1)}, дивиденд +{ru(city.div, 1)}). Баланс {r6.city.balanceOk ? 'замыкается' : 'не замыкается'}: Σ = ΔE − ΔНВОС.</div>
        </div>
        <div className="h-72"><ResponsiveContainer width="100%" height="85%">
          <LineChart data={path6} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="y" tick={axis} />
            <YAxis tick={axis} unit=" %" domain={[0, 100]} />
            <Tooltip formatter={(v: any) => `${ru(Number(v), 1)} %`} />
            <ReferenceLine y={100} stroke="var(--c-ok)" strokeDasharray="4 3" label={{ value: 'C_ликв покрыт', position: 'insideTopLeft', fontSize: 11, fill: 'var(--c-ok)' }} />
            <Line dataKey="divA" name="Схема А" stroke="var(--c-bud-2)" strokeDasharray="5 3" dot={false} isAnimationActive={false} />
            <Line dataKey="divB" name="Схема Б" stroke="var(--c-bud-3)" strokeDasharray="2 3" dot={false} isAnimationActive={false} />
            <Line dataKey="divC" name="Схема В" stroke="var(--c-bud)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <Legend items={[['var(--c-bud-2)', 'Схема А'], ['var(--c-bud-3)', 'Схема Б'], ['var(--c-bud)', 'Схема В (симулятор)']]} /></div>
      </div>
    );
    result = (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <IntervalView v={{ ...r6.cover, mid: r6.cover.mid * 100, lo: r6.cover.lo * 100, hi: r6.cover.hi * 100 }} d={1} unit=" %" label={`Покрытие C_ликв дивидендом бюджета (3.21), ${year6} г.`} />
        <div><div className="text-[length:calc(12px*var(--ui,1))] opacity-80">Нужно от внешнего источника</div><div className="text-3xl font-bold font-mono" style={{ color: 'var(--c-bad)' }}>{ru(100 - r6.cover.mid * 100, 0)} %</div><div className="text-[length:calc(13px*var(--ui,1))] font-mono">C_ликв = {ru(r6.cLiq, 1)} млн руб.</div></div>
        <div><div className="text-[length:calc(12px*var(--ui,1))] opacity-80">Дивиденд бюджета γ_пуб·SD(C**)</div><div className="text-3xl font-bold font-mono">{ru(r6.ev.pub, 2)}</div><div className="text-[length:calc(13px*var(--ui,1))] font-mono">млн руб.; C** = {ru(r6.ev.C, 3)}</div></div>
      </div>
    );
    sens = <Tornado rows={r6.tornado.map((t) => ({ ...t, low: t.low * 100, high: t.high * 100 }))} base={r6.base * 100} d={1} isDarkMode={isDarkMode} />;
  }

  const i = THESES.indexOf(id);
  return (
    <div className="space-y-4">
      <div className={cn(card, 'border-l-8')} style={{ borderLeftColor: 'var(--c-nov)' }}>
        <div className="flex items-start gap-3">
          <span className="px-2.5 py-1 text-white text-2xl font-bold font-mono shrink-0" style={{ background: 'var(--c-nov)' }}>{nv.tag}</span>
          <div className="min-w-0">
            <H color="var(--c-nov)">Положение {nv.pos} из 5, выносимое на защиту · {nv.where}</H>
            <h2 className="text-xl font-bold leading-tight">{nv.title}</h2>
          </div>
        </div>
        <P className="mt-4">{nv.claim}</P>
        <Links theses={[]} genesis={ex.genesis} problems={PROBLEMS.filter((p) => p.theses.includes(id)).map((p) => p.id)} go={go} muted={muted} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {block(2, 'Известное и авторский вклад', (
          <div className="space-y-3">
            <div><div className={cn('text-[length:calc(12px*var(--ui,1))] font-bold', muted)}>Что было известно</div><P>{nv.prior}</P></div>
            <div className="pl-3 border-l-4" style={{ borderColor: 'var(--c-nov)' }}><div className="text-[length:calc(12px*var(--ui,1))] font-bold" style={{ color: 'var(--c-nov)' }}>Авторский вклад</div><P>{nv.diff}</P></div>
          </div>
        ))}
        {block(3, 'Механизм', (
          <div className="space-y-2">
            {ex.formulas.map((f) => (
              <div key={f.num + f.tex} className="flex items-baseline gap-3">
                <div className="flex-1 font-mono text-[length:calc(14px*var(--ui,1))] italic">{f.tex}</div>
                <div className="font-mono text-[length:calc(13px*var(--ui,1))] shrink-0">{f.num}</div>
              </div>
            ))}
            <div className={cn('text-[length:calc(12px*var(--ui,1))]', muted)}>{ex.formulas.map((f) => `${f.num} — ${f.where}`).join('; ')}.</div>
          </div>
        ))}
      </div>

      {block(4, 'Эксперимент', experiment)}
      {block(5, 'Результат с интервалом', result, true)}
      {block(6, 'Устойчивость к допущениям', sens)}
      {block(7, 'Условие опровержения', (
        <div className="space-y-3">
          {ex.falsify.map((f) => (
            <div key={f.obs} className="grid grid-cols-1 md:grid-cols-[1fr_minmax(180px,34%)] gap-3 p-3 border-l-4" style={{ borderColor: 'var(--c-bad)' }}>
              <div><div className="text-[length:calc(12px*var(--ui,1))] font-bold" style={{ color: 'var(--c-bad)' }}>Тезис отвергается, если</div><P>{f.obs}</P></div>
              <div className="text-[length:calc(13px*var(--ui,1))]"><div className={cn('font-bold', muted)}>Как измерить</div>{f.measure}<div className={cn('font-mono mt-1', muted)}>{f.src}</div></div>
            </div>
          ))}
          <div className={cn('text-[length:calc(13px*var(--ui,1))]', muted)}><BookMarked size={13} className="inline -mt-0.5 mr-1" />Как проверить на экране: {nv.check}</div>
        </div>
      ), true)}

      <div className="flex flex-wrap justify-between gap-2" data-bg="1">
        <button onClick={() => go({ kind: 'thesis', id: THESES[(i + THESES.length - 1) % THESES.length] })} className="px-3 py-1.5 text-[length:calc(13px*var(--ui,1))] font-bold border-2" style={{ borderColor: 'var(--c-nov)', color: 'var(--c-nov)' }}>← {NOVELTY[THESES[(i + THESES.length - 1) % THESES.length]].tag}</button>
        <button onClick={() => onOpenLab(id)} className={cn('px-3 py-1.5 text-[length:calc(13px*var(--ui,1))] font-bold border', isDarkMode ? 'border-[#E4E3E0]/30' : 'border-[#141414]/30')}><FlaskConical size={14} className="inline -mt-0.5 mr-1" />Все параметры — в Лаборатории</button>
        <button onClick={() => go({ kind: 'thesis', id: THESES[(i + 1) % THESES.length] })} className="px-3 py-1.5 text-[length:calc(13px*var(--ui,1))] font-bold text-white" style={{ background: 'var(--c-nov)' }}>{NOVELTY[THESES[(i + 1) % THESES.length]].tag} →</button>
      </div>
    </div>
  );
}

// ─── Режим «Правительство территории» ───
function GovPage({ card, muted, isDarkMode, onOpenLab }: Ctx) {
  const m = useMemo(() => calcMetrics({ ...BASE_PARAMS, year: 2027 }), []);
  return (
    <div className="space-y-4">
      <div className={card}>
        <H>Режим «Правительство территории»</H>
        <h2 className="text-xl font-bold leading-tight">Обоснование управленческого решения по экоплатформе г. Невинномысска</h2>
        <div className="mt-3 p-3 border-l-4 text-[length:calc(14px*var(--ui,1))] leading-relaxed" style={{ borderColor: 'var(--c-mid)' }}>
          Расчёт выполнен на имитационной модели (автор — {AUTHOR.role} {AUTHOR.name}). Платформа не создана; параметры откалиброваны по открытой отчётности и аналогам; прогноз условный и проверяется по показателям табл. 3.22 после запуска.
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {GOV_DECISIONS.map((d) => (
          <div key={d.q} className={card}>
            <H>{d.q}</H>
            <P>{d.a}</P>
            <div className={cn('mt-2 text-[length:calc(12px*var(--ui,1))] font-mono', muted)}>{d.src}</div>
          </div>
        ))}
      </div>
      <div className={card}>
        <H>Дорожная карта 2027–2036 гг.: переход к этапу — по порогу, а не по календарю (табл. 3.21)</H>
        <div className="overflow-x-auto">
          <table className="w-full text-[length:calc(13px*var(--ui,1))]">
            <thead><tr className={cn('text-left border-b', muted, isDarkMode ? 'border-[#E4E3E0]/20' : 'border-[#141414]/20')}>
              <th className="py-1.5 pr-3 font-normal">Этап</th><th className="py-1.5 pr-3 font-normal">Мероприятия</th><th className="py-1.5 pr-3 font-normal">Порог перехода</th><th className="py-1.5 font-normal">Ответственные</th>
            </tr></thead>
            <tbody>{ROADMAP.map((r) => (
              <tr key={r.stage} className={cn('border-b align-top', isDarkMode ? 'border-[#E4E3E0]/10' : 'border-[#141414]/10')}>
                <td className="py-2 pr-3 font-bold whitespace-nowrap">{r.stage}<div className={cn('font-mono font-normal', muted)}>{r.years}</div></td>
                <td className="py-2 pr-3 leading-snug">{r.actions}</td>
                <td className="py-2 pr-3 leading-snug font-bold">{r.gates}</td>
                <td className="py-2 leading-snug">{r.who}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className={cn('mt-2 text-[length:calc(12px*var(--ui,1))]', muted)}>Порог первого этапа на 2027 г. по модели: C_min = {ru(m.cMin, 3)}.</div>
      </div>
      <div className="flex flex-wrap gap-2" data-bg="1">
        <button onClick={() => onOpenLab('N6')} className={cn('px-3 py-1.5 text-[length:calc(13px*var(--ui,1))] font-bold border', isDarkMode ? 'border-[#E4E3E0]/30' : 'border-[#141414]/30')}>Баланс бюджетов по годам — в Лаборатории</button>
        <button onClick={() => onOpenLab('N5')} className={cn('px-3 py-1.5 text-[length:calc(13px*var(--ui,1))] font-bold border', isDarkMode ? 'border-[#E4E3E0]/30' : 'border-[#141414]/30')}>Сравнение механизмов — в Лаборатории</button>
      </div>
    </div>
  );
}

// ─── Режим «Мост»: генезис → тезис → проблема ───
function Bridge({ card, muted, isDarkMode, go }: Ctx) {
  const [hover, setHover] = useState<string | null>(null);
  const gen = GENESIS, th = THESES, pr = PROBLEMS;
  const W = 900, rowH = 30, top = 40;
  const H_ = top + Math.max(gen.length, pr.length) * rowH + 10;
  const yG = (i: number) => top + i * rowH + 12;
  const yP = (i: number) => top + i * rowH + 12;
  const thGap = (H_ - top - 20) / th.length;
  const yT = (i: number) => top + i * thGap + thGap / 2;
  const xG = 262, xT1 = 372, xT2 = 562, xP = 652;
  const links: { a: string; b: string; x1: number; y1: number; x2: number; y2: number; c: string }[] = [];
  gen.forEach((g, gi) => g.theses.filter((t) => th.includes(t)).forEach((t) => links.push({ a: g.id, b: t, x1: xG, y1: yG(gi), x2: xT1, y2: yT(th.indexOf(t)), c: 'var(--c-gen)' })));
  pr.forEach((p, pi) => p.theses.filter((t) => th.includes(t)).forEach((t) => links.push({ a: t, b: p.id, x1: xT2, y1: yT(th.indexOf(t)), x2: xP, y2: yP(pi), c: STATUS_VAR[p.status] })));
  const on = (l: { a: string; b: string }) => !hover || l.a === hover || l.b === hover;
  const ink = isDarkMode ? '#E4E3E0' : '#141414';
  return (
    <div className={card}>
      <H>Мост: пробел теории → положение на защиту → проблема территории</H>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H_}`} className="w-full min-w-[720px]" role="img" aria-label="Связи генезиса, тезисов и проблем">
          <text x={10} y={22} fontSize={13} fontWeight={700} fill="var(--c-gen)">ГЕНЕЗИС</text>
          <text x={(xT1 + xT2) / 2} y={22} fontSize={13} fontWeight={700} fill="var(--c-nov)" textAnchor="middle">ТЕЗИСЫ</text>
          <text x={W - 10} y={22} fontSize={13} fontWeight={700} fill={ink} textAnchor="end">ПРОБЛЕМЫ</text>
          {links.map((l, i) => (
            <path key={i} d={`M${l.x1},${l.y1} C${(l.x1 + l.x2) / 2},${l.y1} ${(l.x1 + l.x2) / 2},${l.y2} ${l.x2},${l.y2}`}
              fill="none" stroke={l.c} strokeWidth={on(l) ? 2 : 1} opacity={on(l) ? 0.9 : 0.15} />
          ))}
          {gen.map((g, i) => (
            <g key={g.id} onMouseEnter={() => setHover(g.id)} onMouseLeave={() => setHover(null)} onClick={() => go({ kind: 'gen', id: g.id })} style={{ cursor: 'pointer' }}>
              <text x={10} y={yG(i) + 4} fontSize={12} fontWeight={700} fill="var(--c-gen)" fontFamily="monospace">{g.id}</text>
              <text x={38} y={yG(i) + 4} fontSize={12} fill={ink}>{g.title.length > 24 ? g.title.slice(0, 23) + '…' : g.title}</text>
              <circle cx={xG} cy={yG(i)} r={4} fill="var(--c-gen)" />
            </g>
          ))}
          {th.map((t, i) => (
            <g key={t} onMouseEnter={() => setHover(t)} onMouseLeave={() => setHover(null)} onClick={() => go({ kind: 'thesis', id: t })} style={{ cursor: 'pointer' }}>
              <rect x={xT1} y={yT(i) - 15} width={xT2 - xT1} height={30} rx={4} fill="var(--c-nov)" opacity={!hover || hover === t ? 1 : 0.5} />
              <text x={xT1 + 10} y={yT(i) + 5} fontSize={13} fontWeight={700} fill="#fff" fontFamily="monospace">{NOVELTY[t].tag}</text>
              <text x={xT1 + 40} y={yT(i) + 5} fontSize={11} fill="#fff">{(NOVELTY[t].title.length > 20 ? NOVELTY[t].title.slice(0, 19) + '…' : NOVELTY[t].title)}</text>
            </g>
          ))}
          {pr.map((p, i) => (
            <g key={p.id} onMouseEnter={() => setHover(p.id)} onMouseLeave={() => setHover(null)} onClick={() => go({ kind: 'prob', id: p.id })} style={{ cursor: 'pointer' }}>
              <circle cx={xP} cy={yP(i)} r={4} fill={STATUS_VAR[p.status]} />
              <text x={xP + 12} y={yP(i) + 4} fontSize={12} fontWeight={700} fill={STATUS_VAR[p.status]} fontFamily="monospace">{p.id} {STATUS_LABEL[p.status].icon}</text>
              <text x={xP + 52} y={yP(i) + 4} fontSize={12} fill={ink}>{p.title.length > 22 ? p.title.slice(0, 21) + '…' : p.title}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className={cn('mt-2 text-[length:calc(12px*var(--ui,1))]', muted)}>Наведите на ступень, тезис или проблему — останутся только её связи; щелчок открывает страницу. Проблемы П2, П3 и П9 закрываются выводами 4, 7 и 8, которые не вынесены в отдельные положения.</div>
    </div>
  );
}

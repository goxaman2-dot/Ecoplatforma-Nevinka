import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Pin, PinOff, X, Search, Award, ArrowRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GLOSSARY, GROUPS } from './glossary';
import { NOVELTY, NOVELTY_ORDER, NOVELTY_OUTSIDE } from './novelty';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface Props {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  isDarkMode: boolean;
  defense: boolean;
  onGo: (id: string) => void;
}

export const NOV_COLOR = '#7c3aed';

// Правая панель справки. Наведение на элемент с data-term показывает термин,
// щелчок закрепляет его (и открывает панель, если она закрыта).
export default function HelpPanel({ open, onClose, onOpen, isDarkMode, defense, onGo }: Props) {
  // current: id термина глоссария или 'nov:<id>' для элемента новизны
  const [current, setCurrent] = useState<string | null>(null);
  const [ctxNov, setCtxNov] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const find = (e: Event) => (e.target as HTMLElement | null)?.closest?.('[data-term]') as HTMLElement | null;
    const findNov = (e: Event) => (defense ? (e.target as HTMLElement | null)?.closest?.('[data-nov]') as HTMLElement | null : null);
    const over = (e: Event) => {
      if (!open || pinned) return;
      const el = find(e);
      const nov = findNov(e);
      const id = el?.dataset.term;
      if (id && GLOSSARY[id]) { setCurrent(id); setCtxNov(nov?.dataset.nov ?? null); return; }
      if (nov?.dataset.nov && NOVELTY[nov.dataset.nov]) { setCurrent('nov:' + nov.dataset.nov); setCtxNov(null); }
    };
    const click = (e: Event) => {
      const el = find(e);
      const id = el?.dataset.term;
      const interactive = (e.target as HTMLElement).closest('button, input, select, a, label');
      if (!id || !GLOSSARY[id]) {
        // щелчок по рамке или метке блока новизны закрепляет его описание
        const nov = findNov(e);
        if (nov?.dataset.nov && NOVELTY[nov.dataset.nov] && !interactive) {
          setCurrent('nov:' + nov.dataset.nov); setCtxNov(null); setPinned(true);
          if (!open) onOpen();
        }
        return;
      }
      // щелчок по кнопке/ползунку выполняет своё действие; справку закрепляем только по клавише Alt или по значку
      if ((e.target as HTMLElement).closest('button, input, select, a') && !(e as MouseEvent).altKey) { if (open && !pinned) setCurrent(id); return; }
      setCurrent(id); setPinned(true); setCtxNov(findNov(e)?.dataset.nov ?? null);
      if (!open) onOpen();
    };
    document.addEventListener('mouseover', over);
    document.addEventListener('focusin', over);
    document.addEventListener('click', click);
    return () => {
      document.removeEventListener('mouseover', over);
      document.removeEventListener('focusin', over);
      document.removeEventListener('click', click);
    };
  }, [open, pinned, onOpen, defense]);

  // внешний выбор элемента новизны (полоса режима защиты)
  useEffect(() => {
    const h = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (NOVELTY[id]) { setCurrent('nov:' + id); setCtxNov(null); setPinned(true); }
    };
    window.addEventListener('eco-nov', h);
    return () => window.removeEventListener('eco-nov', h);
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(GLOSSARY).filter(([, t]) =>
      !q || [t.sym, t.name, t.what, t.calc ?? ''].join(' ').toLowerCase().includes(q));
  }, [query]);

  const muted = isDarkMode ? 'text-[#c3c2b7]' : 'text-[#52514e]';
  if (!open) return null;
  const novId = current?.startsWith('nov:') ? current.slice(4) : null;
  const nv = novId ? NOVELTY[novId] : null;
  const t = current && !nv ? GLOSSARY[current] : null;
  const ctx = defense && t && ctxNov ? NOVELTY[ctxNov] : null;
  const goNov = (id: string) => { setCurrent('nov:' + id); setCtxNov(null); setPinned(true); onGo(id); };
  const nextNov = novId ? NOVELTY_ORDER[(NOVELTY_ORDER.indexOf(novId) + 1) % NOVELTY_ORDER.length] : null;
  const sub = (label: string, body: string) => (
    <div>
      <div className={cn('text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest mb-1', muted)}>{label}</div>
      <p className="text-[length:calc(14px*var(--ui,1))] leading-relaxed">{body}</p>
    </div>
  );
  const panel = cn('fixed right-0 top-0 h-full w-full sm:w-[360px] z-[60] flex flex-col border-l shadow-2xl transition-colors',
    isDarkMode ? 'bg-[#141414] border-[#E4E3E0]/20 text-[#E4E3E0]' : 'bg-[#FBFBF9] border-[#141414] text-[#141414]');

  return (
    <aside className={panel} aria-label="Справка по обозначениям модели">
      <div className={cn('flex items-center justify-between px-4 py-3 border-b', isDarkMode ? 'border-[#E4E3E0]/15' : 'border-[#141414]/15')}>
        <div className="flex items-center gap-2 text-[length:calc(13px*var(--ui,1))] font-bold uppercase tracking-widest">
          <BookOpen size={15} /> Справка по модели
        </div>
        <div className="flex items-center gap-1">
          {(t || nv) && (
            <button onClick={() => setPinned(!pinned)} className="p-1.5 opacity-70 hover:opacity-100" title={pinned ? 'Открепить: снова показывать по наведению' : 'Закрепить термин'}>
              {pinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
          )}
          <button onClick={onClose} className="p-1.5 opacity-70 hover:opacity-100" title="Закрыть справку"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {nv ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest" style={{ color: NOV_COLOR }}>
              <Award size={14} /> {nv.level === 'N' ? 'Научная новизна · выносится на защиту' : 'Авторская адаптация метода'}{pinned ? ' · закреплено' : ''}
            </div>
            <div className="flex items-start gap-2">
              <span className="px-2 py-0.5 text-white text-lg font-bold font-mono shrink-0" style={{ background: nv.level === 'N' ? NOV_COLOR : '#a78bfa' }}>{nv.tag}</span>
              <div className="text-[length:calc(15px*var(--ui,1))] font-bold leading-snug">{nv.title}</div>
            </div>
            <div className={cn('text-[length:calc(12px*var(--ui,1))] font-mono', muted)}>{nv.where}</div>
            <p className="text-[length:calc(14px*var(--ui,1))] leading-relaxed">{nv.claim}</p>
            {sub('Что было известно', nv.prior)}
            {sub('Авторский вклад', nv.diff)}
            <div className="p-2.5 border-l-4 text-[length:calc(13px*var(--ui,1))] leading-relaxed" style={{ borderColor: NOV_COLOR, background: isDarkMode ? 'rgba(124,58,237,.12)' : 'rgba(124,58,237,.06)' }}>
              <div className={cn('text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest mb-1', muted)}>Как проверить на экране</div>
              {nv.check}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => onGo(novId!)} className="px-2.5 py-1.5 text-[length:calc(12px*var(--ui,1))] font-bold border hover:opacity-80" style={{ borderColor: NOV_COLOR, color: NOV_COLOR }}>Показать блок</button>
              {nextNov && (
                <button onClick={() => goNov(nextNov)} className="px-2.5 py-1.5 text-[length:calc(12px*var(--ui,1))] font-bold text-white flex items-center gap-1 hover:opacity-90" style={{ background: NOV_COLOR }}>
                  Далее: {NOVELTY[nextNov].tag} <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        ) : t ? (
          <div className="space-y-3">
            <div className="text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest opacity-60">{t.group}{pinned ? ' · закреплено' : ''}</div>
            <div className="text-2xl font-bold font-mono leading-tight">{t.sym}</div>
            <div className="text-sm font-bold leading-snug">{t.name}</div>
            {ctx && (
              <button onClick={() => goNov(ctxNov!)} className="w-full text-left px-2 py-1.5 text-[length:calc(12px*var(--ui,1))] border flex items-center gap-2" style={{ borderColor: NOV_COLOR, color: NOV_COLOR }}>
                <Award size={13} className="shrink-0" /> Входит в положение {ctx.tag}: {ctx.title}
              </button>
            )}
            <p className="text-[length:calc(14px*var(--ui,1))] leading-relaxed">{t.what}</p>
            {t.calc && (
              <div className={cn('p-2.5 border text-[length:calc(13px*var(--ui,1))] font-mono leading-relaxed', isDarkMode ? 'border-[#E4E3E0]/20 bg-white/5' : 'border-[#141414]/15 bg-black/[0.03]')}>
                <div className={cn('text-[length:calc(11px*var(--ui,1))] uppercase tracking-widest mb-1', muted)}>Как считается</div>
                {t.calc}
              </div>
            )}
            {t.effect && (
              <div>
                <div className={cn('text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest mb-1', muted)}>Как влияет на результат</div>
                <p className="text-[length:calc(14px*var(--ui,1))] leading-relaxed">{t.effect}</p>
              </div>
            )}
            {t.src && (
              <div>
                <div className={cn('text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest mb-1', muted)}>Источник и класс данных</div>
                <p className={cn('text-[length:calc(13px*var(--ui,1))] leading-relaxed', muted)}>{t.src}</p>
              </div>
            )}
            {t.rel && t.rel.length > 0 && (
              <div>
                <div className={cn('text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest mb-1.5', muted)}>Связано с</div>
                <div className="flex flex-wrap gap-1.5">
                  {t.rel.filter((r) => GLOSSARY[r]).map((r) => (
                    <button key={r} onClick={() => { setCurrent(r); setPinned(true); }}
                      className={cn('px-2 py-1 text-[length:calc(12px*var(--ui,1))] font-mono border hover:border-emerald-500', isDarkMode ? 'border-[#E4E3E0]/25' : 'border-[#141414]/25')}>
                      {GLOSSARY[r].sym}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={cn('text-[length:calc(14px*var(--ui,1))] leading-relaxed', muted)}>
            Наведите курсор на показатель, ползунок или кнопку с пунктирной рамкой — здесь появится, что означает этот член модели,
            как он считается и как влияет на результат. Щелчок по показателю (или Alt + щелчок по кнопке) закрепляет описание.
          </div>
        )}

        {defense && (
          <div className={cn('pt-4 border-t space-y-2', isDarkMode ? 'border-[#E4E3E0]/15' : 'border-[#141414]/15')}>
            <div className="text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest" style={{ color: NOV_COLOR }}>Научная новизна по главе 3</div>
            <div className="space-y-1">
              {NOVELTY_ORDER.map((id) => {
                const x = NOVELTY[id];
                return (
                  <button key={id} onClick={() => goNov(id)}
                    className={cn('w-full text-left flex items-start gap-2 px-2 py-1 border text-[length:calc(12px*var(--ui,1))] leading-snug',
                      novId === id ? '' : isDarkMode ? 'border-[#E4E3E0]/15' : 'border-[#141414]/15')}
                    style={novId === id ? { borderColor: NOV_COLOR } : undefined}>
                    <span className="px-1 font-mono font-bold text-white shrink-0" style={{ background: x.level === 'N' ? NOV_COLOR : '#a78bfa' }}>{x.tag}</span>
                    <span>{x.title}</span>
                  </button>
                );
              })}
            </div>
            <div className={cn('text-[length:calc(12px*var(--ui,1))] leading-relaxed', muted)}>
              <div className="font-mono uppercase tracking-widest text-[length:calc(11px*var(--ui,1))] mt-2 mb-1">В симуляторе не отображены</div>
              {NOVELTY_OUTSIDE.map((x) => <div key={x}>— {x}</div>)}
            </div>
          </div>
        )}

        <div className={cn('pt-4 border-t space-y-2', isDarkMode ? 'border-[#E4E3E0]/15' : 'border-[#141414]/15')}>
          <label className={cn('flex items-center gap-2 px-2 py-1.5 border', isDarkMode ? 'border-[#E4E3E0]/25' : 'border-[#141414]/25')}>
            <Search size={13} className="opacity-60" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск обозначения или термина"
              className="flex-1 bg-transparent outline-none text-[length:calc(13px*var(--ui,1))]" />
          </label>
          {GROUPS.map((g) => {
            const items = list.filter(([, x]) => x.group === g);
            if (!items.length) return null;
            return (
              <div key={g}>
                <div className={cn('text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest mt-2 mb-1', muted)}>{g}</div>
                <div className="flex flex-wrap gap-1">
                  {items.map(([id, x]) => (
                    <button key={id} onClick={() => { setCurrent(id); setPinned(true); }} title={x.name}
                      className={cn('px-1.5 py-0.5 text-[length:calc(12px*var(--ui,1))] font-mono border',
                        current === id ? 'border-emerald-500 text-emerald-600' : isDarkMode ? 'border-[#E4E3E0]/20' : 'border-[#141414]/20')}>
                      {x.sym}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

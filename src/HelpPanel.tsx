import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Pin, PinOff, X, Search } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GLOSSARY, GROUPS } from './glossary';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface Props {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  isDarkMode: boolean;
}

// Правая панель справки. Наведение на элемент с data-term показывает термин,
// щелчок закрепляет его (и открывает панель, если она закрыта).
export default function HelpPanel({ open, onClose, onOpen, isDarkMode }: Props) {
  const [current, setCurrent] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const find = (e: Event) => (e.target as HTMLElement | null)?.closest?.('[data-term]') as HTMLElement | null;
    const over = (e: Event) => {
      if (!open || pinned) return;
      const el = find(e);
      const id = el?.dataset.term;
      if (id && GLOSSARY[id]) setCurrent(id);
    };
    const click = (e: Event) => {
      const el = find(e);
      const id = el?.dataset.term;
      if (!id || !GLOSSARY[id]) return;
      // щелчок по кнопке/ползунку выполняет своё действие; справку закрепляем только по клавише Alt или по значку
      const interactive = (e.target as HTMLElement).closest('button, input, select, a');
      if (interactive && !(e as MouseEvent).altKey) { if (open && !pinned) setCurrent(id); return; }
      setCurrent(id); setPinned(true);
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
  }, [open, pinned, onOpen]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(GLOSSARY).filter(([, t]) =>
      !q || [t.sym, t.name, t.what, t.calc ?? ''].join(' ').toLowerCase().includes(q));
  }, [query]);

  if (!open) return null;
  const t = current ? GLOSSARY[current] : null;
  const panel = cn('fixed right-0 top-0 h-full w-full sm:w-[360px] z-[60] flex flex-col border-l shadow-2xl transition-colors',
    isDarkMode ? 'bg-[#141414] border-[#E4E3E0]/20 text-[#E4E3E0]' : 'bg-[#FBFBF9] border-[#141414] text-[#141414]');
  const muted = isDarkMode ? 'text-[#c3c2b7]' : 'text-[#52514e]';

  return (
    <aside className={panel} aria-label="Справка по обозначениям модели">
      <div className={cn('flex items-center justify-between px-4 py-3 border-b', isDarkMode ? 'border-[#E4E3E0]/15' : 'border-[#141414]/15')}>
        <div className="flex items-center gap-2 text-[length:calc(13px*var(--ui,1))] font-bold uppercase tracking-widest">
          <BookOpen size={15} /> Справка по модели
        </div>
        <div className="flex items-center gap-1">
          {t && (
            <button onClick={() => setPinned(!pinned)} className="p-1.5 opacity-70 hover:opacity-100" title={pinned ? 'Открепить: снова показывать по наведению' : 'Закрепить термин'}>
              {pinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>
          )}
          <button onClick={onClose} className="p-1.5 opacity-70 hover:opacity-100" title="Закрыть справку"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {t ? (
          <div className="space-y-3">
            <div className="text-[length:calc(11px*var(--ui,1))] font-mono uppercase tracking-widest opacity-60">{t.group}{pinned ? ' · закреплено' : ''}</div>
            <div className="text-2xl font-bold font-mono leading-tight">{t.sym}</div>
            <div className="text-sm font-bold leading-snug">{t.name}</div>
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

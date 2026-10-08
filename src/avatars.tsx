import React from 'react';

// Иллюстрированные аватарки объектов экоплатформы (оригинальные SVG, без сторонних изображений).
// Каждая сцена 64×64: небо, земля и узнаваемый силуэт объекта.

type P = { className?: string };

const Sky = ({ id, top, bottom }: { id: string; top: string; bottom: string }) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={top} />
        <stop offset="1" stopColor={bottom} />
      </linearGradient>
    </defs>
    <rect width="64" height="64" fill={`url(#${id})`} />
  </>
);

const Ground = ({ color = '#6b8f5e' }: { color?: string }) => (
  <>
    <rect y="52" width="64" height="12" fill={color} />
    <rect y="52" width="64" height="1.2" fill="#000" opacity="0.15" />
  </>
);

// ГРЭС: две градирни с паром, полосатая дымовая труба, машинный зал
export const AvatarGRES = ({ className }: P) => (
  <svg viewBox="0 0 64 64" className={className} role="img" aria-label="ГРЭС">
    <Sky id="sky-gres" top="#9cc3e6" bottom="#e3eef7" />
    <defs>
      <linearGradient id="tower-gres" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8d949b" />
        <stop offset="0.45" stopColor="#d5d9dd" />
        <stop offset="1" stopColor="#7c838a" />
      </linearGradient>
    </defs>
    <g fill="#fff" opacity="0.9">
      <circle cx="17" cy="15" r="5" /><circle cx="22" cy="12" r="6" /><circle cx="28" cy="15" r="4.5" />
      <circle cx="37" cy="19" r="4" /><circle cx="42" cy="16" r="5" /><circle cx="47" cy="19" r="3.5" />
    </g>
    <path d="M14 52 Q17 36 15 22 L29 22 Q27 36 30 52 Z" fill="url(#tower-gres)" />
    <ellipse cx="22" cy="22" rx="7" ry="1.4" fill="#5d646b" />
    <path d="M34 52 Q37 39 35.5 27 L48.5 27 Q47 39 50 52 Z" fill="url(#tower-gres)" />
    <ellipse cx="42" cy="27" rx="6.5" ry="1.3" fill="#5d646b" />
    <rect x="54" y="8" width="4" height="44" fill="#eee" />
    {[10, 18, 26, 34, 42].map((y) => <rect key={y} x="54" y={y} width="4" height="4" fill="#c8102e" />)}
    <path d="M55 7 q3 -4 7 -3" stroke="#bbb" strokeWidth="2" fill="none" opacity="0.7" />
    <rect x="2" y="40" width="12" height="12" fill="#a24b33" />
    <rect x="2" y="38" width="12" height="2.5" fill="#7d3524" />
    {[4, 7.5, 11].map((x) => <rect key={x} x={x} y="43" width="2" height="5" fill="#f2d48a" opacity="0.9" />)}
    <Ground />
  </svg>
);

// Азот: ректификационные колонны, шаровые резервуары аммиака, эстакада трубопроводов, факел
export const AvatarAzot = ({ className }: P) => (
  <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Азот">
    <Sky id="sky-azot" top="#a8c8e8" bottom="#edf3f8" />
    <defs>
      <radialGradient id="sphere-azot" cx="0.35" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.6" stopColor="#c9d1d8" />
        <stop offset="1" stopColor="#8a949d" />
      </radialGradient>
      <linearGradient id="col-azot" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#7d8790" />
        <stop offset="0.5" stopColor="#dfe4e8" />
        <stop offset="1" stopColor="#6f7981" />
      </linearGradient>
    </defs>
    <rect x="57" y="10" width="2" height="42" fill="#666" />
    <path d="M58 10 q-2.5 -4 0 -7 q1.2 2.5 2.5 1 q0.8 3.5 -2.5 6 Z" fill="#ff8a1f" />
    <path d="M58 9 q-1 -2 0 -3.5 q0.8 1.2 1.2 0.6 q0.2 1.8 -1.2 2.9 Z" fill="#ffe066" />
    <rect x="8" y="12" width="6" height="40" rx="2" fill="url(#col-azot)" />
    <rect x="17" y="20" width="5" height="32" rx="2" fill="url(#col-azot)" />
    {[18, 26, 34, 42].map((y) => <rect key={y} x="7" y={y} width="8" height="1" fill="#555" />)}
    {[26, 34, 42].map((y) => <rect key={y} x="16" y={y} width="7" height="1" fill="#555" />)}
    <rect x="9.5" y="9" width="3" height="3" fill="#c8102e" />
    <circle cx="33" cy="42" r="8" fill="url(#sphere-azot)" />
    <circle cx="48" cy="44" r="6.5" fill="url(#sphere-azot)" />
    <path d="M27 52 l2 -5 M39 52 l-2 -5 M43.5 52 l1.5 -4 M52.5 52 l-1.5 -4" stroke="#666" strokeWidth="1.2" />
    <rect x="14" y="30" width="44" height="1.6" fill="#3c6e91" />
    <rect x="14" y="33" width="44" height="1.2" fill="#d4a017" />
    <Ground color="#7c8f62" />
  </svg>
);

// ЭПП: цех переработки с пилообразной кровлей, конвейер с тюками вторсырья, знак рециклинга
export const AvatarEPP = ({ className }: P) => (
  <svg viewBox="0 0 64 64" className={className} role="img" aria-label="ЭПП">
    <Sky id="sky-epp" top="#b4d3ea" bottom="#f0f6fa" />
    <path d="M4 52 V30 l8 -8 v8 l8 -8 v8 l8 -8 v8 l8 -8 V52 Z" fill="#4f7f8f" />
    <path d="M12 22 v8 M20 22 v8 M28 22 v8" stroke="#bfe3ee" strokeWidth="1.5" />
    <rect x="9" y="38" width="9" height="14" fill="#2f4f5a" />
    {[9, 11.5, 14, 16.5].map((x) => <rect key={x} x={x} y="38" width="0.6" height="14" fill="#5e8592" />)}
    <rect x="22" y="36" width="10" height="5" fill="#e8f4f8" opacity="0.8" />
    <path d="M36 46 L58 38" stroke="#444" strokeWidth="2.2" />
    <path d="M38 52 L38 46 M55 52 L55 39.5" stroke="#555" strokeWidth="1.3" />
    <rect x="40" y="40.5" width="5" height="4" fill="#3a9d4a" transform="rotate(-20 42.5 42.5)" />
    <rect x="48" y="37.5" width="5" height="4" fill="#2f7fbf" transform="rotate(-20 50.5 39.5)" />
    <g transform="translate(48 18)">
      <circle r="9" fill="#2e9d55" />
      <path d="M-4 3 L0 -4 L4 3 Z" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M0 -4 l1.6 0.6 M4 3 l-0.3 1.6 M-4 3 l-1.4 -1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </g>
    <Ground color="#7a9a6a" />
  </svg>
);

// Резиденты: промышленный парк — несколько современных корпусов и грузовик
export const AvatarResidents = ({ className }: P) => (
  <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Резиденты">
    <Sky id="sky-res" top="#a9cdea" bottom="#eef5fa" />
    <rect x="4" y="26" width="16" height="26" fill="#d9dee3" />
    <rect x="4" y="24" width="16" height="3" fill="#2e7d6b" />
    {[29, 35, 41].map((y) => [6, 11, 16].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3.5" fill="#6aa3c8" />))}
    <rect x="22" y="34" width="18" height="18" fill="#c4b59a" />
    <rect x="22" y="32" width="18" height="2.5" fill="#8a6f47" />
    <rect x="27" y="42" width="8" height="10" fill="#6b5535" />
    <rect x="42" y="18" width="18" height="34" fill="#9fb7c9" />
    {[21, 26, 31, 36, 41, 46].map((y) => <rect key={y} x="42" y={y} width="18" height="2.6" fill="#cfe2ef" />)}
    <g transform="translate(6 46)">
      <rect width="12" height="6" fill="#f2f2f2" />
      <rect x="12" y="1.5" width="5" height="4.5" fill="#d33" />
      <rect x="13.5" y="2.5" width="2.5" height="1.6" fill="#bfe3ff" />
      <circle cx="3" cy="6.5" r="1.6" fill="#222" /><circle cx="14.5" cy="6.5" r="1.6" fill="#222" />
    </g>
    <Ground color="#6f8f60" />
  </svg>
);

// Оператор: диспетчерский центр — мониторы с графиками, серверная стойка, сеть IoT-узлов
export const AvatarOperator = ({ className }: P) => (
  <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Оператор">
    <rect width="64" height="64" fill="#13212e" />
    <g stroke="#2fd3a0" strokeWidth="0.8" opacity="0.55">
      <line x1="8" y1="10" x2="24" y2="6" /><line x1="24" y1="6" x2="40" y2="11" />
      <line x1="40" y1="11" x2="56" y2="6" /><line x1="24" y1="6" x2="32" y2="16" />
    </g>
    {[[8, 10], [24, 6], [40, 11], [56, 6], [32, 16]].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" fill="#2fd3a0" />
    ))}
    <rect x="5" y="22" width="24" height="16" rx="1.5" fill="#0b1520" stroke="#5c7a94" />
    <polyline points="7,35 11,31 15,33 19,27 23,29 27,24" fill="none" stroke="#2fd3a0" strokeWidth="1.3" />
    <rect x="31" y="22" width="18" height="16" rx="1.5" fill="#0b1520" stroke="#5c7a94" />
    {[34, 38, 42, 46].map((x, i) => <rect key={x} x={x} y={36 - (i + 2) * 2.4} width="2.4" height={(i + 2) * 2.4} fill="#3fa9f5" />)}
    <rect x="51" y="20" width="10" height="32" fill="#2a3b4c" />
    {[23, 28, 33, 38, 43, 48].map((y, i) => (
      <g key={y}>
        <rect x="52.5" y={y} width="7" height="3" fill="#1a2733" />
        <circle cx="58" cy={y + 1.5} r="0.7" fill={i % 2 ? '#ffb000' : '#2fd3a0'} />
      </g>
    ))}
    <rect x="3" y="44" width="46" height="3" fill="#3b4d5e" />
    <circle cx="26" cy="52" r="4" fill="#d9a77e" />
    <path d="M18 64 q8 -10 16 0 Z" fill="#2f6fb0" />
    <rect x="22" y="49" width="8" height="2" rx="1" fill="#222" />
  </svg>
);

// Бюджет: здание администрации с колоннами, флагом и стопкой монет
export const AvatarBudget = ({ className }: P) => (
  <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Бюджет">
    <Sky id="sky-bud" top="#a6c9e9" bottom="#f1f6fb" />
    <rect x="31.5" y="4" width="1" height="12" fill="#555" />
    <rect x="32.5" y="4" width="9" height="2" fill="#fff" />
    <rect x="32.5" y="6" width="9" height="2" fill="#1c57a5" />
    <rect x="32.5" y="8" width="9" height="2" fill="#d52b1e" />
    <path d="M8 26 L32 15 L56 26 Z" fill="#e9e1cf" stroke="#b9ac8d" strokeWidth="0.8" />
    <rect x="8" y="26" width="48" height="3" fill="#d8ccb1" />
    {[11, 19, 27, 35, 43, 51].map((x) => <rect key={x} x={x} y="29" width="3" height="19" fill="#f4efe3" stroke="#c9bd9f" strokeWidth="0.4" />)}
    <rect x="6" y="48" width="52" height="4" fill="#cfc3a6" />
    <g transform="translate(46 40)">
      {[0, 2.5, 5, 7.5].map((y) => (
        <ellipse key={y} cx="6" cy={10 - y} rx="6" ry="1.8" fill="#e8b923" stroke="#a87f0c" strokeWidth="0.5" />
      ))}
    </g>
    <Ground color="#7f9a6c" />
  </svg>
);

// Экоплатформа: зелёный хаб над силуэтом города, связанный с узлами-участниками
export const AvatarPlatform = ({ className }: P) => (
  <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Экоплатформа">
    <defs>
      <radialGradient id="glow-plat" cx="0.5" cy="0.45" r="0.6">
        <stop offset="0" stopColor="#d9fbe8" />
        <stop offset="1" stopColor="#0f5132" />
      </radialGradient>
      <radialGradient id="core-plat" cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#6ee7a8" />
        <stop offset="1" stopColor="#0e8a4f" />
      </radialGradient>
    </defs>
    <rect width="64" height="64" fill="url(#glow-plat)" />
    <path d="M0 52 V44 h5 v-6 h4 v6 h3 v-10 h5 v10 h4 v-4 h4 v4 h22 v-8 h4 v8 h3 v-12 h5 v12 h5 V52 Z" fill="#0b3d27" opacity="0.85" />
    <g stroke="#ffffff" strokeWidth="0.9" opacity="0.8">
      {[[10, 12], [54, 12], [8, 34], [56, 34], [32, 6]].map(([x, y]) => (
        <line key={`${x}-${y}`} x1="32" y1="25" x2={x} y2={y} />
      ))}
    </g>
    {[[10, 12], [54, 12], [8, 34], [56, 34], [32, 6]].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r="2.3" fill="#fff" stroke="#0e8a4f" strokeWidth="0.8" />
    ))}
    <circle cx="32" cy="25" r="11" fill="url(#core-plat)" stroke="#fff" strokeWidth="1.2" />
    <path d="M27 29 C27 21 33 18 38 19 C38 25 34 30 27 29 Z" fill="#fff" />
    <path d="M27 29 L35 21" stroke="#0e8a4f" strokeWidth="1" />
    <rect y="52" width="64" height="12" fill="#2f6b45" />
  </svg>
);

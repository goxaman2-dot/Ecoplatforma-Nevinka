Расчёты § 3.3 (15.10.2026). Модель — файлы bilevel.ts и beneficiaries.ts из репозитория Ecoplatforma-Nevinka (коммит bab1ca2), положить рядом.
metrics.ts — перенос функции calculateMetrics из App.tsx без изменения формул (плюс множители для Монте-Карло).
Запуск: npm i tsx; npx tsx nums.ts (табл. 3.10–3.11); npx tsx traj.ts (рис. 3.5, 3.7, табл. 3.13); npx tsx mc.ts go 5000 (табл. 3.12, рис. 3.6); npx tsx t3.ts, t4.ts (барьер x_min и порог 0,9–1,05).
Генератор случайных чисел детерминированный (lcg, seed 2026) — результаты воспроизводятся.

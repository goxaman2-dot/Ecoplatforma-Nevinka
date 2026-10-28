import json, math
N = json.load(open('/home/claude/sim/nums.json'))
MC = json.load(open('/home/claude/sim/mc.json'))
TR = json.load(open('/home/claude/sim/traj.json'))
OUT = '/home/claude/out/fig/'
F = "font-family='Times New Roman, Times, serif'"

def fmt(x, d=1):
    s = f"{x:.{d}f}".replace('.', ',').replace('-', '−')
    return s

class S:
    def __init__(s, w, h):
        s.w, s.h, s.el = w, h, []
    def add(s, x): s.el.append(x)
    def line(s, x1, y1, x2, y2, c='#000', w=1, dash=None):
        d = f" stroke-dasharray='{dash}'" if dash else ''
        s.add(f"<line x1='{x1:.1f}' y1='{y1:.1f}' x2='{x2:.1f}' y2='{y2:.1f}' stroke='{c}' stroke-width='{w}'{d}/>")
    def text(s, x, y, t, size=12, anchor='start', c='#000', bold=False, italic=False):
        st = (" font-weight='bold'" if bold else '') + (" font-style='italic'" if italic else '')
        s.add(f"<text x='{x:.1f}' y='{y:.1f}' font-size='{size}' text-anchor='{anchor}' fill='{c}' {F}{st}>{t}</text>")
    def rect(s, x, y, w, h, fill='none', stroke='none', sw=1, op=1):
        s.add(f"<rect x='{x:.1f}' y='{y:.1f}' width='{w:.1f}' height='{h:.1f}' fill='{fill}' fill-opacity='{op}' stroke='{stroke}' stroke-width='{sw}'/>")
    def poly(s, pts, c='#000', w=1.6, dash=None):
        d = f" stroke-dasharray='{dash}'" if dash else ''
        s.add("<polyline fill='none' stroke='%s' stroke-width='%s'%s points='%s'/>" % (c, w, d, ' '.join(f"{x:.1f},{y:.1f}" for x, y in pts)))
    def circle(s, x, y, r=3.5, fill='#000', stroke='#fff'):
        s.add(f"<circle cx='{x:.1f}' cy='{y:.1f}' r='{r}' fill='{fill}' stroke='{stroke}' stroke-width='1'/>")
    def callout(s, px, py, tx, ty, lines, anchor='start', size=11, c='#000'):
        # выноска: точка → излом → подпись
        s.line(px, py, tx, ty, '#444', 0.8)
        s.circle(px, py, 2.2, '#444', '#444')
        for i, t in enumerate(lines):
            s.text(tx + (3 if anchor == 'start' else -3), ty + 4 + i * (size + 2), t, size, anchor, c)
    def save(s, name):
        body = '\n'.join(s.el)
        open(OUT + name, 'w', encoding='utf-8').write(
            f"<svg xmlns='http://www.w3.org/2000/svg' width='{s.w}' height='{s.h}' viewBox='0 0 {s.w} {s.h}'>\n<rect width='100%' height='100%' fill='#fff'/>\n{body}\n</svg>")

# ---------- Рисунок 3.4: три состояния ----------
def fig34():
    s = S(680, 430)
    x0, x1, y0, y1 = 70, 650, 360, 40
    cmax, emin, emax = 0.30, -80, 120
    X = lambda c: x0 + (x1 - x0) * c / cmax
    Y = lambda e: y0 - (y0 - y1) * (e - emin) / (emax - emin)
    c27 = N['curves']['2027']; c36 = N['curves']['2036']
    cmin27 = [r for r in N['states'] if r['year'] == 2027][0]['cmin']
    cmin36 = [r for r in N['states'] if r['year'] == 2036][0]['cmin']
    # зоны
    s.rect(X(0), y1, X(0.05) - X(0), y0 - y1, '#d9d9d9', op=0.55)
    s.rect(X(0.05), y1, X(cmin27) - X(0.05), y0 - y1, '#efefef', op=0.9)
    s.text((X(0) + X(0.05)) / 2, y1 + 16, 'I', 13, 'middle', bold=True)
    s.text((X(0.05) + X(cmin27)) / 2, y1 + 16, 'II', 13, 'middle', bold=True)
    s.text((X(cmin27) + X(0.30)) / 2, y1 + 16, 'III', 13, 'middle', bold=True)
    # оси и сетка
    for e in range(-80, 121, 20):
        s.line(x0, Y(e), x1, Y(e), '#e3e3e3', 0.6)
        s.text(x0 - 6, Y(e) + 4, fmt(e, 0), 11, 'end')
    for c in [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30]:
        s.line(X(c), y0, X(c), y0 + 4, '#000', 1)
        s.text(X(c), y0 + 18, fmt(c, 2), 11, 'middle')
    s.line(x0, y0, x1, y0); s.line(x0, y0, x0, y1)
    s.line(x0, Y(0), x1, Y(0), '#000', 0.9)
    s.text((x0 + x1) / 2 - 4, y0 + 38, 'Индекс связности C', 12, 'middle'); s.text((x0 + x1) / 2 + 52, y0 + 42, 'инд', 9)
    s.add(f"<text transform='translate(18,{(y0 + y1) / 2}) rotate(-90)' font-size='12' text-anchor='middle' {F}>ΔE(t), млн руб. в год</text>")
    p27 = [(X(c), Y(e)) for c, e, _ in c27]; p36 = [(X(c), Y(e)) for c, e, _ in c36]
    s.poly(p27, '#000', 1.8); s.poly(p36, '#000', 1.6, '6 3')
    # маркеры
    s.line(X(cmin27), y0, X(cmin27), y1 + 24, '#000', 0.8, '2 2')
    eq = {(r['year'], r['mech']): r for r in N['eq']}
    def at(c, k):
        phi = 1 - math.exp(-k * c); return 187.082 * phi - 69.648
    r = eq[(2027, 'divC')]; s.callout(X(r['C']), Y(at(r['C'], 5.25)), X(0.205), Y(15), ['C** режимов Р1 и Р2 = ' + fmt(r['C'], 3), '13 резидентов, ΔE = ' + fmt(r['dE'], 1)])
    r = eq[(2027, 'sigma')]; s.callout(X(r['C']), Y(at(r['C'], 5.25)), X(0.245), Y(40), ['C** режима Р2σ = ' + fmt(r['C'], 3), '17 резидентов, ΔE = ' + fmt(r['dE'], 1)])
    s.callout(X(cmin27), Y(0), X(0.11), Y(-30), ['C_min(2027) = ' + fmt(cmin27, 3), 'порог окупаемости платформы'])
    s.callout(X(0.008), Y(-69.6), X(0.105), Y(-62), ['Р0: C₀ ≈ 0,008', '(действующая связь пищевого CO₂)'])
    s.callout(X(0.27), Y(at(0.27, 7.5)), X(0.23), Y(100), ['2036 г., k = 7,5'], 'end')
    s.callout(X(0.27), Y(at(0.27, 5.25)), X(0.285), Y(65), ['2027 г.,', 'k = 5,25'])
    s.callout(X(cmin36), Y(0), X(0.057), Y(32), ['C_min(2036) = ' + fmt(cmin36, 3)], 'end')
    # легенда зон
    s.text(x0 + 4, 418, 'I — линейное состояние (C < 0,05; φ = 0); II — переходное (0,05 ≤ C < C_min; ΔE < 0); III — экосистемное (C ≥ C_min)', 11)
    s.save('Рисунок_3.4.svg')

# ---------- Рисунок 3.5: траектории ----------
def fig35():
    s = S(680, 400)
    x0, x1, y0, y1 = 70, 600, 330, 40
    X = lambda t: x0 + (x1 - x0) * (t - 2027) / 9
    Y = lambda e: y0 - (y0 - y1) * e / 90
    for e in range(0, 91, 15):
        s.line(x0, Y(e), x1, Y(e), '#e3e3e3', 0.6); s.text(x0 - 6, Y(e) + 4, fmt(e, 0), 11, 'end')
    for t in range(2027, 2037):
        s.line(X(t), y0, X(t), y0 + 4); s.text(X(t), y0 + 18, str(t), 11, 'middle')
    s.line(x0, y0, x1, y0); s.line(x0, y0, x0, y1)
    s.add(f"<text transform='translate(18,{(y0 + y1) / 2}) rotate(-90)' font-size='12' text-anchor='middle' {F}>ΔE(t), млн руб. в год</text>")
    sty = {'coord': ('#000', None, 1.6), 'divC': ('#555', '6 3', 1.6), 'sigma': ('#000', '2 2', 2.0)}
    for m, (c, d, w) in sty.items():
        pts = [(X(r['t']), Y(r['dE'])) for r in TR if r['mech'] == m]
        s.poly(pts, c, w, d)
        for x, y in pts: s.circle(x, y, 2.2, c, c)
    last = {m: [r for r in TR if r['mech'] == m][-1] for m in sty}
    s.callout(X(2036), Y(last['sigma']['dE']), 612, Y(last['sigma']['dE']) - 18, ['Р2σ:', fmt(last['sigma']['dE'], 1)])
    s.callout(X(2036), Y(last['coord']['dE']), 612, Y(last['coord']['dE']) + 14, ['Р1 = Р2:', fmt(last['coord']['dE'], 1)])
    r27 = [r for r in TR if r['mech'] == 'coord'][0]
    s.callout(X(2027), Y(r27['dE']), X(2028.1), Y(12), ['2027 г.: C = 0,092 ≈ C_min,', 'ΔE = ' + fmt(r27['dE'], 1) + ' — переход через нулевую точку'])
    r30 = [r for r in TR if r['mech'] == 'divC' and r['t'] == 2030][0]
    s.callout(X(2030), Y(r30['dE']), X(2030.6), Y(30), ['Р2: дивиденд добавляет', 'резидентов с 2030 г. (C = ' + fmt(r30['C'], 3) + ')'])
    r28 = [r for r in TR if r['mech'] == 'sigma' and r['t'] == 2028][0]
    s.callout(X(2028), Y(r28['dE']), X(2027.3), Y(78), ['Р2σ: компенсация σ = 0,3', 'ускоряет выход на равновесие'])
    s.text(x0, 385, 'Сплошная — Р1 (координация без дивиденда); штриховая — Р2 (дивиденд, схема В); пунктир — Р2σ', 11)
    s.save('Рисунок_3.5.svg')

# ---------- Рисунок 3.6: Монте-Карло ----------
def fig36():
    s = S(700, 420)
    x0, x1 = 235, 545
    X = lambda e: x0 + (x1 - x0) * (e + 10) / 100
    scen = [('base2027', '2027 г., базовые условия'), ('base2030', '2030 г., базовые условия'), ('down30', '2030 г., простой «Азота» 30 дн.'),
            ('down60', '2030 г., простой «Азота» 60 дн.'), ('switch50', '2030 г., 50 % поставок CO₂ — переключение')]
    yy = 50
    for e in range(-10, 91, 10):
        s.line(X(e), 35, X(e), 360, '#e8e8e8', 0.6); s.text(X(e), 378, fmt(e, 0), 11, 'middle')
    s.line(X(0), 35, X(0), 360, '#000', 1)
    s.text((x0 + x1) / 2, 398, 'Ожидаемый ΔE с учётом π_A, млн руб. в год', 12, 'middle')
    s.text(10, 398, 'Точка — среднее, отрезок — 5–95 %', 11)
    rowh = 62
    for i, (k, lab) in enumerate(scen):
        y = 55 + i * rowh
        s.text(10, y + 10, lab, 11)
        for j, (m, c, nm) in enumerate([('divC', '#000', 'Р2'), ('sigma', '#777', 'Р2σ')]):
            d = MC[k][m]; yv = y + j * 18
            lo, mu, hi = d['dEexp'][1], d['dEexp'][0], d['dEexp'][2]
            s.line(X(lo), yv, X(hi), yv, c, 2.2)
            s.line(X(lo), yv - 4, X(lo), yv + 4, c, 1.2); s.line(X(hi), yv - 4, X(hi), yv + 4, c, 1.2)
            s.circle(X(mu), yv, 3.6, c)
            s.text(560, yv + 4, f"{nm}: P(ΔE>0) = {fmt(d['PdE'], 3)}", 10)
    s.save('Рисунок_3.6.svg')

# ---------- Рисунок 3.7: бенефициары ----------
def fig37():
    data = [('Резиденты ТОСЭР', 135.4), ('Экопромышленный парк', 37.2), ('АО «Невинномысский Азот»', 36.4), ('Федеральный бюджет', 24.5),
            ('Невинномысская ГРЭС', 17.6), ('Оператор платформы', 6.3), ('Корпорация развития края', 4.0), ('Экофонд', 2.6),
            ('Бюджет Ставропольского края', -12.2), ('Бюджет г. Невинномысска', -83.8)]
    s = S(680, 420)
    x0, x1 = 250, 640
    X = lambda v: x0 + (x1 - x0) * (v + 100) / 250
    for v in range(-100, 151, 50):
        s.line(X(v), 25, X(v), 355, '#e8e8e8', 0.6); s.text(X(v), 372, fmt(v, 0), 11, 'middle')
    s.line(X(0), 25, X(0), 355, '#000', 1)
    for i, (lab, v) in enumerate(data):
        y = 32 + i * 32
        s.text(10, y + 14, lab, 11)
        a, b = sorted([X(0), X(v)])
        s.rect(a, y + 3, b - a, 16, '#bdbdbd' if v > 0 else '#555', '#000', 0.6)
        if v > 0: s.text(b + 4, y + 15, fmt(v, 1), 10)
        else: s.text(a - 4, y + 15, fmt(v, 1), 10, 'end')
    s.callout(X(0) - 3, 32 + 9 * 32 + 11, X(25), 32 + 9 * 32 + 11, ['выпадающая плата за НВОС'])
    s.callout(X(-12.2) + 4, 32 + 8 * 32 + 11, X(25), 32 + 8 * 32 + 11, ['доля края в выпадающей плате за НВОС'])
    s.callout(X(70), 32 + 19, X(85), 32 + 64 + 2, ['выигрыш в цене обмена', 'и дивиденд резидентов'])
    s.text((x0 + x1) / 2 - 60, 392, 'NPV 2026–2036 гг., млн руб. (r = 0,10); сумма 168,0 = дисконтированная Σ(ΔE − ΔНВОС)', 11, 'middle')
    s.save('Рисунок_3.7.svg')

fig34(); fig35(); fig36(); fig37()
print('ok')

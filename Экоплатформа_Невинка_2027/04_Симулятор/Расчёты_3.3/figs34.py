import json, math, sys
sys.path.insert(0, '/home/claude/sim')
from figs import S, fmt, OUT
R = json.load(open('/home/claude/sim/s34.json'))
LAB = {'S1': 'S1 инерционный', 'S1c': 'S1c инерционный при цене выбросов', 'S2': 'S2 координируемый', 'S3': 'S3 углеродно-жёсткий',
       'S3a': 'S3a углеродно-жёсткий с очисткой N₂O', 'S4': 'S4 стрессовый'}
STY = {'S1': ('#000', '2 3', 1.6), 'S1c': ('#888', '2 3', 1.6), 'S2': ('#000', None, 2.0), 'S3': ('#777', None, 1.8), 'S3a': ('#000', '7 3', 1.8), 'S4': ('#555', '4 2 1 2', 1.6)}

def fig38():
    s = S(700, 420); x0, x1, y0, y1 = 70, 520, 340, 30
    X = lambda t: x0 + (x1 - x0) * (t - 2027) / 9; Y = lambda v: y0 - (y0 - y1) * v / 0.8
    for v in [0, .1, .2, .3, .4, .5, .6, .7, .8]:
        s.line(x0, Y(v), x1, Y(v), '#e3e3e3', .6); s.text(x0 - 6, Y(v) + 4, fmt(v, 1), 11, 'end')
    for t in range(2027, 2037): s.line(X(t), y0, X(t), y0 + 4); s.text(X(t), y0 + 18, str(t), 11, 'middle')
    s.line(x0, y0, x1, y0); s.line(x0, y0, x0, y1)
    s.add(f"<text transform='translate(20,{(y0+y1)/2}) rotate(-90)' font-size='12' text-anchor='middle' font-family='Times New Roman, Times, serif'>Индекс устойчивого развития I(t)</text>")
    ends = []
    for k, (c, d, w) in STY.items():
        pts = [(X(r['t']), Y(r['I'])) for r in R[k]['rows']]; s.poly(pts, c, w, d); ends.append((pts[-1][1], k, pts[-1]))
    ends.sort(); ly = 40
    for yv, k, (px, py) in ends:
        ty = max(ly, yv); s.callout(px, py, 540, ty, [k + ': ' + fmt(R[k]['rows'][-1]['I'], 3)], size=11); ly = ty + 22
    r = R['S4']['rows'][0]; s.callout(X(2027), Y(r['I']), X(2028.2), Y(0.17), ['S4: задержка запуска на год,', 'платформа работает в убыток'], size=10)
    r = [z for z in R['S3']['rows'] if z['t'] == 2030][0]; s.callout(X(2030), Y(r['I']), X(2030.7), Y(0.455), ['2030 г.: начало платы за выбросы,', 'S3 отходит от S2'], size=10)
    for i, k in enumerate(['S1', 'S1c', 'S2', 'S3', 'S3a', 'S4']):
        c, d, w = STY[k]; xx = 20 + (i % 3) * 225; yy = 378 + (i // 3) * 20
        s.line(xx, yy, xx + 28, yy, c, w, d); s.text(xx + 33, yy + 4, LAB[k], 10)
    s.save('Рисунок_3.8.svg')

def fig39():
    ids = ['S1', 'S1c', 'S2', 'S3', 'S3a', 'S4']; comp = ['экономическая', 'экологическая', 'социальная']; fills = ['#fff', '#bdbdbd', '#555']
    s = S(700, 440); x0, x1 = 250, 640; X = lambda v: x0 + (x1 - x0) * v
    for v in [0, .2, .4, .6, .8, 1.0]: s.line(X(v), 20, X(v), 380, '#e8e8e8', .6); s.text(X(v), 396, fmt(v, 1), 11, 'middle')
    s.line(X(0), 20, X(0), 380)
    for i, k in enumerate(ids):
        y = 26 + i * 59; s.text(10, y + 24, LAB[k], 11)
        for j in range(3):
            v = R[k]['comp'][j]; s.rect(X(0), y + j * 16, X(v) - X(0), 14, fills[j], '#000', .6); s.text(X(v) + 4, y + j * 16 + 11, fmt(v, 2), 10)
    for j in range(3):
        s.rect(260 + j * 130, 410, 14, 12, fills[j], '#000', .6); s.text(278 + j * 130, 420, comp[j], 11)
    s.save('Рисунок_3.9.svg')

def fig310():
    s = S(700, 400); x0, x1, y0, y1 = 75, 560, 330, 30
    X = lambda t: x0 + (x1 - x0) * (t - 2027) / 9; Y = lambda v: y0 - (y0 - y1) * (v - 2000) / 3000
    for v in range(2000, 5001, 500): s.line(x0, Y(v), x1, Y(v), '#e3e3e3', .6); s.text(x0 - 6, Y(v) + 4, f"{v:,}".replace(',', ' '), 11, 'end')
    for t in range(2027, 2037): s.line(X(t), y0, X(t), y0 + 4); s.text(X(t), y0 + 18, str(t), 11, 'middle')
    s.line(x0, y0, x1, y0); s.line(x0, y0, x0, y1)
    s.add(f"<text transform='translate(18,{(y0+y1)/2}) rotate(-90)' font-size='12' text-anchor='middle' font-family='Times New Roman, Times, serif'>Выбросы «Азота», тыс. т CO₂-экв.</text>")
    for k, c, d in [('S1', '#000', '2 3'), ('S2', '#000', None), ('S3a', '#000', '7 3')]:
        s.poly([(X(r['t']), Y(r['E'])) for r in R[k]['rows']], c, 1.8, d)
    e1 = R['S1']['rows'][-1]['E']; e2 = R['S2']['rows'][-1]['E']; e3 = R['S3a']['rows'][-1]['E']
    s.callout(X(2036), Y(e2), 575, Y(e2) - 10, ['S1 и S2 почти совпадают:', 'платформа −9,6 тыс. т'], size=10)
    s.callout(X(2036), Y(e3), 575, Y(e3) + 4, ['S3a: очистка N₂O', 'с 2030 г.: ' + f"{e3:,.0f}".replace(',', ' ')], size=10)
    r = [z for z in R['S3a']['rows'] if z['t'] == 2030][0]
    s.callout(X(2030), Y(r['E']), X(2031.2), Y(2250), ['−' + f"{R['S2']['rows'][3]['E'] - r['E']:,.0f}".replace(',', ' ') + ' тыс. т за счёт очистки,', f"в {round((R['S2']['rows'][3]['E'] - r['E'])/9.6/5)*5} раз больше вклада платформы"], size=10)
    s.text(x0, 380, 'Пунктир — S1 (без платформы); сплошная — S2; штриховая — S3a; рост выпуска 2 % в год до 2030 г., 1 % после', 11)
    s.save('Рисунок_3.10.svg')
fig38(); fig39(); fig310(); print('ok')

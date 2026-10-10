"""Weekly KPI email for the HoD and Vice Dean.

Usage: python3 scripts/weekly_kpi.py <decrypted_backup.json> <out.html> [--week N]
Reads a decrypted nightly backup and writes an email-safe HTML dashboard
(student KPIs + demonstrator KPIs). Contains no data itself.
"""
import json, sys, statistics, collections, datetime

src, out = sys.argv[1], sys.argv[2]
D = json.load(open(src))['collections']
L = lambda k: list(D[k].values()) if isinstance(D.get(k), dict) else (D.get(k) or [])
st = (D.get('reports') or {}).get('latest', {}).get('stats', {})
T = st.get('totals', {})
roster = L('roster')
stu = [r for r in roster if r.get('role') == 'student']
dem = [r for r in roster if r.get('role') == 'demonstrator']
ent = [e for e in L('entries') if not e.get('practice')]
att = L('attendance')
S = D['sessions']
now = datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000

weeks = sorted({e.get('week') for e in ent if e.get('week')})
today = datetime.date.today().isoformat()
done_w = [w for w in weeks if all(s['date'] < today for s in S.values() if s['type'] == 'lab' and s.get('week') == w)]
wk = int(sys.argv[sys.argv.index('--week') + 1]) if '--week' in sys.argv else (max(done_w) if done_w else max(weeks))
A = {(a['sid'], str(a['uid'])) for a in att}

def lab_att(week):
    labs = [k for k, s in S.items() if s['type'] == 'lab' and s.get('week') == week
            and s.get('req', 0) > 0 and (s.get('status') == 'closed' or s.get('closesAt', 9e15) < now or s.get('status') == 'open')]
    poss = pres = 0
    for k in labs:
        ids = [str(x['uid']) for x in stu if x['section'] == S[k]['section']]
        poss += len(ids); pres += sum((k, u) in A for u in ids)
    return round(100 * pres / poss) if poss else None

def wstats(week):
    E = [e for e in ent if e.get('week') == week]
    R = [e for e in E if e.get('status') == 'reviewed']
    g = [e['review']['grade'] for e in R if isinstance((e.get('review') or {}).get('grade'), (int, float))]
    live = [e for e in R if (e.get('review') or {}).get('source') != 'paper']
    return dict(week=week, att=lab_att(week), teeth=len(E), graded=len(R), live=len(live),
                waiting=sum(e.get('status') == 'submitted' for e in E),
                mean=round(statistics.mean(g), 2) if g else None)

trend = [wstats(w) for w in weeks]
cur = next(t for t in trend if t['week'] == wk)
waiting_all = sum(e.get('status') == 'submitted' for e in ent)
signed = sum(1 for s in stu if s.get('lastLogin'))
sv = [x for x in L('surveys') if x.get('role') == 'student']
lecs = sorted([(k, s) for k, s in S.items() if s['type'] == 'lecture' and s['date'] <= datetime.date.today().isoformat()], key=lambda x: x[1]['date'])
lec_rows = [(s.get('title', k), s['date'], sum(1 for a in att if a['sid'] == k)) for k, s in lecs]

# demonstrators
by = collections.defaultdict(list)
for e in ent:
    r = e.get('review') or {}
    if e.get('status') == 'reviewed' and r.get('source') != 'paper' and r.get('by'):
        h = (r['at'] - e['submittedAt']) / 3.6e6 if r.get('at') and e.get('submittedAt') else None
        by[r['by']].append((e.get('week'), h, e.get('section')))
wait_sec = collections.Counter(e['section'] for e in ent if e.get('status') == 'submitted')
drows = []
for d in dem:
    keys = {d.get('uid'), d.get('authUid'), d.get('email')}
    rv = [x for k in keys if k for x in by.get(k, [])]
    hs = [h for _, h, _ in rv if h is not None and h >= 0]
    secs = sorted({sc for _, _, sc in rv if sc}) or []
    drows.append(dict(name=d.get('name') or d.get('email'), signed=bool(d.get('lastLogin')),
                      week=sum(1 for w, _, _ in rv if w == wk), total=len(rv),
                      med=round(statistics.median(hs), 1) if hs else None,
                      in24=round(100 * sum(h <= 24 for h in hs) / len(hs)) if hs else None,
                      secs=', '.join(map(str, secs)) or '–',
                      waiting=sum(wait_sec[s] for s in secs) if secs else None))
drows.sort(key=lambda r: (-r['week'], -r['total']))
allh = [h for v in by.values() for _, h, _ in v if h is not None and h >= 0]
active = sum(1 for r in drows if r['week'] > 0)

# per-section
secrows = []
for sc in st.get('sections', []):
    secrows.append(dict(s=sc['section'], n=sc['students'], att=sc.get('labAttendance'),
                        comp=sc.get('completion'), mean=sc.get('meanGrade'), wait=wait_sec[sc['section']]))

# ---------- HTML ----------
C = dict(ink='#1C2B30', teal='#0E3F4A', gold='#9A6514', mute='#5B6B70', line='#DCD8CE', bg='#F6F4EF', red='#A23B2A', green='#2E7D4F')
def tile(v, lab, note='', col=C['teal']):
    return (f'<td style="padding:6px;width:25%"><div style="background:#fff;border:1px solid {C["line"]};border-radius:10px;padding:12px">'
            f'<div style="font:700 26px Georgia,serif;color:{col}">{v}</div><div style="font:13px Arial;color:{C["ink"]}">{lab}</div>'
            f'<div style="font:11px Arial;color:{C["mute"]}">{note}</div></div></td>')
def bar(p, col=C['teal']):
    if p is None: return '–'
    return (f'<div class="bb"><div class="bf" style="background:{col};width:{max(2, min(100, p))}%"></div></div> {p:g}%')
th = 'class="h"'
td = 'class="d"'
def fmt(x, suf=''): return '–' if x is None else f'{x:g}{suf}'

date = datetime.date.today()
h = [f'<style>.h{{text-align:left;font:600 12px Arial;color:{C["mute"]};border-bottom:1px solid {C["line"]};padding:6px}}.d{{font:13px Arial;padding:6px;border-bottom:1px solid #EEE}}.bb{{background:#ECE8DF;border-radius:4px;width:110px;display:inline-block;vertical-align:middle}}.bf{{height:10px;border-radius:4px}}</style>', f'<div style="background:{C["bg"]};padding:20px;font-family:Arial;color:{C["ink"]};max-width:760px">']
h.append(f'<div dir="rtl" style="font:15px Arial;line-height:1.8">الأستاذة الدكتورة/ هبة حمزة – رئيس قسم العلاج التحفظي<br>'
         f'الأستاذة الدكتورة/ آلاء الباز – وكيلة الكلية لشؤون التعليم والطلاب<br>تحية طيبة وبعد،<br>'
         f'مرفق الملخص الأسبوعي لمؤشرات الأداء (KPI) للوجبوك الرقمي حتى الأسبوع {wk}، للطلاب والمعيدين.</div>')
h.append(f'<h2 style="font:600 22px Georgia,serif;color:{C["teal"]};margin:18px 0 4px">Weekly KPI dashboard · Week {wk}</h2>'
         f'<div style="font:12px Arial;color:{C["mute"]}">Year 3 Preclinical Conservative Dentistry · data to {date:%a %d %b %Y}</div>')
h.append(f'<h3 style="font:600 16px Arial;color:{C["gold"]};margin:16px 0 4px">Students</h3><table style="width:100%;border-collapse:collapse"><tr>')
h.append(tile(f'{signed}/{len(stu)}', 'students signed in', f'{round(100*signed/len(stu))}%'))
h.append(tile(fmt(cur['att'], '%'), f'lab attendance, week {wk}', 'sessions held so far'))
h.append(tile(cur['graded'], f'teeth graded, week {wk}', f'mean {fmt(cur["mean"])}/10'))
h.append(tile(waiting_all, 'teeth waiting for review', 'all weeks', C['red'] if waiting_all > 50 else C['teal']))
h.append('</tr><tr>')
h.append(tile(sum(t['graded'] for t in trend), 'teeth graded to date', f'mean {fmt(T.get("meanGrade"))}/10'))
h.append(tile(fmt(T.get('lectureAttendance'), '%'), 'lecture attendance', 'platform check-ins'))
h.append(tile(len(st.get('atRisk', [])), 'students at risk', 'absence / low grade / missing teeth', C['red']))
h.append(tile(len(sv), 'survey answers', f'{round(100*len(sv)/len(stu))}% of students'))
h.append('</tr></table>')
h.append(f'<div style="font:12px Arial;color:{C["mute"]};margin-top:6px">Weeks after week {wk} are still in progress.</div>' if max(weeks) > wk else '')
h.append(f'<table style="width:100%;border-collapse:collapse;margin-top:8px;background:#fff"><tr><th {th}>Week</th><th {th}>Lab attendance</th><th {th}>Teeth</th><th {th}>Graded</th><th {th}>Graded live</th><th {th}>Waiting</th><th {th}>Mean</th></tr>')
for t in trend:
    h.append(f'<tr><td {td}>{t["week"]}</td><td {td}>{bar(t["att"])}</td><td {td}>{t["teeth"]}</td><td {td}>{t["graded"]}</td><td {td}>{t["live"]}</td><td {td}>{t["waiting"]}</td><td {td}>{fmt(t["mean"])}</td></tr>')
h.append('</table>')
h.append(f'<table style="width:100%;border-collapse:collapse;margin-top:12px;background:#fff"><tr><th {th}>Section</th><th {th}>Students</th><th {th}>Lab attendance</th><th {th}>Requirements done</th><th {th}>Mean</th><th {th}>Waiting</th></tr>')
for r in secrows:
    h.append(f'<tr><td {td}>{r["s"]}</td><td {td}>{r["n"]}</td><td {td}>{bar(r["att"], C["red"] if (r["att"] or 0) < 70 else C["teal"])}</td><td {td}>{bar(r["comp"], C["gold"])}</td><td {td}>{fmt(r["mean"])}</td><td {td}>{r["wait"] or ""}</td></tr>')
h.append('</table>')
h.append(f'<h3 style="font:600 16px Arial;color:{C["gold"]};margin:18px 0 4px">Demonstrators</h3><table style="width:100%;border-collapse:collapse"><tr>')
h.append(tile(f'{sum(r["signed"] for r in drows)}/{len(drows)}', 'demonstrators signed in'))
h.append(tile(active, f'grading on the phone, week {wk}'))
h.append(tile(fmt(round(statistics.median(allh), 1) if allh else None, ' h'), 'median submit → grade'))
h.append(tile(fmt(round(100 * sum(x <= 24 for x in allh) / len(allh)) if allh else None, '%'), 'graded within 24 h'))
h.append('</tr></table>')
h.append(f'<table style="width:100%;border-collapse:collapse;margin-top:8px;background:#fff"><tr><th {th}>Demonstrator</th><th {th}>Sections</th><th {th}>Signed in</th><th {th}>Live grades wk {wk}</th><th {th}>Total live</th><th {th}>Median h</th><th {th}>≤24 h</th><th {th}>Waiting in sections</th></tr>')
for r in drows:
    h.append(f'<tr><td {td}>{r["name"]}</td><td {td}>{r["secs"]}</td><td {td}>{"✓" if r["signed"] else "✗"}</td><td {td}>{r["week"]}</td><td {td}>{r["total"]}</td><td {td}>{fmt(r["med"])}</td><td {td}>{fmt(r["in24"], "%")}</td><td {td}>{"" if r["waiting"] is None else r["waiting"]}</td></tr>')
h.append('</table>')
h.append(f'<p style="font:12px Arial;color:{C["mute"]}">Paper sheets imported by the course director are counted in teeth graded but not in "live" grades. Full details by student are on the platform (sign in → Reports).</p>')
h.append('<div dir="rtl" style="font:15px Arial;line-height:1.8;margin-top:10px">وتفضلوا بقبول فائق الاحترام والتقدير،<br>أ.د. أحمد زهير الحوشي<br>منسق مقرر العلاج التحفظي – الفرقة الثالثة (قبل الإكلينيكي)</div></div>')
open(out, 'w').write('\n'.join(h))
print(json.dumps(dict(week=wk, cur=cur, waiting=waiting_all, signed=signed, survey=len(sv), active=active, demons=len(drows)), ensure_ascii=False))

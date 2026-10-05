// Shared by the Cloud Functions and the daily-report script run by GitHub Actions.
export const cairoDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(d);
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Report recipients come from the roster, so adding or removing staff on the People page updates the lists.

export async function loadAll(db) {
  const [students, sessions, attendance, entries, research, cfg, paperwork, staff] = await Promise.all([
    db.collection('roster').where('role', '==', 'student').get(), db.collection('sessions').get(), db.collection('attendance').get(),
    db.collection('entries').get(), db.collection('research').get(), db.doc('config/course').get(), db.collection('paperwork').get(),
    db.collection('roster').where('role', 'in', ['demonstrator', 'lecturer']).get(),
  ]);
  const rs = {}; research.docs.forEach((d) => { rs[d.id] = d.data().score; });
  const ents = entries.docs.map((d) => { const e = { id: d.id, ...d.data() }; if (e.ai && rs[d.id] != null) e.ai = { ...e.ai, score: rs[d.id] }; return e; });
  return {
    students: students.docs.map((d) => ({ id: d.id, ...d.data(), uid: String(d.data().code) })),
    sessions: sessions.docs.map((d) => ({ id: d.id, ...d.data() })), attendance: attendance.docs.map((d) => ({ id: d.id, ...d.data() })),
    entries: ents, config: cfg.exists ? cfg.data() : {}, paperwork: paperwork.docs.map((d) => d.data()),
    staff: staff.docs.map((d) => ({ id: d.id, email: d.id, ...d.data() })),
  };
}
export function reportHtml(st, all, day, heading, siteUrl = '') {
  const yAtt = all.attendance.filter((a) => a.date === day);
  const ySess = all.sessions.filter((s) => s.date === day && (s.status === 'open' || s.status === 'closed' || yAtt.some((a) => a.sid === s.id)));
  const yEnt = all.entries.filter((e) => e.date === day && e.status !== 'draft' && !e.practice);
  const yRev = all.entries.filter((e) => e.review && cairoDate(new Date(e.review.at)) === day);
  const rows = ySess.sort((a, b) => (a.start || '').localeCompare(b.start || '')).map((s) => {
    const exp = s.type === 'lab' ? all.students.filter((x) => x.section === s.section).length : all.students.length;
    const conf = yAtt.filter((a) => a.sid === s.id && a.status === 'confirmed').length;
    const pend = yAtt.filter((a) => a.sid === s.id && a.status === 'recorded').length;
    return `<tr><td>${s.type === 'lecture' ? `Lecture ${s.lectureNo}` : `Lab ${s.labNo || ''} · S${s.section}`}</td><td>${s.start}–${s.end}</td><td style="text-align:right">${conf}/${exp}</td><td style="text-align:right">${pend}</td></tr>`;
  }).join('');
  const T = st.totals;
  return `<div style="font-family:Arial,sans-serif;color:#13262A;max-width:680px">
<h2 style="color:#0B4A55">${esc(heading)} — ${esc(day)}</h2><p>Year 3 Preclinical Conservative Dentistry · Faculty of Dentistry, Cairo University</p>
<h3>${esc(day)}</h3><ul><li>Sessions held: ${ySess.length}</li><li>Requirement teeth submitted: ${yEnt.length} · reviewed by demonstrators: ${yRev.length}</li><li>Prep Lens feedback requests: ${yEnt.filter((e) => e.ai).length}</li></ul>
${rows ? `<table cellpadding="6" style="border-collapse:collapse;border:1px solid #D3DDDA"><tr style="background:#E8EEEC"><th align="left">Session</th><th align="left">Time</th><th>Confirmed</th><th>Awaiting</th></tr>${rows}</table>` : '<p>No sessions held.</p>'}
<h3>Course to date (from 3 October)</h3><ul><li>Lecture attendance ${T.lectureAttendance ?? '–'}% · lab attendance ${T.labAttendance ?? '–'}%</li><li>Requirements completed ${T.completion ?? '–'}% · mean official grade ${T.meanGrade ?? '–'}</li><li>Students needing attention: <b>${T.atRisk}</b> · reviews overdue &gt;48 h: <b>${T.overdue}</b></li></ul>
${st.sections.filter((s) => s.overdue || (s.labAttendance != null && s.labAttendance < 80)).map((s) => `<p>⚠ Section ${s.section}: ${s.overdue ? `${s.overdue} overdue review(s)` : ''} ${s.labAttendance != null && s.labAttendance < 80 ? `lab attendance ${s.labAttendance}%` : ''}</p>`).join('')}
${siteUrl ? `<p><a href="${esc(siteUrl)}" style="background:#0B4A55;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open the live dashboard</a></p>` : ''}
<p style="color:#74878A;font-size:12px">Aggregated figures. Student-level detail is available only inside the platform to authorised staff. Generated ${new Date().toISOString()}.</p></div>`;
}

// End-of-day checklist (counts per section only): what is still open today so staff can correct it before the day closes.
export function actionHtml(all, day) {
  const sess = all.sessions.filter((s) => s.date === day).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  const att = all.attendance.filter((a) => a.date === day);
  const label = (s) => (s.type === 'lecture' ? `Lecture ${s.lectureNo}` : `Lab ${s.labNo || (/-(\d+)$/.exec(s.id) || [])[1] || ''} · Section ${s.section}`);
  const rows = [];
  for (const s of sess) {
    const a = att.filter((x) => x.sid === s.id);
    const notOpened = !(s.status === 'open' || s.status === 'closed' || a.length);
    const awaiting = a.filter((x) => x.status === 'recorded').length;
    const stillOpen = s.status === 'open';
    let teethMissing = 0, unreviewed = 0;
    const isLab1 = s.type === 'lab' && (s.labNo === 1 || /-1$/.test(s.id));
    if (isLab1) {
      const present = new Set(a.filter((x) => x.status === 'confirmed').map((x) => x.uid));
      const mine = all.entries.filter((e) => e.section === s.section && e.week === s.week && !e.practice && e.status !== 'draft');
      for (const uid of present) if (mine.filter((e) => e.uid === uid).length < 2) teethMissing++;
      unreviewed = mine.filter((e) => e.status === 'submitted' && !e.review).length;
    }
    const issues = [notOpened && 'attendance NOT taken', stillOpen && 'attendance still open (close it)', awaiting && `${awaiting} check-in(s) awaiting confirmation`,
      unreviewed && `${unreviewed} tooth/teeth not graded yet`, teethMissing && `${teethMissing} present student(s) with fewer than 2 teeth`].filter(Boolean);
    rows.push(`<tr><td>${label(s)}</td><td>${s.start || ''}–${s.end || ''}</td><td>${issues.length ? '<b style="color:#B3261E">' + issues.join('<br>') + '</b>' : '<span style="color:#2E7D4F">✓ complete</span>'}</td></tr>`);
  }
  const open = rows.filter((r) => r.includes('#B3261E')).length;
  return `<h3>Action needed today (${day})</h3>${rows.length ? `<p>${open ? `<b>${open}</b> session(s) need attention before the day closes.` : 'Everything for today is complete.'}</p><table cellpadding="6" style="border-collapse:collapse;border:1px solid #D3DDDA"><tr style="background:#E8EEEC"><th align="left">Session</th><th align="left">Time</th><th align="left">Still open</th></tr>${rows.join('')}</table>` : '<p>No sessions scheduled today.</p>'}`;
}

// Staff platform-compliance KPI as an email-safe table with bars.
export function complianceHtml(k) {
  if (!k || !k.rows.length) return '';
  const C = { signed: '#2a78d6', attendance: '#eb6834', grading: '#1baf7a', defects: '#eda100', timely: '#e87ba4' };
  const bar = (r) => '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:220px"><tr>' + Object.entries(r.parts).filter(([, v]) => v > 0).map(([k2, v]) => `<td style="background:${C[k2]};height:12px;width:${Math.round(2.2 * v)}px;border-right:2px solid #fff"></td>`).join('') + `<td style="width:${Math.round(2.2 * (100 - r.score))}px"></td></tr></table>`;
  return `<h3 style="color:#10424a;margin:22px 0 4px">Staff platform compliance (KPI)</h3>
<p style="margin:0 0 8px;color:#555;font-size:13px">Average score <b>${k.mean}/100</b> · ${k.active} of ${k.rows.length} staff actively using the platform (score ≥ 40) · ${k.notSignedIn} not signed in yet. Score = signed in 15 · confirms lab attendance 25 · grades teeth on the platform 30 · marks defects when grade &lt; 10 20 · grades during the section 10.</p>
<p style="margin:0 0 8px;font-size:12px"><span style="color:#2a78d6">■</span> Signed in &nbsp;<span style="color:#eb6834">■</span> Attendance &nbsp;<span style="color:#1baf7a">■</span> Grading &nbsp;<span style="color:#eda100">■</span> Defects &nbsp;<span style="color:#e87ba4">■</span> In-section</p>
<table cellpadding="5" style="border-collapse:collapse;font-size:13px">${k.rows.map((r) => `<tr style="border-bottom:1px solid #eee"><td>${esc(r.name)}${r.role === 'lecturer' ? ' <span style="color:#888">(Sup.)</span>' : ''}</td><td>${bar(r)}</td><td style="text-align:right"><b>${r.score}</b></td><td style="color:#777">${r.confirmed} check-ins · ${r.graded} teeth</td></tr>`).join('')}</table>
<p style="color:#888;font-size:12px">A low score can also mean no section yet this week or grading on paper. It measures platform use, not teaching quality.</p>`;
}

// Shared by the Cloud Functions and the daily-report script run by GitHub Actions.
export const cairoDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(d);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Report recipients come from the roster, so adding or removing staff on the People page updates the lists.

export async function loadAll(db) {
  const [students, sessions, attendance, entries, research, cfg, paperwork] = await Promise.all([
    db.collection('roster').where('role', '==', 'student').get(), db.collection('sessions').get(), db.collection('attendance').get(),
    db.collection('entries').get(), db.collection('research').get(), db.doc('config/course').get(), db.collection('paperwork').get(),
  ]);
  const rs = {}; research.docs.forEach((d) => { rs[d.id] = d.data().score; });
  const ents = entries.docs.map((d) => { const e = { id: d.id, ...d.data() }; if (e.ai && rs[d.id] != null) e.ai = { ...e.ai, score: rs[d.id] }; return e; });
  return {
    students: students.docs.map((d) => ({ id: d.id, ...d.data(), uid: String(d.data().code) })),
    sessions: sessions.docs.map((d) => ({ id: d.id, ...d.data() })), attendance: attendance.docs.map((d) => ({ id: d.id, ...d.data() })),
    entries: ents, config: cfg.exists ? cfg.data() : {}, paperwork: paperwork.docs.map((d) => d.data()),
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

import { useEffect } from 'preact/hooks';
import { me, store } from '../lib/logic.js';
import { L, useQuery } from '../lib/ui.jsx';

// Plays are saved on the phone by the game page (same site) and uploaded here to the student's record.
async function flushPlays() {
  let a = [];
  try { a = JSON.parse(localStorage.getItem('cu_game_plays') || '[]'); } catch (e) { return; }
  if (!a.length) return;
  const u = me(); if (!u || u.role !== 'student') return;
  const left = [];
  for (const p of a) {
    try { await store().set('plays', `${u.uid}_${p.game}_${p.at}`, { uid: u.uid, code: u.code || '', name: u.name, section: u.section || null, game: String(p.game).slice(0, 60), score: Number(p.score) || 0, max: Number(p.max) || 0, at: Number(p.at) || Date.now() }); }
    catch (e) { left.push(p); }
  }
  try { localStorage.setItem('cu_game_plays', JSON.stringify(left)); } catch (e) {}
}
export function usePlayFlush() {
  useEffect(() => { flushPlays(); const on = (e) => { if (e.key === 'cu_game_plays') flushPlays(); }; const vis = () => { if (!document.hidden) flushPlays(); }; window.addEventListener('storage', on); document.addEventListener('visibilitychange', vis); return () => { window.removeEventListener('storage', on); document.removeEventListener('visibilitychange', vis); }; }, []);
}
export function Games() {
  const u = me(); const isStu = u && u.role === 'student';
  usePlayFlush();
  const links = useQuery('materials', [['kind', '==', 'link']]);
  const games = (links.rows || []).filter((m) => String(m.title || '').trim().startsWith('🎮')).sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!games.length) return null;
  const name = (t) => t.replace(/^🎮\s*/, '').replace(/^2-minute game:\s*/i, '');
  return <section class="card"><h2>{L('🎮 2-minute games', '🎮 ألعاب الدقيقتين')}</h2>
    <p class="faint">{isStu ? L('Short challenges to revise while you wait. Not graded; the games you play count in your engagement record.', 'تحديات قصيرة للمراجعة في أي وقت. بدون درجات، والألعاب اللي بتلعبها بتتحسب في سجل مشاركتك.') : L('The same games students see on their home page. Plays by staff are not recorded.', 'نفس الألعاب اللي بتظهر للطلاب. لعب أعضاء هيئة التدريس لا يُسجَّل.')}</p>
    <div class="list">{games.map((g) => <a class="item click" href={g.url} target="_blank" rel="noopener"><div class="grow"><b>{name(g.title)}</b>{g.description && <div class="faint">{g.description}</div>}</div><span class="btn sm primary">{L('Play', 'العب')}</span></a>)}</div>
  </section>;
}


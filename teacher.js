(function () {
    'use strict';
    const $ = id => document.getElementById(id), esc = LMS.esc, icons = () => { if (window.lucide) lucide.createIcons(); };
    const DAY = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const BASE_MONDAY = new Date(2026, 8, 7);
    const STATUS = { planned: ['Sắp tới', 'bg-slate-100 text-slate-600'], done: ['Đã học', 'bg-emerald-50 text-emerald-700'], cancel: ['Hủy', 'bg-rose-50 text-rose-700'],
      makeup: ['Học bù', 'bg-sky-50 text-sky-700'], holiday: ['Nghỉ lễ', 'bg-slate-100 text-slate-600'] };
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const dOf = k => new Date(k + 'T00:00:00');
    const fmtDay = k => { const d = dOf(k); return DAY[d.getDay()] + ', ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
    function mondayKey(d) { const dow = d.getDay() === 0 ? 6 : d.getDay() - 1; return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow)); }
    function errText(e) {
      const m = (e && e.message) || '';
      if (/student_not_found/.test(m)) return 'Mã học viên chưa đúng hoặc đã bị tạm ngưng. Hỏi lại giáo viên để lấy link mới.';
      if (/assignment_not_found/.test(m)) return 'Bài này hiện không mở.';
      return LMS.friendlyError(e);
    }
    function restoreHeaderActions() { const tools = document.querySelector('.header-tools'); if (tools) ['btn-home','btn-class','btn-mode','btn-theme'].forEach(id => { const el = $(id); if (el) tools.appendChild(el); }); document.body.classList.remove('student-dashboard-view'); }
    function showError(msg) { restoreHeaderActions(); $('app').innerHTML = `<div class="narrow"><div class="card text-center"><p class="text-sm text-rose-700">${esc(msg)}</p></div></div>`; $('hello').textContent = 'gblearning'; $('hello-sub').textContent = ''; }
    const S = { c: null };

    /* ---------- Giáo viên: lịch dạy theo ngày (teacher.html/YYYY-MM-DD) ---------- */
    const T = { cache: new Map(), allStu: null, authed: false, nextAt: 0, subOpen: new Set(), dayClosed: new Set(), dayOpenM: new Set(), pick: null, slotOpen: new Set(), on: false, bound: false, view: 'day', monday: '', date: '', openFor: '', open: new Set(), sess: [], mats: [], asg: [], next: null, sub: null, stu: {} };
    const addDays = (k, n) => { const d = dOf(k); d.setDate(d.getDate() + n); return ymd(d); };
    const hhmm = t => String(t || '').slice(0, 5);
    const safeUrl = u => /^\s*javascript:/i.test(u || '') ? '#' : (u || '#');

    async function fetchWeek(monday) {
      const sun = addDays(monday, 6);
      const cols = 'id,class_id,session_no,session_date,start_time,end_time,status,lesson,homework,note,mode,classes(class_code,class_name)';
      const qs = c => S.c.from('sessions').select(c).gte('session_date', monday).lte('session_date', sun).order('session_date').order('start_time');
      const [a0, b, c] = await Promise.all([
        qs(cols),
        S.c.from('week_materials').select('id,kind,skill,title,url,class_ids,sort_order,session_dates').eq('week_start', monday).order('sort_order').order('id'),
        S.c.from('assignment_classes').select('assignment_id,class_id,due_at,assignments(assignment_name,assignment_code,kind,page_path,skill)').eq('week_start', monday).eq('is_active', true)
      ]);
      let a = a0;
      if (a.error && /homework/i.test(a.error.message || '')) a = await qs(cols.replace('homework,', ''));
      for (const r of [a, b, c]) if (r.error) throw r.error;
      return { sess: a.data || [], mats: b.data || [], asg: c.data || [] };
    }
    function loadStudents(force) {
      if (!force && T.allStu) return T.allStu;
      T.allStu = Promise.resolve(S.c.from('students').select('id,student_name,class_id').eq('is_active', true).neq('student_code', '0000').order('student_name')).then(r => { if (r.error) { T.allStu = null; throw r.error; } return r.data || []; });
      return T.allStu;
    }
    async function loadTeacherWeek(monday, force) {
      if (!force && T.monday === monday) return;
      if (force) T.cache.delete(monday);
      const [w, stu] = await Promise.all([T.cache.has(monday) ? T.cache.get(monday) : fetchWeek(monday), loadStudents(force)]);
      T.cache.set(monday, w);
      T.stu = {}; const cids = new Set(w.sess.map(x => x.class_id));
      stu.forEach(x => { if (cids.has(x.class_id)) (T.stu[x.class_id] = T.stu[x.class_id] || []).push(x); });
      T.monday = monday; T.sess = w.sess; T.mats = w.mats; T.asg = w.asg;
    }
    function prefetchWeeks(monday) {
      [addDays(monday, -7), addDays(monday, 7)].forEach(m => { if (!T.cache.has(m)) fetchWeek(m).then(w => { if (!T.cache.has(m)) T.cache.set(m, w); }).catch(() => {}); });
    }
    /* Lớp gần nhất sắp tới (xuyên các tuần) + kiểm tra đã có bài học / bài tập chưa */
    async function loadNext() {
      try {
        const now = new Date(), k = ymd(now), h = pad(now.getHours()) + ':' + pad(now.getMinutes());
        const r = await S.c.from('sessions').select('id,class_id,session_date,start_time,end_time,status,classes(class_code,class_name)').gte('session_date', k).in('status', ['planned', 'makeup']).order('session_date').order('start_time').limit(12);
        if (r.error) throw r.error;
        const n = (r.data || []).find(s => s.session_date > k || hhmm(s.end_time) > h);
        if (!n) { T.next = null; T.nextAt = Date.now(); return; }
        const wk = mondayKey(dOf(n.session_date));
        const [m, a] = await Promise.all([
          S.c.from('week_materials').select('id,kind').eq('week_start', wk).contains('class_ids', [n.class_id]),
          S.c.from('assignment_classes').select('assignment_id').eq('week_start', wk).eq('class_id', n.class_id).eq('is_active', true)
        ]);
        const ms = m.data || [];
        T.next = { s: n, lessons: ms.filter(x => x.kind === 'lesson').length, hw: ms.filter(x => x.kind === 'homework').length + (a.data || []).length }; T.nextAt = Date.now();
      } catch (e) { T.next = null; }
    }

    /* Bài nộp: ai đã nộp / chưa nộp các bài online được giao trong tuần */
    async function loadSubs() {
      const ids = [...new Set(T.asg.map(x => x.assignment_id))], cids = [...new Set(T.asg.map(x => x.class_id))];
      if (!ids.length) { T.sub = { students: [], subs: [], writing: [], classes: [] }; return; }
      const [st, sb, wr, cl] = await Promise.all([
        S.c.from('students').select('id,student_name,student_code,class_id').in('class_id', cids).eq('is_active', true).order('student_name'),
        S.c.from('submissions').select('assignment_id,student_id,score,submitted_at,is_late,attempt_no,counts_for_score,part').in('assignment_id', ids),
        S.c.from('writing_submissions').select('assignment_id,student_id,part,is_late,band,submitted_at').in('assignment_id', ids),
        S.c.from('classes').select('id,class_code,class_name').in('id', cids)
      ]);
      for (const r of [st, sb, wr, cl]) if (r.error) throw r.error;
      T.sub = { students: st.data || [], subs: sb.data || [], writing: wr.data || [], classes: cl.data || [] };
    }
    /* Chấm điểm: lưu vào bảng grades (mỗi học viên một dòng cho mỗi bài) */
    const BAND_L = [[39,9],[37,8.5],[35,8],[32,7.5],[30,7],[26,6.5],[23,6],[18,5.5],[16,5],[13,4.5],[10,4],[8,3.5],[6,3],[4,2.5]];
    const BAND_R = [[39,9],[37,8.5],[35,8],[33,7.5],[30,7],[27,6.5],[23,6],[19,5.5],[15,5],[13,4.5],[10,4],[8,3.5],[6,3],[4,2.5]];
    const toBand = (n, tb) => { for (const [m, b] of tb) if (n >= m) return b; return n >= 1 ? 2 : 0; };
    /* Tổng điểm = lần nộp đầu tiên của từng part cộng lại */
    const sumFirst = rows => { const m = new Map(); rows.filter(r => r.score != null).forEach(r => { const k = r.part == null ? 0 : r.part, o = m.get(k); if (!o || (r.attempt_no || 1) < (o.attempt_no || 1)) m.set(k, r); }); return m.size ? [...m.values()].reduce((t, r) => t + Number(r.score), 0) : null; };
    async function tGrade(aid, stid) {
      const xs = T.asg.find(x => x.assignment_id === aid), a = xs && xs.assignments, D = T.sub;
      const st = D.students.find(z => z.id === stid), cls = D.classes.find(c => c.id === st.class_id) || {}, code = cls.class_code || '';
      const nm = ((a.skill || '') + ' ' + (a.assignment_name || '')).toLowerCase();
      const prog = /^IE/i.test(code) ? 'ielts' : /^AC12/i.test(code) ? 'ac12' : /^TO/i.test(code) ? 'toeic' : 'gs';
      const skill = /writing/.test(nm) ? 'writing' : /listening/.test(nm) ? 'listening' : /reading/.test(nm) ? 'reading' : (a.skill || '');
      const tot0 = sumFirst(D.subs.filter(r => r.assignment_id === aid && r.student_id === stid)), first = tot0 != null ? { score: tot0 } : null;
      const old = await S.c.from('grades').select('*').eq('student_id', stid).eq('assignment_id', aid).maybeSingle();
      const g = (old && old.data) || {}, cr = g.criteria || {};
      const inp = (id, label, val, extra) => `<label class="gr-f"><span>${label}</span><input id="${id}" type="number" inputmode="decimal" value="${val == null ? '' : val}" ${extra || ''}></label>`;
      let body = '';
      if (prog === 'ielts' && skill === 'writing') {
        body = `<div class="gr-grid">${inp('gr-tr', 'Task response', cr.tr, 'step="0.5" min="0" max="9"')}${inp('gr-cc', 'Coherence and cohesion', cr.cc, 'step="0.5" min="0" max="9"')}${inp('gr-lr', 'Lexical resource', cr.lr, 'step="0.5" min="0" max="9"')}${inp('gr-gra', 'Grammatical range and accuracy', cr.gra, 'step="0.5" min="0" max="9"')}</div>${inp('gr-band', 'Overall band', g.band, 'step="0.5" min="0" max="9"')}`;
      } else if (prog === 'ielts') {
        body = `<div class="gr-grid">${inp('gr-score', 'Số câu đúng (/40)', g.score != null ? g.score : (first ? first.score : ''), 'step="1" min="0" max="40"')}${inp('gr-band', 'Band', g.band, 'step="0.5" min="0" max="9"')}</div><button type="button" class="btn-soft" id="gr-conv">Quy đổi sang band${skill === 'reading' ? ' (Academic)' : ''}</button>`;
      } else if (prog === 'gs') {
        body = `<div class="gr-grid">${inp('gr-score', 'Điểm (thang 10)', g.score, 'disabled')}</div><p class="gr-note">Thang điểm Global Success chưa chốt nên ô này đang khóa.</p>`;
      } else {
        body = `<div class="gr-grid">${inp('gr-score', 'Số câu đúng', g.score != null ? g.score : (first ? first.score : ''), 'step="1" min="0"')}${inp('gr-total', 'Tổng số câu', g.total, 'step="1" min="0"')}</div>`;
      }
      body += `<label class="gr-f"><span>Nhận xét</span><textarea id="gr-fb" rows="4">${esc(g.feedback || '')}</textarea></label><div class="gr-act"><button type="button" class="btn-soft" id="gr-save">Lưu điểm</button></div>`;
      const old2 = document.getElementById('gm-modal'); if (old2) old2.remove();
      const m = document.createElement('div'); m.id = 'gm-modal';
      m.innerHTML = `<div class="gm-box" role="dialog" aria-modal="true"><div class="gm-head"><span class="gm-title"><i data-lucide="pencil-line"></i>${esc(st.student_name)} · ${esc(a.assignment_name)}</span><button type="button" class="icon-btn" data-gm-close aria-label="Đóng"><i data-lucide="x" class="w-4 h-4"></i></button></div><div class="gm-body gr-body">${body}</div></div>`;
      m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-gm-close]')) m.remove(); });
      document.body.appendChild(m); if (window.lucide) window.lucide.createIcons();
      const $g = id => m.querySelector('#' + id), val = id => { const el = $g(id); return el && el.value !== '' ? Number(el.value) : null; };
      if ($g('gr-conv')) $g('gr-conv').onclick = () => { const n = val('gr-score'); if (n == null) return; $g('gr-band').value = toBand(n, skill === 'reading' ? BAND_R : BAND_L); };
      ['gr-tr', 'gr-cc', 'gr-lr', 'gr-gra'].forEach(id => { if ($g(id)) $g(id).oninput = () => { const v = ['gr-tr', 'gr-cc', 'gr-lr', 'gr-gra'].map(val); if (v.every(x => x != null)) $g('gr-band').value = Math.round(v.reduce((p, q) => p + q, 0) / 4 * 2) / 2; }; });
      $g('gr-save').onclick = async () => {
        const row = { student_id: stid, assignment_id: aid, week_start: (T.monday || null), skill: skill || null, source: 'manual', feedback: ($g('gr-fb').value || '').trim() || null, graded_at: new Date().toISOString() };
        if ($g('gr-score')) row.score = val('gr-score'); if ($g('gr-total')) row.total = val('gr-total'); if ($g('gr-band')) row.band = val('gr-band');
        if ($g('gr-tr')) row.criteria = { tr: val('gr-tr'), cc: val('gr-cc'), lr: val('gr-lr'), gra: val('gr-gra') };
        const r = await S.c.from('grades').upsert(row, { onConflict: 'student_id,assignment_id' });
        if (r.error) { LMS.toast('Không lưu được: ' + r.error.message); return; }
        LMS.toast('Đã lưu điểm'); m.remove();
      };
    }
    const num = v => Number.isInteger(v) ? String(v) : v.toFixed(1);
    function tSubView() {
      const D = T.sub || { students: [], subs: [], writing: [], classes: [] };
      const fmtDue = d => d ? 'Hạn ' + new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : 'Không có hạn';
      const byA = new Map();
      T.asg.filter(x => x.assignments && !((D.classes.find(c => c.id === x.class_id) || {}).class_code || '').includes('Teacher')).forEach(x => { if (!byA.has(x.assignment_id)) byA.set(x.assignment_id, { a: x.assignments, parts: [] }); byA.get(x.assignment_id).parts.push(x); });
      const cards = [...byA.entries()].map(([aid, g]) => {
        const groups = g.parts.map(x => {
          const cls = D.classes.find(c => c.id === x.class_id) || {}, roster = D.students.filter(st => st.class_id === x.class_id);
          const rows = roster.map(st => {
            const sb = D.subs.filter(r => r.assignment_id === aid && r.student_id === st.id), wr = D.writing.filter(r => r.assignment_id === aid && r.student_id === st.id);
            if (!sb.length && !wr.length) return { st, done: false };
            const tot = sumFirst(sb);
            const bands = wr.filter(r => r.band != null).map(r => Number(r.band));
            return { st, done: true, late: sb.some(r => r.is_late) || wr.some(r => r.is_late), score: tot, band: bands.length ? bands.reduce((p, q) => p + q, 0) / bands.length : null, tries: sb.length ? Math.max(...sb.map(r => r.attempt_no || 1)) : 0 };
          }).sort((p, q) => p.done - q.done);
          return { x, cls, rows };
        });
        const all = groups.flatMap(z => z.rows), done = all.filter(r => r.done), late = done.filter(r => r.late).length, sc = done.filter(r => r.score != null);
        const avg = sc.length ? sc.reduce((p, r) => p + r.score, 0) / sc.length : null, pct = all.length ? Math.round(done.length / all.length * 100) : 0;
        const name = c => esc(c.class_name || c.class_code || ''), dues = [...new Set(groups.map(z => z.x.due_at || ''))];
        const sub = dues.length === 1 ? esc(fmtDue(dues[0])) : 'Hạn nộp khác nhau theo lớp';
        const flat = groups.flatMap(z => z.rows.map(r => ({ ...r, cls: z.cls, due: z.x.due_at }))).sort((p, q) => p.done - q.done);
        const line = r => { const res = [r.score != null ? '<b>' + num(r.score) + '</b>' : '', r.band != null ? '<b>B' + num(r.band) + '</b>' : ''].filter(Boolean).join(' · '), tr = r.done && r.tries > 1 ? '<span class="tag bg-slate-100 text-slate-600">Lần ' + r.tries + '</span>' : '', stt = !r.done ? '<span class="tag bg-amber-50 text-amber-700">Chưa nộp</span>' : r.late ? '<span class="tag bg-rose-50 text-rose-700">Trễ</span>' : '<span class="tag bg-emerald-50 text-emerald-700">Đã nộp</span>', bt = r.done ? `<button type="button" class="t-ic" data-t="grade" data-aid="${aid}" data-stid="${r.st.id}" aria-label="Chấm điểm" title="Chấm điểm"><i data-lucide="pencil-line"></i></button>` : ''; return `<div class="t-sub-row"><span class="t-sr-name">${esc(r.st.student_name)}</span><span class="t-sr-cls">${name(r.cls)}${dues.length > 1 ? `<small>${esc(fmtDue(r.due))}</small>` : ''}</span><span class="t-sr-code">${esc(r.st.student_code || '')}</span><span class="t-sub-meta"><i class="sl sl-res">${res}</i><i class="sl sl-try">${tr}</i><i class="sl sl-st">${stt}</i><i class="sl sl-bt">${bt}</i></span></div>`; };
        const list = flat.length ? '<div class="t-sub-row t-sub-cap"><span>Học viên</span><span>Lớp</span><span>MSHS</span><span class="t-sub-meta">Trạng thái</span></div>' + flat.map(line).join('') : '<div class="t-none">Lớp chưa có học viên.</div>';
        return `<section class="card t-sub" data-aid="${aid}"><div class="t-sub-head" aria-expanded="${T.subOpen.has(String(aid))}"><div class="t-cls"><b>${esc(g.a.assignment_name)}</b><span>${sub}</span></div><div class="t-sum"><span class="tag ${done.length === all.length && all.length ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">${done.length}/${all.length} đã nộp</span>${late ? `<span class="tag bg-rose-50 text-rose-700">${late} nộp trễ</span>` : ''}${avg != null ? `<span class="tag bg-slate-100 text-slate-600">Điểm TB ${num(avg)}</span>` : ''}</div></div>
          <div class="t-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><div class="t-sub-body" ${T.subOpen.has(String(aid)) ? '' : 'hidden'}>${list}</div></section>`;
      });
      return `<section class="card t-daybar"><h2><i data-lucide="inbox"></i>Bài nộp trong tuần</h2><button type="button" class="t-ic" data-t="sub-refresh" aria-label="Tải lại bài nộp" title="Tải lại"><i data-lucide="refresh-cw"></i></button></section>${cards.join('') || '<section class="card text-center text-sm text-slate-500">Tuần này chưa giao bài online nào.</section>'}`;
    }

    const matFor = (m, cid, date) => (m.class_ids || []).includes(cid) && (!(m.session_dates || []).length || m.session_dates.includes(date));
    function tMat(m, cid, edit) {
      const shared = (m.class_ids || []).length > 1;
      return `<div class="t-mat"><a class="t-open" href="${esc(safeUrl(m.url))}"><i data-lucide="external-link"></i><span>${esc(m.title)}</span></a>${shared ? '<span class="tag bg-slate-100 text-slate-600">Dùng chung</span>' : ''}${edit ? `<button type="button" class="t-ic" data-t="mat-edit" data-id="${m.id}" aria-label="Sửa tài liệu"><i data-lucide="pencil"></i></button><button type="button" class="t-ic" data-t="mat-del" data-id="${m.id}" data-cid="${cid}" aria-label="Xóa khỏi lớp này"><i data-lucide="trash-2"></i></button>` : ''}</div>`;
    }
    function tAsg(x) {
      const a = x.assignments, due = x.due_at ? 'Hạn ' + new Date(x.due_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '';
      let href = ''; if (a.page_path) { try { const u = new URL(a.page_path, location.href); u.searchParams.set('s', '0000'); href = u.href; } catch (e) { href = ''; } }
      const inner = `<i data-lucide="clipboard-list"></i><span class="t-name">${esc(a.assignment_name)}</span>`;
      return `<div class="t-mat">${href ? `<a class="t-open" href="${esc(href)}">${inner}</a>` : `<span class="t-open">${inner}</span>`}<span class="t-due">${due}</span><span class="tag bg-blue-50 text-blue-700">Bài online</span></div>`;
    }
    function tRow(s) {
      const cid = s.class_id, cl = s.classes || {}, open = T.open.has(s.id);
      const mats = k => T.mats.filter(m => m.kind === k && matFor(m, cid, s.session_date));
      const asg = T.asg.filter(x => x.class_id === cid && x.assignments);
      const nL = mats('lesson').length, nH = mats('homework').length + asg.length, n = (T.stu[cid] || []).length;
      return `<div class="t-row" data-sid="${s.id}" data-cid="${cid}">
        <div class="t-row-head" aria-expanded="${open}">
          <b class="t-cname">${esc(cl.class_name || cl.class_code || '')}</b>
          <div class="t-sum"><button type="button" class="t-chip" data-t="roster" data-cid="${cid}" data-sid="${s.id}" aria-label="Xem danh sách học viên"><i data-lucide="users"></i>${n} học viên</button><span class="tag t-mode bg-slate-100 text-slate-600">${s.mode === 'online' ? 'Online' : 'Trực tiếp'}</span><span class="tag ${nL ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}">${nL} bài học</span><span class="tag ${nH ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}">${nH} bài tập</span></div></div>
        <div class="t-body" ${open ? '' : 'hidden'}>
          <div class="t-grid t-grid3"><div><h3><i data-lucide="presentation"></i>Bài học</h3>${nL ? mats('lesson').map(m => tMat(m, cid, false)).join('') : '<p class="t-none">Chưa có bài học.</p>'}</div><div><h3><i data-lucide="file-check-2"></i>Bài tập</h3>${nH ? mats('homework').map(m => tMat(m, cid, false)).join('') + asg.map(tAsg).join('') : '<p class="t-none">Chưa có bài tập.</p>'}</div><div><h3><i data-lucide="monitor-play"></i>Slide</h3>${mats('slide').length ? mats('slide').map(m => tMat(m, cid, false)).join('') : '<p class="t-none">Chưa có slide.</p>'}</div></div>
          <div class="t-fields"><label class="t-wide">Ghi chú<textarea class="field" data-f="note" rows="2">${esc(s.note || '')}</textarea></label></div>
        </div></div>`;
    }
    /* Mỗi khung giờ là 1 thẻ: giờ + trạng thái ở trên, mỗi lớp trong khung giờ đó là 1 hàng */
    function tSlots(list) {
      const groups = [];
      list.forEach(s => { const key = hhmm(s.start_time) + '|' + hhmm(s.end_time); let g = groups.find(x => x.key === key); if (!g) { g = { key, s: [] }; groups.push(g); } g.s.push(s); });
      return groups.map(g => {
        const first = g.s[0], same = g.s.every(x => x.status === first.status);
        const label = hhmm(first.start_time) + (first.end_time ? ' – ' + hhmm(first.end_time) : '');
        const mUp = g.s.every(x => x.mode === first.mode);
        return `<section class="card t-slot${mUp ? ' mode-up' : ''}${T.slotOpen.has(g.key) ? ' is-open' : ''}" data-key="${g.key}"><div class="t-slot-head"><div class="t-time">${label}</div>${mUp ? `<span class="tag t-mode-head">${first.mode === 'online' ? 'Online' : 'Trực tiếp'}</span>` : ''}<select class="field t-status" data-st="${same ? first.status : 'mixed'}" data-f="status" data-sids="${g.s.map(x => x.id).join(',')}" aria-label="Trạng thái buổi">${same ? '' : '<option value="" selected disabled>Nhiều trạng thái</option>'}${Object.keys(STATUS).map(k => `<option value="${k}" ${same && k === first.status ? 'selected' : ''}>${STATUS[k][0]}</option>`).join('')}</select><button type="button" class="btn-primary t-save-btn" data-t="sess-save" aria-label="Lưu buổi học" title="Lưu buổi học"><i data-lucide="save" class="w-4 h-4"></i></button></div>${g.s.map(tRow).join('')}</section>`;
      }).join('');
    }
    async function tRoster(cid, sid) {
      const cl = (T.sess.find(s => s.class_id === cid) || {}).classes || {}, list = T.stu[cid] || [];
      const o = document.createElement('div'); o.className = 't-modal';
      o.innerHTML = `<div class="t-modal-box" role="dialog" aria-modal="true" aria-label="Danh sách học viên"><div class="t-modal-head"><h3>${esc(cl.class_name || cl.class_code || '')} · ${list.length} học viên</h3><button type="button" class="t-ic" data-x aria-label="Đóng"><i data-lucide="x"></i></button></div>${list.length ? '<div class="t-roster-cap"><span>Học viên</span><span>Điểm danh</span></div>' : ''}<div class="t-roster">${list.map(x => `<label class="t-ros-row"><span>${esc(x.student_name)}</span><input type="checkbox" class="t-ros-chk" data-stu="${x.id}" aria-label="Điểm danh ${esc(x.student_name)}"></label>`).join('') || '<p class="t-none">Lớp chưa có học viên.</p>'}</div></div>`;
      const key = e => { if (e.key === 'Escape') close(); }, close = () => { document.removeEventListener('keydown', key); o.remove(); };
      o.addEventListener('click', e => { if (e.target === o || e.target.closest('[data-x]')) close(); });
      o.addEventListener('change', async e => {
        const c = e.target.closest('.t-ros-chk'); if (!c) return;
        const stu = Number(c.dataset.stu); c.disabled = true;
        try {
          const r = c.checked ? await S.c.from('attendance').upsert({ session_id: sid, student_id: stu, status: 'present', updated_at: new Date().toISOString() }) : await S.c.from('attendance').delete().eq('session_id', sid).eq('student_id', stu);
          if (r.error) throw r.error;
        } catch (err) { c.checked = !c.checked; LMS.toast('Không lưu được điểm danh'); }
        c.disabled = false;
      });
      document.addEventListener('keydown', key); document.body.appendChild(o); icons();
      if (list.length) { const r = await S.c.from('attendance').select('student_id,status').eq('session_id', sid); (r.data || []).forEach(a => { const c = o.querySelector('.t-ros-chk[data-stu="' + a.student_id + '"]'); if (c && a.status === 'present') c.checked = true; }); }
    }
    function tWeekList(kind) {
      const list = [...T.sess].sort((a, b) => (a.session_date + hhmm(a.start_time)).localeCompare(b.session_date + hhmm(b.start_time)));
      const tdy = ymd(new Date()), days = [...new Set(list.map(s => s.session_date))].sort();
      const icon = kind === 'lesson' ? 'presentation' : 'file-check-2', title = kind === 'lesson' ? 'Bài học' : 'Bài tập';
      const cards = days.map(d => {
        const day = list.filter(s => s.session_date === d), key = kind + d, closed = !T.dayOpenM.has(key);
        const rows = day.map(s => {
          const id = s.class_id, cl = s.classes || {};
          const ms = T.mats.filter(m => (m.kind === kind || (kind === 'lesson' && m.kind === 'slide')) && matFor(m, id, s.session_date));
          const asg = kind === 'homework' ? T.asg.filter(x => x.class_id === id && x.assignments) : [];
          const empty = !ms.length && !asg.length;
          return `<div class="t-class${empty ? ' is-empty' : ''}"><div class="t-class-name"><b>${esc(cl.class_name || cl.class_code || '')}</b><span>${hhmm(s.start_time)}</span></div><div>${empty ? '<p class="t-none">Chưa có.</p>' : ms.map(m => tMat(m, id, false)).join('') + asg.map(tAsg).join('')}</div></div>`;
        }).join('');
        return `<section class="card t-dayc${d === tdy ? ' is-today' : ''}" data-dkey="${key}"><div class="t-dayc-head" aria-expanded="${!closed}"><h2><i data-lucide="calendar-days"></i>${d === tdy ? 'Hôm nay - ' : ''}${fmtDay(d)}</h2><span class="tag bg-slate-100 text-slate-600">${day.length} lớp</span></div><div class="t-dayc-body" ${closed ? 'hidden' : ''}>${rows}</div></section>`;
      }).join('');
      return `<section class="card t-daybar"><h2><i data-lucide="${icon}"></i>${title} các lớp trong tuần</h2></section>${cards || '<section class="card text-center text-sm text-slate-500">Tuần này chưa có buổi học nào.</section>'}`;
    }
    function tPickCard(list) {
      const one = s => {
        const cid = s.class_id, cl = s.classes || {}, nL = T.mats.filter(m => m.kind === 'lesson' && matFor(m, cid, s.session_date)).length;
        const nH = T.mats.filter(m => m.kind === 'homework' && matFor(m, cid, s.session_date)).length + T.asg.filter(x => x.class_id === cid && x.assignments).length;
        const chk = (label, c) => `<div class="t-chk"><span>${label}</span><span class="tag ${c ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">${c ? c + ' tài liệu' : 'Chưa có'}</span></div>`;
        return `<div class="t-pick"><div class="t-next"><b>${esc(cl.class_name || cl.class_code || '')}</b><span>${fmtDay(s.session_date)} · ${hhmm(s.start_time)}</span><span class="t-when">${esc((STATUS[s.status] || [s.status])[0])} · ${s.mode === 'online' ? 'Online' : 'Trực tiếp'} · ${(T.stu[cid] || []).length} học viên</span></div>${chk('Bài học', nL)}${chk('Bài tập', nH)}</div>`;
      };
      return `<section class="card"><div class="t-card-head"><h2><i data-lucide="info"></i>Thông tin buổi học</h2><button type="button" class="t-ic" data-t="pick-clear" aria-label="Xem lớp sắp tới" title="Lớp sắp tới"><i data-lucide="bell"></i></button></div>${list.map(one).join('')}<button type="button" class="t-btn" data-t="pick-open" data-key="${T.pick}">Xem buổi học</button></section>`;
    }
    function tPickModal(key) {
      const list = T.sess.filter(x => x.session_date === T.date && hhmm(x.start_time) === key); if (!list.length) return;
      const keep = T.pick; T.pick = key; let card = tPickCard(list); T.pick = keep;
      card = card.replace(/^<section class="card">/, '').replace(/<\/section>$/, '').replace(/<div class="t-card-head">[\s\S]*?<\/button><\/div>/, '');
      const o = document.createElement('div'); o.className = 't-modal';
      o.innerHTML = `<div class="t-modal-box" role="dialog" aria-modal="true" aria-label="Thông tin buổi học"><div class="t-modal-head"><h3>Thông tin buổi học · ${esc(key)}</h3><button type="button" class="t-ic" data-x aria-label="Đóng"><i data-lucide="x"></i></button></div>${card}</div>`;
      document.body.appendChild(o); icons();
      const kd = e => { if (e.key === 'Escape') close(); }, close = () => { document.removeEventListener('keydown', kd); o.remove(); };
      document.addEventListener('keydown', kd);
      o.addEventListener('click', e => {
        if (e.target === o || e.target.closest('[data-x]')) return close();
        if (e.target.closest('[data-t="pick-open"]')) { close(); T.view = 'day'; T.slotOpen.add(key); T.sess.filter(x => x.session_date === T.date && hhmm(x.start_time) === key).forEach(x => T.open.add(x.id)); drawTeacher(); window.scrollTo(0, 0); }
      });
    }
    function tNextCard() {
      const n = T.next; if (!n) return `<section class="card"><h2><i data-lucide="bell"></i>Lớp sắp tới</h2><div class="text-sm text-slate-500">Chưa có buổi học nào sắp tới.</div></section>`;
      const s = n.s, cl = s.classes || {}, now = new Date(), start = new Date(s.session_date + 'T' + hhmm(s.start_time) + ':00');
      const mins = Math.round((start - now) / 60000), days = Math.round((dOf(s.session_date) - dOf(ymd(now))) / 864e5);
      const when = mins <= 0 ? 'Đang diễn ra' : days === 0 ? 'Hôm nay, còn ' + (mins >= 60 ? Math.floor(mins / 60) + ' giờ ' + (mins % 60 ? mins % 60 + ' phút' : '') : mins + ' phút') : days === 1 ? 'Ngày mai' : 'Còn ' + days + ' ngày';
      const chk = (label, c) => `<div class="t-chk"><span>${label}</span><span class="tag ${c ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">${c ? c + ' tài liệu' : 'Chưa có'}</span></div>`;
      return `<section class="card"><h2><i data-lucide="bell"></i>Lớp sắp tới</h2><div class="t-next"><b>${esc(cl.class_name || cl.class_code || '')}</b><span>${fmtDay(s.session_date)} · ${hhmm(s.start_time)}</span><span class="t-when">${esc(when)}</span></div>${chk('Bài học', n.lessons)}${chk('Bài tập', n.hw)}<button type="button" class="t-btn" data-t="day" data-date="${s.session_date}">Xem buổi học</button></section>`;
    }
    function drawTeacher() {
      const y = window.scrollY, today = ymd(new Date());
      restoreHeaderActions(); document.body.classList.add('student-dashboard-view');
      /* Lúc đang tải lần đầu (T.loading): vẽ khung và menu ngay theo tuần sắp tải, các ô dữ liệu hiện "Đang tải..." */
      const M = T.loading ? T.loadWk : T.monday, LD = '<div class="text-sm text-slate-500">Đang tải...</div>';
      const days = Array.from({ length: 7 }, (_, i) => addDays(M, i)), mon = dOf(M), sun = dOf(days[6]);
      const cnt = k => T.sess.filter(s => s.session_date === k).length;
      const list = T.sess.filter(s => s.session_date === T.date);
      if (T.openFor !== T.date) { T.openFor = T.date; T.open = new Set(); T.slotOpen = new Set(); T.pick = null; }
      const wk = Math.floor((mon - BASE_MONDAY) / 6048e5) + 1;
      const range = `${pad(mon.getDate())}.${pad(mon.getMonth() + 1)} – ${pad(sun.getDate())}.${pad(sun.getMonth() + 1)}.${sun.getFullYear()}`;
      const wkCtl = `<div class="overview-week-controls" role="group" aria-label="Chọn tuần"><button type="button" class="icon-btn" data-t="wk" data-step="-7" aria-label="Tuần trước"><i data-lucide="chevron-left" class="w-4 h-4"></i></button><span class="overview-week-label"><b>Tuần ${pad(wk)}</b><span>${range}</span></span><button type="button" class="icon-btn" data-t="wk" data-step="7" aria-label="Tuần sau"><i data-lucide="chevron-right" class="w-4 h-4"></i></button><button type="button" class="t-thisweek${M === mondayKey(new Date()) ? ' on' : ''}" data-t="today" aria-label="Về tuần hiện tại" title="Tuần hiện tại">Tuần này</button></div>`;
      const titles = { day: 'Lịch dạy', lessons: 'Bài học tuần', submissions: 'Bài nộp', rail: 'Tổng quan' };
      const nav = (k, label, icon, cls = '') => `<button type="button" class="${T.view === k ? 'active' : ''} ${cls}" data-t="view" data-view="${k}" ${T.view === k ? 'aria-current="page"' : ''}><i data-lucide="${icon}"></i><span>${label}</span></button>`;
      const pill = (k, label, icon, cls = '') => `<button type="button" class="t-pill ${T.view === k ? 'on' : ''} ${cls}" data-t="view" data-view="${k}" aria-pressed="${T.view === k}"><i data-lucide="${icon}"></i><span>${label}</span></button>`;
      const pills = `<div class="t-pills" role="group" aria-label="Chọn mục giảng dạy">${pill('day', 'Lịch dạy', 'calendar-days')}${pill('lessons', 'Bài học', 'presentation')}${pill('submissions', 'Bài nộp', 'inbox')}</div>`;
      const gnav = [['index.html#overview', 'Tổng quan', 'layout-dashboard'], ['index.html#schedule', 'Lịch tuần', 'calendar-days'], ['classes.html', 'Lớp học', 'book-open-check'], ['student-list.html', 'Học viên', 'users'], ['teacher.html', 'Giáo viên', 'presentation'], ['parent-list.html', 'Phụ huynh', 'users-round'], ['index.html#lib', 'Học liệu', 'library'], ['tuition.html', 'Học phí', 'wallet']].map(([h, l, ic]) => { const on = l === 'Giáo viên'; return `<button type="button" class="${on ? 'active' : ''}" data-t="go" data-href="${h}" ${on ? 'aria-current="page"' : ''}><i data-lucide="${ic}"></i><span>${l}</span></button>`; }).join('');
      const cal = days.map((k, i) => `<button type="button" class="week-calendar-day${cnt(k) ? ' has-session' : ''}${k === today ? ' today' : ''}${k === T.date ? ' selected' : ''}${T.next && T.next.s && T.next.s.session_date === k ? ' next-day' : ''}" data-t="day" data-date="${k}" aria-label="${fmtDay(k)}, ${cnt(k)} lớp" title="${fmtDay(k)} · ${cnt(k)} lớp"><span>${['T2','T3','T4','T5','T6','T7','CN'][i]}</span><b>${pad(dOf(k).getDate())}</b></button>`).join('');
      const slots = []; list.forEach(x => { const key = hhmm(x.start_time); let g = slots.find(z => z.key === key); if (!g) { g = { key, all: [] }; slots.push(g); } g.all.push(x); });
      const tt = T.loading ? LD : slots.length ?`<div class="t-tt-title">${fmtDay(T.date)}</div>${slots.map(g => `<button type="button" class="t-tt-slot${g.all.every(x => x.status === 'done') ? ' done' : ''}${T.pick === g.key ? ' picked' : ''}" data-t="pick" data-key="${g.key}" aria-pressed="${T.pick === g.key}">${g.key}<span class="t-tt-cls">${g.all.map(x => esc((x.classes && (x.classes.class_name || x.classes.class_code)) || '')).join(' · ')}</span></button>`).join('')}` : `<div class="text-sm text-slate-500">${fmtDay(T.date)}: không có buổi học.</div>`;
      const done = T.sess.filter(s => s.status === 'done').length, left = T.sess.filter(s => s.status === 'planned' || s.status === 'makeup').length;
      const body = T.loading ? `<section class="card t-daybar"><h2><i data-lucide="calendar-days"></i>${fmtDay(T.date)}</h2><span class="tag bg-slate-100 text-slate-600">…</span></section><section class="card text-center text-sm text-slate-500">Đang tải...</section>`
        : T.view === 'rail' ? '' : T.view === 'lessons' ? tWeekList('lesson') : T.view === 'submissions' ? tSubView()
        : `<section class="card t-daybar"><h2><i data-lucide="calendar-days"></i>${fmtDay(T.date)}</h2><span class="tag bg-slate-100 text-slate-600">${list.length} lớp</span></section>${tSlots(list) || '<section class="card text-center text-sm text-slate-500">Không có lớp nào ngày này.</section>'}`;
      const hm = body.match(/^<section class="card t-daybar">[\s\S]*?<\/section>/), head = hm ? hm[0] : '', rest = body.slice(head.length);
      const railBase = `<section class="card"><h2><i data-lucide="bar-chart-3"></i>Tổng kết tuần</h2><div class="t-stats"><div class="t-stat c-all"><b>${T.loading ? '–' : T.sess.length}</b><span>Buổi</span></div><div class="t-stat c-done"><b>${T.loading ? '–' : done}</b><span>Đã dạy</span></div><div class="t-stat c-left"><b>${T.loading ? '–' : left}</b><span>Sắp tới</span></div></div></section>
        <section class="card"><div class="week-calendar-head"><span class="week-calendar-title"><i data-lucide="calendar-days"></i>Thời khóa biểu tuần ${wk}</span><span class="week-calendar-range">${range}</span></div><div class="week-calendar" role="grid" aria-label="Chọn ngày">${cal}</div><div class="t-tt">${tt}</div></section>
        `;
      const rail = railBase + (T.loading ? `<section class="card"><h2><i data-lucide="bell"></i>Lớp sắp tới</h2>${LD}</section>` : T.pick &&slots.find(g => g.key === T.pick) ? tPickCard(slots.find(g => g.key === T.pick).all) : tNextCard());
      $('app').innerHTML = `<div class="student-shell student-shell-inner-tabs"><div class="student-welcome"><div class="student-welcome-left"><a class="logo-home" href="index.html#overview"  aria-label="Về trang tổng quan"><img class="student-welcome-logo" src="logo-wordmark.png" alt="gblearninghub"></a><span class="student-welcome-brand-divider" aria-hidden="true"></span></div><div class="student-welcome-title"><h1>${titles[T.view]}</h1><p>Khu vực giảng dạy</p></div><div class="student-welcome-right"><div class="student-welcome-actions">${wkCtl}</div><div class="student-welcome-tools"></div></div></div>
        <aside class="student-sidebar" aria-label="Điều hướng giáo viên"><div class="student-brand"><a class="logo-home" href="index.html#overview"  aria-label="Về trang tổng quan"><img src="logo-wordmark.png" alt="gblearninghub"></a></div><nav class="student-nav t-gnav">${gnav}</nav></aside>
        <div class="student-workspace"><section class="student-main" aria-label="Nội dung giảng dạy"><div class="t-stick">${pills}${head}<div class="m-week">${wkCtl}</div></div><div class="student-main-content t-content">${T.view === 'rail' ? `<div class="t-rail t-rail-m">${railBase}</div>` : rest}</div></section><aside class="student-rail t-rail" aria-label="Tổng kết và lịch tuần">${rail}</aside></div></div>`;
      const tools = document.querySelector('.student-welcome-tools');
      if (tools) ['btn-home', 'btn-mode', 'btn-theme'].forEach(id => { const el = $(id); if (el) tools.appendChild(el); });
      { const th = $('btn-theme'); if (th) th.hidden = T.on; }
      icons(); window.scrollTo(0, y);
      { const g = document.querySelector('.t-gnav'), ac = g && g.querySelector('.active'); if (g && ac) g.scrollLeft = ac.offsetLeft - (g.clientWidth - ac.offsetWidth) / 2; }
    }
    async function renderTeacher(dateArg) {
      const redraw = !!$('app').querySelector('.t-content'); T.on = true; if (!redraw) restoreHeaderActions();
      $('hello').textContent = 'Giáo viên'; $('hello-sub').textContent = 'Khu vực giảng dạy'; document.title = 'Giáo viên | gblearning';
      ['btn-class', 'btn-back'].forEach(id => $(id).classList.add('hidden')); $('btn-home').classList.remove('hidden');
      try {
        T.date = /^\d{4}-\d{2}-\d{2}$/.test(dateArg || '') ? dateArg : ymd(new Date());
        const wk = mondayKey(dOf(T.date));
        /* Lần mở đầu: hiện ngay menu và khung trang như các trang quản lý, dữ liệu điền vào khi tải xong */
        if (!$('app').querySelector('.t-content')) { T.loading = true; T.loadWk = wk; bindTeacher(); drawTeacher(); }
        /* Tải lịch tuần song song với kiểm tra quyền, không chờ nhau */
        let pre = null;
        if (!T.authed) { pre = loadTeacherWeek(wk).catch(() => {}); await LMS.requireTeacher(); T.authed = true; }
        await (pre || loadTeacherWeek(wk));
        if (T.monday !== wk) await loadTeacherWeek(wk);
        if (T.view === 'submissions') await loadSubs();
        T.loading = false; bindTeacher(); drawTeacher(); prefetchWeeks(T.monday);
        /* Thẻ "lớp sắp tới" tải sau, xong thì vẽ lại, không giữ chậm cả trang */
        if (Date.now() - T.nextAt >= 60000) loadNext().then(() => { if (T.on && $('app').querySelector('.t-content')) drawTeacher(); });
      } catch (e) { T.loading = false; showError(errText(e)); }
    }
    async function tRefresh() { await Promise.all([loadTeacherWeek(T.monday, true), loadNext()]); if (T.view === 'submissions') await loadSubs(); drawTeacher(); }
    function tToggle(sid) {
      const card = $('app').querySelector('.t-row[data-sid="' + sid + '"]'); if (!card) return;
      const body = card.querySelector('.t-body'), btn = card.querySelector('.t-row-head'), open = body.hidden;
      body.hidden = !open; btn.setAttribute('aria-expanded', String(open)); open ? T.open.add(Number(sid)) : T.open.delete(Number(sid));
    }
    function bindTeacher() {
      if (T.bound) return; T.bound = true;
      const app = $('app');
      app.addEventListener('click', async e => {
        if (!T.on) return;
        const sx = e.target.closest('.t-sub-head, .t-bar');
        if (sx) { const c = sx.closest('.t-sub'), body = c.querySelector('.t-sub-body'), open = body.hidden, k = c.dataset.aid; body.hidden = !open; c.querySelector('.t-sub-head').setAttribute('aria-expanded', String(open)); open ? T.subOpen.add(k) : T.subOpen.delete(k); return; }
        const dh = e.target.closest('.t-dayc-head');
        if (dh) { const c = dh.closest('.t-dayc'), body = c.querySelector('.t-dayc-body'), open = body.hidden; body.hidden = !open; dh.setAttribute('aria-expanded', String(open)); open ? (T.dayClosed.delete(c.dataset.dkey), T.dayOpenM.add(c.dataset.dkey)) : (T.dayClosed.add(c.dataset.dkey), T.dayOpenM.delete(c.dataset.dkey)); return; }
        const sh = e.target.closest('.t-slot-head');
        if (sh && !e.target.closest('select, a, input, textarea, button')) { const rows = [...sh.closest('.t-slot').querySelectorAll('.t-row')], anyOpen = rows.some(r => !r.querySelector('.t-body').hidden); rows.forEach(r => { const open = !r.querySelector('.t-body').hidden; if (open === anyOpen) tToggle(r.dataset.sid); }); return; }
        const head = e.target.closest('.t-row-head');
        if (head && !e.target.closest('select, a, input, textarea, [data-t]:not([data-t="toggle"])')) { tToggle(head.closest('.t-row').dataset.sid); return; }
        const b = e.target.closest('[data-t]'); if (!b || b.tagName === 'FORM' || b.tagName === 'INPUT') return;
        const k = b.dataset.t;
        if (T.loading && k !== 'go') return; /* đang tải lần đầu: chỉ cho bấm menu chuyển trang */
        try {
          if (k === 'toggle') tToggle(b.dataset.sid);
          else if (k === 'pick') { if (matchMedia('(max-width:780px)').matches) tPickModal(b.dataset.key); else { T.pick = T.pick === b.dataset.key ? null : b.dataset.key; drawTeacher(); } }
          else if (k === 'pick-clear') { T.pick = null; drawTeacher(); }
          else if (k === 'pick-open') { T.view = 'day'; T.slotOpen.add(b.dataset.key); T.sess.filter(x => x.session_date === T.date && hhmm(x.start_time) === b.dataset.key).forEach(x => T.open.add(x.id)); drawTeacher(); window.scrollTo(0, 0); }
          else if (k === 'roster') tRoster(Number(b.dataset.cid), Number(b.dataset.sid));
          else if (k === 'view') { T.view = b.dataset.view; if (T.view === 'submissions') { drawTeacher(); await loadSubs(); } drawTeacher(); window.scrollTo(0, 0); }
          else if (k === 'go') { document.documentElement.classList.add('lms-leaving'); location.href = b.dataset.href; }
          else if (k === 'grade') { await tGrade(Number(b.dataset.aid), Number(b.dataset.stid)); }
          else if (k === 'sub-refresh') { await loadSubs(); drawTeacher(); LMS.toast('Đã tải lại bài nộp'); }
          else if (k === 'day') { const d = b.dataset.date; if (T.view !== 'rail') T.view = 'day'; if (mondayKey(dOf(d)) === T.monday) { T.date = d; history.replaceState(null, '', '#' + d); drawTeacher(); } else location.hash = '#' + d; }
          else if (k === 'wk') { location.hash = '#' + addDays(T.date, Number(b.dataset.step)); }
          else if (k === 'today') { location.hash = '#' + ymd(new Date()); }
          else if (k === 'sess-save') {
            for (const row of b.closest('.t-slot').querySelectorAll('.t-row')) {
              const id = Number(row.dataset.sid), patch = { note: row.querySelector('[data-f="note"]').value.trim() || null };
              const r = await S.c.from('sessions').update(patch).eq('id', id); if (r.error) throw r.error;
              const x = T.sess.find(y => y.id === id); if (x) Object.assign(x, patch);
            }
            LMS.toast('Đã lưu buổi học');
          }
          else if (k === 'mat-edit') {
            const m = T.mats.find(x => x.id === Number(b.dataset.id)); if (!m) return;
            const q = b.closest('.t-grid > div').querySelector('.t-form').elements;
            q.id.value = m.id; q.title.value = m.title; q.url.value = m.url; q.title.focus();
          }
          else if (k === 'mat-del') {
            const m = T.mats.find(x => x.id === Number(b.dataset.id)), cid = Number(b.dataset.cid); if (!m) return;
            if (!await LMS.confirm('Xóa "' + m.title + '" khỏi lớp này?')) return;
            const rest = (m.class_ids || []).filter(x => x !== cid);
            const r = rest.length ? await S.c.from('week_materials').update({ class_ids: rest }).eq('id', m.id) : await S.c.from('week_materials').delete().eq('id', m.id);
            if (r.error) throw r.error; await tRefresh();
          }
        } catch (err) { LMS.alert(errText(err)); }
      });
      app.addEventListener('change', async e => {
        const sel = T.on && e.target.closest('select[data-f="status"]'); if (!sel) return;
        try {
          if (!sel.value) return;
          const ids = sel.dataset.sids.split(',').map(Number), r = await S.c.from('sessions').update({ status: sel.value }).in('id', ids); if (r.error) throw r.error;
          T.sess.forEach(x => { if (ids.includes(x.id)) x.status = sel.value; });
          LMS.toast('Đã cập nhật trạng thái'); await loadNext(); drawTeacher();
        } catch (err) { LMS.alert(errText(err)); }
      });
      app.addEventListener('submit', async e => {
        const f = e.target.closest('[data-t="mat-form"]'); if (!T.on || !f) return; e.preventDefault();
        try {
          const q = f.elements, id = q.id.value ? Number(q.id.value) : null, title = q.title.value.trim(), url = q.url.value.trim(); if (!title || !url) return;
          let r;
          if (id) r = await S.c.from('week_materials').update({ title, url }).eq('id', id);
          else r = await S.c.from('week_materials').insert({ week_start: T.monday, kind: f.dataset.kind, title, url, class_ids: [Number(f.dataset.cid)], sort_order: T.mats.reduce((n, m) => Math.max(n, m.sort_order || 0), 0) + 1 });
          if (r.error) throw r.error; await tRefresh();
        } catch (err) { LMS.alert(errText(err)); }
      });
    }

    function route() {
      const parts = location.hash.replace(/^#/, '').split('/').map(decodeURIComponent);
      return renderTeacher(parts[0] === 'teacher' ? parts[1] : parts[0]);
    }
    function boot() {
      icons(); S.c = LMS.client();
      if (!S.c) return showError('Không tải được thư viện kết nối. Kiểm tra mạng rồi tải lại trang.');
      window.addEventListener('hashchange', route);
      route();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

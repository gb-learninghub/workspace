  (function () {
    'use strict';
    const $ = id => document.getElementById(id), esc = LMS.esc, icons = () => { if (window.lucide) lucide.createIcons(); };
    const DAY = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const BASE_MONDAY = new Date(2026, 8, 7);
    const tuiTone = st => st === 'Đã đóng' ? 'bg-emerald-50 text-emerald-700' : st === 'Chưa đóng' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600';
    const STATUS = { planned: ['Sắp tới', 'bg-slate-100 text-slate-600'], done: ['Đã học', 'bg-emerald-50 text-emerald-700'], cancel: ['Hủy', 'bg-rose-50 text-rose-700'],
      makeup: ['Học bù', 'bg-sky-50 text-sky-700'], holiday: ['Nghỉ lễ', 'bg-slate-100 text-slate-600'] };
    const pad = n => String(n).padStart(2, '0');
    const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const dOf = k => new Date(k + 'T00:00:00');
    const dayCols = k => { const d = dOf(k); return '<strong class="c-day">' + DAY[d.getDay()] + '</strong><strong class="c-date">' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '</strong>'; };
    const fmtDay = k => { const d = dOf(k); return DAY[d.getDay()] + ', ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
    const isHttp = u => /^https?:\/\//i.test(u || '');
    const tmr = s => (matchMedia('(min-width:1200px)').matches && s.end) ? s.start + ' – ' + s.end : s.start;
    const sessState = (s, n) => { const k = ymd(n), h = pad(n.getHours()) + ':' + pad(n.getMinutes()); if (s.date < k || (s.date === k && h >= s.end)) return 'past'; if (s.date === k && h >= s.start) return 'live'; return 'soon'; };
    const S = { c: null, code: '', data: null, a: null, answers: {}, t0: 0, busy: false, materialWeek: '', materialWeeks: [], calendarMonth: '', calendarDate: '', calWeek: '', view: 'overview', historyLimit: 10, tuitionHistory: null, tuitionHistoryLoading: false };

    function mondayKey(d) { const dow = d.getDay() === 0 ? 6 : d.getDay() - 1; return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow)); }
    function errText(e) {
      const m = (e && e.message) || '';
      if (/student_not_found/.test(m)) return 'Mã học viên chưa đúng hoặc đã bị tạm ngưng. Hỏi lại giáo viên để lấy link mới.';
      if (/assignment_not_found/.test(m)) return 'Bài này hiện không mở.';
      return LMS.friendlyError(e);
    }
    function restoreHeaderActions() { const tools = document.querySelector('.header-tools'); if (tools) ['btn-home','btn-class','btn-mode','btn-theme'].forEach(id => { const el = $(id); if (el) tools.appendChild(el); }); document.body.classList.remove('student-dashboard-view'); }
    function showError(msg) { restoreHeaderActions(); $('app').innerHTML = `<div class="narrow"><div class="card text-center"><p class="text-sm text-rose-700">${esc(msg)}</p></div></div>`; $('hello').textContent = 'gblearning'; $('hello-sub').textContent = ''; }

    /* ---------- Trang chính ---------- */
    const dayTag = ds => { const l = (ds || []).slice().sort().map(k => { const d = dOf(k); return (d.getDay() === 0 ? 'CN' : 'T' + (d.getDay() + 1)) + ' ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1); }); return l.length ? `<span class="tag bg-slate-100 text-slate-600" style="margin-left:auto;flex:none">${l.join(', ')}</span>` : ''; };
    function linksBlock(items, label, icon) {
      const list = (items || []).filter(x => x && (x.url || x.title));
      if (!list.length) return '';
      return list.map((x, i) => isHttp(x.url)
        ? `<a class="row" href="${esc(LMS.withStudent(x.url, S.code))}" style="text-decoration:none;color:var(--t-primary);font-weight:700;min-height:48px"><i data-lucide="${icon}" class="w-4 h-4"></i><span style="overflow-wrap:anywhere">${esc(x.title || label + ' ' + (i + 1))}</span>${dayTag(x.dates)}<i data-lucide="arrow-up-right" class="w-4 h-4" style="margin-left:${(x.dates || []).length ? '6px' : 'auto'}"></i></a>`
        : `<div class="row"><span>${esc(x.title || label + ' ' + (i + 1))}</span></div>`).join('');
    }

    const toMin = hm => { const [h, m] = String(hm).split(':').map(Number); return h * 60 + m; };
    const hm = n => { n = Math.max(0, n); return pad(Math.floor(n / 60)) + ':' + pad(n % 60); };
    function renderHome() {
      const d = S.data, cls = d.class, now = new Date(), todayKey = ymd(now), nowHM = pad(now.getHours()) + ':' + pad(now.getMinutes());
      document.body.classList.add('student-dashboard-view');
      $('hello').textContent = 'Xin chào, ' + d.student_name; document.title = 'Student Portal - ' + d.student_name; $('hello-sub').textContent = cls ? 'Lớp ' + cls.name : 'Chưa xếp lớp';
      $('btn-back').classList.add('hidden');
      if (!cls) { restoreHeaderActions(); $('app').innerHTML = '<div class="card text-sm text-slate-600">Bạn chưa được xếp lớp. Hỏi giáo viên nhé.</div>'; return; }
      const sess = d.sessions || [];
      const joinOpen = s => s.mode === 'online' && isHttp(d.meet_url) && s.status !== 'cancel' && s.status !== 'holiday' && s.date === todayKey
        && nowHM >= hm(toMin(s.start) - 15) && nowHM < s.end;
      const joinBtn = k => k === 'solid'
        ? `<a class="hero-btn solid" href="${esc(d.meet_url)}" target="_blank" rel="noopener" aria-label="Mở Google Meet" title="Vào lớp online"><i data-lucide="video" class="w-4 h-4"></i><span>Meet</span></a>`
        : `<a class="tag bg-sky-600 text-white" href="${esc(d.meet_url)}" target="_blank" rel="noopener" aria-label="Mở Google Meet" style="text-decoration:none;min-height:36px;display:inline-flex;align-items:center;gap:6px;font-weight:700"><i data-lucide="video" class="w-3.5 h-3.5"></i><span>Meet</span></a>`;
      const next = sess.find(s => (s.status === 'planned' || s.status === 'makeup') && (s.date > todayKey || (s.date === todayKey && s.end > nowHM)));
      if (!S.calendarMonth) S.calendarMonth = `${now.getFullYear()}-${pad(now.getMonth()+1)}`;
      if (!S.calendarDate) S.calendarDate = todayKey;
      const done = sess.filter(s => s.status === 'done' || s.status === 'makeup'), absent = sess.filter(s => s.attendance === 'absent').length;
      const past = sess.filter(s => s.date <= todayKey && s.status !== 'planned').slice().reverse();
      const weeks = (d.week_links || []).filter(w => (w.lessons || []).length || (w.homeworks || []).length).slice().reverse();

      const isAll = /^00\./.test((cls && cls.class_code) || ''), PNAME = { ielts: 'IE', toeic: 'TO', ac12: 'AC12', gs: 'GS', comm: 'GT' }, prog = isAll ? (S.demoProg || 'gs') : (d.program || 'gs');
      window.__demoProg = v => { S.demoProg = v; renderHome(); };
      const titleCaseName = value => String(value || '').toLocaleLowerCase('vi').replace(/(^|\s)(\p{L})/gu, (_, space, letter) => space + letter.toLocaleUpperCase('vi'));
      const attP = sess.filter(x => x.attendance === 'present' || x.attendance === 'late').length, attA = sess.filter(x => x.attendance === 'absent').length, attRate = (attP + attA) ? Math.round(attP * 100 / (attP + attA)) : null;
      const attTag = x => x.attendance === 'present' ? '<span class="tag bg-emerald-50 text-emerald-700 inline-flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i><span>Có mặt</span></span>' : x.attendance === 'late' ? '<span class="tag bg-amber-50 text-amber-700 inline-flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5"></i><span>Trễ</span></span>' : x.attendance === 'absent' ? '<span class="tag bg-rose-50 text-rose-700 inline-flex items-center gap-1"><i data-lucide="x" class="w-3.5 h-3.5"></i><span>Vắng</span></span>' : '';
      const miniProfile = `<div class="m-profile"><span class="m-av" aria-hidden="true"><i data-lucide="user-round"></i></span><span class="m-pi"><b>${esc(titleCaseName(d.student_name))}</b><span><em>${esc(cls.name)}</em><i>${esc(S.code)}</i></span></span></div>`;
      const profileHtml = `<section class="card profile-card g-profile"><div class="profile-avatar" aria-hidden="true"><i data-lucide="user-round"></i></div><div class="profile-info"><span class="profile-class">${esc(cls.name)}</span><h2 class="profile-name" data-student-name="${esc(titleCaseName(d.student_name))}">${esc(d.student_name)}</h2><div class="profile-meta"><span class="profile-code">${esc(S.code)}</span></div></div></section>`;
      const heroHtml = `<section class="card hero-card g-hero" style="color:#fff">
        <div class="hero-lab"><i data-lucide="calendar-days" class="w-4 h-4"></i>Buổi học tiếp theo</div>
        <div class="hero-next-time"><div class="text-xl font-extrabold">${next ? fmtDay(next.date) : 'Chưa có lịch'}</div>
        <div class="text-sm mt-2" style="opacity:.9;display:flex;align-items:center;gap:6px">${next ? '<i data-lucide="clock" class="w-4 h-4"></i>' + tmr(next) : ''}</div></div>
        <div class="hero-actions">
          ${next ? (next.mode === 'online' ? (joinOpen(next) ? joinBtn('solid') : `<span class="hero-btn ghost" title="Link mở trước 15 phút" style="opacity:.9;white-space:nowrap"><i data-lucide="video" class="w-4 h-4"></i><span>Meet</span></span>`) : `<span class="hero-btn ghost" style="opacity:.9" title="Học trực tiếp" aria-label="Học trực tiếp"><i data-lucide="map-pin" class="w-4 h-4"></i><span>Học trực tiếp</span></span>`) : ''}
          ${isHttp(cls.drive_url) ? `<a class="hero-btn ghost" href="${esc(cls.drive_url)}" target="_blank" rel="noopener" title="Drive bài giảng" aria-label="Drive bài giảng"><i data-lucide="folder" class="w-4 h-4"></i><span>Drive</span></a>` : ''}
        </div></section>`;

      const selWk = S.materialWeek || mondayKey(now), selWkEnd = (() => { const x = dOf(selWk); x.setDate(x.getDate() + 6); return ymd(x); })(), selMonth = selWkEnd.slice(0, 7);
      const sessUp = sess.filter(x => x.date <= selWkEnd), doneUp = sessUp.filter(x => x.status === 'done' || x.status === 'makeup').length, absentUp = sessUp.filter(x => x.attendance === 'absent').length;
      const owedUp = Math.max(0, sessUp.filter(x => x.status === 'cancel').length - sessUp.filter(x => x.status === 'makeup').length);
      const asgAll = (d.assignments || []).filter(a => (a.week_start ? mondayKey(dOf(a.week_start)) : mondayKey(now)) <= selWk), asgDone = asgAll.filter(a => a.attempts).length;
      const infoHtml = `<section class="card g-info"><h2><i data-lucide="bar-chart-3"></i>Thông tin học tập</h2>
        <div class="stat-grid">
          <div class="stat s0"><i data-lucide="calendar-check"></i><div><b>${doneUp}</b><span>Buổi đã học</span></div></div>
          <div class="stat s1"><i data-lucide="calendar-x"></i><div><b>${absentUp}</b><span>Buổi vắng</span></div></div>
          ${d.tuition_mode === 'session' ? `<div class="stat s2"><i data-lucide="clock"></i><div><b>${sessUp.filter(x => x.status === 'done' && String(x.date).startsWith(selMonth)).length}</b><span>Buổi tháng này</span></div></div>` : `<div class="stat s2"><i data-lucide="clock"></i><div><b>${owedUp}</b><span>Buổi nợ</span></div></div>`}
          <div class="stat s3"><i data-lucide="clipboard-list"></i><div><b>${asgDone}/${asgAll.length}</b><span>Bài đã làm</span></div></div>
        </div></section>`;

      const [calYear, calMonth] = S.calendarMonth.split('-').map(Number), monthKey = S.calendarMonth;
      const firstDay = new Date(calYear, calMonth - 1, 1), gridStart = new Date(calYear, calMonth - 1, 1 - ((firstDay.getDay() + 6) % 7));
      const monthSessions = sess.filter(s => s.date.startsWith(monthKey) && !['cancel', 'holiday'].includes(s.status));
      const sessionsByDay = {}; monthSessions.forEach(s => (sessionsByDay[s.date] = sessionsByDay[s.date] || []).push(s));
      Object.values(sessionsByDay).forEach(a => a.sort((x, y) => x.start.localeCompare(y.start)));
      const calendarDays = Array.from({ length: 42 }, (_, i) => { const date = new Date(gridStart); date.setDate(gridStart.getDate() + i); const key = ymd(date), daySessions = sessionsByDay[key] || [], inMonth = date.getMonth() === calMonth - 1, selected = key === S.calendarDate, today = key === todayKey; const tip = daySessions.map(s => `${tmr(s)}${s.lesson ? ' · ' + s.lesson : ''}`).join(' | '); return `<button type="button" class="month-day${inMonth ? '' : ' outside'}${daySessions.length ? ' has-session' : ''}${today ? ' today' : ''}${selected ? ' selected' : ''}" data-calendar-day="${key}" ${!inMonth ? 'disabled' : ''} aria-label="${key}${daySessions.length ? ', có buổi học' : ''}" title="${esc(tip || key)}">${date.getDate()}</button>`; }).join('');
      const selectedSessions = sessionsByDay[S.calendarDate] || [];
      const sessionDetails = daySessions => daySessions.length ? daySessions.map(s => { const st = STATUS[s.status] || STATUS.planned; const lesson = String(s.lesson || '').trim(); return `<div class="month-session"><div class="month-session-top"><strong class="text-xs text-slate-700">${tmr(s)}</strong>${lesson ? `<span class="text-xs text-slate-600" style="overflow-wrap:anywhere">${esc(lesson)}</span>` : ''}</div><div class="month-session-meta"><span class="tag ${st[1]}">${st[0]}</span>${attTag(s)}${s.mode === 'online' ? (joinOpen(s) ? joinBtn('row') : '<span class="tag bg-sky-50 text-sky-700 inline-flex items-center gap-1"><i data-lucide="video" class="w-3.5 h-3.5"></i><span>Meet</span></span>') : '<span class="tag bg-slate-100 text-slate-600">Trực tiếp</span>'}</div></div>`; }).join('') : '<div class="text-sm text-slate-500">Ngày này không có buổi học.</div>';
      const monthDetails = sessionDetails(selectedSessions);
      const schedHtml = `<section class="card g-sched" id="student-calendar"><div class="month-head"><div class="month-caption">Lịch học tháng</div><div class="month-controls"><button type="button" class="month-nav" data-calendar-step="-1" aria-label="Tháng trước"><i data-lucide="chevron-left" class="w-5 h-5"></i></button><span class="month-title">${new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(firstDay)}</span><button type="button" class="month-nav" data-calendar-step="1" aria-label="Tháng sau"><i data-lucide="chevron-right" class="w-5 h-5"></i></button></div></div><div class="month-calendar" role="grid" aria-label="Lịch học tháng ${pad(calMonth)}/${calYear}">${['T2','T3','T4','T5','T6','T7','CN'].map(x => `<div class="month-weekday" role="columnheader">${x}</div>`).join('')}${calendarDays}</div><div class="month-detail"><div class="text-xs font-bold text-slate-700 mb-2">${fmtDay(S.calendarDate)}</div>${monthDetails}</div></section>`;
      const curWeekKey = mondayKey(now), weekStartKey = S.calWeek || curWeekKey, weekStartDate = dOf(weekStartKey), weekDays = Array.from({length:7}, (_, i) => { const date = new Date(weekStartDate); date.setDate(date.getDate() + i); return ymd(date); });
      const weekSessionsByDay = {}; sess.filter(s => weekDays[0] <= s.date && s.date <= weekDays[6] && !['cancel','holiday'].includes(s.status)).forEach(s => (weekSessionsByDay[s.date] = weekSessionsByDay[s.date] || []).push(s));
      Object.values(weekSessionsByDay).forEach(a => a.sort((x, y) => x.start.localeCompare(y.start)));
      const weekSelectedDate = weekDays.includes(S.calendarDate) ? S.calendarDate : (weekDays.includes(todayKey) ? todayKey : (weekDays.find(k => (weekSessionsByDay[k] || []).length) || weekDays[0]));
      const weekCalendarDays = weekDays.map((key, i) => { const date = dOf(key), has = (weekSessionsByDay[key] || []).length > 0, selected = key === weekSelectedDate, today = key === todayKey; return `<button type="button" class="week-calendar-day${has ? ' has-session' : ''}${today ? ' today' : ''}${selected ? ' selected' : ''}" data-calendar-day="${key}" aria-label="${fmtDay(key)}${has ? ', có buổi học' : ''}" title="${fmtDay(key)}"><span>${['T2','T3','T4','T5','T6','T7','CN'][i]}</span><b>${pad(date.getDate())}</b></button>`; }).join('');
      const weekEndDate = dOf(weekDays[6]), weekRange = `${pad(weekStartDate.getDate())}.${pad(weekStartDate.getMonth()+1)} – ${pad(weekEndDate.getDate())}.${pad(weekEndDate.getMonth()+1)}.${weekEndDate.getFullYear()}`;
      const sessKeys = sess.map(x => mondayKey(dOf(x.date))).concat(curWeekKey), minWk = sessKeys.reduce((a, b) => a < b ? a : b), maxWk = sessKeys.reduce((a, b) => a > b ? a : b), isCurWk = weekStartKey === curWeekKey;
      const weekSchedHtml = `<section class="card g-week-sched"><div class="week-calendar-head"><span class="week-calendar-title"><i data-lucide="calendar-days"></i>Lịch tuần</span><span class="overview-week-controls" style="margin:0"><button type="button" class="icon-btn" data-cal-week="-1" aria-label="Tuần trước" ${weekStartKey <= minWk ? 'disabled' : ''}><i data-lucide="chevron-left" class="w-4 h-4"></i></button><span class="week-calendar-range" title="${weekRange}">Tuần ${pad(1 + Math.round((new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate()) - BASE_MONDAY) / (7 * 864e5)))}</span><button type="button" class="icon-btn" data-cal-week="1" aria-label="Tuần sau" ${weekStartKey >= maxWk ? 'disabled' : ''}><i data-lucide="chevron-right" class="w-4 h-4"></i></button><button type="button" class="t-thisweek${isCurWk ? ' on' : ''}" data-cal-week="0" aria-label="Về tuần hiện tại" ${isCurWk ? 'disabled aria-current="true"' : ''}>Tuần này</button></span></div><div class="week-calendar" role="grid" aria-label="Lịch học tuần này">${weekCalendarDays}</div><div class="month-detail"><div class="text-xs font-bold text-slate-700 mb-2">${fmtDay(weekSelectedDate)}</div>${sessionDetails(weekSessionsByDay[weekSelectedDate] || [])}</div></section>`;

      const asg = d.assignments || [];
      const resBtn = a => (a.kind === 'homework' && a.attempts) ? `<button type="button" class="icon-btn" data-res="${esc(a.code)}" aria-label="Kết quả" title="Kết quả"><i data-lucide="clipboard-check" class="w-4 h-4"></i></button>` : '';
      if (!window.__resBind) {
        window.__resBind = 1;
        const gm = d2 => { const x = new Date(d2); return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0') + ' ' + String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
        const closeRes = () => { const m = document.getElementById('res-modal'); if (m) m.remove(); };
        const showRes = html => {
          closeRes();
          const m = document.createElement('div'); m.id = 'res-modal';
          m.style.cssText = 'position:fixed;inset:0;z-index:80;background:rgba(22,24,29,.5);display:flex;align-items:center;justify-content:center;padding:16px';
          m.innerHTML = `<div role="dialog" aria-modal="true" style="background:#fff;border:1px solid #E4E6EA;border-radius:18px;width:min(640px,100%);max-height:85dvh;overflow:auto;padding:18px 20px;color:#1B1D22">${html}</div>`;
          m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-res-close]')) closeRes(); });
          document.body.appendChild(m);
          if (window.lucide) window.lucide.createIcons();
        };
        const head = (t, sub) => `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span style="display:inline-flex;align-items:center;gap:8px;background:#F4F5F7;border-radius:999px;padding:6px 14px;font-weight:700;font-size:15px"><i data-lucide="clipboard-check" class="w-4 h-4"></i>${esc(t)}</span><span style="flex:1"></span><button type="button" data-res-close class="icon-btn" aria-label="Đóng" title="Đóng"><i data-lucide="x" class="w-4 h-4"></i></button></div>${sub ? `<div style="font-size:13px;color:#6b7280;margin-bottom:10px">${sub}</div>` : ''}`;
        const ans = v => Array.isArray(v) ? v.join(' / ') : (v == null ? '' : String(v));
        document.addEventListener('click', async ev => {
          const b = ev.target.closest('[data-res]'); if (!b) return;
          showRes(head('Kết quả', 'Đang tải...'));
          try {
            const r = await S.c.rpc('student_results', { p_student_code: S.code, p_assignment_code: b.getAttribute('data-res') });
            if (r.error) throw r.error;
            const x = r.data || {};
            if (!x.ok) { showRes(head('Kết quả', 'Bài này chưa có kết quả để xem.')); return; }
            let h = head(x.name || 'Kết quả', x.due_at ? 'Hạn nộp ' + gm(x.due_at) : '');
            if (x.locked) h += `<div style="background:#F4F5F7;border-radius:14px;padding:12px 14px;font-size:14px">Đáp án và giải thích sẽ hiện sau hạn nộp (${gm(x.due_at)}).</div>`;
            else (x.parts || []).forEach(pt => {
              const it = (pt.results && pt.results.items) || [];
              h += `<div style="margin:14px 0 6px;font-weight:700;font-size:14px">${esc(pt.name || ('Part ' + pt.part))} · ${pt.results ? pt.results.correct + '/' + pt.results.total : ''}${pt.late ? ' · nộp trễ' : ''}</div>`;
              h += it.map(q => { const n = String(q.id || '').replace(/^q/, ''); const ok = !!q.correct;
                return `<div style="border-top:1px solid #E4E6EA;padding:8px 0;font-size:14px;overflow-wrap:anywhere"><b>Câu ${esc(n)}</b> · <span style="color:${ok ? '#15803d' : '#b91c1c'};font-weight:700">${ok ? 'Đúng' : 'Sai'}</span> · Bạn chọn: ${esc(q.given || '(bỏ trống)')}${ok ? '' : `<div>Đáp án: <b>${esc(ans(q.answer))}</b></div>`}${q.explanation ? `<div style="color:#4b5563;margin-top:2px">${esc(q.explanation)}</div>` : ''}</div>`; }).join('');
            });
            (x.writing || []).forEach(w => {
              h += `<div style="margin:14px 0 6px;font-weight:700;font-size:14px">Writing · Task ${esc(w.part)} · ${esc(w.word_count || 0)} từ${w.late ? ' · nộp trễ' : ''}</div>`;
              h += w.reviewed ? `<div style="background:#F4F5F7;border-radius:14px;padding:12px 14px;font-size:14px">${w.band != null ? `<div style="margin-bottom:6px"><b>Band ${esc(w.band)}</b></div>` : ''}<div style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(w.feedback || '')}</div></div>` : `<div style="font-size:14px;color:#6b7280">Giáo viên chưa chấm bài này.</div>`;
              h += `<details style="margin-top:8px"><summary style="cursor:pointer;font-size:13px;color:#6b7280">Bài viết của bạn</summary><div style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px;margin-top:6px">${esc(w.body || '')}</div></details>`;
            });
            if (!x.locked && !(x.parts || []).length && !(x.writing || []).length) h += '<div style="font-size:14px;color:#6b7280">Chưa có bài nộp.</div>';
            showRes(h);
          } catch (e) { showRes(head('Kết quả', 'Không tải được kết quả. Thử lại sau.')); }
        });
      }
      const asgRow = a => {
        const due = a.due_at ? new Date(a.due_at) : null, late = due && due < now;
        const cell = (l, v) => `<div class="asg-cell"><span>${l}</span><b>${v}</b></div>`;
        const multi = a.kind === 'homework' && a.parts_total > 1, partsDone = a.parts_done || 0;
        const cells = [
          a.question_count ? cell('Số câu', a.question_count) : '',
          cell('Trạng thái', a.attempts ? `Đã làm ${a.attempts} lần` : 'Chưa làm'),
          a.first_score != null ? cell('Điểm lần đầu', `${a.first_score}/${a.first_total || a.question_count}`) : '',
          multi ? cell('Đã nộp', `${partsDone}/${a.parts_total} phần`) : '',
          due ? cell('Hạn', pad(due.getDate()) + '/' + pad(due.getMonth() + 1) + (late ? ' <i class="asg-late">quá hạn</i>' : '')) : ''
        ].join('');
        const bandNote = multi ? `<div class="asg-note">${partsDone < a.parts_total ? 'Hoàn thành đủ các phần để quy đổi band' : 'Đã đủ phần để quy đổi band'}</div>` : '';
        return `<div class="row"><div style="flex:1 1 200px;min-width:0"><div class="font-bold text-slate-800" style="overflow-wrap:anywhere">${esc(a.name)}</div>
          <div class="asg-meta">${cells}</div>${bandNote}</div>
          ${dayTag(a.session_dates)}${resBtn(a)}${a.page_path ? `<a class="icon-btn" href="${esc(LMS.withStudent(new URL(a.page_path, location.href).href, S.code))}" aria-label="${a.attempts ? 'Làm lại' : 'Làm bài'}" title="${a.attempts ? 'Làm lại' : 'Làm bài'}"><i data-lucide="external-link" class="w-4 h-4"></i></a>` : `<a class="icon-btn" href="#${encodeURIComponent(S.code)}/${encodeURIComponent(a.code)}" aria-label="${a.attempts ? 'Làm lại' : 'Làm bài'}" title="${a.attempts ? 'Làm lại' : 'Làm bài'}"><i data-lucide="external-link" class="w-4 h-4"></i></a>`}</div>`;
      };
      const wkOf = a => a.week_start ? mondayKey(dOf(a.week_start)) : mondayKey(now);
      const materialMap = {};
      weeks.forEach(w => { const k = mondayKey(dOf(w.week_start)); materialMap[k] = materialMap[k] || { lessons: [], homeworks: [], lessonAsg: [], homeworkAsg: [] }; materialMap[k].lessons = w.lessons || []; materialMap[k].homeworks = w.homeworks || []; });
      asg.forEach(a => { const k = wkOf(a), row = materialMap[k] = materialMap[k] || { lessons: [], homeworks: [], lessonAsg: [], homeworkAsg: [] }; row[a.kind === 'lesson' ? 'lessonAsg' : 'homeworkAsg'].push(a); });
      const currentMaterialWeek = mondayKey(now);
      const populatedWeeks = Object.keys(materialMap).filter(k => k && (materialMap[k].lessonAsg.length || materialMap[k].homeworkAsg.length || materialMap[k].lessons.some(x => x && (x.url || x.title)) || materialMap[k].homeworks.some(x => x && (x.url || x.title))));
      const sessWeeks = sess.map(x => mondayKey(dOf(x.date))), bounds = [...populatedWeeks, currentMaterialWeek, ...sessWeeks].sort();
      const materialWeeks = [];
      for (let cursor = dOf(bounds[0]), last = dOf(bounds[bounds.length - 1]); cursor <= last; cursor.setDate(cursor.getDate() + 7)) materialWeeks.push(ymd(cursor));
      materialWeeks.reverse();
      S.materialWeeks = materialWeeks;
      if (!materialWeeks.includes(S.materialWeek)) S.materialWeek = currentMaterialWeek;
      const weekOption = k => { const s = dOf(k), e = new Date(s); e.setDate(e.getDate() + 6); const n = 1 + Math.round((new Date(s.getFullYear(), s.getMonth(), s.getDate()) - BASE_MONDAY) / (7 * 864e5)); return `<span class="week-name">Tuần ${pad(n)}</span><span class="week-dates">${pad(s.getDate())}.${pad(s.getMonth()+1)} – ${pad(e.getDate())}.${pad(e.getMonth()+1)}.${e.getFullYear()}</span>`; };
      const materialWeekIndex = materialWeeks.indexOf(S.materialWeek);
      const overviewWeekToolbar = `<div class="overview-week-controls" role="group" aria-label="Chọn tuần tổng quan"><button type="button" class="icon-btn" data-material-week-step="1" aria-label="Tuần trước" ${materialWeekIndex < 0 || materialWeekIndex >= materialWeeks.length - 1 ? 'disabled' : ''}><i data-lucide="chevron-left" class="w-4 h-4"></i></button><span class="overview-week-label">${weekOption(S.materialWeek)}</span><button type="button" class="icon-btn" data-material-week-step="-1" aria-label="Tuần sau" ${materialWeekIndex <= 0 ? 'disabled' : ''}><i data-lucide="chevron-right" class="w-4 h-4"></i></button><button type="button" class="t-thisweek${S.materialWeek === currentMaterialWeek ? ' on' : ''}" data-material-week-current aria-label="Về tuần hiện tại" title="Tuần hiện tại">Tuần này</button></div>`;
      const materialsToolbar = `<div class="week-materials-toolbar"><div class="materials-week-nav" role="group" aria-label="Chọn tuần học liệu"><button type="button" class="icon-btn" data-material-week-step="1" aria-label="Tuần trước" ${materialWeekIndex < 0 || materialWeekIndex >= materialWeeks.length - 1 ? 'disabled' : ''}><i data-lucide="chevron-left" class="w-4 h-4"></i></button><div class="materials-week-current"><div class="materials-week-label">${weekOption(S.materialWeek)}</div></div><button type="button" class="icon-btn" data-material-week-step="-1" aria-label="Tuần sau" ${materialWeekIndex <= 0 ? 'disabled' : ''}><i data-lucide="chevron-right" class="w-4 h-4"></i></button></div><button type="button" class="materials-week-now" data-material-week-current>Tuần hiện tại</button></div>`;
      const byKind = (kind, label, icon, title, ic, empty, allWeeks = false) => {
        const isLesson = kind === 'lesson', linkKey = isLesson ? 'lessons' : 'homeworks', asgKey = isLesson ? 'lessonAsg' : 'homeworkAsg';
        let content = '';
        if (allWeeks) {
          const groups = materialWeeks.map(k => {
            const row = materialMap[k]; if (!row) return '';
            const links = (row[linkKey] || []).filter(x => x && (x.url || x.title)), assignments = row[asgKey] || [];
            if (!links.length && !assignments.length) return '';
            const start = dOf(k), end = new Date(start); end.setDate(end.getDate() + 6);
            const weekNo = 1 + Math.round((new Date(start.getFullYear(), start.getMonth(), start.getDate()) - BASE_MONDAY) / (7 * 864e5));
            return `<div class="student-library-week"><h3><i data-lucide="calendar-days"></i>Tuần ${pad(weekNo)} <span>${pad(start.getDate())}.${pad(start.getMonth()+1)} – ${pad(end.getDate())}.${pad(end.getMonth()+1)}.${end.getFullYear()}</span></h3><div class="space-y-2">${assignments.map(asgRow).join('')}${linksBlock(links, label, isLesson ? 'presentation' : 'file-check-2')}</div></div>`;
          }).filter(Boolean);
          content = groups.join('') || `<div class="text-sm text-slate-500">${empty}</div>`;
        } else {
          const row = materialMap[S.materialWeek] || { lessons: [], homeworks: [], lessonAsg: [], homeworkAsg: [] };
          const links = row[linkKey], assignments = row[asgKey], hasContent = assignments.length || links.some(x => x && (x.url || x.title));
          content = hasContent ? `${assignments.map(asgRow).join('')}${linksBlock(links, label, isLesson ? 'presentation' : 'file-check-2')}` : `<div class="text-sm text-slate-500">${empty}</div>`;
        }
        if (allWeeks) {
          const thisWeekRow = materialMap[currentMaterialWeek] || { lessons: [], homeworks: [], lessonAsg: [], homeworkAsg: [] };
          const thisWeekLinks = (thisWeekRow[linkKey] || []).filter(x => x && (x.url || x.title)), thisWeekAssignments = thisWeekRow[asgKey] || [];
          const thisWeekContent = thisWeekAssignments.length || thisWeekLinks.length ? `${thisWeekAssignments.map(asgRow).join('')}${linksBlock(thisWeekLinks, label, isLesson ? 'presentation' : 'file-check-2')}` : `<p class="student-week-preview-empty">Tuần này chưa có ${isLesson ? 'bài học' : 'bài tập'}.</p>`;
          return `<div class="student-library-page"><section class="card student-week-preview"><div class="student-week-preview-head"><h2><i data-lucide="${icon}"></i>${isLesson ? 'Bài học' : 'Bài tập'} tuần này</h2><span>${weekOption(currentMaterialWeek)}</span></div><div class="student-week-preview-list">${thisWeekContent}</div></section><section class="card ${ic} student-library-card" id="${isLesson ? 'student-lessons' : 'student-homework'}"><h2><i data-lucide="${icon}"></i>Kho ${isLesson ? 'bài học' : 'bài tập'}</h2><div class="student-library-list">${content}</div></section></div>`;
        }
        return `<section class="card ${ic}" id="${isLesson ? 'student-lessons' : 'student-homework'}"><h2><i data-lucide="${icon}"></i>${title}</h2><div class="student-library-list">${content}</div></section>`;
      };
      const hwHtml = byKind('homework', 'Bài tập', 'pencil-line', 'Kho bài tập', 'g-asg', 'Chưa có bài tập về nhà.', true);
      const matHtml = byKind('lesson', 'Bài học', 'book-open', 'Kho bài học', 'g-mat', 'Chưa có bài học trên lớp.', true);
      const weekOnlyPreview = (kind, label, icon, ic) => {
        const isLesson = kind === 'lesson', row = materialMap[currentMaterialWeek] || { lessons: [], homeworks: [], lessonAsg: [], homeworkAsg: [] };
        const links = (row[isLesson ? 'lessons' : 'homeworks'] || []).filter(x => x && (x.url || x.title)), assignments = row[isLesson ? 'lessonAsg' : 'homeworkAsg'] || [];
        const start = dOf(currentMaterialWeek), end = new Date(start); end.setDate(end.getDate() + 6);
        const weekNo = 1 + Math.round((new Date(start.getFullYear(), start.getMonth(), start.getDate()) - BASE_MONDAY) / (7 * 864e5));
        const body = assignments.length || links.length ? `${assignments.map(asgRow).join('')}${linksBlock(links, label, isLesson ? 'presentation' : 'file-check-2')}` : `<div class="text-sm text-slate-500">Tuần này chưa có ${isLesson ? 'bài học' : 'bài tập'}.</div>`;
        return `<section class="card ${ic} student-week-only"><div class="student-week-only-head"><h2><i data-lucide="${icon}"></i>${isLesson ? 'Bài học' : 'Bài tập'} tuần này</h2><div class="student-week-only-date"><b>Tuần ${pad(weekNo)}</b><span>${pad(start.getDate())}.${pad(start.getMonth()+1)} – ${pad(end.getDate())}.${pad(end.getMonth()+1)}.${end.getFullYear()}</span></div></div><div class="student-week-only-body">${body}</div></section>`;
      };
      const matWeekHtml = weekOnlyPreview('lesson', 'Bài học', 'book-open', 'g-mat');
      const hwWeekHtml = weekOnlyPreview('homework', 'Bài tập', 'pencil-line', 'g-asg');

      /* Tiến độ học tập: Type 1 (điểm) cho IELTS / TOEIC / AC12, Type 2 (nội dung) cho Global Success / Giao tiếp */
      const SC = LMS.score, SK_ICON = { listening: 'headphones', reading: 'book-open', writing: 'pencil', speaking: 'mic' };
      const goalBox = (label, icon, big, sub, pct, tail, outsideLabel = false) => {
        const value = `<div class="gv"><b>${big}</b>${pct != null ? `<span class="pct">${pct}%</span>` : ''}</div><div class="gs">${sub}</div>${pct != null ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ''}${tail || ''}`;
        return outsideLabel ? `<div class="goal-column"><div class="goal-column-title"><i data-lucide="${icon}"></i>${esc(label)}</div><div class="goal goal-value-only">${value}</div></div>` : `<div class="goal"><div class="gl"><i data-lucide="${icon}"></i>${esc(label)}</div>${value}</div>`;
      };
      let progBody = '';
      if (prog === 'ielts' || prog === 'toeic' || prog === 'ac12') {
        const rows = SC.targets(prog, d.targets, d.scores), F = (k, v) => SC.fmt(prog, k, v);
        const big = r => `${F(r.kind, r.current)} <em>/ ${F(r.kind, r.target)}</em>`;
        if (prog === 'ac12') {
          progBody = `<div class="goal-pair">${rows.map(r => goalBox('Mục tiêu ' + r.label, 'target', big(r), 'Số câu đúng: hiện tại / mục tiêu (' + (r.kind === 'thpt' ? 40 : 30) + ' câu)', r.pct)).join('')}</div>`;
        } else {
          const ov = rows[0], sk = rows.slice(1);
          progBody = `<div class="prog-body two">${goalBox('Mục tiêu điểm', 'target', big(ov), 'Hiện tại / Mục tiêu', ov.pct, '', true)}
            <div><div class="sk-title"><i data-lucide="bar-chart-3"></i>Điểm theo kỹ năng</div><div class="sk-grid">${sk.map((r, i) => `<div class="sk c${i % 4}"><div class="sl"><i data-lucide="${SK_ICON[r.kind] || 'book-open'}"></i><span class="skill-code">${SC.KIND_SHORT[r.kind] || esc(r.label)}</span></div>
              <div class="sv">${F(r.kind, r.current)}</div>${r.target != null ? `<div class="st">Mục tiêu ${F(r.kind, r.target)}</div>` : ''}${r.pct != null ? `<div class="bar"><i style="width:${r.pct}%"></i></div>` : ''}</div>`).join('')}</div></div></div>`;
        }
      } else {
        const objs = d.objectives || [], cp = SC.contentProgress(objs);
        if (!objs.length) progBody = '<div class="progress-empty"><i data-lucide="target"></i><span>Chưa có mục tiêu nội dung.</span></div>';
        else {
          const gm = {}, order = []; objs.forEach(o => { const g = o.group || 'Khác'; if (!gm[g]) { gm[g] = []; order.push(g); } gm[g].push(o); });
          progBody = `<div class="prog-body two">${goalBox('Mục tiêu chương trình', 'target', `${cp.done} <em>/ ${cp.total} mục tiêu</em>`, 'Đã hoàn thành / Tổng số', cp.pct)}
            <div><div class="sk-title"><i data-lucide="bar-chart-3"></i>Tiến độ theo chủ điểm</div><div class="sk-grid">${order.map((g, i) => { const a = gm[g], n = a.filter(o => o.done).length;
              return `<div class="sk c${i % 3}"><div class="sl"><i data-lucide="book-open"></i><span style="overflow-wrap:anywhere">${esc(g)}</span></div><div class="sv">${n} / ${a.length}</div><div class="bar"><i style="width:${Math.round(100 * n / a.length)}%"></i></div></div>`; }).join('')}</div></div></div>`;
        }
      }
      const progHtml = `<section class="card g-prog" id="student-overview"><div class="prog-head"><h2><i data-lucide="bar-chart-3"></i>Tiến độ học tập</h2><span class="prog-pill">Chương trình: ${isAll ? `<select class="field" style="min-height:36px;width:auto;padding:0 10px;font-weight:700" aria-label="Chọn chương trình" onchange="window.__demoProg(this.value)">${Object.keys(PNAME).map(k => `<option value="${k}"${k === prog ? ' selected' : ''}>${PNAME[k]}</option>`).join('')}</select>` : `<b>${esc(PNAME[prog] || '')}</b>`}</span></div>${progBody}</section>`;

      /* Lịch sử buổi học: thu gọn mặc định, buổi mới nhất trước, không có buổi tương lai */
      const historyRows = past.slice(0, S.historyLimit).map(s => { const st = STATUS[s.status] || STATUS.planned;
        return `<div class="hrow student-history-row">${dayCols(s.date)}<span class="text-xs font-semibold text-sky-700">${tmr(s)}</span><span class="hr-tags"><span class="tag ${st[1]}">${st[0]}</span>${attTag(s)}</span></div>`; }).join('');
      const histHtml = `<section class="card g-hist" id="student-history"><h2><i data-lucide="history"></i>Lịch sử buổi học</h2><div class="att-strip"><div><b>${done.length}</b><span>Đã học</span></div><div><b class="pos">${attP}</b><span>Có mặt</span></div><div><b class="${attA ? 'neg' : ''}">${attA}</b><span>Vắng</span></div><div><b>${attRate !== null ? attRate + '%' : '–'}</b><span>Chuyên cần</span></div></div><div class="student-history-list">${historyRows || '<div class="text-sm text-slate-500">Chưa có buổi học nào.</div>'}</div>${past.length > S.historyLimit ? `<div class="student-history-more"><button type="button" data-history-more>Xem thêm ${Math.min(10, past.length - S.historyLimit)} buổi</button></div>` : ''}</section>`;

      const tuitionHtml = `<section class="card g-tuition" id="student-tuition" data-m="${selMonth}"><div class="tuition-head"><h2 class="font-bold flex items-center gap-2"><i data-lucide="wallet"></i>Học phí tháng ${selMonth.slice(5, 7)}/${selMonth.slice(0, 4)}</h2><span id="tuition-tag"></span></div><div class="text-sm text-slate-500 mt-2" id="tuition-status-text">Đang tải tình trạng…</div></section>`;
      const tuitionHistoryContent = () => S.tuitionHistory === null
        ? '<div class="text-sm text-slate-500">Đang tải lịch sử học phí…</div>'
        : S.tuitionHistory.length
          ? `<div class="tuition-history-list">${S.tuitionHistory.slice().reverse().map(row => { const monthDate = new Date(Number(row.month.slice(0,4)), Number(row.month.slice(5,7))-1, 1); const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(monthDate); const paidDate = row.paid_on ? new Date(row.paid_on + 'T00:00:00').toLocaleDateString('vi-VN') : ''; const paid = row.status === 'Đã đóng'; return `<div class="tuition-history-row"><div><b>${esc(monthLabel)}</b>${paidDate ? `<span>Ngày đóng ${esc(paidDate)}</span>` : ''}</div>${row.fee != null ? `<span class="th-amt"><small>Học phí</small>${Number(row.fee).toLocaleString('vi-VN')}đ</span><span class="th-amt"><small>Đã đóng</small>${Number(row.paid || 0).toLocaleString('vi-VN')}đ</span><span class="th-amt ${row.paid < row.fee ? 'neg' : 'pos'}"><small>Còn lại</small>${Math.max(row.fee - row.paid, 0).toLocaleString('vi-VN')}đ</span>` : '<span></span><span></span><span></span>'}<span class="tag ${tuiTone(row.status)}">${esc(row.status || 'Chưa có thông tin')}</span></div>`; }).join('')}</div>`
          : '<div class="text-sm text-slate-500">Chưa có lịch sử đóng học phí.</div>';
      const tuitionHistoryHtml = `<section class="card g-tuition-history"><h2><i data-lucide="wallet"></i>Lịch sử đóng học phí</h2><p class="text-xs text-slate-500 mb-3">Theo dõi trạng thái và ngày đóng theo từng tháng.</p><div id="tuition-history-list">${tuitionHistoryContent()}</div></section>`;
      const views = {
        overview: `<div class="student-week-materials"><div class="student-materials">${matWeekHtml}${hwWeekHtml}<div id="wotd-root"></div></div></div>`,
        lessons: matHtml,
        homework: hwHtml,
        vocab: '<section class="card g-vocab"><div id="vocab-root"></div></section>',
        calendar: schedHtml,
        tuition: tuitionHistoryHtml,
        history: histHtml
      };
      const view = views[S.view] ? S.view : 'overview';
      const viewTitle = { overview:'<span class="t-desk">Hello, ' + esc(titleCaseName(d.student_name)) + '!</span><span class="t-mob">Tổng quan</span>', lessons:'Bài học', homework:'Bài tập về nhà', vocab:'Sổ từ vựng', calendar:'Lịch học', tuition:'Học phí', history:'Lịch sử học tập' }[view] || 'Tổng quan';
      const navItem = (key, label, icon) => `<button type="button" class="${view === key ? 'active' : ''}" data-student-view="${key}" ${view === key ? 'aria-current="page"' : ''}>${icon ? `<i data-lucide="${icon}"></i>` : ''}<span>${label}</span></button>`;
      const isOverview = view === 'overview';
      const railHtml = `${profileHtml}${weekSchedHtml}${heroHtml}${tuitionHtml}${infoHtml}`;
      $('app').innerHTML = `<div class="student-shell ${isOverview ? '' : 'student-shell-inner-tabs'}"><div class="student-welcome"><div class="student-welcome-left"><a class="logo-home" href="#" data-student-home aria-label="Về trang tổng quan"><img class="student-welcome-logo" src="logo-wordmark.png" alt="gblearninghub"></a><span class="student-welcome-brand-divider" aria-hidden="true"></span></div><div class="student-welcome-title"><h1>${viewTitle}</h1><p>Khu vực học tập của bạn</p></div><div class="student-welcome-right"><div class="student-welcome-actions">${isOverview ? overviewWeekToolbar : ''}</div><div class="student-welcome-tools"></div></div></div><aside class="student-sidebar" aria-label="Điều hướng học viên"><div class="student-brand"><a class="logo-home" href="#" data-student-home aria-label="Về trang tổng quan"><img src="logo-wordmark.png" alt="gblearninghub"></a></div><nav class="student-nav">${navItem('overview','Tổng quan','layout-dashboard')}${navItem('lessons','Bài học','book-open')}${navItem('homework','Bài tập','pencil-line')}${navItem('vocab','Sổ từ vựng','notebook-pen')}${navItem('calendar','Lịch học','calendar-days')}${navItem('tuition','Học phí','wallet')}${navItem('history','Lịch sử','history')}</nav></aside><div class="student-workspace ${isOverview ? 'student-workspace-overview' : ''}"><div class="m-stick">${miniProfile.replace(/<\/div>$/, (isOverview ? `<div class="m-week">${overviewWeekToolbar}</div>` : '') + '</div>')}</div><section class="student-main ${isOverview ? 'student-overview-view' : ''}" aria-label="Nội dung học tập"><div class="student-main-content ${isOverview ? 'student-overview-content' : ''} ${view === 'lessons' || view === 'homework' ? 'student-library-content' : ''}">${isOverview ? `<div class="student-overview-top">${profileHtml}${infoHtml}${heroHtml}</div><div class="student-overview-highlight">${weekSchedHtml}${tuitionHtml}${progHtml}</div>` : ''}<div class="student-main-section ${view === 'lessons' || view === 'homework' ? 'student-library-view' : ''}">${views[view]}</div></div></section>${isOverview ? '' : `<aside class="student-rail" aria-label="Hồ sơ và thông tin học tập">${railHtml}</aside>`}</div></div>`; icons();
      const tools = document.querySelector('.student-welcome-tools');
      if (tools) ['btn-home','btn-mode','btn-theme'].forEach(id => { const el = $(id); if (el) tools.appendChild(el); });
      { const th = $('btn-theme'); if (th) th.hidden = T.on; }
      const curMonth = selMonth, vnd = n => Number(n || 0).toLocaleString('vi-VN') + 'đ';
      const amtLines = (old, fee, paidNow, rest, date) => {
        if (!(Number(fee) > 0 || Number(old) > 0)) return '';
        const compact = !!document.querySelector('.student-rail #student-tuition');
        if (compact) { const owe = Number(rest) > 0; return `<div class="tuition-amts compact"><b class="${owe ? 'neg' : 'pos'}">${vnd(owe ? rest : paidNow)}</b>${!owe && date ? `<span class="ta-date">${esc(date)}</span>` : ''}</div>`; }
        const pct = Number(fee) > 0 ? Math.min(100, Math.round(Number(paidNow) / Number(fee) * 100)) : 0;
        return `<div class="tuition-amts"><span>Tháng cũ</span><b class="${Number(old) > 0 ? 'neg' : ''}">${vnd(old)}</b><span>Tháng này</span><b>${vnd(fee)}</b><span>Đã đóng</span><b class="${Number(paidNow) > 0 ? 'pos' : ''}">${vnd(paidNow)}</b><span>Còn lại</span><b class="${Number(rest) > 0 ? 'neg' : 'pos'}">${vnd(rest)}</b></div><div class="tuition-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>${date ? `<div class="tuition-bar-cap"><span>Ngày đóng: ${esc(date)}</span></div>` : ''}`;
      };
      const firstM = sess.map(x => String(x.date || '').slice(0,7)).filter(m => /^\d{4}-\d{2}$/.test(m) && m <= curMonth).sort()[0] || curMonth, monthsAll = [];
      for (let c = new Date(Number(firstM.slice(0,4)), Number(firstM.slice(5,7)) - 1, 1), e = new Date(Number(curMonth.slice(0,4)), Number(curMonth.slice(5,7)) - 1, 1); c <= e && monthsAll.length < 36; c.setMonth(c.getMonth() + 1)) monthsAll.push(`${c.getFullYear()}-${pad(c.getMonth()+1)}`);
      Promise.all([S.c.rpc('student_tuition_status', { p_student_code: S.code, p_month: curMonth }), Promise.all(monthsAll.map(m => S.c.rpc('student_tuition_amounts', { p_student_code: S.code, p_month: m }).then(x => ({ m, row: Array.isArray(x.data) ? x.data[0] : x.data, err: x.error }))))]).then(([r, ams]) => {
        const el = $('tuition-status-text'); if (!el || S.data !== d || ($('student-tuition') || {}).dataset?.m !== curMonth) return;
        const row = Array.isArray(r.data) ? r.data[0] : r.data;
        if (r.error || !row) { el.textContent = 'Chưa có thông tin học phí tháng này.'; return; }
        const date = row.paid_on ? new Date(row.paid_on + 'T00:00:00').toLocaleDateString('vi-VN') : '';
        const good = row.status === 'Đã đóng';
        const money = ams.filter(x => x.row && !x.err), cur = money.find(x => x.m === curMonth), old = money.filter(x => x.m < curMonth).reduce((a, x) => a + Math.max(Number(x.row.fee) - Number(x.row.paid), 0), 0);
        const fee = cur ? Number(cur.row.fee) : 0, rest = old + (cur ? Math.max(fee - Number(cur.row.paid), 0) : 0);
        const tg = $('tuition-tag'); if (tg) tg.innerHTML = `<span class="tag ${tuiTone(row.status)}">${esc(row.status || 'Chưa có thông tin')}</span>`;
        const paidNow = cur ? Number(cur.row.paid) : 0;
        el.innerHTML = money.length ? amtLines(old, fee, paidNow, rest, date) : (good && date ? (document.querySelector('.student-rail #student-tuition') ? `<div class="tuition-amts compact"><span class="ta-date" style="grid-row:1">${esc(date)}</span></div>` : `<div class="tuition-bar-cap"><span>Ngày đóng: ${esc(date)}</span></div>`) : '');
      }).catch(() => { const el = $('tuition-status-text'); if (el) el.textContent = 'Chưa có thông tin học phí tháng này.'; });
      if (S.view === 'overview' && window.GBVocabTab) GBVocabTab.wotd($('wotd-root'), { c: S.c, code: S.code });
      if (S.view === 'vocab' && window.GBVocabTab) GBVocabTab.mount($('vocab-root'), { c: S.c, code: S.code });
      if (S.view === 'tuition' && S.tuitionHistory === null && !S.tuitionHistoryLoading) {
        const codeAtRequest = S.code, currentMonth = `${now.getFullYear()}-${pad(now.getMonth()+1)}`;
        const firstMonth = sess.map(s => String(s.date || '').slice(0,7)).filter(m => /^\d{4}-\d{2}$/.test(m) && m <= currentMonth).sort()[0] || currentMonth;
        const [startY, startM] = firstMonth.split('-').map(Number), tuitionMonths = [];
        for (let cursor = new Date(startY, startM - 1, 1), end = new Date(now.getFullYear(), now.getMonth(), 1); cursor <= end && tuitionMonths.length < 36; cursor.setMonth(cursor.getMonth() + 1)) tuitionMonths.push(`${cursor.getFullYear()}-${pad(cursor.getMonth()+1)}`);
        S.tuitionHistoryLoading = true;
        Promise.all(tuitionMonths.map(async month => {
          const [result, ra] = await Promise.all([S.c.rpc('student_tuition_status', { p_student_code: codeAtRequest, p_month: month }), S.c.rpc('student_tuition_amounts', { p_student_code: codeAtRequest, p_month: month })]);
          const row = Array.isArray(result.data) ? result.data[0] : result.data, am = Array.isArray(ra.data) ? ra.data[0] : ra.data;
          return result.error || !row ? null : { month, status: row.status || 'Chưa có thông tin', paid_on: row.paid_on || '', fee: am && !ra.error ? Number(am.fee) : null, paid: am && !ra.error ? Number(am.paid) : null };
        })).then(rows => {
          if (S.code !== codeAtRequest || S.data !== d) return;
          S.tuitionHistory = rows.filter(Boolean); S.tuitionHistoryLoading = false;
          const list = $('tuition-history-list'); if (list) list.innerHTML = tuitionHistoryContent();
        }).catch(() => {
          if (S.code !== codeAtRequest || S.data !== d) return;
          S.tuitionHistory = []; S.tuitionHistoryLoading = false;
          const list = $('tuition-history-list'); if (list) list.innerHTML = tuitionHistoryContent();
        });
      }
      (LMS.isTeacherNow ? LMS.isTeacherNow() : Promise.resolve(false)).then(ok => { const b = $('btn-class'); if (ok && b && S.data === d) { b.href = 'class.html?class=' + encodeURIComponent(cls.code); b.classList.remove('hidden'); $('btn-home').classList.remove('hidden'); $('btn-home').href = 'index.html#overview'; document.querySelectorAll('a.logo-home[data-student-home]').forEach(l => { l.href = 'index.html#overview'; l.removeAttribute('data-student-home'); l.setAttribute('aria-label', 'Về trang tổng quan'); }); } });
    }

    /* ---------- Làm bài ---------- */
    const letterOf = (opt, i) => { const m = /^\s*([A-Za-z])[.)]\s*/.exec(opt); return m ? m[1].toUpperCase() : String.fromCharCode(65 + i); };
    const textOf = opt => String(opt).replace(/^\s*[A-Za-z][.)]\s*/, '');

    function renderAssignment() {
      restoreHeaderActions();
      const a = S.a; $('btn-class').classList.add('hidden'); $('btn-home').classList.add('hidden'); $('btn-back').classList.remove('hidden'); $('btn-back').href = '#' + encodeURIComponent(S.code);
      $('hello').textContent = a.name; $('hello-sub').textContent = a.student_name; document.title = 'Student Portal - ' + a.student_name;
      const qs = a.questions || [];
      $('app').innerHTML = `<div class="narrow"><section class="card"><div class="text-xs text-slate-500 mb-1">${qs.length} câu${a.due_at ? ' · Hạn ' + new Date(a.due_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : ''}. Điểm chỉ tính lần làm đầu tiên; nộp muộn vẫn được nhận nhưng có đánh dấu.</div>
        <div id="qs">${qs.map((q, i) => `<div class="qbox" data-q="${esc(q.id)}"><div class="text-sm font-bold text-slate-800 mb-2" style="overflow-wrap:anywhere">Câu ${i + 1}. ${esc(q.text)}</div>
          ${q.type === 'mcq' && Array.isArray(q.options) ? `<div class="space-y-2">${q.options.map((o, j) => `<button type="button" class="opt" data-o="${letterOf(o, j)}" aria-pressed="false"><strong>${letterOf(o, j)}.</strong><span>${esc(textOf(o))}</span></button>`).join('')}</div>`
            : `<input type="text" class="field w-full" data-fill autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Câu trả lời câu ${i + 1}">`}
          <div class="fb text-sm mt-2 hidden"></div></div>`).join('')}</div>
        <div class="flex flex-wrap items-center gap-3 mt-4"><button type="button" id="btn-submit" class="btn-primary"><i data-lucide="send" class="w-4 h-4"></i><span>Nộp bài</span></button><span id="sub-msg" class="text-sm text-rose-700" role="alert"></span></div>
        <div id="result" class="mt-4 hidden"></div></section></div>`;
      S.answers = {}; S.t0 = Date.now(); icons();
    }

    async function submit() {
      if (S.busy) return;
      const qs = S.a.questions || [], empty = qs.filter(q => !(S.answers[q.id] || '').trim()).length;
      if (empty && !(await LMS.confirm('Còn ' + empty + ' câu chưa trả lời. Vẫn nộp bài?', { ok: 'Vẫn nộp' }))) return;
      S.busy = true; $('btn-submit').disabled = true; $('sub-msg').textContent = '';
      const r = await S.c.rpc('submit_assignment', { p_student_code: S.code, p_assignment_code: S.a.code, p_answers: S.answers, p_duration_seconds: Math.round((Date.now() - S.t0) / 1000) });
      S.busy = false;
      if (r.error) { $('btn-submit').disabled = false; $('sub-msg').textContent = errText(r.error); return; }
      showResult(r.data);
    }

    function showResult(res) {
      const by = {}; (res.items || []).forEach(it => { by[it.id] = it; });
      document.querySelectorAll('#qs .qbox').forEach(box => {
        const it = by[box.dataset.q], fb = box.querySelector('.fb'); if (!it) return;
        box.querySelectorAll('.opt').forEach(b => { b.disabled = true; const l = b.dataset.o, ans = [].concat(it.answer).map(x => String(x).toUpperCase());
          if (ans.includes(l)) b.classList.add('good'); else if (b.getAttribute('aria-pressed') === 'true') b.classList.add('bad'); });
        const inp = box.querySelector('[data-fill]'); if (inp) inp.disabled = true;
        const ans = [].concat(it.answer).join(' / ');
        fb.className = 'fb text-sm mt-2 ' + (it.correct ? 'text-emerald-700' : 'text-rose-700');
        fb.innerHTML = (it.correct ? '<strong>Đúng.</strong> ' : '<strong>Chưa đúng.</strong> Đáp án: ' + esc(ans) + '. ') + (it.explanation ? `<span class="text-slate-600">${esc(it.explanation)}</span>` : '');
      });
      $('btn-submit').classList.add('hidden');
      const rs = $('result'); rs.classList.remove('hidden');
      rs.innerHTML = `<div class="stat-tile" style="background:var(--t-tint)"><div class="stat-n">${res.score}/${res.total}</div>
        <div class="stat-l">${res.counts_for_score ? 'Lần làm đầu tiên: điểm này được ghi nhận.' : 'Lần làm lại: điểm không thay đổi, bạn vẫn xem được đáp án.'}${res.is_late ? ' Nộp muộn.' : ''}</div></div>
        <a class="btn-soft mt-3" href="#${encodeURIComponent(S.code)}" style="text-decoration:none">Về trang chính</a>`;
      rs.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /* ---------- Điều hướng bằng # ---------- */
    /* ---------- Giáo viên: lịch dạy theo ngày (student.html#teacher/YYYY-MM-DD) ---------- */
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
        S.c.from('assignment_classes').select('assignment_id,class_id,due_at,assignments(assignment_name,assignment_code,kind,page_path)').eq('week_start', monday).eq('is_active', true)
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
            const first = sb.filter(r => r.score != null).sort((a, b) => (a.attempt_no || 1) - (b.attempt_no || 1))[0];
            const bands = wr.filter(r => r.band != null).map(r => Number(r.band));
            return { st, done: true, late: sb.some(r => r.is_late) || wr.some(r => r.is_late), score: first ? Number(first.score) : null, band: bands.length ? bands.reduce((p, q) => p + q, 0) / bands.length : null, tries: sb.length ? Math.max(...sb.map(r => r.attempt_no || 1)) : 0 };
          }).sort((p, q) => p.done - q.done);
          return { x, cls, rows };
        });
        const all = groups.flatMap(z => z.rows), done = all.filter(r => r.done), late = done.filter(r => r.late).length, sc = done.filter(r => r.score != null);
        const avg = sc.length ? sc.reduce((p, r) => p + r.score, 0) / sc.length : null, pct = all.length ? Math.round(done.length / all.length * 100) : 0;
        const name = c => esc(c.class_name || c.class_code || ''), dues = [...new Set(groups.map(z => z.x.due_at || ''))];
        const sub = dues.length === 1 ? esc(fmtDue(dues[0])) : 'Hạn nộp khác nhau theo lớp';
        const flat = groups.flatMap(z => z.rows.map(r => ({ ...r, cls: z.cls, due: z.x.due_at }))).sort((p, q) => p.done - q.done);
        const line = r => `<div class="t-sub-row"><span class="t-sr-name">${esc(r.st.student_name)}</span><span class="t-sr-cls">${name(r.cls)}${dues.length > 1 ? `<small>${esc(fmtDue(r.due))}</small>` : ''}</span><span class="t-sr-code">${esc(r.st.student_code || '')}</span><span class="t-sub-meta">${r.done ? `${r.score != null ? '<b>' + num(r.score) + '</b>' : ''}${r.band != null ? '<b>Band ' + num(r.band) + '</b>' : ''}${r.tries > 1 ? '<span class="tag bg-slate-100 text-slate-600">Lần ' + r.tries + '</span>' : ''}${r.late ? '<span class="tag bg-rose-50 text-rose-700">Trễ</span>' : ''}${r.score == null && r.band == null && !r.late ? '<span class="tag bg-emerald-50 text-emerald-700">Đã nộp</span>' : ''}` : '<span class="tag bg-amber-50 text-amber-700">Chưa nộp</span>'}</span></div>`;
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
      const days = Array.from({ length: 7 }, (_, i) => addDays(T.monday, i)), mon = dOf(T.monday), sun = dOf(days[6]);
      const cnt = k => T.sess.filter(s => s.session_date === k).length;
      const list = T.sess.filter(s => s.session_date === T.date);
      if (T.openFor !== T.date) { T.openFor = T.date; T.open = new Set(); T.slotOpen = new Set(); T.pick = null; }
      const wk = Math.floor((mon - BASE_MONDAY) / 6048e5) + 1;
      const range = `${pad(mon.getDate())}.${pad(mon.getMonth() + 1)} – ${pad(sun.getDate())}.${pad(sun.getMonth() + 1)}.${sun.getFullYear()}`;
      const wkCtl = `<div class="overview-week-controls" role="group" aria-label="Chọn tuần"><button type="button" class="icon-btn" data-t="wk" data-step="-7" aria-label="Tuần trước"><i data-lucide="chevron-left" class="w-4 h-4"></i></button><span class="overview-week-label"><b>Tuần ${pad(wk)}</b><span>${range}</span></span><button type="button" class="icon-btn" data-t="wk" data-step="7" aria-label="Tuần sau"><i data-lucide="chevron-right" class="w-4 h-4"></i></button><button type="button" class="t-thisweek${T.monday === mondayKey(new Date()) ? ' on' : ''}" data-t="today" aria-label="Về tuần hiện tại" title="Tuần hiện tại">Tuần này</button></div>`;
      const titles = { day: 'Lịch dạy', lessons: 'Bài học tuần', submissions: 'Bài nộp', rail: 'Tổng quan' };
      const nav = (k, label, icon, cls = '') => `<button type="button" class="${T.view === k ? 'active' : ''} ${cls}" data-t="view" data-view="${k}" ${T.view === k ? 'aria-current="page"' : ''}><i data-lucide="${icon}"></i><span>${label}</span></button>`;
      const cal = days.map((k, i) => `<button type="button" class="week-calendar-day${cnt(k) ? ' has-session' : ''}${k === today ? ' today' : ''}${k === T.date ? ' selected' : ''}${T.next && T.next.s && T.next.s.session_date === k ? ' next-day' : ''}" data-t="day" data-date="${k}" aria-label="${fmtDay(k)}, ${cnt(k)} lớp" title="${fmtDay(k)} · ${cnt(k)} lớp"><span>${['T2','T3','T4','T5','T6','T7','CN'][i]}</span><b>${pad(dOf(k).getDate())}</b></button>`).join('');
      const slots = []; list.forEach(x => { const key = hhmm(x.start_time); let g = slots.find(z => z.key === key); if (!g) { g = { key, all: [] }; slots.push(g); } g.all.push(x); });
      const tt = slots.length ? `<div class="t-tt-title">${fmtDay(T.date)}</div>${slots.map(g => `<button type="button" class="t-tt-slot${g.all.every(x => x.status === 'done') ? ' done' : ''}${T.pick === g.key ? ' picked' : ''}" data-t="pick" data-key="${g.key}" aria-pressed="${T.pick === g.key}">${g.key}<span class="t-tt-cls">${g.all.map(x => esc((x.classes && (x.classes.class_name || x.classes.class_code)) || '')).join(' · ')}</span></button>`).join('')}` : `<div class="text-sm text-slate-500">${fmtDay(T.date)}: không có buổi học.</div>`;
      const done = T.sess.filter(s => s.status === 'done').length, left = T.sess.filter(s => s.status === 'planned' || s.status === 'makeup').length;
      const body = T.view === 'rail' ? '' : T.view === 'lessons' ? tWeekList('lesson') : T.view === 'submissions' ? tSubView()
        : `<section class="card t-daybar"><h2><i data-lucide="calendar-days"></i>${fmtDay(T.date)}</h2><span class="tag bg-slate-100 text-slate-600">${list.length} lớp</span></section>${tSlots(list) || '<section class="card text-center text-sm text-slate-500">Không có lớp nào ngày này.</section>'}`;
      const hm = body.match(/^<section class="card t-daybar">[\s\S]*?<\/section>/), head = hm ? hm[0] : '', rest = body.slice(head.length);
      const railBase = `<section class="card"><h2><i data-lucide="bar-chart-3"></i>Tổng kết tuần</h2><div class="t-stats"><div class="t-stat c-all"><b>${T.sess.length}</b><span>Buổi</span></div><div class="t-stat c-done"><b>${done}</b><span>Đã dạy</span></div><div class="t-stat c-left"><b>${left}</b><span>Sắp tới</span></div></div></section>
        <section class="card"><div class="week-calendar-head"><span class="week-calendar-title"><i data-lucide="calendar-days"></i>Thời khóa biểu tuần ${wk}</span><span class="week-calendar-range">${range}</span></div><div class="week-calendar" role="grid" aria-label="Chọn ngày">${cal}</div><div class="t-tt">${tt}</div></section>
        `;
      const rail = railBase + (T.pick && slots.find(g => g.key === T.pick) ? tPickCard(slots.find(g => g.key === T.pick).all) : tNextCard());
      $('app').innerHTML = `<div class="student-shell student-shell-inner-tabs"><div class="student-welcome"><div class="student-welcome-left"><a class="logo-home" href="index.html#overview"  aria-label="Về trang tổng quan"><img class="student-welcome-logo" src="logo-wordmark.png" alt="gblearninghub"></a><span class="student-welcome-brand-divider" aria-hidden="true"></span></div><div class="student-welcome-title"><h1>${titles[T.view]}</h1><p>Khu vực giảng dạy</p></div><div class="student-welcome-right"><div class="student-welcome-actions">${wkCtl}</div><div class="student-welcome-tools"></div></div></div>
        <aside class="student-sidebar" aria-label="Điều hướng giáo viên"><div class="student-brand"><a class="logo-home" href="index.html#overview"  aria-label="Về trang tổng quan"><img src="logo-wordmark.png" alt="gblearninghub"></a></div><nav class="student-nav">${nav('rail', 'Tổng quan', 'layout-dashboard', 'm-only')}${nav('day', 'Lịch dạy', 'calendar-days')}${nav('lessons', 'Bài học', 'presentation')}${nav('submissions', 'Bài nộp', 'inbox')}</nav></aside>
        <div class="student-workspace"><section class="student-main" aria-label="Nội dung giảng dạy"><div class="t-stick">${head}<div class="m-week">${wkCtl}</div></div><div class="student-main-content t-content">${T.view === 'rail' ? `<div class="t-rail t-rail-m">${railBase}</div>` : rest}</div></section><aside class="student-rail t-rail" aria-label="Tổng kết và lịch tuần">${rail}</aside></div></div>`;
      const tools = document.querySelector('.student-welcome-tools');
      if (tools) ['btn-home', 'btn-mode', 'btn-theme'].forEach(id => { const el = $(id); if (el) tools.appendChild(el); });
      { const th = $('btn-theme'); if (th) th.hidden = T.on; }
      icons(); window.scrollTo(0, y);
    }
    async function renderTeacher(dateArg) {
      const redraw = !!$('app').querySelector('.t-content'); T.on = true; if (!redraw) restoreHeaderActions();
      $('hello').textContent = 'Giáo viên'; $('hello-sub').textContent = 'Khu vực giảng dạy'; document.title = 'Giáo viên | gblearning';
      ['btn-class', 'btn-back'].forEach(id => $(id).classList.add('hidden')); $('btn-home').classList.remove('hidden');
      if (!$('app').querySelector('.t-content')) $('app').innerHTML = '<div class="card text-center text-sm text-slate-500">Đang tải...</div>';
      try {
        if (!T.authed) { await LMS.requireTeacher(); T.authed = true; }
        T.date = /^\d{4}-\d{2}-\d{2}$/.test(dateArg || '') ? dateArg : ymd(new Date());
        await Promise.all([loadTeacherWeek(mondayKey(dOf(T.date))), Date.now() - T.nextAt < 60000 ? null : loadNext()]);
        if (T.view === 'submissions') await loadSubs();
        bindTeacher(); drawTeacher(); prefetchWeeks(T.monday);
      } catch (e) { showError(errText(e)); }
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
        try {
          if (k === 'toggle') tToggle(b.dataset.sid);
          else if (k === 'pick') { if (matchMedia('(max-width:780px)').matches) tPickModal(b.dataset.key); else { T.pick = T.pick === b.dataset.key ? null : b.dataset.key; drawTeacher(); } }
          else if (k === 'pick-clear') { T.pick = null; drawTeacher(); }
          else if (k === 'pick-open') { T.view = 'day'; T.slotOpen.add(b.dataset.key); T.sess.filter(x => x.session_date === T.date && hhmm(x.start_time) === b.dataset.key).forEach(x => T.open.add(x.id)); drawTeacher(); window.scrollTo(0, 0); }
          else if (k === 'roster') tRoster(Number(b.dataset.cid), Number(b.dataset.sid));
          else if (k === 'view') { T.view = b.dataset.view; if (T.view === 'submissions') { drawTeacher(); await loadSubs(); } drawTeacher(); window.scrollTo(0, 0); }
          else if (k === 'sub-refresh') { await loadSubs(); drawTeacher(); LMS.toast('Đã tải lại bài nộp'); }
          else if (k === 'day') { const d = b.dataset.date; if (T.view !== 'rail') T.view = 'day'; if (mondayKey(dOf(d)) === T.monday) { T.date = d; history.replaceState(null, '', '#teacher/' + d); drawTeacher(); } else location.hash = '#teacher/' + d; }
          else if (k === 'wk') { location.hash = '#teacher/' + addDays(T.date, Number(b.dataset.step)); }
          else if (k === 'today') { location.hash = '#teacher/' + ymd(new Date()); }
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

    async function route() {
      const parts = location.hash.replace(/^#/, '').split('/').map(decodeURIComponent);
      const nextCode = (parts[0] || '').trim();
      T.on = false;
      if (nextCode === 'teacher' || nextCode === '0000') { S.code = ''; S.data = null; return renderTeacher(parts[1]); }
      if (S.code && nextCode && S.code !== nextCode) { S.data = null; S.view = 'overview'; S.historyLimit = 10; S.tuitionHistory = null; S.tuitionHistoryLoading = false; S.materialWeek = ''; S.materialWeeks = []; S.calendarMonth = ''; S.calendarDate = ''; S.calWeek = ''; }
      S.code = nextCode;
      if (!S.code) return showError('Thiếu mã học viên. Mở lại link giáo viên đã gửi.');
      try {
        if (parts[1]) {
          $('app').innerHTML = '<div class="card text-center text-sm text-slate-500">Đang tải bài...</div>';
          const r = await S.c.rpc('student_assignment', { p_student_code: S.code, p_assignment_code: parts[1] });
          if (r.error) throw r.error; S.a = r.data; renderAssignment();
        } else {
          $('app').innerHTML = '<div class="card text-center text-sm text-slate-500">Đang tải...</div>';
          const r = await S.c.rpc('student_portal', { p_student_code: S.code });
          if (r.error) throw r.error; S.data = r.data; renderHome();
        }
      } catch (e) { showError(errText(e)); }
      window.scrollTo(0, 0);
    }

    /* Keep scroll positions (window and inner scrollers such as .student-workspace) when the dashboard re-renders in place. */
    (function () {
      const rh = renderHome;
      const keyOf = (el, root) => { const cls = el.className && el.className.baseVal === undefined ? String(el.className).trim() : ''; if (!cls) return null; const same = [...root.querySelectorAll('.' + cls.split(/\s+/).map(c => CSS.escape(c)).join('.'))]; return cls + '|' + same.indexOf(el); };
      const find = (k, root) => { const [cls, i] = [k.slice(0, k.lastIndexOf('|')), Number(k.slice(k.lastIndexOf('|') + 1))]; return [...root.querySelectorAll('.' + cls.split(/\s+/).map(c => CSS.escape(c)).join('.'))][i] || null; };
      renderHome = function () {
        const app = document.getElementById('app');
        const was = !!(app && app.querySelector('.student-shell'));
        const wy = window.scrollY || document.documentElement.scrollTop || 0;
        const saved = [];
        if (was) app.querySelectorAll('*').forEach(el => {
          if (el.scrollTop > 0 && el.scrollHeight > el.clientHeight) { const oy = getComputedStyle(el).overflowY; if (oy === 'auto' || oy === 'scroll') { const k = keyOf(el, app); if (k) saved.push([k, el.scrollTop]); } }
        });
        const r = rh.apply(this, arguments);
        if (was) {
          const apply = () => {
            if (wy > 0) window.scrollTo(0, wy);
            saved.forEach(([k, t]) => { const el = find(k, app); if (el) el.scrollTop = t; });
          };
          apply();
          requestAnimationFrame(apply);
        }
        return r;
      };
    })();

    function bind() {
      $('app').addEventListener('click', e => {
        if (e.target.closest('[data-student-home]')) { e.preventDefault(); if (S.view !== 'overview') { S.view = 'overview'; renderHome(); } window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        const nav = e.target.closest('[data-student-view]');
        if (nav) { if (nav.dataset.studentView !== S.view) { S.view = nav.dataset.studentView; renderHome(); window.scrollTo({ top: 0, behavior: 'smooth' }); } return; }
        if (e.target.closest('[data-history-more]')) { S.historyLimit += 10; renderHome(); return; }
      });
      $('app').addEventListener('click', e => {
        const o = e.target.closest('.opt');
        if (o && !o.disabled) { const box = o.closest('.qbox'); box.querySelectorAll('.opt').forEach(b => b.setAttribute('aria-pressed', b === o ? 'true' : 'false')); S.answers[box.dataset.q] = o.dataset.o; return; }
        if (e.target.closest('#btn-submit')) submit();
      });
      $('app').addEventListener('input', e => { const i = e.target.closest('[data-fill]'); if (i) S.answers[i.closest('.qbox').dataset.q] = i.value; });
      $('app').addEventListener('click', e => {
        const step = e.target.closest('[data-material-week-step]');
        if (step) { const i = S.materialWeeks.indexOf(S.materialWeek), next = i + Number(step.dataset.materialWeekStep); if (S.materialWeeks[next]) { S.materialWeek = S.materialWeeks[next]; renderHome(); } return; }
        if (e.target.closest('[data-material-week-current]')) { S.materialWeek = mondayKey(new Date()); renderHome(); return; }
        const cw = e.target.closest('[data-cal-week]');
        if (cw && !cw.disabled) { const st = Number(cw.dataset.calWeek), base = S.calWeek || mondayKey(new Date()); if (st === 0) S.calWeek = ''; else { const x = dOf(base); x.setDate(x.getDate() + 7 * st); S.calWeek = ymd(x); } renderHome(); return; }
        const calStep = e.target.closest('[data-calendar-step]');
        if (calStep) { const [y,m] = S.calendarMonth.split('-').map(Number), next = new Date(y, m - 1 + Number(calStep.dataset.calendarStep), 1); S.calendarMonth = `${next.getFullYear()}-${pad(next.getMonth()+1)}`; S.calendarDate = ymd(next); renderHome(); return; }
        const calDay = e.target.closest('[data-calendar-day]');
        if (calDay && !calDay.disabled) { S.calendarDate = calDay.dataset.calendarDay; renderHome(); }
      });
      window.addEventListener('hashchange', route);
      const sig = () => { const d = S.data; if (!d) return ''; const n = new Date(), k = ymd(n), h = pad(n.getHours()) + ':' + pad(n.getMinutes());
        return (d.sessions || []).map(s => (s.mode === 'online' && s.date === k && h >= hm(toMin(s.start) - 15) && h < s.end ? 1 : 0) + sessState(s, n)).join(''); };
      let last = null;
      setInterval(() => { if (!S.data || $('btn-back').classList.contains('hidden') === false) return; const g = sig(); if (last === null) { last = g; return; } if (g !== last) { last = g; renderHome(); } }, 30000);
      matchMedia('(min-width:1200px)').addEventListener('change', () => { if (S.data && $('btn-back').classList.contains('hidden')) renderHome(); });
    }

    function boot() {
      icons(); bind(); S.c = LMS.client();
      if (!S.c) return showError('Không tải được thư viện kết nối. Kiểm tra mạng rồi tải lại trang.');
      route();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  })();
  

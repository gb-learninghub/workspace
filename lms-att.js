/* Điểm danh hàng loạt: một cửa sổ duy nhất, xem theo tuần, bấm từng ngày để điểm danh/bỏ điểm danh đồng loạt; buổi có điểm danh tự chuyển Hoàn thành.
   LMSAtt.open({ c: supabaseClient, classes: [...] }) */
(function () {
  'use strict';
    var DAY = 864e5;
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var natural = function (a, b) { return String(a).localeCompare(String(b), 'vi', { numeric: true }); };
  var WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  var ICON = {
    present: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    late: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    absent: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
  };
  var NEXT = { '': 'present', present: 'late', late: 'absent', absent: '' };
  var LABEL = { present: 'Có mặt', late: 'Trễ', absent: 'Vắng' };

  var box, S = null;

  var BASE_MONDAY = new Date(2026, 8, 7);
  function weekDates(w) { var m = new Date(BASE_MONDAY); m.setDate(m.getDate() + (w - 1) * 7); return Array.from({ length: 7 }, function (_, i) { var d = new Date(m); d.setDate(m.getDate() + i); return d; }); }
  function nowWeek() { var n = new Date(), dow = (n.getDay() + 6) % 7, mon = new Date(n.getFullYear(), n.getMonth(), n.getDate() - dow); return 1 + Math.round((mon - BASE_MONDAY) / (7 * DAY)); }
  function dayNow() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function t5(v) { return (v || '').slice(0, 5); }

  function css() {
    var st = document.createElement('style');
    st.textContent = '\
#lms-att{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(22,24,29,.35);animation:attFade .18s ease both}\
#lms-att[hidden]{display:none}#lms-att.out{animation:attFadeOut .16s ease both}\
#lms-att .att-card{width:min(1000px,100%);height:min(780px,calc(100dvh - 32px));display:flex;flex-direction:column;background:#fff;border:1px solid #E4E6EA;border-radius:24px;padding:22px 22px 18px;animation:attPop .22s cubic-bezier(.2,.8,.2,1) both;color:#1B1D22}\
#lms-att.out .att-card{animation:attPopOut .16s ease both}\
#lms-att .att-top{flex:none}\
#lms-att h2{font-size:1.0625rem;font-weight:800;margin:0 0 12px}\
#lms-att .att-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}\
#lms-att .att-bar .sp{flex:1}\
#lms-att .att-btn,#lms-att .att-sel{height:40px;border:1px solid #E4E6EA;border-radius:12px;background:#fff;color:#1B1D22;font:inherit;font-size:.85rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:0 12px;transition:transform .12s ease,background-color .15s ease,border-color .15s ease}\
#lms-att .att-btn:hover,#lms-att .att-sel:hover{background:#F4F5F7}#lms-att .att-btn:active{transform:scale(.95)}\
#lms-att .att-btn.on{background:#16181D;border-color:#16181D;color:#fff}\
#lms-att .att-btn.ic{width:40px;padding:0;justify-content:center}\
#lms-att .att-btn:disabled{opacity:.5;cursor:default}\
#lms-att .att-sel{padding-right:28px;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23778597\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}\
#lms-att .att-wk{min-width:150px;text-align:center;font-weight:800;font-size:.9rem;line-height:1.15}#lms-att .att-wk small{display:block;color:#778597;font-weight:600;font-size:.75rem}\
#lms-att .att-wrap{flex:1;min-height:0;overflow-x:auto;display:flex;flex-direction:column}\
#lms-att .att-table{flex:1;min-height:0;min-width:640px;display:flex;flex-direction:column}\
#lms-att .att-row{display:grid;grid-template-columns:minmax(150px,1.3fr) 84px repeat(var(--n,3),84px) minmax(140px,1.2fr);gap:10px;align-items:center;padding:4px 8px}\
#lms-att .att-head{flex:none;background:#fff;border-bottom:1px solid #d5d9e0;color:#778597;font-size:.8rem;font-weight:700;min-height:40px}\
#lms-att .att-head .c{text-align:center}\
#lms-att .att-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden}\
#lms-att .att-body .att-row{min-height:54px;border-top:1px solid #eceef2}\
#lms-att .att-body .att-row:first-child{border-top:0}\
#lms-att .att-body .att-row.in{animation:attRow .28s ease both;animation-delay:calc(var(--i,0)*24ms)}\
#lms-att .att-body .att-row:hover{background:#f7f8fa}\
#lms-att .att-name{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
#lms-att .att-cls{color:#778597;font-size:.85rem;font-weight:700;text-decoration:none}#lms-att a.att-cls:hover{color:#16181D;text-decoration:underline}\
#lms-att .att-days{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:12px}#lms-att .att-days b{font-size:.8rem;color:#778597;margin-right:2px}#lms-att .att-dy{height:40px;padding:0 12px;flex-direction:column;justify-content:center;gap:0;line-height:1.1}#lms-att .att-dy small{font-size:.68rem;font-weight:600;opacity:.7}#lms-att .att-dy.today{border-color:#16181D}\
#lms-att .att-cell{display:flex;flex-direction:column;align-items:center;gap:2px}\
#lms-att .att-c{width:44px;height:36px;border:1px solid #E4E6EA;border-radius:10px;background:#fff;color:#b8c0cc;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-weight:800;transition:transform .12s ease,background-color .15s ease,border-color .15s ease}\
#lms-att .att-c:active{transform:scale(.88)}\
#lms-att .att-c[data-st=present]{background:#e7f6ec;border-color:#9bd3ad;color:#1d7a3e}\
#lms-att .att-c[data-st=late]{background:#fdf3dc;border-color:#e6c46f;color:#8a6410}\
#lms-att .att-c[data-st=absent]{background:#fde8e6;border-color:#eba39d;color:#b42318}\
#lms-att .att-c:disabled{opacity:.4;cursor:default;background:#f4f5f7}\
#lms-att .att-c.lmt-busy{animation:attPulse .7s ease infinite}\
#lms-att .att-d{font-size:.7rem;color:#8692a1;font-weight:600;white-space:nowrap}\
#lms-att .att-none{color:#c2c9d3;text-align:center}\
#lms-att .att-note{width:100%;height:36px;border:1px solid transparent;border-radius:10px;background:transparent;font:inherit;font-size:.85rem;color:#1B1D22;padding:0 8px}\
#lms-att .att-note:hover{border-color:#E4E6EA}#lms-att .att-note:focus{outline:0;border-color:#16181D;background:#fff}\
#lms-att .att-empty{padding:28px 4px;text-align:center;color:#8692a1;font-size:.9rem}\
#lms-att .att-foot{flex:none;margin-top:14px;display:flex;gap:8px;align-items:center}\
#lms-att .att-foot .sum{flex:1;color:#778597;font-size:.85rem;font-weight:600}\
#lms-att .att-close{min-height:44px;padding:0 20px;border:0;border-radius:12px;background:#F4F5F7;color:#1B1D22;font-weight:700;cursor:pointer;transition:transform .12s ease}#lms-att .att-close:active{transform:scale(.96)}\
@media(max-width:560px){#lms-att{padding:8px}#lms-att .att-card{padding:16px 14px 14px;border-radius:20px;height:calc(100dvh - 16px)}}\
@keyframes attFade{from{opacity:0}to{opacity:1}}@keyframes attFadeOut{to{opacity:0}}\
@keyframes attPop{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}@keyframes attPopOut{to{opacity:0;transform:translateY(8px) scale(.97)}}\
@keyframes attRow{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes attPulse{50%{opacity:.45}}\
@media(prefers-reduced-motion:reduce){#lms-att,#lms-att *{animation:none!important;transition:none!important}}';
    document.head.appendChild(st);
  }

  function build() {
    css();
    box = document.createElement('div'); box.id = 'lms-att'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Điểm danh');
    box.innerHTML = '<div class="att-card">\
<div class="att-top"><h2>Điểm danh</h2>\
<div class="att-bar">\
<button type="button" class="att-btn ic" data-a="prev" aria-label="Tuần trước" title="Tuần trước"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>\
<div class="att-wk" id="att-wk"></div>\
<button type="button" class="att-btn ic" data-a="next" aria-label="Tuần sau" title="Tuần sau"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>\
<button type="button" class="att-btn" data-a="now" id="att-now">Tuần này</button>\
<span class="sp"></span>\
<select class="att-sel" id="att-class" aria-label="Lọc theo lớp"></select>\
</div>\
<div class="att-days" id="att-days"></div></div>\
<div class="att-wrap"><div class="att-table"><div class="att-row att-head" id="att-head"></div><div class="att-body" id="att-body"></div></div></div>\
<div class="att-foot"><span class="sum" id="att-sum"></span><button type="button" class="att-close">Đóng</button></div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('.att-close')) return hide();
      var a = e.target.closest('[data-a]');
      if (a) {
        var k = a.dataset.a;
        if (k === 'prev') { S.week--; load(true); } else if (k === 'next') { S.week++; load(true); } else if (k === 'now') { S.week = nowWeek(); load(true); }
        else if (k === 'day') bulkDay(a);
        return;
      }
      var c = e.target.closest('.att-c'); if (c && !c.disabled) cycle(c);
    });
    box.addEventListener('change', function (e) {
      if (e.target.id === 'att-class') { S.cls = e.target.value; paint(true); }
    });
    box.addEventListener('focusout', function (e) {
      var n = e.target.closest && e.target.closest('.att-note'); if (n) saveNote(n);
    });
    box.addEventListener('keydown', function (e) { if (e.target.classList && e.target.classList.contains('att-note') && e.key === 'Enter') e.target.blur(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden && document.activeElement.tagName !== 'INPUT') hide(); });
  }
  function hide() { if (!box || box.hidden) return; box.classList.add('out'); setTimeout(function () { box.hidden = true; box.classList.remove('out'); }, 150); }
  function toast(m) { if (window.LMS && LMS.toast) LMS.toast(m); }
  function err(e) { toast(window.LMS && LMS.friendlyError ? LMS.friendlyError(e) : (e && e.message) || 'Có lỗi xảy ra.'); }

  async function load(animate) {
    var wd = weekDates(S.week), active = S.classes.filter(function (c) { return !c.is_archived && c.is_active; });
    var ids = active.map(function (c) { return c.id; });
    S.loading = true; paint(false);
    var rs = await S.c.from('students').select('id,student_name,class_id,note').eq('is_active', true).in('class_id', ids);
    var rt = await S.c.from('sessions').select('id,class_id,session_date,start_time,status').in('class_id', ids).gte('session_date', ymd(wd[0])).lte('session_date', ymd(wd[6])).order('session_date').order('start_time');
    if (rs.error || rt.error) { S.loading = false; return err(rs.error || rt.error); }
    var ses = (rt.data || []).filter(function (s) { return s.status !== 'cancel' && s.status !== 'holiday'; });
    var at = [];
    if (ses.length) {
      var ra = await S.c.from('attendance').select('session_id,student_id,status').in('session_id', ses.map(function (s) { return s.id; }));
      if (ra.error) { S.loading = false; return err(ra.error); }
      at = ra.data || [];
    }
    S.byClass = {}; S.sess = {}; ses.forEach(function (s) { (S.byClass[s.class_id] = S.byClass[s.class_id] || []).push(s); S.sess[s.id] = s; });
    S.att = {}; at.forEach(function (a) { S.att[a.session_id + ':' + a.student_id] = a.status === 'excused' ? 'present' : a.status; });
    S.stu = rs.data || [];
    S.cmap = {}; active.forEach(function (c) { S.cmap[c.id] = c; });
    S.loading = false;
    paint(animate);
  }

  function visible() {
    return S.stu.filter(function (s) {
      var ss = S.byClass[s.class_id]; if (!ss || !ss.length) return false;
      return S.cls === 'all' || String(s.class_id) === S.cls;
    }).sort(function (a, b) { return natural((S.cmap[a.class_id] || {}).class_code, (S.cmap[b.class_id] || {}).class_code) || String(a.student_name).localeCompare(String(b.student_name), 'vi'); });
  }

  function paint(animate) {
    var d = weekDates(S.week), fmt = function (x) { return pad(x.getDate()) + '.' + pad(x.getMonth() + 1); };
    document.getElementById('att-wk').innerHTML = 'Tuần ' + pad(S.week) + '<small>' + fmt(d[0]) + ' – ' + fmt(d[6]) + '</small>';
    document.getElementById('att-now').classList.toggle('on', S.week === nowWeek());
    var sel = document.getElementById('att-class'), codes = S.classes.filter(function (c) { return S.byClass && S.byClass[c.id]; }).sort(function (a, b) { return natural(a.class_code, b.class_code); });
    if (S.cls !== 'all' && !codes.some(function (c) { return String(c.id) === S.cls; })) S.cls = 'all';
    sel.innerHTML = '<option value="all">Tất cả lớp</option>' + codes.map(function (c) { return '<option value="' + c.id + '"' + (String(c.id) === S.cls ? ' selected' : '') + '>' + esc(c.class_code) + '</option>'; }).join('');

    var rows = visible(), n = 3;
    rows.forEach(function (s) { n = Math.max(n, (S.byClass[s.class_id] || []).length); });
    var dh = '<b>Điểm danh theo ngày</b>', tk = ymd(dayNow());
    d.forEach(function (x) {
      var k = ymd(x), st = dayState(rows, k);
      dh += '<button type="button" class="att-btn att-dy' + (st === 'all' ? ' on' : '') + (k === tk ? ' today' : '') + '" data-a="day" data-d="' + k + '"' + (st === 'none' || k > tk ? ' disabled' : '') + ' title="' + (st === 'all' ? 'Bỏ điểm danh cả ngày' : 'Có mặt cả ngày') + '">' + WD[x.getDay()] + '<small>' + fmt(x) + '</small></button>';
    });
    document.getElementById('att-days').innerHTML = dh;
    var head = document.getElementById('att-head'); head.style.setProperty('--n', n);
    var h = '<span>Tên</span><span>Lớp</span>'; for (var i = 1; i <= n; i++) h += '<span class="c">Buổi ' + i + '</span>'; h += '<span>Ghi chú</span>';
    head.innerHTML = h;

    var body = document.getElementById('att-body'), keep = body.scrollTop, html = '';
    rows.forEach(function (s, idx) {
      var ss = S.byClass[s.class_id] || [], cl = S.cmap[s.class_id] || {};
      html += '<div class="att-row' + (animate ? ' in' : '') + '" style="--n:' + n + ';--i:' + Math.min(idx, 14) + '" data-stu="' + s.id + '"><span class="att-name" title="' + esc(s.student_name) + '">' + esc(s.student_name) + '</span><a class="att-cls" href="' + esc(cl.page_url || ('class.html?class=' + encodeURIComponent(cl.class_code))) + '" title="Mở lớp ' + esc(cl.class_code) + '">' + esc(cl.class_code) + '</a>';
      for (var j = 0; j < n; j++) {
        var x = ss[j];
        if (!x) { html += '<span class="att-none">–</span>'; continue; }
        var dt = new Date(x.session_date + 'T00:00:00'), v = S.att[x.id + ':' + s.id] || '', fut = x.session_date > ymd(dayNow());
        html += '<span class="att-cell"><button type="button" class="att-c" data-s="' + x.id + '" data-u="' + s.id + '" data-st="' + v + '"' + (fut ? ' disabled' : '') + ' aria-label="' + esc(s.student_name) + (v ? ' · ' + LABEL[v] : '') + '">' + (v ? ICON[v] : '') + '</button><span class="att-d">' + WD[dt.getDay()] + ' ' + pad(dt.getDate()) + '/' + pad(dt.getMonth() + 1) + '</span></span>';
      }
      html += '<input class="att-note" type="text" value="' + esc(s.note || '') + '" data-u="' + s.id + '" placeholder="Ghi chú" aria-label="Ghi chú ' + esc(s.student_name) + '" autocomplete="off"></div>';
    });
    body.innerHTML = html || '<div class="att-empty">' + (S.loading ? 'Đang tải…' : 'Không có buổi học nào trong tuần này.') + '</div>';
    body.scrollTop = keep;
    sum(rows);
  }

  function sum(rows) {
    rows = rows || visible();
    var p = 0, l = 0, a = 0;
    rows.forEach(function (s) { (S.byClass[s.class_id] || []).forEach(function (x) { var v = S.att[x.id + ':' + s.id]; if (v === 'present') p++; else if (v === 'late') l++; else if (v === 'absent') a++; }); });
    document.getElementById('att-sum').textContent = rows.length + ' học viên · ' + p + ' có mặt · ' + l + ' trễ · ' + a + ' vắng';
  }

  function setCell(sid, uid, v) {
    var b = box.querySelector('.att-c[data-s="' + sid + '"][data-u="' + uid + '"]'); if (!b) return;
    b.dataset.st = v || ''; b.innerHTML = v ? ICON[v] : '';
  }
  async function syncSession(sid) {
    var x = S.sess[sid]; if (!x) return;
    var cnt = S.stu.filter(function (u) { return u.class_id === x.class_id && S.att[sid + ':' + u.id]; }).length, to = null;
    if (cnt > 0 && x.status === 'planned') { to = 'done'; x.auto = true; } else if (!cnt && x.status === 'done' && x.auto) { to = 'planned'; x.auto = false; }
    if (!to) return;
    var r = await S.c.from('sessions').update({ status: to, updated_at: new Date().toISOString() }).eq('id', sid);
    if (r.error) return err(r.error);
    x.status = to; toast(to === 'done' ? 'Buổi học đã chuyển Hoàn thành.' : 'Buổi học về Chưa cập nhật.');
  }
  async function cycle(b) {
    var sid = Number(b.dataset.s), uid = Number(b.dataset.u), key = sid + ':' + uid, prev = S.att[key] || '', next = NEXT[prev];
    if (next) S.att[key] = next; else delete S.att[key];
    setCell(sid, uid, next); sum(); b.classList.add('lmt-busy');
    var r = next ? await S.c.from('attendance').upsert({ session_id: sid, student_id: uid, status: next, updated_at: new Date().toISOString() })
      : await S.c.from('attendance').delete().eq('session_id', sid).eq('student_id', uid);
    b.classList.remove('lmt-busy');
    if (r.error) { if (prev) S.att[key] = prev; else delete S.att[key]; setCell(sid, uid, prev); sum(); err(r.error); return; }
    syncSession(sid);
  }
  function daySessions(rows, k) { var out = []; rows.forEach(function (u) { (S.byClass[u.class_id] || []).forEach(function (x) { if (x.session_date === k) out.push({ x: x, u: u }); }); }); return out; }
  function dayState(rows, k) {
    var l = daySessions(rows, k); if (!l.length) return 'none';
    return l.every(function (o) { return S.att[o.x.id + ':' + o.u.id] === 'present'; }) ? 'all' : 'some';
  }
  async function bulkDay(btn) {
    var k = btn.dataset.d, rows = visible(), l = daySessions(rows, k); if (!l.length) return;
    var clear = dayState(rows, k) === 'all', sids = {}; btn.disabled = true;
    if (clear) {
      for (var i = 0; i < l.length; i++) {
        var o = l[i], r = await S.c.from('attendance').delete().eq('session_id', o.x.id).eq('student_id', o.u.id);
        if (r.error) { btn.disabled = false; return err(r.error); }
        delete S.att[o.x.id + ':' + o.u.id]; setCell(o.x.id, o.u.id, ''); sids[o.x.id] = 1;
      }
    } else {
      var add = l.filter(function (o) { return !S.att[o.x.id + ':' + o.u.id]; }).map(function (o) { return { session_id: o.x.id, student_id: o.u.id, status: 'present', updated_at: new Date().toISOString() }; });
      var r2 = await S.c.from('attendance').upsert(add);
      if (r2.error) { btn.disabled = false; return err(r2.error); }
      add.forEach(function (a) { S.att[a.session_id + ':' + a.student_id] = 'present'; setCell(a.session_id, a.student_id, 'present'); sids[a.session_id] = 1; });
    }
    for (var id in sids) await syncSession(Number(id));
    paint(false);
  }
  async function saveNote(inp) {
    var uid = Number(inp.dataset.u), s = S.stu.find(function (x) { return x.id === uid; }); if (!s) return;
    var val = inp.value.trim(); if (val === (s.note || '')) return;
    var r = await S.c.from('students').update({ note: val || null }).eq('id', uid);
    if (r.error) { inp.value = s.note || ''; return err(r.error); }
    s.note = val || null;
  }

  window.LMSAtt = {
    open: function (o) {
      if (!box) build();
      S = { c: o.c, classes: o.classes || [], week: nowWeek(), cls: 'all', byClass: {}, sess: {}, att: {}, stu: [], cmap: {}, loading: true };
      box.classList.remove('out'); box.hidden = false; box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
      paint(true);
      load(true);
    }
  };
})();

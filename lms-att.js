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
  function todayIdx() { return (dayNow().getDay() + 6) % 7; }
  function selKey() { return ymd(weekDates(S.week)[S.day]); }
  function daySes(cid) { var k = selKey(); return (S.byClass[cid] || []).filter(function (x) { return x.session_date === k; }); }
  function t5(v) { return (v || '').slice(0, 5); }

  function css() {
    var st = document.createElement('style');
    st.textContent = '\
#lms-att{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(22,24,29,.35);animation:attFade .18s ease both}\
#lms-att[hidden]{display:none}#lms-att.out{animation:attFadeOut .16s ease both}\
#lms-att .att-card{width:min(1000px,100%);height:min(780px,calc(100dvh - 32px));display:flex;flex-direction:column;background:#fff;border:1px solid #E4E6EA;border-radius:24px;padding:22px 22px 18px;animation:attPop .22s cubic-bezier(.2,.8,.2,1) both;color:#1B1D22}\
#lms-att.out .att-card{animation:attPopOut .16s ease both}\
#lms-att .att-top{flex:none}\
#lms-att h2{font-size:1rem;font-weight:800;margin:0 0 12px}\
#lms-att .att-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}\
#lms-att .att-bar .sp{flex:1}\
#lms-att .att-btn,#lms-att .att-sel{height:40px;border:1px solid #E4E6EA;border-radius:12px;background:#fff;color:#1B1D22;font:inherit;font-size:.875rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:0 12px;transition:transform .12s ease,background-color .15s ease,border-color .15s ease}\
#lms-att .att-btn:hover,#lms-att .att-sel:hover{background:#F4F5F7}#lms-att .att-btn:active{transform:scale(.95)}\
#lms-att .att-btn.on{background:#16181D;border-color:#16181D;color:#fff}\
#lms-att .att-btn.ic{width:40px;padding:0;justify-content:center}\
#lms-att .att-btn:disabled{opacity:.5;cursor:default}\
#lms-att .att-sel{padding-right:28px;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23778597\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}\
#lms-att .att-wk{min-width:110px;text-align:center;font-weight:800;font-size:.875rem;line-height:1.15}#lms-att .att-wk small{display:block;color:#778597;font-weight:600;font-size:.75rem}\
#lms-att .att-wrap{flex:1;min-height:0;overflow-x:auto;display:flex;flex-direction:column}\
#lms-att .att-table{flex:1;min-height:0;min-width:760px;display:flex;flex-direction:column}\
#lms-att .att-row{display:grid;grid-template-columns:minmax(150px,.8fr) 86px 64px repeat(var(--n,1),88px) minmax(200px,1.4fr);gap:14px;align-items:center;padding:4px 8px}\
#lms-att .att-head{flex:none;background:#fff;border-bottom:1px solid #d5d9e0;color:#778597;font-size:.8125rem;font-weight:700;min-height:40px}\
#lms-att .att-head .c{text-align:center}#lms-att .att-head>span:last-child{padding-left:28px}#lms-att .att-cell{align-self:center;justify-content:center}\
#lms-att .att-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden}\
#lms-att .att-body .att-row{min-height:54px;border-top:1px solid #eceef2}\
#lms-att .att-body .att-row:first-child{border-top:0}\
#lms-att .att-body .att-row.in{animation:attRow .28s ease both;animation-delay:calc(var(--i,0)*24ms)}\
#lms-att .att-body .att-row:hover{background:#f7f8fa}\
#lms-att .att-name{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
#lms-att .att-tm{color:#5a6577;font-size:.875rem;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}#lms-att .att-cls{color:#778597;font-size:.875rem;font-weight:700;text-decoration:none}#lms-att a.att-cls:hover{color:#16181D;text-decoration:underline}\
#lms-att .att-cal{background:#F4F5F7;border-radius:20px;padding:12px 14px 10px;margin-bottom:12px}#lms-att .att-cal .att-bar{margin-bottom:6px}#lms-att .att-cal .att-btn{background:#fff}#lms-att .att-btn{border-radius:999px}#lms-att .att-nav3{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px}#lms-att .att-nav{display:flex;align-items:center;gap:6px}#lms-att .att-r{justify-self:end}#lms-att .att-sel{border-radius:999px}#lms-att .att-tg.undo{background:#16181D;border-color:#16181D;color:#fff}#lms-att .att-cal .att-btn.cur{background:#F3E9C6;border-color:#F3E9C6}#lms-att .att-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}#lms-att .att-acts .sp{flex:1}\
#lms-att .att-days{display:flex;gap:0}#lms-att .att-dp{flex:1;min-width:0;padding:0;border:0;background:transparent;color:#1B1D22;font:inherit;display:flex;justify-content:center;cursor:pointer}#lms-att .att-dp .pl{width:64px;min-height:70px;border-radius:999px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:background-color .15s ease,transform .12s ease}#lms-att .att-dp:active .pl{transform:scale(.95)}#lms-att .att-dp:hover .pl{background:#eceef2}#lms-att .att-dp span{font-size:.8125rem;font-weight:700;color:#5a6577}#lms-att .att-dp b{font-size:1.125rem;font-weight:800;line-height:1}#lms-att .att-dp i{width:6px;height:6px;border-radius:50%;background:transparent;margin-top:2px}#lms-att .att-dp.has i{background:#B07F2C}#lms-att .att-dp.on .pl{background:#F3E9C6}#lms-att .att-dp.on span,#lms-att .att-dp.on b{color:#7a5a12}\
#lms-att .att-cell{display:flex;flex-direction:column;align-items:center;gap:2px}\
#lms-att .att-c{width:44px;height:36px;border:1px solid #E4E6EA;border-radius:10px;background:#fff;color:#b8c0cc;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-weight:800;transition:transform .12s ease,background-color .15s ease,border-color .15s ease}\
#lms-att .att-c:active{transform:scale(.88)}\
#lms-att .att-c[data-st=present]{background:#e7f6ec;border-color:#9bd3ad;color:#1d7a3e}\
#lms-att .att-c[data-st=late]{background:#fdf3dc;border-color:#e6c46f;color:#8a6410}\
#lms-att .att-c[data-st=absent]{background:#fde8e6;border-color:#eba39d;color:#b42318}\
#lms-att .att-c:disabled{opacity:.4;cursor:default;background:#f4f5f7}\
#lms-att .att-c.lmt-busy{animation:attPulse .7s ease infinite}\
#lms-att .att-d{font-size:.75rem;color:#8692a1;font-weight:600;white-space:nowrap}\
#lms-att .att-none{color:#c2c9d3;text-align:center}\
#lms-att .att-note{width:calc(100% - 20px);margin-left:20px;height:36px;border:1px solid transparent;border-radius:10px;background:transparent;font:inherit;font-size:.875rem;color:#1B1D22;padding:0 8px}\
#lms-att .att-note:hover{border-color:#E4E6EA}#lms-att .att-note:focus{outline:0;border-color:#16181D;background:#fff}\
#lms-att .att-empty{padding:28px 4px;text-align:center;color:#8692a1;font-size:.875rem}\
#lms-att .att-foot{flex:none;margin-top:14px;display:flex;gap:8px;align-items:center}\
#lms-att .att-foot .sum{flex:1;color:#778597;font-size:.875rem;font-weight:600}\
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
<div class="att-cal"><div class="att-bar att-nav3"><span></span><div class="att-nav"><button type="button" class="att-btn ic" data-a="prev" aria-label="Tuần trước" title="Tuần trước"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>\
<div class="att-wk" id="att-wk"></div><button type="button" class="att-btn ic" data-a="next" aria-label="Tuần sau" title="Tuần sau"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>\
</div><div class="att-r"><button type="button" class="att-btn" data-a="now" id="att-now">Tuần này</button></div></div>\
<div class="att-days" id="att-days"></div></div>\
<div class="att-acts">\
<select class="att-sel" id="att-class" aria-label="Lọc theo lớp"></select>\
<span class="sp"></span>\
<button type="button" class="att-btn ic" data-a="toggle" id="att-tg"></button>\
</div></div>\
<div class="att-wrap"><div class="att-table"><div class="att-row att-head" id="att-head"></div><div class="att-body" id="att-body"></div></div></div>\
<div class="att-foot"><span class="sum" id="att-sum"></span><button type="button" class="att-close">Đóng</button></div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('.att-close')) return hide();
      var a = e.target.closest('[data-a]');
      if (a) {
        var k = a.dataset.a;
        if (k === 'prev') { S.week--; load(true); } else if (k === 'next') { S.week++; load(true); } else if (k === 'now') { if (S.week !== nowWeek()) { S.week = nowWeek(); S.day = todayIdx(); load(true); } }
        else if (k === 'dpick') { S.day = Number(a.dataset.i); paint(true); }
        else if (k === 'toggle') markDay(a, !allMarked());
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
    var wd = weekDates(S.week), active = S.classes.filter(function (c) { return !c.is_archived && c.is_active && !/teacher/i.test(c.class_code || ''); });
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
      if (!daySes(s.class_id).length) return false;
      return S.cls === 'all' || String(s.class_id) === S.cls;
    }).sort(function (a, b) { return natural((S.cmap[a.class_id] || {}).class_code, (S.cmap[b.class_id] || {}).class_code) || String(a.student_name).localeCompare(String(b.student_name), 'vi'); });
  }
  function paint(animate) {
    var d = weekDates(S.week), cur = S.week === nowWeek(), nb = document.getElementById('att-now');
    document.getElementById('att-wk').innerHTML = 'Tuần ' + pad(S.week) + '<small>' + pad(d[0].getDate()) + '.' + pad(d[0].getMonth() + 1) + ' – ' + pad(d[6].getDate()) + '.' + pad(d[6].getMonth() + 1) + '</small>';
    nb.classList.toggle('cur', cur); nb.setAttribute('aria-disabled', cur ? 'true' : 'false');
    var sel = document.getElementById('att-class'), codes = S.classes.filter(function (c) { return S.byClass && S.byClass[c.id]; }).sort(function (a, b) { return natural(a.class_code, b.class_code); });
    if (S.cls !== 'all' && !codes.some(function (c) { return String(c.id) === S.cls; })) S.cls = 'all';
    sel.innerHTML = '<option value="all">Tất cả lớp</option>' + codes.map(function (c) { return '<option value="' + c.id + '"' + (String(c.id) === S.cls ? ' selected' : '') + '>' + esc(c.class_code) + '</option>'; }).join('');

    var rows = visible(), n = 1;
    rows.forEach(function (s) { n = Math.max(n, daySes(s.class_id).length); });
    var dh = '';
    d.forEach(function (x, i) {
      var k = ymd(x), has = S.stu.length && S.classes.some(function (c) { return (S.byClass[c.id] || []).some(function (y) { return y.session_date === k; }); });
      dh += '<button type="button" class="att-dp' + (i === S.day ? ' on' : '') + (has ? ' has' : '') + (ymd(x) === ymd(dayNow()) ? ' today' : '') + '" data-a="dpick" data-i="' + i + '"><div class="pl"><span>' + WD[x.getDay()] + '</span><b>' + x.getDate() + '</b><i></i></div></button>';
    });
    document.getElementById('att-days').innerHTML = dh;
    var head = document.getElementById('att-head'); head.style.setProperty('--n', n);
    var h = '<span>Tên</span><span>Lớp</span><span>Giờ</span>'; for (var i = 1; i <= n; i++) h += '<span class="c">Điểm danh' + (n > 1 ? ' ' + i : '') + '</span>'; h += '<span>Ghi chú</span>';
    head.innerHTML = h;

    var body = document.getElementById('att-body'), keep = body.scrollTop, html = '';
    rows.forEach(function (s, idx) {
      var ss = daySes(s.class_id), cl = S.cmap[s.class_id] || {};
      html += '<div class="att-row' + (animate ? ' in' : '') + '" style="--n:' + n + ';--i:' + Math.min(idx, 14) + '" data-stu="' + s.id + '"><span class="att-name" title="' + esc(s.student_name) + '">' + esc(s.student_name) + '</span><a class="att-cls" href="' + esc(cl.page_url || ('class.html?class=' + encodeURIComponent(cl.class_code))) + '" title="Mở lớp ' + esc(cl.class_code) + '">' + esc(cl.class_code) + '</a><span class="att-tm">' + ss.map(function (x) { return t5(x.start_time); }).join(' · ') + '</span>';
      for (var j = 0; j < n; j++) {
        var x = ss[j];
        if (!x) { html += '<span class="att-none">–</span>'; continue; }
        var v = S.att[x.id + ':' + s.id] || '', fut = x.session_date > ymd(dayNow());
        html += '<span class="att-cell"><button type="button" class="att-c" data-s="' + x.id + '" data-u="' + s.id + '" data-st="' + v + '"' + (fut ? ' disabled' : '') + ' aria-label="' + esc(s.student_name) + (v ? ' · ' + LABEL[v] : '') + '">' + (v ? ICON[v] : '') + '</button></span>';
      }
      html += '<input class="att-note" type="text" value="' + esc(s.note || '') + '" data-u="' + s.id + '" placeholder="Ghi chú" aria-label="Ghi chú ' + esc(s.student_name) + '" autocomplete="off"></div>';
    });
    body.innerHTML = html || '<div class="att-empty">' + (S.loading ? 'Đang tải…' : 'Ngày này không có buổi học.') + '</div>';
    body.scrollTop = keep;
    sum(rows);
  }

  function dayCells(rows) { var l = [], t = ymd(dayNow()); (rows || visible()).forEach(function (u) { daySes(u.class_id).forEach(function (x) { if (x.session_date <= t) l.push({ x: x, u: u }); }); }); return l; }
  function allMarked() { var l = dayCells(); return l.length > 0 && l.every(function (o) { return S.att[o.x.id + ':' + o.u.id]; }); }
  var IC_ALL = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>';
  var IC_NONE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';
  function sum(rows) {
    rows = rows || visible();
    var p = 0, l = 0, a = 0;
    rows.forEach(function (s) { daySes(s.class_id).forEach(function (x) { var v = S.att[x.id + ':' + s.id]; if (v === 'present') p++; else if (v === 'late') l++; else if (v === 'absent') a++; }); });
    var tg = document.getElementById('att-tg'), am = allMarked(), cells = dayCells(rows);
    tg.innerHTML = am ? IC_NONE : IC_ALL; tg.classList.toggle('undo', am); tg.disabled = !cells.length;
    tg.title = tg.ariaLabel = am ? 'Hủy điểm danh tất cả' : 'Điểm danh tất cả';
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
  async function markDay(btn, on) {
    var l = []; visible().forEach(function (u) { daySes(u.class_id).forEach(function (x) { l.push({ x: x, u: u }); }); });
    var sids = {}, today = ymd(dayNow());
    btn.disabled = true;
    if (on) {
      var add = l.filter(function (o) { return o.x.session_date <= today && !S.att[o.x.id + ':' + o.u.id]; }).map(function (o) { return { session_id: o.x.id, student_id: o.u.id, status: 'present', updated_at: new Date().toISOString() }; });
      if (!add.length) { btn.disabled = false; return toast('Không còn ô trống nào để điểm danh.'); }
      var r = await S.c.from('attendance').upsert(add);
      if (r.error) { btn.disabled = false; return err(r.error); }
      add.forEach(function (a) { S.att[a.session_id + ':' + a.student_id] = 'present'; sids[a.session_id] = 1; });
    } else {
      var del = l.filter(function (o) { return S.att[o.x.id + ':' + o.u.id]; });
      if (!del.length) { btn.disabled = false; return toast('Ngày này chưa có điểm danh nào.'); }
      for (var sid in (function () { var m = {}; del.forEach(function (o) { m[o.x.id] = 1; }); return m; })()) {
        var ids = del.filter(function (o) { return o.x.id === Number(sid); }).map(function (o) { return o.u.id; });
        var r2 = await S.c.from('attendance').delete().eq('session_id', Number(sid)).in('student_id', ids);
        if (r2.error) { btn.disabled = false; paint(false); return err(r2.error); }
        ids.forEach(function (u) { delete S.att[sid + ':' + u]; }); sids[sid] = 1;
      }
    }
    for (var id in sids) await syncSession(Number(id));
    btn.disabled = false; paint(false);
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
      S = { c: o.c, classes: o.classes || [], week: nowWeek(), day: todayIdx(), cls: 'all', byClass: {}, sess: {}, att: {}, stu: [], cmap: {}, loading: true };
      box.classList.remove('out'); box.hidden = false; box.style.animation = 'none'; void box.offsetWidth; box.style.animation = '';
      paint(true);
      load(true);
    }
  };
})();

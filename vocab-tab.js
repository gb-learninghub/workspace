/* gblearning: tab "Sổ từ vựng" trong student.html. Gọi GBVocabTab.mount(root, { c, code }). */
(function (w) {
  'use strict';
  var V = w.GBVocab, esc = V.esc, ST = {};
  var CSS = '.vnb{color:var(--t-ink,#1B1D22)}.vnb button{font:inherit;cursor:pointer}.vnb svg{width:18px;height:18px;flex:none}' +
    '.vnb-tb{display:flex;align-items:center;gap:6px;margin:4px 0 10px}.vnb-search{flex:1;min-width:0;display:flex;align-items:center;gap:8px;height:44px;padding:0 12px;border:1px solid var(--t-border,#E4E6EA);border-radius:22px;background:#fff}' +
    '.vnb-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font-size:16px}.vnb-ib{width:44px;height:44px;border-radius:22px;border:1px solid var(--t-border,#E4E6EA);background:#fff;color:#1B1D22;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:0}' +
    '.vnb-ib.on{background:#16181D;border-color:#16181D;color:#fff}.vnb-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:4px}.vnb .vf{margin-bottom:4px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}.vnb .vf::-webkit-scrollbar{display:none}.vnb .vf>*{flex:none}.vnb-chips .vnb-chip{min-height:44px;white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.vnb-chip{border:1px solid var(--t-border,#E4E6EA);background:#fff;border-radius:20px;min-height:40px;padding:0 14px;font-size:.875rem;font-weight:600;color:#596579}.vnb-chip.on{background:#16181D;border-color:#16181D;color:#fff}' +
    '.vnb-scroll{overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.vnb-scroll .vnb-pg{padding-bottom:12px}.vnb-scroll .vnb-pno{display:none}.vnb-nav{margin:8px 0 0!important}' +
    '.vnb-st{font-size:.8125rem;color:var(--t-muted,#818999);margin:2px 0 4px}.vnb-grp{font-size:.8125rem;font-weight:700;color:var(--t-muted,#818999);padding:14px 0 6px}' +
    '.vnb-row{display:flex;gap:10px;align-items:flex-start}.vnb-ck{width:26px;height:26px;margin-top:5px;border-radius:50%;border:1.5px solid #B9BDC6;background:#fff;color:transparent;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:0}' +
    '.vnb-ck.on{background:#16181D;border-color:#16181D;color:#fff}.vnb-body{flex:1;min-width:0}.vnb-head{display:block;width:100%;border:0;background:transparent;padding:0;text-align:left;color:inherit;min-height:30px}' +
    '.vnb-hid{color:var(--t-muted,#818999);border:0;background:transparent;padding:0;text-align:left;min-height:30px}' +
    '.vnb-det .meta{color:var(--t-muted,#818999);font-size:.8125rem}.vnb-act{display:flex;gap:6px}' +
    '.vnb-sm{width:44px;height:44px;border-radius:22px;border:1px solid var(--t-border,#E4E6EA);background:#fff;color:#454B57;display:inline-flex;align-items:center;justify-content:center;padding:0;flex:none}' +
    '.vnb-edit{display:flex;gap:6px;flex-wrap:nowrap;align-items:center}.vnb-edit .vnb-btn{padding:0 14px;flex:none}.vnb-edit input{flex:1 1 auto;min-width:0;width:auto!important;box-sizing:border-box;height:44px;min-height:0!important}.vnb-edit .vnb-btn{height:44px;min-height:0}.vnb-edit input,.vnb-pn input,.vnb-pn textarea{width:100%;min-height:44px;padding:8px 12px;border:1px solid var(--t-border,#D5D8DE);border-radius:12px;font-size:16px;background:#fff;outline:0}' +
    '.vnb-pn{border:1px solid var(--t-border,#E4E6EA);border-radius:14px;padding:12px;margin:0 0 10px;display:flex;flex-direction:column;gap:8px}.vnb-pt{font-weight:700;font-size:.9375rem}.vnb-pn textarea{min-height:150px;resize:vertical;line-height:1.5}' +
    '.vnb-pa{display:flex;gap:8px;justify-content:flex-end;align-items:center}.vnb-btn{min-height:44px;padding:0 18px;border-radius:22px;border:1px solid var(--t-border,#D5D8DE);background:#fff;font-weight:600;color:#1B1D22}.vnb-btn.pri{background:#16181D;border-color:#16181D;color:#fff}' +
    '.vnb-hint{font-size:.875rem;color:#454B57}.vnb-err{font-size:.875rem;color:#B42318}.vnb-empty{padding:28px 4px;text-align:center;color:var(--t-muted,#818999);font-size:.9375rem;line-height:1.6}';


  var CSS2 = '.vnb-book{position:relative;perspective:1800px}.vnb-2{display:grid;grid-template-columns:1fr 1fr}' +
    '.vnb-pg{position:relative;box-sizing:border-box;height:100%;background:#fff;padding:0 0 30px;display:flex;flex-direction:column}' +
    '.vnb-2>.vnb-pg:first-child{padding-right:20px;border-right:1px solid #E4E6EA}.vnb-2>.vnb-pg:last-child{padding-left:20px}' +
    '.vnb-pg .vnb-grp{padding:8px 2px 0}.vnb-pno{position:absolute;bottom:4px;left:0;right:0;text-align:center;font-size:.75rem;color:#818999}' +
    '.vnb-leaf{position:absolute;top:0;bottom:0;left:0;right:0;transform-origin:left center;transform-style:preserve-3d;transition:transform .6s cubic-bezier(.4,.1,.2,1);pointer-events:none}.vnb-leaf.sp{left:50%}' +
    '.vnb-leaf.bwd{transform:rotateY(-180deg)}.vnb-leaf.fwd.go{transform:rotateY(-180deg)}.vnb-leaf.bwd.go{transform:none}' +
    '.vnb-face{position:absolute;top:0;bottom:0;left:0;right:0;background:#fff;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden}.vnb-face.b{transform:rotateY(180deg)}.vnb-leaf.sp .vnb-face.f .vnb-pg{padding-left:20px}.vnb-leaf.sp .vnb-face.b .vnb-pg{padding-right:20px;border-right:1px solid #E4E6EA}' +
    '.vnb-nav{display:flex;align-items:center;justify-content:center;gap:14px;margin:10px 0}.vnb-pi{font-size:.875rem;color:#596579;min-width:90px;text-align:center}.vnb-nav .vnb-sm[disabled]{opacity:.35}' +
    '@media (prefers-reduced-motion:reduce){.vnb-leaf{transition:none}}';
  var LV = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  function injectCss() { V.uiCss(); if (document.getElementById('vnb-css')) return; var s = document.createElement('style'); s.id = 'vnb-css'; s.textContent = CSS + CSS2; document.head.appendChild(s); }
  function icons() { if (w.lucide) w.lucide.createIcons(); }
  function toast(m) { if (w.LMS && w.LMS.toast) w.LMS.toast(m); }
  function err(e) { return (w.LMS && w.LMS.friendlyError) ? w.LMS.friendlyError(e) : ((e && e.message) || 'Có lỗi xảy ra'); }
  function weekLabel(k) { var m = /^\d{4}-(\d{2})-(\d{2})/.exec(k || ''); return m ? 'Tuần ' + m[2] + '/' + m[1] : 'Khác'; }

  /* nghĩa đề xuất của giáo viên là nghĩa chính; nghĩa em tự ghi (nếu khác) nằm bên dưới */
  function ownOf(x) { return x.status === 'typed' && x.meaning && (!x.bank_meaning || V.key(x.meaning) !== V.key(x.bank_meaning)) ? x.meaning : ''; }
  function meanHtml(x) {
    var bm = x.bank_meaning, om = ownOf(x);
    if (!bm) return esc(x.meaning);
    return esc(bm) + (om ? '<div class="ve-sub">Nghĩa của bạn: ' + esc(om) + '</div>' : '');
  }
  function mount(root, o) {
    if (!root) return;
    injectCss();
    var st = ST[o.code] || (ST[o.code] = { items: null, q: '', f: 'all', pos: '', topic: '', sort: 'new', group: 'week', hide: 'off', reveal: {}, pop: null, edit: null, panel: null, busy: false, msg: '' });
    var api = V.api(o.c, o.code), hintTimer = null, flipping = false;

    root.innerHTML = '<div class="vnb"><div class="vnb-bar"></div><div class="vnb-pn-wrap"></div><div class="vnb-list"></div></div>';
    var bar = root.querySelector('.vnb-bar'), pnw = root.querySelector('.vnb-pn-wrap'), list = root.querySelector('.vnb-list');

    function posOf(x) { return x.pos; }
    function topicOf(x) { return x.topic; }
    function view() {
      var q = V.key(st.q);
      var L = (st.items || []).filter(function (x) {
        if (st.f === 'no' && x.learned) return false;
        if (st.f === 'yes' && !x.learned) return false;
        if (st.f === 'wait' && x.status === 'approved') return false;
        if (!V.match(x, st.pos, st.topic, posOf, topicOf)) return false;
        return !q || V.key(x.word).indexOf(q) > -1 || V.key(x.meaning || '').indexOf(q) > -1 || V.key(x.topic || '').indexOf(q) > -1;
      });
      var cmp = st.sort === 'az' ? function (a, b) { return V.key(a.word) < V.key(b.word) ? -1 : 1; }
        : st.sort === 'lv' ? function (a, b) { return (LV[a.level] || 9) - (LV[b.level] || 9) || (V.key(a.word) < V.key(b.word) ? -1 : 1); }
        : st.sort === 'seen' ? function (a, b) { return (b.seen - a.seen) || (V.key(a.word) < V.key(b.word) ? -1 : 1); }
        : function (a, b) { return (a.week < b.week ? 1 : a.week > b.week ? -1 : 0) || (b.id - a.id); };
      return L.sort(cmp);
    }

    function statText() {
      return (st.items ? view().length + ' từ · ' : '') + (st.group === 'week' ? 'Nhóm theo tuần' : st.group === 'topic' ? 'Nhóm theo chủ đề' : 'Không nhóm') + ' · ' + (st.sort === 'az' ? 'A đến Z' : st.sort === 'seen' ? 'Gặp lại nhiều nhất' : st.sort === 'lv' ? 'Cấp độ dễ đến khó' : 'Mới nhất') + (st.hide === 'meaning' ? ' · Đang ẩn nghĩa' : st.hide === 'word' ? ' · Đang ẩn từ' : '');
    }

    function renderBar() {
      var it = st.items || [], n = function (fn) { return it.filter(fn).length; };
      var cnt = { all: it.length, no: n(function (x) { return !x.learned; }), yes: n(function (x) { return x.learned; }), wait: n(function (x) { return x.status !== 'approved'; }) };
      var chips = [['all', 'Tất cả'], ['no', 'Chưa thuộc'], ['yes', 'Đã thuộc'], ['wait', 'Chờ nghĩa']].map(function (a) { return '<button type="button" class="vnb-chip' + (st.f === a[0] ? ' on' : '') + '" data-vnb="chip" data-f="' + a[0] + '">' + a[1] + ' ' + cnt[a[0]] + '</button>'; }).join('');
      var fo = V.filterOpts(it, posOf, topicOf);
      if (!fo.has('pos', st.pos)) st.pos = '';
      if (!fo.has('topic', st.topic)) st.topic = '';
      var drops = V.select('data-vnb-sel="pos" aria-label="Lọc theo từ loại"', 'Từ loại', fo.pos, st.pos) + V.select('data-vnb-sel="topic" aria-label="Lọc theo chủ đề"', 'Chủ đề', fo.topic, st.topic);
      var hideIcon = st.hide === 'off' ? 'eye' : st.hide === 'meaning' ? 'eye-off' : 'languages';
      var focus = document.activeElement && document.activeElement.matches && document.activeElement.matches('[data-vnb-q]');
      bar.innerHTML = '<div class="vnb-tb"><label class="vnb-search"><i data-lucide="search"></i><input type="search" data-vnb-q placeholder="Tìm từ hoặc nghĩa" value="' + esc(st.q) + '" aria-label="Tìm từ"></label>' +
        '<button type="button" class="vnb-ib' + (st.hide !== 'off' ? ' on' : '') + '" data-vnb="hide" aria-label="Ẩn nghĩa hoặc ẩn từ để tự kiểm tra"><i data-lucide="' + hideIcon + '"></i></button>' +
        '<button type="button" class="vnb-ib" data-vnb="sort" aria-label="Đổi cách sắp xếp"><i data-lucide="arrow-up-down"></i></button>' +
        '<button type="button" class="vnb-ib" data-vnb="group" aria-label="Đổi cách nhóm"><i data-lucide="layers"></i></button>' +
        '<button type="button" class="vnb-ib' + (st.panel === 'import' ? ' on' : '') + '" data-vnb="import" aria-label="Nhập danh sách từ"><i data-lucide="clipboard-paste"></i></button>' +
        '<button type="button" class="vnb-ib" data-vnb="export" aria-label="Sao chép sổ"><i data-lucide="download"></i></button>' +
        '<button type="button" class="vnb-ib on" data-vnb="add" aria-label="Thêm từ"><i data-lucide="plus"></i></button></div>' +
        '<div class="vf vnb-chips">' + drops + chips + '</div><div class="vnb-st">' + statText() + '</div>';
      icons();
      if (focus) { var i = bar.querySelector('[data-vnb-q]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    }

    function rowHtml(x) {
      var hiddenMean = st.hide === 'meaning' && !st.reveal[x.id] && x.meaning, hiddenWord = st.hide === 'word' && !st.reveal[x.id];
      var au = 'data-vnb="say" data-id="' + x.id + '"', tap = !hiddenMean && !hiddenWord;
      var mean = !x.meaning ? V.pill('chờ nghĩa', 'warn')
        : hiddenMean ? '<button type="button" class="vnb-hid" data-vnb="reveal" data-id="' + x.id + '">Chạm để hiện nghĩa</button>'
          : meanHtml(x);
      var top = hiddenWord ? '<div class="ve-top"><button type="button" class="vnb-hid" data-vnb="reveal" data-id="' + x.id + '">Chạm để hiện từ</button><button type="button" class="ve-au" ' + au + ' aria-label="Phát âm"><i data-lucide="volume-2"></i></button></div>'
        : V.entryTop({ word: x.word, pos: x.pos, ipa: x.ipa, au: au });
      return '<div class="vnb-row ve' + (tap ? ' tap' : '') + (st.pop === x.id ? ' on' : '') + '"' + (tap ? ' data-vnb="open" data-id="' + x.id + '" role="button" tabindex="0" aria-haspopup="dialog" aria-label="Xem đầy đủ từ ' + esc(x.word) + '"' : '') + '>' +
        '<button type="button" class="vnb-ck' + (x.learned ? ' on' : '') + '" data-vnb="learn" data-id="' + x.id + '" aria-label="' + (x.learned ? 'Bỏ đánh dấu đã thuộc' : 'Đánh dấu đã thuộc') + '" aria-pressed="' + (x.learned ? 'true' : 'false') + '"><i data-lucide="check"></i></button>' +
        '<div class="vnb-body">' + top + V.entryRow2(mean, x.topic) + '</div></div>';
    }
    /* Pop up bản đầy đủ của từ: ví dụ, định nghĩa, ghi chú, sửa nghĩa, đánh dấu thuộc, xóa */
    function popHtml(x) {
      var ed = st.edit && st.edit.id === x.id;
      var actions = ed ? '' : '<button type="button" class="' + (x.learned ? '' : 'pri') + '" data-vnb="learn" data-id="' + x.id + '"><i data-lucide="check"></i>' + (x.learned ? 'Bỏ đánh dấu thuộc' : 'Đã thuộc') + '</button>' +
        (x.source === 'self' ? '<button type="button" class="del" data-vnb="del" data-id="' + x.id + '"><i data-lucide="trash-2"></i>Xóa từ</button>' : '');
      var edit = ed ? '<div class="vnb-edit" style="margin-top:18px"><input data-vnb-edit value="' + esc(x.status === 'typed' ? x.meaning : '') + '" placeholder="Nghĩa tiếng Việt của em" aria-label="Nghĩa tiếng Việt"><button type="button" class="vnb-btn pri" data-vnb="edit-save" data-id="' + x.id + '">Lưu</button><button type="button" class="vnb-btn" data-vnb="edit-cancel">Hủy</button></div>' : '';
      return '<div class="vnb">' + V.fullHtml({ word: x.word, pos: x.pos, ipa: x.ipa, topic: x.topic, au: 'data-vnb="say" data-id="' + x.id + '"',
        mean: x.meaning ? meanHtml(x) : V.pill('chờ nghĩa', 'warn'), def: x.definition, ex: x.example, note: x.note,
        meta: (x.level ? 'Cấp độ ' + esc(x.level) + ' · ' : '') + (x.source === 'lesson' ? 'Từ bài học' : 'Em tự thêm') + ' · gặp ' + x.seen + ' lần',
        edit: ed ? '' : 'data-vnb="edit" data-id="' + x.id + '" aria-label="Sửa nghĩa" title="Sửa nghĩa"', extra: edit, actions: actions }) + '</div>';
    }
    function openPop(x) {
      st.pop = x.id; st.edit = null;
      V.modal(popHtml(x), { onClick: onClick, onKey: onKey, onClose: function () { st.pop = null; st.edit = null; renderList(); } });
      renderList();
    }
    function refreshPop() { var m = V.modalOpen(), x = st.pop && byId(st.pop); if (m && x) m.set(popHtml(x)); else if (m && st.pop) V.closeModal(); }
    function popInput() { return document.querySelector('.vm [data-vnb-edit]'); }

    function spread() { return root.clientWidth >= 820; }
    function perPage() { return spread() ? 10 : 8; }
    function grpOf(x) { return st.group === 'week' ? weekLabel(x.week) : st.group === 'topic' ? (x.topic || 'Chưa có chủ đề') : ''; }
    function paginate(L) {
      var N = perPage(), pages = [], cur = null, lastG = null;
      function np() { cur = { units: 0, parts: [] }; pages.push(cur); lastG = null; }
      np();
      L.forEach(function (x) {
        var g = grpOf(x), needH = !!g && g !== lastG;
        if (cur.units + (needH ? 2 : 1) > N && cur.parts.length) { np(); needH = !!g; }
        if (needH) { cur.parts.push({ h: g }); cur.units++; lastG = g; }
        cur.parts.push({ x: x }); cur.units++;
      });
      return pages;
    }
    function pageHtml(p, no) {
      var h = p.parts.map(function (t) { return t.h ? '<div class="vnb-grp">' + esc(t.h) + '</div>' : rowHtml(t.x); }).join('');
      return '<div class="vnb-pg">' + h + '<div class="vnb-pno">' + no + '</div></div>';
    }
    function blankPage() { return '<div class="vnb-pg"></div>'; }
    function pg(i) { return st.pages[i] ? pageHtml(st.pages[i], i + 1) : blankPage(); }
    function steps() { return spread() ? Math.ceil(st.pages.length / 2) : st.pages.length; }
    function drawBook(L) {
      L = L || view();
      var sig = [st.f, st.pos, st.topic, st.q, st.sort, st.group, perPage(), spread()].join('|');
      if (st._sig !== sig) { st._sig = sig; st.page = 0; }
      st.pages = paginate(L);
      var n = steps(); st.page = Math.max(0, Math.min(st.page || 0, n - 1));
      var P = st.pages.length, t = st.page, body, label;
      if (spread()) { body = '<div class="vnb-2">' + pg(2 * t) + pg(2 * t + 1) + '</div>'; label = (2 * t + 2 > P) ? (2 * t + 1) : ((2 * t + 1) + '–' + (2 * t + 2)); }
      else { body = pg(t); label = String(t + 1); }
      var nav = n > 1 ? '<div class="vnb-nav"><button type="button" class="vnb-sm" data-vnb-go="-1" aria-label="Trang trước"' + (t === 0 ? ' disabled' : '') + '><i data-lucide="chevron-left"></i></button><span class="vnb-pi">Trang ' + label + '/' + P + '</span><button type="button" class="vnb-sm" data-vnb-go="1" aria-label="Trang sau"' + (t >= n - 1 ? ' disabled' : '') + '><i data-lucide="chevron-right"></i></button></div>' : '';
      var old = list.querySelector('.vnb-scroll'), keep = old && st._shown === sig + '#' + t ? old.scrollTop : 0;
      st._shown = sig + '#' + t;
      list.innerHTML = '<div class="vnb-scroll"><div class="vnb-book">' + body + '</div></div>' + nav; icons();
      fit(); var sc = list.querySelector('.vnb-scroll'); if (sc) sc.scrollTop = keep;
    }
    /* Cố định thanh trên và thanh số trang: chỉ vùng từ vựng cuộn, chiều cao vừa khít màn hình */
    function scrollParent(el) {
      for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) { var o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p; }
      return document.scrollingElement || document.documentElement;
    }
    function fit() {
      var sc = list.querySelector('.vnb-scroll'); if (!sc || !document.body.contains(sc)) return;
      var anc = scrollParent(root), nav = list.querySelector('.vnb-nav');
      sc.style.height = '';
      if (anc) anc.scrollTop = 0;
      var h = Math.max(260, Math.floor(w.innerHeight - sc.getBoundingClientRect().top - (nav ? nav.offsetHeight + 8 : 0) - 16));
      sc.style.height = h + 'px';
      if (anc) { var over = anc.scrollHeight - anc.clientHeight; if (over > 0) sc.style.height = Math.max(260, h - over) + 'px'; }
    }
    function go(d) {
      if (flipping || !st.pages) return;
      var n = steps(), old = st.page, t = old + d;
      if (t < 0 || t >= n) return;
      var bookEl = list.querySelector('.vnb-book'), sp = spread(), fwd = d > 0;
      var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
      st.page = t;
      if (reduce || !bookEl) { drawBook(); return; }
      var under, front, back;
      if (!sp) { under = pg(fwd ? t : old); front = pg(fwd ? old : t); back = blankPage(); }
      else if (fwd) { under = '<div class="vnb-2">' + pg(2 * old) + pg(2 * t + 1) + '</div>'; front = pg(2 * old + 1); back = pg(2 * t); }
      else { under = '<div class="vnb-2">' + pg(2 * t) + pg(2 * old + 1) + '</div>'; front = pg(2 * t + 1); back = pg(2 * old); }
      flipping = true;
      bookEl.innerHTML = under + '<div class="vnb-leaf ' + (fwd ? 'fwd' : 'bwd') + (sp ? ' sp' : '') + '"><div class="vnb-face f">' + front + '</div><div class="vnb-face b">' + back + '</div></div>';
      icons();
      var leaf = bookEl.querySelector('.vnb-leaf'); void leaf.offsetWidth; leaf.classList.add('go');
      var done = function () { if (!flipping) return; flipping = false; drawBook(); };
      leaf.addEventListener('transitionend', done); setTimeout(done, 800);
    }
    list.addEventListener('click', function (e) { var b = e.target.closest('[data-vnb-go]'); if (b && !b.disabled) go(Number(b.getAttribute('data-vnb-go'))); });
    var tx = null, ty = 0;
    list.addEventListener('touchstart', function (e) { var t = e.touches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
    list.addEventListener('touchend', function (e) {
      if (tx === null) return; var t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty; tx = null;
      if (Math.abs(dx) > 60 && Math.abs(dy) < 50) go(dx < 0 ? 1 : -1);
    }, { passive: true });
    var lastW = root.clientWidth, rzT = null;
    if (w._vnbRz) w.removeEventListener('resize', w._vnbRz);
    w._vnbRz = function () { clearTimeout(rzT); rzT = setTimeout(function () { if (!document.body.contains(list) || root.clientWidth === lastW) return; lastW = root.clientWidth; if (st.items && !flipping) renderList(); }, 200); };
    if (w._vnbFit) w.removeEventListener('resize', w._vnbFit);
    w._vnbFit = function () { clearTimeout(w._vnbFitT); w._vnbFitT = setTimeout(function () { if (document.body.contains(list)) fit(); }, 120); };
    w.addEventListener('resize', w._vnbFit);
    w.addEventListener('resize', w._vnbRz);

    function say(x, btn) {
      if (x.audio) { V.speak(x.word, x.audio); return; }
      if (x._sayBusy) return; x._sayBusy = true; if (btn) btn.disabled = true;
      api.audio(x.word).then(function (u) { if (u) x.audio = u; V.speak(x.word, u || null); })
        .catch(function () { V.speak(x.word); })
        .then(function () { x._sayBusy = false; if (btn) btn.disabled = false; });
    }

    function renderList() {
      var s = bar.querySelector('.vnb-st'); if (s) s.textContent = statText();
      if (st.items === null) { list.innerHTML = '<div class="vnb-empty">' + (st.msg ? esc(st.msg) : 'Đang tải sổ từ vựng...') + '</div>'; return; }
      var L = view();
      if (!st.items.length) { list.innerHTML = '<div class="vnb-empty">Sổ chưa có từ nào.<br>Từ trong bài học sẽ tự vào sổ khi giáo viên giao bài. Em cũng có thể thêm từ bằng nút dấu cộng.</div>'; return; }
      if (!L.length) { list.innerHTML = '<div class="vnb-empty">Không có từ nào khớp.</div>'; return; }
      drawBook(L);
    }

    function renderPanel() {
      renderPanel0(); fit();
    }
    function renderPanel0() {
      if (!st.panel) { pnw.innerHTML = ''; return; }
      if (st.panel === 'add') {
        pnw.innerHTML = '<div class="vnb-pn"><div class="vnb-pt">Thêm từ</div><input data-vnb-in="word" placeholder="Từ hoặc cụm từ, ví dụ: renewable" autocomplete="off" autocapitalize="none" aria-label="Từ cần thêm">' +
          '<input data-vnb-in="meaning" placeholder="Nghĩa tiếng Việt (có thể để trống)" aria-label="Nghĩa tiếng Việt"><div class="vnb-hint" data-vnb-hint></div><div class="vnb-err" data-vnb-err></div>' +
          '<div class="vnb-pa"><button type="button" class="vnb-btn" data-vnb="close">Hủy</button><button type="button" class="vnb-btn pri" data-vnb="save-add">Lưu từ</button></div></div>';
        var i = pnw.querySelector('[data-vnb-in="word"]'); if (i) i.focus();
      } else {
        pnw.innerHTML = '<div class="vnb-pn"><div class="vnb-pt">Nhập danh sách từ</div><textarea data-vnb-in="list" placeholder="Mỗi dòng một từ, hoặc từ - nghĩa&#10;renewable - có thể tái tạo&#10;mitigate" aria-label="Danh sách từ"></textarea>' +
          '<div class="vnb-hint" data-vnb-hint>Từ đã có trong sổ sẽ được gộp, không tạo dòng mới.</div><div class="vnb-err" data-vnb-err></div>' +
          '<div class="vnb-pa"><button type="button" class="vnb-btn" data-vnb="close">Hủy</button><button type="button" class="vnb-btn pri" data-vnb="save-import">Nhập từ</button></div></div>';
      }
    }

    function load() {
      if (st.items !== null) return;
      api.list().then(function (d) { st.items = d || []; st.msg = ''; renderBar(); renderList(); })
        .catch(function (e) { st.msg = err(e); renderList(); });
    }
    function reload(after) { return api.list().then(function (d) { st.items = d || []; after && after(); renderBar(); renderPanel(); renderList(); }); }
    function byId(id) { return (st.items || []).filter(function (x) { return x.id === Number(id); })[0]; }
    function setHint(t) { var h = pnw.querySelector('[data-vnb-hint]'); if (h) h.textContent = t || ''; }
    function setErr(t) { var h = pnw.querySelector('[data-vnb-err]'); if (h) h.textContent = t || ''; }

    function saveAdd() {
      if (st.busy) return;
      var wi = pnw.querySelector('[data-vnb-in="word"]'), mi = pnw.querySelector('[data-vnb-in="meaning"]');
      var word = V.norm(wi && wi.value), meaning = V.norm(mi && mi.value);
      if (!word) { setErr('Nhập một từ hoặc cụm từ trước đã.'); return; }
      if (word.length > 80) { setErr('Từ hoặc cụm từ tối đa 80 ký tự.'); return; }
      st.busy = true; setErr(''); setHint('Đang lưu...');
      V.dict(word).then(function (d) {
        return api.add({ word: word, pos: d ? d.pos : '', ipa: d ? d.ipa : '', definition: d ? d.definition : '', meaning: meaning });
      }).then(function (r) {
        return reload(function () { st.busy = false; st.panel = null; st.f = 'all'; st.q = ''; toast(r.merged ? 'Từ này đã có trong sổ, đã gộp lại' : 'Đã thêm vào sổ'); });
      }).catch(function (e) { st.busy = false; setHint(''); setErr(err(e)); });
    }

    function saveImport() {
      if (st.busy) return;
      var ta = pnw.querySelector('[data-vnb-in="list"]'), rows = V.parseList(ta && ta.value);
      if (!rows.length) { setErr('Chưa có dòng nào để nhập.'); return; }
      if (rows.length > 150) { setErr('Mỗi lần nhập tối đa 150 từ. Chia danh sách ra giúp mình nhé.'); return; }
      st.busy = true; setErr('');
      var done = 0, merged = 0, failed = 0, idx = 0;
      function next() {
        if (idx >= rows.length) return Promise.resolve();
        var r = rows[idx++];
        return V.dict(r.word).then(function (d) {
          return api.add({ word: r.word, pos: r.pos || (d ? d.pos : ''), ipa: d ? d.ipa : '', definition: d ? d.definition : '', meaning: r.meaning });
        }).then(function (x) { done++; if (x.merged) merged++; }).catch(function () { failed++; })
          .then(function () { setHint('Đang nhập ' + (done + failed) + '/' + rows.length + '...'); return next(); });
      }
      setHint('Đang nhập 0/' + rows.length + '...');
      Promise.all([next(), next(), next()]).then(function () {
        return reload(function () {
          st.busy = false; st.panel = null; st.f = 'all'; st.q = '';
          toast('Đã nhập ' + (done - merged) + ' từ mới' + (merged ? ', ' + merged + ' từ đã có nên gộp lại' : '') + (failed ? ', ' + failed + ' từ lỗi' : ''));
        });
      }).catch(function (e) { st.busy = false; setHint(''); setErr(err(e)); });
    }

    function exportList() {
      var L = view();
      if (!L.length) { toast('Chưa có từ nào để sao chép'); return; }
      var txt = L.map(function (x) { return x.word + (x.pos ? ' (' + x.pos + ')' : '') + (x.ipa ? ' ' + x.ipa : '') + (x.meaning ? ' - ' + x.meaning : ''); }).join('\n');
      function fallback() { var t = document.createElement('textarea'); t.value = txt; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); toast('Đã sao chép ' + L.length + ' từ'); } catch (e) { toast('Không sao chép được'); } t.remove(); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast('Đã sao chép ' + L.length + ' từ'); }, fallback); else fallback();
    }

    function onClick(e) {
      var b = e.target.closest('[data-vnb]'); if (!b) return;
      var a = b.getAttribute('data-vnb'), x = b.dataset.id ? byId(b.dataset.id) : null;
      if (a === 'chip') { st.f = b.dataset.f; renderBar(); renderList(); }
      else if (a === 'hide') { st.hide = st.hide === 'off' ? 'meaning' : st.hide === 'meaning' ? 'word' : 'off'; st.reveal = {}; renderBar(); renderList(); }
      else if (a === 'sort') { st.sort = st.sort === 'new' ? 'az' : st.sort === 'az' ? 'seen' : st.sort === 'seen' ? 'lv' : 'new'; renderBar(); renderList(); }
      else if (a === 'group') { st.group = st.group === 'week' ? 'topic' : st.group === 'topic' ? 'none' : 'week'; renderBar(); renderList(); }
      else if (a === 'add' || a === 'import') { st.panel = st.panel === a ? null : a; renderBar(); renderPanel(); }
      else if (a === 'close') { st.panel = null; renderBar(); renderPanel(); }
      else if (a === 'save-add') saveAdd();
      else if (a === 'save-import') saveImport();
      else if (a === 'export') exportList();
      else if (a === 'reveal' && x) { st.reveal[x.id] = true; renderList(); }
      else if (a === 'open' && x) openPop(x);
      else if (a === 'say' && x) say(x, b);
      else if (a === 'learn' && x) {
        var prev = x.learned; x.learned = !prev; renderBar(); renderList(); refreshPop();
        api.set(x.id, { learned: x.learned }).catch(function (er) { x.learned = prev; renderBar(); renderList(); refreshPop(); toast(err(er)); });
      }
      else if (a === 'edit' && x) { st.edit = { id: x.id }; refreshPop(); var i = popInput(); if (i) i.focus(); }
      else if (a === 'edit-cancel') { st.edit = null; refreshPop(); }
      else if (a === 'edit-save' && x) {
        var inp = popInput(), v = V.norm(inp && inp.value);
        api.set(x.id, v ? { meaning: v } : { clearMeaning: true }).then(function (r) {
          var k = st.items.indexOf(x); if (k > -1) st.items[k] = r; st.edit = null; renderBar(); renderList(); refreshPop(); toast('Đã lưu nghĩa');
        }).catch(function (er) { toast(err(er)); });
      }
      else if (a === 'del' && x) {
        var go = function () { api.remove(x.id).then(function () { st.items = st.items.filter(function (y) { return y !== x; }); if (st.pop === x.id) V.closeModal(); renderBar(); renderList(); toast('Đã xóa từ'); }).catch(function (er) { toast(err(er)); }); };
        if (w.confirm('Xóa từ "' + x.word + '" khỏi sổ?')) go();
      }
    }
    root.addEventListener('click', onClick);

    root.addEventListener('change', function (e) {
      var k = e.target.getAttribute && e.target.getAttribute('data-vnb-sel'); if (!k) return;
      st[k] = e.target.value; renderBar(); renderList();
    });
    root.addEventListener('input', function (e) {
      if (e.target.matches('[data-vnb-q]')) { st.q = e.target.value; renderList(); return; }
      if (e.target.matches('[data-vnb-in="word"]')) {
        clearTimeout(hintTimer); var val = e.target.value; setErr('');
        hintTimer = setTimeout(function () {
          if (!V.norm(val)) { setHint(''); return; }
          api.lookup(val).then(function (r) {
            if (!r || !r.length) { setHint(''); return; }
            setHint('Trong kho: ' + r.map(function (y) { return y.word + (y.pos ? ' (' + y.pos + ')' : '') + ' · ' + (y.meaning || ''); }).join(' | '));
          }).catch(function () { setHint(''); });
        }, 400);
      }
    });
    function onKey(e) {
      if (e.target.matches('.ve.tap') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); var t = byId(e.target.dataset.id); if (t) openPop(t); return; }
      if (e.key !== 'Enter') return;
      if (e.target.matches('[data-vnb-in="word"],[data-vnb-in="meaning"]')) { e.preventDefault(); saveAdd(); }
      else if (e.target.matches('[data-vnb-edit]')) { e.preventDefault(); var b = document.querySelector('.vm [data-vnb="edit-save"]'); if (b) b.click(); }
    }
    root.addEventListener('keydown', onKey);

    renderBar(); renderPanel(); renderList();
    load();
  }

  /* Thẻ "Từ của hôm nay" ở trang tổng quan. Dữ liệu giữ trong bộ nhớ theo mã học viên, vẽ lại không gọi mạng. */
  var WD = {};
  var WCSS = '#wotd-root{margin:0}.g-wotd{display:flex;flex-direction:column;gap:8px}.student-main .g-wotd>.wotd-top{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '.student-main .g-wotd .wotd-pill{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:999px;background:#F4F5F7;color:#1B1D22;font-size:.875rem;font-weight:700;line-height:1;margin:0}.g-wotd .wotd-pill svg{width:15px;height:15px}' +
    '.g-wotd .wotd-cnt{font-size:.8125rem;color:var(--t-muted,#818999)}.wotd-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.wotd-w{font-size:1.375rem;font-weight:800;line-height:1.25}' +
    '.wotd-m{font-size:.875rem;color:var(--t-muted,#818999);font-weight:500}.wotd-mean{font-size:.9375rem}.wotd-def{font-size:.8125rem;color:#454B57;line-height:1.5}' +
    '.wotd-act{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.wotd-em{font-size:.8125rem;color:#596579;line-height:1.5}';
  function wcss() { V.uiCss(); if (document.getElementById('wotd-css')) return; var s = document.createElement('style'); s.id = 'wotd-css'; s.textContent = WCSS + '.wotd .vnb-btn{min-height:44px;padding:0 16px;border-radius:22px;border:1px solid var(--t-border,#D5D8DE);background:#fff;font:inherit;font-size:.875rem;font-weight:600;color:#1B1D22;cursor:pointer}.wotd .vnb-btn.pri{background:#16181D;border-color:#16181D;color:#fff}.wotd .vnb-sm{width:44px;height:44px;border-radius:22px;border:1px solid var(--t-border,#E4E6EA);background:#fff;color:#454B57;display:inline-flex;align-items:center;justify-content:center;padding:0;cursor:pointer}.g-wotd .vnb-sm svg{width:18px;height:18px}'; document.head.appendChild(s); }

  function wotd(root, o) {
    if (!root) return;
    wcss();
    var st = WD[o.code] || (WD[o.code] = { d: null, show: false, err: false, loading: false }), api = V.api(o.c, o.code);
    function top(cnt) { return '<div class="wotd-top"><h2 class="wotd-pill"><i data-lucide="sparkles"></i>Từ của hôm nay</h2>' + (cnt ? '<span class="wotd-cnt">' + cnt + '</span>' : '') + '</div>'; }
    function draw() {
      var d = st.d, h;
      if (st.err) h = top('') + '<div class="wotd-em">Chưa tải được từ hôm nay, kiểm tra mạng rồi tải lại trang.</div>';
      else if (!d) h = top('') + '<div class="wotd-em">Đang tải...</div>';
      else if (d.empty) h = top('') + '<div class="wotd-em">Sổ của em chưa có từ nào. Từ trong bài học sẽ tự vào sổ khi giáo viên giao bài, hoặc em tự thêm ở tab Sổ từ vựng.</div><div class="wotd-act"><button type="button" class="vnb-btn pri" data-wotd="open">Mở sổ từ vựng</button></div>';
      else {
        var mean = d.meaning ? (st.show ? meanHtml(d) : '<button type="button" class="vnb-btn" data-wotd="reveal">Chạm để hiện nghĩa</button>') : V.pill('chờ nghĩa', 'warn');
        h = top(d.done + '/' + d.total + ' từ đã thuộc') +
          '<div class="wotd-line"><span class="wotd-w">' + esc(d.word) + '</span>' + (d.pos ? V.posPill(d.pos) : '') + (d.ipa ? '<span class="wotd-m">' + esc(d.ipa) + '</span>' : '') + '</div>' +
          '<div class="wotd-mean">' + mean + '</div>' + (st.show && d.definition ? '<div class="wotd-def">' + esc(d.definition) + '</div>' : '') + (st.show && d.example ? '<div class="wotd-def"><i>' + esc(d.example) + '</i></div>' : '') +
          '<div class="wotd-act"><button type="button" class="vnb-sm" data-wotd="say" aria-label="Phát âm"><i data-lucide="volume-2"></i></button>' +
          '<button type="button" class="vnb-btn' + (d.learned ? '' : ' pri') + '" data-wotd="learn">' + (d.learned ? 'Bỏ đánh dấu thuộc' : 'Đã thuộc') + '</button>' +
          '<button type="button" class="vnb-btn" data-wotd="open">Mở sổ</button></div>';
      }
      root.innerHTML = '<section class="card g-wotd wotd">' + h + '</section>'; icons();
    }
    root.onclick = function (e) {
      var b = e.target.closest('[data-wotd]'); if (!b || !st.d) return;
      var a = b.getAttribute('data-wotd');
      if (a === 'reveal') { st.show = true; draw(); }
      else if (a === 'say') { var d0 = st.d; if (d0.audio) V.speak(d0.word, d0.audio); else api.audio(d0.word).then(function (u) { if (u) d0.audio = u; V.speak(d0.word, u || null); }).catch(function () { V.speak(d0.word); }); }
      else if (a === 'open') { var nav = document.querySelector('[data-student-view="vocab"]'); if (nav) nav.click(); }
      else if (a === 'learn') {
        var prev = st.d.learned; st.d.learned = !prev; st.d.done += prev ? -1 : 1; draw();
        api.set(st.d.id, { learned: st.d.learned }).catch(function () { st.d.learned = prev; st.d.done += prev ? 1 : -1; draw(); toast('Chưa lưu được, thử lại sau'); });
      }
    };
    draw();
    if (!st.d && !st.loading) {
      st.loading = true;
      api.today().then(function (d) { st.d = d; st.err = false; st.loading = false; draw(); })
        .catch(function () { st.err = true; st.loading = false; draw(); });
    }
  }

  w.GBVocabTab = { mount: mount, wotd: wotd };
})(window);

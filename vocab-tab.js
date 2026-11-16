/* gblearning: tab "Sổ từ vựng" trong student.html. Gọi GBVocabTab.mount(root, { c, code }). */
(function (w) {
  'use strict';
  var V = w.GBVocab, esc = V.esc, ST = {};
  var CSS = '.vnb{color:var(--t-ink,#1B1D22)}.vnb button{font:inherit;cursor:pointer}.vnb svg{width:18px;height:18px;flex:none}' +
    '.vnb-tb{display:flex;align-items:center;gap:6px;margin:4px 0 10px}.vnb-search{flex:1;min-width:0;display:flex;align-items:center;gap:8px;height:44px;padding:0 12px;border:1px solid var(--t-border,#E4E6EA);border-radius:22px;background:#fff}' +
    '.vnb-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;font-size:16px}.vnb-ib{width:44px;height:44px;border-radius:22px;border:1px solid var(--t-border,#E4E6EA);background:#fff;color:#1B1D22;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:0}' +
    '.vnb-ib.on{background:#16181D;border-color:#16181D;color:#fff}.vnb-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}' +
    '.vnb-chip{border:1px solid var(--t-border,#E4E6EA);background:#fff;border-radius:20px;min-height:40px;padding:0 14px;font-size:.875rem;font-weight:600;color:#596579}.vnb-chip.on{background:#16181D;border-color:#16181D;color:#fff}' +
    '.vnb-st{font-size:.8125rem;color:var(--t-muted,#818999);margin:2px 0 4px}.vnb-grp{font-size:.8125rem;font-weight:700;color:var(--t-muted,#818999);padding:14px 0 6px}' +
    '.vnb-row{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid #E4E6EA}.vnb-ck{width:32px;height:32px;margin-top:2px;border-radius:50%;border:1.5px solid #B9BDC6;background:#fff;color:transparent;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:0}' +
    '.vnb-ck.on{background:#16181D;border-color:#16181D;color:#fff}.vnb-body{flex:1;min-width:0}.vnb-head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;border:0;background:transparent;padding:0;text-align:left;color:inherit;min-height:30px}' +
    '.vnb-w{font-size:1.0625rem;font-weight:700}.vnb-m{font-size:.875rem;color:var(--t-muted,#818999)}.vnb-mean{font-size:1rem;margin-top:1px;overflow-wrap:anywhere}.vnb-hid{color:var(--t-muted,#818999);border:0;background:transparent;padding:0;text-align:left;min-height:30px}' +
    '.vnb-tag{display:inline-block;font-size:.75rem;padding:1px 8px;border-radius:10px;border:1px solid #D5D8DE;color:#596579;margin-left:6px}.vnb-tag.first{margin-left:0}' +
    '.vnb-det{margin-top:8px;font-size:.9375rem;line-height:1.55;color:#454B57}.vnb-det .meta{color:var(--t-muted,#818999);font-size:.8125rem;margin-top:4px}.vnb-act{display:flex;gap:6px;margin-top:8px}' +
    '.vnb-sm{width:44px;height:44px;border-radius:22px;border:1px solid var(--t-border,#E4E6EA);background:#fff;color:#454B57;display:inline-flex;align-items:center;justify-content:center;padding:0;flex:none}' +
    '.vnb-edit{display:flex;gap:6px;margin-top:8px}.vnb-edit input,.vnb-pn input,.vnb-pn textarea{width:100%;min-height:44px;padding:8px 12px;border:1px solid var(--t-border,#D5D8DE);border-radius:12px;font-size:16px;background:#fff;outline:0}' +
    '.vnb-pn{border:1px solid var(--t-border,#E4E6EA);border-radius:14px;padding:12px;margin:0 0 10px;display:flex;flex-direction:column;gap:8px}.vnb-pt{font-weight:700;font-size:.9375rem}.vnb-pn textarea{min-height:150px;resize:vertical;line-height:1.5}' +
    '.vnb-pa{display:flex;gap:8px;justify-content:flex-end;align-items:center}.vnb-btn{min-height:44px;padding:0 18px;border-radius:22px;border:1px solid var(--t-border,#D5D8DE);background:#fff;font-weight:600;color:#1B1D22}.vnb-btn.pri{background:#16181D;border-color:#16181D;color:#fff}' +
    '.vnb-hint{font-size:.875rem;color:#454B57}.vnb-err{font-size:.875rem;color:#B42318}.vnb-empty{padding:28px 4px;text-align:center;color:var(--t-muted,#818999);font-size:.9375rem;line-height:1.6}';

  function injectCss() { if (document.getElementById('vnb-css')) return; var s = document.createElement('style'); s.id = 'vnb-css'; s.textContent = CSS; document.head.appendChild(s); }
  function icons() { if (w.lucide) w.lucide.createIcons(); }
  function toast(m) { if (w.LMS && w.LMS.toast) w.LMS.toast(m); }
  function err(e) { return (w.LMS && w.LMS.friendlyError) ? w.LMS.friendlyError(e) : ((e && e.message) || 'Có lỗi xảy ra'); }
  function weekLabel(k) { var m = /^\d{4}-(\d{2})-(\d{2})/.exec(k || ''); return m ? 'Tuần ' + m[2] + '/' + m[1] : 'Khác'; }

  function mount(root, o) {
    if (!root) return;
    injectCss();
    var st = ST[o.code] || (ST[o.code] = { items: null, q: '', f: 'all', sort: 'new', group: 'week', hide: 'off', reveal: {}, open: {}, edit: null, panel: null, busy: false, msg: '' });
    var api = V.api(o.c, o.code), hintTimer = null;

    root.innerHTML = '<div class="vnb"><div class="vnb-bar"></div><div class="vnb-pn-wrap"></div><div class="vnb-list"></div></div>';
    var bar = root.querySelector('.vnb-bar'), pnw = root.querySelector('.vnb-pn-wrap'), list = root.querySelector('.vnb-list');

    function view() {
      var q = V.key(st.q);
      var L = (st.items || []).filter(function (x) {
        if (st.f === 'no' && x.learned) return false;
        if (st.f === 'yes' && !x.learned) return false;
        if (st.f === 'wait' && x.status === 'approved') return false;
        return !q || V.key(x.word).indexOf(q) > -1 || V.key(x.meaning || '').indexOf(q) > -1;
      });
      var cmp = st.sort === 'az' ? function (a, b) { return V.key(a.word) < V.key(b.word) ? -1 : 1; }
        : st.sort === 'seen' ? function (a, b) { return (b.seen - a.seen) || (V.key(a.word) < V.key(b.word) ? -1 : 1); }
        : function (a, b) { return (a.week < b.week ? 1 : a.week > b.week ? -1 : 0) || (b.id - a.id); };
      return L.sort(cmp);
    }

    function statText() {
      return (st.items ? view().length + ' từ · ' : '') + (st.group === 'week' ? 'Nhóm theo tuần' : st.group === 'topic' ? 'Nhóm theo chủ đề' : 'Không nhóm') + ' · ' + (st.sort === 'az' ? 'A đến Z' : st.sort === 'seen' ? 'Gặp lại nhiều nhất' : 'Mới nhất') + (st.hide === 'meaning' ? ' · Đang ẩn nghĩa' : st.hide === 'word' ? ' · Đang ẩn từ' : '');
    }

    function renderBar() {
      var it = st.items || [], n = function (fn) { return it.filter(fn).length; };
      var cnt = { all: it.length, no: n(function (x) { return !x.learned; }), yes: n(function (x) { return x.learned; }), wait: n(function (x) { return x.status !== 'approved'; }) };
      var chips = [['all', 'Tất cả'], ['no', 'Chưa thuộc'], ['yes', 'Đã thuộc'], ['wait', 'Chờ nghĩa']].map(function (a) { return '<button type="button" class="vnb-chip' + (st.f === a[0] ? ' on' : '') + '" data-vnb="chip" data-f="' + a[0] + '">' + a[1] + ' ' + cnt[a[0]] + '</button>'; }).join('');
      var hideIcon = st.hide === 'off' ? 'eye' : st.hide === 'meaning' ? 'eye-off' : 'languages';
      var focus = document.activeElement && document.activeElement.matches && document.activeElement.matches('[data-vnb-q]');
      bar.innerHTML = '<div class="vnb-tb"><label class="vnb-search"><i data-lucide="search"></i><input type="search" data-vnb-q placeholder="Tìm từ hoặc nghĩa" value="' + esc(st.q) + '" aria-label="Tìm từ"></label>' +
        '<button type="button" class="vnb-ib' + (st.hide !== 'off' ? ' on' : '') + '" data-vnb="hide" aria-label="Ẩn nghĩa hoặc ẩn từ để tự kiểm tra"><i data-lucide="' + hideIcon + '"></i></button>' +
        '<button type="button" class="vnb-ib" data-vnb="sort" aria-label="Đổi cách sắp xếp"><i data-lucide="arrow-up-down"></i></button>' +
        '<button type="button" class="vnb-ib" data-vnb="group" aria-label="Đổi cách nhóm"><i data-lucide="layers"></i></button>' +
        '<button type="button" class="vnb-ib' + (st.panel === 'import' ? ' on' : '') + '" data-vnb="import" aria-label="Nhập danh sách từ"><i data-lucide="clipboard-paste"></i></button>' +
        '<button type="button" class="vnb-ib" data-vnb="export" aria-label="Sao chép sổ"><i data-lucide="download"></i></button>' +
        '<button type="button" class="vnb-ib on" data-vnb="add" aria-label="Thêm từ"><i data-lucide="plus"></i></button></div>' +
        '<div class="vnb-chips">' + chips + '</div><div class="vnb-st">' + statText() + '</div>';
      icons();
      if (focus) { var i = bar.querySelector('[data-vnb-q]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    }

    function rowHtml(x) {
      var hiddenMean = st.hide === 'meaning' && !st.reveal[x.id] && x.meaning, hiddenWord = st.hide === 'word' && !st.reveal[x.id];
      var mean = !x.meaning ? '<span class="vnb-tag first">chờ nghĩa</span>'
        : hiddenMean ? '<button type="button" class="vnb-hid" data-vnb="reveal" data-id="' + x.id + '">Chạm để hiện nghĩa</button>'
          : esc(x.meaning) + (x.status === 'typed' ? '<span class="vnb-tag">tự gõ</span>' : '');
      var head = hiddenWord ? '<button type="button" class="vnb-hid" data-vnb="reveal" data-id="' + x.id + '">Chạm để hiện từ</button>'
        : '<button type="button" class="vnb-head" data-vnb="open" data-id="' + x.id + '" aria-expanded="' + (st.open[x.id] ? 'true' : 'false') + '"><span class="vnb-w">' + esc(x.word) + '</span>' + (x.pos ? '<span class="vnb-m">' + esc(x.pos) + '</span>' : '') + (x.ipa ? '<span class="vnb-m">' + esc(x.ipa) + '</span>' : '') + '</button>';
      var det = '';
      if (st.open[x.id] && !hiddenWord) {
        var ed = st.edit && st.edit.id === x.id;
        det = '<div class="vnb-det">' + (x.definition ? '<div>' + esc(x.definition) + '</div>' : '') + (x.example ? '<div><i>' + esc(x.example) + '</i></div>' : '') + (x.note ? '<div>' + esc(x.note) + '</div>' : '') +
          (x.topic ? '<div class="meta">Chủ đề: ' + esc(x.topic) + '</div>' : '') +
          '<div class="meta">' + (x.source === 'lesson' ? 'Từ bài học' : 'Em tự thêm') + ' · gặp ' + x.seen + ' lần</div>' +
          (ed ? '<div class="vnb-edit"><input data-vnb-edit value="' + esc(x.status === 'typed' ? x.meaning : '') + '" placeholder="Nghĩa tiếng Việt của em" aria-label="Nghĩa tiếng Việt"><button type="button" class="vnb-btn pri" data-vnb="edit-save" data-id="' + x.id + '">Lưu</button><button type="button" class="vnb-btn" data-vnb="edit-cancel">Hủy</button></div>'
            : '<div class="vnb-act"><button type="button" class="vnb-sm" data-vnb="edit" data-id="' + x.id + '" aria-label="Sửa nghĩa"><i data-lucide="pencil"></i></button>' + (x.source === 'self' ? '<button type="button" class="vnb-sm" data-vnb="del" data-id="' + x.id + '" aria-label="Xóa từ"><i data-lucide="trash-2"></i></button>' : '') + '</div>') + '</div>';
      }
      return '<div class="vnb-row"><button type="button" class="vnb-ck' + (x.learned ? ' on' : '') + '" data-vnb="learn" data-id="' + x.id + '" aria-label="' + (x.learned ? 'Bỏ đánh dấu đã thuộc' : 'Đánh dấu đã thuộc') + '" aria-pressed="' + (x.learned ? 'true' : 'false') + '"><i data-lucide="check"></i></button>' +
        '<div class="vnb-body">' + head + '<div class="vnb-mean">' + mean + '</div>' + det + '</div>' +
        '<button type="button" class="vnb-sm" style="border:0" data-vnb="say" data-id="' + x.id + '" aria-label="Phát âm"><i data-lucide="volume-2"></i></button></div>';
    }

    function renderList() {
      var s = bar.querySelector('.vnb-st'); if (s) s.textContent = statText();
      if (st.items === null) { list.innerHTML = '<div class="vnb-empty">' + (st.msg ? esc(st.msg) : 'Đang tải sổ từ vựng...') + '</div>'; return; }
      var L = view();
      if (!st.items.length) { list.innerHTML = '<div class="vnb-empty">Sổ chưa có từ nào.<br>Từ trong bài học sẽ tự vào sổ khi giáo viên giao bài. Em cũng có thể thêm từ bằng nút dấu cộng.</div>'; return; }
      if (!L.length) { list.innerHTML = '<div class="vnb-empty">Không có từ nào khớp.</div>'; return; }
      var html = '', last = null;
      L.forEach(function (x) {
        var g = st.group === 'week' ? weekLabel(x.week) : st.group === 'topic' ? (x.topic || 'Chưa có chủ đề') : '';
        if (g !== last) { if (g) html += '<div class="vnb-grp">' + esc(g) + '</div>'; last = g; }
        html += rowHtml(x);
      });
      list.innerHTML = html; icons();
    }

    function renderPanel() {
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
        return reload(function () { st.busy = false; st.panel = null; st.f = 'all'; st.q = ''; st.open[r.id] = true; toast(r.merged ? 'Từ này đã có trong sổ, đã gộp lại' : 'Đã thêm vào sổ'); });
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

    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-vnb]'); if (!b) return;
      var a = b.getAttribute('data-vnb'), x = b.dataset.id ? byId(b.dataset.id) : null;
      if (a === 'chip') { st.f = b.dataset.f; renderBar(); renderList(); }
      else if (a === 'hide') { st.hide = st.hide === 'off' ? 'meaning' : st.hide === 'meaning' ? 'word' : 'off'; st.reveal = {}; renderBar(); renderList(); }
      else if (a === 'sort') { st.sort = st.sort === 'new' ? 'az' : st.sort === 'az' ? 'seen' : 'new'; renderBar(); renderList(); }
      else if (a === 'group') { st.group = st.group === 'week' ? 'topic' : st.group === 'topic' ? 'none' : 'week'; renderBar(); renderList(); }
      else if (a === 'add' || a === 'import') { st.panel = st.panel === a ? null : a; renderBar(); renderPanel(); }
      else if (a === 'close') { st.panel = null; renderBar(); renderPanel(); }
      else if (a === 'save-add') saveAdd();
      else if (a === 'save-import') saveImport();
      else if (a === 'export') exportList();
      else if (a === 'reveal' && x) { st.reveal[x.id] = true; renderList(); }
      else if (a === 'open' && x) { st.open[x.id] = !st.open[x.id]; if (!st.open[x.id] && st.edit && st.edit.id === x.id) st.edit = null; renderList(); }
      else if (a === 'say' && x) V.speak(x.word);
      else if (a === 'learn' && x) {
        var prev = x.learned; x.learned = !prev; renderBar(); renderList();
        api.set(x.id, { learned: x.learned }).catch(function (er) { x.learned = prev; renderBar(); renderList(); toast(err(er)); });
      }
      else if (a === 'edit' && x) { st.edit = { id: x.id }; renderList(); var i = list.querySelector('[data-vnb-edit]'); if (i) i.focus(); }
      else if (a === 'edit-cancel') { st.edit = null; renderList(); }
      else if (a === 'edit-save' && x) {
        var inp = list.querySelector('[data-vnb-edit]'), v = V.norm(inp && inp.value);
        api.set(x.id, v ? { meaning: v } : { clearMeaning: true }).then(function (r) {
          var k = st.items.indexOf(x); if (k > -1) st.items[k] = r; st.edit = null; renderBar(); renderList(); toast('Đã lưu nghĩa');
        }).catch(function (er) { toast(err(er)); });
      }
      else if (a === 'del' && x) {
        var go = function () { api.remove(x.id).then(function () { st.items = st.items.filter(function (y) { return y !== x; }); renderBar(); renderList(); toast('Đã xóa từ'); }).catch(function (er) { toast(err(er)); }); };
        if (w.confirm('Xóa từ "' + x.word + '" khỏi sổ?')) go();
      }
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
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (e.target.matches('[data-vnb-in="word"],[data-vnb-in="meaning"]')) { e.preventDefault(); saveAdd(); }
      else if (e.target.matches('[data-vnb-edit]')) { e.preventDefault(); var b = list.querySelector('[data-vnb="edit-save"]'); if (b) b.click(); }
    });

    renderBar(); renderPanel(); renderList();
    load();
  }

  /* Thẻ "Từ của hôm nay" ở trang tổng quan. Dữ liệu giữ trong bộ nhớ theo mã học viên, vẽ lại không gọi mạng. */
  var WD = {};
  var WCSS = '.wotd{border:1px solid var(--t-border,#E4E6EA);border-radius:16px;background:#fff;padding:14px 16px;margin-top:14px;display:flex;flex-direction:column;gap:6px}' +
    '.wotd-h{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.8125rem;font-weight:700;color:var(--t-muted,#818999)}.wotd-w{font-size:1.5rem;font-weight:800;line-height:1.2}' +
    '.wotd-m{font-size:.9375rem;color:var(--t-muted,#818999);margin-left:8px;font-weight:500}.wotd-mean{font-size:1.0625rem;min-height:24px}.wotd-def{font-size:.9375rem;color:#454B57}' +
    '.wotd-act{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:4px}.wotd-act .vnb-btn{min-height:44px}.wotd-em{font-size:.9375rem;color:#454B57;line-height:1.55}';
  function wcss() { if (document.getElementById('wotd-css')) return; var s = document.createElement('style'); s.id = 'wotd-css'; s.textContent = WCSS + '.wotd .vnb-btn{min-height:44px;padding:0 18px;border-radius:22px;border:1px solid var(--t-border,#D5D8DE);background:#fff;font:inherit;font-weight:600;color:#1B1D22;cursor:pointer}.wotd .vnb-btn.pri{background:#16181D;border-color:#16181D;color:#fff}.wotd .vnb-sm{width:44px;height:44px;border-radius:22px;border:1px solid var(--t-border,#E4E6EA);background:#fff;color:#454B57;display:inline-flex;align-items:center;justify-content:center;padding:0;cursor:pointer}.wotd svg{width:18px;height:18px}'; document.head.appendChild(s); }

  function wotd(root, o) {
    if (!root) return;
    wcss();
    var st = WD[o.code] || (WD[o.code] = { d: null, show: false, err: false, loading: false }), api = V.api(o.c, o.code);
    function draw() {
      var d = st.d, h;
      if (st.err) h = '<div class="wotd-h">Từ của hôm nay</div><div class="wotd-em">Chưa tải được từ hôm nay, kiểm tra mạng rồi tải lại trang.</div>';
      else if (!d) h = '<div class="wotd-h">Từ của hôm nay</div><div class="wotd-em">Đang tải...</div>';
      else if (d.empty) h = '<div class="wotd-h">Từ của hôm nay</div><div class="wotd-em">Sổ của em chưa có từ nào. Từ trong bài học sẽ tự vào sổ khi giáo viên giao bài, hoặc em tự thêm ở tab Sổ từ vựng.</div><div class="wotd-act"><button type="button" class="vnb-btn pri" data-wotd="open">Mở sổ từ vựng</button></div>';
      else {
        var mean = d.meaning ? (st.show ? esc(d.meaning) : '<button type="button" class="vnb-btn" data-wotd="reveal">Chạm để hiện nghĩa</button>') : '<span class="vnb-tag first">chờ nghĩa</span>';
        h = '<div class="wotd-h"><span>Từ của hôm nay</span><span>' + d.done + '/' + d.total + ' từ đã thuộc</span></div>' +
          '<div><span class="wotd-w">' + esc(d.word) + '</span>' + (d.pos ? '<span class="wotd-m">' + esc(d.pos) + '</span>' : '') + (d.ipa ? '<span class="wotd-m">' + esc(d.ipa) + '</span>' : '') + '</div>' +
          '<div class="wotd-mean">' + mean + '</div>' + (st.show && d.definition ? '<div class="wotd-def">' + esc(d.definition) + '</div>' : '') + (st.show && d.example ? '<div class="wotd-def"><i>' + esc(d.example) + '</i></div>' : '') +
          '<div class="wotd-act"><button type="button" class="vnb-sm" data-wotd="say" aria-label="Phát âm"><i data-lucide="volume-2"></i></button>' +
          '<button type="button" class="vnb-btn' + (d.learned ? '' : ' pri') + '" data-wotd="learn">' + (d.learned ? 'Bỏ đánh dấu thuộc' : 'Đã thuộc') + '</button>' +
          '<button type="button" class="vnb-btn" data-wotd="open">Mở sổ</button></div>';
      }
      root.innerHTML = '<div class="wotd">' + h + '</div>'; icons();
    }
    root.onclick = function (e) {
      var b = e.target.closest('[data-wotd]'); if (!b || !st.d) return;
      var a = b.getAttribute('data-wotd');
      if (a === 'reveal') { st.show = true; draw(); }
      else if (a === 'say') V.speak(st.d.word);
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

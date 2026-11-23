/* gblearning: Mini dictionary trong trang giáo viên (teacher.html, mục "Từ điển").
   Đọc và sửa thẳng kho từ chung vocab_bank (giáo viên đã đăng nhập, quyền theo is_teacher()).
   Nghĩa giáo viên duyệt = "nghĩa đề xuất", hiện ở sổ của mọi học viên có từ đó.
   Nghĩa học viên tự ghi (vocab_student.own_meaning) vẫn giữ, giáo viên xem được và có thể dùng làm nghĩa đề xuất hoặc xoá.
   Dùng: GBTeacherDict.mount(rootEl, supabaseClient) */
(function (w) {
  'use strict';
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); };
  var key = function (s) { return norm(s).toLowerCase(); };
  var toast = function (m) { if (w.LMS && LMS.toast) LMS.toast(m); };
  var V = w.GBVocab;
  var COLS = 'id,word,pos,kind,ipa,meaning_vi,meaning_status,definition_en,example,note,word_forms,topic,level,updated_at';

  var CSS = '.td{color:var(--t-ink,#1B1D22)}.td *{box-sizing:border-box}.td button{font:inherit;cursor:pointer}' +
    '.td-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}.td-head h2{margin:0!important}' +
    '.td-tb{display:flex;gap:6px;align-items:center;margin-bottom:8px}.td-search{flex:1;min-width:0;display:flex;align-items:center;gap:8px;height:38px;box-sizing:border-box;padding:0 12px;border:1px solid #E4E6EA;border-radius:19px;background:#fff;color:#64748b}.td-search svg{width:16px;height:16px;flex:none}.td-search:focus-within{border-color:#16181D}' +
    '.td-search input,.td-search input:focus{flex:1;min-width:0;height:36px;min-height:0;padding:0;border:0!important;outline:0!important;box-shadow:none!important;background:transparent;font-size:16px;color:#1B1D22;-webkit-appearance:none;appearance:none}@media (min-width:641px){.td-search input{font-size:.875rem!important}}' +
    '.td-tb .td-btn{height:38px;min-height:0;min-width:0;padding:0 14px;font-size:.8125rem;display:inline-flex;align-items:center;gap:6px;flex:none}.td-tb .td-btn svg{width:16px;height:16px}.td-tb .td-ic{width:38px;padding:0;justify-content:center}' +
    '.td-fr{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;gap:6px}.td-fr::-webkit-scrollbar{display:none}.td-fr>*{flex:1 0 auto}' +
    '.td-fr .vsel{height:38px;box-sizing:border-box;padding:0 2px 0 12px;font-size:.8125rem}.td-fr .vsel-b{font-size:.8125rem}' +
    '.td-fr .td-chip{height:38px;min-height:0;min-width:0;box-sizing:border-box;padding:0 12px;font-size:.8125rem;white-space:nowrap;font-variant-numeric:tabular-nums}' +
    '.td-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.td-chip{min-height:40px;padding:0 14px;border-radius:999px;border:1px solid #E4E6EA;background:#fff;color:#475569;font-weight:700;font-size:.875rem}.td-chip.on{background:#16181D;border-color:#16181D;color:#fff}' +
    '.td-row.on .td-ed .field{background:#fff}' +
    '.td-b{display:inline-block;padding:2px 9px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:.75rem;font-weight:700;white-space:nowrap}' +
    '.td-ed{padding:12px 0 8px;display:flex;flex-direction:column;gap:12px}.td-new{border:1px solid #E4E6EA;border-radius:16px;padding:4px 14px 8px;margin-bottom:10px}' +
    '.td-ed-form{flex:1;min-height:0;display:flex;flex-direction:column;padding:0;gap:0}.td-ed-f{display:flex;flex-direction:column;gap:12px}.td-ed-form .vm-ft .td-err:empty{display:none}' +
    '.td-ed label,.td-f{display:flex;flex-direction:column;gap:4px;font-size:.75rem;font-weight:700;color:#64748b}' +
    '.td-ed textarea.td-ta{min-height:84px;padding:10px 12px;line-height:1.5;resize:vertical;font-family:inherit}' +
    '.td-ed .field{min-height:44px;font-size:16px;font-weight:400;color:var(--t-ink,#1B1D22);background:#fff}.td-acts{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}' +
    '.td-pp{display:flex;flex-wrap:wrap;gap:6px}.td-pp button{min-height:36px;padding:0 12px;border-radius:999px;border:0;background:#fff;color:#475569;font-weight:700;font-size:.8125rem;box-shadow:inset 0 0 0 1px #DADDE3}' +
    '.td-pp button.on{background:#16181D;color:#fff;box-shadow:none}' +
    '.td-btn{min-height:44px;padding:0 18px;border-radius:999px;border:1px solid #E4E6EA;background:#fff;color:#1B1D22;font-weight:700}.td-btn.pri{background:#16181D;border-color:#16181D;color:#fff}.td-btn.sm{min-height:36px;padding:0 12px;font-size:.8125rem}.td-btn.del{color:#be123c}.td-btn:disabled{opacity:.5;cursor:default}' +
    '.td-ck{flex-direction:row!important;align-items:center;gap:8px!important;font-weight:600!important}.td-ck input{width:18px;height:18px}.td-hint{color:#92400E;font-size:.8125rem;min-height:0}.td-hint:empty{display:none}.td-sm{margin-top:4px}.td-sm h3{font-size:.8125rem;font-weight:800;margin:0 0 6px}.td-sr{display:flex;flex-direction:column;gap:8px;padding:10px 12px;background:#F6F7F9;border-radius:14px;margin-bottom:6px}.td-sr .td-acts{justify-content:flex-start}' +
    '.td-sr .q{font-weight:700}.td-sr .who{color:#64748b;font-size:.8125rem;margin-top:2px}.td-none{color:#64748b;font-size:.875rem;padding:14px 4px}.td-err{color:#be123c;font-size:.875rem;min-height:1em}';

  var S = { imp: null, c: null, root: null, loaded: false, loading: false, err: '', bank: [], links: {}, stu: {}, q: '', f: 'all', pos: '', topic: '', open: null, editing: false, adding: false };

  function css() { V.uiCss(); if (document.getElementById('td-css')) return; var st = document.createElement('style'); st.id = 'td-css'; st.textContent = CSS; document.head.appendChild(st); }
  function icons() { if (w.lucide) w.lucide.createIcons(); }

  function load() {
    S.loading = true; S.err = ''; draw();
    var c = S.c;
    return Promise.all([
      c.from('vocab_bank').select(COLS).order('word').limit(5000),
      c.from('vocab_student').select('id,bank_id,student_id,own_meaning').limit(20000),
      c.from('students').select('id,student_name,class_id').limit(5000),
      c.from('classes').select('id,class_code,class_name').limit(500)
    ]).then(function (r) {
      r.forEach(function (x) { if (x.error) throw x.error; });
      var cls = {}; r[3].data.forEach(function (x) { cls[x.id] = x.class_code || x.class_name || ''; });
      S.stu = {}; r[2].data.forEach(function (x) { S.stu[x.id] = { name: x.student_name, cls: cls[x.class_id] || '' }; });
      S.links = {}; r[1].data.forEach(function (x) { (S.links[x.bank_id] = S.links[x.bank_id] || []).push(x); });
      S.bank = r[0].data; S.loaded = true;
    }).catch(function (e) { S.err = (w.LMS && LMS.friendlyError) ? LMS.friendlyError(e) : String(e && e.message || e); })
      .then(function () { S.loading = false; draw(); });
  }

  function suggested(b) { return b.meaning_status === 'approved' ? norm(b.meaning_vi) : ''; }
  /* nghĩa học viên tự ghi, khác nghĩa đề xuất, gộp các em ghi giống nhau */
  function groups(b) {
    var sg = key(suggested(b)), out = [], by = {};
    (S.links[b.id] || []).forEach(function (l) {
      var m = norm(l.own_meaning); if (!m || key(m) === sg) return;
      var k = key(m); if (!by[k]) { by[k] = { text: m, ids: [], who: [] }; out.push(by[k]); }
      by[k].ids.push(l.id); by[k].who.push(S.stu[l.student_id] || { name: 'Học viên', cls: '' });
    });
    return out.sort(function (a, b2) { return b2.ids.length - a.ids.length; });
  }
  function view() {
    var q = key(S.q);
    return S.bank.filter(function (b) {
      if (S.f === 'empty' && suggested(b)) return false;
      if (S.f === 'own' && !groups(b).length) return false;
      if (!V.match(b, S.pos, S.topic, posOf, topicOf)) return false;
      return !q || key(b.word).indexOf(q) > -1 || key(b.meaning_vi).indexOf(q) > -1 || key(b.topic).indexOf(q) > -1 || groups(b).some(function (g) { return key(g.text).indexOf(q) > -1; });
    });
  }

  function posOf(b) { return b.pos; }
  function topicOf(b) { return b.topic; }
  function topicCounts() { var tc = {}, no = 0; S.bank.forEach(function (b) { var t = norm(b.topic); if (t) tc[t] = (tc[t] || 0) + 1; else no++; }); return { tc: tc, no: no, list: Object.keys(tc).sort(function (a, b) { return key(a) < key(b) ? -1 : 1; }) }; }
  function draw() {
    var r = S.root; if (!r) return;
    if (!r.querySelector('.td-head')) {
      r.innerHTML = '<div class="td"><div class="td-head"><h2><i data-lucide="book-a"></i>Từ điển chung</h2><span class="td-b" data-td-count></span></div>' +
        '<div class="td-tb"><label class="td-search"><i data-lucide="search"></i><input type="search" placeholder="Tìm từ hoặc nghĩa" aria-label="Tìm từ hoặc nghĩa" data-td-q autocomplete="off" spellcheck="false"></label>' +
        '<button type="button" class="td-btn" data-td="add"><i data-lucide="plus"></i><span>Thêm từ</span></button><button type="button" class="td-btn" data-td="imp-pick"><i data-lucide="upload"></i><span>Nhập file</span></button><input type="file" accept=".csv,text/csv,text/plain" hidden data-td-file><button type="button" class="td-btn td-ic" data-td="reload" aria-label="Tải lại" title="Tải lại"><i data-lucide="rotate-cw"></i></button></div>' +
        '<div data-td-add></div><div class="vf td-fr" data-td-drops></div><div class="td-list" data-td-list></div></div>';
      r.querySelector('[data-td-q]').value = S.q;
      icons();
    }
    var list = r.querySelector('[data-td-list]'), chips = r.querySelector('[data-td-drops]'), addBox = r.querySelector('[data-td-add]');
    r.querySelector('[data-td-count]').textContent = S.loaded ? S.bank.length + ' từ' : '';
    if (S.loading && !S.loaded) { list.innerHTML = '<div class="td-none">Đang tải...</div>'; chips.innerHTML = ''; return; }
    if (S.err) { list.innerHTML = '<div class="td-none td-err">' + esc(S.err) + '</div>'; return; }
    var nEmpty = S.bank.filter(function (b) { return !suggested(b); }).length, nOwn = S.bank.filter(function (b) { return groups(b).length; }).length;
    var chipHtml = [['all', 'Tất cả'], ['empty', 'Chưa có nghĩa (' + nEmpty + ')'], ['own', 'Có nghĩa học viên ghi (' + nOwn + ')']].map(function (x) {
      return '<button type="button" class="td-chip' + (S.f === x[0] ? ' on' : '') + '" data-td="filter" data-f="' + x[0] + '" aria-pressed="' + (S.f === x[0]) + '">' + x[1] + '</button>';
    }).join('');
    var fo = V.filterOpts(S.bank, posOf, topicOf);
    if (!fo.has('pos', S.pos)) S.pos = '';
    if (!fo.has('topic', S.topic)) S.topic = '';
    chips.innerHTML = V.select('data-td-sel="pos" aria-label="Lọc theo từ loại"', 'Từ loại', fo.pos, S.pos) + V.select('data-td-sel="topic" aria-label="Lọc theo chủ đề"', 'Chủ đề', fo.topic, S.topic) + chipHtml;
    addBox.innerHTML = '';
    var L = view();
    var half = Math.ceil(L.length / 2);
    list.className = 'td-list' + (L.length ? ' ve-2c' : '');
    syncPop();
    list.innerHTML = L.length ? '<div class="ve-col">' + L.slice(0, half).map(rowHtml).join('') + '</div><div class="ve-col">' + L.slice(half).map(rowHtml).join('') + '</div>' : '<div class="td-none">Không có từ nào.</div>';
    icons();
  }

  function rowHtml(b) {
    var sg = suggested(b), g = groups(b), on = S.open === b.id;
    return '<div class="td-row ve tap' + (on ? ' on' : '') + '" data-td="open" data-id="' + b.id + '" role="button" tabindex="0" aria-haspopup="dialog" aria-label="Xem đầy đủ từ ' + esc(b.word) + '">' +
      V.entryTop({ word: b.word, pos: b.pos, ipa: b.ipa, au: 'data-td="say" data-id="' + b.id + '"' }) +
      V.entryRow2((sg ? esc(sg) : V.pill('chưa có nghĩa', 'warn')) + (g.length ? ' ' + V.pill(g.length + ' nghĩa HV ghi', 'info') : ''), b.topic) + '</div>';
  }
  /* nghĩa học viên tự ghi, có nút dùng làm nghĩa đề xuất hoặc xoá */
  function ownHtml(b) {
    var g = groups(b), nst = (S.links[b.id] || []).length;
    return '<div class="td-sm" style="margin-top:18px"><h3>Nghĩa học viên ghi <span class="td-b">' + nst + ' học viên có từ này</span></h3>' + (g.length ? g.map(function (x, i) {
      return '<div class="td-sr"><div><div class="q">' + esc(x.text) + '</div><div class="who">' + x.who.map(function (s) { return esc(s.name) + (s.cls ? ' (' + esc(s.cls) + ')' : ''); }).join(', ') + '</div></div>' +
        '<div class="td-acts"><button type="button" class="td-btn sm" data-td="use" data-id="' + b.id + '" data-g="' + i + '">Dùng làm nghĩa đề xuất</button><button type="button" class="td-btn sm del" data-td="clear" data-id="' + b.id + '" data-g="' + i + '">Xoá nghĩa này</button></div></div>';
    }).join('') : '<div class="td-none" style="padding:4px 0">Chưa có học viên nào tự ghi nghĩa khác.</div>') + '</div>';
  }
  /* Pop up: xem đầy đủ, bấm Sửa để chuyển sang khung sửa */
  function popHtml(b) {
    if (S.editing) return '<div class="td vm-fl"><div class="vm-hd"><div class="vm-w">' + esc(b.word) + '</div></div>' + editor(b, true) + '</div>';
    var sg = suggested(b);
    return '<div class="td">' + V.fullHtml({ word: b.word, pos: b.pos, ipa: b.ipa, topic: b.topic, au: 'data-td="say" data-id="' + b.id + '"',
      mean: sg ? esc(sg) : V.pill('chưa có nghĩa', 'warn'), def: b.definition_en, ex: b.example,
      forms: V.formsHtml(b.word_forms, function (f) { var y = V.findForm(S.bank, f, function (z) { return z.word; }, function (z) { return z.pos; }); return y && y.id !== b.id ? { attr: 'data-td="open" data-id="' + y.id + '"', meaning: suggested(y) } : null; },
        V.wordFamily(b, S.bank, function (z) { return z.word; }, function (z) { return z.pos; }).map(function (y) { return { w: y.word, p: V.posShort(y.pos), m: suggested(y), attr: 'data-td="open" data-id="' + y.id + '"' }; })),
      note: b.note, meta: b.level ? 'Cấp độ ' + esc(b.level) : '', actions: '<button type="button" class="del" data-td="del" data-id="' + b.id + '"><i data-lucide="trash-2"></i>Xóa từ</button>', edit: 'data-td="edit" data-id="' + b.id + '" aria-label="Sửa từ" title="Sửa"' }) + ownHtml(b) + '</div>';
  }
  function syncPop() {
    var m = V.modalOpen();
    if (S.adding) { /* Thêm từ: khung nhập trong pop up, không vẽ lại khi đang gõ */
      if (m && m.kind === 'add') return;
      m = V.modal('<div class="td vm-fl"><div class="vm-hd"><div class="td-new-t">Thêm từ</div></div>' + editor(null, true) + '</div>', { form: true, onClick: onClick, onKey: onKey, onInput: onInput, onClose: function () { S.adding = false; S.open = null; S.editing = false; draw(); } });
      m.kind = 'add'; return;
    }
    var b = S.open && S.bank.filter(function (x) { return x.id === S.open; })[0];
    if (!b) { S.open = null; S.editing = false; if (m) V.closeModal(true); return; }
    if (m) { m.kind = 'view'; m.set(popHtml(b), S.editing); }
    else V.modal(popHtml(b), { form: S.editing, onClick: onClick, onKey: onKey, onInput: onInput, onClose: function () { S.open = null; S.editing = false; draw(); } });
  }

  function field(name, label, val, ph, list) {
    return '<label>' + label + '<input class="field" data-in="' + name + '" value="' + esc(val || '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (list ? ' list="' + list + '"' : '') + ' autocomplete="off" spellcheck="false"></label>';
  }
  function area(name, label, val, ph) {
    return '<label>' + label + '<textarea class="field td-ta" data-in="' + name + '" rows="3" placeholder="' + ph + '" autocomplete="off" spellcheck="false">' + esc(val || '') + '</textarea></label>';
  }
  /* chọn loại từ bằng pill; giá trị nằm trong ô ẩn data-in="pos" */
  function posPicker(cur) {
    var c = V.posShort(cur), opts = V.POS_LIST.slice(); if (c && opts.indexOf(c) < 0) opts.push(c);
    return '<div class="td-f">Loại từ<input type="hidden" data-in="pos" value="' + esc(c) + '"><div class="td-pp" role="group" aria-label="Loại từ">' + opts.map(function (p) {
      return '<button type="button" data-td="pos" data-p="' + esc(p) + '" class="' + (p === c ? 'on' : '') + '" aria-pressed="' + (p === c) + '">' + esc(p) + '</button>';
    }).join('') + '</div></div>';
  }
  /* form = true: dạng pop up, các ô nằm trong vùng cuộn, lỗi và nút nằm ở hàng cố định bên dưới */
  function editor(b, form) {
    var isNew = !b; b = b || {};
    var dl = '<datalist id="td-tp">' + topicCounts().list.map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist>';
    var F = field('word', 'Từ (tự viết thường)', b.word, 'Ví dụ: thrive') + '<label class="td-ck"><input type="checkbox" data-in="proper"' + (b.word && b.word !== b.word.toLowerCase() ? ' checked' : '') + '> Là tên riêng (giữ chữ hoa)</label><div class="td-hint" data-hint></div>' + posPicker(b.pos) + field('ipa', 'Phiên âm', b.ipa, '/θraɪv/') +
      field('meaning', 'Nghĩa đề xuất', suggested(b), 'Nghĩa tiếng Việt') + field('def', 'Định nghĩa tiếng Anh', b.definition_en, '') +
      field('ex', 'Ví dụ', b.example, '') + field('note', 'Cấu trúc / ghi chú', b.note, 'Ví dụ: be expected to do sth') + area('forms', 'Word form (mỗi dòng một dạng)', b.word_forms, 'thriving (adj) - thịnh vượng&#10;thrivingly (adv) - một cách thịnh vượng') + field('topic', 'Chủ đề', b.topic, 'Ví dụ: Environment', 'td-tp');
    var A = '<div class="td-err" data-err></div><div class="td-acts">' + (isNew ? '<button type="button" class="td-btn" data-td="add-cancel">Huỷ</button><button type="button" class="td-btn pri" data-td="create">Thêm vào từ điển</button>'
        : '<button type="button" class="td-btn" data-td="close">Huỷ</button><button type="button" class="td-btn pri" data-td="save" data-id="' + b.id + '">Lưu</button>') + '</div>';
    var own = isNew ? '' : ownHtml(b), tag = '<div class="td-ed' + (form ? ' td-ed-form' : '') + '" data-ed="' + (isNew ? 'new' : b.id) + '">' + dl;
    return form ? tag + '<div class="vm-sc"><div class="td-ed-f">' + F + '</div>' + own + '</div><div class="vm-ft">' + A + '</div></div>' : tag + F + A + own + '</div>';
  }

  function vals(ed) {
    var o = {};
    ed.querySelectorAll('[data-in]').forEach(function (i) { if (i.type === 'checkbox') { o[i.dataset.in] = i.checked; return; } o[i.dataset.in] = i.tagName === 'TEXTAREA' ? String(i.value || '').split(/\r?\n/).map(norm).filter(Boolean).join('\n') : norm(i.value); });
    return o;
  }
  function setErr(ed, m) { var e = ed && ed.querySelector('[data-err]'); if (e) e.textContent = m || ''; }
  function errMsg(e) {
    var m = String(e && (e.message || e.details) || e || '');
    if (/duplicate key|23505/.test(m) || (e && e.code === '23505')) return 'Từ này với loại từ này đã có trong từ điển.';
    if (/check constraint/.test(m)) return 'Có ô nhập quá dài hoặc chưa đúng.';
    return (w.LMS && LMS.friendlyError) ? LMS.friendlyError(e) : m;
  }
  function patchOf(v) {
    var wd = V.lower(v.word, v.proper);
    return { word: wd, pos: V.posShort(v.pos).slice(0, 20), topic: v.topic ? v.topic.slice(0, 60) : null, ipa: v.ipa || null, meaning_vi: v.meaning || null, meaning_status: v.meaning ? 'approved' : 'empty', definition_en: v.def || null, example: v.ex || null, note: v.note ? v.note.slice(0, 400) : null, word_forms: v.forms ? v.forms.slice(0, 400) : null };
  }
  function busy(btn, on, txt) { if (!btn) return; btn.disabled = on; if (on) { btn.dataset.t0 = btn.textContent; btn.textContent = txt || 'Đang lưu...'; } else if (btn.dataset.t0) btn.textContent = btn.dataset.t0; }
  function updateBank(id, patch) {
    return S.c.from('vocab_bank').update(patch).eq('id', id).select(COLS).single().then(function (r) {
      if (r.error) throw r.error;
      S.bank = S.bank.map(function (b) { return b.id === id ? r.data : b; });
    });
  }

  function onClick(e) {
    var m = V.modalOpen(), b = e.target.closest('[data-td]'); if (!b || !(S.root.contains(b) || (m && m.el.contains(b)))) return;
    var a = b.dataset.td, id = Number(b.dataset.id), ed = b.closest('.td-ed');
    if (a === 'filter') { S.f = b.dataset.f; S.open = null; draw(); }
    else if (a === 'say') { var sb = S.bank.filter(function (x) { return x.id === id; })[0]; if (sb) V.speak(sb.word); }
    else if (a === 'pos') {
      var pv = ed && ed.querySelector('[data-in="pos"]'); if (!pv) return;
      pv.value = pv.value === b.dataset.p ? '' : b.dataset.p;
      ed.querySelectorAll('[data-td="pos"]').forEach(function (x) { var o = x.dataset.p === pv.value; x.classList.toggle('on', o); x.setAttribute('aria-pressed', o); });
    }
    else if (a === 'reload') { load(); }
    else if (a === 'imp-pick') { var fi0 = S.root.querySelector('[data-td-file]'); if (fi0) { fi0.value = ''; fi0.click(); } }
    else if (a === 'imp-go') { doImport(b); }
    else if (a === 'add') { S.adding = true; S.open = null; S.editing = false; draw(); var wi = document.querySelector('.vm [data-ed="new"] [data-in="word"]'); if (wi) wi.focus(); }
    else if (a === 'add-cancel') { S.adding = false; draw(); }
    else if (a === 'open') { S.open = id; S.editing = false; draw(); }
    else if (a === 'edit') { S.editing = true; draw(); var fi = document.querySelector('.vm [data-in="ipa"]'); if (fi) fi.focus(); }
    else if (a === 'close') { S.editing = false; draw(); }
    else if (a === 'save') {
      var v = vals(ed); if (!v.word) { setErr(ed, 'Từ không được để trống.'); return; } if (v.word.length > 80) { setErr(ed, 'Từ quá dài.'); return; }
      busy(b, true);
      var pt = patchOf(v); pt.kind = /\s/.test(pt.word) ? (pt.pos === 'idiom' ? 'idiom' : 'phrase') : 'word';
      updateBank(id, pt).then(function () { S.editing = false; toast(v.meaning ? 'Đã lưu. Nghĩa đề xuất hiện ở sổ của học viên.' : 'Đã lưu.'); draw(); })
        .catch(function (er) { busy(b, false); setErr(ed, errMsg(er)); });
    }
    else if (a === 'create') {
      var nv = vals(ed); if (!nv.word) { setErr(ed, 'Nhập từ trước.'); return; }
      if (nv.word.length > 80) { setErr(ed, 'Từ quá dài.'); return; }
      var row = patchOf(nv); row.kind = /\s/.test(nv.word) || /phr|phrase|idiom/.test(row.pos) ? (row.pos === 'idiom' ? 'idiom' : 'phrase') : 'word';
      busy(b, true, 'Đang thêm...');
      S.c.from('vocab_bank').insert(row).select(COLS).single().then(function (r) {
        if (r.error) throw r.error;
        S.bank.push(r.data); S.bank.sort(function (x, y) { return key(x.word) < key(y.word) ? -1 : key(x.word) > key(y.word) ? 1 : 0; });
        S.adding = false; S.open = r.data.id; S.editing = false; S.q = ''; var qi = S.root.querySelector('[data-td-q]'); if (qi) qi.value = '';
        toast('Đã thêm "' + r.data.word + '" vào từ điển.'); draw();
        var row2 = S.root.querySelector('.td-row[data-id="' + r.data.id + '"]'); if (row2) row2.scrollIntoView({ block: 'center' });
      }).catch(function (er) { busy(b, false); setErr(ed, errMsg(er)); });
    }
    else if (a === 'del') {
      var db = S.bank.filter(function (x) { return x.id === id; })[0]; if (!db) return;
      var nst = (S.links[id] || []).length;
      var msg = 'Xóa từ "' + db.word + '" khỏi từ điển?\n' + (nst ? 'Từ này đang nằm trong sổ của ' + nst + ' học viên, sẽ bị xóa khỏi sổ của các em. ' : '') + 'Không hoàn tác được.';
      var ask2 = (w.LMS && LMS.confirm) ? LMS.confirm(msg, { ok: 'Xóa từ', danger: true }) : Promise.resolve(w.confirm(msg));
      ask2.then(function (ok) {
        if (!ok) return;
        return S.c.from('vocab_bank').delete().eq('id', id).then(function (r) {
          if (r.error) throw r.error;
          S.bank = S.bank.filter(function (x) { return x.id !== id; }); delete S.links[id]; S.open = null; S.editing = false; toast('Đã xóa "' + db.word + '".'); draw();
        });
      }).catch(function (er) { toast(errMsg(er)); });
    }
    else if (a === 'use' || a === 'clear') {
      var bk = S.bank.filter(function (x) { return x.id === id; })[0]; if (!bk) return;
      var g = groups(bk)[Number(b.dataset.g)]; if (!g) return;
      if (a === 'use') {
        busy(b, true);
        updateBank(id, { meaning_vi: g.text, meaning_status: 'approved' }).then(function () { toast('Đã dùng "' + g.text + '" làm nghĩa đề xuất.'); draw(); })
          .catch(function (er) { busy(b, false); setErr(ed, errMsg(er)); });
      } else {
        var names = g.who.map(function (s) { return s.name; }).join(', ');
        var ask = (w.LMS && LMS.confirm) ? LMS.confirm('Xoá nghĩa "' + g.text + '" của ' + names + '?\nTừ vẫn còn trong sổ, học viên sẽ thấy nghĩa đề xuất.', { ok: 'Xoá nghĩa', danger: true }) : Promise.resolve(w.confirm('Xoá nghĩa này?'));
        ask.then(function (ok) {
          if (!ok) return;
          busy(b, true, 'Đang xoá...');
          return S.c.from('vocab_student').update({ own_meaning: null }).in('id', g.ids).then(function (r) {
            if (r.error) throw r.error;
            (S.links[id] || []).forEach(function (l) { if (g.ids.indexOf(l.id) > -1) l.own_meaning = null; });
            toast('Đã xoá nghĩa học viên ghi.'); draw();
          });
        }).catch(function (er) { busy(b, false); setErr(ed, errMsg(er)); });
      }
    }
  }
  /* ---------- nhập từ file CSV ---------- */
  var IMP_H = { word: 'word', tu: 'word', pos: 'pos', ipa: 'ipa', meaning_vi: 'meaning', meaning: 'meaning', nghia: 'meaning', definition_en: 'def', definition: 'def', def: 'def', example: 'ex', ex: 'ex', topic: 'topic', note: 'note' };
  function parseCsv(txt) {
    txt = String(txt || '').replace(/^﻿/, '');
    var head = txt.split(/\r?\n/)[0] || '', d = ',', best = -1;
    [',', ';', '\t'].forEach(function (c) { var n = head.split(c).length; if (n > best) { best = n; d = c; } });
    var rows = [], row = [], cell = '', q = false, i, ch;
    for (i = 0; i < txt.length; i++) {
      ch = txt[i];
      if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === d) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return norm(c); }); });
  }
  function dupKey(word, pos) { return key(word) + '|' + V.posShort(pos || ''); }
  function impPlan(txt) {
    var rows = parseCsv(txt), out = { news: [], dups: [], bad: [], inFile: 0, err: '' };
    if (!rows.length) { out.err = 'File trống.'; return out; }
    var cols = rows[0].map(function (h) { return IMP_H[key(h).replace(/\s+/g, '_')] || ''; });
    if (cols.indexOf('word') < 0) { out.err = 'Không thấy cột "word" ở dòng đầu. Dùng file mẫu Mau tu vung.csv.'; return out; }
    var bankBy = {}; S.bank.forEach(function (b) { bankBy[dupKey(b.word, b.pos)] = b; });
    var seen = {};
    rows.slice(1).forEach(function (r, n) {
      var v = { proper: false }; cols.forEach(function (c, j) { if (c) v[c] = norm(r[j]); });
      if (!v.word) { out.bad.push((n + 2) + ': thiếu từ'); return; }
      if (v.word.length > 80) { out.bad.push((n + 2) + ': từ quá dài'); return; }
      var row = patchOf(v); row.kind = /\s/.test(row.word) || /phr|phrase|idiom/.test(row.pos) ? (row.pos === 'idiom' ? 'idiom' : 'phrase') : 'word';
      var k = dupKey(row.word, row.pos);
      if (seen[k]) { out.inFile++; return; } seen[k] = 1;
      if (bankBy[k]) out.dups.push({ row: row, old: bankBy[k] }); else out.news.push(row);
    });
    return out;
  }
  function impFillPatch(row, old) {
    var p = {};
    ['ipa', 'definition_en', 'example', 'topic', 'note'].forEach(function (f) { if (row[f] && !norm(old[f])) p[f] = row[f]; });
    if (row.meaning_vi && !norm(old.meaning_vi)) { p.meaning_vi = row.meaning_vi; p.meaning_status = 'approved'; }
    return p;
  }
  function impHtml(P) {
    if (P.err) return '<div class="td vm-fl"><div class="vm-hd"><div class="td-new-t">Nhập từ file</div></div><div class="td-none td-err">' + esc(P.err) + '</div></div>';
    var fillN = P.dups.filter(function (d) { return Object.keys(impFillPatch(d.row, d.old)).length; }).length;
    var h = '<div class="td vm-fl"><div class="vm-hd"><div class="td-new-t">Nhập từ file</div></div><div class="td-ed">' +
      '<p><b>' + P.news.length + '</b> từ mới sẽ được thêm.</p>' +
      '<p>' + P.dups.length + ' từ đã có trong từ điển' + (P.inFile ? ', ' + P.inFile + ' dòng lặp trong file' : '') + ' (bỏ qua).</p>' +
      (P.bad.length ? '<p class="td-err">' + P.bad.length + ' dòng lỗi, bỏ qua: ' + esc(P.bad.slice(0, 5).join('; ')) + (P.bad.length > 5 ? '...' : '') + '</p>' : '') +
      (P.news.length ? '<p class="td-hint">Ví dụ: ' + esc(P.news.slice(0, 5).map(function (x) { return x.word; }).join(', ')) + (P.news.length > 5 ? '...' : '') + '</p>' : '') +
      (fillN ? '<label class="td-ck"><input type="checkbox" data-imp-fill> Điền thêm vào ô còn trống của ' + fillN + ' từ đã có (không ghi đè nghĩa đang có)</label>' : '') +
      '<div class="td-err" data-err></div><div class="td-acts"><button type="button" class="td-btn" data-vm-close>Hủy</button>' +
      '<button type="button" class="td-btn pri" data-td="imp-go"' + (P.news.length || fillN ? '' : ' disabled') + '>Nhập</button></div></div></div>';
    return h;
  }
  function onFile(f) {
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      S.imp = impPlan(rd.result);
      V.modal(impHtml(S.imp), { form: true, onClick: onClick, onClose: function () { S.imp = null; } });
    };
    rd.onerror = function () { S.imp = { err: 'Không đọc được file.', news: [], dups: [], bad: [] }; V.modal(impHtml(S.imp), { onClick: onClick }); };
    rd.readAsText(f, 'utf-8');
  }
  function doImport(btn) {
    var P = S.imp; if (!P) return; var m = V.modalOpen(), ed = m && m.el.querySelector('.td-ed');
    var fill = !!(ed && ed.querySelector('[data-imp-fill]') && ed.querySelector('[data-imp-fill]').checked);
    busy(btn, true, 'Đang nhập...');
    var added = 0, failed = 0, filled = 0, chain = Promise.resolve();
    for (var i = 0; i < P.news.length; i += 100) (function (batch) {
      chain = chain.then(function () {
        return S.c.from('vocab_bank').insert(batch).then(function (r) {
          if (!r.error) { added += batch.length; return; }
          return batch.reduce(function (p, row) { return p.then(function () { return S.c.from('vocab_bank').insert(row).then(function (x) { if (x.error) failed++; else added++; }); }); }, Promise.resolve());
        });
      });
    })(P.news.slice(i, i + 100));
    if (fill) P.dups.forEach(function (d) {
      var pt = impFillPatch(d.row, d.old); if (!Object.keys(pt).length) return;
      chain = chain.then(function () { return S.c.from('vocab_bank').update(pt).eq('id', d.old.id).then(function (x) { if (x.error) failed++; else filled++; }); });
    });
    chain.then(function () {
      S.imp = null; V.closeModal(true);
      toast('Đã thêm ' + added + ' từ' + (filled ? ', điền thêm ' + filled + ' từ' : '') + (failed ? ', lỗi ' + failed : '') + '.');
      return load();
    }).catch(function (er) { busy(btn, false); setErr(ed, errMsg(er)); });
  }
  var spT = null;
  function onInput(e) {
    if (e.target.matches && e.target.matches('.td-ed [data-in="word"]')) {
      var inp = e.target, hint = inp.closest('.td-ed').querySelector('[data-hint]'), val = inp.value; clearTimeout(spT);
      spT = setTimeout(function () {
        if (!hint) return; if (!norm(val)) { hint.textContent = ''; return; }
        V.spell(val, S.bank.map(function (x) { return x.word; })).then(function (sp) {
          if (inp.value !== val) return;
          hint.textContent = sp.ok ? '' : 'Chưa thấy từ này trong từ điển, kiểm tra lại chính tả' + (sp.sug ? '. Có phải "' + sp.sug + '"?' : '.');
        });
      }, 450);
      return;
    }
    if (e.target.matches && e.target.matches('[data-td-q]')) { S.q = e.target.value; S.open = null; draw(); }
  }
  function onChange(e) {
    if (e.target.matches && e.target.matches('[data-td-file]')) { onFile(e.target.files && e.target.files[0]); return; }
    var k = e.target.getAttribute && e.target.getAttribute('data-td-sel'); if (!k) return;
    S[k] = e.target.value; S.open = null; draw();
  }
  function onKey(e) {
    if (e.target.matches && e.target.matches('.td-row.tap') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); S.open = Number(e.target.dataset.id); S.editing = false; draw(); return; }
    if (e.key !== 'Enter' || !e.target.matches || !e.target.matches('.td-ed [data-in]') || e.target.tagName === 'TEXTAREA') return;
    var ed = e.target.closest('.td-ed'), btn = ed && ed.querySelector('[data-td="save"],[data-td="create"]'); if (btn) { e.preventDefault(); btn.click(); }
  }

  w.GBTeacherDict = {
    mount: function (root, client) {
      if (!root || !client) return;
      css(); S.c = client;
      if (S.root !== root) {
        S.root = root;
        root.addEventListener('click', onClick); root.addEventListener('input', onInput); root.addEventListener('change', onChange); root.addEventListener('keydown', onKey);
      }
      draw();
      if (!S.loaded && !S.loading) load();
    }
  };
})(window);

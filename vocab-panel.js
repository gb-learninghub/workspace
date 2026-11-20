/* gblearning: khung tra từ thu gọn trong trang làm bài.
   Dùng: GBVocabPanel.mount({ c: supabaseClient, code: studentCode, file: 'ielts/w10/x.html' })
   Ẩn khi bài tính giờ: GBVocabPanel.setHidden(true/false). Cần vocab-core.js nạp trước. */
(function (w) {
  'use strict';
  var V = w.GBVocab;
  /* Cấu hình nhắc: chỉnh ở đây. Từ dò từ lần thứ "from" trở đi sẽ hiện câu nhắc trước khi hiện nghĩa. */
  var REMIND = {
    from: 3,
    lines: ['Em đã tra từ này vài lần rồi. Thử đoán nghĩa trước nhé.']
  };
  var CSS = '#gbvp{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:60;font-family:inherit}#gbvp[hidden]{display:none}#gbvp *{box-sizing:border-box}' +
    '.gbvp-fab{width:52px;height:52px;border-radius:26px;border:0;background:#16181D;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}.gbvp-fab svg{width:22px;height:22px}' +
    '.gbvp-box{display:none;flex-direction:column;width:min(360px,calc(100vw - 28px));height:min(460px,calc(100dvh - 90px));background:#fff;border:1px solid #D5D8DE;border-radius:18px;overflow:hidden}' +
    '#gbvp.open .gbvp-box{display:flex}#gbvp.open .gbvp-fab{display:none}' +
    '.gbvp-hd{display:flex;align-items:center;justify-content:space-between;padding:8px 8px 8px 14px;border-bottom:1px solid #E4E6EA;font-weight:700;font-size:.9375rem}' +
    '.gbvp-ib{width:44px;height:44px;border-radius:22px;border:0;background:transparent;color:#454B57;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;flex:none}.gbvp-ib svg{width:20px;height:20px}' +
    '.gbvp-log{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}' +
    '.gbvp-q{align-self:flex-end;background:#16181D;color:#fff;border-radius:16px;padding:6px 14px;font-size:1rem;max-width:80%;overflow-wrap:anywhere}' +
    '.gbvp-a{align-self:flex-start;background:#F4F5F7;color:#1B1D22;border-radius:16px;padding:10px 14px;font-size:1rem;line-height:1.5;max-width:92%;overflow-wrap:anywhere}' +
    '.gbvp-a .w{font-weight:700;font-size:1rem}.gbvp-a .m{color:#818999;font-size:.875rem;margin-left:6px}.gbvp-a .s{font-size:.875rem;color:#454B57;margin-top:4px}.gbvp-a .t{display:inline-block;font-size:.75rem;border:1px solid #D5D8DE;border-radius:10px;padding:1px 8px;margin-top:4px;color:#596579}' +
    '.gbvp-btn{min-height:44px;padding:0 16px;border-radius:22px;border:1px solid #D5D8DE;background:#fff;font:inherit;font-weight:600;color:#1B1D22;cursor:pointer;margin:8px 6px 0 0}.gbvp-btn.pri{background:#16181D;border-color:#16181D;color:#fff}' +
    '.gbvp-ft{display:flex;gap:6px;padding:8px;border-top:1px solid #E4E6EA}.gbvp-ft input{flex:1;min-width:0;min-height:44px;padding:0 14px;border:1px solid #D5D8DE;border-radius:22px;font-size:16px;outline:0;background:#fff}' +
    '.gbvp-ft .go{background:#16181D;color:#fff;border-radius:22px}.gbvp-ft .go svg{color:#fff}.gbvp-em{color:#818999;font-size:.9375rem;text-align:center;padding:18px 6px}';

  var cfg = null, root, log, inp, pageVocab = null, api = null, busy = false;

  function esc(s) { return V.esc(s); }
  function icons() { /* icon là SVG nhúng sẵn, không cần lucide */ }
  function scroll() { log.scrollTop = log.scrollHeight; }
  function add(cls, html) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; log.appendChild(d); icons(); scroll(); return d; }

  function readPageVocab() {
    if (pageVocab) return pageVocab;
    pageVocab = [];
    try {
      var el = document.getElementById('gb-vocab');
      if (el) { var j = JSON.parse(el.textContent); pageVocab = Array.isArray(j) ? j : (j.items || []); }
    } catch (e) { pageVocab = []; }
    return pageVocab;
  }

  function card(r, lead) {
    return '<div><span class="w">' + esc(r.word) + '</span>' + (r.pos ? '<span class="m">' + esc(r.pos) + '</span>' : '') + (r.ipa ? '<span class="m">' + esc(r.ipa) + '</span>' : '') + '</div>' + (lead || '');
  }
  function detail(r) {
    return (r.meaning ? '<div>' + esc(r.meaning) + '</div>' : '') +
      (r.definition ? '<div class="s">' + esc(r.definition) + '</div>' : '') +
      (r.example ? '<div class="s"><i>' + esc(r.example) + '</i></div>' : '');
  }
  function sayBtn(word) { return '<button type="button" class="gbvp-btn" data-say="' + esc(word) + '">Nghe</button>'; }

  function showRow(r) {
    var needRemind = r.in_notebook && r.meaning && r.lookups >= REMIND.from;
    var el = add('gbvp-a', '');
    if (needRemind) {
      var line = REMIND.lines[Math.floor(Math.random() * REMIND.lines.length)];
      var hint = r.example || r.note || r.definition || '';
      el.innerHTML = card(r) + '<div class="s">' + esc(line) + '</div>' + (hint ? '<div class="s"><i>' + esc(hint) + '</i></div>' : '') +
        '<button type="button" class="gbvp-btn pri" data-reveal>Hiện nghĩa</button>' + sayBtn(r.word);
      el.querySelector('[data-reveal]').addEventListener('click', function () {
        el.innerHTML = card(r) + detail(r) + '<div>' + sayBtn(r.word) + '</div>'; icons(); scroll();
      });
    } else {
      el.innerHTML = card(r) + detail(r) + (r.meaning ? '' : '<div class="t">chờ nghĩa</div>') + '<div>' + sayBtn(r.word) + '</div>';
    }
    scroll();
  }

  function offerAdd(word, d, meaning) {
    var el = add('gbvp-a', '<div class="s">Từ này chưa có trong sổ của em.</div><button type="button" class="gbvp-btn pri" data-add>Thêm vào sổ</button>');
    el.querySelector('[data-add]').addEventListener('click', function () {
      this.disabled = true;
      api.add({ word: word, pos: d ? d.pos : '', ipa: d ? d.ipa : '', definition: d ? d.definition : '', meaning: meaning || '', file: cfg.file })
        .then(function () { el.innerHTML = '<div class="s">Đã thêm vào sổ.</div>'; })
        .catch(function () { el.innerHTML = '<div class="s">Chưa thêm được, thử lại sau.</div>'; });
    });
  }

  function ask(text) {
    var word = V.norm(text);
    if (!word || busy) return;
    busy = true; inp.value = '';
    add('gbvp-q', esc(word));
    api.lookup(word, true).then(function (rows) {
      if (rows && rows.length) { rows.forEach(showRow); busy = false; return; }
      var k = V.key(word), hit = readPageVocab().filter(function (x) { return V.key(x.word) === k; })[0];
      if (hit) { showRow({ word: hit.word, pos: hit.pos || '', ipa: hit.ipa || '', meaning: hit.meaning || '', definition: '', example: hit.example || '', in_notebook: false, lookups: 0 }); offerAdd(hit.word, null, hit.meaning); busy = false; return; }
      return V.dict(word).then(function (d) {
        if (d) { showRow({ word: word, pos: d.pos, ipa: d.ipa, meaning: '', definition: d.definition, in_notebook: false, lookups: 0 }); offerAdd(word, d, ''); }
        else add('gbvp-a', '<div class="s">Chưa tìm thấy từ này. Em kiểm tra lại cách viết hoặc thêm vào sổ kèm nghĩa tự gõ.</div>');
        busy = false;
      });
    }).catch(function () { add('gbvp-a', '<div class="s">Chưa tra được, kiểm tra mạng rồi thử lại.</div>'); busy = false; });
  }

  function mount(o) {
    if (root) return;
    cfg = o; api = V.api(o.c, o.code);
    var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s);
    root = document.createElement('div'); root.id = 'gbvp';
    root.innerHTML = '<button type="button" class="gbvp-fab" aria-label="Mở tra từ vựng"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/><path d="m8 13 4-7 4 7"/><path d="M9.1 11h5.7"/></svg></button>' +
      '<div class="gbvp-box" role="dialog" aria-label="Tra từ vựng"><div class="gbvp-hd"><span>Tra từ</span><button type="button" class="gbvp-ib" data-min aria-label="Thu gọn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/></svg></button></div>' +
      '<div class="gbvp-log"><div class="gbvp-em">Gõ một từ để xem nghĩa.</div></div>' +
      '<form class="gbvp-ft"><input type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Gõ từ cần tra" aria-label="Từ cần tra"><button type="submit" class="gbvp-ib go" aria-label="Tra"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></button></form></div>';
    document.body.appendChild(root);
    log = root.querySelector('.gbvp-log'); inp = root.querySelector('input');
    root.querySelector('.gbvp-fab').addEventListener('click', function () { root.classList.add('open'); inp.focus(); });
    root.querySelector('[data-min]').addEventListener('click', function () { root.classList.remove('open'); });
    root.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); var em = log.querySelector('.gbvp-em'); if (em) em.remove(); ask(inp.value); });
    log.addEventListener('click', function (e) { var b = e.target.closest('[data-say]'); if (b) V.speak(b.getAttribute('data-say')); });
    icons();
  }

  function setHidden(h) { if (root) { root.hidden = !!h; if (h) root.classList.remove('open'); } }

  /* Một dòng cho trang làm bài: tự đọc window.DATA.sb và mã học viên ?s=. Bỏ qua khi xem thử (0000) hoặc thiếu mã. */
  function boot() {
    try {
      var code = (new URLSearchParams(location.search).get('s') || '').trim(), D = w.DATA || {};
      if (!code || code === '0000' || !D.sb) return;
      mount({ c: V.rpcClient(D.sb.url, D.sb.key), code: code, file: null });
    } catch (e) { /* khung tra từ lỗi không được làm hỏng bài */ }
  }

  w.GBVocabPanel = { boot: boot, mount: mount, setHidden: setHidden, config: REMIND };
})(window);

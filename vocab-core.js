/* gblearning vocab core: dùng chung cho tab Sổ từ vựng (student.html) và ngăn tra từ (vocab-panel.js) */
(function (w) {
  'use strict';
  var POS = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv', preposition: 'prep', conjunction: 'conj', pronoun: 'pron', interjection: 'interj', exclamation: 'interj', determiner: 'det', numeral: 'num', article: 'art', abbreviation: 'abbr' };
  var cache = {}, cur = null;

  function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function key(s) { return norm(s).toLowerCase(); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* Từ điển miễn phí: chỉ tra từ đơn. Trả về { ipa, audio, pos, definition } hoặc null. */
  function dict(word) {
    var k = key(word);
    if (!k || k.length > 40 || !/^[a-z][a-z'-]*$/.test(k)) return Promise.resolve(null);
    if (cache[k] !== undefined) return Promise.resolve(cache[k]);
    var ctl = ('AbortController' in w) ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(k), ctl ? { signal: ctl.signal } : {})
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        clearTimeout(t);
        var out = null;
        if (Array.isArray(j) && j.length) {
          var ipa = '', audio = '', pos = '', def = '';
          j.forEach(function (e) {
            if (!ipa) ipa = e.phonetic || '';
            (e.phonetics || []).forEach(function (p) {
              if (!ipa && p.text) ipa = p.text;
              if (!audio && p.audio) audio = p.audio;
            });
            var m = (e.meanings || [])[0];
            if (m && !pos) { pos = POS[m.partOfSpeech] || m.partOfSpeech || ''; def = ((m.definitions || [])[0] || {}).definition || ''; }
          });
          out = { ipa: ipa, audio: audio, pos: pos, definition: def };
        }
        cache[k] = out;
        return out;
      })
      .catch(function () { clearTimeout(t); return null; });
  }

  /* Chữ thường mặc định; chỉ giữ chữ hoa khi là tên riêng (proper = true) */
  function lower(word, proper) { var n = norm(word); return proper ? n : n.toLowerCase(); }
  function dist(a, b) {
    var p = [], i, j; for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) { var c = [i]; for (j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
    return p[b.length];
  }
  /* Dò chính tả một từ đơn: có trong kho (bank) hoặc từ điển thì đúng; không thì gợi ý từ gần giống trong kho (nếu có). → { ok, sug } */
  function spell(word, bank) {
    var k = key(word);
    if (!k || !/^[a-z][a-z'-]*$/.test(k) || k.length < 3) return Promise.resolve({ ok: true });
    var words = (bank || []).map(key);
    if (words.indexOf(k) > -1) return Promise.resolve({ ok: true });
    return dict(k).then(function (d) {
      if (d) return { ok: true };
      var best = null, bd = 3;
      words.forEach(function (x) { if (/\s/.test(x) || Math.abs(x.length - k.length) > 2) return; var d2 = dist(k, x); if (d2 < bd) { bd = d2; best = x; } });
      return { ok: false, sug: best };
    });
  }

  /* Phát âm: ưu tiên file thu sẵn nếu đã có, không thì dùng giọng đọc của thiết bị. */
  function speak(word, url) {
    var k = key(word), c = cache[k];
    function tts() {
      if (!('speechSynthesis' in w)) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(norm(word)); u.lang = 'en-US'; u.rate = 0.9; speechSynthesis.speak(u);
    }
    try { if (cur) cur.pause(); } catch (e) { /* bỏ qua */ }
    if (url) { cur = new Audio(url); cur.play().catch(tts); return; }
    if (c && c.audio) { cur = new Audio(c.audio); cur.play().catch(tts); return; }
    tts();
    dict(word);
  }

  function api(c, code) {
    function call(fn, args) {
      args.p_student_code = code;
      return c.rpc(fn, args).then(function (r) { if (r.error) throw r.error; return r.data; });
    }
    return {
      list: function () { return call('student_vocab_list', {}); },
      today: function () { return call('student_vocab_today', {}); },
      add: function (o) { return call('student_vocab_add', { p_word: o.word, p_pos: o.pos || '', p_kind: o.kind || null, p_ipa: o.ipa || null, p_meaning: o.meaning || null, p_definition: o.definition || null, p_file_key: o.file || null }); },
      set: function (id, o) { return call('student_vocab_set', { p_id: id, p_learned: o.learned == null ? null : o.learned, p_meaning: o.meaning == null ? null : o.meaning, p_note: o.note == null ? null : o.note, p_clear_meaning: !!o.clearMeaning }); },
      remove: function (id) { return call('student_vocab_remove', { p_id: id }); },
      audio: function (word) {
        var k = key(word);
        if (!c.functions || !k || k.length > 40 || !/^[a-z][a-z' -]*$/.test(k)) return Promise.resolve(null);
        return c.functions.invoke('vocab-audio', { body: { word: k, student_code: code } }).then(function (r) { return (r && !r.error && r.data && r.data.audio) || null; });
      },
      lookup: function (word, count) { return call('student_vocab_lookup', { p_word: word, p_count: !!count }); }
    };
  }

  /* "từ" hoặc "từ - nghĩa" (cũng nhận tab, " – ", " — ", "từ: nghĩa", "từ (n) - nghĩa"). */
  function parseList(text) {
    var seen = {}, out = [];
    String(text || '').split(/\r?\n/).forEach(function (raw) {
      var line = norm(raw.replace(/^\s*(?:[*•]|\d+[.)])\s+/, ''));
      if (!line) return;
      var parts = line.split(/\s+[-–—]\s+|\t+|\s*[:：]\s+/);
      var word = norm(parts[0]), meaning = norm(parts.slice(1).join(' - ')), pos = '';
      var m = /^(.*?)\s*\((n\.\s?phr|v\.\s?phr|n|v|adj|adv|prep|conj|pron|noun|verb|adjective|adverb)\)\s*$/i.exec(word);
      if (m) { word = norm(m[1]); pos = posShort(m[2].replace(/\.\s+/, '.')); }
      var k = key(word);
      if (!k || k.length > 80 || seen[k + '|' + pos]) return;
      seen[k + '|' + pos] = 1;
      out.push({ word: word, pos: pos, meaning: meaning });
    });
    return out;
  }

  /* Bộ gọi rpc tối giản cho trang làm bài (không nạp supabase-js): trả { data, error } giống client chuẩn. */
  function rpcClient(url, key) {
    function post(path, body) {
      return fetch(url + path, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + key }, body: JSON.stringify(body || {}) })
        .then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { return r.ok ? { data: j, error: null } : { data: null, error: { message: (j && (j.error || j.message)) || ('HTTP ' + r.status) } }; }); })
        .catch(function (e) { return { data: null, error: { message: String(e && e.message || e) } }; });
    }
    return { functions: { invoke: function (name, o) { return post('/functions/v1/' + name, o && o.body); } }, rpc: function (fn, args) {
      return fetch(url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key }, body: JSON.stringify(args || {}) })
        .then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { return r.ok ? { data: j, error: null } : { data: null, error: { message: (j && (j.message || j.hint)) || ('HTTP ' + r.status) } }; }); })
        .catch(function (e) { return { data: null, error: { message: String(e && e.message || e) } }; });
    } };
  }

  /* Giao diện thẻ từ dùng chung cho Mini dictionary (giáo viên) và Sổ từ vựng (học viên). */
  var SHORT = { n: 'n', noun: 'n', v: 'v', verb: 'v', adj: 'adj', adjective: 'adj', adv: 'adv', adverb: 'adv',
    'n.phr': 'n.phr', 'n phr': 'n.phr', nphr: 'n.phr', 'noun phrase': 'n.phr', 'v.phr': 'v.phr', 'v phr': 'v.phr', vphr: 'v.phr', 'verb phrase': 'v.phr',
    prep: 'prep', preposition: 'prep', conj: 'conj', conjunction: 'conj', pron: 'pron', pronoun: 'pron', phrase: 'phrase', idiom: 'idiom' };
  var POS_LIST = ['n', 'v', 'adj', 'adv', 'n.phr', 'v.phr', 'prep', 'conj', 'phrase', 'idiom'];
  var POS_CLS = { n: 'n', v: 'v', adj: 'adj', adv: 'adv', 'n.phr': 'np', 'v.phr': 'vp' };
  function posShort(p) { var k = key(p); return SHORT[k] || k; }
  function pill(html, cls) { return '<span class="vp' + (cls ? ' vp-' + cls : '') + '">' + html + '</span>'; }
  function posPill(p) { var s = posShort(p); return s ? pill(esc(s), POS_CLS[s] || '') : ''; }
  var UI_CSS = '.ve{padding:10px;border-radius:14px;transition:background-color .15s}.ve.on{background:#EEF3FB}.ve.tap{cursor:pointer;-webkit-tap-highlight-color:transparent}.ve.tap:hover{background:#F5F7FA}.ve.tap.on:hover{background:#EEF3FB}.ve.tap:focus-visible{outline:2px solid #16181D;outline-offset:2px}.ve-top{display:flex;align-items:center;gap:6px;container-type:inline-size}' +
    '.ve-hb{flex:1;min-width:0;display:grid;grid-template-columns:minmax(0,1.3fr) 4.4em minmax(0,1fr);grid-template-areas:"w p i";column-gap:10px;row-gap:2px;align-items:baseline;align-content:center;border:0;background:none;padding:0;text-align:left;color:inherit;font:inherit;cursor:pointer;min-height:40px;min-width:0}' +
    '.ve-w{grid-area:w;font-size:1rem;font-weight:800;line-height:1.3;overflow-wrap:anywhere}.ve-pos{grid-area:p;font-size:.8125rem;color:#596579;font-style:italic;white-space:nowrap}.ve-ipa{grid-area:i;font-size:.8125rem;color:#6B7280;font-weight:500;overflow-wrap:anywhere}' +
    '.ve-tp{flex:none;max-width:55%;margin-left:auto}.ve-tp .vp{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;line-height:24px}' +
    '.ve-au{margin-left:auto;width:40px;height:40px;border-radius:50%;border:0;background:transparent;color:#454B57;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:0;cursor:pointer}.ve-au:hover{background:#F2F3F5}.ve-au svg{width:18px;height:18px}' +
    '.ve-row2{display:flex;gap:12px;align-items:flex-start;margin-top:2px}.ve-row2 .ve-mean{flex:1;min-width:0}.ve-mean{font-size:.9375rem;line-height:1.45;overflow-wrap:anywhere}' +
    '.ve-ex{margin-left:auto;text-align:right;font-style:italic;color:#596579;font-size:.8125rem;line-height:1.45;overflow-wrap:anywhere}.ve-sub{font-size:.8125rem;color:#596579;margin-top:2px}' +
    '.ve-det{display:flex;flex-direction:column;gap:8px;margin-top:10px;font-size:.875rem;line-height:1.55;color:#454B57}.ve-lb{display:block;font-size:.75rem;font-weight:700;color:#818999}' +
    '.ve-2c{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.ve-2c>.ve-col:first-child{padding-right:16px;border-right:1px solid #E4E6EA}.ve-2c>.ve-col:last-child{padding-left:16px}' +
    '@media (max-width:700px){.ve-2c{grid-template-columns:minmax(0,1fr)}.ve-2c>.ve-col:first-child{padding-right:0;border-right:0}.ve-2c>.ve-col:last-child{padding-left:0}}' +
    '.vf{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.vsel{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 4px 0 14px;border:1px solid #E4E6EA;border-radius:999px;background:#fff;font-size:.875rem;font-weight:700;color:#64748b}' +
    '.vsel:focus-within{border-color:#16181D}.vsel select{display:none}.vsel-b{flex:1;min-width:0;height:100%;border:0;background:transparent;font:inherit;font-size:.875rem;font-weight:700;color:#1B1D22;cursor:pointer;text-align:left;padding:0 28px 0 2px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:none!important;outline:0;' +
    'background:transparent url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2364748b%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m7 10 5 5 5-5%27/%3E%3C/svg%3E") no-repeat right 8px center/16px 16px}.vsel.open{border-color:#16181D}' +
    '.vsel-menu{position:fixed;z-index:95;box-sizing:border-box;background:#fff;border:1px solid #E4E6EA;border-radius:14px;box-shadow:0 14px 36px rgba(22,24,29,.16);padding:6px;max-height:min(60vh,360px);overflow-y:auto;overscroll-behavior:contain}' +
    '.vsel-menu button{display:flex;align-items:center;gap:10px;width:100%;min-height:38px;padding:0 10px 0 6px;border:0;border-radius:10px;background:none;font:inherit;font-size:.875rem;color:#1B1D22;text-align:left;cursor:pointer;white-space:nowrap}.vsel-menu button:hover,.vsel-menu button:focus-visible{background:#F2F4F7;outline:0}' +
    '.vsel-menu button.on{font-weight:700;background:#EEF3FB}.vsel-menu .n{min-width:2.2em;flex:none;text-align:right;color:#818999;font-weight:600;font-variant-numeric:tabular-nums}.vsel-menu .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}' +
    '.vm-back{position:fixed;inset:0;z-index:80;background:rgba(22,24,29,.45);display:flex;align-items:center;justify-content:center;padding:16px;animation:vmf .15s ease-out}@keyframes vmf{from{opacity:0}}' +
    '.vm{position:relative;box-sizing:border-box;width:100%;max-width:520px;max-height:min(86vh,760px);overflow:auto;overscroll-behavior:contain;background:#fff;border-radius:20px;padding:20px 20px 18px;box-shadow:0 24px 64px rgba(0,0,0,.25);color:#1B1D22}' +
    '.vm-x{position:absolute;top:12px;right:12px;width:40px;height:40px;border-radius:50%;border:0;background:#F2F3F5;color:#1B1D22;display:inline-flex;align-items:center;justify-content:center;padding:0;cursor:pointer}.vm-x svg{width:18px;height:18px}' +
    '.vm-head{display:flex;align-items:center;gap:8px;padding-right:48px}.vm-tools{margin-left:auto;display:flex;gap:2px;flex:none}.vm-tools .ve-au{margin-left:0}.vm-w{font-size:1.5rem;font-weight:800;line-height:1.25;overflow-wrap:anywhere}.vm-line{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:4px}' +
    '.vm-mean{font-size:1.0625rem;line-height:1.5;margin-top:14px;overflow-wrap:anywhere}.vm-sec{margin-top:14px;font-size:.9375rem;line-height:1.55;color:#454B57;overflow-wrap:anywhere}.vm-meta{margin-top:14px;font-size:.8125rem;color:#818999}' +
    '.vm .vnb-pn{border:0;padding:0;margin:0}.vm .vnb-pt,.vm .td-new-t{font-size:1.25rem;font-weight:800;padding-right:48px}' +
    '.vm-forms{display:flex;flex-direction:column;gap:6px;margin-top:2px}.vm-f{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px}.vm-f .fw{font-weight:700;color:#1B1D22}.vm-f .fp{font-size:.8125rem;font-style:italic;color:#596579}.vm-f .fm{color:#454B57}' +
    '.vm-f button.link{border:0;background:none;padding:0;margin:0;font:inherit;font-weight:700;color:#1B1D22;text-decoration:none;cursor:pointer;min-height:0;min-width:0;border-radius:4px}.vm-f button.link:hover{color:#475569}.vm-f button.link:focus-visible{outline:2px solid #16181D;outline-offset:2px}' +
    /* pop up dạng form: đầu và hàng nút cố định, chỉ vùng giữa cuộn */
    '.vm.form{display:flex;flex-direction:column;overflow:hidden;padding:0}.vm.form>.vm-body{flex:1;min-height:0;display:flex;flex-direction:column}.vm-fl{flex:1;min-height:0;display:flex;flex-direction:column}' +
    '.vm-hd{flex:none;padding:20px 64px 12px 20px}.vm-sc{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:4px 20px 16px}' +
    '.vm-ft{flex:none;display:flex;flex-direction:column;gap:6px;padding:12px 20px 16px;border-top:1px solid #EEF0F3;background:#fff}' +
    '.vm-act{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}.vm-act button{min-height:44px;padding:0 18px;border-radius:999px;border:1px solid #D5D8DE;background:#fff;color:#1B1D22;font:inherit;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px}' +
    '.vm-act button.pri{background:#16181D;border-color:#16181D;color:#fff}.vm-act button.del{color:#B42318}.vm-act svg{width:16px;height:16px}' +
    '.vp{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:999px;background:#ECEEF1;color:#475569;font-size:.75rem;font-weight:700;white-space:nowrap;line-height:1}' +
    '.vp-n{background:#E3EDFF;color:#1D4ED8}.vp-v{background:#DFF5E6;color:#15803D}.vp-adj{background:#FFF1CC;color:#92400E}.vp-adv{background:#EFE7FF;color:#6D28D9}' +
    '.vp-np{background:#DCF0FB;color:#0369A1}.vp-vp{background:#D9F3EE;color:#0F766E}.vp-topic{background:#FCE8EF;color:#9D174D}' +
    '.vp-warn{background:#FEF3C7;color:#92400E}.vp-info{background:#E0F2FE;color:#075985}.vp-mute{background:transparent;color:#818999;box-shadow:inset 0 0 0 1px #DADDE3}';
  function uiCss() { if (document.getElementById('ve-css')) return; var s = document.createElement('style'); s.id = 've-css'; s.textContent = UI_CSS; document.head.appendChild(s); }
  /* dòng 1: từ (loại từ) ipa [chủ đề] ... nút audio. o.btn / o.au: thuộc tính data-* của nút mở và nút audio */
  function entryTop(o) {
    var s = posShort(o.pos);
    return '<div class="ve-top"><div class="ve-hb"><span class="ve-w">' + esc(o.word) + '</span>' + (s ? '<span class="ve-pos">(' + esc(s) + ')</span>' : '') +
      (o.ipa ? '<span class="ve-ipa">' + esc(o.ipa) + '</span>' : '') + '</div>' +
      '<button type="button" class="ve-au" ' + o.au + ' aria-label="Phát âm"><i data-lucide="volume-2"></i></button></div>';
  }
  /* Mỗi chủ đề tự có một màu cố định (tính từ tên chủ đề), ghi đủ tên */
  var TOPIC_COLORS = [['#FCE8EF', '#9D174D'], ['#E3EDFF', '#1D4ED8'], ['#DFF5E6', '#15803D'], ['#FFF1CC', '#92400E'], ['#EFE7FF', '#6D28D9'],
    ['#D9F3EE', '#0F766E'], ['#FFE8DC', '#C2410C'], ['#FDE2E2', '#B91C1C'], ['#EEF5D6', '#4D7C0F'], ['#E8EDF3', '#334155']];
  function topicColor(t) { var k = key(t), h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0; return TOPIC_COLORS[h % TOPIC_COLORS.length]; }
  function topicPill(t) { var c = topicColor(t); return '<span class="vp" style="background:' + c[0] + ';color:' + c[1] + '">' + esc(norm(t)) + '</span>'; }
  /* dòng 2: nghĩa tiếng Việt bên trái, pill chủ đề bên phải (ngay dưới nút nghe). Chưa có chủ đề thì để trống. */
  function entryRow2(meanHtml, topic) { return '<div class="ve-row2"><div class="ve-mean">' + meanHtml + '</div>' + (norm(topic) ? '<span class="ve-tp" title="' + esc(norm(topic)) + '">' + topicPill(topic) + '</span>' : '') + '</div>'; }
  /* Bản đầy đủ của một từ trong pop up. o: word, pos, ipa, topic, au (thuộc tính nút nghe), edit (thuộc tính nút sửa, đặt cạnh nút nghe), mean (html), def, ex, forms (html từ formsHtml), note, meta (html), extra (html), actions (html) */
  function fullHtml(o) {
    var s = posShort(o.pos);
    return '<div class="vm-head"><span class="vm-w">' + esc(o.word) + '</span><span class="vm-tools">' + (o.edit ? '<button type="button" class="ve-au" ' + o.edit + '><i data-lucide="pencil"></i></button>' : '') +
      '<button type="button" class="ve-au" ' + o.au + ' aria-label="Phát âm"><i data-lucide="volume-2"></i></button></span></div>' +
      '<div class="vm-line">' + (s ? '<span class="ve-pos">(' + esc(s) + ')</span>' : '') + (o.ipa ? '<span class="ve-ipa">' + esc(o.ipa) + '</span>' : '') + (norm(o.topic) ? topicPill(o.topic) : '') + '</div>' +
      '<div class="vm-mean">' + o.mean + '</div>' +
      (o.def ? '<div class="vm-sec"><span class="ve-lb">Định nghĩa</span>' + esc(o.def) + '</div>' : '') +
      (o.ex ? '<div class="vm-sec"><span class="ve-lb">Ví dụ</span><i>' + esc(o.ex) + '</i></div>' : '') +
      (o.forms ? '<div class="vm-sec"><span class="ve-lb">Word form</span>' + o.forms + '</div>' : '') +
      (o.note ? '<div class="vm-sec"><span class="ve-lb">Ghi chú</span>' + esc(o.note) + '</div>' : '') +
      (o.meta ? '<div class="vm-meta">' + o.meta + '</div>' : '') + (o.extra || '') + (o.actions ? '<div class="vm-act">' + o.actions + '</div>' : '');
  }
  /* Word form: mỗi dòng một dạng, viết "thriving (adj) - thịnh vượng". Nhận cả kiểu cũ ngăn bằng · hoặc ; */
  function parseForms(text) {
    return String(text == null ? '' : text).split(/\r?\n|\s*[·;]\s*/).map(norm).filter(Boolean).map(function (line) {
      var m = /^(.+?)\s*\(([^)]+)\)\s*(?:[-–—:]\s*(.*))?$/.exec(line);
      if (m) return { w: norm(m[1]), p: posShort(m[2]), m: norm(m[3] || '') };
      var k = line.split(/\s+[-–—]\s+|\s*:\s+/);
      return { w: norm(k[0]), p: '', m: norm(k.slice(1).join(' - ')) };
    }).filter(function (f) { return f.w; });
  }
  /* Hai từ đơn cùng gốc: chung ít nhất 4 chữ cái đầu và gần trùng hết từ ngắn hơn (assume/assumption, know/knowledge).
     Thử trên 143 từ của kho: 29 cặp đúng, không cặp nào sai. */
  function famRel(a, b) { var L = 0, n = Math.min(a.length, b.length); while (L < n && a[L] === b[L]) L++; return L >= 4 && L >= n - 2; }
  /* Tự tìm trong danh sách (sổ hoặc từ điển) các từ cùng gốc với x, ghép theo chuỗi: comparable - compare - comparison */
  function wordFamily(x, list, wordOf, posOf) {
    var k = key(wordOf(x)); if (!k || /\s/.test(k)) return [];
    var fam = [k], out = [], seen = {}, grew = true;
    seen[k + '|' + posShort(posOf(x))] = 1;
    while (grew) {
      grew = false;
      list.forEach(function (y) {
        var wy = key(wordOf(y)), sk = wy + '|' + posShort(posOf(y));
        if (y === x || !wy || /\s/.test(wy) || seen[sk]) return;
        if (fam.some(function (f) { return f === wy || famRel(f, wy); })) { seen[sk] = 1; if (fam.indexOf(wy) < 0) fam.push(wy); out.push(y); grew = true; }
      });
    }
    return out.sort(function (a, b) { return key(wordOf(a)) < key(wordOf(b)) ? -1 : 1; });
  }
  /* find(f) trả về { attr, meaning } nếu dạng từ ghi tay có trong sổ / từ điển: bấm vào sẽ mở từ đó.
     auto: các từ cùng gốc tự tìm được [{ w, p, m, attr }], thêm sau phần ghi tay, bỏ những từ đã ghi tay. */
  function formsHtml(text, find, auto) {
    var L = parseForms(text).map(function (f) { var hit = find ? find(f) : null; return { w: f.w, p: f.p, m: f.m || (hit && hit.meaning) || '', attr: hit ? hit.attr : '' }; });
    (auto || []).forEach(function (a) {
      if (L.some(function (f) { return key(f.w) === key(a.w) && (!f.p || !a.p || f.p === a.p); })) return;
      L.push(a);
    });
    if (!L.length) return '';
    return '<div class="vm-forms">' + L.map(function (f) {
      var hit = f.attr ? f : null, mean = f.m || '';
      var w0 = hit ? '<button type="button" class="fw link" ' + hit.attr + ' title="Mở từ này">' + esc(f.w) + '</button>' : '<span class="fw">' + esc(f.w) + '</span>';
      return '<div class="vm-f">' + w0 + (f.p ? '<span class="fp">(' + esc(f.p) + ')</span>' : '') + (mean ? '<span class="fm">' + esc(mean) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  /* tìm một dạng từ trong danh sách: khớp từ, ưu tiên khớp cả loại từ */
  function findForm(list, f, wordOf, posOf) {
    var k = key(f.w), same = list.filter(function (x) { return key(wordOf(x)) === k; });
    return (f.p && same.filter(function (x) { return posShort(posOf(x)) === f.p; })[0]) || same[0] || null;
  }

  /* Pop up dùng chung: nút đóng, bấm ra ngoài hoặc phím Esc để đóng. o: onClick, onKey, onInput, onClose, form (đầu và nút cố định, giữa cuộn: dùng .vm-fl > .vm-hd + .vm-sc + .vm-ft) */
  var M = null;
  function closeModal(silent) {
    if (!M) return; var m = M; M = null; m.el.remove();
    if (m.prev && m.prev.focus && document.body.contains(m.prev)) { try { m.prev.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ } }
    if (!silent && m.o.onClose) m.o.onClose();
  }
  function modal(html, o) {
    closeModal(true);
    var back = document.createElement('div'); back.className = 'vm-back';
    back.innerHTML = '<div class="vm' + (o && o.form ? ' form' : '') + '" role="dialog" aria-modal="true"><button type="button" class="vm-x" data-vm-close aria-label="Đóng"><i data-lucide="x"></i></button><div class="vm-body"></div></div>';
    var m = { el: back, body: back.querySelector('.vm-body'), o: o || {}, prev: document.activeElement };
    m.set = function (h, form) { if (form != null) back.querySelector('.vm').classList.toggle('form', !!form); m.body.innerHTML = h; if (w.lucide) w.lucide.createIcons(); };
    back.addEventListener('click', function (e) {
      if (e.target === back || e.target.closest('[data-vm-close]')) { closeModal(); return; }
      if (m.o.onClick) m.o.onClick(e);
    });
    back.addEventListener('keydown', function (e) { if (m.o.onKey) m.o.onKey(e); });
    back.addEventListener('input', function (e) { if (m.o.onInput) m.o.onInput(e); });
    document.body.appendChild(back); M = m; m.set(html);
    var x = back.querySelector('.vm-x'); if (x) x.focus({ preventScroll: true });
    return m;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && M) closeModal(); });

  /* dropdown lọc: opts = [[value, text], ...] */
  /* Dropdown tự vẽ (menu luôn mở ngay bên dưới ô, không đè lên ô như menu mặc định của Safari).
     Vẫn giữ một <select> ẩn mang thuộc tính attr: chọn xong sẽ phát sự kiện change từ select đó như cũ. */
  function select(attr, label, opts, cur) {
    var curText = (opts.filter(function (o) { return o[0] === cur; })[0] || opts[0] || ['', ''])[1];
    return '<div class="vsel"><span>' + label + '</span><button type="button" class="vsel-b" aria-haspopup="listbox" aria-expanded="false">' + esc(curText) + '</button><select ' + attr + ' tabindex="-1" aria-hidden="true">' +
      opts.map(function (o) { return '<option value="' + esc(o[0]) + '" data-n="' + (o[2] == null ? '' : o[2]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
  }
  var MENU = null;
  function closeMenu() { if (!MENU) return; MENU.menu.remove(); MENU.box.classList.remove('open'); MENU.btn.setAttribute('aria-expanded', 'false'); MENU = null; }
  function openMenu(btn) {
    closeMenu();
    var box = btn.closest('.vsel'), sel = box && box.querySelector('select'); if (!sel) return;
    var menu = document.createElement('div'); menu.className = 'vsel-menu'; menu.setAttribute('role', 'listbox');
    menu.innerHTML = Array.prototype.map.call(sel.options, function (o, i) {
      var on = o.value === sel.value;
      return '<button type="button" role="option" aria-selected="' + on + '" data-i="' + i + '" class="' + (on ? 'on' : '') + '" title="' + esc(o.text) + '"><span class="n">' + esc(o.getAttribute('data-n') || '') + '</span><span class="t">' + esc(o.text) + '</span></button>';
    }).join('');
    document.body.appendChild(menu);
    var r = box.getBoundingClientRect(), mh = menu.offsetHeight, below = w.innerHeight - r.bottom - 8;
    menu.style.width = r.width + 'px';
    menu.style.left = Math.max(8, Math.min(r.left, w.innerWidth - r.width - 8)) + 'px';
    menu.style.top = (below >= mh || below >= r.top ? r.bottom + 6 : Math.max(8, r.top - mh - 6)) + 'px';
    box.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
    MENU = { menu: menu, box: box, btn: btn, sel: sel };
    var on = menu.querySelector('.on') || menu.querySelector('button'); if (on) { on.focus({ preventScroll: true }); on.scrollIntoView({ block: 'nearest' }); }
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (MENU && MENU.menu.contains(t)) {
      var it = t.closest('button[data-i]'); if (!it) return;
      var m = MENU, opt = m.sel.options[Number(it.dataset.i)]; closeMenu();
      if (opt && m.sel.value !== opt.value) { m.sel.value = opt.value; m.sel.dispatchEvent(new Event('change', { bubbles: true })); }
      return;
    }
    var bx = t.closest && t.closest('.vsel'), b = bx && bx.querySelector('.vsel-b');
    if (b) { if (MENU && MENU.btn === b) closeMenu(); else openMenu(b); return; }
    closeMenu();
  });
  document.addEventListener('keydown', function (e) {
    if (!MENU) return;
    if (e.key === 'Escape') { var b = MENU.btn; closeMenu(); b.focus(); e.stopPropagation(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var its = Array.prototype.slice.call(MENU.menu.querySelectorAll('button')), k = its.indexOf(document.activeElement);
      k = e.key === 'ArrowDown' ? Math.min(its.length - 1, k + 1) : Math.max(0, k - 1); if (its[k]) its[k].focus(); e.preventDefault();
    }
  }, true);
  w.addEventListener('resize', closeMenu);
  document.addEventListener('scroll', function (e) { if (MENU && !MENU.menu.contains(e.target)) closeMenu(); }, true);

  /* các lựa chọn cho dropdown Từ loại và Chủ đề, tính từ danh sách từ */
  function filterOpts(items, posOf, topicOf) {
    var pc = {}, tc = {}, noT = 0;
    items.forEach(function (x) { var p = posShort(posOf(x)) || '-'; pc[p] = (pc[p] || 0) + 1; var t = norm(topicOf(x)); if (t) tc[t] = (tc[t] || 0) + 1; else noT++; });
    var ps = Object.keys(pc).sort(function (a, b) { var i = POS_LIST.indexOf(a), j = POS_LIST.indexOf(b); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || (a < b ? -1 : 1); });
    return {
      pos: [['', 'Tất cả', items.length]].concat(ps.map(function (p) { return [p, p === '-' ? 'Chưa có' : p, pc[p]]; })),
      topic: [['', 'Tất cả', items.length]].concat(Object.keys(tc).sort(function (a, b) { return key(a) < key(b) ? -1 : 1; }).map(function (t) { return [t, t, tc[t]]; }), noT ? [['-', 'Chưa có chủ đề', noT]] : []),
      has: function (kind, v) { return !v || (kind === 'pos' ? !!pc[v] : v === '-' ? noT > 0 : !!tc[v]); }
    };
  }
  function match(x, pos, topic, posOf, topicOf) {
    if (pos && (posShort(posOf(x)) || '-') !== pos) return false;
    var t = norm(topicOf(x));
    if (topic === '-' ? !!t : topic && t !== topic) return false;
    return true;
  }

  w.GBVocab = { lower: lower, spell: spell, norm: norm, key: key, esc: esc, dict: dict, speak: speak, api: api, parseList: parseList, rpcClient: rpcClient, POS: POS,
    posShort: posShort, posPill: posPill, pill: pill, POS_LIST: POS_LIST, uiCss: uiCss,
    entryTop: entryTop, entryRow2: entryRow2, topicPill: topicPill, fullHtml: fullHtml, parseForms: parseForms, formsHtml: formsHtml, findForm: findForm, wordFamily: wordFamily, modal: modal, closeModal: closeModal, modalOpen: function () { return M; }, select: select, filterOpts: filterOpts, match: match };
})(window);

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
  var UI_CSS = '.ve{padding:12px 0}.ve-top{display:flex;align-items:center;gap:8px}' +
    '.ve-hb{flex:1;min-width:0;display:flex;align-items:center;flex-wrap:wrap;gap:4px 8px;border:0;background:none;padding:0;text-align:left;color:inherit;font:inherit;cursor:pointer;min-height:40px}' +
    '.ve-w{font-size:1.125rem;font-weight:800;line-height:1.3;overflow-wrap:anywhere}.ve-pos{font-size:.9375rem;color:#596579;font-style:italic}.ve-ipa{font-size:.9375rem;color:#6B7280;font-weight:500}' +
    '.ve-au{margin-left:auto;width:40px;height:40px;border-radius:50%;border:0;background:transparent;color:#454B57;display:inline-flex;align-items:center;justify-content:center;flex:none;padding:0;cursor:pointer}.ve-au:hover{background:#F2F3F5}.ve-au svg{width:18px;height:18px}' +
    '.ve-row2{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:baseline;margin-top:2px}.ve-mean{font-size:1rem;line-height:1.45;overflow-wrap:anywhere}' +
    '.ve-ex{margin-left:auto;text-align:right;font-style:italic;color:#596579;font-size:.9375rem;line-height:1.45;overflow-wrap:anywhere}.ve-sub{font-size:.875rem;color:#596579;margin-top:2px}' +
    '.ve-det{display:flex;flex-direction:column;gap:8px;margin-top:10px;font-size:.9375rem;line-height:1.55;color:#454B57}.ve-lb{display:block;font-size:.75rem;font-weight:700;color:#818999}' +
    '.ve-cols{column-count:2;column-gap:40px;column-rule:1px solid #E4E6EA}.ve-cols>*{break-inside:avoid;-webkit-column-break-inside:avoid}@media (max-width:700px){.ve-cols{column-count:1}}' +
    '.vf{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.vsel{display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 4px 0 14px;border:1px solid #E4E6EA;border-radius:999px;background:#fff;font-size:.875rem;font-weight:700;color:#64748b}' +
    '.vsel select{border:0;background:transparent;font:inherit;font-size:16px;color:#1B1D22;height:38px;outline:0;max-width:190px;cursor:pointer}' +
    '.vp{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:999px;background:#ECEEF1;color:#475569;font-size:.75rem;font-weight:700;white-space:nowrap;line-height:1}' +
    '.vp-n{background:#E3EDFF;color:#1D4ED8}.vp-v{background:#DFF5E6;color:#15803D}.vp-adj{background:#FFF1CC;color:#92400E}.vp-adv{background:#EFE7FF;color:#6D28D9}' +
    '.vp-np{background:#DCF0FB;color:#0369A1}.vp-vp{background:#D9F3EE;color:#0F766E}.vp-topic{background:#FCE8EF;color:#9D174D}' +
    '.vp-warn{background:#FEF3C7;color:#92400E}.vp-info{background:#E0F2FE;color:#075985}.vp-mute{background:transparent;color:#818999;box-shadow:inset 0 0 0 1px #DADDE3}';
  function uiCss() { if (document.getElementById('ve-css')) return; var s = document.createElement('style'); s.id = 've-css'; s.textContent = UI_CSS; document.head.appendChild(s); }
  /* dòng 1: từ (loại từ) ipa [chủ đề] ... nút audio. o.btn / o.au: thuộc tính data-* của nút mở và nút audio */
  function entryTop(o) {
    var s = posShort(o.pos);
    return '<div class="ve-top"><button type="button" class="ve-hb" ' + o.btn + '><span class="ve-w">' + esc(o.word) + '</span>' + (s ? '<span class="ve-pos">(' + esc(s) + ')</span>' : '') +
      (o.ipa ? '<span class="ve-ipa">' + esc(o.ipa) + '</span>' : '') + (o.topic ? pill(esc(o.topic), 'topic') : '') + (o.extra || '') + '</button>' +
      '<button type="button" class="ve-au" ' + o.au + ' aria-label="Phát âm"><i data-lucide="volume-2"></i></button></div>';
  }
  /* dòng 2: nghĩa tiếng Việt bên trái, câu ví dụ sát lề phải */
  function entryRow2(meanHtml, ex) { return '<div class="ve-row2"><div class="ve-mean">' + meanHtml + '</div>' + (ex ? '<div class="ve-ex">' + esc(ex) + '</div>' : '') + '</div>'; }
  /* dropdown lọc: opts = [[value, text], ...] */
  function select(attr, label, opts, cur) {
    return '<label class="vsel">' + label + '<select ' + attr + '>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
  }
  /* các lựa chọn cho dropdown Từ loại và Chủ đề, tính từ danh sách từ */
  function filterOpts(items, posOf, topicOf) {
    var pc = {}, tc = {}, noT = 0;
    items.forEach(function (x) { var p = posShort(posOf(x)) || '-'; pc[p] = (pc[p] || 0) + 1; var t = norm(topicOf(x)); if (t) tc[t] = (tc[t] || 0) + 1; else noT++; });
    var ps = Object.keys(pc).sort(function (a, b) { var i = POS_LIST.indexOf(a), j = POS_LIST.indexOf(b); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j) || (a < b ? -1 : 1); });
    return {
      pos: [['', 'Tất cả']].concat(ps.map(function (p) { return [p, (p === '-' ? 'Chưa có' : p) + ' (' + pc[p] + ')']; })),
      topic: [['', 'Tất cả']].concat(Object.keys(tc).sort(function (a, b) { return key(a) < key(b) ? -1 : 1; }).map(function (t) { return [t, t + ' (' + tc[t] + ')']; }), noT ? [['-', 'Chưa có chủ đề (' + noT + ')']] : []),
      has: function (kind, v) { return !v || (kind === 'pos' ? !!pc[v] : v === '-' ? noT > 0 : !!tc[v]); }
    };
  }
  function match(x, pos, topic, posOf, topicOf) {
    if (pos && (posShort(posOf(x)) || '-') !== pos) return false;
    var t = norm(topicOf(x));
    if (topic === '-' ? !!t : topic && t !== topic) return false;
    return true;
  }

  w.GBVocab = { norm: norm, key: key, esc: esc, dict: dict, speak: speak, api: api, parseList: parseList, rpcClient: rpcClient, POS: POS,
    posShort: posShort, posPill: posPill, pill: pill, POS_LIST: POS_LIST, uiCss: uiCss,
    entryTop: entryTop, entryRow2: entryRow2, select: select, filterOpts: filterOpts, match: match };
})(window);

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
      var m = /^(.*?)\s*\((n|v|adj|adv|prep|conj|pron|noun|verb|adjective|adverb)\)\s*$/i.exec(word);
      if (m) { word = norm(m[1]); pos = POS[m[2].toLowerCase()] || m[2].toLowerCase(); }
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

  w.GBVocab = { norm: norm, key: key, esc: esc, dict: dict, speak: speak, api: api, parseList: parseList, rpcClient: rpcClient, POS: POS };
})(window);

/* gblearning: khung Student's notes + tra từ dùng chung cho mọi trang bài làm.
   Giao diện và cách chạy lấy theo Practice Reading 06 (chốt 20/11/2026). Sửa ở đây là mọi bài cập nhật theo.
   Dùng: var N = GBNotes.mount({
     rpc: function (fn, body) { return Promise },     // rpc của trang (đã xử lý mã 0000)
     code: function () { return state.code; },
     fileKey: "ielts/w11/ielts06-reading.html",
     store: state,                                       // trang lưu store.notes[part], store.words[part] vào bản nháp
     part: function () { return state.p; },
     label: function () { return "Passage 1"; },         // hiện "Passage 1 notes" (hoặc noteLabel: trả về cả dòng)
     steps: function () { return [{ n: "Tên bước", c: ["ý 1", "ý 2"] }]; },
     save: scheduleSave,
     frame: function () { return { top: 56, bottom: 52 }; },   // khoảng trên/dưới của panel
     main: "#main",                                      // phần trang chừa chỗ khi panel mở
     selRoots: function () { return [passageEl, questionsEl]; },  // bôi đen ở đây thì hiện Look up
     hl: { info: fn, overlaps: fn(inf), set: fn(inf, add) },     // không bắt buộc: thêm Highlight/Clear
     locked: function () { return false; },              // không bắt buộc: true thì không cho đóng panel
     placeholder: "Write your notes here...",
     onNotes: function (part, text) {}                   // không bắt buộc
   });
   N.toggle(), N.render() (khi đổi passage/part), N.fit(), N.isOpen(), N.el, N.hideSel() */
(function (w) {
  'use strict';
  var CSS = '#np,#npt,#fcard,#selb{--line:#dcdcdc;--mut:#6b6b6b;--soft:#f3f3f3;--ink:#111}' +
    '#np{position:fixed;right:0;top:56px;bottom:52px;width:360px;background:#fff;color:#111;border-left:1.5px solid #111;z-index:40;display:flex;flex-direction:column;overflow:hidden;font-family:Aptos,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:16px;text-align:left;box-sizing:border-box}' +
    '#np *,#fcard *,#selb *{box-sizing:border-box}#np[hidden]{display:none}#np button,#fcard button,#selb button{font-family:inherit;cursor:pointer}' +
    '#np .nph{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid var(--line)}' +
    '#np .nph .nt{border:0;background:none;padding:8px 12px;border-radius:18px;font-size:15px;color:var(--mut)}#np .nph .nt.on{background:var(--soft);color:var(--ink);font-weight:700}#np .nph .sp{flex:1}' +
    '#np .npb{flex:1;overflow:auto;padding:12px}#np .npb.nn{display:flex;flex-direction:column;overflow:hidden}' +
    '#np .npb textarea{width:100%;resize:none;border:1.5px solid var(--line);border-radius:12px;padding:10px;font:inherit;font-size:16px;line-height:1.5;color:inherit;background:#fff}#np .npb.nn textarea{flex:1 1 0;min-height:0}' +
    '#np .npb.nn .lk,#np .npb.nn .npm{flex:none}#np .npb .lk{display:flex;gap:6px;margin:10px 0}#np .npb.nn .lk{margin-top:0}' +
    '#np .npb .lk input{flex:1;font:inherit;font-size:16px;border:1.5px solid var(--line);border-radius:12px;padding:8px 10px;min-width:0;color:inherit;background:#fff}' +
    '#np .pill,#fcard .pill{white-space:nowrap;border:0;border-radius:22px;background:#111;color:#fff;height:44px;padding:0 24px;font-size:16px;font-weight:600}#np .pill.ghost{background:var(--soft);color:#111}' +
    '#np .ib,#fcard .ib{height:38px;min-width:38px;border:0;border-radius:19px;background:var(--soft);display:inline-flex;align-items:center;justify-content:center;padding:0 10px;color:var(--ink)}#np .ib.bare,#fcard .ib.bare{background:none;min-width:30px;height:30px}' +
    '#np .vc,#fcard .vc{border:1px solid var(--line);border-radius:12px;padding:8px 10px;margin:8px 0;font-size:15px;line-height:1.45}#np .vc .vw,#fcard .vw{font-weight:700;font-size:16px}#np .vc .vp,#fcard .vp{color:var(--mut);margin:0 6px}' +
    '#np .npm,#fcard .npm{color:var(--mut);font-size:14px;margin:6px 0}' +
    '#npsg{position:absolute;left:0;right:0;top:100%;margin-top:2px;background:#fff;border:1.5px solid #111;border-radius:12px;z-index:5;max-height:240px;overflow:auto}#npsg[hidden]{display:none}' +
    '#npsg .sgi{display:grid;grid-template-columns:auto auto 1fr 18px;gap:8px;align-items:baseline;width:100%;border:0;border-bottom:1px solid var(--line);background:none;padding:10px 12px;text-align:left;font:inherit;font-size:15px;min-height:44px;color:inherit}#npsg .sgi:last-child{border-bottom:0}#npsg .sgw{font-weight:700}#npsg .sgp{color:var(--mut);font-size:13px}#npsg .sgm{color:#333;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#npsg .sgn{color:#2e7d4f;font-weight:700}' +
    '#np .stp{flex:none;margin:0 0 8px}#np .stk{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;border:1.5px solid var(--line);border-radius:12px}#np .stk::-webkit-scrollbar{display:none}#np .stc{flex:0 0 100%;scroll-snap-align:start;padding:10px 12px;overflow:hidden;font-size:14px;line-height:1.45}#np .stn{font-weight:800;font-size:15px;margin:0 0 6px;color:#000}#np .stb{margin:0;padding:0 0 0 18px;list-style:disc}#np .stb li{margin:0 0 4px}#np .stf{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:4px}#np .sta{border:0;background:none;font-size:22px;line-height:1;width:44px;height:32px;color:inherit}#np .sta[disabled]{opacity:.25}#np .std{display:flex;gap:6px}#np .sdot{width:7px;height:7px;border-radius:50%;background:#ccc}#np .sdot.on{background:#111}' +
    '#npt{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:39;writing-mode:vertical-rl;border:1.5px solid #111;border-right:0;border-radius:14px 0 0 14px;background:#111;color:#fff;padding:16px 9px;font:600 15px Aptos,-apple-system,sans-serif;cursor:pointer}#npt[hidden]{display:none}' +
    '#selb{position:fixed;z-index:60;display:flex;gap:4px;padding:4px;border-radius:22px;background:#111}#selb[hidden]{display:none}#selb button{height:32px;padding:0 14px;border:0;border-radius:16px;background:none;color:#fff;font:600 14px Aptos,-apple-system,sans-serif}#selb button+button{border-left:1px solid #444}mark.hl{background:#ffe14d;color:inherit;border-radius:3px}' +
    '#fcard{position:fixed;z-index:60;width:300px;max-height:60dvh;overflow:auto;background:#fff;color:#111;border:1.5px solid #111;border-radius:14px;padding:6px 10px;font-family:Aptos,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:15px;text-align:left}#fcard[hidden]{display:none}#fcard .vc{border:0;padding:4px 0;margin:2px 0}' +
    '#fcard .vb,#fcard>.vb{margin-top:6px;border:0;border-radius:16px;background:#111;color:#fff;height:34px;padding:0 14px;font-size:14px}#fcard .vb[disabled]{background:var(--soft);color:var(--mut)}#fcard>.vb+.vb{margin-left:6px}' +
    '#fcard>input,#fcard>select{width:100%;font:inherit;font-size:15px;border:1.5px solid var(--line);border-radius:10px;padding:6px 8px;margin-top:6px;background:#fff;color:inherit}#fcard>.npe{margin-top:4px}#fcard>.npm{margin:2px 0}' +
    '#fcard .vsg{margin-left:6px;font-size:12px;padding:1px 7px;border:1px solid var(--line);border-radius:10px;color:var(--mut)}' +
    '#np .wl{flex:1 1 0;min-height:0;overflow:auto;margin:0 0 8px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}#np .wl .none{color:var(--mut);font-size:14px;padding:10px 0}' +
    '#np .wr{display:grid;grid-template-columns:30px minmax(0,1fr) 112px 26px 26px;column-gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid var(--line);font-size:15px}#np .wr .ww{font-weight:700;overflow-wrap:anywhere}#np .wr .wi{grid-column:2;white-space:nowrap;color:var(--mut);font-size:14px}' +
    '#np .wr select{font:inherit;font-size:14px;border:0;border-bottom:1.5px solid var(--line);background:none;color:var(--mut);width:100%;min-width:0;height:30px}#np .wr .wmi{grid-column:3 / 6;font:inherit;font-size:15px;border:0;border-bottom:1.5px solid var(--line);background:none;height:30px;min-width:0;margin-top:2px;color:inherit}#np .wr .wmi:focus,#np .wr select:focus{outline:none;border-bottom-color:#111}#np .wr .ib.bare{min-width:26px;height:26px;padding:0}#np .wr .wx{font-size:18px;color:var(--mut)}' +
    '#np .vmb{flex:none;width:40px;height:40px;border:1.5px solid var(--line);border-radius:20px;background:#fff;color:inherit;display:grid;place-items:center;padding:0}#np .vmb.on{background:#111;color:#fff;border-color:#111}' +
    '#npmf{flex:none;display:grid;gap:6px;margin:0 0 8px}#npmf input,#npmf select{font:inherit;font-size:16px;border:1.5px solid var(--line);border-radius:12px;padding:8px 10px;min-width:0;background:#fff;width:100%;height:44px;color:inherit}#npmf .r2{display:grid;grid-template-columns:1fr 1fr;gap:6px}#npmf .r3{display:flex;gap:6px;justify-content:flex-end}#npmf .pill{height:40px;padding:0 18px}' +
    '#np .npe,#fcard .npe{color:#b42b2b;font-size:14px}#np .npe:empty,#fcard .npe:empty{display:none}' +
    '@media (max-width:700px){#np{left:0;width:auto}}';
  var SPK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
  var PLUS = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
  var POS = ["noun", "verb", "adjective", "adverb", "preposition", "pronoun", "conjunction", "phrase"];

  function h(tag, a) {
    var e = document.createElement(tag);
    if (a) for (var k in a) { if (k === "cls") e.className = a[k]; else if (k === "html") e.innerHTML = a[k]; else if (k === "text") e.textContent = a[k]; else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), a[k]); else e.setAttribute(k, a[k]); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null) continue; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); }
    return e;
  }
  function norm(s) { return String(s == null ? "" : s).toLowerCase().replace(/\s+/g, " ").trim(); }
  function speak(x) { try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(x); u.lang = "en-US"; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) { } }
  function tokensOf(text) {
    var t = String(text || ""), ws = t.match(/[A-Za-z][A-Za-z'-]{2,}/g) || [];
    if (ws.length && /[A-Za-z'-]$/.test(t)) ws.pop();
    var seen = {}, out = []; ws.forEach(function (x) { x = x.toLowerCase(); if (!seen[x]) { seen[x] = 1; out.push(x); } }); return out;
  }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  function mount(cfg) {
    if (!document.getElementById("gbn-css")) { var st = h("style", { id: "gbn-css" }); st.textContent = CSS + (cfg.main ? "body.np-open " + cfg.main + "{margin-right:360px}@media (max-width:700px){body.np-open " + cfg.main + "{margin-right:0}}" : ""); document.head.appendChild(st); }
    var S = { view: "notes", vc: {}, nb: null, nbf: "", dis: {}, fc: null, goLookup: null };
    var store = cfg.store;
    function code() { return cfg.code() || ""; }
    function part() { return cfg.part(); }
    function notes() { return store.notes || (store.notes = {}); }
    function words() { return store.words || (store.words = {}); }
    function save() { if (cfg.save) cfg.save(); }
    function rpc(fn, body) { return cfg.rpc(fn, body); }
    function wlist() { var W = words(), p = part(); return W[p] || (W[p] = []); }

    var p = h("div", { id: "np", hidden: "hidden", role: "dialog", "aria-label": "Student's notes" });
    var tab = h("button", { id: "npt", text: "Student's notes", "aria-label": "Open student's notes", onclick: toggle });
    document.body.appendChild(p); document.body.appendChild(tab);
    window.addEventListener("resize", fit);

    function fit() { var f = cfg.frame ? cfg.frame() : { top: 56, bottom: 52 }; p.style.top = (f.top || 0) + "px"; p.style.bottom = (f.bottom || 0) + "px"; }
    function isOpen() { return !p.hasAttribute("hidden"); }
    function toggle() {
      var open = !isOpen();
      if (!open && cfg.locked && cfg.locked()) return; /* khung đang bị khoá mở (bài tính giờ): không cho đóng */
      if (open) { p.removeAttribute("hidden"); fit(); render(); } else p.setAttribute("hidden", "hidden");
      document.body.classList.toggle("np-open", open); tab.hidden = open;
    }

    /* ---- tra từ ---- */
    function lookup0(x, count) {
      if (!code()) return Promise.resolve([]);
      if (!count && has(S.vc, x)) return Promise.resolve(S.vc[x]);
      return rpc("student_vocab_lookup", { p_student_code: code(), p_word: x, p_count: !!count }).then(function (r) { S.vc[x] = Array.isArray(r) ? r : []; return S.vc[x]; }).catch(function () { return []; });
    }
    function addWords(x, r) {
      var rows = (r && r.length) ? r.map(function (e) { return { word: e.word, pos: e.pos || "", ipa: e.ipa || "", meaning: e.meaning || "" }; }) : [{ word: x, pos: "", ipa: "", meaning: "" }];
      var L = wlist(); rows.forEach(function (a) { if (!L.some(function (y) { return y.word.toLowerCase() === a.word.toLowerCase() && y.pos === a.pos; })) L.push(a); });
      S.dis[x] = 1; save(); drawWords();
    }
    function autoAdd(r) {
      (r || []).forEach(function (e) {
        if (!e || e.in_notebook) return;
        rpc("student_vocab_add", { p_student_code: code(), p_word: e.word, p_pos: e.pos || "", p_ipa: e.ipa || null, p_meaning: e.meaning || null, p_definition: e.definition || null, p_file_key: cfg.fileKey })
          .then(function () { e.in_notebook = true; S.nb = null; wlist().forEach(function (a) { if (a.word.toLowerCase() === String(e.word).toLowerCase() && (a.pos || "") === (e.pos || "")) a.added = true; }); save(); drawWords(); drawCards(); }).catch(function () { });
      });
    }
    /* tra có chủ ý (Look up): thêm dòng vào My words và tự thêm vào sổ */
    function lookup(x, count) { return lookup0(x, count).then(function (r) { if (count) { addWords(x, r); autoAdd(r); } return r; }); }
    function addWord(e, btn) {
      btn.disabled = true; btn.textContent = "Adding...";
      rpc("student_vocab_add", { p_student_code: code(), p_word: e.word, p_pos: e.pos || "", p_ipa: e.ipa || null, p_meaning: e.meaning || null, p_definition: e.definition || null, p_file_key: cfg.fileKey })
        .then(function () { e.in_notebook = true; S.nb = null; btn.textContent = "In notebook"; })
        .catch(function () { btn.disabled = false; btn.textContent = "Try again"; });
    }

    /* ---- My words ---- */
    function drawWords() {
      var box = document.getElementById("npw"); if (!box) return; box.innerHTML = "";
      var L = wlist(); if (!L.length) box.appendChild(h("div", { cls: "none", text: "Words you look up appear here." }));
      L.forEach(function (x, i) {
        var sel = h("select", { "aria-label": "Part of speech of " + x.word });
        var opts = POS.slice(); if (x.pos && opts.indexOf(x.pos) < 0) opts.push(x.pos);
        sel.appendChild(h("option", { value: "", text: "Word class" }));
        opts.forEach(function (o) { var op = h("option", { value: o, text: o }); if (o === x.pos) op.selected = true; sel.appendChild(op); });
        sel.addEventListener("change", function () { x.pos = sel.value; x.added = false; save(); drawWords(); });
        var mi = h("input", { cls: "wmi", type: "text", placeholder: "Meaning", autocomplete: "off", spellcheck: "false", value: x.meaning || "", "aria-label": "Meaning of " + x.word });
        mi.addEventListener("input", function () { x.meaning = mi.value; x.added = false; save(); });
        var add = h("button", { cls: "ib bare", title: x.added ? "In notebook" : "Add to notebook", "aria-label": "Add " + x.word + " to notebook", text: x.added ? "✓" : "+" });
        if (x.added) add.disabled = true; else add.addEventListener("click", function () {
          add.disabled = true; add.textContent = "…";
          rpc("student_vocab_add", { p_student_code: code(), p_word: x.word, p_pos: x.pos || "", p_ipa: x.ipa || null, p_meaning: x.meaning || null, p_file_key: cfg.fileKey })
            .then(function () { x.added = true; S.nb = null; save(); drawWords(); }).catch(function () { add.disabled = false; add.textContent = "!"; });
        });
        box.appendChild(h("div", { cls: "wr" },
          h("button", { cls: "ib bare", title: "Listen", "aria-label": "Listen to " + x.word, html: SPK, onclick: function () { speak(x.word); } }),
          h("span", { cls: "ww", text: x.word }), sel, add,
          h("button", { cls: "ib bare wx", text: "×", title: "Remove", "aria-label": "Remove " + x.word, onclick: function () { L.splice(i, 1); save(); drawWords(); } }),
          h("span", { cls: "wi", text: x.ipa }), mi));
      });
    }

    /* ---- gợi ý khi gõ ô Look up ---- */
    function attachSuggest(lk) {
      var inp = lk.querySelector("input"); if (!inp) return;
      lk.style.position = "relative";
      var sg = h("div", { id: "npsg", hidden: "hidden" }); lk.appendChild(sg);
      var tmr = null;
      function hide() { sg.setAttribute("hidden", "hidden"); sg.innerHTML = ""; }
      inp.addEventListener("input", function () {
        clearTimeout(tmr); var q = inp.value.trim();
        if (q.length < 2 || !code()) { hide(); return; }
        tmr = setTimeout(function () {
          rpc("student_vocab_suggest", { p_student_code: code(), p_q: q }).then(function (r) {
            if (inp.value.trim() !== q) return; sg.innerHTML = "";
            (Array.isArray(r) ? r : []).forEach(function (e) {
              sg.appendChild(h("button", { cls: "sgi", onclick: function () { inp.value = e.w; hide(); if (S.goLookup) S.goLookup(); } },
                h("span", { cls: "sgw", text: e.w }), h("span", { cls: "sgp", text: e.pos || "" }), h("span", { cls: "sgm", text: e.meaning || "" }), h("span", { cls: "sgn", text: e.in_notebook ? "✓" : "" })));
            });
            if (sg.childNodes.length) sg.removeAttribute("hidden"); else hide();
          }).catch(hide);
        }, 200);
      });
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") hide(); });
      inp.addEventListener("blur", function () { setTimeout(hide, 250); });
    }

    /* ---- nhập tay một từ (nút + cạnh Look up) ---- */
    function manualUI(lk, wl) {
      var form = null;
      var btn = h("button", { cls: "vmb", title: "Add a word yourself", "aria-label": "Add a word yourself", html: PLUS, onclick: function () { if (form) close(); else open(); } });
      lk.appendChild(btn);
      function close() { if (form) { form.remove(); form = null; } btn.classList.remove("on"); }
      function open() {
        var wi = h("input", { type: "text", placeholder: "Word or phrase", autocomplete: "off", autocapitalize: "off", spellcheck: "false", maxlength: "80", "aria-label": "Word or phrase" });
        var ps = h("select", { "aria-label": "Word class" }); ps.appendChild(h("option", { value: "", text: "Word class" }));
        POS.forEach(function (o) { ps.appendChild(h("option", { value: o, text: o })); });
        var ip = h("input", { type: "text", placeholder: "IPA (optional)", autocomplete: "off", spellcheck: "false", maxlength: "80", "aria-label": "IPA" });
        var me = h("input", { type: "text", placeholder: "Meaning", autocomplete: "off", spellcheck: "false", maxlength: "300", "aria-label": "Meaning" });
        var er = h("div", { cls: "npe" });
        function saveW() {
          var word = wi.value.replace(/\s+/g, " ").trim(); if (!word) { er.textContent = "Type the word first."; wi.focus(); return; }
          var L = wlist(), x = null;
          L.forEach(function (y) { if (y.word.toLowerCase() === word.toLowerCase() && (y.pos || "") === ps.value) x = y; });
          if (x) { if (me.value.trim()) x.meaning = me.value.trim(); if (ip.value.trim()) x.ipa = ip.value.trim(); }
          else { x = { word: word, pos: ps.value, ipa: ip.value.trim(), meaning: me.value.trim() }; L.push(x); }
          x.added = false; save(); drawWords(); close();
          var bx = document.getElementById("npw"); if (bx) bx.scrollTop = bx.scrollHeight;
          rpc("student_vocab_add", { p_student_code: code(), p_word: x.word, p_pos: x.pos || "", p_ipa: x.ipa || null, p_meaning: x.meaning || null, p_file_key: cfg.fileKey })
            .then(function () { x.added = true; S.nb = null; save(); drawWords(); }).catch(function () { });
        }
        [wi, ip, me].forEach(function (i) { i.addEventListener("keydown", function (e) { if (e.key === "Enter") saveW(); }); });
        form = h("div", { id: "npmf" }, wi, h("div", { cls: "r2" }, ps, ip), me, er, h("div", { cls: "r3" }, h("button", { cls: "pill ghost", text: "Cancel", onclick: close }), h("button", { cls: "pill", text: "Add word", onclick: saveW })));
        wl.parentNode.insertBefore(form, wl); btn.classList.add("on"); setTimeout(function () { wi.focus(); }, 30);
      }
    }

    /* ---- thẻ step trượt ngang ---- */
    function stripEl(cards) {
      var wrap = h("div", { cls: "stp" }), tk = h("div", { cls: "stk" }), dots = h("div", { cls: "std" }), cur = 0;
      cards.forEach(function (c, i) {
        var body = h("ul", { cls: "stb" }); (c.c || []).forEach(function (ln) { body.appendChild(h("li", { text: String(ln).replace(/^\d+\.\s*/, "") })); });
        tk.appendChild(h("div", { cls: "stc" }, h("div", { cls: "stn", text: "Step " + (i + 1) + ": " + c.n }), body));
        dots.appendChild(h("span", { cls: "sdot" + (i === 0 ? " on" : "") }));
      });
      function go(d) { var wd = tk.clientWidth; tk.scrollTo({ left: Math.max(0, Math.min(cards.length - 1, cur + d)) * wd, behavior: "smooth" }); }
      var prev = h("button", { cls: "sta", text: "‹", "aria-label": "Previous step", onclick: function () { go(-1); } }), next = h("button", { cls: "sta", text: "›", "aria-label": "Next step", onclick: function () { go(1); } });
      tk.addEventListener("scroll", function () {
        var wd = tk.clientWidth || 1; cur = Math.round(tk.scrollLeft / wd);
        [].forEach.call(dots.children, function (d, i) { d.classList.toggle("on", i === cur); });
        prev.disabled = cur === 0; next.disabled = cur === cards.length - 1;
      });
      prev.disabled = true; if (cards.length < 2) next.disabled = true;
      wrap.appendChild(tk); wrap.appendChild(h("div", { cls: "stf" }, prev, dots, next));
      function fitS() { var m = 0; [].forEach.call(tk.children, function (c) { c.style.height = "auto"; m = Math.max(m, c.offsetHeight); }); if (m) { [].forEach.call(tk.children, function (c) { c.style.height = m + "px"; }); tk.style.height = m + "px"; } }
      setTimeout(fitS, 0); setTimeout(fitS, 200); window.addEventListener("resize", fitS);
      return wrap;
    }

    /* ---- vẽ panel ---- */
    var scanTimer = null;
    function scanNotes() {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(function () {
        var ws = tokensOf(notes()[part()]).filter(function (x) { return !has(S.vc, x); }).slice(0, 12);
        Promise.all(ws.map(function (x) { return lookup0(x, false); })).then(function () { drawCards(); });
        drawCards();
      }, 700);
    }
    function render() {
      p.innerHTML = "";
      var head = h("div", { cls: "nph" });
      [["notes", "Notes"], ["nb", "Notebook"]].forEach(function (v) { head.appendChild(h("button", { cls: "nt" + (S.view === v[0] ? " on" : ""), text: v[1], onclick: function () { S.view = v[0]; render(); } })); });
      head.appendChild(h("span", { cls: "sp" })); head.appendChild(h("button", { cls: "ib bare", text: "×", title: "Close", "aria-label": "Close", onclick: toggle }));
      p.appendChild(head);
      var body = h("div", { cls: "npb" + (S.view === "notes" ? " nn" : "") }); p.appendChild(body);
      if (S.view === "notes") {
        var inp = h("input", { type: "text", placeholder: "Look up a word", autocomplete: "off", spellcheck: "false", "aria-label": "Look up a word" });
        var go = function () {
          var x = inp.value.trim().toLowerCase(); if (!x) return;
          lookup(x, true).then(function () { var m = document.getElementById("npmiss"); if (m) m.dataset.w = x; drawCards(); });
        };
        S.goLookup = go;
        inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
        var lk = h("div", { cls: "lk" }, inp, h("button", { cls: "pill", text: "Look up", onclick: go }));
        var wl = h("div", { id: "npw", cls: "wl" });
        body.appendChild(lk); body.appendChild(wl);
        attachSuggest(lk); manualUI(lk, wl);
        var cards = cfg.steps ? (cfg.steps() || []) : [];
        if (cards.length) body.appendChild(stripEl(cards));
        body.appendChild(h("div", { cls: "npm", text: cfg.noteLabel ? cfg.noteLabel() : (cfg.label ? cfg.label() + " " : "") + "notes" }));
        var ta = h("textarea", { placeholder: cfg.placeholder || "Write your notes here. Type a word and it appears below if it is in the word bank.", spellcheck: "false", autocapitalize: "off", autocomplete: "off" });
        ta.value = notes()[part()] || "";
        ta.addEventListener("input", function () { var pp = part(); notes()[pp] = ta.value; if (cfg.onNotes) cfg.onNotes(pp, ta.value); save(); scanNotes(); });
        body.appendChild(ta);
        body.appendChild(h("div", { id: "npmiss" }));
        drawWords();
      } else {
        var f = h("input", { type: "text", placeholder: "Search my notebook", autocomplete: "off", spellcheck: "false", value: S.nbf });
        body.appendChild(h("div", { cls: "lk" }, f)); var lst = h("div"); body.appendChild(lst);
        var paintNb = function () {
          lst.innerHTML = ""; var q = norm(f.value);
          (S.nb || []).filter(function (e) { return !q || norm(e.word + " " + (e.meaning || "") + " " + (e.bank_meaning || "")).indexOf(q) > -1; }).forEach(function (e) {
            var bm = e.bank_meaning, om = e.status === "typed" && e.meaning && (!bm || norm(e.meaning) !== norm(bm)) ? e.meaning : "";
            var c = h("div", { cls: "vc" }, h("span", { cls: "vw", text: e.word }), h("span", { cls: "vp", text: [e.pos, e.ipa].filter(Boolean).join("  ") }), h("div", { text: bm || e.meaning || "" }));
            if (bm && om) c.appendChild(h("div", { cls: "npm", text: "Nghĩa của bạn: " + om }));
            lst.appendChild(c);
          });
          if (S.nb && !lst.childNodes.length) lst.appendChild(h("div", { cls: "npm", text: S.nb.length ? "No matching words." : "Your notebook is empty." }));
        };
        f.addEventListener("input", function () { S.nbf = f.value; paintNb(); });
        if (S.nb) paintNb(); else {
          lst.appendChild(h("div", { cls: "npm", text: "Loading..." }));
          rpc("student_vocab_list", { p_student_code: code() }).then(function (r) { S.nb = Array.isArray(r) ? r : []; paintNb(); }).catch(function () { lst.innerHTML = ""; lst.appendChild(h("div", { cls: "npm", text: "Could not load your notebook." })); });
        }
      }
    }

    /* ---- thẻ nghĩa nổi ---- */
    var fcard = h("div", { id: "fcard", hidden: "hidden" }); document.body.appendChild(fcard);
    function hideCard() { if (S.fc && S.fc.w) S.dis[S.fc.w] = 1; S.fc = null; var m = document.getElementById("npmiss"); if (m) m.dataset.w = ""; fcard.setAttribute("hidden", "hidden"); }
    function place(rect) {
      fcard.removeAttribute("hidden"); var ch = fcard.offsetHeight, cw = fcard.offsetWidth;
      var top = rect.bottom + 8; if (top + ch > innerHeight - 8) top = Math.max(60, rect.top - ch - 8);
      fcard.style.left = Math.max(8, Math.min(innerWidth - cw - 8, rect.left)) + "px"; fcard.style.top = top + "px";
    }
    function drawCards() {
      var miss = document.getElementById("npmiss"), x = S.fc && S.fc.w, rect = S.fc && S.fc.rect;
      if (!x && miss && miss.dataset.w) { x = miss.dataset.w; var li = p.querySelector(".lk input"); if (li) { var r0 = li.getBoundingClientRect(); rect = { left: r0.left, top: r0.top, bottom: r0.bottom }; } }
      if (!x) {
        var ta = isOpen() && p.querySelector("textarea"), hit = null;
        if (ta) tokensOf(notes()[part()]).forEach(function (t) { var r = S.vc[t]; if (r && r.length && !S.dis[t] && !r.every(function (e) { return e.in_notebook; })) hit = t; });
        if (hit) { var r1 = ta.getBoundingClientRect(); x = hit; rect = { left: r1.left, top: r1.top + 4, bottom: r1.top + 4 }; S.fc = { w: x, rect: rect }; }
      }
      if (!x || !rect) { fcard.setAttribute("hidden", "hidden"); return; }
      var res = S.vc[x] || []; fcard.innerHTML = "";
      if (res.length) {
        res.forEach(function (e) {
          var c = h("div", { cls: "vc" }, h("button", { cls: "ib bare", title: "Listen", "aria-label": "Listen", html: SPK, onclick: function () { speak(e.word); } }), h("span", { cls: "vw", text: e.word }), h("span", { cls: "vp", text: [e.pos, e.ipa].filter(Boolean).join("  ") }));
          /* nghĩa đề xuất (giáo viên) trước; nghĩa học viên tự ghi, nếu khác, ở dưới */
          var bm = e.bank_meaning, om = e.own_meaning && (!bm || norm(e.own_meaning) !== norm(bm)) ? e.own_meaning : "";
          var mv = h("div", null, h("span", { text: bm || om || e.meaning || "No meaning saved yet" }));
          if (bm) mv.appendChild(h("span", { cls: "vsg", text: "Nghĩa đề xuất" }));
          c.appendChild(mv);
          if (bm && om) c.appendChild(h("div", { cls: "npm", text: "Nghĩa của bạn: " + om }));
          if (e.definition) c.appendChild(h("div", { cls: "npm", text: e.definition }));
          var b = h("button", { cls: "vb", text: e.in_notebook ? "In notebook" : "Add to notebook" });
          if (e.in_notebook) b.disabled = true; else b.addEventListener("click", function () { addWord(e, b); setTimeout(hideCard, 1000); });
          c.appendChild(b); fcard.appendChild(c);
        });
      } else {
        fcard.appendChild(h("div", { cls: "vw", text: x })); fcard.appendChild(h("div", { cls: "npm", text: "Not in the word bank yet. Choose its part of speech and write the meaning in My words, then press + to add it to your notebook." }));
        if (S.fc && S.fc.quick) quickAdd(x);
        if (!isOpen()) fcard.appendChild(h("button", { cls: "vb", text: "Open Student's notes", onclick: function () { hideCard(); lookupInNotes(x); } }));
      }
      place(rect);
    }
    /* thẻ nghĩa trên desktop: từ chưa có trong kho thì ghi nghĩa và thêm vào sổ ngay trong thẻ */
    function quickAdd(x) {
      fcard.lastChild.textContent = "Not in the word bank yet. Write the meaning and add it to your notebook.";
      var ps = h("select", { "aria-label": "Word class" }); ps.appendChild(h("option", { value: "", text: "Word class" }));
      POS.forEach(function (o) { ps.appendChild(h("option", { value: o, text: o })); });
      var me = h("input", { type: "text", placeholder: "Meaning", autocomplete: "off", spellcheck: "false", maxlength: "300", "aria-label": "Meaning" });
      var er = h("div", { cls: "npe" }), ab = h("button", { cls: "vb", text: "Add to notebook" });
      function saveQ() {
        var m = me.value.replace(/\s+/g, " ").trim(); if (!m) { er.textContent = "Write the meaning first."; me.focus(); return; }
        ab.disabled = true; ab.textContent = "Adding..."; er.textContent = "";
        var L = wlist(), a = null;
        L.forEach(function (y) { if (!a && y.word.toLowerCase() === x && ((y.pos || "") === ps.value || (!y.pos && !y.meaning))) a = y; });
        if (!a) { a = { word: x, pos: "", ipa: "", meaning: "" }; L.push(a); }
        a.pos = ps.value; a.meaning = m; a.added = false; save(); drawWords();
        rpc("student_vocab_add", { p_student_code: code(), p_word: x, p_pos: ps.value, p_ipa: null, p_meaning: m, p_file_key: cfg.fileKey })
          .then(function () { a.added = true; S.nb = null; S.vc[x] = [{ word: x, pos: ps.value, meaning: m, own_meaning: m, bank_meaning: null, in_notebook: true }]; save(); drawWords(); if (S.fc && S.fc.w === x) drawCards(); })
          .catch(function () { ab.disabled = false; ab.textContent = "Try again"; er.textContent = "Could not add the word. Please try again."; });
      }
      ab.addEventListener("click", saveQ);
      me.addEventListener("keydown", function (e) { if (e.key === "Enter") saveQ(); });
      fcard.appendChild(ps); fcard.appendChild(me); fcard.appendChild(er); fcard.appendChild(ab);
      setTimeout(function () { me.focus(); }, 30);
    }
    function lookupInNotes(x) {
      S.view = "notes"; if (!isOpen()) toggle(); else if (!p.querySelector(".npb.nn")) render();
      delete S.dis[x];
      var li = p.querySelector(".lk input"); if (li) li.value = x;
      if (S.goLookup) S.goLookup(); else lookup(x, true).then(function () { drawCards(); });
    }

    /* ---- bôi đen chữ: Look up (và Highlight/Clear nếu trang có) ---- */
    var bl = h("button", { text: "Look up" }), bh = h("button", { text: "Highlight" }), bc = h("button", { text: "Clear" });
    var selb = h("div", { id: "selb", hidden: "hidden" }, bl); if (cfg.hl) { selb.appendChild(bh); selb.appendChild(bc); }
    document.body.appendChild(selb);
    var selWord = "", selRect = null, selHl = null;
    function hideSel() { selb.setAttribute("hidden", "hidden"); selWord = ""; selHl = null; }
    function inRoots(n) { var R = cfg.selRoots ? cfg.selRoots() : []; return R.some(function (r) { return r && r.contains(n); }); }
    function checkSel() {
      var t = "", rect = null, a = document.activeElement, inf = null;
      if (a && a.tagName === "TEXTAREA" && p.contains(a) && a.selectionEnd > a.selectionStart) {
        t = a.value.slice(a.selectionStart, a.selectionEnd); var r = a.getBoundingClientRect(); rect = { left: r.left, top: r.top + 4, bottom: r.top + 4 };
      } else {
        var s = window.getSelection(); if (s && s.rangeCount && !s.isCollapsed && inRoots(s.anchorNode)) { t = s.toString(); rect = s.getRangeAt(0).getBoundingClientRect(); inf = cfg.hl ? cfg.hl.info() : null; }
      }
      t = String(t).replace(/\s+/g, " ").trim();
      var word = /^[A-Za-z][A-Za-z' -]{1,38}$/.test(t) && t.split(" ").length <= 3;
      if (!rect || (!word && !inf)) return;
      selWord = word ? t.toLowerCase() : ""; selRect = rect; selHl = inf;
      bl.style.display = word ? "" : "none"; bh.style.display = inf ? "" : "none"; bc.style.display = inf && cfg.hl.overlaps(inf) ? "" : "none";
      selb.removeAttribute("hidden");
      selb.style.left = Math.max(8, Math.min(innerWidth - 270, rect.left)) + "px"; selb.style.top = Math.max(60, rect.top - 44) + "px";
    }
    ["mouseup", "touchend"].forEach(function (ev) { document.addEventListener(ev, function () { setTimeout(checkSel, 20); }); });
    document.addEventListener("mousedown", function (e) {
      if (!selb.contains(e.target)) hideSel();
      if (!fcard.contains(e.target) && !fcard.hasAttribute("hidden")) hideCard();
    });
    selb.addEventListener("mousedown", function (e) { e.preventDefault(); });
    bl.addEventListener("click", function () {
      var x = selWord; hideSel(); if (!x) return;
      /* desktop: hiện nghĩa ngay tại từ, không mở Student's notes */
      if (window.matchMedia && matchMedia("(min-width: 1024px)").matches && selRect) {
        var rc = { left: selRect.left, top: selRect.top, bottom: selRect.bottom };
        delete S.dis[x]; S.fc = { w: x, rect: rc, quick: true };
        fcard.innerHTML = ""; fcard.appendChild(h("div", { cls: "vw", text: x })); fcard.appendChild(h("div", { cls: "npm", text: "Looking up..." })); place(rc);
        lookup(x, true).then(function () { if (S.fc && S.fc.w === x) drawCards(); });
        return;
      }
      lookupInNotes(x);
    });
    bh.addEventListener("click", function () { var i = selHl; hideSel(); if (i) cfg.hl.set(i, true); });
    bc.addEventListener("click", function () { var i = selHl; hideSel(); if (i) cfg.hl.set(i, false); });

    return { el: p, tab: tab, toggle: toggle, render: function () { if (isOpen()) render(); }, fit: fit, isOpen: isOpen, hideSel: hideSel };
  }

  w.GBNotes = { mount: mount };
})(window);

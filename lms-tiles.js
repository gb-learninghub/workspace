/* Bấm ô tổng quan -> hiện danh sách, thao tác nhanh ngay trong danh sách.
   LMSTile.show(tiêu đề, rows, opt)
   row: { name, sub, val, href, acts: [{ icon | text, title, state, fn(row), close }] }
   opt: { unit, total, reload: () => ({ title, rows, opt }) }  (reload = vẽ lại sau khi thao tác) */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let box, cur = null;
  function build() {
    const st = document.createElement('style');
    st.textContent = `
#lms-tile-dlg{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(22,24,29,.35);animation:lmtFade .18s ease both}
#lms-tile-dlg[hidden]{display:none}
#lms-tile-dlg.out{animation:lmtFadeOut .16s ease both}
#lms-tile-dlg .lmt-card{width:min(560px,100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;background:#fff;border:1px solid #E4E6EA;border-radius:24px;padding:22px;animation:lmtPop .22s cubic-bezier(.2,.8,.2,1) both}
#lms-tile-dlg.out .lmt-card{animation:lmtPopOut .16s ease both}
#lms-tile-dlg h2{font-size:1rem;font-weight:800;color:#1B1D22;margin:0 0 10px}
#lms-tile-dlg .lmt-list{overflow:auto;flex:1;min-height:0;--c2:96px;--c3:112px;--c4:0px}
#lms-tile-dlg .lmt-row{display:grid;grid-template-columns:var(--cols,minmax(0,1fr) var(--c2) var(--c3) var(--c4));gap:10px;align-items:center;min-height:48px;padding:6px 4px;border:0;border-top:1px solid #eceef2;border-radius:0;box-shadow:none;background:transparent;font-size:.875rem;color:#1B1D22;text-decoration:none}
#lms-tile-dlg .lmt-list>.lmt-row:first-child{border-top:0}
#lms-tile-dlg .lmt-row.lmt-in{animation:lmtRow .28s ease both;animation-delay:calc(var(--i,0)*28ms)}
#lms-tile-dlg .lmt-row>*{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#lms-tile-dlg a.lmt-row{transition:background-color .15s ease}#lms-tile-dlg a.lmt-row:hover,#lms-tile-dlg .lmt-row:hover{background:#f7f8fa}
#lms-tile-dlg .lmt-name{font-weight:700;color:#1B1D22;text-decoration:none}#lms-tile-dlg a.lmt-name:hover{text-decoration:underline}
#lms-tile-dlg .lmt-sub{color:#778597;font-size:.8125rem}
#lms-tile-dlg .lmt-val{font-variant-numeric:tabular-nums;font-weight:700;text-align:right}
#lms-tile-dlg .lmt-acts-cell{display:flex;justify-content:flex-end;gap:6px;overflow:visible}
#lms-tile-dlg .lmt-act{width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;border:1px solid #E4E6EA;border-radius:10px;background:#fff;color:#1B1D22;font-weight:800;cursor:pointer;transition:transform .12s ease,background-color .15s ease,border-color .15s ease}
#lms-tile-dlg .lmt-act:hover{background:#F4F5F7}#lms-tile-dlg .lmt-act:active{transform:scale(.88)}#lms-tile-dlg .lmt-act:disabled{opacity:.5;cursor:default}
#lms-tile-dlg .lmt-act svg{width:16px;height:16px}
#lms-tile-dlg .lmt-sel{height:36px;padding:0 28px 0 10px;border:1px solid #E4E6EA;border-radius:10px;background:#fff;color:#1B1D22;font:inherit;font-size:.875rem;font-weight:700;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23778597' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 9px center}#lms-tile-dlg .lmt-sel:hover{background-color:#F4F5F7}#lms-tile-dlg .lmt-sel:disabled{opacity:.5}
#lms-tile-dlg .lmt-act[data-st=done]{background:#e7f6ec;border-color:#9bd3ad;color:#1d7a3e}#lms-tile-dlg .lmt-act[data-st=skip]{background:#f4f5f7;color:#6b7686}
#lms-tile-dlg .lmt-act.lmt-busy{animation:lmtPulse .7s ease infinite}
#lms-tile-dlg .lmt-total{font-weight:800;border-top:1px solid #d5d9e0!important}
#lms-tile-dlg .lmt-empty{padding:18px 4px;text-align:center;color:#8692a1;font-size:.875rem}
#lms-tile-dlg .lmt-foot{margin-top:16px;display:flex;gap:8px}#lms-tile-dlg .lmt-backb{min-height:44px;padding:0 18px;border:0;border-radius:12px;background:#F4F5F7;color:#1B1D22;font-weight:700;cursor:pointer}#lms-tile-dlg .lmt-backb[hidden]{display:none}#lms-tile-dlg .lmt-row[data-go]{cursor:pointer}
#lms-tile-dlg .lmt-act[data-st=present]{background:#e7f6ec;border-color:#9bd3ad;color:#1d7a3e}#lms-tile-dlg .lmt-act[data-st=late]{background:#fdf3dc;border-color:#e6c46f;color:#8a6410}#lms-tile-dlg .lmt-act[data-st=absent]{background:#fde8e6;border-color:#eba39d;color:#b42318}
#lms-tile-dlg .lmt-close{min-height:44px;padding:0 18px;border:0;border-radius:12px;background:#F4F5F7;color:#1B1D22;font-weight:700;cursor:pointer;transition:transform .12s ease}#lms-tile-dlg .lmt-close:active{transform:scale(.96)}
[data-tile-list]{cursor:pointer;transition:transform .15s ease,background-color .15s ease}[data-tile-list]:hover{transform:translateY(-1px)}[data-tile-list]:active{transform:scale(.97)}
@media(max-width:520px){#lms-tile-dlg .lmt-list{--c2:64px;--c3:84px}#lms-tile-dlg .lmt-card{padding:16px;border-radius:20px}#lms-tile-dlg .lmt-row:has(.lmt-acts-cell){grid-template-columns:minmax(0,1fr) auto var(--c4);grid-template-rows:auto auto;row-gap:0}#lms-tile-dlg .lmt-row:has(.lmt-acts-cell)>:nth-child(1){grid-column:1/3;grid-row:1}#lms-tile-dlg .lmt-row:has(.lmt-acts-cell)>:nth-child(2){grid-column:1;grid-row:2}#lms-tile-dlg .lmt-row:has(.lmt-acts-cell)>:nth-child(3){grid-column:2;grid-row:2}#lms-tile-dlg .lmt-row:has(.lmt-acts-cell)>.lmt-acts-cell{grid-column:3;grid-row:1/3}}
@keyframes lmtFade{from{opacity:0}to{opacity:1}}@keyframes lmtFadeOut{to{opacity:0}}
@keyframes lmtPop{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}@keyframes lmtPopOut{to{opacity:0;transform:translateY(8px) scale(.97)}}
@keyframes lmtRow{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes lmtPulse{50%{opacity:.45}}
@media(prefers-reduced-motion:reduce){#lms-tile-dlg,#lms-tile-dlg *{animation:none!important;transition:none!important}}`;
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'lms-tile-dlg'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<div class="lmt-card"><h2 id="lmt-title"></h2><div class="lmt-list" id="lmt-list"></div><div class="lmt-foot"><button type="button" class="lmt-backb" hidden>Quay lại</button><button type="button" class="lmt-close">Đóng</button></div></div>';
    document.body.appendChild(box);
    box.addEventListener('change', async e => { const s = e.target.closest('.lmt-sel'); if (!s || !cur) return; const r = cur.rows[+s.dataset.r], a = r && (r.acts || [])[+s.dataset.a]; if (!a) return; s.disabled = true; try { await a.fn(r, s.value); } catch (er) { console.error(er); } const re = cur.opt && cur.opt.reload; if (re) { const n = re(); if (n) return paint(n.title, n.rows, Object.assign({ reload: re }, n.opt), false); } s.disabled = false; });
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('.lmt-close')) hide(); if (e.target.closest('.lmt-backb')) { if (cur && cur.opt && cur.opt.back) cur.opt.back(); return; } const b = e.target.closest('.lmt-act'); if (b) { run(b); return; } const rw = e.target.closest('.lmt-row[data-go]'); if (rw && !e.target.closest('a,.lmt-sel') && cur) { const rr = cur.rows[+rw.dataset.i]; if (rr && rr.go) rr.go(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) hide(); });
  }
  function hide() { if (!box || box.hidden) return; box.classList.add('out'); setTimeout(() => { box.hidden = true; box.classList.remove('out'); }, 150); }
  function paint(title, rows, opt, animate) {
    cur = { title, rows, opt };
    const bb = box.querySelector('.lmt-backb'); if (bb) bb.hidden = !opt.back;
    document.getElementById('lmt-title').textContent = title;
    const list = document.getElementById('lmt-list'), widthOf = r => (r.acts || []).reduce((n, a, i) => n + (a.options ? (a.w || 96) : 44) + (i ? 6 : 0), 0), maxW = rows.reduce((n, r) => Math.max(n, widthOf(r)), 0), maxActs = maxW ? 1 : 0;
    if (opt.cols) list.style.setProperty('--cols', opt.cols); else list.style.removeProperty('--cols');
    list.style.setProperty('--c4', maxW + 'px');
    const scroll = list.scrollTop;
    const row = (r, i) => {
      const nm = r.href ? `<a class="lmt-name" href="${esc(r.href)}">${esc(r.name)}</a>` : `<b class="lmt-name">${esc(r.name)}</b>`;
      const acts = maxActs ? `<span class="lmt-acts-cell">${(r.acts || []).map((a, k) => a.options ? `<select class="lmt-sel" data-r="${i}" data-a="${k}" title="${esc(a.title || '')}" aria-label="${esc(a.title || '')}" style="width:${a.w || 96}px">${a.options.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(a.value) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>` : `<button type="button" class="lmt-act" data-r="${i}" data-a="${k}"${a.state != null ? ` data-st="${esc(a.state)}"` : ''} title="${esc(a.title || '')}" aria-label="${esc(a.title || '')}">${a.icon ? `<i data-lucide="${esc(a.icon)}"></i>` : esc(a.text || '')}</button>`).join('')}</span>` : '';
      return `<div class="lmt-row${animate ? ' lmt-in' : ''}" style="--i:${Math.min(i, 14)}" data-i="${i}"${r.go ? ' data-go' : ''}>${nm}<small class="lmt-sub">${esc(r.sub || '')}</small><span class="lmt-val">${esc(r.val || '')}</span>${acts}</div>`;
    };
    let h = rows.length ? rows.map(row).join('') : '<div class="lmt-empty">Chưa có mục nào.</div>';
    if (rows.length && opt.total != null) h += `<div class="lmt-row lmt-total"><b>Tổng · ${rows.length} ${esc(opt.unit || 'mục')}</b><small></small><span class="lmt-val">${esc(opt.total)}</span>${maxActs ? '<span></span>' : ''}</div>`;
    list.innerHTML = h; list.scrollTop = scroll;
    if (window.lucide) lucide.createIcons();
  }
  async function run(b) {
    if (!cur || b.disabled) return;
    const r = cur.rows[+b.dataset.r], a = r && (r.acts || [])[+b.dataset.a]; if (!a) return;
    if (a.close) { hide(); try { await a.fn(r); } catch (e) { console.error(e); } return; }
    b.disabled = true; b.classList.add('lmt-busy');
    try { await a.fn(r); } catch (e) { console.error(e); }
    const re = cur.opt && cur.opt.reload;
    if (re) { const n = re(); if (n) return paint(n.title, n.rows, Object.assign({ reload: re }, n.opt), false); }
    b.disabled = false; b.classList.remove('lmt-busy');
  }
  window.LMSTile = {
    show(title, rows, opt) {
      if (!box) build();
      opt = opt || {};
      if (box.hidden) { box.classList.remove('out'); box.hidden = false; box.style.animation = 'none'; void box.offsetWidth; box.style.animation = ''; }
      paint(title, rows, opt, true);
    },
    bind(map) {
      Object.keys(map).forEach(id => {
        const n = document.getElementById(id), t = n && (n.closest('.stat-tile') || n.parentElement); if (!t) return;
        t.setAttribute('data-tile-list', id); t.setAttribute('role', 'button'); t.tabIndex = 0;
        const go = e => { if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); const r = map[id](); if (r) window.LMSTile.show(r.title, r.rows, Object.assign({ reload: map[id] }, r.opt)); };
        t.addEventListener('click', go); t.addEventListener('keydown', go);
      });
    }
  };
})();

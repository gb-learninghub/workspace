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
#lms-tile-dlg{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(22,24,29,.35);animation:tlFade .18s ease both}
#lms-tile-dlg[hidden]{display:none}
#lms-tile-dlg.out{animation:tlFadeOut .16s ease both}
#lms-tile-dlg .tl-card{width:min(560px,100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;background:#fff;border:1px solid #E4E6EA;border-radius:24px;padding:22px;animation:tlPop .22s cubic-bezier(.2,.8,.2,1) both}
#lms-tile-dlg.out .tl-card{animation:tlPopOut .16s ease both}
#lms-tile-dlg h2{font-size:1.0625rem;font-weight:800;color:#1B1D22;margin:0 0 10px}
#lms-tile-dlg .tl-list{overflow:auto;flex:1;min-height:0;--c2:96px;--c3:112px;--c4:0px}
#lms-tile-dlg .tl-row{display:grid;grid-template-columns:minmax(0,1fr) var(--c2) var(--c3) var(--c4);gap:10px;align-items:center;min-height:48px;padding:6px 4px;border-top:1px solid #f0f2f5;font-size:.9rem;color:#1B1D22;text-decoration:none}
#lms-tile-dlg .tl-row.tl-in{animation:tlRow .28s ease both;animation-delay:calc(var(--i,0)*28ms)}
#lms-tile-dlg .tl-row:first-child{border-top:0}
#lms-tile-dlg .tl-row>*{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#lms-tile-dlg a.tl-row{transition:background-color .15s ease}#lms-tile-dlg a.tl-row:hover,#lms-tile-dlg .tl-row:hover{background:#f7f8fa;border-radius:8px}
#lms-tile-dlg .tl-name{font-weight:700;color:#1B1D22;text-decoration:none}#lms-tile-dlg a.tl-name:hover{text-decoration:underline}
#lms-tile-dlg .tl-sub{color:#778597;font-size:.82rem}
#lms-tile-dlg .tl-val{font-variant-numeric:tabular-nums;font-weight:700;text-align:right}
#lms-tile-dlg .tl-acts-cell{display:flex;justify-content:flex-end;gap:6px;overflow:visible}
#lms-tile-dlg .tl-act{width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;border:1px solid #E4E6EA;border-radius:10px;background:#fff;color:#1B1D22;font-weight:800;cursor:pointer;transition:transform .12s ease,background-color .15s ease,border-color .15s ease}
#lms-tile-dlg .tl-act:hover{background:#F4F5F7}#lms-tile-dlg .tl-act:active{transform:scale(.88)}#lms-tile-dlg .tl-act:disabled{opacity:.5;cursor:default}
#lms-tile-dlg .tl-act svg{width:16px;height:16px}
#lms-tile-dlg .tl-act[data-st=done]{background:#e7f6ec;border-color:#9bd3ad;color:#1d7a3e}#lms-tile-dlg .tl-act[data-st=skip]{background:#f4f5f7;color:#6b7686}
#lms-tile-dlg .tl-act.tl-busy{animation:tlPulse .7s ease infinite}
#lms-tile-dlg .tl-total{font-weight:800;border-top:2px solid #E4E6EA!important}
#lms-tile-dlg .tl-empty{padding:18px 4px;text-align:center;color:#8692a1;font-size:.9rem}
#lms-tile-dlg .tl-foot{margin-top:16px}
#lms-tile-dlg .tl-close{min-height:44px;padding:0 18px;border:0;border-radius:12px;background:#F4F5F7;color:#1B1D22;font-weight:700;cursor:pointer;transition:transform .12s ease}#lms-tile-dlg .tl-close:active{transform:scale(.96)}
[data-tile-list]{cursor:pointer;transition:transform .15s ease,background-color .15s ease}[data-tile-list]:hover{transform:translateY(-1px)}[data-tile-list]:active{transform:scale(.97)}
@media(max-width:520px){#lms-tile-dlg .tl-list{--c2:64px;--c3:84px}#lms-tile-dlg .tl-card{padding:16px;border-radius:20px}}
@keyframes tlFade{from{opacity:0}to{opacity:1}}@keyframes tlFadeOut{to{opacity:0}}
@keyframes tlPop{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}@keyframes tlPopOut{to{opacity:0;transform:translateY(8px) scale(.97)}}
@keyframes tlRow{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes tlPulse{50%{opacity:.45}}
@media(prefers-reduced-motion:reduce){#lms-tile-dlg,#lms-tile-dlg *{animation:none!important;transition:none!important}}`;
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'lms-tile-dlg'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<div class="tl-card"><h2 id="tl-title"></h2><div class="tl-list" id="tl-list"></div><div class="tl-foot"><button type="button" class="tl-close">Đóng</button></div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('.tl-close')) hide(); const b = e.target.closest('.tl-act'); if (b) run(b); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) hide(); });
  }
  function hide() { if (!box || box.hidden) return; box.classList.add('out'); setTimeout(() => { box.hidden = true; box.classList.remove('out'); }, 150); }
  function paint(title, rows, opt, animate) {
    cur = { title, rows, opt };
    document.getElementById('tl-title').textContent = title;
    const list = document.getElementById('tl-list'), maxActs = rows.reduce((n, r) => Math.max(n, (r.acts || []).length), 0);
    list.style.setProperty('--c4', maxActs ? (maxActs * 36 + (maxActs - 1) * 6) + 'px' : '0px');
    const scroll = list.scrollTop;
    const row = (r, i) => {
      const nm = r.href ? `<a class="tl-name" href="${esc(r.href)}">${esc(r.name)}</a>` : `<b class="tl-name">${esc(r.name)}</b>`;
      const acts = maxActs ? `<span class="tl-acts-cell">${(r.acts || []).map((a, k) => `<button type="button" class="tl-act" data-r="${i}" data-a="${k}"${a.state != null ? ` data-st="${esc(a.state)}"` : ''} title="${esc(a.title || '')}" aria-label="${esc(a.title || '')}">${a.icon ? `<i data-lucide="${esc(a.icon)}"></i>` : esc(a.text || '')}</button>`).join('')}</span>` : '';
      return `<div class="tl-row${animate ? ' tl-in' : ''}" style="--i:${Math.min(i, 14)}">${nm}<small class="tl-sub">${esc(r.sub || '')}</small><span class="tl-val">${esc(r.val || '')}</span>${acts}</div>`;
    };
    let h = rows.length ? rows.map(row).join('') : '<div class="tl-empty">Chưa có mục nào.</div>';
    if (rows.length && opt.total != null) h += `<div class="tl-row tl-total"><b>Tổng · ${rows.length} ${esc(opt.unit || 'mục')}</b><small></small><span class="tl-val">${esc(opt.total)}</span>${maxActs ? '<span></span>' : ''}</div>`;
    list.innerHTML = h; list.scrollTop = scroll;
    if (window.lucide) lucide.createIcons();
  }
  async function run(b) {
    if (!cur || b.disabled) return;
    const r = cur.rows[+b.dataset.r], a = r && (r.acts || [])[+b.dataset.a]; if (!a) return;
    if (a.close) { hide(); try { await a.fn(r); } catch (e) { console.error(e); } return; }
    b.disabled = true; b.classList.add('tl-busy');
    try { await a.fn(r); } catch (e) { console.error(e); }
    const re = cur.opt && cur.opt.reload;
    if (re) { const n = re(); if (n) return paint(n.title, n.rows, Object.assign({ reload: re }, n.opt), false); }
    b.disabled = false; b.classList.remove('tl-busy');
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

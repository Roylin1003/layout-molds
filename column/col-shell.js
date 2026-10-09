/* col-shell.js — runtime for the column mold (pairs with col-shell.css). It does four things and nothing else:
     ① wide / narrow decision and column width (--colw, --colmax);
     ② moving nodes: on desktop, chosen nodes move to the left / right column; on phones they move back home
        (one DOM, no second layout);
     ③ debounced resize callback (the page decides whether to re-lay out the current question);
     ④ audit(): measures the real layout — nothing overflows the column, touch targets ≥ 44px,
        pressable text ≥ 20px, #play sits exactly at the gutter, keypad keys ≥ keyH.
   Usage:
     const col = initCol({
       config: { colMax, wideMin, wideFrac, ratio, vf, gutter, keyH, keyCols, gap },
       move: [ { id:'nav', wide:'left', home:'col', before:'board' },   // narrow: back to home (before optional = append)
               { id:'stats', wide:'right', home:'status' } ],
       onLayout: wide => {},     // after every decision, including the first
       onResize: () => {},       // after a 150 ms debounce
     });
     col.wide()  col.width()  col.U()  col.audit()  col.relayout()  col.config */
'use strict';
function initCol(opt){
  const $ = id => document.getElementById(id);
  const C = Object.assign({ colMax: 560, wideMin: 900, wideFrac: 0.42, ratio: 0.5625, vf: 0.36, gutter: 10, keyH: 64, keyCols: 4, gap: 8 }, opt.config || {});
  const isWide = () => innerWidth >= C.wideMin;
  function layout(){
    { const r = document.documentElement.style;   // mold parameters → CSS variables (rewritten every layout, so changing col.config + relayout() takes effect)
      r.setProperty('--vf', C.vf); r.setProperty('--gutter', C.gutter + 'px'); r.setProperty('--keyh', C.keyH + 'px'); r.setProperty('--keycols', C.keyCols); r.setProperty('--gap', C.gap + 'px'); }
    const wide = isWide();
    document.body.classList.toggle('wide', wide);
    if (wide) document.documentElement.style.setProperty('--colw', Math.min(innerWidth * C.wideFrac, (innerHeight - 28) * C.ratio) + 'px');
    document.documentElement.style.setProperty('--colmax', C.colMax + 'px');
    for (const m of opt.move || []) {
      const el = $(m.id); if (!el) continue;
      if (wide) $(m.wide).append(el);
      else { const home = $(m.home); const before = m.before && $(m.before); if (before && before.parentElement === home) home.insertBefore(el, before); else home.append(el); }
    }
    opt.onLayout && opt.onLayout(wide);
  }
  let timer = 0;
  addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(() => { layout(); opt.onResize && opt.onResize(); }, 150); });
  layout();
  /* Audit table (call col.audit() in the console): measures the real boxes */
  function audit(){
    const col = $('col').getBoundingClientRect(), rows = [];
    const vis = e => e.offsetParent && e.getBoundingClientRect().width;
    /* Not counted as overflow: things inside a scroll box, and position:fixed subtrees that deliberately leave the column */
    const clipped = e => { for (let p = e; p && p.id !== 'col'; p = p.parentElement) { const cs = getComputedStyle(p); if (cs.position === 'fixed' || (p !== e && cs.overflowX !== 'visible')) return true; } return false; };
    rows.push(['nothing overflows the column', [...document.querySelectorAll('#col *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && !clipped(e) && (b.right > col.right + 1 || b.left < col.left - 1); }).length]);
    rows.push(['touch targets ≥ 44px', [...document.querySelectorAll('#col button:not([hidden]), #col select')].filter(e => vis(e) && e.getBoundingClientRect().height < 44).length]);
    rows.push(['pressable text ≥ 20px', [...document.querySelectorAll('#col button, #col select')].filter(e => vis(e) && parseFloat(getComputedStyle(e).fontSize) < 20).length]);
    { const play = $('play'); if (play && vis(play)) { const b = play.getBoundingClientRect();
        rows.push(['#play at the gutter', (Math.abs(b.left - col.left - C.gutter) > 2) + (Math.abs(col.right - b.right - C.gutter) > 2)]); } }
    rows.push(['keypad keys ≥ keyH', [...document.querySelectorAll('#col .keypad button')].filter(e => vis(e) && e.getBoundingClientRect().height < C.keyH - 0.5).length]);
    console.table(rows.map(([k, v]) => ({ check: k, violations: v, pass: v === 0 ? '✓' : '✗' })));
    return rows.every(([, v]) => v === 0);
  }
  return { wide: isWide, width: () => $('col').clientWidth, U: () => $('col').clientWidth / 375, audit, relayout: layout, config: C };
}

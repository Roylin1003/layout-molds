/* arcade-shell.js — runtime for the arcade mold (pairs with arcade-shell.css).
   For pages built around one continuously running board: a fixed design canvas, scaled to fit the window.
   Distilled from seven rounds of real-device tuning on a falling-block arcade game.

   It does four things and nothing else:
     ① fit(): constants in, transform out. The page computes the stage size from constants (size());
        the shell handles scaling, centering, safe-area and visualViewport (keyboard open/close).
     ② Capability detection: TOUCH (pointer:coarse + hover:none) and wide (a media query the page gives);
        wide is mirrored as body.narrow so CSS and JS share one condition.
     ③ kick(): after iOS closes the keyboard, visualViewport can get stuck without firing events; this nudges it.
     ④ audit(): centering residue and overflow; the page can append its own rows().

   Four rules (break any one and the "result screen shrinks" class of bug comes back):
     1. size() may only read constants — never measure the DOM. Measurements drift with state; constants don't.
     2. Every state (play / result / settings) lives inside the stage and shares one transform.
     3. In an over-constrained layout, pick ONE flexible part (flex:1) to absorb the residue; everything else is rigid.
     4. After any change, run audit(); done means every residue is 0.

   Usage:
     <link rel="stylesheet" href="arcade-shell.css">
     <script src="arcade-shell.js"></script>
     const arc = initArcade({
       stage: '#stage',
       wideQuery: '(min-width:1400px) and (min-aspect-ratio:3/2)',
       size: wide => wide ? {w:2560,h:1440} : {w:CAB.w+SIDE, h:CAB.h+TOUCH_H},  // constants only
       marginX: 12,        // narrow screens: horizontal breathing room (vertical fills)
       bottomPad: 10,      // narrow screens: extra bottom space (safe-area handled separately)
       onFit: (wide, scale) => {},
       rows: () => [['side column snaps to board', residuePx], …],
     });
     arc.fit()  arc.audit()  arc.kick()  arc.wide()  arc.scale()  arc.touch  arc.config

   Note: a transformed ancestor becomes the containing block for position:fixed descendants — anything that must
   stay pinned to the screen has to live outside the stage.
   Self-test of the math: node arcade-shell.js */
'use strict';
function initArcade(opt) {
  const C = Object.assign({
    stage: '#stage',
    wideQuery: '(min-width:1400px) and (min-aspect-ratio:3/2)',
    marginX: 12, bottomPad: 10,
    size: () => ({ w: 420, h: 900 }),
    onFit: null, rows: null,
    /* listen:false = the shell attaches no resize / visualViewport listeners and does not run fit() itself.
       For pages that already have their own resize handling — listening twice fires twice. */
    listen: true,
  }, opt || {});

  const stageEl = typeof C.stage === 'string' ? document.querySelector(C.stage) : C.stage;
  if (!stageEl) { console.warn('[arcade-shell] stage not found: ' + C.stage); return null; }

  /* Ask about capability, not identity (a touch tablet in portrait is TOUCH but not wide — two separate facts) */
  const TOUCH = matchMedia('(pointer:coarse) and (hover:none)').matches;
  const isWide = () => matchMedia(C.wideQuery).matches;

  /* safe-area: one probe, then it's a constant */
  let _safeB = null;
  function safeBottom() {
    if (_safeB !== null) return _safeB;
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;visibility:hidden;height:env(safe-area-inset-bottom)';
    document.body.appendChild(p); _safeB = p.offsetHeight || 0; p.remove();
    return _safeB;
  }

  let lastScale = 1;
  function fit() {
    const wide = isWide();
    document.body.classList.toggle('narrow', !wide);
    const { w, h } = C.size(wide);
    stageEl.style.width = w + 'px';
    stageEl.style.height = h + 'px';
    /* visualViewport is an input, not feedback: the keyboard only changes the visible height,
       so the whole stage shrinks and stays fully visible. */
    const vv = window.visualViewport;
    const visTop = vv ? vv.offsetTop : 0;
    const visH = vv ? vv.height : innerHeight;
    const geo = geometry({ wide, w, h, visH, innerW: innerWidth, safe: safeBottom(),
                           marginX: C.marginX, bottomPad: C.bottomPad });
    lastScale = geo.scale;
    stageEl.style.top = (visTop + geo.centerY) + 'px';
    stageEl.style.transformOrigin = '50% 50%';
    stageEl.style.transform = `translate(-50%, -50%) scale(${geo.scale})`;
    if (C.onFit) C.onFit(wide, geo.scale);
  }

  /* After iOS closes the keyboard, visualViewport may stay stuck without events: nudge it.
     Call on text-input confirm/blur — blur the input first, then kick, or the keyboard pops back. */
  function kick() {
    scrollTo(0, 0); fit();
    setTimeout(() => { scrollTo(0, 0); fit(); }, 250);
    setTimeout(fit, 700);
  }

  function audit() {
    const r = e => e.getBoundingClientRect();
    const st = r(stageEl);
    const rows = [
      ['centered horizontally', Math.round((st.left + st.right) / 2 - innerWidth / 2)],
      ['centered vertically', Math.round((st.top + st.bottom) / 2 - (innerHeight - safeBottom()) / 2)],
      ['inside left edge', Math.round(Math.min(0, st.left))],
      ['inside right edge', Math.round(Math.max(0, st.right - innerWidth))],
    ];
    if (C.rows) rows.push(...C.rows());
    console.table(rows.map(([k, v]) => ({ check: k, residuePx: v, pass: v === 0 ? '✓' : '✗' })));
    return rows.every(([, v]) => v === 0);
  }

  if (C.listen) {
    addEventListener('resize', fit);
    if (window.visualViewport) {
      let lastH = visualViewport.height;
      visualViewport.addEventListener('resize', () => {
        if (Math.abs(visualViewport.height - lastH) < 4) return;   // ignore IME candidate-bar jitter
        lastH = visualViewport.height; fit();
      });
    }
    fit();
  }
  return { fit, audit, kick, wide: isWide, safeBottom, scale: () => lastScale, touch: TOUCH, config: C, geometry };
}

/* Scale and centering as a pure function — the only place the shell can get the math wrong, so it is testable in node.
     · wide screens ignore safe-area (desktops have no notch); narrow screens subtract safe-area + bottomPad
     · horizontal breathing room (marginX) only on narrow screens; vertical fills — breathing room per axis */
function geometry({ wide, w, h, visH, innerW, safe, marginX, bottomPad }) {
  const availH = visH - (wide ? 0 : safe + bottomPad);
  const availW = innerW - (wide ? 0 : marginX);
  return { scale: Math.min(availW / w, availH / h), centerY: (visH - (wide ? 0 : safe)) / 2, availH, availW };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { geometry };

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const A = require('assert');
  const g = geometry;
  // phone portrait 375×812, notch 34, cabinet 540×960: height is the bottleneck
  let r = g({ wide: false, w: 540, h: 960, visH: 812, innerW: 375, safe: 34, marginX: 12, bottomPad: 10 });
  A.ok(Math.abs(r.scale - Math.min(363 / 540, 768 / 960)) < 1e-9, 'narrow scale');
  A.strictEqual(r.centerY, (812 - 34) / 2, 'narrow centering subtracts safe-area');
  // desktop 2560×1440, same-size canvas: scale 1, no safe-area
  r = g({ wide: true, w: 2560, h: 1440, visH: 1440, innerW: 2560, safe: 34, marginX: 12, bottomPad: 10 });
  A.strictEqual(r.scale, 1, 'desktop fills exactly');
  A.strictEqual(r.centerY, 720, 'wide ignores safe-area');
  // keyboard open (visible height 420): whole stage shrinks, still centered in the visible area
  r = g({ wide: false, w: 540, h: 960, visH: 420, innerW: 375, safe: 34, marginX: 12, bottomPad: 10 });
  A.ok(r.scale < 0.4 && r.centerY === (420 - 34) / 2, 'keyboard open');
  // when width is the bottleneck, width decides
  r = g({ wide: false, w: 1200, h: 300, visH: 812, innerW: 375, safe: 0, marginX: 12, bottomPad: 10 });
  A.ok(Math.abs(r.scale - 363 / 1200) < 1e-9, 'width is the bottleneck');
  console.log('arcade-shell geometry self-test passed (4 cases)');
}

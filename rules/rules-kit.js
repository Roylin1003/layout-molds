/* rules-kit.js — the three rules most small games share, as pure functions:
     1. a run ends after N mistakes (lives),
     2. a streak raises the difficulty,
     3. scoring rewards answering at higher difficulty.
   No DOM, no storage, no animation — feedback is the page's job.

   Usage:
     const run = makeRun({
       lives: 1,                       // mistakes allowed before the run ends
       d0: .10, decay: .9, dMin: .012, // difficulty d(streak) = max(dMin, d0 × decay^streak); omit for a flat curve
       k: 1,                           // each hit scores round(k / d); k = 0 means no score
       onHit(r){}, onMiss(r){}, onOver(r){},   // r = run.state()
     });
     run.start();        // new run
     run.hit();          // correct: streak +1, score + round(k/d); returns state
     run.miss();         // wrong: lives −1, streak resets; out of lives → over = true, onOver once; returns state
     run.difficulty();   // current d
     run.state();        // { streak, bestStreak, score, lives, livesLeft, over, hits, misses, d }
   Browser: <script src="rules-kit.js"> gives window.makeRun. Node: require(...).makeRun.
   Self-test: node rules-kit.js */
'use strict';
function makeRun(opt) {
  const C = Object.assign({ lives: 1, d0: 1, decay: 1, dMin: 0, k: 0 }, opt || {});
  const S = { streak: 0, bestStreak: 0, score: 0, livesLeft: C.lives, over: false, hits: 0, misses: 0 };
  const d = () => Math.max(C.dMin, C.d0 * Math.pow(C.decay, S.streak));
  const state = () => ({ ...S, lives: C.lives, d: d() });
  const call = (fn) => { if (typeof fn === 'function') fn(state()); };
  return {
    start() { Object.assign(S, { streak: 0, bestStreak: 0, score: 0, livesLeft: C.lives, over: false, hits: 0, misses: 0 }); return state(); },
    hit() {
      if (S.over) return state();
      const gain = C.k ? Math.round(C.k / d()) : 0;   // score at the difficulty of THIS question, then raise the streak
      S.hits++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); S.score += gain;
      call(C.onHit); return state();
    },
    miss() {
      if (S.over) return state();
      S.misses++; S.streak = 0; S.livesLeft = Math.max(0, S.livesLeft - 1);
      call(C.onMiss);
      if (S.livesLeft <= 0) { S.over = true; call(C.onOver); }
      return state();
    },
    difficulty: d, state, config: C,
  };
}
if (typeof module !== 'undefined') module.exports = { makeRun };
if (typeof window !== 'undefined') window.makeRun = makeRun;

if (typeof require !== 'undefined' && require.main === module) {
  const A = require('assert');
  const log = [];
  const run = makeRun({ lives: 1, d0: .10, decay: .9, dMin: .012, k: 1, onOver: r => log.push('over@' + r.hits) });
  run.start();
  A.strictEqual(run.difficulty(), .10, 'd0');
  A.strictEqual(run.hit().score, 10, 'first hit scores round(1/0.10) = 10');
  for (let i = 0; i < 30; i++) run.hit();
  A.ok(Math.abs(run.difficulty() - .012) < 1e-9, 'difficulty has a floor');
  A.ok(run.state().over === false && run.state().livesLeft === 1, 'no mistakes yet');
  const s = run.miss();
  A.ok(s.over === true && s.livesLeft === 0 && s.streak === 0 && log[0] === 'over@31', 'one mistake ends the run, onOver once, streak resets');
  A.strictEqual(run.hit().hits, 31, 'hits after the run ends do not count');
  const r3 = makeRun({ lives: 3 }); r3.start(); r3.miss(); r3.miss();
  A.ok(r3.state().over === false && r3.state().livesLeft === 1, 'lives 3: alive after two mistakes');
  A.strictEqual(r3.miss().over, true, 'third mistake ends it');
  const r0 = makeRun({}); r0.start(); A.strictEqual(r0.hit().score, 0, 'k = 0 means no score');
  console.log('rules-kit self-test passed');
}

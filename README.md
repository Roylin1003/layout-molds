*A collaborative project by roylin1003 and Claude.*

# layout-molds

**Two layout shells for small web games and quiz pages, so you stop re-tuning the layout for every project.**
Pick a mold, fill in a few numbers, then write the game. Zero dependencies.

These come from the **[Protonia](https://roynexus.com)** game lab, where they hold up dozens of games on phones and desktops.

## Which mold?

Ask one question: *is there one thing to look at, and a row of things to answer with?*

| | Column mold (`column/`) | Arcade mold (`arcade/`) |
|---|---|---|
| For | quizzes, drills, "find the one that matches" | a board that keeps running: falling blocks, shooters |
| Shape | one column, bands top to bottom: `#status → #nav → #board → #play → #dock → #hint`. On desktop: left \| column \| right | one fixed design canvas, scaled and centered to fit any window |
| Sizing | the column width is the only input (`cqw` units) | constants in, `transform` out: `size()` never measures the DOM |
| Flexible part | exactly one: `#play` | exactly one: a `.filler` |
| Check | `col.audit()`: no overflow, touch targets ≥ 44px, pressable text ≥ 20px | `arc.audit()`: centering and overflow residue all 0 |

Plus **`rules/rules-kit.js`**: the three rules most small games share. A run ends after N mistakes, a streak raises the difficulty, and scoring rewards answering at higher difficulty. Pure functions, no DOM.

## Try it

```bash
python -m http.server 8000
# open http://localhost:8000/column/example.html   (a 4-choice sums quiz, column mold + rules-kit)
# open http://localhost:8000/arcade/example.html   (the arcade starter: board + side column + touch row)
node arcade/arcade-shell.js   # self-test of the scaling math
node rules/rules-kit.js       # self-test of the rules
```

Resize the window across ~900px (column) or ~1400px wide at 3:2 (arcade) to watch the desktop layout take over. Then open the console and run `col.audit()` / `arc.audit()`.

## Column mold in short

```html
<link rel="stylesheet" href="col-shell.css">
<div id="app"><div id="left"></div>
  <div id="col"> <div id="status"></div> <div id="board"></div> <div id="play"></div> </div>
<div id="right"></div></div>
<script src="col-shell.js"></script>
<script>
  const col = initCol({
    config: { vf: 0.38, gutter: 12 },                              // board takes 38% of the column
    move: [ { id: 'stats', wide: 'right', home: 'status' } ],      // desktop: stats move to the right column
  });
</script>
```

Colors are tokens with neutral defaults (`--ink`, `--panel`, `--chalk`, `--beam`, `--ok`, `--err`, …). Override them in your own style. Don't edit the skeleton.

## Arcade mold in short

Copy `arcade/example.html` with the two shell files, then change the `SHELL` constants and the contents of `#stage`. The four rules are at the top of `arcade-shell.js`. The one that matters most: **`size()` only reads constants**. Measured sizes drift with state, and that is how a result screen ends up mysteriously smaller than the game screen.

## About this project

Directed by Yen-Ting R. Lin. The code was written mostly by AI (Anthropic Claude) under his direction, then tested and reviewed by hand on real phones and desktops.

## License

Code: [MIT](LICENSE). See [CREDITS](CREDITS.md).

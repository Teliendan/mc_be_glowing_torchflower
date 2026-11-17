# Content log

Lessons only; history is in git.

- Startup message uses `console.log`, not `console.warn` (a warn shows as a scripting warning).
- A RawMessage with an empty `with` container is rejected by the game: omit `with` when there are no arguments.
- Setup sets its migration flag only after the notification and sweep job start, so a failed message cannot skip setup.
  Worlds that already lost setup recover with `/scriptevent torchlight:sweep` (radius 32, vertical +/-16).
- TL-04 sweep verified in game (owner, 1.26.63, 2026-11-17): same messages as before, flowers glow, a second sweep reports no new crops, no error
  near unloaded chunks.

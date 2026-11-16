# EMBERLINE — The Last Ember Warden

A top-down arena survival shooter. You are the last Ember Warden, holding a
dying flame against the ash creatures that swarm out of the dark. One
flame-lance, one arena, and waves that never stop coming.

## The game

- **Goal:** survive. Clear each wave of ash creatures, pick an upgrade, and
  face the next one. Slay the Ash Titan every 5 waves. Kill the wave-10
  Titan and the ember holds — victory. Die, and the ember dies with you.
- **Enemies:** Cinders chase you; Spitters keep their distance and shoot;
  Splitters burst into fast Motes when slain; Brutes shrug off your fire;
  the Ash Titan fires radial bursts and charges across the arena.
- **Combo:** kills chained within 3 seconds raise a score multiplier (up to
  3.5x). Taking a hit resets it.
- **Pickups:** green embers heal, blue novas clear the screen, pink magnets
  pull pickups to you.
- **Upgrades:** after every cleared wave, choose 1 of 3 — faster fire, twin
  shots, heavier rounds, faster boots, shorter dash cooldown, more HP,
  wider pickup radius, piercing rounds.

## Controls

- **WASD / Arrow keys** — move
- **Mouse** — aim
- **Hold Click / Space** — fire
- **Shift** — dash (brief invulnerability, 2.1s cooldown)
- **P / Esc** — pause
- **1 / 2 / 3 or click** — pick an upgrade
- **R** — restart (from pause, game over, or victory)
- **C** — continue endless after victory
- **M** — mute

## Tech

Plain ES modules on a 2D canvas, no libraries and no network requests. All
art is drawn in code; all sound is synthesized with WebAudio (no audio
files). Fixed 60 Hz simulation step. Best score is kept in localStorage.

## Files

- `game/index.html` — the page; `game/src/main.js` — boot and frame loop
- `game/src/world.js` — state machine, waves, collisions, scoring
- `game/src/entities.js` — player, enemies, bullets, pickups, particles
- `game/src/render.js` — all drawing: arena, entities, HUD, menus
- `game/src/config.js` — tuning and palette
- `game/src/random.js` — seeded RNG (deterministic screenshot states)
- `game/src/input.js` — keyboard and mouse state
- `game/src/audio.js` — synthesized sound effects and music
- `game/src/shots.js` — deterministic `?shot=` states for screenshots
- `main.ts` — hands the game in (copies game/ + screenshots/, writes the dossier)
- `shots.json` — the four screenshot states and their URLs

## Screenshots

Take them in desktop Chrome from `game/` served locally:
`?shot=start` title, `?shot=play` mid-combat, `?shot=upgrade` upgrade
choice, `?shot=end` game over.

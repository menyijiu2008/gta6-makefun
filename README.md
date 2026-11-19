# gta6-makefun

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/menyijiu2008/gta6-makefun/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/menyijiu2008/gta6-makefun/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Sunport Chase is an original 2D top-down open-world crime game set in the fictional seaside city of Sunport. Play as courier A Yang: explore on foot and by car, steal cars, dodge traffic and pedestrians, raise a 1–5 star wanted level and shake the police, and finish three missions. Static files only — it plays offline in a desktop browser with no network requests.

## The game

**Sunport Chase / 阳光港追缉** is a top-down open-world crime game drawn with plain Canvas 2D — no engine, no libraries, no network. The city of Sunport is a sunny grid of avenues and side streets with pastel tower blocks, palm trees, a beach and a harbour pier on its east shore. You play 阿阳 (A Yang), a courier who owes money all over town and takes three jobs to pay it back.

Explore on foot or behind the wheel: parked cars all over the city can be stolen and driven, traffic cars cruise the avenues and brake for whatever blocks them, and pedestrians stroll the sidewalks (and dive away from fast cars). Crimes — stealing a car, clipping another vehicle, knocking someone down — raise your wanted level from one to five stars. Police cars pour in to chase, ram and pin you; at four stars they throw a roadblock across the road ahead. Break line of sight and stay hidden, and the heat fades star by star. Get pinned and you are **BUSTED**; wreck your car and you are **WASTED**.

The three missions run in sequence:

1. **Cross-Town Delivery** — pick up a package in the south-west and drive it to the north-east depot against an 85-second clock.
2. **The Marked Car** — steal the marked teal coupe uptown, then lose the two-star heat it brings.
3. **Harbour Run** — at four stars, smash through the roadblocks and reach the harbour point on the beach road.

Cash pickups ($50) are scattered around the corners, near misses at speed add score, and mission bonuses pay for fast, clean work. Progress (current mission and cash) is saved in the browser, so the start screen offers a Continue option.

**Controls**

- **WASD / arrow keys** — walk and drive (accelerate, brake/reverse, steer)
- **E** — enter / steal a car, exit a car
- **Shift** — sprint on foot
- **F** — shove (on foot)
- **P / Esc** — pause · **M** — mute · **Enter** — confirm · **R** — restart after busted/wasted

The HUD shows wanted stars, cash and score, the current objective with its distance (and the delivery timer when it matters), your speed while driving, and a minimap with the mission target, cash pickups and flashing police blips. Sound is synthesized live with WebAudio oscillators — engine hum, sirens, pickup blips, crash thuds — with no audio files.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=z6a3y0mf&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

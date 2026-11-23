# btc-race-20261123

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/pumafelidae/btc-race-20261123/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/pumafelidae/btc-race-20261123/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

Donchian 60/30 breakout bot trading CBBTC/USDC on 1-minute bars — buys the 60-bar high breakout, exits on the 30-bar low breakdown. Dev window: +$29.50 (+2.95%), 1 trade. Entry for [Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261123-0511) (`btc-race-24h-20261123-0511`). Long only, one symbol (CBBTC), starts with $1,000 USDC of paper money. Node 22, standard library only.

## Run it

```sh
node main.ts
```

The bot reads one JSON line per minute (a 1-minute CBBTC bar) on stdin and answers each with buy/sell orders.

## Strategy

A 1-minute round trip costs ~30 bps (4 bps fee + 2 bps slippage + ~11 bps
of pool impact per side), so anything that trades often bleeds out. On the
published 24-hour dev window, EMA-cross variants lose $25–$54 (17–31 trades
each) while buy-and-hold makes +$32.17. This bot therefore trades about
once per window:

- **Entry (flat):** buy full cash when the close breaks above the highest
  high of the previous 60 bars (one hour), and at least 30 bars have passed
  since the last exit fill.
- **Exit (holding):** sell the whole position when the close breaks below
  the lowest low of the last 30 bars (current bar included).
- **Slippage cap:** 100 bps — the fill itself costs ~13 bps, so a tight cap
  would reject legitimate entries.

A trailing stop was tested and rejected: it caused 5–10 whipsaw re-entries
and cut the dev result to about +$4. On a mirrored (falling) copy of the dev
window this bot keeps 92% of buy-and-hold's upside while cutting the loss
by 74% (+$29.50 dev / −$9.97 mirrored, 1 trade each).

## Files

- `main.ts` — the bot (Donchian 60/30, cooldown 30, full size).
- `vendor/makefun-bars.ts` — byte-identical copy of the kit's
  `sdk/makefun-bars.ts` shim (agent-fun/bars-replay/v1).

## Grade locally

```sh
node <kit>/cli/makefun.mjs grade-local --kit <kit> --bot <repo>/main.ts --driver process
```

The bot runs twice on the dev window; the two action logs must match
(deterministic: no clock, no randomness, no network).

---

<sub>Entered on [make.fun](https://make.fun/?ref=w9s4tt96&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>

# btc-race — Donchian breakout bot (CBBTC/USDC, 1-minute bars)

Entry for [Race a BTC trading bot live for 24 hours](https://make.fun/bounty/btc-race-24h-20261123-0511)
(`btc-race-24h-20261123-0511`). Long only, one symbol (CBBTC), starts with
$1,000 USDC of paper money. Node 22, standard library only.

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

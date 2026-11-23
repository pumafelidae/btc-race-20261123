// btc-race-24h-20261123-0511 — Donchian breakout bot, long only.
//
// Idea: on 1-minute bars the round trip costs ~30 bps (4 bps fee + 2 bps
// slippage + ~11 bps of pool impact per side), so anything that trades often
// bleeds out. The dev window confirms it: EMA-cross variants lose $25–$54
// over 24 h (17–31 trades each), while buy-and-hold makes +$32.17. This bot
// therefore trades about once per window: it buys the first close above the
// highest high of the last 60 bars (one hour), then sits through the chop
// and only sells when the close breaks below the lowest low of the last
// 30 bars. A trailing stop was tried and dropped — it caused 5–10 whipsaw
// re-entries and cut the dev result to about +$4.
//
//   entry (flat):   close > max high of the previous 60 bars
//                   and >= 30 bars since the last exit fill
//   exit (holding): close < min low of the last 30 bars, current bar included
//   size:           full cash on entry, whole position on exit
//   slippage cap:   100 bps — the fill itself costs ~13 bps, so a tight cap
//                   would reject legitimate entries
//
// Everything is integer/bigint and deterministic: no clock, no randomness,
// no network, stdlib only. Warm-up bars only build the channel history.

import { runBars, type BarsState, type Batch } from './vendor/makefun-bars.ts';

const CHANNEL_HIGH_BARS = 60;
const CHANNEL_LOW_BARS = 30;
const REENTRY_COOLDOWN_BARS = 30;
const MAX_SLIPPAGE_BPS = 100;

/** Recent bar highs/lows of CBBTC, oldest first, capped to the channel width. */
const recentHighs: bigint[] = [];
const recentLows: bigint[] = [];
/** Non-warm-up bars answered so far (drives the re-entry cooldown). */
let answeredBars = 0;
/** answeredBars as of the batch that reported our last exit fill. */
let exitAnsweredBars = -1_000_000;

function channelHigh(): bigint | null {
  if (recentHighs.length < CHANNEL_HIGH_BARS) return null;
  let hi = recentHighs[0]!;
  for (const h of recentHighs) if (h > hi) hi = h;
  return hi;
}

function channelLow(): bigint | null {
  if (recentLows.length === 0) return null;
  let lo = recentLows[0]!;
  for (const l of recentLows) if (l < lo) lo = l;
  return lo;
}

function remember(bar: { h: string; l: string }): void {
  recentHighs.push(BigInt(bar.h));
  recentLows.push(BigInt(bar.l));
  if (recentHighs.length > CHANNEL_HIGH_BARS) recentHighs.shift();
  if (recentLows.length > CHANNEL_LOW_BARS) recentLows.shift();
}

await runBars({
  onBatch(state: BarsState, batch: Batch) {
    const symbol = state.hello.symbols[0]?.symbol;
    if (symbol === undefined) return [];

    // A sell fill reported in this batch restarts the re-entry cooldown.
    // (Checked before the bar lookup: a fill can arrive on a batch whose
    // bar for our symbol is absent, and the cooldown must still restart.)
    for (const f of batch.fills) {
      if (f.status === 'filled' && f.side === 'sell') exitAnsweredBars = answeredBars;
    }

    const bar = batch.bars.find((b) => b.symbol === symbol);
    if (bar === undefined) return [];

    if (state.warmingUp) {
      remember(bar);
      return [];
    }

    // Breakout is judged against the channel BEFORE this bar joins it.
    const high = channelHigh();
    const close = BigInt(bar.c);
    const breakout = high !== null && close > high;

    remember(bar);
    answeredBars++;

    const held = state.positions.get(symbol);
    if (held !== undefined && held.qty > 0n) {
      // Breakdown is judged against the channel INCLUDING this bar.
      const low = channelLow();
      if (low !== null && close < low) {
        return [{ side: 'sell', symbol, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }
    if (!breakout) return [];
    if (answeredBars - exitAnsweredBars < REENTRY_COOLDOWN_BARS) return [];
    // Never send a buy the harness would reject as below the minimum
    // notional (e.g. dust cash left by a partial fill in the race window).
    if (state.cash < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    if (state.cash <= 0n) return [];
    return [{ side: 'buy', symbol, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  },
});

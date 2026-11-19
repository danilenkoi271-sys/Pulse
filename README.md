# Pulse

**A fast, non-custodial trading interface for [Hyperliquid](https://hyperliquid.xyz)** — crypto perps, spot, and HIP-3 stock/commodity perps (trade[XYZ]).

Pulse is *only* a front end. Orders are signed in the user's browser and sent straight to Hyperliquid. Custody, matching and settlement happen on Hyperliquid; **no Pulse server ever holds a key or a dollar.**

- React 18 · Vite 5 · TypeScript (strict) · Tailwind 3 — Lovable/Vercel friendly, all dependencies pinned
- [`@nktkas/hyperliquid`](https://github.com/nktkas/hyperliquid) 0.33.3 (Info / Exchange / Subscription clients)
- Privy (email / Google embedded wallet + MetaMask, Rabby, Phantom EVM) · viem
- TradingView Lightweight Charts · zustand · react-router
- Self-hosted fonts (Anybody, Instrument Sans, Geist Mono): no third-party font requests, strict CSP stays strict
- Supabase (optional; username profiles only)

## Quick start

```bash
npm ci
cp .env.example .env     # defaults to MAINNET (real funds)
npm run dev              # http://localhost:5173
npm test                 # unit tests
npm run build            # type-check + production build
```

Without `VITE_PRIVY_APP_ID` the app runs **read-only** (landing, markets, charts, order book, trades) and the Connect button is disabled.

### Privy setup (needed for login)
1. Create an app at <https://dashboard.privy.io>. Enable **Email**, **Google** and **Wallet** login. Embedded wallets: Ethereum, create on login.
2. Copy the **App ID** into `VITE_PRIVY_APP_ID`. (The App *Secret* is never used and must never be put in the frontend.)
3. Add every origin you serve from (`http://localhost:5173`, your Vercel URL / custom domain) to the app's **allowed origins** in the Privy dashboard.


## Going live (real funds)

Pulse now defaults to **Hyperliquid mainnet**. Two things only you can do:

1. **Create a Privy app** ([dashboard.privy.io](https://dashboard.privy.io)): enable Email, Google and Wallet login, copy the App ID into `VITE_PRIVY_APP_ID`, and add your domain to the allowed origins.
2. **Deploy** (see *Deploy to Vercel* below) with `VITE_PRIVY_APP_ID` set. Until the App ID exists, login (and therefore trading and deposits) is disabled by design.

Real-money safeguards built in:
- **Deposit pre-flight** runs before a deposit is offered *and again right before it is sent*: the bridge must be a live, unpaused contract and the USDC address must really be a 6-decimals `USDC` token on-chain, otherwise deposits are blocked.
- Deposits below **5 USDC are blocked** (Hyperliquid loses them); the confirmation shows the exact bridge address to compare with your wallet prompt; the UI recommends a small first deposit.
- Asset ids were verified on mainnet against the SDK's own converter for all 302 perp/HIP-3 markets (`HL_LIVE=1 VITE_HL_NETWORK=mainnet npm test`).
- Constants checked on-chain (Arbitrum One): bridge `0x2Df1…3dF7` (live contract, holds ~$98M USDC, not paused), USDC `0xaf88…5831` (6 decimals).

> **Bridge status.** Hyperliquid's docs describe the Arbitrum "Bridge2" deposit (plain native-USDC transfer, ≥5 USDC, credited in under a minute) and also label it *legacy/deprecated* in favour of CCTP. It is live today and is what wallet deposits on Arbitrum use, but **check Hyperliquid's docs before launch and periodically after**, and consider adding a CCTP route if they retire it.

First live test: deposit the minimum (5 USDC), confirm it is credited, place a tiny order, close it, withdraw it. Only then scale up.

## Environment variables

All `VITE_*` values are public (they ship in the bundle). See [`.env.example`](./.env.example).

| Variable | Default | Purpose |
|---|---|---|
| `VITE_HL_NETWORK` | `mainnet` | **Mainnet unless set to `testnet`** (anything else = real funds). Switches API/WS URLs, bridge + USDC addresses, signing chain (Arbitrum One ↔ Arbitrum Sepolia). |
| `VITE_PRIVY_APP_ID` | – | Privy app id. Empty → read-only mode. |
| `VITE_HIP3_DEXS` | `xyz` | Comma-separated HIP-3 dexes to list. Testnet has ~290 junk dexes, so this is an allow-list. |
| `VITE_BUILDER_ADDRESS` / `VITE_BUILDER_FEE` | – | Builder code. **Off unless both are set and valid.** Fee is in **tenths of a basis point** (`10` = 0.01 %); perps max `100` (0.1 %). |
| `VITE_GEOBLOCK_COUNTRIES` | – | ISO-3166 alpha-2 list to block from trading, e.g. `XX,YY`. Empty = none. Nothing is hardcoded. |
| `VITE_GEOBLOCK_FAIL_CLOSED` | `false` | Block trading when the country can't be determined. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | – | Optional profiles. The anon key is public by design; protection comes from RLS. |

## What each stage covers & how to test it on testnet

> Testnet only — set `VITE_HL_NETWORK=testnet` to practise with fake funds. Faucet: Hyperliquid's faucet gives 1,000 mock USDC but **requires a prior mainnet deposit from the same address** ([docs](https://hyperliquid.gitbook.io/hyperliquid-docs/onboarding/testnet-faucet)). It credits the Hyperliquid testnet account directly — not the Arbitrum Sepolia bridge.

**1 · Scaffold, login, market data, chart**
- Landing page loads; live ticker shows prices (`/`).
- `/markets`: tabs for Perps / Stocks & commodities (HIP-3) / Spot; search, ★ favourites (persisted), sort by volume / 24h / funding / OI; prices flash on ticks.
- `/trade/BTC`: candles from the Info API, last candle updating live; switch intervals and to `xyz:TSLA` / a spot pair.
- Connect with email or Google (embedded wallet) and with MetaMask / Rabby / Phantom.

**2 · Trading & positions**
- Fund the account via the faucet, then on `/trade/BTC`: place a small **limit** order far from price → it appears in *Open orders* (with a Pending → Confirmed flash), then **Cancel** it.
- Place a **market** order, set leverage, toggle **cross/isolated**, try **reduce-only**, **TP/SL**. Check the confirmation modal (size, leverage, est. liquidation, fees). Watch *Positions* update live (PnL, ROE, liquidation price) and **Close** it.
- Click an order-book price → fills the limit price. Order book and trades stream over the single shared socket.
- Try an invalid order (size `0`, SL on the wrong side, `$5` notional) → clear inline error, no signature requested.

**3 · Funds & one-click trading**
- `/funds` → **Enable one-click trading** (one main-wallet signature). Place orders again: no popups. **Revoke agent** replaces the key on Hyperliquid.
- **Withdraw**: a small amount to your own address (fee $1, ~3–5 min). The main wallet always signs.
- **Transfer** between perps / spot / `xyz` balances (standard accounts) or switch to a **unified account**.
- **Deposit**: needs USDC2 on Arbitrum Sepolia (the testnet bridge token). On **mainnet** it's plain USDC on Arbitrum One. Minimum 5 USDC — below that funds are lost, so the UI blocks it.

**4 · Builder fees & polish**
- Set `VITE_BUILDER_ADDRESS` + `VITE_BUILDER_FEE=10`, restart. The ticket shows "Interface fee 0.01 %", trading is gated on a one-time **ApproveBuilderFee** (main wallet), and the fee appears in the ticket and confirmation. Unset them → orders carry **no** `builder` field.
- Set `VITE_GEOBLOCK_COUNTRIES` and check the banner / disabled ticket (works on Vercel, where `/api/geo` reads the edge country header).

## Architecture

```
src/
  config/env.ts          typed, validated build-time config (network, bridge, builder, geoblock)
  lib/hl/                typed Hyperliquid layer — clients (1 shared WS), markets, candles,
                         orders (validation, wire building, liq/fee estimates), trade (submit/cancel)
  lib/funds.ts           deposit / withdraw / transfer validation + ERC-20 ABI
  lib/agent.ts           agent-wallet key storage (browser only)
  stores/                zustand: markets (live ctx), account (live WS state), agent, builder,
                         pending orders (optimistic), toasts, settings, favourites
  hooks/                 live book/trades/activeAssetData, order actions, signer routing, geoblock
  wallet/                Privy provider (lazy chunk) behind a small WalletApi context
  components/ pages/     UI (routes are code-split)
api/geo.ts               Vercel Edge function: echoes the visitor's country header (nothing else)
supabase/migrations/     optional profiles table with RLS
vercel.json              strict CSP + security headers + SPA rewrite
```

**Data flow.** One `WebSocketTransport` (auto-reconnect + resubscribe) multiplexes every subscription: `assetCtxs`/`spotAssetCtxs` (prices, funding, volume), `candle`, `l2Book`, `trades`, `clearinghouseState`, `openOrders`, `userFills`, `userHistoricalOrders`, `spotState`, `activeAssetData`, ledger updates. Inputs that update many times per second (market ctxs, book, trades) are coalesced and flushed on a timer; rows are `memo`-ized and read their own slice of the store. HTTP is used only for one-shot snapshots (meta, candle history, fees, account mode) and for posting signed actions.

**Signer routing.**
| Action | Signed by |
|---|---|
| orders, cancel, update leverage | agent key if one-click is on, otherwise main wallet |
| withdraw, transfer (`sendAsset`), `approveAgent`, `approveBuilderFee`, account-mode change | **main wallet only** (`useMainExchange`) |

Withdrawals (`withdraw3`) are user-signed EIP-712 actions, so an agent cannot produce a valid one.

## Hyperliquid specifics handled

- **Asset ids:** perps = index; HIP-3 = `100000 + dexIndex × 10000 + index`; spot = `10000 + spotIndex` (per the official docs; `dexIndex` is the position in `perpDexs`).
- **Prices/sizes** are rounded with the SDK's `formatPrice` / `formatSize` (≤5 sig. figs, `szDecimals`); minimum order value $10.
- **Market orders** are IOC limits priced through the mid by a user-set slippage bound.
- **Fees:** user's own rates via `userFees`; HIP-3 multiplier is derived from the deployer fee scale / growth mode (`0.1 × (1 + scale)` in growth mode) per the fee docs. Displayed as *estimates*.
- **Liquidation price** (pre-trade) uses Hyperliquid's published formula with maintenance rate `1 / (2 × maxLeverage)`; positions show the exchange's own value.
- **Account modes:** standard accounts have separate perp / spot / per-dex balances (the app offers transfers); unified accounts are supported and can be switched to from `/funds`. Sizing uses `activeAssetData.availableToTrade`.
- **Agents:** named `Pulse`, 30-day `valid_until`, a fresh key each time (the docs warn against reusing agent addresses). Revoking re-approves a throwaway address under the same name, which deregisters the old agent.

### Builder fee caveats (from the Hyperliquid docs)
- The builder address needs **≥ 100 USDC in perps account value** and must be in **standard** account mode to accrue fees.
- Max 0.1 % on perps / 1 % on spot; each user can have at most 10 active builder approvals.
- ApproveBuilderFee is signed by the **main** wallet, never an agent.

## Security model

- **No custody, no secrets.** No private keys, seed phrases, or API secrets exist server-side. The only serverless code is `api/geo.ts`, which echoes a country header.
- **Agent key** lives in this browser's `localStorage` (per network + address). It can trade but not withdraw/transfer, expires after 30 days, and can be revoked. A browser compromise (XSS, malware, shared profile) could trade with it — hence the strict CSP and the "don't use on shared devices" notice.
- **CSP / headers** (`vercel.json`): `script-src 'self' 'wasm-unsafe-eval'` (no inline scripts, no `eval`), `object-src 'none'`, `frame-ancestors 'none'`, HSTS, `nosniff`, restrictive `connect-src` allow-list (Hyperliquid, Privy, WalletConnect, Supabase, Arbitrum RPCs). I verified the production build runs with no violations for all Pulse traffic. **The Privy/WalletConnect hosts could not be exercised without a real Privy app id — after deploying, open the console, log in, and add any host the browser reports blocked.**
- **Input validation:** every order field is validated before a signature is requested (strict decimal regex, size decimals, min notional, leverage range, TP/SL side, slippage bounds); deposits/withdrawals use strict 6-dp parsing, address checks and the 5 USDC deposit minimum.
- **Dependencies** are pinned to exact versions; use `npm ci`.
- **Geoblock** is a UX-level gate on the client, *not* a legal control. What you block and whether it suffices is for you and counsel. `/terms` and `/risk` are templates — have them reviewed.

## Optional: Supabase profiles
`supabase/migrations/0001_profiles.sql` creates a `profiles` table (username + settings, keyed by the Privy user id, address informational) with RLS so users can only touch their own row; no delete/anon policies. The client sends the **Privy access token** to Supabase, so Privy must be set up as a third-party/custom-OIDC auth provider in your Supabase project. Privy is not one of Supabase's built-in providers, and **this path has not been tested end-to-end against a live project** — if you can't configure it, leave `VITE_SUPABASE_*` unset and the feature stays off. Never store keys, funds or trading data there.

## Deploy to Vercel
1. Push the repo to GitHub and **Import** it in Vercel (framework: Vite — `vercel.json` already sets build/output/rewrites/headers).
2. Add env vars (Project → Settings → Environment Variables): at minimum `VITE_PRIVY_APP_ID`, `VITE_HL_NETWORK` (`mainnet` for production), plus any builder/geoblock/Supabase values. Set them for Production *and* Preview.
3. Add your Vercel / custom domain to Privy's allowed origins.
4. Deploy, then verify: console shows no CSP violations while logging in; `GET /api/geo` returns your country; markets stream; a testnet order round-trips.
5. For Lovable: the project is a standard Vite + React 18 + Tailwind 3 app (no SSR, no Node-only APIs) and imports cleanly; set the same env vars in its settings.

## Known limitations
- Funding/OI/volume are for the configured dexes only; the chart loads a fixed recent window (no infinite scroll-back yet).
- TWAP, modify-order, per-position TP/SL editing, sub-accounts and vaults are not implemented.
- Deposits use the bridge's plain USDC transfer (the path Hyperliquid documents as primary); email-account Across routing is not implemented.
- Estimates (fees, liquidation) can differ from execution; the exchange's numbers are authoritative.
- Live signing was verified against testnet with throwaway keys (`HL_LIVE=1 npm test`); full wallet-popup flows (Privy/MetaMask/Rabby/Phantom) must be exercised by you with a real Privy app id.

## Disclaimer
Pulse is an independent interface and is not affiliated with Hyperliquid. Trading leveraged products involves substantial risk of loss. Nothing here is financial or legal advice.

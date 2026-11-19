/**
 * Single place where build-time configuration is parsed and validated.
 * Everything here is public (it ships in the bundle) — never put secrets in VITE_* vars.
 */
const raw = import.meta.env

export type HlNetwork = 'mainnet' | 'testnet'

export const NETWORK: HlNetwork = raw.VITE_HL_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'
export const IS_TESTNET = NETWORK === 'testnet'

/** Hyperliquid's signing chain: Arbitrum One (mainnet) / Arbitrum Sepolia (testnet). */
export const ARBITRUM = IS_TESTNET
  ? { id: 421614, hex: '0x66eee' as const, name: 'Arbitrum Sepolia', explorer: 'https://sepolia.arbiscan.io' }
  : { id: 42161, hex: '0xa4b1' as const, name: 'Arbitrum One', explorer: 'https://arbiscan.io' }

/** Bridge2 + native USDC on Arbitrum (verified against Hyperliquid's /api/usdc docs page). */
export const BRIDGE = IS_TESTNET
  ? {
      address: '0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89' as const,
      usdc: '0x1baAbB04529D43a73232B713C0FE471f7c7334d5' as const,
    }
  : {
      address: '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7' as const,
      usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
    }

export const MIN_DEPOSIT_USDC = 5
/** Documented withdrawal fee ("$1 at the time of writing") and ETA. Display-only. */
export const WITHDRAW_FEE_USDC = 1
export const WITHDRAW_ETA = '3–5 minutes'

export const PRIVY_APP_ID: string = (raw.VITE_PRIVY_APP_ID ?? '').trim()
export const SUPABASE_URL: string = (raw.VITE_SUPABASE_URL ?? '').trim()
export const SUPABASE_ANON_KEY: string = (raw.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const HIP3_DEXS: string[] = (raw.VITE_HIP3_DEXS ?? 'xyz')
  .split(',')
  .map((s: string) => s.trim())
  .filter(Boolean)

// ---- Builder fee (disabled unless both values are present and valid) ----------
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const rawBuilderAddr = (raw.VITE_BUILDER_ADDRESS ?? '').trim()
const rawBuilderFee = (raw.VITE_BUILDER_FEE ?? '').trim()
const feeNum = Number(rawBuilderFee)
/** Hyperliquid caps perps builder fees at 100 (= 0.1%). */
export const BUILDER_FEE_MAX_PERPS = 100

export const BUILDER: { address: `0x${string}`; fee: number } | null =
  ADDRESS_RE.test(rawBuilderAddr) &&
  rawBuilderFee !== '' &&
  Number.isInteger(feeNum) &&
  feeNum > 0 &&
  feeNum <= BUILDER_FEE_MAX_PERPS
    ? { address: rawBuilderAddr.toLowerCase() as `0x${string}`, fee: feeNum }
    : null

if ((rawBuilderAddr || rawBuilderFee) && !BUILDER) {
  console.warn('[pulse] VITE_BUILDER_ADDRESS / VITE_BUILDER_FEE are set but invalid — builder fees disabled.')
}

/** Builder fee in tenths of a bp → percent string used by approveBuilderFee ("0.01%"). */
export const builderFeeToPercent = (f: number) => `${+(f / 1000).toFixed(4)}%`

// ---- Geoblocking ---------------------------------------------------------------
export const GEOBLOCK_COUNTRIES: string[] = (raw.VITE_GEOBLOCK_COUNTRIES ?? '')
  .split(',')
  .map((s: string) => s.trim().toUpperCase())
  .filter((s: string) => /^[A-Z]{2}$/.test(s))
export const GEOBLOCK_FAIL_CLOSED = raw.VITE_GEOBLOCK_FAIL_CLOSED === 'true'

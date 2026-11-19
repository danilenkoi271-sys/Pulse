import { IS_TESTNET } from '@/config/env'

/** Mainnet is the quiet default; testnet is loud so nobody mistakes play money for real money. */
export function NetworkBadge() {
  return IS_TESTNET
    ? <span className="border border-warn px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-caps text-warn">Testnet</span>
    : <span className="k hidden sm:inline">Mainnet</span>
}

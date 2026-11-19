import { useCallback } from 'react'
import { useTradeExchange } from './useTradeExchange'
import { usePending } from '@/stores/pendingOrders'
import { toast } from '@/stores/toasts'
import { buildOrders, newCloid, type OrderInput } from '@/lib/hl/orders'
import { cancelMany, cancelOrder, errMsg, setLeverage, submitOrder, type OrderResult } from '@/lib/hl/trade'
import type { Market } from '@/lib/hl/types'
import { useMarkets } from '@/stores/markets'
import { useAccount, type OpenOrder, type Position } from '@/stores/account'
import { fmtPrice, num } from '@/lib/format/numbers'
import { useBuilder } from './useBuilder'

export interface CurrentLeverage { type: 'cross' | 'isolated'; value: number }

function summarize(rs: OrderResult[]): { ok: boolean; message: string } {
  const err = rs.find((r) => r.kind === 'error')
  if (err && err.kind === 'error') return { ok: false, message: err.message }
  const first = rs[0]
  if (first?.kind === 'filled') return { ok: true, message: `Filled ${first.totalSz} @ ${fmtPrice(num(first.avgPx))}` }
  if (first?.kind === 'resting') return { ok: true, message: 'Order placed on the book.' }
  return { ok: true, message: 'Order accepted.' }
}

export function useOrderActions() {
  const getEx = useTradeExchange()
  const { builder } = useBuilder()
  const pending = usePending

  /** Places an order with optimistic UI. Resolves true on success. */
  const place = useCallback(
    async (input: OrderInput, refPrice: number, current: CurrentLeverage | null): Promise<boolean> => {
      const cloid = newCloid()
      const label = `${input.market.label}${input.market.kind === 'spot' ? '' : '-PERP'}`
      let built
      try {
        built = buildOrders(input, refPrice, cloid)
      } catch (e) {
        toast.error('Invalid order', errMsg(e))
        return false
      }
      pending.getState().add({ id: cloid, label, side: input.side, size: built.orders[0].s, price: built.orders[0].p, kind: input.kind })
      try {
        const ex = await getEx()
        if (input.market.kind !== 'spot' && (!current || current.type !== (input.isCross ? 'cross' : 'isolated') || current.value !== input.leverage)) {
          await setLeverage(ex, input.market.assetId, input.isCross, input.leverage)
        }
        const results = await submitOrder(ex, built, builder.active ? { b: builder.address, f: builder.fee } : undefined)
        const s = summarize(results)
        pending.getState().resolve(cloid, s.ok ? 'confirmed' : 'rejected', s.message)
        s.ok ? toast.success(`${label} ${input.side === 'buy' ? 'buy' : 'sell'}`, s.message) : toast.error('Order rejected', s.message)
        return s.ok
      } catch (e) {
        const m = errMsg(e)
        pending.getState().resolve(cloid, 'rejected', m)
        toast.error('Order failed', m)
        return false
      }
    },
    [getEx, pending, builder],
  )

  /** Market-closes (reduce-only IOC, 3% slippage bound) a position. */
  const closePosition = useCallback(
    async (pos: Position, market: Market, mid: number) => {
      const input: OrderInput = {
        market, side: pos.size > 0 ? 'sell' : 'buy', kind: 'market', size: String(Math.abs(pos.size)), price: '',
        tif: 'Ioc', reduceOnly: true, leverage: pos.leverage.value, isCross: pos.leverage.type === 'cross', tp: '', sl: '', slippagePct: 3,
      }
      return place(input, mid, pos.leverage)
    },
    [place],
  )

  const cancel = useCallback(
    async (o: OpenOrder) => {
      const m = useMarkets.getState().byKey[o.coin]
      if (!m) return toast.error('Unknown market', o.coin)
      try {
        await cancelOrder(await getEx(), m.assetId, o.oid)
        toast.info('Order cancelled')
      } catch (e) {
        toast.error('Cancel failed', errMsg(e))
      }
    },
    [getEx],
  )

  const cancelAll = useCallback(
    async (orders: OpenOrder[]) => {
      const byKey = useMarkets.getState().byKey
      const items = orders.filter((o) => byKey[o.coin]).map((o) => ({ asset: byKey[o.coin].assetId, oid: o.oid }))
      try {
        await cancelMany(await getEx(), items)
        toast.info(`Cancelled ${items.length} order${items.length === 1 ? '' : 's'}`)
      } catch (e) {
        toast.error('Cancel failed', errMsg(e))
      }
    },
    [getEx],
  )

  void useAccount
  return { place, closePosition, cancel, cancelAll }
}

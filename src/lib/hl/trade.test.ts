import { describe, expect, it, vi } from 'vitest'
import type { ExchangeClient } from '@nktkas/hyperliquid'
import { errMsg, submitOrder } from './trade'
import type { BuiltOrder } from './orders'

const built: BuiltOrder = {
  grouping: 'na',
  orders: [{ a: 0, b: true, p: '60000', s: '0.01', r: false, t: { limit: { tif: 'Gtc' } } }],
}
const mockEx = (statuses: unknown[]) => {
  const order = vi.fn().mockResolvedValue({ status: 'ok', response: { type: 'order', data: { statuses } } })
  return { ex: { order } as unknown as ExchangeClient, order }
}

describe('submitOrder', () => {
  it('sends NO builder field when builder fees are disabled', async () => {
    const { ex, order } = mockEx([{ resting: { oid: 1 } }])
    await submitOrder(ex, built)
    expect(order.mock.calls[0][0]).not.toHaveProperty('builder')
  })
  it('attaches the builder only when provided', async () => {
    const { ex, order } = mockEx([{ resting: { oid: 1 } }])
    await submitOrder(ex, built, { b: '0x00000000000000000000000000000000000000aa', f: 10 })
    expect(order.mock.calls[0][0].builder).toEqual({ b: '0x00000000000000000000000000000000000000aa', f: 10 })
  })
  it('normalizes resting / filled / error statuses', async () => {
    const { ex } = mockEx([{ resting: { oid: 7 } }, { filled: { oid: 8, avgPx: '1', totalSz: '2' } }, { error: 'Insufficient margin' }, 'waitingForTrigger'])
    const r = await submitOrder(ex, built)
    expect(r).toEqual([{ kind: 'resting', oid: 7 }, { kind: 'filled', oid: 8, avgPx: '1', totalSz: '2' }, { kind: 'error', message: 'Insufficient margin' }, { kind: 'waiting' }])
  })
})

describe('errMsg', () => {
  it('humanizes wallet rejections and truncates long errors', () => {
    expect(errMsg(new Error('User rejected the request.'))).toMatch(/rejected/i)
    expect(errMsg(new Error('x'.repeat(500))).length).toBeLessThan(260)
  })
})

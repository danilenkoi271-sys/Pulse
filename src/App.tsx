import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { WalletProvider } from '@/wallet/WalletProvider'
import { AppLayout } from '@/components/layout/AppLayout'
import { Spinner } from '@/components/ui/Spinner'
import { Toasts } from '@/components/ui/Toasts'
import { AccountSync } from '@/components/AccountSync'

// Route-level code splitting: each page (and its heavy deps, e.g. the chart) loads on demand.
const Landing = lazy(() => import('@/pages/Landing'))
const Markets = lazy(() => import('@/pages/Markets'))
const Trade = lazy(() => import('@/pages/Trade'))
const Portfolio = lazy(() => import('@/pages/Portfolio'))
const Funds = lazy(() => import('@/pages/Funds'))
const Terms = lazy(() => import('@/pages/Legal').then((m) => ({ default: m.Terms })))
const Risk = lazy(() => import('@/pages/Legal').then((m) => ({ default: m.Risk })))

const Fallback = () => <div className="grid h-full min-h-[50vh] place-items-center"><Spinner /></div>

export default function App() {
  return (
    <WalletProvider>
      <AccountSync />
      <Toasts />
      <BrowserRouter>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/risk" element={<Risk />} />
            <Route element={<AppLayout />}>
              <Route path="/markets" element={<Markets />} />
              <Route path="/trade" element={<Trade />} />
              <Route path="/trade/:coin" element={<Trade />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/funds" element={<Funds />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </WalletProvider>
  )
}

import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-[60vh] place-items-center p-6 text-center">
        <div className="card max-w-md p-6">
          <h1 className="text-lg font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-300">Your funds are not affected — Pulse never holds them. Reload to try again.</p>
          <p className="mt-2 break-words font-mono text-[11px] text-ink-500">{this.state.error.message}</p>
          <button className="btn-primary mt-4" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    )
  }
}

import { Component, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-[60vh] place-items-center p-6 text-center">
        <div className="ticks max-w-md border border-line2 p-6">
          <h1 className="display text-[34px] text-bone">Something broke</h1>
          <p className="mt-2 text-[13px] text-mute">Your funds are not affected — Pulse never holds them. Reload to try again.</p>
          <p className="mt-2 break-words font-mono text-[11px] text-dim">{this.state.error.message}</p>
          <button className="btn-lime mt-4" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    )
  }
}

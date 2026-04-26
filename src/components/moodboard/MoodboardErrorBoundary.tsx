'use client'

/**
 * Defensive ErrorBoundary fuer Editor-Overlays.
 * Faengt Render-Errors in Pin-/Markierungs-/Layer-Overlays ab und
 * verhindert dass der ganze Editor crasht. Loggt in die Konsole.
 */

import React from 'react'

interface Props {
  children: React.ReactNode
  /** Optionaler Name fuer Konsolen-Logs */
  name?: string
}

interface State {
  hasError: boolean
}

export default class MoodboardErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[MoodboardErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, info)
  }

  componentDidUpdate(prevProps: Props) {
    // Reset bei Children-Wechsel — gibt User Chance zum Recovery via Re-Render
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

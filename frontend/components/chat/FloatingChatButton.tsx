'use client'

import { useChat } from '@/contexts/ChatContext'

export function FloatingChatButton() {
  const { openOverlay } = useChat()

  const handleInteraction = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Delay opening slightly so the backdrop doesn't catch the same click
    requestAnimationFrame(() => openOverlay())
  }

  return (
    <button
      onClick={handleInteraction}
      onTouchEnd={handleInteraction}
      className="fixed z-50 touch-active active:scale-95 transition-transform"
      style={{
        bottom: 'calc(var(--bottom-nav-height) + 16px)',
        right: 'calc(max(0px, (100vw - var(--app-max-width)) / 2) + 16px)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      aria-label="Chat with Thalia"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/thalia/SupportAgentWidget.svg"
        alt="Chat with Thalia"
        draggable={false}
        style={{ width: 72, height: 72, display: 'block', pointerEvents: 'none' }}
      />
    </button>
  )
}

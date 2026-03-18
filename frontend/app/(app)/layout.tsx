'use client'

import { usePathname } from 'next/navigation'
import { TesterProvider } from '@/contexts/TesterContext'
import { FlowProvider } from '@/contexts/FlowContext'
import { ChatProvider } from '@/contexts/ChatContext'
import { BottomNav } from '@/components/app-shell/BottomNav'
import { PageTransition } from '@/components/app-shell/PageTransition'
import { FloatingChatButton } from '@/components/chat/FloatingChatButton'
import { ChatOverlay } from '@/components/chat/ChatOverlay'

// Routes that hide the bottom nav (full-screen experiences)
const HIDE_NAV_ROUTES = ['/onboarding', '/terms', '/cashout', '/intro', '/survey', '/opt-in']
// Routes that show the floating chat bubble
const CHAT_BUBBLE_ROUTES = ['/home', '/learn', '/profile']

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = HIDE_NAV_ROUTES.some((r) => pathname.startsWith(r))
  const showChatBubble = CHAT_BUBBLE_ROUTES.some((r) => pathname.startsWith(r))

  return (
    <div className="flex flex-col min-h-dvh">
      <main className={hideNav ? 'flex-1' : 'flex-1 pb-[var(--bottom-nav-height)]'}>
        <PageTransition>{children}</PageTransition>
      </main>
      {!hideNav && <BottomNav />}
      {showChatBubble && <FloatingChatButton />}
      <ChatOverlay />
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TesterProvider>
      <FlowProvider>
        <ChatProvider>
          <AppShell>{children}</AppShell>
        </ChatProvider>
      </FlowProvider>
    </TesterProvider>
  )
}

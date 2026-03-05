'use client'

import { usePathname } from 'next/navigation'
import { TesterProvider } from '@/contexts/TesterContext'
import { FlowProvider } from '@/contexts/FlowContext'
import { ChatProvider } from '@/contexts/ChatContext'
import { BottomNav } from '@/components/app-shell/BottomNav'

// Routes that hide the bottom nav (full-screen experiences)
const HIDE_NAV_ROUTES = ['/onboarding', '/terms', '/cashout', '/intro', '/survey', '/opt-in']

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = HIDE_NAV_ROUTES.some((r) => pathname.startsWith(r))

  return (
    <div className="flex flex-col min-h-dvh">
      <main className={hideNav ? 'flex-1' : 'flex-1 pb-[var(--bottom-nav-height)]'}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
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

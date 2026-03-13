'use client'

import { ReactNode } from 'react'
import { CustomerProvider } from '@/contexts/CustomerContext'
import { FlowProvider } from '@/contexts/FlowContext'
import { TesterProvider } from '@/contexts/TesterContext'
import { ChatProvider } from '@/contexts/ChatContext'

export function RootLayoutProviders({ children }: { children: ReactNode }) {
  return (
    <CustomerProvider>
      <FlowProvider>
        <TesterProvider>
          <ChatProvider>
            {children}
          </ChatProvider>
        </TesterProvider>
      </FlowProvider>
    </CustomerProvider>
  )
}

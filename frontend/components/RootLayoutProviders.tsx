'use client'

import { ReactNode } from 'react'
import { CustomerProvider } from '@/contexts/CustomerContext'
import { FlowProvider } from '@/contexts/FlowContext'
import { TesterProvider } from '@/contexts/TesterContext'
import { ChatProvider } from '@/contexts/ChatContext'
import { LocaleProvider } from '@/contexts/LocaleContext'

export function RootLayoutProviders({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <CustomerProvider>
        <FlowProvider>
          <TesterProvider>
            <ChatProvider>
              {children}
            </ChatProvider>
          </TesterProvider>
        </FlowProvider>
      </CustomerProvider>
    </LocaleProvider>
  )
}

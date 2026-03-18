'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFlow } from '@/contexts/FlowContext'
import { useChat } from '@/contexts/ChatContext'
import { useCustomer } from '@/contexts/CustomerContext'
import { RotateCcw } from 'lucide-react'

interface ResetMenuProps {
  variant?: 'icon' | 'compact'  // icon = button, compact = in-header
}

export function ResetMenu({ variant = 'icon' }: ResetMenuProps) {
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()
  const { dispatch: flowDispatch } = useFlow()
  const { resetChat } = useChat()
  const { dispatch: customerDispatch } = useCustomer()

  const handleRestartDemo = () => {
    // Clear flow only, keep customer name
    resetChat()
    flowDispatch({ type: 'RESET' })
    setShowMenu(false)
    router.push('/survey')
  }

  const handleNewCustomer = () => {
    // Clear flow AND customer name
    resetChat()
    flowDispatch({ type: 'RESET' })
    customerDispatch({ type: 'CLEAR_NAME' })
    setShowMenu(false)
    router.push('/')
  }

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Reset options"
          className="w-8 h-8 rounded-full border border-[#fbe9dd] bg-[#fff8f4] flex items-center justify-center touch-active"
          title="Reset options"
        >
          <RotateCcw size={14} className="text-[#f06f14]" />
        </button>

        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <div className="absolute top-10 right-0 bg-white rounded-lg shadow-lg border border-[#e8e8e6] z-50 w-48">
              <button
                onClick={handleRestartDemo}
                className="w-full px-4 py-3 text-left text-sm font-medium text-[#1f1c2f] hover:bg-[#f5f6f0] border-b border-[#e8e8e6] touch-active"
              >
                Restart Demo
              </button>
              <button
                onClick={handleNewCustomer}
                className="w-full px-4 py-3 text-left text-sm font-medium text-[#1f1c2f] hover:bg-[#f5f6f0] touch-active"
              >
                New Customer
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return null
}

import type { ChatMessage } from '@/lib/types'
import { OfferCard } from './OfferCard'

interface ChatBubbleProps {
  message: ChatMessage
  onOfferAccept?: (amount: number, installments: 1 | 2) => void
}

// Minimal markdown: bold, line breaks
function renderContent(text: string) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    // Handle newlines and bullet points
    const lines = part.split('\n')
    return lines.map((line, j) => {
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <div key={`${i}-${j}`} className="flex gap-1.5 mt-1">
            <span className="mt-0.5">•</span>
            <span>{line.slice(2)}</span>
          </div>
        )
      }
      if (line === '') return j > 0 ? <div key={`${i}-${j}`} className="h-1" /> : null
      return <span key={`${i}-${j}`}>{line}{j < lines.length - 1 ? ' ' : ''}</span>
    })
  })
}

export function ChatBubble({ message, onOfferAccept }: ChatBubbleProps) {
  if (!message.content && !message.imageUrl) return null
  const isAgent = message.role === 'agent'

  if (isAgent) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-end gap-2 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/thalia/SupportAgentWidget-Post-disbursement.svg"
            alt="Thalia"
            style={{ width: 28, height: 28, flexShrink: 0, marginBottom: 4 }}
          />
          <div
            className="max-w-[78%] text-[#314329] px-4 py-4 text-sm leading-snug"
            style={{
              background: '#FFFFFF',
              borderRadius: '16px 16px 16px 0',
              boxShadow: '0 2px 10px 0 rgba(0,0,0,0.08)',
            }}
          >
            {renderContent(message.content)}
          </div>
        </div>

        {message.isOffer && message.offerAmount && onOfferAccept && (
          <OfferCard
            amount={message.offerAmount}
            onAccept={(installments) => onOfferAccept(message.offerAmount!, installments)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex justify-end px-4 animate-fade-in">
      <div
        className="max-w-[78%] text-[#314329] px-4 py-4 text-sm leading-snug overflow-hidden"
        style={{ background: '#F5F5F0', borderRadius: '16px 16px 0 16px' }}
      >
        {message.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={message.imageUrl}
            alt="Shared photo"
            className="rounded-lg max-h-48 w-auto mb-2"
          />
        )}
        {message.content}
      </div>
    </div>
  )
}

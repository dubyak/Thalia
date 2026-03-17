import type { ChatMessage } from '@/lib/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatBubbleProps {
  message: ChatMessage
}

export function ChatBubble({ message }: ChatBubbleProps) {
  if (!message.content && !message.imageUrl) return null
  const isAgent = message.role === 'agent'

  if (isAgent) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-start gap-2 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/thalia/SupportAgentWidget.svg"
            alt="Thalia"
            style={{ width: 28, height: 28, flexShrink: 0, marginTop: 2 }}
          />
          <div className="flex-1 min-w-0 agent-markdown text-sm text-[#314329] leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
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

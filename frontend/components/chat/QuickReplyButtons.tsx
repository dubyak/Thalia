'use client'

interface QuickReplyButtonsProps {
  replies: string[]
  onSelect: (reply: string) => void
}

export function QuickReplyButtons({ replies, onSelect }: QuickReplyButtonsProps) {
  if (!replies.length) return null

  return (
    <div className="flex flex-wrap gap-3 px-4 pb-3 animate-fade-in">
      {replies.map((reply) => (
        <button
          key={reply}
          onClick={() => onSelect(reply)}
          className="text-white text-sm font-semibold touch-active active:opacity-80 transition-opacity"
          style={{ height: 44, borderRadius: 100, background: '#00A69C', padding: '8px 16px' }}
        >
          {reply}
        </button>
      ))}
    </div>
  )
}

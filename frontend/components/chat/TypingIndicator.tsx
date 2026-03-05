export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-4">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-[#1a989e] flex items-center justify-center flex-shrink-0 mb-1">
        <span className="text-white text-xs font-bold">T</span>
      </div>
      <div className="bg-white rounded-[4px_16px_16px_16px] px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#939490]"
              style={{
                animation: 'typing 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

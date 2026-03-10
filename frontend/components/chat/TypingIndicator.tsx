export function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-4 animate-fade-in">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/thalia/SupportAgentWidget-Post-disbursement.svg"
        alt="Thalia"
        style={{ width: 28, height: 28, flexShrink: 0, marginBottom: 4 }}
      />
      <div
        className="px-4 py-3"
        style={{
          background: '#FFFFFF',
          borderRadius: '16px 16px 16px 0',
          boxShadow: '0 2px 10px 0 rgba(0,0,0,0.08)',
        }}
      >
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

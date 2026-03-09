import { StatusBar } from '@/components/app-shell/StatusBar'
import { BookOpen } from 'lucide-react'

export default function LearnPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-[#f5f6f0]">
      <div className="bg-white border-b border-[#e5e5e5]">
        <StatusBar />
        <div className="px-5 py-4">
          <h1 className="text-[#1f1c2f] text-lg font-semibold">Learn</h1>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#d2f2f4] flex items-center justify-center">
          <BookOpen size={28} className="text-[#1a989e]" />
        </div>
        <p className="text-[#676d65] text-sm font-light">
          Financial education and business coaching resources — coming soon.
        </p>
      </div>
    </div>
  )
}

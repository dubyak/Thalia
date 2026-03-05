import { StatusBar } from '@/components/app-shell/StatusBar'
import { User } from 'lucide-react'

export default function ProfilePage() {
  return (
    <div className="flex flex-col min-h-dvh bg-[#f5f6f0]">
      <div className="bg-white border-b border-[#e5e5e5]">
        <StatusBar />
        <div className="px-5 py-4">
          <h1 className="text-[#1f1c2f] text-lg font-semibold">Mi perfil</h1>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#f5f6f0] flex items-center justify-center border border-[#e5e5e5]">
          <User size={28} className="text-[#676d65]" />
        </div>
        <p className="text-[#676d65] text-sm font-light">
          Información de cuenta y configuración — próximamente.
        </p>
      </div>
    </div>
  )
}

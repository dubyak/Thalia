'use client'

import { memo, useEffect, useState } from 'react'
import { Signal, Wifi, Battery } from 'lucide-react'

export const StatusBar = memo(function StatusBar({ dark = false }: { dark?: boolean }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      )
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const textColor = dark ? 'text-white' : 'text-[#1f1c2f]'

  return (
    <div
      className={`flex items-center justify-between px-5 pt-2 pb-1 h-[44px] ${textColor}`}
      style={{ fontSize: '12px', fontWeight: 600 }}
    >
      <span className="font-semibold tracking-tight">{time}</span>
      <div className="flex items-center gap-1">
        <Signal size={14} strokeWidth={2.5} />
        <Wifi size={14} strokeWidth={2.5} />
        <Battery size={14} strokeWidth={2.5} />
      </div>
    </div>
  )
})

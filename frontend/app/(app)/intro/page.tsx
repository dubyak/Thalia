'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useFlow } from '@/contexts/FlowContext'
import { StatusBar } from '@/components/app-shell/StatusBar'

const SLIDES = [
  {
    image: '/thalia/Thalia-onboarding-screen-1.png',
    title: "Hi! I'm Thalía, your business assistant",
    desc: "I'm here to help you get your money quickly and easily.",
    hasPrivacy: false,
  },
  {
    image: '/thalia/Thalia-onboarding-screen-2.png',
    title: 'Grow your business with me',
    desc: 'Get tips to improve your sales and help your business move forward.',
    hasPrivacy: false,
  },
  {
    image: '/thalia/Thalia-onboarding-screen-3.png',
    title: "I'll be your partner every step of the way",
    desc: 'I can help you manage your loan and adjust your payments if you ever need help.',
    hasPrivacy: false,
  },
  {
    image: '/thalia/Thalia-onboarding-screen-4.png',
    title: 'Shall we chat so you can get your loan?',
    desc: 'Chatting with me is 100% secure. Your safety and trust are my top priority.',
    hasPrivacy: true,
  },
]

export default function IntroPage() {
  const [slide, setSlide] = useState(0)
  const { dispatch } = useFlow()
  const router = useRouter()

  const isLast = slide === SLIDES.length - 1
  const current = SLIDES[slide]

  const handleNext = () => {
    if (isLast) {
      dispatch({ type: 'MSME_OPT_IN' })
      router.push('/onboarding')
    } else {
      setSlide((s) => s + 1)
    }
  }

  const handleSkip = () => {
    dispatch({ type: 'SURVEY_COMPLETE', choice: 'personal' })
    router.push('/home')
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      <StatusBar />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <Image
          src={current.image}
          alt="Thalia"
          width={208}
          height={195}
          className="mb-6 object-contain"
          priority
        />

        <h2
          className="font-semibold text-2xl text-center w-full mb-3"
          style={{ color: '#314329', alignSelf: 'stretch' }}
        >
          {current.title}
        </h2>

        <p
          className="text-sm text-center"
          style={{ color: '#314329', width: 328, lineHeight: '16px' }}
        >
          {current.desc}
        </p>

        {/* Privacy card — slide 4 only */}
        {current.hasPrivacy && (
          <div
            className="mt-6 w-full flex flex-col gap-2 text-left"
            style={{
              maxWidth: 328,
              background: '#D2F2F4',
              borderRadius: 16,
              padding: '12px 16px 16px',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🌿</span>
              <p className="text-sm font-semibold" style={{ color: '#314329' }}>
                About your privacy
              </p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#314329' }}>
              Tala prioritizes the privacy of your data. The information you share is confidential.
            </p>
            <button className="text-xs font-semibold text-left touch-active" style={{ color: '#00A69C' }}>
              View Privacy Policy
            </button>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="px-6 pb-10 flex flex-col items-center gap-3">
        {/* Progress dots */}
        <div className="flex gap-2 mb-2">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === slide ? 20 : 8,
                height: 8,
                background: i === slide ? '#F06F14' : '#D5D5D5',
              }}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="text-white font-bold text-base touch-active active:opacity-80"
          style={{
            width: 312,
            height: 44,
            borderRadius: 100,
            background: '#F06F14',
          }}
        >
          {isLast ? "Let's go" : 'Next'}
        </button>

        {isLast ? (
          <button
            onClick={handleSkip}
            className="text-sm font-medium py-1 touch-active"
            style={{ color: '#757575' }}
          >
            Not now
          </button>
        ) : (
          <div className="h-6" />
        )}
      </div>
    </div>
  )
}

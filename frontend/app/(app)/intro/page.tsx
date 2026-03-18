'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useFlow } from '@/contexts/FlowContext'
import { StatusBar } from '@/components/app-shell/StatusBar'
import { useTranslation } from '@/lib/i18n/useTranslation'

export default function IntroPage() {
  const [slide, setSlide] = useState(0)
  const { dispatch } = useFlow()
  const router = useRouter()
  const { t } = useTranslation()

  const SLIDES = [
    {
      image: '/thalia/Thalia-onboarding-screen-1.png',
      title: t('intro.slide1Title'),
      desc: t('intro.slide1Desc'),
      hasPrivacy: false,
    },
    {
      image: '/thalia/Thalia-onboarding-screen-2.png',
      title: t('intro.slide2Title'),
      desc: t('intro.slide2Desc'),
      hasPrivacy: false,
    },
    {
      image: '/thalia/Thalia-onboarding-screen-3.png',
      title: t('intro.slide3Title'),
      desc: t('intro.slide3Desc'),
      hasPrivacy: false,
    },
    {
      image: '/thalia/Thalia-onboarding-screen-4.png',
      title: t('intro.slide4Title'),
      desc: t('intro.slide4Desc'),
      hasPrivacy: true,
    },
  ]

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
                {t('intro.privacyTitle')}
              </p>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#314329' }}>
              {t('intro.privacyDesc')}
            </p>
            <button className="text-xs font-semibold text-left touch-active" style={{ color: '#00A69C' }}>
              {t('intro.privacyLink')}
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
          {isLast ? t('intro.letsGo') : t('intro.next')}
        </button>

        {isLast ? (
          <button
            onClick={handleSkip}
            className="text-sm font-medium py-1 touch-active"
            style={{ color: '#757575' }}
          >
            {t('intro.notNow')}
          </button>
        ) : (
          <div className="h-6" />
        )}
      </div>
    </div>
  )
}

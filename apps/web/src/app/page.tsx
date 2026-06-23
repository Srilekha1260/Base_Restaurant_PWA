'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navbar from '@/components/layout/Navbar'
import HeroSection from '@/components/sections/HeroSection'
import MenuPreviewSection from '@/components/sections/MenuPreviewSection'
import OrderOptionsSection from '@/components/sections/OrderOptionsSection'
import BookingSection from '@/components/sections/BookingSection'
import AboutSection from '@/components/sections/AboutSection'
import Footer from '@/components/layout/Footer'

gsap.registerPlugin(ScrollTrigger)

export default function HomePage() {
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // If navigating to a hash anchor (e.g. /#booking), immediately make all
    // section-animate elements visible so the target section isn't hidden by
    // GSAP's initial opacity:0 when the browser scrolls to it.
    if (window.location.hash) {
      const els = document.querySelectorAll<HTMLElement>('.section-animate')
      els.forEach(el => {
        el.style.opacity = '1'
        el.style.transform = 'none'
      })
    }

    const ctx = gsap.context(() => {
      // Animate all sections with scroll trigger
      gsap.utils.toArray<HTMLElement>('.section-animate').forEach(el => {
        // Skip elements already made visible by hash navigation above
        if (window.location.hash && el.style.opacity === '1') return
        gsap.fromTo(
          el,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              once: true,
            },
          },
        )
      })
    }, mainRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={mainRef} className="min-h-screen">
      <Navbar />
      <HeroSection />
      <div className="section-animate"><MenuPreviewSection /></div>
      <div className="section-animate"><OrderOptionsSection /></div>
      <div className="section-animate"><BookingSection /></div>
      <div className="section-animate"><AboutSection /></div>
      <Footer />
    </div>
  )
}

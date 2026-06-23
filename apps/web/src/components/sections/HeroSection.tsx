'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.fromTo(titleRef.current, { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 1.2 })
      .fromTo(subtitleRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
      .fromTo(ctaRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #2d1a1a 100%)',
      }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-600 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <p className="text-red-400 text-sm uppercase tracking-[0.3em] mb-6 font-medium">
          Fine Dining · Auckland, New Zealand
        </p>

        <h1
          ref={titleRef}
          className="text-5xl sm:text-6xl md:text-8xl font-heading font-bold text-white leading-tight mb-6"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Demo
          <br />
          <span className="text-red-500">Restaurant</span>
        </h1>

        <p
          ref={subtitleRef}
          className="text-base sm:text-xl md:text-2xl text-stone-300 mb-10 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-2"
        >
          An unforgettable culinary journey crafted with the finest local ingredients.
          Reserve your table tonight.
        </p>

        <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#booking"
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-full transition-all hover:scale-105 text-lg"
          >
            Reserve a Table
          </a>
          <a
            href="#order"
            className="px-8 py-4 border border-stone-600 hover:border-red-500 text-stone-300 hover:text-white font-medium rounded-full transition-all hover:scale-105 text-lg"
          >
            Order Now
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-stone-500">
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-stone-500 to-transparent animate-pulse" />
      </div>
    </section>
  )
}

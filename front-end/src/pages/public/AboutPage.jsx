import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const AboutPage = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const showcaseImages = [
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1400&q=80'
  ];

  const rules = [
    {
      icon: 'schedule',
      title: 'ARRIVE 10 MINUTES EARLY',
      description: 'Please arrive at the arena at least 10 minutes prior to your booked slot.'
    },
    {
      icon: 'timer',
      title: 'BE ON TIME',
      description: 'Strictly follow your scheduled time slot and vacate the turf promptly when your session ends.'
    },
    {
      icon: 'event_busy',
      title: 'CANCELLATIONS',
      description: 'Cancellations must be made at least 2 hours prior to the slot. Cancellations within 2 hours are not accepted.'
    },
    {
      icon: 'payments',
      title: 'ADVANCE PAYMENT NOT REFUNDABLE',
      description: 'The advance payment made during booking is strictly non-refundable.'
    }
  ];

  // Auto-slide carousel effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % showcaseImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [showcaseImages.length]);

  return (
    <div className="space-y-20 pb-20 animate-fade-in text-on-surface">
      
      {/* 1. EDITORIAL HERO HEADLINE */}
      <section className="bg-slate-950 text-white py-20 -mt-20 pt-28 border-b border-white/10 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
            OUR MOTIVATION
          </span>
          <h1 className="font-extrabold text-4xl sm:text-6xl uppercase tracking-tight">
            BUILT FOR A <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">BETTER ALANGUDI</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Our goal is to bring a modern multi-sport and celebration space to Alangudi for everyone.
          </p>
        </div>
      </section>

      {/* 2. PREMIUM MULTI-IMAGE CAROUSEL SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-black/10 aspect-[16/9] md:aspect-[21/9] group">
          {showcaseImages.map((imgUrl, idx) => (
            <div 
              key={idx}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img 
                src={imgUrl} 
                alt={`Alangudi Aadukalam Arena ${idx + 1}`} 
                className="w-full h-full object-cover brightness-[0.88]"
              />
            </div>
          ))}

          {/* Carousel Manual Controls */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev === 0 ? showcaseImages.length - 1 : prev - 1))}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-slate-950/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 hover:bg-emerald-500 hover:text-slate-950 transition-all opacity-80 group-hover:opacity-100"
            aria-label="Previous Slide"
          >
            <span className="material-symbols-outlined text-2xl">chevron_left</span>
          </button>

          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % showcaseImages.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-slate-950/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 hover:bg-emerald-500 hover:text-slate-950 transition-all opacity-80 group-hover:opacity-100"
            aria-label="Next Slide"
          >
            <span className="material-symbols-outlined text-2xl">chevron_right</span>
          </button>

          {/* Progress Indicators */}
          <div className="absolute top-6 right-6 z-20 flex gap-2">
            {showcaseImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlide ? 'w-8 bg-emerald-400' : 'w-2 bg-white/40'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 3. RULES & REGULATIONS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
            PLAY FAIR TOGETHER
          </span>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-slate-900 uppercase tracking-tight">
            RULES & REGULATIONS
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Help us maintain a safe, fair, and enjoyable experience for everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-7 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center space-y-4 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <span className="material-symbols-outlined text-2xl">{rule.icon}</span>
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
                  Rule 0{idx + 1}
                </span>
                <h3 className="font-bold text-base text-slate-900 uppercase tracking-tight">
                  {rule.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {rule.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Final CTA Button */}
        <div className="pt-12 text-center">
          <button
            onClick={() => navigate(ROUTES.BOOKING)}
            className="group inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm uppercase tracking-wider px-9 py-4 rounded-full shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.03] active:scale-95 transition-all duration-300"
          >
            <span>BOOK YOUR SLOT</span>
            <span className="material-symbols-outlined text-lg group-hover:translate-x-1.5 transition-transform duration-300">arrow_forward</span>
          </button>
        </div>
      </section>

    </div>
  );
};

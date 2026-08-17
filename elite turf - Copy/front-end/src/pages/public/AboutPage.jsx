import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const AboutPage = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const showcaseImages = [
    {
      url: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1400&q=80',
      title: 'FIFA-Grade Artificial Turf',
      subtitle: '50mm shock-padded turf for zero knee stress & perfect ball speed'
    },
    {
      url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1400&q=80',
      title: '500-Lux Pro Floodlights',
      subtitle: 'Glare-free night lighting for 24/7 match action'
    },
    {
      url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1400&q=80',
      title: 'High-Netting Box Cricket',
      subtitle: 'Enclosed arena with high-velocity bounce control'
    },
    {
      url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1400&q=80',
      title: 'Team Lounges & Facilities',
      subtitle: 'Air-conditioned changing rooms and spectator dugouts'
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
    <div className="space-y-24 pb-20 animate-fade-in text-on-surface">
      
      {/* 1. EDITORIAL HERO HEADLINE */}
      <section className="bg-slate-950 text-white py-20 -mt-20 pt-28 border-b border-white/10 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
            THE ARENA STORY
          </span>
          <h1 className="font-extrabold text-4xl sm:text-6xl uppercase tracking-tight">
            ENGINEERED FOR <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">ATHLETIC EXCELLENCE</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Built for football enthusiasts, box cricket leagues, and community tournaments who demand uncompromised turf quality and seamless 24/7 online scheduling.
          </p>
        </div>
      </section>

      {/* 2. PREMIUM MULTI-IMAGE CAROUSEL SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-black/10 aspect-[16/9] md:aspect-[21/9] group">
          {showcaseImages.map((slide, idx) => (
            <div 
              key={idx}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img 
                src={slide.url} 
                alt={slide.title} 
                className="w-full h-full object-cover brightness-[0.4]"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent text-white space-y-2">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">ARENA SHOWCASE</span>
                <h3 className="font-extrabold text-2xl sm:text-3xl uppercase tracking-tight">{slide.title}</h3>
                <p className="text-xs sm:text-sm text-slate-300">{slide.subtitle}</p>
              </div>
            </div>
          ))}

          {/* Carousel Manual Controls */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev === 0 ? showcaseImages.length - 1 : prev - 1))}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-slate-950/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 hover:bg-emerald-500 hover:text-slate-950 transition-all opacity-80 group-hover:opacity-100"
          >
            <span className="material-symbols-outlined text-2xl">chevron_left</span>
          </button>

          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % showcaseImages.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-slate-950/70 text-white flex items-center justify-center backdrop-blur-md border border-white/20 hover:bg-emerald-500 hover:text-slate-950 transition-all opacity-80 group-hover:opacity-100"
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
              />
            ))}
          </div>
        </div>
      </section>

      {/* 3. METRIC HIGHLIGHTS & EDITORIAL SPECS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-6 bg-white rounded-3xl border border-black/5 shadow-sm space-y-1">
            <span className="font-extrabold text-3xl sm:text-4xl text-emerald-600 block">50mm</span>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">FIFA Grade Turf</span>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-black/5 shadow-sm space-y-1">
            <span className="font-extrabold text-3xl sm:text-4xl text-emerald-600 block">500-Lux</span>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Pro Stadium LEDs</span>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-black/5 shadow-sm space-y-1">
            <span className="font-extrabold text-3xl sm:text-4xl text-emerald-600 block">24 / 7</span>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Round-the-Clock</span>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-black/5 shadow-sm space-y-1">
            <span className="font-extrabold text-3xl sm:text-4xl text-emerald-600 block">100%</span>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Instant Confirmation</span>
          </div>
        </div>
      </section>

      {/* 4. ALTERNATING STORY LAYOUT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">ENGINEERED CUSHIONING</span>
            <h2 className="font-extrabold text-3xl uppercase tracking-tight">HIGH-DENSITY SHOCK PAD TURF</h2>
            <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
              Elite Pitch features top-tier 50mm monofilament artificial grass with silica sand and rubber granule infill, engineered for superior ball roll speed and maximum knee shock absorption.
            </p>
            <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
              Whether you are scheduling a midnight 5v5 friendly or organizing a corporate weekend tournament, our surface maintains consistent traction and zero bounce irregularities.
            </p>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-xl border border-black/5 aspect-video md:aspect-square">
            <img 
              src="https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1000&q=80" 
              alt="Turf Surface Quality" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 rounded-3xl overflow-hidden shadow-xl border border-black/5 aspect-video md:aspect-square">
            <img 
              src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=80" 
              alt="Night Lighting Arena" 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="order-1 md:order-2 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">STADIUM EXPERIENCE</span>
            <h2 className="font-extrabold text-3xl uppercase tracking-tight">PRO NIGHT LIGHTING & LOUNGES</h2>
            <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
              Equipped with 500-lux pro LED floodlights, shaded player dugouts, and air-conditioned changing facilities, Elite Pitch turns every casual match into a stadium experience.
            </p>
            <button 
              onClick={() => navigate(ROUTES.BOOKING)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-8 py-4 rounded-full shadow-lg shadow-emerald-600/25 transition-all"
            >
              RESERVE YOUR MATCH
            </button>
          </div>
        </div>

      </section>

    </div>
  );
};

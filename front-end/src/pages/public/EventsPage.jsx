import React from 'react';
import { useBooking } from '../../context/BookingContext';

export const EventsPage = () => {
  const { events } = useBooking();

  const featuredEvent = events.length > 0 ? events[0] : null;
  const secondaryEvents = events.length > 1 ? events.slice(1) : [];

  return (
    <div className="space-y-16 pb-20 animate-fade-in text-on-surface">
      
      {/* 1. EDITORIAL HERO HEADLINE */}
      <section className="bg-slate-950 text-white py-20 -mt-20 pt-28 border-b border-white/10 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
            ARENA SHOWCASE
          </span>
          <h1 className="font-extrabold text-4xl sm:text-6xl uppercase tracking-tight">
            EVENTS THAT BRING THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">ARENA ALIVE</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Highlights from recent tournaments, corporate cups, midnight friendlies, and academy championships hosted on our FIFA-grade turf.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* 2. VISUALLY DOMINANT SPOTLIGHT FEATURED EVENT */}
        {featuredEvent && (
          <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-0 group">
            <div className="lg:col-span-7 relative min-h-[300px] lg:min-h-[420px] overflow-hidden">
              <img 
                src={featuredEvent.image} 
                alt={featuredEvent.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 brightness-95"
              />
              <div className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-lg">
                Featured Event
              </div>
            </div>

            <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs font-mono font-bold text-emerald-600">
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                  <span>{new Date(featuredEvent.date).toISOString().split('T')[0]}</span>
                  <span className="text-black/20">•</span>
                  <span className="uppercase text-slate-500">{featuredEvent.category || 'Tournament'}</span>
                </div>

                <h2 className="font-extrabold text-2xl sm:text-3xl text-on-surface uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                  {featuredEvent.title}
                </h2>

                <p className="text-on-surface-variant text-sm sm:text-base leading-relaxed">
                  {featuredEvent.description}
                </p>
              </div>

              <div className="pt-4 border-t border-black/5 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                  Status: Completed
                </span>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1.5 transition-all">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. SUPPORTING EVENTS GRID */}
        {secondaryEvents.length > 0 && (
          <div className="space-y-6">
            <h3 className="font-extrabold text-2xl uppercase tracking-tight text-on-surface border-l-4 border-emerald-600 pl-4">
              More Arena Tournaments & Leagues
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {secondaryEvents.map((event) => (
                <div 
                  key={event.id || event._id} 
                  className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="relative h-52 overflow-hidden">
                    <img 
                      src={event.image} 
                      alt={event.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-95"
                    />
                    <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                      Completed
                    </div>
                  </div>

                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-600">
                        <span className="material-symbols-outlined text-base">calendar_month</span>
                        <span>{new Date(event.date).toISOString().split('T')[0]}</span>
                      </div>
                      <h4 className="font-bold text-lg text-on-surface group-hover:text-emerald-600 transition-colors">{event.title}</h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{event.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

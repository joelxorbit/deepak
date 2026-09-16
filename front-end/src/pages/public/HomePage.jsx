import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import headerBgVideo from '../../assets/header bg video.mp4';
import { getPublicEventsService } from '../../services/eventService';
import { getSportsService } from '../../services/sportService';

export const HomePage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [sportsList, setSportsList] = useState([]);
  const [loadingSports, setLoadingSports] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getPublicEventsService();
        if (Array.isArray(data)) setEvents(data);
      } catch (err) {
        console.warn('Failed to fetch events', err);
      }
    };

    const fetchSports = async () => {
      try {
        setLoadingSports(true);
        const data = await getSportsService();
        if (Array.isArray(data) && data.length > 0) {
          setSportsList(data);
        }
      } catch (err) {
        console.warn('Failed to fetch sports', err);
      } finally {
        setLoadingSports(false);
      }
    };

    fetchEvents();
    fetchSports();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(e => {
    if (e.isArchived || e.isPublished === false) return false;
    // An event is Upcoming if its category/status is Upcoming AND the date hasn't passed
    if ((e.status === 'Upcoming' || e.category === 'Upcoming') && e.date >= todayStr) return true;
    if (e.category !== 'COMPLETED' && e.category !== 'Completed' && e.status !== 'Completed' && e.date >= todayStr) return true;
    return false;
  });

  const completedEvents = events.filter(e => {
    if (e.isArchived || e.isPublished === false) return false;
    return e.status === 'Completed' || e.category === 'COMPLETED' || e.category === 'Completed' || e.date < todayStr;
  });

  useEffect(() => {
    if (upcomingEvents.length === 0 && completedEvents.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % completedEvents.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [upcomingEvents.length, completedEvents.length]);

  const amenities = [
    {
      icon: 'wb_sunny',
      title: 'Professional LED Floodlights',
      description: 'Bright, high-quality LED lighting for clear visibility and comfortable night play.'
    },
    {
      icon: 'sports_cricket',
      title: 'Sports Equipment Provided',
      description: 'Essential sports equipment including bats, balls, and other game accessories provided for players.'
    },
    {
      icon: 'local_parking',
      title: 'Free Parking & Drinking Water',
      description: 'Convenient free parking and clean drinking water available for players and guests.'
    },
    {
      icon: 'schedule',
      title: '24/7 Availability',
      description: 'Book your preferred slot anytime with flexible day and night availability.'
    }
  ];

  return (
    <div className="space-y-24 pb-20">

      {/* 1. FULL-BLEED CINEMATIC HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-1000 -mt-20 pt-20">

        {/* Full-bleed background video with cinematic gradient vignette */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover object-center brightness-[0.65] scale-150"
          >
            <source src={headerBgVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-1000 via-slate-1000/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-1000/60 via-transparent to-slate-1000/40" />
        </div>

        {/* Hero Editorial Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 py-20 animate-fade-in">

          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-label-bold text-xs uppercase tracking-widest backdrop-blur-md shadow-lg shadow-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            ALANGUDI AADUKALAM SPORTS ARENA
          </div>

          <h1 className="font-extrabold text-4xl sm:text-6xl md:text-7xl lg:text-[80px] leading-[1.05] text-white tracking-tight uppercase drop-shadow-2xl">
            ALANGUDI’S FIRST <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
              MULTI-SPORT
            </span> ARENA
          </h1>

          <p className="text-slate-300 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-normal">
            One Arena. Every Game. All Year Round
          </p>

          {/* Unified Motion Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate(ROUTES.BOOKING)}
              className="group w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-full shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.03] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>BOOK YOUR SLOT</span>
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1.5 transition-transform duration-300">arrow_forward</span>
            </button>

            <button
              onClick={() => navigate(ROUTES.ABOUT)}
              className="group w-full sm:w-auto bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-full hover:scale-[1.03] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>EXPLORE FACILITIES</span>
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1.5 transition-transform duration-300">north_east</span>
            </button>
          </div>
        </div>
      </section>

      {/* EVENT BANNER SECTION */}
      <section className="max-w-7xl xl:max-w-[1380px] 2xl:max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 md:-mt-14 relative z-20">
        <div
          onClick={() => navigate(ROUTES.EVENTS)}
          className="bg-white rounded-3xl sm:rounded-[32px] shadow-2xl shadow-emerald-950/8 border border-black/5 overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-emerald-950/15"
        >
          {upcomingEvents.length > 0 ? (
            <div className="flex flex-col md:flex-row items-stretch">
              <div className="w-full md:w-[42%] lg:w-[40%] xl:w-[38%] min-h-[280px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[400px] relative overflow-hidden flex-shrink-0">
                <img
                  src={upcomingEvents[0].image || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'}
                  alt={upcomingEvents[0].title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'; }}
                />
                <div className="absolute top-5 left-5 bg-emerald-600/95 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 z-10">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                  Upcoming Event
                </div>
              </div>
              <div className="flex-1 p-6 sm:p-10 lg:p-12 xl:p-14 flex flex-col justify-center space-y-4 sm:space-y-5 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-semibold relative z-10">
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200/60 font-mono shadow-xs">
                    <span className="material-symbols-outlined text-base text-emerald-600">calendar_month</span>
                    <span>{upcomingEvents[0].date ? upcomingEvents[0].date.split('T')[0] : ''}</span>
                  </span>
                  {upcomingEvents[0].startTime && (
                    <span className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/60 font-sans shadow-xs">
                      <span className="material-symbols-outlined text-base text-slate-500">schedule</span>
                      <span>{upcomingEvents[0].startTime} - {upcomingEvents[0].endTime}</span>
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight leading-[1.15] group-hover:text-emerald-600 transition-colors relative z-10 capitalize">
                  {upcomingEvents[0].title}
                </h3>

                <p className="text-base sm:text-lg text-slate-600 leading-relaxed line-clamp-3 max-w-2xl relative z-10">
                  {upcomingEvents[0].description}
                </p>

                <div className="pt-3 relative z-10">
                  <span className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-600 group-hover:text-emerald-700 uppercase tracking-wider transition-colors">
                    <span>View Event Details</span>
                    <span className="material-symbols-outlined text-base sm:text-lg group-hover:translate-x-1.5 transition-transform duration-300">arrow_forward</span>
                  </span>
                </div>
              </div>
            </div>
          ) : completedEvents.length > 0 ? (
            <div className="flex flex-col md:flex-row items-stretch">
              <div className="w-full md:w-[42%] lg:w-[40%] xl:w-[38%] min-h-[280px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[400px] relative overflow-hidden flex-shrink-0">
                <img
                  src={completedEvents[currentSlide]?.image || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'}
                  alt={completedEvents[currentSlide]?.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 animate-fade-in"
                  key={currentSlide}
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'; }}
                />
                <div className="absolute top-5 left-5 bg-slate-800/90 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg">
                  Past Event Showcase
                </div>
              </div>
              <div className="flex-1 p-6 sm:p-10 lg:p-12 xl:p-14 flex flex-col justify-center space-y-4 sm:space-y-5 relative overflow-hidden min-h-[240px]">
                <div className="flex items-center gap-3 text-xs sm:text-sm font-semibold relative z-10 animate-fade-in" key={`date-${currentSlide}`}>
                  <span className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/60 font-mono shadow-xs">
                    <span className="material-symbols-outlined text-base text-slate-500">calendar_month</span>
                    <span>{completedEvents[currentSlide]?.date ? completedEvents[currentSlide]?.date.split('T')[0] : ''}</span>
                  </span>
                </div>
                <h3 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight leading-[1.15] group-hover:text-emerald-600 transition-colors relative z-10 animate-fade-in capitalize" key={`title-${currentSlide}`}>
                  {completedEvents[currentSlide]?.title}
                </h3>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed line-clamp-3 max-w-2xl relative z-10 animate-fade-in" key={`desc-${currentSlide}`}>
                  {completedEvents[currentSlide]?.description}
                </p>

                {completedEvents.length > 1 && (
                  <div className="absolute bottom-6 right-8 flex gap-1.5 z-20">
                    {completedEvents.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-emerald-500' : 'w-2 bg-slate-300'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-stretch bg-slate-900 text-white">
              <div className="w-full md:w-[42%] lg:w-[40%] xl:w-[38%] min-h-[280px] sm:min-h-[320px] md:min-h-[360px] lg:min-h-[400px] relative overflow-hidden bg-emerald-950 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-8xl text-emerald-500/40 group-hover:scale-110 transition-transform duration-500">sports_soccer</span>
              </div>
              <div className="flex-1 p-6 sm:p-10 lg:p-12 xl:p-14 flex flex-col justify-center space-y-4 sm:space-y-5 relative overflow-hidden">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20 w-fit">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Tournaments & Showcases
                </div>
                <h3 className="font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight leading-[1.15] group-hover:text-emerald-400 transition-colors relative z-10">
                  Arena Events & Leagues
                </h3>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed line-clamp-3 max-w-2xl relative z-10">
                  Discover upcoming tournaments, showcases, and open leagues. Click here to explore our event calendar.
                </p>
                <div className="pt-3 relative z-10">
                  <span className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-bold text-emerald-400 group-hover:text-emerald-300 uppercase tracking-wider transition-colors">
                    <span>Explore Events</span>
                    <span className="material-symbols-outlined text-base sm:text-lg group-hover:translate-x-1.5 transition-transform duration-300">arrow_forward</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. SPORTS & EVENTS WE HOST SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
            ALANGUDI’S FIRST MULTI-SPORT ARENA
          </span>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-on-surface uppercase tracking-tight">SPORTS & EVENTS WE HOST</h2>
          <p className="text-on-surface-variant max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Sports, celebrations, and events — all in one arena.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loadingSports && sportsList.length === 0 ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm p-0 animate-pulse flex flex-col justify-between"
              >
                <div className="h-52 bg-slate-200" />
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200" />
                    <div className="h-5 w-40 bg-slate-200 rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-slate-200 rounded" />
                    <div className="h-3 w-4/5 bg-slate-200 rounded" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            sportsList.map((sport, index) => (
              <div
                key={sport.id || sport._id || index}
                className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={sport.image || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80'}
                    alt={sport.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-95"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  {sport.tag && (
                    <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                      {sport.tag}
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-emerald-600">
                      <span className="material-symbols-outlined text-2xl">{sport.icon || 'sports'}</span>
                      <h3 className="font-bold text-lg text-on-surface">{sport.title}</h3>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {sport.description}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 3. WORLD-CLASS AMENITIES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-950 text-white rounded-3xl p-8 sm:p-14 border border-white/10 shadow-2xl space-y-12">

          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
              PREMIUM FACILITIES
            </span>
            <h2 className="font-extrabold text-3xl sm:text-4xl uppercase tracking-tight">WORLD-CLASS AMENITIES</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">Everything you need for a complete sports experience.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {amenities.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900/60 p-6 sm:p-7 rounded-2xl border border-white/5 hover:border-emerald-500/40 hover:bg-slate-900 transition-all duration-300 space-y-4 group flex flex-col items-center text-center justify-start"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform shadow-inner shadow-emerald-500/10">
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                </div>
                <h3 className="font-bold text-base text-white">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HIGH-CONVERSION FINAL CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-slate-900 rounded-3xl p-8 sm:p-14 flex flex-col md:flex-row items-center justify-between gap-8 text-white shadow-2xl border border-emerald-500/30 relative overflow-hidden">

          <div className="space-y-3 text-center md:text-left relative z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-200 bg-white/10 px-3.5 py-1 rounded-full">
              INSTANT CONFIRMATION
            </span>
            <h2 className="font-extrabold text-3xl sm:text-4xl uppercase tracking-tight">READY TO PLAY YOUR NEXT MATCH?</h2>
            <p className="text-emerald-100 max-w-lg text-sm sm:text-base leading-relaxed">Check real-time slot availability and reserve your turf in under 60 seconds.</p>
          </div>

          <button
            onClick={() => navigate(ROUTES.BOOKING)}
            className="group bg-white text-slate-950 font-extrabold text-sm uppercase tracking-wider px-8 py-4 rounded-full shadow-2xl hover:bg-emerald-400 hover:scale-105 transition-all duration-300 shrink-0 flex items-center gap-2 relative z-10"
          >
            <span>CHECK AVAILABLE SLOTS</span>
            <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">calendar_month</span>
          </button>
        </div>
      </section>

    </div>
  );
};

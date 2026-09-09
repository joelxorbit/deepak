import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import headerBgVideo from '../../assets/header bg video.mp4';
import { getPublicEventsService } from '../../services/eventService';

export const HomePage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
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
    fetchEvents();
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(e => {
    if (e.isArchived || e.isPublished === false) return false;
    if (e.status === 'Upcoming') return true;
    if (e.category !== 'COMPLETED' && e.category !== 'Completed' && e.status !== 'Completed' && e.date >= todayStr) return true;
    return false;
  });
  
  const completedEvents = events.filter(e => {
    if (e.isArchived || e.isPublished === false) return false;
    return e.status === 'Completed' || e.category === 'COMPLETED' || e.category === 'Completed' || (e.date < todayStr && e.status !== 'Upcoming');
  });

  useEffect(() => {
    if (upcomingEvents.length === 0 && completedEvents.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % completedEvents.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [upcomingEvents.length, completedEvents.length]);

  const sportsList = [
    {
      title: '5-a-Side & 7-a-Side Football',
      icon: 'sports_soccer',
      tag: 'FIFA Approved Turf',
      image: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
      description: 'High-density 50mm FIFA artificial turf with shock-pad underlay designed for maximum traction and knee protection.'
    },
    {
      title: 'High-Speed Box Cricket',
      icon: 'sports_cricket',
      tag: 'Enclosed Arena',
      image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=800&q=80',
      description: 'High-netting enclosed pitch with bounce-controlled turf for competitive box cricket matches and night tournaments.'
    },
    {
      title: 'Fast-Paced Futsal',
      icon: 'sports_football',
      tag: 'Pro Boundary',
      image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
      description: 'Compact, boundary-enclosed setup optimized for technical dribbling, quick passes, and high-intensity scrimmage.'
    },
    {
      title: 'Turf Hockey & Practice',
      icon: 'sports_hockey',
      tag: 'Precision Surface',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
      description: 'Consistent ball-roll surface for field hockey practice sessions, passing drills, and mini tournament matches.'
    },
    {
      title: 'Coaching & Academies',
      icon: 'sports',
      tag: 'Morning & Evening',
      image: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80',
      description: 'Dedicated slot reservations for youth football academies, sports academies, and professional fitness bootcamps.'
    },
    {
      title: 'Private Matches & Events',
      icon: 'celebration',
      tag: 'Lounge Reserved',
      image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
      description: 'Private arena reservations featuring changing lounge access, team seating, and tournament scorekeeping setup.'
    }
  ];

  const amenities = [
    {
      icon: 'sports_soccer',
      title: '50mm FIFA Turf Grade',
      description: 'High-density artificial grass with rubber infill and shock-pad underlay for optimal ball bounce and joint protection.'
    },
    {
      icon: 'wb_sunny',
      title: '500-Lux Stadium LEDs',
      description: 'Uniform glare-free pro illumination providing shadow-free visibility for high-intensity night matches.'
    },
    {
      icon: 'local_parking',
      title: 'Locker & Free Parking',
      description: 'Air-conditioned player changing rooms, clean shower facilities, and dedicated parking space for players.'
    },
    {
      icon: 'schedule',
      title: '24/7 Availability',
      description: 'Round-the-clock slot reservations under pro floodlights with instant online booking confirmation.'
    }
  ];

  return (
    <div className="space-y-24 pb-20">
      
      {/* 1. FULL-BLEED CINEMATIC HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-950 -mt-20 pt-20">
        
        {/* Full-bleed background video with cinematic gradient vignette */}
        <div className="absolute inset-0 z-0">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover object-center brightness-[0.65] scale-105"
          >
            <source src={headerBgVideo} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/40" />
        </div>

        {/* Hero Editorial Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 py-20 animate-fade-in">
          
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-label-bold text-xs uppercase tracking-widest backdrop-blur-md shadow-lg shadow-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            ELITE PITCH SPORTS ARENA
          </div>
          
          <h1 className="font-extrabold text-4xl sm:text-6xl md:text-7xl lg:text-[80px] leading-[1.05] text-white tracking-tight uppercase drop-shadow-2xl">
            THE ULTIMATE <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
              MULTI-SPORT
            </span> TURF EXPERIENCE
          </h1>
          
          <p className="text-slate-300 text-base sm:text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-normal">
            Book top-tier Football, Box Cricket, Futsal, and Private Events with 500-lux pro LED floodlights and instant online slot confirmation.
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div 
          onClick={() => navigate(ROUTES.EVENTS)}
          className="bg-white rounded-3xl shadow-2xl shadow-emerald-900/5 border border-black/5 overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-emerald-900/10"
        >
          {upcomingEvents.length > 0 ? (
              <div className="flex flex-col md:flex-row items-stretch">
                <div className="w-full md:w-1/3 h-48 md:h-auto relative overflow-hidden">
                  <img 
                    src={upcomingEvents[0].image || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'} 
                    alt={upcomingEvents[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'; }}
                  />
                  <div className="absolute top-4 left-4 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                    Upcoming Event
                  </div>
                </div>
                <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center space-y-4 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                  <div className="flex items-center gap-3 text-xs font-mono font-bold text-emerald-600 relative z-10">
                    <span className="material-symbols-outlined text-base">calendar_month</span>
                    <span>{upcomingEvents[0].date ? upcomingEvents[0].date.split('T')[0] : ''}</span>
                    {upcomingEvents[0].startTime && (
                      <>
                        <span className="text-black/20">•</span>
                        <span className="text-slate-500 font-sans">{upcomingEvents[0].startTime} - {upcomingEvents[0].endTime}</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-extrabold text-2xl sm:text-3xl text-slate-900 group-hover:text-emerald-600 transition-colors relative z-10">
                    {upcomingEvents[0].title}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 max-w-2xl relative z-10">
                    {upcomingEvents[0].description}
                  </p>
                  <div className="pt-2 relative z-10">
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider">
                      View Event Details <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : completedEvents.length > 0 ? (
              <div className="flex flex-col md:flex-row items-stretch">
                <div className="w-full md:w-1/3 h-48 md:h-auto relative overflow-hidden">
                  <img 
                    src={completedEvents[currentSlide]?.image || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'} 
                    alt={completedEvents[currentSlide]?.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 animate-fade-in"
                    key={currentSlide}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'; }}
                  />
                  <div className="absolute top-4 left-4 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                    Past Event Showcase
                  </div>
                </div>
                <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center space-y-4 relative overflow-hidden min-h-[200px]">
                  <div className="flex items-center gap-3 text-xs font-mono font-bold text-slate-500 relative z-10 animate-fade-in" key={`date-${currentSlide}`}>
                    <span className="material-symbols-outlined text-base">calendar_month</span>
                    <span>{completedEvents[currentSlide]?.date ? completedEvents[currentSlide]?.date.split('T')[0] : ''}</span>
                  </div>
                  <h3 className="font-extrabold text-2xl sm:text-3xl text-slate-900 group-hover:text-emerald-600 transition-colors relative z-10 animate-fade-in" key={`title-${currentSlide}`}>
                    {completedEvents[currentSlide]?.title}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-2 max-w-2xl relative z-10 animate-fade-in" key={`desc-${currentSlide}`}>
                    {completedEvents[currentSlide]?.description}
                  </p>
                  
                  {completedEvents.length > 1 && (
                    <div className="absolute bottom-6 right-8 flex gap-1.5 z-20">
                      {completedEvents.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-6 bg-emerald-500' : 'w-1.5 bg-slate-300'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-stretch bg-slate-900 text-white">
                <div className="w-full md:w-1/3 h-48 md:h-auto relative overflow-hidden bg-emerald-900">
                  <div className="w-full h-full flex items-center justify-center opacity-50">
                    <span className="material-symbols-outlined text-8xl">sports_soccer</span>
                  </div>
                </div>
                <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center space-y-4 relative overflow-hidden">
                  <h3 className="font-extrabold text-2xl sm:text-3xl text-white group-hover:text-emerald-400 transition-colors relative z-10">
                    Arena Events & Leagues
                  </h3>
                  <p className="text-sm text-slate-300 line-clamp-2 max-w-2xl relative z-10">
                    Discover upcoming tournaments, showcases, and open leagues. Click here to explore our event calendar.
                  </p>
                  <div className="pt-2 relative z-10">
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Explore Events <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
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
            VERSATILE ARENA
          </span>
          <h2 className="font-extrabold text-3xl sm:text-4xl text-on-surface uppercase tracking-tight">SPORTS & EVENTS WE HOST</h2>
          <p className="text-on-surface-variant max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            From high-intensity 5v5 matches to corporate leagues, academies, and private events.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sportsList.map((sport, index) => (
            <div 
              key={index}
              className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="relative h-52 overflow-hidden">
                <img 
                  src={sport.image} 
                  alt={sport.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-95"
                />
                <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                  {sport.tag}
                </div>
              </div>

              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 text-emerald-600">
                    <span className="material-symbols-outlined text-2xl">{sport.icon}</span>
                    <h3 className="font-bold text-lg text-on-surface">{sport.title}</h3>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {sport.description}
                  </p>
                </div>

                <button
                  onClick={() => navigate(ROUTES.BOOKING)}
                  className="w-full mt-4 bg-surface-container-low border border-black/10 text-on-surface font-bold text-xs uppercase tracking-wider py-3 rounded-2xl hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all flex items-center justify-center gap-1.5 group/btn"
                >
                  <span>Book Slot</span>
                  <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. WORLD-CLASS AMENITIES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-950 text-white rounded-3xl p-8 sm:p-14 border border-white/10 shadow-2xl space-y-12">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
              PRO FACILITIES
            </span>
            <h2 className="font-extrabold text-3xl sm:text-4xl uppercase tracking-tight">WORLD-CLASS AMENITIES</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">Built to provide an elite playing environment 24 hours a day</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {amenities.map((item, idx) => (
              <div 
                key={idx}
                className="bg-slate-900/60 p-6 rounded-2xl border border-white/5 hover:border-emerald-500/40 hover:bg-slate-900 transition-all duration-300 space-y-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
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

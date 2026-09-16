import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import logoImg from '../../assets/logo/appicontu.png';

export const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-slate-950 text-slate-400 py-12 border-t border-white/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Brand Bio & Certification (7 Columns) */}
          <div className="md:col-span-7 space-y-4">
            <div 
              onClick={() => navigate(ROUTES.HOME)}
              className="flex items-center gap-3 cursor-pointer group w-fit"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center p-0.5 shadow-md">
                <img 
                  alt="Alangudi Aadukalam Logo" 
                  className="h-full w-full object-contain rounded-lg" 
                  src={logoImg} 
                />
              </div>
              <span className="font-bold text-lg tracking-wider text-white uppercase group-hover:text-emerald-400 transition-colors">
                ALANGUDI <span className="text-emerald-500">AADUKALAM</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              A complete multi-sport arena for sports, celebrations, and events in Alangudi.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-medium px-3 py-1 rounded-full border border-emerald-500/20">
                24/7 Availability
              </span>
            </div>
          </div>

          {/* Location & Contact Information (5 Columns) */}
          <div className="md:col-span-5 space-y-3 text-xs">
            <h4 className="font-semibold uppercase tracking-wider text-white border-l-2 border-emerald-500 pl-2.5">
              TURF LOCATION
            </h4>
            <div className="space-y-2.5 text-slate-400">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-base mt-0.5">location_on</span>
                <span>Opposite Guru Raghavendra Mahal, Keelalangudi, Alangudi – 622301</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-base">schedule</span>
                <span>Open 24 Hours / 7 Days a Week</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-base">phone</span>
                <a href="tel:7010299365" className="font-mono text-slate-200 font-medium hover:text-emerald-400 transition-colors">70102 99365</a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Alangudi Aadukalam Multi-Sport Arena. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-slate-400">Developed by Deepak & Team</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

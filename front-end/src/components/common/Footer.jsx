import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

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
                  alt="Elite Pitch Logo" 
                  className="h-full w-full object-contain rounded-lg" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXnn5j3ELBZ9E2oyXq7qVWS0omnWwwyx3mBUA-2Ha4NtH7XlYxquD3RJLMlekQTnQS4uDXN_WPV1hcTgxiMP_aS92iQ4YnL84t-VSTKNhr3rPaSh0zcezJ2w-d0XqZnXRLeL0ES12I5VjJ8yhgdsVMHpJXmtYZEQ_mvhAoUMiVyQtB3WgjpjfTCRMkedijOmZgePzLVidC1pBP7jq2Jn-2wwTVrzPlwRGCHILynwUzfZZPYNGiL2T-DQ" 
                />
              </div>
              <span className="font-bold text-lg tracking-wider text-white uppercase group-hover:text-emerald-400 transition-colors">
                ELITE <span className="text-emerald-500">PITCH</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              FIFA-grade 50mm artificial grass turf arena with 500-lux LED stadium floodlights, AC changing lounges, and instant 24/7 online slot confirmation.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-medium px-3 py-1 rounded-full border border-emerald-500/20">
                FIFA Standard Turf
              </span>
              <span className="bg-slate-900 text-slate-300 text-[11px] font-medium px-3 py-1 rounded-full border border-white/5">
                24/7 Match Access
              </span>
            </div>
          </div>

          {/* Location & Contact Information (5 Columns) */}
          <div className="md:col-span-5 space-y-3 text-xs">
            <h4 className="font-semibold uppercase tracking-wider text-white border-l-2 border-emerald-500 pl-2.5">
              Arena Location & Info
            </h4>
            <div className="space-y-2.5 text-slate-400">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-base mt-0.5">location_on</span>
                <span>123 Sports Complex Way, Stadium District, Metro City</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-base">schedule</span>
                <span>Open 24 Hours / 7 Days a Week</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-400 text-base">phone</span>
                <span className="font-mono text-slate-200 font-medium">+91 98765 43210</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} Elite Pitch Multi-Sport Arena. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>FIFA Approved Artificial Turf</span>
            <span>·</span>
            <span>Commercial SaaS Platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

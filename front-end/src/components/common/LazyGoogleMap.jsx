import React, { useState, useEffect, useRef, memo } from 'react';

const GOOGLE_MAPS_URL = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3770.792376916538!2d72.883!3d19.076!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTnCsDA0JzMzLjYiTiA3MsKwNTInNTguOCJF!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin";
const DIRECT_MAPS_URL = "https://maps.google.com/?q=123+Sports+Complex+Way+Stadium+District+Metro+City+400001";

export const LazyGoogleMap = memo(() => {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (containerRef.current) {
            observer.unobserve(containerRef.current);
          }
        }
      },
      {
        rootMargin: '200px', // Start fetching 200px before scrolling into view
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (observer && containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      <div 
        ref={containerRef} 
        className="relative w-full h-72 md:h-80 rounded-2xl overflow-hidden border border-black/10 bg-surface-container-low shadow-sm"
      >
        {/* Animated Loading Skeleton Placeholder */}
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-surface-container-low flex flex-col items-center justify-center space-y-3 animate-pulse p-6 text-center z-10">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">map</span>
            </div>
            <div className="space-y-1.5">
              <div className="h-4 w-40 bg-surface-variant/60 rounded mx-auto"></div>
              <div className="h-3 w-56 bg-surface-variant/40 rounded mx-auto"></div>
            </div>
          </div>
        )}

        {/* Fallback Display on Load Error */}
        {hasError && (
          <div className="absolute inset-0 bg-surface-container-low flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
            <span className="material-symbols-outlined text-4xl text-error">wrong_location</span>
            <div className="space-y-1">
              <p className="font-label-bold text-on-surface text-sm">Unable to load map.</p>
              <a 
                href={DIRECT_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-xs font-label-bold hover:underline inline-flex items-center gap-1"
              >
                Open in Google Maps
                <span className="material-symbols-outlined text-xs">open_in_new</span>
              </a>
            </div>
          </div>
        )}

        {/* Lazy Loaded Map Iframe */}
        {isVisible && (
          <iframe
            title="Elite Pitch Arena Location"
            src={GOOGLE_MAPS_URL}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full border-0 transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          ></iframe>
        )}
      </div>

      {/* External Map Action Button */}
      <a
        href={DIRECT_MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-black/10 bg-surface hover:bg-surface-variant/40 text-on-surface text-xs font-label-bold transition-all shadow-sm"
      >
        <span className="material-symbols-outlined text-sm text-primary">location_on</span>
        Open in Google Maps
        <span className="material-symbols-outlined text-xs text-on-surface-variant">open_in_new</span>
      </a>
    </div>
  );
});

LazyGoogleMap.displayName = 'LazyGoogleMap';
export default LazyGoogleMap;

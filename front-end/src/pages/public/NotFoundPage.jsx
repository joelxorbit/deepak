import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-xl mx-auto px-container-padding-mobile py-24 text-center space-y-6">
      <div className="w-24 h-24 rounded-full bg-error-container text-error mx-auto flex items-center justify-center">
        <span className="material-symbols-outlined text-5xl">sentiment_very_dissatisfied</span>
      </div>

      <div className="space-y-2">
        <h1 className="font-display-lg text-4xl text-on-surface">404 - PAGE NOT FOUND</h1>
        <p className="font-body-md text-on-surface-variant max-w-sm mx-auto">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>

      <div className="pt-4">
        <button
          onClick={() => navigate(ROUTES.HOME)}
          className="bg-primary text-on-primary font-label-bold px-8 py-3.5 rounded-2xl shadow-lg hover:scale-105 transition-all"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { Language } from '../types';
import { Volume2, Mic, Globe2 } from 'lucide-react';

interface LanguageIndicatorProps {
  detectedLanguage?: Language | null;
  isListening?: boolean;
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'agent' | 'patient';
}

export const LanguageIndicator: React.FC<LanguageIndicatorProps> = ({
  detectedLanguage,
  isListening = false,
  confidence,
  size = 'md',
  theme = 'agent'
}) => {
  if (isListening) {
    return (
      <div 
        id="language-indicator-listening"
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold shadow-lg transition-all border ${
          theme === 'patient'
            ? 'bg-amber-500/20 border-amber-400 text-amber-100 animate-pulse'
            : 'bg-teal-500/20 border-teal-400 text-teal-200 animate-pulse'
        }`}
      >
        <div className="flex items-center gap-1 h-5">
          <span className="w-1.5 bg-amber-400 rounded-full animate-wave-1"></span>
          <span className="w-1.5 bg-amber-300 rounded-full animate-wave-2"></span>
          <span className="w-1.5 bg-amber-400 rounded-full animate-wave-3"></span>
          <span className="w-1.5 bg-amber-300 rounded-full animate-wave-4"></span>
          <span className="w-1.5 bg-amber-400 rounded-full animate-wave-5"></span>
        </div>
        <span className="text-sm uppercase tracking-wider font-extrabold">
          {theme === 'patient' ? 'Détection vocale active...' : 'Écoute active (Wolof / Français)...'}
        </span>
      </div>
    );
  }

  if (!detectedLanguage) {
    return (
      <div 
        id="language-indicator-idle"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/60"
      >
        <Globe2 className="w-3.5 h-3.5 text-slate-400" />
        <span>Détection auto : Wolof ↔ Français</span>
      </div>
    );
  }

  const isWolof = detectedLanguage === 'wolof';

  return (
    <div
      id={`language-indicator-${detectedLanguage}`}
      className={`inline-flex items-center gap-2 rounded-full font-bold shadow-md transition-all border ${
        size === 'lg' 
          ? 'px-4 py-2 text-base' 
          : size === 'md' 
            ? 'px-3 py-1.5 text-sm' 
            : 'px-2.5 py-1 text-xs'
      } ${
        isWolof
          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
          : 'bg-blue-950/80 border-blue-500 text-blue-300'
      }`}
    >
      <span className={`w-2.5 h-2.5 rounded-full ${isWolof ? 'bg-emerald-400 animate-ping' : 'bg-blue-400 animate-ping'}`} />
      <span className="tracking-wide">
        {isWolof ? 'WOLOF DÉTECTÉ' : 'FRANÇAIS DÉTECTÉ'}
      </span>
      {confidence && confidence > 0.5 && (
        <span className="text-[11px] opacity-75 font-normal">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </div>
  );
};

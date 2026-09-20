import React, { useState, useEffect } from 'react';
import { AudioService } from '../utils/audioService';
import { AudioAnalysisData } from '../types';
import { Activity, Volume2, VolumeX, AlertTriangle, CheckCircle2, Mic } from 'lucide-react';

interface AudioQualityMeterProps {
  variant?: 'patient' | 'agent' | 'compact';
  isRecording: boolean;
}

export const AudioQualityMeter: React.FC<AudioQualityMeterProps> = ({
  variant = 'agent',
  isRecording
}) => {
  const [data, setData] = useState<AudioAnalysisData>({
    volume: 0,
    waveform: new Array(16).fill(0),
    quality: 'silent',
    qualityLabelFr: 'En attente...',
    qualityLabelWo: 'Xaaral kàddu gi...',
    isClipping: false
  });

  useEffect(() => {
    if (!isRecording) {
      setData({
        volume: 0,
        waveform: new Array(16).fill(0),
        quality: 'silent',
        qualityLabelFr: 'Microphone inactif',
        qualityLabelWo: 'Micro bi tëj na',
        isClipping: false
      });
      return;
    }

    const unsubscribe = AudioService.subscribeAnalysis((analysisData) => {
      setData(analysisData);
    });

    return () => {
      unsubscribe();
    };
  }, [isRecording]);

  if (!isRecording && variant !== 'compact') {
    return null;
  }

  // Color mapping based on audio quality
  const getQualityTheme = () => {
    switch (data.quality) {
      case 'optimal':
        return {
          barColor: 'bg-emerald-500',
          textColor: 'text-emerald-300',
          borderColor: 'border-emerald-500/40',
          bgBadge: 'bg-emerald-950/80',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        };
      case 'low':
        return {
          barColor: 'bg-amber-500',
          textColor: 'text-amber-300',
          borderColor: 'border-amber-500/40',
          bgBadge: 'bg-amber-950/80',
          icon: <Volume2 className="w-3.5 h-3.5 text-amber-400" />
        };
      case 'loud':
        return {
          barColor: 'bg-rose-500',
          textColor: 'text-rose-300',
          borderColor: 'border-rose-500/40',
          bgBadge: 'bg-rose-950/80',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        };
      case 'silent':
      default:
        return {
          barColor: 'bg-slate-400',
          textColor: 'text-slate-300',
          borderColor: 'border-slate-600/40',
          bgBadge: 'bg-slate-900/80',
          icon: <VolumeX className="w-3.5 h-3.5 text-slate-400" />
        };
    }
  };

  const theme = getQualityTheme();

  // Patient Variant: Large, welcoming, sun-legible with clear Wolof prompts
  if (variant === 'patient') {
    return (
      <div 
        id="patient-audio-quality-meter"
        className="w-full max-w-sm px-4 py-3 bg-amber-950/80 border-2 border-amber-500/50 rounded-2xl shadow-xl backdrop-blur-sm flex flex-col items-center gap-2.5 transition-all duration-200"
      >
        {/* Quality status badge */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${theme.bgBadge} border ${theme.borderColor} ${theme.textColor} text-xs sm:text-sm font-bold tracking-wide`}>
          {theme.icon}
          <span>{data.qualityLabelWo}</span>
          <span className="opacity-75">({data.qualityLabelFr})</span>
        </div>

        {/* Live dynamic waveform bars */}
        <div className="flex items-center justify-center gap-1.5 h-12 w-full px-2">
          {data.waveform.map((val, idx) => {
            // Calculate height between 6px and 44px
            const height = Math.max(6, Math.round(val * 44));
            return (
              <div
                key={idx}
                className={`w-2.5 rounded-full transition-all duration-75 ${theme.barColor} ${
                  data.quality === 'optimal' ? 'shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''
                }`}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        {/* Signal meter gauge */}
        <div className="w-full flex items-center gap-2 px-1">
          <Mic className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 flex gap-0.5">
            {[...Array(12)].map((_, i) => {
              const active = (data.volume / 100) * 12 >= i;
              let segColor = 'bg-slate-700';
              if (active) {
                if (i < 3) segColor = 'bg-amber-400';
                else if (i < 9) segColor = 'bg-emerald-400';
                else segColor = 'bg-rose-500';
              }
              return (
                <div 
                  key={i} 
                  className={`flex-1 h-full rounded-sm transition-colors duration-75 ${segColor}`} 
                />
              );
            })}
          </div>
          <span className="text-xs font-mono font-bold text-amber-200 min-w-[32px] text-right">
            {data.volume}%
          </span>
        </div>
      </div>
    );
  }

  // Agent Variant: Dense, clinical VU meter with precise telemetry for health workers
  return (
    <div 
      id="agent-audio-quality-meter"
      className="flex flex-col gap-1.5 px-3 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-md min-w-[260px]"
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span className="font-semibold text-slate-200">Qualité du Signal Vocal</span>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${theme.bgBadge} ${theme.textColor} border ${theme.borderColor}`}>
          {theme.icon}
          <span>{data.volume}%</span>
        </div>
      </div>

      {/* Dynamic 16-bar Waveform */}
      <div className="flex items-center justify-between gap-1 h-7 px-1 bg-slate-950/60 rounded border border-slate-800">
        {data.waveform.map((val, idx) => {
          const height = Math.max(4, Math.round(val * 24));
          return (
            <div
              key={idx}
              className={`flex-1 rounded-sm transition-all duration-75 ${theme.barColor}`}
              style={{ height: `${height}px` }}
            />
          );
        })}
      </div>

      {/* Signal status label with advice */}
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span className={`font-medium ${theme.textColor}`}>
          {data.qualityLabelFr}
        </span>
        {data.isClipping && (
          <span className="text-rose-400 font-bold uppercase text-[10px] animate-pulse">
            Saturation
          </span>
        )}
      </div>
    </div>
  );
};

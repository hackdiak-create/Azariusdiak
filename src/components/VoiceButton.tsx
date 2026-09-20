import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, Volume2 } from 'lucide-react';
import { AudioService } from '../utils/audioService';
import { AudioQualityMeter } from './AudioQualityMeter';

interface VoiceButtonProps {
  onAudioCaptured: (base64: string, mimeType: string) => Promise<void>;
  variant?: 'agent' | 'patient';
  disabled?: boolean;
  speakerHint?: 'agent' | 'patient';
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onAudioCaptured,
  variant = 'agent',
  disabled = false,
  speakerHint = 'patient'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleToggleRecord = async () => {
    if (disabled || isProcessing) return;

    if (!isRecording) {
      try {
        await AudioService.startRecording();
        setIsRecording(true);
      } catch (err: unknown) {
        console.error('Erreur accès microphone:', err);
        alert('Veuillez autoriser l\'accès au microphone dans votre navigateur.');
      }
    } else {
      try {
        setIsProcessing(true);
        setIsRecording(false);
        const audioData = await AudioService.stopRecording();
        await onAudioCaptured(audioData.base64, audioData.mimeType);
      } catch (err) {
        console.error('Erreur arrêt enregistrement:', err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Patient Variant: Huge welcoming circular button with sun-friendly colors and prominent label
  if (variant === 'patient') {
    return (
      <div className="flex flex-col items-center justify-center gap-5 w-full my-4">
        <div className="relative flex items-center justify-center">
          {/* Animated pulsing wave rings when recording */}
          {isRecording && (
            <>
              <div className="absolute w-56 h-56 rounded-full bg-amber-500/20 animate-ping pointer-events-none" />
              <div className="absolute w-64 h-64 rounded-full bg-orange-500/10 animate-pulse pointer-events-none" />
            </>
          )}

          <button
            id="patient-voice-button"
            onClick={handleToggleRecord}
            disabled={disabled || isProcessing}
            aria-label={isRecording ? 'Arrêter et traduire' : 'Appuyez pour parler en Wolof'}
            className={`relative z-10 flex flex-col items-center justify-center w-48 h-48 sm:w-52 sm:h-52 rounded-full transition-all duration-300 transform active:scale-95 shadow-2xl focus:outline-none ${
              isRecording
                ? 'bg-gradient-to-br from-red-600 to-rose-700 text-white ring-8 ring-rose-400/40 animate-pulse scale-105'
                : isProcessing
                  ? 'bg-amber-600 text-amber-100 cursor-wait'
                  : 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white hover:brightness-110 shadow-orange-950/60 ring-4 ring-amber-300/50'
            }`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-16 h-16 animate-spin text-white" />
                <span className="text-sm font-bold uppercase tracking-wider">Traduction...</span>
              </div>
            ) : isRecording ? (
              <div className="flex flex-col items-center gap-2">
                <Square className="w-16 h-16 fill-white text-white" />
                <span className="text-xl font-black uppercase tracking-wider">BAYYIL</span>
                <span className="text-xs font-semibold opacity-90">(Arrêter) · {recordingSeconds}s</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Mic className="w-20 h-20 drop-shadow-md text-white stroke-[2.5]" />
                <div className="text-center leading-tight">
                  <span className="block text-2xl font-black tracking-wide drop-shadow">WÀXAL</span>
                  <span className="block text-sm font-bold uppercase tracking-wider opacity-90">PARLER</span>
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Real-time Audio Quality & Waveform Meter for Patient */}
        {isRecording && (
          <div className="w-full flex justify-center animate-fadeIn">
            <AudioQualityMeter variant="patient" isRecording={isRecording} />
          </div>
        )}

        {/* Instructions helper below button for patient */}
        <p className="text-base sm:text-lg font-bold text-amber-100 text-center max-w-xs px-2">
          {isRecording ? (
            <span className="text-rose-200">Kàddu gi ngi dugg... Bësal fi bu nga noppee</span>
          ) : isProcessing ? (
            <span className="text-amber-200">Machine bi ngi dégg kàddu gi...</span>
          ) : (
            <span>Bësal butoŋ bi te nga wax ci wolof walla français</span>
          )}
        </p>
      </div>
    );
  }

  // Agent Variant: Dense, functional, professional dark-teal recorder with live VU Meter
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        id="agent-voice-button"
        onClick={handleToggleRecord}
        disabled={disabled || isProcessing}
        className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-md active:scale-95 ${
          isRecording
            ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
            : isProcessing
              ? 'bg-teal-800 text-teal-200 cursor-wait'
              : 'bg-teal-600 hover:bg-teal-500 text-white border border-teal-400/40 shadow-teal-950/40'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Traduction en cours...</span>
          </>
        ) : isRecording ? (
          <>
            <Square className="w-4 h-4 fill-white" />
            <span>Arrêter ({recordingSeconds}s)</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 stroke-[2.5]" />
            <span>{speakerHint === 'agent' ? 'Parler (Français / Wolof)' : 'Écouter le Patient'}</span>
          </>
        )}
      </button>

      {/* Real-time Audio Quality & Waveform Telemetry for Healthcare Worker */}
      {isRecording && (
        <AudioQualityMeter variant="agent" isRecording={isRecording} />
      )}
    </div>
  );
};

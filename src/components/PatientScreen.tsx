import React, { useState } from 'react';
import { VoiceButton } from './VoiceButton';
import { LanguageIndicator } from './LanguageIndicator';
import { TranslationResponse, HealthPhrase } from '../types';
import { HEALTH_PHRASES } from '../data/phraseLibrary';
import { LocalDB } from '../data/localDb';
import { AudioService } from '../utils/audioService';
import { 
  Volume2, 
  RotateCcw, 
  Sparkles, 
  Activity, 
  HelpCircle, 
  ArrowLeftRight, 
  Thermometer, 
  Pill, 
  Baby, 
  Smile, 
  HeartHandshake,
  CheckCircle,
  Stethoscope
} from 'lucide-react';

interface PatientScreenProps {
  lastTranslation: TranslationResponse | null;
  onAudioCaptured: (base64: string, mimeType: string) => Promise<void>;
  onSwitchToAgent: () => void;
  isProcessing?: boolean;
}

export const PatientScreen: React.FC<PatientScreenProps> = ({
  lastTranslation,
  onAudioCaptured,
  onSwitchToAgent,
  isProcessing = false
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Replay audio for the patient using the caregiver's voice (soignant)
  const handleReplayVoice = async (target: 'caregiver' | 'wolof' | 'auto' = 'auto') => {
    if (!lastTranslation) return;
    setIsPlayingAudio(true);

    try {
      if (target === 'caregiver') {
        // Play the French sentence using the caregiver's voice
        const frText = lastTranslation.detectedLanguage === 'francais'
          ? lastTranslation.transcript
          : lastTranslation.translation;
        await AudioService.speakCaregiverVoice(frText);
      } else if (target === 'wolof') {
        // Play the Wolof sentence using the caregiver voice calibrated for Wolof phonetics
        const woText = lastTranslation.detectedLanguage === 'francais'
          ? lastTranslation.translation
          : lastTranslation.transcript;
        if (lastTranslation.audioBase64) {
          await AudioService.playAudioBase64(lastTranslation.audioBase64);
        } else {
          await AudioService.speakWolofPhonetic(woText);
        }
      } else {
        // Default auto replay: use the caregiver's voice
        if (lastTranslation.detectedLanguage === 'francais') {
          // If doctor spoke French, speak doctor's voice first then Wolof
          await AudioService.speakCaregiverVoice(lastTranslation.transcript);
          await AudioService.speakWolofPhonetic(lastTranslation.translation);
        } else {
          // Patient spoke Wolof -> speak translation with the caregiver's voice
          await AudioService.speakCaregiverVoice(lastTranslation.translation);
        }
      }
    } catch (err) {
      console.error('Erreur relecture audio:', err);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  // Self-service visual quick cards for the patient alone
  const quickPatientPhrases = [
    {
      id: 'q-1',
      titleWo: 'Sama biir',
      titleFr: 'Ventre douloureux',
      icon: 'Activity',
      phraseId: 'sym-2',
      color: 'from-orange-600 to-amber-700'
    },
    {
      id: 'q-2',
      titleWo: 'Yaram bu tàng',
      titleFr: 'Fièvre / Chaud',
      icon: 'Thermometer',
      phraseId: 'acc-4',
      color: 'from-amber-600 to-red-700'
    },
    {
      id: 'q-3',
      titleWo: 'Sama bopp',
      titleFr: 'Maux de tête',
      icon: 'Smile',
      phraseId: 'sym-5',
      color: 'from-amber-700 to-orange-800'
    },
    {
      id: 'q-4',
      titleWo: 'Garab yi',
      titleFr: 'Médicaments',
      icon: 'Pill',
      phraseId: 'tr-1',
      color: 'from-orange-700 to-yellow-800'
    },
    {
      id: 'q-5',
      titleWo: 'Xale bi',
      titleFr: 'Bébé / Enfant',
      icon: 'Baby',
      phraseId: 'mat-1',
      color: 'from-amber-600 to-yellow-700'
    }
  ];

  const handleQuickPatientPhrase = async (phraseId: string) => {
    const offlineList = LocalDB.getOfflinePhrases();
    const found = offlineList.find(p => p.id === phraseId) || HEALTH_PHRASES.find(p => p.id === phraseId);
    if (!found) return;

    setSelectedTopic(found.id);
    setIsPlayingAudio(true);

    try {
      // Speak with the caregiver's voice (soignant) so both patient and doctor hear it clearly
      await AudioService.speakCaregiverVoice(`${found.french}. ${found.wolof}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  return (
    <div 
      id="patient-view-container"
      className="min-h-[88vh] flex flex-col justify-between p-4 sm:p-6 bg-gradient-to-b from-[#7c2d12] via-[#5b220c] to-[#381408] text-amber-50 rounded-2xl shadow-2xl border-4 border-amber-500/40 relative overflow-hidden"
    >
      {/* Top Header Switcher for the Health Worker */}
      <div className="flex items-center justify-between gap-3 border-b border-amber-500/30 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-lg">
            <HeartHandshake className="w-5 h-5 text-amber-950" />
          </div>
          <div>
            <span className="block text-xs uppercase tracking-widest text-amber-300 font-extrabold">Wax Santé</span>
            <span className="block text-base font-black tracking-tight text-white">VUE PATIENT · KÀDDU PATIENT</span>
          </div>
        </div>

        {/* Hand over phone button */}
        <button
          id="btn-return-to-agent"
          onClick={onSwitchToAgent}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-950/80 hover:bg-amber-900 border-2 border-amber-400/60 text-amber-200 text-xs sm:text-sm font-black tracking-wide shadow-lg transition-all active:scale-95"
        >
          <ArrowLeftRight className="w-4 h-4 text-amber-300" />
          <span>Rendre au soignant</span>
        </button>
      </div>

      {/* Main Center Area: Large friendly touch target */}
      <div className="flex flex-col items-center justify-center my-auto py-2">
        {/* Language status banner */}
        <div className="mb-4">
          <LanguageIndicator
            detectedLanguage={lastTranslation?.detectedLanguage}
            confidence={lastTranslation?.confidence}
            size="lg"
            theme="patient"
          />
        </div>

        {/* The One Big Talking Button */}
        <VoiceButton
          variant="patient"
          speakerHint="patient"
          onAudioCaptured={onAudioCaptured}
          disabled={isProcessing}
        />

        {/* Large Translation Display Card (Direct feedback for patient) */}
        {lastTranslation && (
          <div 
            id="patient-speech-card"
            className="w-full max-w-lg mt-3 p-4 sm:p-5 rounded-2xl bg-[#431407]/90 border-2 border-amber-400/60 shadow-2xl backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-amber-700/50">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-amber-300" />
                {lastTranslation.detectedLanguage === 'francais' ? 'Kàddu docteur bi (Wolof)' : 'Li nga wax (Wolof)'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  id="btn-patient-replay-caregiver"
                  onClick={() => handleReplayVoice('caregiver')}
                  disabled={isPlayingAudio}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
                  title="Écouter avec la voix du soignant"
                >
                  <Volume2 className="w-3.5 h-3.5 text-slate-950" />
                  <span>Voix soignant</span>
                </button>

                <button
                  id="btn-patient-replay-wolof"
                  onClick={() => handleReplayVoice('wolof')}
                  disabled={isPlayingAudio}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
                  title="Réécouter en Wolof"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isPlayingAudio ? 'animate-spin' : ''}`} />
                  <span>Wolof</span>
                </button>
              </div>
            </div>

            {/* Display large, easy-to-read text in sunlight */}
            <div className="space-y-2">
              <p className="text-xl sm:text-2xl font-black text-amber-100 leading-snug tracking-wide">
                "{lastTranslation.detectedLanguage === 'francais' ? lastTranslation.translation : lastTranslation.transcript}"
              </p>

              {/* French translation for bilingual patients or health worker checking over shoulder */}
              <p className="text-xs sm:text-sm text-amber-300/80 italic font-semibold pt-1">
                Français : {lastTranslation.detectedLanguage === 'francais' ? lastTranslation.transcript : lastTranslation.translation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Area: Self-service patient visual buttons */}
      <div className="mt-4 pt-3 border-t border-amber-600/30">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-black uppercase tracking-wider text-amber-300">
            Bësal ngir dégg ci kàddu soignant bi (Écouter avec la voix du soignant) :
          </span>
          <span className="text-[11px] font-semibold text-amber-400/80">
            Phrases pré-enregistrées
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {quickPatientPhrases.map((q) => {
            const isSelected = selectedTopic === q.phraseId;
            return (
              <button
                key={q.id}
                id={`patient-quick-card-${q.id}`}
                onClick={() => handleQuickPatientPhrase(q.phraseId)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all shadow-md active:scale-95 text-center ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 border-amber-200 ring-2 ring-white scale-105'
                    : 'bg-amber-950/70 hover:bg-amber-900/80 border-amber-600/50 text-amber-100'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/30 flex items-center justify-center mb-1 text-amber-200">
                  {q.icon === 'Activity' && <Activity className="w-4 h-4" />}
                  {q.icon === 'Thermometer' && <Thermometer className="w-4 h-4" />}
                  {q.icon === 'Smile' && <Smile className="w-4 h-4" />}
                  {q.icon === 'Pill' && <Pill className="w-4 h-4" />}
                  {q.icon === 'Baby' && <Baby className="w-4 h-4" />}
                </div>
                <span className="text-sm font-black tracking-tight">{q.titleWo}</span>
                <span className="text-[10px] font-semibold opacity-75">{q.titleFr}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

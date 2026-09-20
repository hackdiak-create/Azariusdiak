import React, { useState, useEffect } from 'react';
import { LocalDB } from './data/localDb';
import { AgentEntity, PatientEntity, AudioExchange, TranslationResponse } from './types';
import { Navbar } from './components/Navbar';
import { AgentScreen } from './components/AgentScreen';
import { PatientScreen } from './components/PatientScreen';
import { LoginScreen } from './components/LoginScreen';
import { AuditLogModal } from './components/AuditLogModal';
import { ApkExportModal } from './components/ApkExportModal';
import { AudioService } from './utils/audioService';

export default function App() {
  const [currentAgent, setCurrentAgent] = useState<AgentEntity | null>(null);
  const [activeView, setActiveView] = useState<'agent' | 'patient'>('agent');
  const [selectedPatient, setSelectedPatient] = useState<PatientEntity | null>(null);
  const [lastTranslation, setLastTranslation] = useState<TranslationResponse | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [exchanges, setExchanges] = useState<AudioExchange[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(!navigator.onLine);
  const [networkNotice, setNetworkNotice] = useState<string | null>(null);

  // Modals
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  // Initialize data on mount and listen to network connectivity
  useEffect(() => {
    LocalDB.init();
    const agent = LocalDB.getCurrentAgent();
    if (agent) {
      setCurrentAgent(agent);
    }
    const patients = LocalDB.getPatients();
    if (patients.length > 0) {
      setSelectedPatient(patients[0]);
    }

    const handleOnline = () => {
      setIsOfflineMode(false);
      setNetworkNotice(null);
    };
    const handleOffline = () => {
      setIsOfflineMode(true);
      setNetworkNotice("Appareil hors-ligne : la traduction vocale en direct requiert une connexion. Le lexique médical enregistré reste consultable.");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLoginSuccess = (agent: AgentEntity) => {
    setCurrentAgent(agent);
  };

  const handleLogout = () => {
    LocalDB.setCurrentAgent(null);
    setCurrentAgent(null);
  };

  const handleToggleView = () => {
    setActiveView(prev => (prev === 'agent' ? 'patient' : 'agent'));
  };

  // Central speech-to-speech multimodal audio pipeline with offline resilience
  const handleAudioCaptured = async (
    base64: string, 
    mimeType: string, 
    speakerHint: 'agent' | 'patient' = activeView
  ) => {
    setIsProcessingAudio(true);
    try {
      let data: TranslationResponse;

      if (isOfflineMode || !navigator.onLine) {
        setNetworkNotice("L'interprétation vocale par IA requiert une connexion Internet. Consultez le lexique médical pour écouter les phrases préenregistrées hors-ligne.");
        return;
      }

      try {
        const response = await fetch('/api/translate-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64,
            mimeType,
            speakerHint
          })
        });

        if (!response.ok) {
          throw new Error(`Erreur serveur (${response.status})`);
        }

        data = await response.json();
      } catch (apiErr) {
        console.warn('API non joignable:', apiErr);
        setNetworkNotice("Service vocal inaccessible (erreur réseau). Vérifiez la connexion Internet ou utilisez les phrases préenregistrées.");
        return;
      }

      setLastTranslation(data);

      // Create new exchange in consultation history
      const newExchange: AudioExchange = {
        id: 'ex-' + Date.now(),
        timestamp: new Date().toISOString(),
        speaker: speakerHint,
        sourceLanguage: data.detectedLanguage,
        targetLanguage: data.detectedLanguage === 'wolof' ? 'francais' : 'wolof',
        transcript: data.transcript,
        translation: data.translation,
        symptomTag: data.symptomTag,
        medicalSummary: data.medicalSummary,
        hasAudio: Boolean(data.audioBase64)
      };

      setExchanges(prev => [...prev, newExchange]);

      // Automatic Voice Response according to user prompt brief:
      // "1. Le patient parle en wolof -> traduction affichée en français côté agent, dite en réponse."
      // "2. L'agent parle en français -> traduite et dite à voix haute en wolof au patient."
      if (speakerHint === 'agent' || data.detectedLanguage === 'francais') {
        // Voice is intended for the Patient in Wolof
        if (data.audioBase64) {
          await AudioService.playAudioBase64(data.audioBase64);
        } else {
          await AudioService.speakWolofPhonetic(data.translation);
        }
      } else {
        // Spoken by patient in Wolof -> say in French for the healthcare agent
        await AudioService.speakFrench(data.translation);
      }

      // Log voice translation event for medical traceability
      if (currentAgent) {
        LocalDB.logAccess(
          currentAgent.id,
          currentAgent.fullName,
          'TRADUCTION_VOCALE',
          selectedPatient?.id,
          selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : undefined,
          `Traduction vocale ${data.detectedLanguage.toUpperCase()} -> ${data.detectedLanguage === 'wolof' ? 'FRANÇAIS' : 'WOLOF'} ("${data.transcript.slice(0, 40)}...")`
        );
      }
    } catch (err: unknown) {
      const e = err as Error;
      console.error('Erreur lors du traitement audio:', e);
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const handleAddManualExchange = (exchangeData: Omit<AudioExchange, 'id' | 'timestamp'>) => {
    const exchange: AudioExchange = {
      ...exchangeData,
      id: 'ex-' + Date.now(),
      timestamp: new Date().toISOString()
    };
    setExchanges(prev => [...prev, exchange]);
    setLastTranslation({
      detectedLanguage: exchangeData.sourceLanguage,
      confidence: 1.0,
      transcript: exchangeData.transcript,
      translation: exchangeData.translation,
      symptomTag: exchangeData.symptomTag,
      medicalSummary: exchangeData.medicalSummary
    });
  };

  // If no agent is logged in, show individual authentication screen
  if (!currentAgent) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      activeView === 'agent'
        ? 'bg-slate-950 text-slate-100'
        : 'bg-[#2a0d05] text-amber-50'
    }`}>
      {/* Persistent Navigation & View Switcher */}
      <Navbar
        currentAgent={currentAgent}
        activeView={activeView}
        onToggleView={handleToggleView}
        onOpenAuditLogs={() => setIsAuditModalOpen(true)}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        onLogout={handleLogout}
        isOfflineMode={isOfflineMode}
        onToggleOfflineMode={() => setIsOfflineMode(prev => !prev)}
      />

      {/* Network notice banner for offline state or network failure */}
      {networkNotice && (
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 pt-2">
          <div className="flex items-center justify-between gap-3 p-3 bg-amber-950/80 border border-amber-600/60 rounded-xl text-amber-200 text-xs sm:text-sm shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>{networkNotice}</span>
            </div>
            <button
              onClick={() => setNetworkNotice(null)}
              className="text-amber-300 hover:text-white px-2.5 py-1 rounded-lg bg-amber-900/50 hover:bg-amber-900 text-xs font-bold shrink-0 transition-all"
            >
              Compris
            </button>
          </div>
        </div>
      )}

      {/* Main Responsive Canvas */}
      <main className="max-w-7xl mx-auto p-2 sm:p-4 md:p-6">
        {activeView === 'agent' ? (
          <AgentScreen
            currentAgent={currentAgent}
            selectedPatient={selectedPatient}
            onSelectPatient={(p) => setSelectedPatient(p)}
            onSwitchToPatientView={() => setActiveView('patient')}
            lastTranslation={lastTranslation}
            onAudioCaptured={handleAudioCaptured}
            isProcessingAudio={isProcessingAudio}
            exchanges={exchanges}
            onAddExchange={handleAddManualExchange}
          />
        ) : (
          <PatientScreen
            lastTranslation={lastTranslation}
            onAudioCaptured={(base64, mimeType) => handleAudioCaptured(base64, mimeType, 'patient')}
            onSwitchToAgent={() => setActiveView('agent')}
            isProcessing={isProcessingAudio}
          />
        )}
      </main>

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      {/* APK Android / PWA Export Modal */}
      <ApkExportModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />
    </div>
  );
}

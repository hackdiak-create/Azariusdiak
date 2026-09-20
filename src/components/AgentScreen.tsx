import React, { useState } from 'react';
import { AgentEntity, PatientEntity, ConsultationEntity, AudioExchange, TranslationResponse, HealthPhrase } from '../types';
import { LocalDB } from '../data/localDb';
import { VoiceButton } from './VoiceButton';
import { LanguageIndicator } from './LanguageIndicator';
import { PhraseLibraryList } from './PhraseLibraryList';
import { AudioService } from '../utils/audioService';
import { 
  User, 
  Search, 
  Plus, 
  Calendar, 
  MapPin, 
  FileText, 
  Clock, 
  Volume2, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Phone, 
  ShieldAlert, 
  Sparkles,
  Stethoscope,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

interface AgentScreenProps {
  currentAgent: AgentEntity;
  selectedPatient: PatientEntity | null;
  onSelectPatient: (patient: PatientEntity | null) => void;
  onSwitchToPatientView: () => void;
  lastTranslation: TranslationResponse | null;
  onAudioCaptured: (base64: string, mimeType: string, speakerHint?: 'agent' | 'patient') => Promise<void>;
  isProcessingAudio: boolean;
  exchanges: AudioExchange[];
  onAddExchange: (exchange: Omit<AudioExchange, 'id' | 'timestamp'>) => void;
}

export const AgentScreen: React.FC<AgentScreenProps> = ({
  currentAgent,
  selectedPatient,
  onSelectPatient,
  onSwitchToPatientView,
  lastTranslation,
  onAudioCaptured,
  isProcessingAudio,
  exchanges,
  onAddExchange
}) => {
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'console' | 'phrases' | 'historique' | 'nouveau-patient'>('console');
  const [customText, setCustomText] = useState('');
  const [isTranslatingText, setIsTranslatingText] = useState(false);
  const [speakerMode, setSpeakerMode] = useState<'agent' | 'patient'>('patient');

  // New consultation form state
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [consultationSaved, setConsultationSaved] = useState(false);

  // New patient modal state
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newGender, setNewGender] = useState<'M' | 'F'>('M');
  const [newVillage, setNewVillage] = useState('');
  const [newEmergencyContact, setNewEmergencyContact] = useState('');
  const [newAllergies, setNewAllergies] = useState('');

  const patientsList = LocalDB.searchPatients(patientSearchQuery);
  const patientConsultations = selectedPatient ? LocalDB.getConsultations(selectedPatient.id) : [];

  // Handle custom text translation from agent in French -> translate and speak Wolof
  const handleTranslateCustomText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim() || isTranslatingText) return;

    setIsTranslatingText(true);
    const sourceLanguage = speakerMode === 'agent' ? 'francais' : 'wolof';
    const targetLanguage = speakerMode === 'agent' ? 'wolof' : 'francais';

    try {
      let translation = '';
      let symptomTag: string | undefined = undefined;
      let medicalSummary: string | undefined = undefined;
      let phoneticGuide = '';

      try {
        const res = await fetch('/api/translate-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: customText,
            sourceLanguage,
            targetLanguage
          })
        });

        if (res.ok) {
          const data = await res.json();
          translation = data.translation;
          symptomTag = data.symptomTag;
          medicalSummary = data.medicalSummary;
        } else {
          throw new Error('API indisponible, bascule hors-ligne');
        }
      } catch (networkErr) {
        // Instant offline fallback using preloaded health phrases in local storage
        console.info('Utilisation du moteur de traduction local hors-ligne:', networkErr);
        const offlineRes = LocalDB.translateOffline(customText, sourceLanguage);
        translation = offlineRes.translation;
        symptomTag = offlineRes.matchedPhrase?.categoryLabelFr || 'Hors-Ligne';
        medicalSummary = `Traduction hors-ligne (${offlineRes.matchType})`;
        phoneticGuide = offlineRes.matchedPhrase?.phoneticWo || '';
      }

      onAddExchange({
        speaker: speakerMode,
        sourceLanguage,
        targetLanguage,
        transcript: customText,
        translation,
        symptomTag,
        medicalSummary
      });

      // Speak Wolof if doctor spoke
      if (speakerMode === 'agent') {
        try {
          const ttsRes = await fetch('/api/tts-wolof', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: translation })
          });
          if (ttsRes.ok) {
            const ttsData = await ttsRes.json();
            if (ttsData.audioBase64) {
              await AudioService.playAudioBase64(ttsData.audioBase64);
            } else {
              await AudioService.speakWolofPhonetic(translation, phoneticGuide);
            }
          } else {
            await AudioService.speakWolofPhonetic(translation, phoneticGuide);
          }
        } catch {
          await AudioService.speakWolofPhonetic(translation, phoneticGuide);
        }
      } else {
        // Patient spoke -> read in French to doctor
        AudioService.speakFrench(translation);
      }

      setCustomText('');
    } catch (err) {
      console.error('Erreur traduction texte:', err);
    } finally {
      setIsTranslatingText(false);
    }
  };

  const handleSendPhraseToPatient = async (phrase: HealthPhrase) => {
    onAddExchange({
      speaker: 'agent',
      sourceLanguage: 'francais',
      targetLanguage: 'wolof',
      transcript: phrase.french,
      translation: phrase.wolof,
      symptomTag: phrase.categoryLabelFr,
      medicalSummary: phrase.contextNote
    });

    // Play Wolof audio
    try {
      const res = await fetch('/api/tts-wolof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: phrase.wolof })
      });
      if (res.ok) {
        const tts = await res.json();
        if (tts.audioBase64) {
          await AudioService.playAudioBase64(tts.audioBase64);
          return;
        }
      }
    } catch (e) {
      // fallback
    }
    await AudioService.speakWolofPhonetic(phrase.wolof, phrase.phoneticWo);
  };

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newLastName || !newBirthDate || !newVillage) {
      alert('Veuillez renseigner le nom, prénom, date de naissance et village.');
      return;
    }

    const created = LocalDB.createPatient({
      firstName: newFirstName,
      lastName: newLastName,
      birthDate: newBirthDate,
      gender: newGender,
      village: newVillage,
      emergencyContact: newEmergencyContact,
      allergies: newAllergies
    }, currentAgent);

    onSelectPatient(created);
    setActiveTab('console');
    setNewFirstName('');
    setNewLastName('');
    setNewBirthDate('');
    setNewVillage('');
    setNewEmergencyContact('');
    setNewAllergies('');
  };

  const handleSaveConsultation = () => {
    if (!selectedPatient) return;
    if (!chiefComplaint.trim()) {
      alert('Veuillez renseigner le motif de consultation.');
      return;
    }

    LocalDB.createConsultation({
      patientId: selectedPatient.id,
      agentId: currentAgent.id,
      agentName: currentAgent.fullName,
      chiefComplaint,
      symptoms: exchanges.map(e => e.symptomTag).filter(Boolean) as string[],
      diagnosis: diagnosis || 'Observation clinique dispensaire',
      treatmentPlan: treatmentPlan || 'Conseils d\'hygiène et réhydratation',
      notes: `Consultation enregistrée avec ${exchanges.length} échanges vocaux Wolof/Français.`,
      exchanges: [...exchanges],
      status: 'clôturée'
    }, currentAgent);

    setConsultationSaved(true);
    setTimeout(() => {
      setConsultationSaved(false);
      setChiefComplaint('');
      setDiagnosis('');
      setTreatmentPlan('');
    }, 2500);
  };

  return (
    <div 
      id="agent-view-container"
      className="flex flex-col gap-4 bg-slate-950 text-slate-100 p-3 sm:p-5 rounded-2xl border border-teal-900/80 shadow-2xl"
    >
      {/* Top Banner: Active Patient & Switch to Patient Screen Button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-[#0f3735] to-[#0a2624] border border-teal-700/60 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-teal-800 text-teal-200 flex items-center justify-center font-bold text-sm border border-teal-500/40 shrink-0">
            {selectedPatient ? selectedPatient.firstName[0] + selectedPatient.lastName[0] : <User className="w-5 h-5" />}
          </div>

          <div>
            {selectedPatient ? (
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-white tracking-tight">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-700 font-mono">
                    Né(e) le {selectedPatient.birthDate}
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">
                    ({selectedPatient.gender === 'M' ? 'Homme' : 'Femme'})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-teal-200/90 mt-0.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-teal-400" />
                    {selectedPatient.village}
                  </span>
                  {selectedPatient.allergies && (
                    <span className="text-rose-300 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      Allergie: {selectedPatient.allergies}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <span className="text-sm font-bold text-slate-200">Aucun patient sélectionné</span>
                <p className="text-xs text-slate-400">Recherchez ou créez un patient ci-dessous pour démarrer la consultation</p>
              </div>
            )}
          </div>
        </div>

        {/* Big Hand Over To Patient Button */}
        <button
          id="btn-switch-to-patient-view"
          onClick={onSwitchToPatientView}
          className="w-full md:w-auto flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-sm tracking-wide shadow-xl shadow-orange-950/60 border border-amber-400/50 transition-all transform active:scale-95"
        >
          <ArrowLeftRight className="w-4 h-4 text-amber-200" />
          <span>Tendre le téléphone au patient (VUE PATIENT)</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          id="tab-console"
          onClick={() => setActiveTab('console')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'console'
              ? 'bg-teal-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Interprète & Consultation</span>
        </button>

        <button
          id="tab-phrases"
          onClick={() => setActiveTab('phrases')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'phrases'
              ? 'bg-teal-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Bibliothèque de Phrases Santé</span>
        </button>

        <button
          id="tab-historique"
          onClick={() => setActiveTab('historique')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'historique'
              ? 'bg-teal-600 text-white shadow'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Antécédents du Patient ({patientConsultations.length})</span>
        </button>

        <button
          id="tab-nouveau-patient"
          onClick={() => setActiveTab('nouveau-patient')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ml-auto ${
            activeTab === 'nouveau-patient'
              ? 'bg-teal-600 text-white shadow'
              : 'bg-slate-900 text-teal-400 hover:text-teal-300 border border-teal-900/60'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Patient</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (Patients search sidebar) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="p-3 bg-slate-900/90 rounded-xl border border-teal-950">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                id="search-patient-sidebar"
                type="text"
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                placeholder="Chercher patient (nom, date, village)..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {patientsList.map((p) => {
                const isSelected = selectedPatient?.id === p.id;
                return (
                  <button
                    key={p.id}
                    id={`patient-item-${p.id}`}
                    onClick={() => {
                      onSelectPatient(p);
                      LocalDB.logAccess(
                        currentAgent.id,
                        currentAgent.fullName,
                        'CONSULTATION_DOSSIER',
                        p.id,
                        `${p.firstName} ${p.lastName}`,
                        'Ouverture dossier patient pour consultation'
                      );
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-950 border-teal-500 text-white ring-1 ring-teal-500'
                        : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/70 text-slate-300'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-xs">
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        Né(e) : {p.birthDate} · {p.village}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Doctor Summary Note */}
          <div className="p-3 bg-slate-900/90 rounded-xl border border-teal-950 text-xs text-slate-400 space-y-1">
            <span className="font-bold text-teal-300 uppercase tracking-wider text-[10px]">
              Poste de garde
            </span>
            <p className="text-slate-300 font-semibold">{currentAgent.fullName}</p>
            <p className="text-[11px] text-slate-400">{currentAgent.role} · {currentAgent.facility}</p>
          </div>
        </div>

        {/* Right / Center Main Column */}
        <div className="lg:col-span-8">
          {activeTab === 'console' && (
            <div className="flex flex-col gap-4">
              {/* Voice Bar & Language Detector */}
              <div className="p-4 rounded-xl bg-slate-900 border border-teal-800/60 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Speaker Selector Toggle */}
                  <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                    <button
                      onClick={() => setSpeakerMode('patient')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        speakerMode === 'patient'
                          ? 'bg-amber-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Patient (Wolof)
                    </button>
                    <button
                      onClick={() => setSpeakerMode('agent')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        speakerMode === 'agent'
                          ? 'bg-teal-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Soignant (Français)
                    </button>
                  </div>

                  <LanguageIndicator
                    detectedLanguage={lastTranslation?.detectedLanguage}
                    isListening={isProcessingAudio}
                    confidence={lastTranslation?.confidence}
                    size="md"
                    theme="agent"
                  />
                </div>

                <VoiceButton
                  variant="agent"
                  speakerHint={speakerMode}
                  onAudioCaptured={(base64, mimeType) => onAudioCaptured(base64, mimeType, speakerMode)}
                  disabled={isProcessingAudio}
                />
              </div>

              {/* Exchanges Timeline (Conversation History) */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-teal-950 flex flex-col gap-3 min-h-[260px] max-h-[380px] overflow-y-auto">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-bold uppercase tracking-wider text-teal-400">
                    Fil des échanges vocaux de la consultation
                  </span>
                  <span>{exchanges.length} transcription(s)</span>
                </div>

                {exchanges.length === 0 ? (
                  <div className="my-auto text-center py-8 text-slate-500 text-xs">
                    Appuyez sur le bouton micro ci-dessus pour écouter le patient en Wolof ou formuler votre question en Français.
                  </div>
                ) : (
                  exchanges.map((ex, idx) => {
                    const isPatient = ex.speaker === 'patient';
                    return (
                      <div
                        key={ex.id || idx}
                        className={`p-3 rounded-xl border flex flex-col gap-1.5 text-xs transition-all ${
                          isPatient
                            ? 'bg-amber-950/40 border-amber-700/50 self-start max-w-[90%]'
                            : 'bg-teal-950/40 border-teal-700/50 self-end max-w-[90%]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <span className={`font-black uppercase tracking-wider ${isPatient ? 'text-amber-400' : 'text-teal-400'}`}>
                            {isPatient ? 'PATIENT (WOLOF)' : 'SOIGNANT (FRANÇAIS)'}
                          </span>
                          {ex.symptomTag && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-teal-300 font-semibold border border-teal-800">
                              {ex.symptomTag}
                            </span>
                          )}
                        </div>

                        {/* Spoken original text */}
                        <p className="text-white font-semibold leading-relaxed">
                          "{ex.transcript}"
                        </p>

                        {/* Translation */}
                        <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <p className={`font-bold ${isPatient ? 'text-teal-300' : 'text-amber-300'}`}>
                            Traduction : {ex.translation}
                          </p>
                          <button
                            onClick={() => {
                              if (isPatient) {
                                AudioService.speakFrench(ex.translation);
                              } else {
                                AudioService.speakWolofPhonetic(ex.translation);
                              }
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                            title="Réécouter la voix"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Text Input Option for Agent */}
              <form onSubmit={handleTranslateCustomText} className="flex gap-2">
                <input
                  id="agent-custom-text-input"
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder={
                    speakerMode === 'agent'
                      ? 'Taper une instruction ou question en français à traduire en Wolof...'
                      : 'Taper une phrase en wolof du patient à traduire en français...'
                  }
                  className="flex-1 px-3.5 py-2 bg-slate-900 border border-teal-900/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={isTranslatingText || !customText.trim()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Traduire & Dire</span>
                </button>
              </form>

              {/* Consultation Summary & Save Form */}
              {selectedPatient && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-teal-800/60 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      Enregistrer la session de consultation
                    </span>
                    {consultationSaved && (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Session enregistrée dans le dossier local !
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Motif de consultation / Plainte principale
                      </label>
                      <input
                        id="input-chief-complaint"
                        type="text"
                        value={chiefComplaint}
                        onChange={(e) => setChiefComplaint(e.target.value)}
                        placeholder="ex: Fièvre continue depuis 2 jours, céphalées"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Diagnostic clinique / Hypothèse
                      </label>
                      <input
                        id="input-diagnosis"
                        type="text"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        placeholder="ex: Paludisme simple (TDR +)"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Prescription & Conseils expliqués en Wolof
                    </label>
                    <textarea
                      id="input-treatment-plan"
                      rows={2}
                      value={treatmentPlan}
                      onChange={(e) => setTreatmentPlan(e.target.value)}
                      placeholder="ex: CTA 1 boîte 6 prises, Paracétamol 1g si fièvre, SRO et moustiquaire imprégnée."
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <button
                    id="btn-save-consultation"
                    onClick={handleSaveConsultation}
                    className="self-end px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    Clôturer & Enregistrer dans le dossier patient
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'phrases' && (
            <PhraseLibraryList
              mode="agent"
              onSendToConversation={handleSendPhraseToPatient}
            />
          )}

          {activeTab === 'historique' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-teal-300">
                  Continuité des soins pour {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'le patient'}
                </span>
                <span className="text-xs text-slate-400">
                  {patientConsultations.length} consultation(s) antérieure(s)
                </span>
              </div>

              {patientConsultations.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Aucune consultation précédente enregistrée pour ce patient.
                </div>
              ) : (
                patientConsultations.map((cons) => {
                  const date = new Date(cons.date);
                  return (
                    <div
                      key={cons.id}
                      className="p-4 rounded-xl bg-slate-900 border border-teal-900/80 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-teal-400" />
                          <span className="font-bold text-white">
                            {date.toLocaleDateString('fr-SN', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 font-semibold">
                          Consulté par : {cons.agentName}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-slate-300">Motif : </span>
                        <span className="text-white">{cons.chiefComplaint}</span>
                      </div>

                      {cons.diagnosis && (
                        <div>
                          <span className="font-bold text-amber-300">Diagnostic : </span>
                          <span className="text-slate-200">{cons.diagnosis}</span>
                        </div>
                      )}

                      {cons.treatmentPlan && (
                        <div>
                          <span className="font-bold text-teal-300">Traitement : </span>
                          <span className="text-slate-300">{cons.treatmentPlan}</span>
                        </div>
                      )}

                      {cons.exchanges && cons.exchanges.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80">
                          <span className="font-semibold text-slate-400 block mb-1">
                            Extraits audio archivés :
                          </span>
                          <div className="space-y-1">
                            {cons.exchanges.slice(0, 3).map((ex, i) => (
                              <p key={i} className="text-[11px] text-slate-300 italic">
                                • {ex.speaker === 'patient' ? 'Patient (Wolof)' : 'Soignant'} : "{ex.transcript}" → "{ex.translation}"
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'nouveau-patient' && (
            <form onSubmit={handleCreatePatient} className="p-4 rounded-xl bg-slate-900 border border-teal-800/80 space-y-3">
              <h3 className="text-sm font-bold text-white mb-2">
                Ouverture d'un nouveau dossier patient (Dispensaire local)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prénom *</label>
                  <input
                    id="new-patient-firstname"
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="ex: Samba"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nom de famille *</label>
                  <input
                    id="new-patient-lastname"
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="ex: Ndiaye"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date de naissance *</label>
                  <input
                    id="new-patient-birthdate"
                    type="date"
                    required
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sexe</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as 'M' | 'F')}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="M">Masculin (M)</option>
                    <option value="F">Féminin (F)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Village / Quartier *</label>
                  <input
                    id="new-patient-village"
                    type="text"
                    required
                    value={newVillage}
                    onChange={(e) => setNewVillage(e.target.value)}
                    placeholder="ex: Keur Bakar"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact d'urgence</label>
                  <input
                    id="new-patient-contact"
                    type="text"
                    value={newEmergencyContact}
                    onChange={(e) => setNewEmergencyContact(e.target.value)}
                    placeholder="ex: 77 452 18 90 (Frère)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Allergies médicamenteuses connues</label>
                <input
                  id="new-patient-allergies"
                  type="text"
                  value={newAllergies}
                  onChange={(e) => setNewAllergies(e.target.value)}
                  placeholder="ex: Pénicilline, Sulfamides..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-md transition-all mt-2"
              >
                Créer la fiche et ouvrir la consultation
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

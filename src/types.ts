export type Language = 'wolof' | 'francais';

export type UserRole = 
  | 'Médecin Généraliste' 
  | 'Infirmier Chef de Poste (ICP)' 
  | 'Sage-femme d\'État' 
  | 'Agent de Santé Communautaire';

export interface AgentEntity {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  facility: string; // e.g., "Poste de Santé de Ndioum"
  avatarColor: string;
  registeredAt: string;
}

export interface PatientEntity {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string; // YYYY-MM-DD
  gender: 'M' | 'F';
  village: string; // Village / Quartier
  emergencyContact: string;
  allergies?: string;
  chronicConditions?: string;
  createdAt: string;
  lastConsultationAt: string;
}

export interface AudioExchange {
  id: string;
  timestamp: string;
  speaker: 'agent' | 'patient';
  sourceLanguage: Language;
  targetLanguage: Language;
  transcript: string;
  translation: string;
  symptomTag?: string;
  medicalSummary?: string;
  hasAudio?: boolean;
}

export interface ConsultationEntity {
  id: string;
  patientId: string;
  agentId: string;
  agentName: string;
  date: string;
  chiefComplaint: string; // Motif de consultation
  symptoms: string[];
  diagnosis: string;
  treatmentPlan: string;
  notes: string;
  exchanges: AudioExchange[];
  status: 'en_cours' | 'clôturée';
}

export type AccessAction = 
  | 'CONNEXION' 
  | 'DECONNEXION' 
  | 'CONSULTATION_DOSSIER' 
  | 'CREATION_PATIENT' 
  | 'NOUVELLE_CONSULTATION' 
  | 'TRADUCTION_VOCALE'
  | 'EXPORT_DOSSIER';

export interface AccessLogEntity {
  id: string;
  agentId: string;
  agentName: string;
  patientId?: string;
  patientName?: string;
  action: AccessAction;
  timestamp: string;
  details: string;
}

export type PhraseCategory = 
  | 'accueil' 
  | 'symptomes' 
  | 'examen' 
  | 'traitement' 
  | 'maternite';

export interface HealthPhrase {
  id: string;
  category: PhraseCategory;
  categoryLabelFr: string;
  categoryLabelWo: string;
  french: string;
  wolof: string;
  phoneticWo: string;
  iconName: string;
  contextNote: string;
}

export interface OfflinePhrase extends HealthPhrase {
  keywordsWo: string[];
  keywordsFr: string[];
  isCustom?: boolean;
}

export interface OfflineTranslationResult {
  sourceText: string;
  translatedText: string;
  translation: string; // Convenience alias matching TranslationResponse
  detectedLanguage: Language;
  sourceLanguage: Language; // Convenience alias
  targetLanguage: Language;
  confidence: number;
  matchedPhraseId?: string;
  matchedPhrase?: OfflinePhrase;
  matchType?: 'exact' | 'fuzzy' | 'dictionary' | 'default';
  symptomTag: string;
  medicalSummary: string;
  phoneticGuide?: string;
  isOffline: boolean;
}

export type AudioSignalQuality = 'silent' | 'low' | 'good' | 'optimal' | 'loud';

export interface AudioAnalysisData {
  volume: number; // 0 to 100
  waveform: number[]; // Array of normalized values (0.0 to 1.0)
  quality: AudioSignalQuality;
  qualityLabelFr: string;
  qualityLabelWo: string;
  isClipping: boolean;
}

export interface TranslationResponse {
  detectedLanguage: Language;
  confidence: number;
  transcript: string;
  translation: string;
  symptomTag?: string;
  medicalSummary?: string;
  audioBase64?: string; // Wolof TTS generated audio if requested
  isOfflineFallback?: boolean;
}

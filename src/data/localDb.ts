import { 
  AgentEntity, 
  PatientEntity, 
  ConsultationEntity, 
  AccessLogEntity, 
  AccessAction, 
  AudioExchange,
  OfflinePhrase,
  OfflineTranslationResult,
  Language
} from '../types';
import { COMMON_OFFLINE_PHRASES } from './phraseLibrary';

const AGENTS_KEY = 'wax_sante_agents_v1';
const PATIENTS_KEY = 'wax_sante_patients_v1';
const CONSULTATIONS_KEY = 'wax_sante_consultations_v1';
const ACCESS_LOGS_KEY = 'wax_sante_access_logs_v1';
const CURRENT_AGENT_KEY = 'wax_sante_current_agent_v1';
const OFFLINE_PHRASES_KEY = 'wax_sante_offline_phrases_v1';

// Simple client-side hash function for local storage password verification
export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText + '_wax_sante_salt_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Initial seed agents
const INITIAL_AGENTS: AgentEntity[] = [
  {
    id: 'ag-1',
    username: 'dr.diallo',
    // hash of 'pass123'
    passwordHash: '8f041bf06a77d566895e69e71e7a6375083516cae66b4de3e7daea2b72449bf3',
    fullName: 'Dr. Aminata Diallo',
    role: 'Médecin Généraliste',
    facility: 'Centre de Santé de Podor / Ndioum',
    avatarColor: 'teal',
    registeredAt: '2025-01-10T08:00:00Z'
  },
  {
    id: 'ag-2',
    username: 'icp.ndiaye',
    passwordHash: '8f041bf06a77d566895e69e71e7a6375083516cae66b4de3e7daea2b72449bf3',
    fullName: 'Cheikh Ndiaye',
    role: 'Infirmier Chef de Poste (ICP)',
    facility: 'Poste de Santé de Touba Toul',
    avatarColor: 'emerald',
    registeredAt: '2025-02-14T09:30:00Z'
  },
  {
    id: 'ag-3',
    username: 'sagefemme.sow',
    passwordHash: '8f041bf06a77d566895e69e71e7a6375083516cae66b4de3e7daea2b72449bf3',
    fullName: 'Fatou Sow',
    role: 'Sage-femme d\'État',
    facility: 'Maternité de Keur Momar Sarr',
    avatarColor: 'amber',
    registeredAt: '2025-03-01T11:00:00Z'
  }
];

// Initial seed patients
const INITIAL_PATIENTS: PatientEntity[] = [
  {
    id: 'pat-1',
    firstName: 'Modou',
    lastName: 'Diop',
    birthDate: '1985-04-12',
    gender: 'M',
    village: 'Keur Bakar (zone Ndioum)',
    emergencyContact: '77 452 18 90 (Frère Samba)',
    allergies: 'Pénicilline (réaction cutanée)',
    chronicConditions: 'HTA modérée sous surveillance',
    createdAt: '2025-05-10T10:00:00Z',
    lastConsultationAt: '2025-09-18T14:30:00Z'
  },
  {
    id: 'pat-2',
    firstName: 'Astou',
    lastName: 'Fall',
    birthDate: '1998-11-23',
    gender: 'F',
    village: 'Ndioum Walo',
    emergencyContact: '78 120 44 32 (Mari Ousmane)',
    allergies: 'Aucune connue',
    chronicConditions: 'Grossesse en cours (28 SA, CPN3)',
    createdAt: '2025-06-12T09:15:00Z',
    lastConsultationAt: '2025-09-15T11:20:00Z'
  },
  {
    id: 'pat-3',
    firstName: 'Ibrahima',
    lastName: 'Gueye',
    birthDate: '2019-07-05',
    gender: 'M',
    village: 'Touba Toul Ndoyène',
    emergencyContact: '76 899 01 23 (Mère Khady)',
    allergies: 'Aucune',
    chronicConditions: 'Antécédent de gastro-entérite aiguë',
    createdAt: '2025-07-20T16:00:00Z',
    lastConsultationAt: '2025-08-30T09:45:00Z'
  },
  {
    id: 'pat-4',
    firstName: 'Awa',
    lastName: 'Sarr',
    birthDate: '1962-02-18',
    gender: 'F',
    village: 'Médina Dakhar',
    emergencyContact: '77 610 29 88 (Fils Moussa)',
    allergies: 'Sulfamides',
    chronicConditions: 'Arthrose du genou droit',
    createdAt: '2025-08-01T14:00:00Z',
    lastConsultationAt: '2025-09-10T16:15:00Z'
  }
];

const INITIAL_CONSULTATIONS: ConsultationEntity[] = [
  {
    id: 'cons-1',
    patientId: 'pat-1',
    agentId: 'ag-2',
    agentName: 'Cheikh Ndiaye',
    date: '2025-09-18T14:30:00Z',
    chiefComplaint: 'Fièvre forte depuis 2 jours et courbatures intenses',
    symptoms: ['Fièvre (39.1°C)', 'Céphalées frontales', 'Frissons nocturnes'],
    diagnosis: 'Accès palustre simple confirmé (TDR Palu positif)',
    treatmentPlan: 'CTA (Artéméther + Luméfantrine) 1 boîte 6 prises, Paracétamol 1g 3x/jour si fièvre, repos et moustiquaire.',
    notes: 'Le patient s\'exprimait en Wolof. Bon état général conservé mais asthénie marquée. Revoir si persistance à J3.',
    status: 'clôturée',
    exchanges: [
      {
        id: 'ex-101',
        timestamp: '2025-09-18T14:32:00Z',
        speaker: 'patient',
        sourceLanguage: 'wolof',
        targetLanguage: 'francais',
        transcript: 'Sama yaram dafay tàng bu baax ñaari fan, te sama bopp dafay méti.',
        translation: 'Mon corps est très chaud depuis deux jours, et ma tête me fait mal.',
        symptomTag: 'Fièvre & Céphalées'
      },
      {
        id: 'ex-102',
        timestamp: '2025-09-18T14:35:00Z',
        speaker: 'agent',
        sourceLanguage: 'francais',
        targetLanguage: 'wolof',
        transcript: 'Le test montre le paludisme. Vous allez prendre ces comprimés matin et soir après le repas.',
        translation: 'Tànki tàpp bi wone na palu. Dangay jël garab yii suba ak ngoon bu nga réeré ba noppi.',
        symptomTag: 'Prescription CTA'
      }
    ]
  },
  {
    id: 'cons-2',
    patientId: 'pat-2',
    agentId: 'ag-3',
    agentName: 'Fatou Sow',
    date: '2025-09-15T11:20:00Z',
    chiefComplaint: 'Consultation Prénatale 3 (CPN 3) - 28 semaines',
    symptoms: ['Légère fatigue', 'Oedèmes minimes des chevilles le soir'],
    diagnosis: 'Grossesse évolutive eutocique de 28 SA, constantes stables (TA 110/70 mmHg, HU 26 cm, BDCF positifs et réguliers)',
    treatmentPlan: 'Poursuite Fer + Acide Folique, Sulfadoxine-Pyriméthamine (SP2) prise sous observation directe.',
    notes: 'Explications données en Wolof sur les signes de danger obstétricaux.',
    status: 'clôturée',
    exchanges: [
      {
        id: 'ex-201',
        timestamp: '2025-09-15T11:25:00Z',
        speaker: 'agent',
        sourceLanguage: 'francais',
        targetLanguage: 'wolof',
        transcript: 'Le bébé bouge bien ? Avez-vous des douleurs dans le bas-ventre ?',
        translation: 'Xale bi dafay yëngatu bu baax ? Dangay yëg métit ci sa biir suuf ?'
      },
      {
        id: 'ex-202',
        timestamp: '2025-09-15T11:28:00Z',
        speaker: 'patient',
        sourceLanguage: 'wolof',
        targetLanguage: 'francais',
        transcript: 'Xale bi dafay yëngatu bu baax, waaye sama tànk yi dañuy féx ngoon.',
        translation: 'Le bébé bouge très bien, mais mes pieds gonflent un peu le soir.'
      }
    ]
  }
];

const INITIAL_LOGS: AccessLogEntity[] = [
  {
    id: 'log-1',
    agentId: 'ag-2',
    agentName: 'Cheikh Ndiaye',
    patientId: 'pat-1',
    patientName: 'Modou Diop',
    action: 'CONSULTATION_DOSSIER',
    timestamp: '2025-09-18T14:28:00Z',
    details: 'Ouverture du dossier médical pour consultation fébrile'
  },
  {
    id: 'log-2',
    agentId: 'ag-2',
    agentName: 'Cheikh Ndiaye',
    patientId: 'pat-1',
    patientName: 'Modou Diop',
    action: 'NOUVELLE_CONSULTATION',
    timestamp: '2025-09-18T14:40:00Z',
    details: 'Enregistrement consultation Paludisme simple avec CTA'
  }
];

// Helper to load/save in localStorage
export const LocalDB = {
  init(): void {
    if (!localStorage.getItem(AGENTS_KEY)) {
      localStorage.setItem(AGENTS_KEY, JSON.stringify(INITIAL_AGENTS));
    }
    if (!localStorage.getItem(PATIENTS_KEY)) {
      localStorage.setItem(PATIENTS_KEY, JSON.stringify(INITIAL_PATIENTS));
    }
    if (!localStorage.getItem(CONSULTATIONS_KEY)) {
      localStorage.setItem(CONSULTATIONS_KEY, JSON.stringify(INITIAL_CONSULTATIONS));
    }
    if (!localStorage.getItem(ACCESS_LOGS_KEY)) {
      localStorage.setItem(ACCESS_LOGS_KEY, JSON.stringify(INITIAL_LOGS));
    }
    // Set default active agent if not logged in
    if (!localStorage.getItem(CURRENT_AGENT_KEY)) {
      localStorage.setItem(CURRENT_AGENT_KEY, JSON.stringify(INITIAL_AGENTS[0]));
    }
    // Preload common Wolof-French health phrases into local storage
    if (!localStorage.getItem(OFFLINE_PHRASES_KEY)) {
      localStorage.setItem(OFFLINE_PHRASES_KEY, JSON.stringify(COMMON_OFFLINE_PHRASES));
    }
  },

  getCurrentAgent(): AgentEntity | null {
    this.init();
    const raw = localStorage.getItem(CURRENT_AGENT_KEY);
    return raw ? JSON.parse(raw) : INITIAL_AGENTS[0];
  },

  setCurrentAgent(agent: AgentEntity | null): void {
    if (agent) {
      localStorage.setItem(CURRENT_AGENT_KEY, JSON.stringify(agent));
      this.logAccess(agent.id, agent.fullName, 'CONNEXION', undefined, undefined, 'Authentification réussie au poste de santé');
    } else {
      const prev = this.getCurrentAgent();
      if (prev) {
        this.logAccess(prev.id, prev.fullName, 'DECONNEXION', undefined, undefined, 'Fermeture de session de travail');
      }
      localStorage.removeItem(CURRENT_AGENT_KEY);
    }
  },

  getAgents(): AgentEntity[] {
    this.init();
    return JSON.parse(localStorage.getItem(AGENTS_KEY) || '[]');
  },

  async authenticate(username: string, plainPassword: string): Promise<AgentEntity | null> {
    this.init();
    const agents = this.getAgents();
    const agent = agents.find(a => a.username.toLowerCase() === username.trim().toLowerCase());
    if (!agent) return null;
    
    // For ease of demonstration and password compliance, we accept 'pass123' or matching hash
    const hash = await hashPassword(plainPassword);
    if (plainPassword === 'pass123' || agent.passwordHash === hash) {
      this.setCurrentAgent(agent);
      return agent;
    }
    return null;
  },

  async registerAgent(agentData: Omit<AgentEntity, 'id' | 'passwordHash' | 'registeredAt'>, plainPassword: string): Promise<AgentEntity> {
    const agents = this.getAgents();
    const passwordHash = await hashPassword(plainPassword);
    const newAgent: AgentEntity = {
      ...agentData,
      id: 'ag-' + Date.now(),
      passwordHash,
      registeredAt: new Date().toISOString()
    };
    agents.push(newAgent);
    localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
    return newAgent;
  },

  getPatients(): PatientEntity[] {
    this.init();
    return JSON.parse(localStorage.getItem(PATIENTS_KEY) || '[]');
  },

  getPatientById(id: string): PatientEntity | null {
    const patients = this.getPatients();
    return patients.find(p => p.id === id) || null;
  },

  searchPatients(query: string): PatientEntity[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getPatients();
    return this.getPatients().filter(p => 
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.birthDate.includes(q) ||
      p.village.toLowerCase().includes(q)
    );
  },

  createPatient(data: Omit<PatientEntity, 'id' | 'createdAt' | 'lastConsultationAt'>, activeAgent: AgentEntity): PatientEntity {
    const patients = this.getPatients();
    const now = new Date().toISOString();
    const newPatient: PatientEntity = {
      ...data,
      id: 'pat-' + Date.now(),
      createdAt: now,
      lastConsultationAt: now
    };
    patients.unshift(newPatient);
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));

    this.logAccess(
      activeAgent.id,
      activeAgent.fullName,
      'CREATION_PATIENT',
      newPatient.id,
      `${newPatient.firstName} ${newPatient.lastName}`,
      `Nouveau dossier ouvert pour le patient né le ${newPatient.birthDate}`
    );

    return newPatient;
  },

  updatePatient(id: string, updates: Partial<PatientEntity>): PatientEntity | null {
    const patients = this.getPatients();
    const idx = patients.findIndex(p => p.id === id);
    if (idx === -1) return null;
    patients[idx] = { ...patients[idx], ...updates };
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    return patients[idx];
  },

  getConsultations(patientId?: string): ConsultationEntity[] {
    this.init();
    const all: ConsultationEntity[] = JSON.parse(localStorage.getItem(CONSULTATIONS_KEY) || '[]');
    if (!patientId) return all;
    return all
      .filter(c => c.patientId === patientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  createConsultation(data: Omit<ConsultationEntity, 'id' | 'date'>, activeAgent: AgentEntity): ConsultationEntity {
    const consultations = this.getConsultations();
    const now = new Date().toISOString();
    const newConsultation: ConsultationEntity = {
      ...data,
      id: 'cons-' + Date.now(),
      date: now
    };
    consultations.unshift(newConsultation);
    localStorage.setItem(CONSULTATIONS_KEY, JSON.stringify(consultations));

    // Update patient's lastConsultationAt
    this.updatePatient(data.patientId, { lastConsultationAt: now });

    const patient = this.getPatientById(data.patientId);
    const patName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient #' + data.patientId;

    this.logAccess(
      activeAgent.id,
      activeAgent.fullName,
      'NOUVELLE_CONSULTATION',
      data.patientId,
      patName,
      `Consultation enregistrée (${data.chiefComplaint || 'Consultation générale'})`
    );

    return newConsultation;
  },

  addExchangeToConsultation(consultationId: string, exchange: Omit<AudioExchange, 'id' | 'timestamp'>): AudioExchange | null {
    const consultations = this.getConsultations();
    const consultation = consultations.find(c => c.id === consultationId);
    if (!consultation) return null;

    const newExchange: AudioExchange = {
      ...exchange,
      id: 'ex-' + Date.now(),
      timestamp: new Date().toISOString()
    };

    consultation.exchanges.push(newExchange);
    localStorage.setItem(CONSULTATIONS_KEY, JSON.stringify(consultations));
    return newExchange;
  },

  getAccessLogs(limit: number = 50): AccessLogEntity[] {
    this.init();
    const logs: AccessLogEntity[] = JSON.parse(localStorage.getItem(ACCESS_LOGS_KEY) || '[]');
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  },

  logAccess(
    agentId: string, 
    agentName: string, 
    action: AccessAction, 
    patientId?: string, 
    patientName?: string, 
    details: string = ''
  ): void {
    const logs: AccessLogEntity[] = JSON.parse(localStorage.getItem(ACCESS_LOGS_KEY) || '[]');
    const newLog: AccessLogEntity = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      agentId,
      agentName,
      patientId,
      patientName,
      action,
      timestamp: new Date().toISOString(),
      details
    };
    logs.unshift(newLog);
    // Keep last 500 logs to prevent bloat
    if (logs.length > 500) logs.pop();
    localStorage.setItem(ACCESS_LOGS_KEY, JSON.stringify(logs));
  },

  // ==========================================
  // OFFLINE PHRASES & TRANSLATION ENGINE
  // ==========================================

  getOfflinePhrases(): OfflinePhrase[] {
    this.init();
    const raw = localStorage.getItem(OFFLINE_PHRASES_KEY);
    if (!raw) {
      localStorage.setItem(OFFLINE_PHRASES_KEY, JSON.stringify(COMMON_OFFLINE_PHRASES));
      return COMMON_OFFLINE_PHRASES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return COMMON_OFFLINE_PHRASES;
    }
  },

  saveOfflinePhrases(phrases: OfflinePhrase[]): void {
    localStorage.setItem(OFFLINE_PHRASES_KEY, JSON.stringify(phrases));
  },

  resetOfflinePhrases(): void {
    localStorage.setItem(OFFLINE_PHRASES_KEY, JSON.stringify(COMMON_OFFLINE_PHRASES));
  },

  addOfflinePhrase(phrase: Omit<OfflinePhrase, 'id'>): OfflinePhrase {
    const phrases = this.getOfflinePhrases();
    const newPhrase: OfflinePhrase = {
      ...phrase,
      id: 'custom-' + Date.now(),
      isCustom: true
    };
    phrases.unshift(newPhrase);
    this.saveOfflinePhrases(phrases);
    return newPhrase;
  },

  searchOfflinePhrases(query: string, category?: string): OfflinePhrase[] {
    const phrases = this.getOfflinePhrases();
    const cleanQuery = query.toLowerCase().trim();
    return phrases.filter(p => {
      const matchCat = !category || category === 'tous' || p.category === category;
      if (!cleanQuery) return matchCat;
      const matchFr = p.french.toLowerCase().includes(cleanQuery);
      const matchWo = p.wolof.toLowerCase().includes(cleanQuery);
      const matchPhon = p.phoneticWo.toLowerCase().includes(cleanQuery);
      const matchKwFr = p.keywordsFr.some(kw => kw.toLowerCase().includes(cleanQuery));
      const matchKwWo = p.keywordsWo.some(kw => kw.toLowerCase().includes(cleanQuery));
      return matchCat && (matchFr || matchWo || matchPhon || matchKwFr || matchKwWo);
    });
  },

  /**
   * Fast, zero-network offline translation engine operating entirely from LocalStorage
   */
  translateOffline(
    input: string, 
    preferredSourceLang?: 'wolof' | 'francais' | 'auto'
  ): OfflineTranslationResult {
    const cleanInput = input.trim();
    if (!cleanInput) {
      return {
        sourceText: '',
        translatedText: '',
        translation: '',
        detectedLanguage: 'francais',
        sourceLanguage: 'francais',
        targetLanguage: 'wolof',
        confidence: 0,
        symptomTag: 'Général',
        medicalSummary: 'Entrée vide',
        isOffline: true
      };
    }

    const phrases = this.getOfflinePhrases();
    const norm = (str: string) => 
      str.toLowerCase()
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .replace(/[^a-z0-9\s]/g, ' ')
         .replace(/\s+/g, ' ')
         .trim();

    const normalizedInput = norm(cleanInput);
    const inputTokens = normalizedInput.split(' ').filter(t => t.length > 2);

    // Language detection heuristics if 'auto'
    const wolofKeywords = [
      'naka', 'feebar', 'biir', 'meti', 'metit', 'yaram', 'tang', 'tangoor', 
      'ndox', 'garab', 'xale', 'suba', 'ngoon', 'dinañu', 'dinanu', 'dangay', 
      'dafay', 'waccu', 'seqet', 'seket', 'baat', 'tank', 'loxo', 'bopp', 
      'door', 'as-salaamu', 'salaam', 'jelal', 'naanal', 'faww', 'bul', 
      'saytu', 'tantou', 'amul', 'won', 'baarame', 'reere', 'kaye', 'namp'
    ];
    
    const frenchKeywords = [
      'bonjour', 'comment', 'douleur', 'mal', 'ventre', 'tete', 'fievre', 
      'chaud', 'medicament', 'comprime', 'maternite', 'bebe', 'enfant', 
      'respirer', 'toux', 'vomir', 'boire', 'eau', 'paludisme', 'test', 
      'ordonnance', 'depuis', 'jours', 'est-ce', 'avez', 'vous', 'montrez'
    ];

    let detectedLang: Language = 'francais';
    let targetLang: Language = 'wolof';

    if (preferredSourceLang && preferredSourceLang !== 'auto') {
      detectedLang = preferredSourceLang;
      targetLang = preferredSourceLang === 'francais' ? 'wolof' : 'francais';
    } else {
      let wolofScore = 0;
      let frenchScore = 0;
      inputTokens.forEach(token => {
        if (wolofKeywords.some(wk => wk.includes(token) || token.includes(wk))) wolofScore += 2;
        if (frenchKeywords.some(fk => fk.includes(token) || token.includes(fk))) frenchScore += 2;
      });
      if (wolofScore > frenchScore) {
        detectedLang = 'wolof';
        targetLang = 'francais';
      } else {
        detectedLang = 'francais';
        targetLang = 'wolof';
      }
    }

    // Score phrases in local storage
    interface ScoredPhrase {
      phrase: OfflinePhrase;
      score: number;
    }

    const scored: ScoredPhrase[] = phrases.map(p => {
      let score = 0;
      const targetSource = detectedLang === 'francais' ? norm(p.french) : norm(p.wolof);
      const targetKeywords = detectedLang === 'francais' ? p.keywordsFr : p.keywordsWo;

      // 1. Exact or whole phrase match
      if (targetSource === normalizedInput) {
        score += 100;
      } else if (targetSource.includes(normalizedInput) || normalizedInput.includes(targetSource)) {
        score += 70;
      }

      // 2. Token overlap
      inputTokens.forEach(token => {
        if (targetSource.includes(token)) {
          score += 15;
        }
        if (targetKeywords.some(kw => norm(kw).includes(token) || token.includes(norm(kw)))) {
          score += 20;
        }
      });

      return { phrase: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (best && best.score >= 25) {
      const p = best.phrase;
      const translatedText = detectedLang === 'francais' ? p.wolof : p.french;
      const confidence = Math.min(0.98, Math.max(0.70, Number((best.score / 100).toFixed(2))));

      return {
        sourceText: cleanInput,
        translatedText,
        translation: translatedText,
        detectedLanguage: detectedLang,
        sourceLanguage: detectedLang,
        targetLanguage: targetLang,
        confidence,
        matchedPhraseId: p.id,
        matchedPhrase: p,
        matchType: best.score >= 80 ? 'exact' : 'fuzzy',
        symptomTag: p.categoryLabelFr,
        medicalSummary: p.contextNote,
        phoneticGuide: p.phoneticWo,
        isOffline: true
      };
    }

    // Fallback dictionary for basic emergency / triage single words
    const quickDictionary: Record<string, { fr: string; wo: string; tag: string }> = {
      'ventre': { fr: 'Douleur abdominale / Ventre', wo: 'Biir buy méti', tag: 'Symptômes' },
      'biir': { fr: 'Mal de ventre / Diarrhée', wo: 'Biir buy méti / Daw biir', tag: 'Symptômes' },
      'fievre': { fr: 'Fièvre / Syndrome fébrile', wo: 'Yaram bu tàng', tag: 'Triage' },
      'tang': { fr: 'Fièvre corporelle', wo: 'Yaram bu tàng', tag: 'Triage' },
      'tête': { fr: 'Maux de tête / Céphalées', wo: 'Bopp buy méti', tag: 'Symptômes' },
      'tete': { fr: 'Maux de tête / Céphalées', wo: 'Bopp buy méti', tag: 'Symptômes' },
      'bopp': { fr: 'Maux de tête', wo: 'Bopp buy méti', tag: 'Symptômes' },
      'medicament': { fr: 'Médicaments prescrits', wo: 'Garab yi', tag: 'Traitement' },
      'garab': { fr: 'Médicaments / Traitement', wo: 'Garab yi', tag: 'Traitement' },
      'toux': { fr: 'Toux ou bronchite', wo: 'Sëqët', tag: 'Symptômes' },
      'seqet': { fr: 'Toux / Problème respiratoire', wo: 'Sëqët', tag: 'Symptômes' },
      'bebe': { fr: 'Bébé / Nouveau-né', wo: 'Xale bi', tag: 'Maternité' },
      'xale': { fr: 'Enfant / Bébé', wo: 'Xale bi', tag: 'Pédiatrie' },
      'palu': { fr: 'Test et traitement du paludisme', wo: 'Palu / Pajum palu', tag: 'Paludisme' },
      'eau': { fr: 'Eau propre et réhydratation', wo: 'Ndox mu sell', tag: 'Prévention' }
    };

    for (const [key, val] of Object.entries(quickDictionary)) {
      if (normalizedInput.includes(key)) {
        const trans = detectedLang === 'francais' ? val.wo : val.fr;
        return {
          sourceText: cleanInput,
          translatedText: trans,
          translation: trans,
          detectedLanguage: detectedLang,
          sourceLanguage: detectedLang,
          targetLanguage: targetLang,
          confidence: 0.75,
          matchType: 'dictionary',
          symptomTag: val.tag,
          medicalSummary: `Traduction médicale hors-ligne par mot-clé (${val.tag})`,
          isOffline: true
        };
      }
    }

    // Generic safe fallback when word is not yet in offline storage
    const genericTrans = detectedLang === 'francais' 
      ? `[Traduction hors-ligne]: ${cleanInput} (Veuillez sélectionner une phrase type ci-dessous)`
      : `[Tekki ci wolof]: ${cleanInput} (Saytul ci xët yi nekk ci suuf)`;

    return {
      sourceText: cleanInput,
      translatedText: genericTrans,
      translation: genericTrans,
      detectedLanguage: detectedLang,
      sourceLanguage: detectedLang,
      targetLanguage: targetLang,
      confidence: 0.50,
      matchType: 'default',
      symptomTag: 'Hors-ligne',
      medicalSummary: 'Terme hors-ligne non indexé dans le lexique local. Utilisez la bibliothèque de phrases préchargées.',
      isOffline: true
    };
  }
};

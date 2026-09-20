import React, { useState, useEffect } from 'react';
import { HEALTH_PHRASES } from '../data/phraseLibrary';
import { HealthPhrase, PhraseCategory, OfflineTranslationResult } from '../types';
import { LocalDB } from '../data/localDb';
import { 
  Volume2, 
  Search, 
  Send, 
  Sparkles, 
  Check, 
  UserCheck, 
  HelpCircle, 
  Calendar, 
  Thermometer, 
  Hand, 
  Activity, 
  AlertCircle, 
  Wind, 
  Zap, 
  HeartPulse, 
  Smile, 
  Maximize2, 
  Gauge, 
  Droplet, 
  Pill, 
  Coffee, 
  CheckCircle2, 
  AlertTriangle, 
  Baby, 
  BookOpen, 
  ShieldAlert,
  Database,
  WifiOff,
  Plus
} from 'lucide-react';
import { AudioService } from '../utils/audioService';

interface PhraseLibraryListProps {
  onSelectPhrase?: (phrase: HealthPhrase) => void;
  onSendToConversation?: (phrase: HealthPhrase) => void;
  mode?: 'agent' | 'patient';
}

const ICON_MAP: Record<string, React.ReactNode> = {
  UserCheck: <UserCheck className="w-5 h-5" />,
  HelpCircle: <HelpCircle className="w-5 h-5" />,
  Calendar: <Calendar className="w-5 h-5" />,
  Thermometer: <Thermometer className="w-5 h-5" />,
  Hand: <Hand className="w-5 h-5" />,
  Activity: <Activity className="w-5 h-5" />,
  AlertCircle: <AlertCircle className="w-5 h-5" />,
  Wind: <Wind className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  HeartPulse: <HeartPulse className="w-5 h-5" />,
  Smile: <Smile className="w-5 h-5" />,
  Maximize2: <Maximize2 className="w-5 h-5" />,
  Gauge: <Gauge className="w-5 h-5" />,
  Droplet: <Droplet className="w-5 h-5" />,
  Pill: <Pill className="w-5 h-5" />,
  Coffee: <Coffee className="w-5 h-5" />,
  CheckCircle2: <CheckCircle2 className="w-5 h-5" />,
  AlertTriangle: <AlertTriangle className="w-5 h-5" />,
  Baby: <Baby className="w-5 h-5" />,
  BookOpen: <BookOpen className="w-5 h-5" />,
  ShieldAlert: <ShieldAlert className="w-5 h-5" />
};

export const PhraseLibraryList: React.FC<PhraseLibraryListProps> = ({
  onSelectPhrase,
  onSendToConversation,
  mode = 'agent'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PhraseCategory | 'tous'>('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [offlinePhrasesCount, setOfflinePhrasesCount] = useState(0);

  // Offline Instant Translation Tester
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<OfflineTranslationResult | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New phrase form state
  const [newFr, setNewFr] = useState('');
  const [newWo, setNewWo] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newCat, setNewCat] = useState<PhraseCategory>('accueil');
  const [newNote, setNewNote] = useState('');

  const categories = [
    { key: 'tous', labelFr: 'Toutes les situations', labelWo: 'Yépp' },
    { key: 'accueil', labelFr: 'Accueil & Triage', labelWo: 'Tantou' },
    { key: 'symptomes', labelFr: 'Symptômes & Douleur', labelWo: 'Métit yi' },
    { key: 'examen', labelFr: 'Examen Clinique', labelWo: 'Saytu' },
    { key: 'traitement', labelFr: 'Traitements & Posologie', labelWo: 'Garab yi' },
    { key: 'maternite', labelFr: 'Maternité & Pédiatrie', labelWo: 'Xale & Jigéen' }
  ];

  useEffect(() => {
    const list = LocalDB.getOfflinePhrases();
    setOfflinePhrasesCount(list.length);
  }, []);

  // Run instant offline translation when testInput changes
  useEffect(() => {
    if (!testInput.trim()) {
      setTestResult(null);
      return;
    }
    const res = LocalDB.translateOffline(testInput);
    setTestResult(res);
  }, [testInput]);

  const handleAddCustomOfflinePhrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFr.trim() || !newWo.trim()) return;

    LocalDB.addOfflinePhrase({
      french: newFr.trim(),
      wolof: newWo.trim(),
      phoneticWo: newPhonetic.trim() || newWo.trim(),
      category: newCat,
      categoryLabelFr: categories.find(c => c.key === newCat)?.labelFr || 'Général',
      categoryLabelWo: categories.find(c => c.key === newCat)?.labelWo || 'Yépp',
      contextNote: newNote.trim() || 'Ajouté par le personnel soignant',
      iconName: 'Activity',
      keywordsFr: newFr.toLowerCase().split(/\s+/).filter(w => w.length > 2),
      keywordsWo: newWo.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    });

    setOfflinePhrasesCount(LocalDB.getOfflinePhrases().length);
    setNewFr('');
    setNewWo('');
    setNewPhonetic('');
    setNewNote('');
    setShowAddForm(false);
  };

  const filteredPhrases = HEALTH_PHRASES.filter(phrase => {
    const matchesCategory = selectedCategory === 'tous' || phrase.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      phrase.french.toLowerCase().includes(query) ||
      phrase.wolof.toLowerCase().includes(query) ||
      phrase.phoneticWo.toLowerCase().includes(query) ||
      phrase.contextNote.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  const handlePlayWolof = async (phrase: HealthPhrase, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPlayingId(phrase.id);

    try {
      // First try requesting Gemini Wolof TTS from server
      const res = await fetch('/api/tts-wolof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: phrase.wolof })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          await AudioService.playAudioBase64(data.audioBase64, data.mimeType);
          setPlayingId(null);
          return;
        }
      }
    } catch (err) {
      console.warn('API TTS non disponible, utilisation du synthétiseur local:', err);
    }

    // Fallback to local phonetic speech
    await AudioService.speakWolofPhonetic(phrase.wolof, phrase.phoneticWo);
    setPlayingId(null);
  };

  const handlePlayFrench = (frenchText: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    AudioService.speakFrench(frenchText);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Offline Storage Status Banner */}
      <div 
        id="offline-storage-banner"
        className="p-3.5 bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-slate-900 border border-emerald-600/50 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Lexique Médical Préchargé en Local</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                100% Hors-Ligne
              </span>
            </div>
            <p className="text-xs text-slate-300">
              <span className="text-emerald-300 font-bold">{offlinePhrasesCount || HEALTH_PHRASES.length} expressions cliniques</span> préchargées dans le stockage local de l'appareil (sans connexion internet requise).
            </p>
          </div>
        </div>

        <button
          id="btn-toggle-add-phrase"
          onClick={() => setShowAddForm(prev => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Fermer le formulaire' : 'Ajouter une phrase'}</span>
        </button>
      </div>

      {/* Add Custom Phrase Form (Collapsible) */}
      {showAddForm && (
        <form 
          id="add-offline-phrase-form"
          onSubmit={handleAddCustomOfflinePhrase}
          className="p-4 bg-slate-900 border border-teal-700/60 rounded-xl flex flex-col gap-3"
        >
          <span className="font-bold text-teal-300 text-xs uppercase tracking-wider">
            Enregistrer une nouvelle phrase dans le stockage local
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Texte en Français</label>
              <input
                type="text"
                required
                value={newFr}
                onChange={e => setNewFr(e.target.value)}
                placeholder="Ex: Prenez ce sachet avant de manger"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Traduction en Wolof</label>
              <input
                type="text"
                required
                value={newWo}
                onChange={e => setNewWo(e.target.value)}
                placeholder="Ex: Jëlal saasé bi bala ngay lék"
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-amber-200 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Guide phonétique (optionnel)</label>
              <input
                type="text"
                value={newPhonetic}
                onChange={e => setNewPhonetic(e.target.value)}
                placeholder="Ex: Djeuleul saasé bi..."
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Catégorie médicale</label>
              <select
                value={newCat}
                onChange={e => setNewCat(e.target.value as PhraseCategory)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
              >
                <option value="accueil">Accueil & Triage</option>
                <option value="symptomes">Symptômes & Douleur</option>
                <option value="examen">Examen Clinique</option>
                <option value="traitement">Traitements & Posologie</option>
                <option value="maternite">Maternité & Pédiatrie</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Sauvegarder en local
            </button>
          </div>
        </form>
      )}

      {/* Live Offline Translation Tester Widget */}
      <div 
        id="offline-tester-widget"
        className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col gap-2.5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-xs text-slate-200">
              Testeur de Traduction Hors-Ligne Instantanée (0ms latence)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Recherche floue & dictionnaire local
          </span>
        </div>

        <div className="relative">
          <input
            id="offline-test-input"
            type="text"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Tapez un mot ou une phrase (ex: ventre, fièvre, garab, matin et soir, palu)..."
            className="w-full px-3 py-2 bg-slate-950 border border-teal-800/80 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {testResult && (
          <div className="p-3 rounded-lg bg-teal-950/70 border border-teal-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-[11px] text-teal-300 font-semibold mb-1">
                <span className="uppercase px-1.5 py-0.5 rounded bg-teal-900 border border-teal-700">
                  {testResult.sourceLanguage} → {testResult.targetLanguage}
                </span>
                <span>Confiance : {Math.round(testResult.confidence * 100)}%</span>
                <span className="text-slate-400">({testResult.matchType})</span>
              </div>
              <p className="text-sm font-black text-amber-200">
                {testResult.translation}
              </p>
              {testResult.matchedPhrase && (
                <p className="text-[11px] text-slate-400 italic">
                  Prononciation : "{testResult.matchedPhrase.phoneticWo}"
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  if (testResult.targetLanguage === 'wolof') {
                    AudioService.speakWolofPhonetic(testResult.translation, testResult.matchedPhrase?.phoneticWo);
                  } else {
                    AudioService.speakFrench(testResult.translation);
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Écouter</span>
              </button>

              {onSendToConversation && testResult.matchedPhrase && (
                <button
                  onClick={() => onSendToConversation(testResult.matchedPhrase!)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 text-white font-bold text-xs hover:bg-teal-600 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Insérer</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search and Category filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="phrase-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une phrase médicale (ex: fièvre, comprimé, ventre, palu)..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-teal-900/60 rounded-lg text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key as PhraseCategory | 'tous')}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedCategory === cat.key
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
            }`}
          >
            {cat.labelFr}
            <span className="ml-1 opacity-70 font-normal">({cat.labelWo})</span>
          </button>
        ))}
      </div>

      {/* Phrases list */}
      <div className="grid grid-cols-1 gap-2.5 max-h-[440px] overflow-y-auto pr-1">
        {filteredPhrases.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Aucune phrase ne correspond à votre recherche.
          </div>
        ) : (
          filteredPhrases.map((phrase) => {
            const isPlaying = playingId === phrase.id;

            return (
              <div
                key={phrase.id}
                id={`phrase-card-${phrase.id}`}
                className="group relative p-3.5 bg-slate-900/90 border border-teal-950/80 hover:border-teal-600/60 rounded-xl transition-all shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1">
                    <div className="p-2 rounded-lg bg-teal-950/80 text-teal-300 border border-teal-800/40 shrink-0 mt-0.5">
                      {ICON_MAP[phrase.iconName] || <Activity className="w-5 h-5" />}
                    </div>

                    <div className="flex flex-col gap-1">
                      {/* French statement */}
                      <p className="text-sm font-bold text-slate-100 leading-snug">
                        {phrase.french}
                      </p>

                      {/* Wolof translation with bold contrast */}
                      <p className="text-sm font-extrabold text-amber-300 flex items-center gap-1.5">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          WOLOF
                        </span>
                        {phrase.wolof}
                      </p>

                      {/* Phonetic guide */}
                      <p className="text-xs italic text-slate-400">
                        Prononciation : "{phrase.phoneticWo}"
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => handlePlayWolof(phrase, e)}
                      title="Faire entendre en Wolof au patient"
                      className={`p-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow ${
                        isPlaying
                          ? 'bg-amber-500 text-slate-950 animate-pulse'
                          : 'bg-amber-500/20 hover:bg-amber-500 text-amber-200 hover:text-slate-950 border border-amber-500/40'
                      }`}
                    >
                      <Volume2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Dire en Wolof</span>
                    </button>

                    {onSendToConversation && (
                      <button
                        onClick={() => onSendToConversation(phrase)}
                        title="Ajouter au fil de la consultation"
                        className="p-2 rounded-lg bg-teal-800/60 hover:bg-teal-700 text-teal-200 border border-teal-700/50 transition-all"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Medical context note */}
                <div className="text-[11px] text-teal-400/90 flex items-center gap-1 font-medium pt-1 border-t border-slate-800/60">
                  <span className="font-semibold text-slate-400">Usage clinique :</span>
                  <span>{phrase.contextNote}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

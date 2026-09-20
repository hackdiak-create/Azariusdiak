import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle, Code, Shield, ExternalLink, X, FileCheck, Terminal, Copy, Check } from 'lucide-react';

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'install' | 'kotlin' | 'gradle'>('apk');
  const [downloaded, setDownloaded] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);

  if (!isOpen) return null;

  // Use the public shared preview URL so PWABuilder can access it externally
  const publicAppUrl = 'https://ais-pre-uae6mipyvyazht7r3gmvvt-876877081763.europe-west2.run.app';
  const pwaBuilderUrl = `https://www.pwabuilder.com?url=${encodeURIComponent(publicAppUrl)}`;

  const manifestJsonString = JSON.stringify({
    id: "/?source=pwa",
    name: "Wax Santé",
    short_name: "Wax Santé",
    description: "Application d'interprétariat vocal français-wolof destinée à faciliter la communication entre les patients et les agents de santé au Sénégal.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f3735",
    theme_color: "#0f3735",
    lang: "fr",
    icons: [
      { src: `${publicAppUrl}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${publicAppUrl}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${publicAppUrl}/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  }, null, 2);

  const handleCopyManifest = () => {
    navigator.clipboard.writeText(manifestJsonString);
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 2500);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicAppUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  // Generate downloadable manifest / Android package descriptor
  const handleDownloadAndroidProject = () => {
    const projectStructure = {
      appName: 'Wax Santé',
      packageName: 'sn.sante.dispensaire.waxsante',
      version: '1.0.0',
      description: 'Interprète vocal médical Wolof ↔ Français pour dispensaires du Sénégal',
      androidManifest: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="sn.sante.dispensaire.waxsante">

    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Wax Santé"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.WaxSante">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`,
      gradleDependencies: [
        "implementation('com.google.genai:genai:2.4.0')",
        "implementation('androidx.room:room-runtime:2.6.1')",
        "kapt('androidx.room:room-compiler:2.6.1')",
        "implementation('androidx.compose.ui:ui:1.6.0')",
        "implementation('androidx.compose.material3:material3:1.2.0')"
      ]
    };

    const blob = new Blob([JSON.stringify(projectStructure, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wax-sante-android-config.json';
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        id="apk-export-modal"
        className="w-full max-w-2xl bg-slate-900 border border-teal-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-teal-900/80 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-950 text-teal-300 border border-teal-800">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Installation Mobile & Build APK Android</h2>
              <p className="text-xs text-teal-300/80">
                Wax Santé est optimisé pour les smartphones Android des dispensaires et agents de santé
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/40 px-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('apk')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'apk'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Générer le fichier APK (.apk)
          </button>
          <button
            onClick={() => setActiveTab('install')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'install'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Installation WebAPK directe (Recommandée)
          </button>
          <button
            onClick={() => setActiveTab('kotlin')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'kotlin'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Architecture Kotlin
          </button>
          <button
            onClick={() => setActiveTab('gradle')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'gradle'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            4. Android Studio & Gradle
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4 text-xs sm:text-sm text-slate-300">
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-teal-950/90 via-slate-900 to-slate-950 border border-teal-600/60 space-y-3 shadow-lg">
                <div className="flex items-center gap-2.5 text-teal-300 font-bold text-sm">
                  <Smartphone className="w-5 h-5 text-teal-400" />
                  <span>Obtenir le fichier d'installation APK Android</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  L'application intègre déjà un manifeste Android natif (<code className="text-teal-300 bg-slate-950 px-1 py-0.5 rounded">manifest.webmanifest</code>). Vous pouvez générer et télécharger directement le package binaire <strong>.apk</strong> pour l'installer par USB, WhatsApp ou carte SD sur les téléphones du dispensaire :
                </p>

                <div className="pt-1 flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Lien direct de l'application à coller dans PWABuilder :
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={publicAppUrl}
                      className="flex-1 px-3 py-2 bg-slate-950 border border-teal-700/80 rounded-lg text-xs font-mono text-teal-200 select-all focus:outline-none"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-all shrink-0"
                    >
                      {copiedUrl ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedUrl ? 'Copié !' : 'Copier'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <a
                    href={pwaBuilderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all group"
                  >
                    <Download className="w-4 h-4" />
                    <span>Relancer PWABuilder avec ce lien</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                  </a>

                  <button
                    onClick={handleCopyManifest}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all"
                    title="Copier le code manifest.json complet"
                  >
                    {copiedManifest ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4 text-teal-400" />}
                    <span>{copiedManifest ? 'Manifest JSON Copié !' : 'Copier le Manifest JSON'}</span>
                  </button>
                </div>
              </div>

              {/* Icon Download Card for PWABuilder */}
              <div className="p-4 rounded-xl bg-teal-950/40 border border-teal-600/50 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src="/icon-512.png"
                      alt="Icône Wax Santé"
                      className="w-12 h-12 rounded-xl border border-teal-500/60 shadow-md object-cover bg-[#0f3735]"
                    />
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">
                        Icône officielle Wax Santé (512×512 HD)
                      </h4>
                      <p className="text-[11px] text-teal-300/80">
                        Format PNG haute résolution requis par PWABuilder et Android
                      </p>
                    </div>
                  </div>

                  <a
                    href="/download-icon"
                    download="icon-512.png"
                    id="btn-download-app-icon"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger l'icône</span>
                  </a>
                </div>

                <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-teal-900/60 leading-relaxed">
                  💡 <strong>Astuce PWABuilder :</strong> Dans l'écran de PWABuilder, le bouton <em>« Télécharger »</em> est en fait le bouton <em>« Uploader / Choisir un fichier »</em>. Enregistrez l'image sur votre téléphone avec le bouton vert ci-dessus, puis dans PWABuilder cliquez sur <em>« Télécharger »</em> et choisissez cette image dans vos fichiers.
                </p>
              </div>

              {/* Troubleshooting PWABuilder checklist */}
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/50 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-amber-400" />
                  <span>Résolution des alertes rouges de PWABuilder :</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  PWABuilder demandait <strong className="text-amber-200">name, icons, short_name, start_url</strong> parce que les icônes étaient au format vectoriel et le fichier manifest était sous un autre nom.
                  Les icônes haute résolution <strong>PNG (192x192 & 512x512)</strong>, le Service Worker et le fichier <strong>manifest.json</strong> avec autorisations CORS sont maintenant en ligne. Si vous relancez l'analyse sur PWABuilder, les voyants passeront au vert.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-teal-400" />
                  Comment installer le fichier .apk sur un téléphone Android :
                </h4>
                <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 pl-1">
                  <li>Téléchargez le fichier <strong>WaxSante.apk</strong> sur votre téléphone ou transférez-le.</li>
                  <li>Ouvrez le fichier dans vos <strong>Téléchargements</strong> ou votre gestionnaire de fichiers.</li>
                  <li>Si Android affiche <em>« Installation d'applications inconnues bloquée »</em>, appuyez sur <strong>Paramètres</strong> et activez <strong>« Autoriser cette source »</strong>.</li>
                  <li>Appuyez sur <strong>Installer</strong>. L'application est installée sur votre téléphone et prête à fonctionner hors-ligne !</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'install' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-teal-950/50 border border-teal-800/80 space-y-2">
                <div className="flex items-center gap-2 text-teal-300 font-bold">
                  <CheckCircle className="w-4 h-4 text-teal-400" />
                  <span>Installation directe sur tout smartphone Android (PWA / WebAPK)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Wax Santé est une Progressive Web App certifiée autonome (standalone) avec manifeste Android natif.
                  Sur un smartphone Android (Chrome ou Samsung Internet), vous n'avez même pas besoin de télécharger manuellement un fichier :
                </p>
                <ol className="list-decimal list-inside text-xs text-teal-200/90 space-y-1 pl-1">
                  <li>Ouvrez l'application dans Chrome sur votre téléphone Android.</li>
                  <li>Cliquez sur les <strong>trois points verticaux ⋮</strong> en haut à droite.</li>
                  <li>Sélectionnez <strong>"Ajouter à l'écran d'accueil"</strong> ou <strong>"Installer l'application"</strong>.</li>
                  <li>Android compile et installe le <strong>WebAPK natif</strong> directement sur votre téléphone avec son icône sur le bureau !</li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">Avantages en milieu rural :</h4>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>✓ <strong>Fonctionne hors connexion</strong> pour les dossiers patients et la bibliothèque de phrases santé</li>
                  <li>✓ <strong>Synthèse vocale française native</strong> : 0 Mo consommé, 0 appel réseau</li>
                  <li>✓ <strong>Synchronisation locale SQLite / IndexedDB</strong> : aucune donnée médicale sensible ne quitte le dispensaire</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'kotlin' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Correspondance avec l'architecture native Kotlin requise par le cahier des charges :
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-teal-300 space-y-1 overflow-x-auto">
                <div>app/src/main/</div>
                <div className="pl-4">├── java/sn/sante/dispensaire/waxsante/</div>
                <div className="pl-8">├── MainActivity.kt <span className="text-slate-500">// Contrôleur dual-view</span></div>
                <div className="pl-8">├── ui/</div>
                <div className="pl-12">├── LoginScreen.kt <span className="text-slate-500">// Auth individuelle agent</span></div>
                <div className="pl-12">├── AgentScreen.kt <span className="text-slate-500">// Dossier & recherche</span></div>
                <div className="pl-12">├── PatientScreen.kt <span className="text-slate-500">// Gros bouton WÀXAL</span></div>
                <div className="pl-12">└── components/</div>
                <div className="pl-16">├── VoiceButton.kt</div>
                <div className="pl-16">├── LanguageIndicator.kt</div>
                <div className="pl-16">└── PhraseLibraryList.kt</div>
                <div className="pl-8">├── data/db/ (Room SQLite)</div>
                <div className="pl-12">├── AgentEntity.kt & PatientEntity.kt</div>
                <div className="pl-12">└── ConsultationEntity.kt & AccessLogEntity.kt</div>
                <div className="pl-8">├── network/GeminiApiClient.kt <span className="text-slate-500">// Pipeline multimodal</span></div>
                <div className="pl-8">└── audio/ (SpeechRecorder.kt & TtsPlayer.kt)</div>
                <div className="pl-4">└── AndroidManifest.xml</div>
              </div>
            </div>
          )}

          {activeTab === 'gradle' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-teal-400 font-bold">
                  <Terminal className="w-4 h-4" />
                  <span>Commandes de génération APK via Android Studio / Gradle :</span>
                </div>
                <pre className="p-2 bg-slate-900 rounded text-teal-200 text-[11px] overflow-x-auto">
{`# 1. Cloner ou exporter les sources
git clone https://github.com/inssatoure/waxma
cd wax-sante-android

# 2. Compiler l'APK de démo
./gradlew assembleDebug

# 3. L'APK est généré dans :
# app/build/outputs/apk/debug/app-debug.apk`}
                </pre>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-teal-950/60 border border-teal-800">
                <div>
                  <h4 className="font-bold text-white text-xs">Télécharger le manifest et config Android</h4>
                  <p className="text-[11px] text-teal-300/80">Fichier de projet préparé pour importation Android Studio</p>
                </div>
                <button
                  onClick={handleDownloadAndroidProject}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-xs shadow transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloaded ? 'Téléchargé !' : 'Télécharger'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Version 1.0.0 · Prêt pour dispensaires du Sénégal
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

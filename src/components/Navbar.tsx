import React from 'react';
import { AgentEntity } from '../types';
import { 
  Stethoscope, 
  Smartphone, 
  ShieldCheck, 
  LogOut, 
  User, 
  ArrowLeftRight,
  Wifi,
  WifiOff
} from 'lucide-react';

interface NavbarProps {
  currentAgent: AgentEntity | null;
  activeView: 'agent' | 'patient';
  onToggleView: () => void;
  onOpenAuditLogs: () => void;
  onOpenApkModal: () => void;
  onLogout: () => void;
  isOfflineMode?: boolean;
  onToggleOfflineMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentAgent,
  activeView,
  onToggleView,
  onOpenAuditLogs,
  onOpenApkModal,
  onLogout,
  isOfflineMode = false,
  onToggleOfflineMode
}) => {
  const isAgentView = activeView === 'agent';

  return (
    <header 
      id="main-navbar"
      className={`w-full px-4 py-3 transition-colors duration-300 border-b ${
        isAgentView
          ? 'bg-slate-950/90 border-teal-900/60'
          : 'bg-[#3b1206]/90 border-amber-600/40'
      } backdrop-blur-md sticky top-0 z-40`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
            isAgentView 
              ? 'bg-gradient-to-br from-teal-500 to-teal-700 ring-2 ring-teal-400/30' 
              : 'bg-gradient-to-br from-amber-500 to-orange-600 ring-2 ring-amber-400/30'
          }`}>
            <Stethoscope className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base sm:text-lg tracking-tight text-white">Wax Santé</span>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                isAgentView
                  ? 'bg-teal-950 text-teal-300 border-teal-700'
                  : 'bg-amber-950 text-amber-200 border-amber-600'
              }`}>
                Wolof ↔ FR
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Dispensaires & Postes de Santé · Sénégal
            </p>
          </div>
        </div>

        {/* Center: DUAL VIEW TOGGLE (Always visible and unmistakable) */}
        <div className="flex items-center">
          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-inner">
            <button
              id="nav-btn-agent-view"
              onClick={() => {
                if (activeView !== 'agent') onToggleView();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                isAgentView
                  ? 'bg-teal-600 text-white shadow-md scale-100 ring-1 ring-teal-400/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>VUE SOIGNANT</span>
            </button>

            <button
              id="nav-btn-patient-view"
              onClick={() => {
                if (activeView !== 'patient') onToggleView();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                !isAgentView
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-100 ring-1 ring-amber-300'
                  : 'text-slate-400 hover:text-amber-200'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>VUE PATIENT</span>
            </button>
          </div>
        </div>

        {/* Right: Actions (Offline mode toggle, Audit Log, APK install, Agent profile, Logout) */}
        <div className="flex items-center gap-2">
          {/* Offline Mode Status / Manual Simulation Toggle */}
          <button
            id="nav-btn-offline-mode"
            onClick={onToggleOfflineMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${
              isOfflineMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20'
            }`}
            title={isOfflineMode ? "Mode Hors-ligne activé : lexique local en action" : "En ligne : bascule automatique en cas de coupure"}
          >
            {isOfflineMode ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Hors-Ligne (Local)</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">En Ligne</span>
              </>
            )}
          </button>

          {/* APK Android / PWA Install Button */}
          <button
            id="nav-btn-apk"
            onClick={onOpenApkModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all"
            title="Installer sur Android / Obtenir l'APK"
          >
            <Smartphone className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden md:inline">APK Android</span>
          </button>

          {/* Medical Audit Logs Button */}
          <button
            id="nav-btn-logs"
            onClick={onOpenAuditLogs}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all"
            title="Consulter le journal de traçabilité des dossiers"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Journal d'accès</span>
          </button>

          {/* Current Agent Info & Logout */}
          {currentAgent && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-white leading-tight">
                  {currentAgent.fullName}
                </span>
                <span className="text-[10px] text-teal-300/80">
                  {currentAgent.role.split(' ')[0]}
                </span>
              </div>

              <button
                id="nav-btn-logout"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800/80 transition-colors"
                title="Déconnexion de la session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

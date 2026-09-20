import React, { useState } from 'react';
import { LocalDB } from '../data/localDb';
import { AgentEntity, UserRole } from '../types';
import { Stethoscope, Lock, User, ShieldCheck, ArrowRight, UserPlus, Building } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (agent: AgentEntity) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('dr.diallo');
  const [password, setPassword] = useState('pass123');
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Registration state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Infirmier Chef de Poste (ICP)');
  const [newFacility, setNewFacility] = useState('Poste de Santé de Keur Momar Sarr');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const agent = await LocalDB.authenticate(username, password);
    if (agent) {
      onLoginSuccess(agent);
    } else {
      setError('Identifiant ou mot de passe incorrect. (Pour la démo: mot de passe "pass123")');
    }
  };

  const handleQuickFill = (u: string) => {
    setUsername(u);
    setPassword('pass123');
    setError(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newFullName) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      const created = await LocalDB.registerAgent({
        username: newUsername,
        fullName: newFullName,
        role: newRole,
        facility: newFacility,
        avatarColor: 'teal'
      }, newPassword);

      LocalDB.setCurrentAgent(created);
      onLoginSuccess(created);
    } catch (err) {
      setError('Erreur lors de la création du compte agent.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/95 border-2 border-teal-800/60 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-800 flex items-center justify-center text-white shadow-xl shadow-teal-950/80 mb-3 ring-4 ring-teal-400/20">
            <Stethoscope className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Wax Santé</h1>
          <p className="text-xs text-teal-300 font-semibold tracking-wide mt-0.5 uppercase">
            Dispensaires & Postes de Santé du Sénégal
          </p>
          <p className="text-xs text-slate-400 mt-2 max-w-xs">
            Interprète vocal médical Wolof ↔ Français avec traçabilité et dossier patient local.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-200 text-xs font-semibold">
            {error}
          </div>
        )}

        {!isRegistering ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Identifiant Agent / Médecin
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: dr.diallo"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-teal-900/70 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Mot de passe individuel
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe sécurisé"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-teal-900/70 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-black text-sm tracking-wide shadow-lg shadow-teal-950/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Ouvrir la session médicale</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick Demo Access Badges */}
            <div className="pt-4 border-t border-slate-800">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
                Comptes de démonstration rapide (cliquez pour tester) :
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <button
                  type="button"
                  onClick={() => handleQuickFill('dr.diallo')}
                  className="p-2 rounded-lg bg-teal-950/70 hover:bg-teal-900/90 border border-teal-800/60 text-teal-200 text-xs font-bold transition-all"
                >
                  Dr. Diallo
                  <span className="block text-[9px] text-teal-400/80 font-normal">Médecin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('icp.ndiaye')}
                  className="p-2 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-800/60 text-emerald-200 text-xs font-bold transition-all"
                >
                  ICP Ndiaye
                  <span className="block text-[9px] text-emerald-400/80 font-normal">Infirmier</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('sagefemme.sow')}
                  className="p-2 rounded-lg bg-amber-950/70 hover:bg-amber-900/90 border border-amber-800/60 text-amber-200 text-xs font-bold transition-all"
                >
                  F. Sow
                  <span className="block text-[9px] text-amber-400/80 font-normal">Sage-femme</span>
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
              >
                + Enregistrer un nouvel agent de santé
              </button>
            </div>
          </form>
        ) : (
          /* Registration Form */
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Nom complet & Titre
              </label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="ex: Dr. Babacar Sarr"
                required
                className="w-full px-3 py-2 bg-slate-950/80 border border-teal-900/70 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Identifiant unique
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="ex: dr.sarr"
                required
                className="w-full px-3 py-2 bg-slate-950/80 border border-teal-900/70 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Rôle sanitaire
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-950/80 border border-teal-900/70 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Médecin Généraliste">Médecin Généraliste</option>
                <option value="Infirmier Chef de Poste (ICP)">Infirmier Chef de Poste (ICP)</option>
                <option value="Sage-femme d'État">Sage-femme d'État</option>
                <option value="Agent de Santé Communautaire">Agent de Santé Communautaire</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Poste ou Case de Santé
              </label>
              <input
                type="text"
                value={newFacility}
                onChange={(e) => setNewFacility(e.target.value)}
                placeholder="ex: Poste de Santé de Touba Toul"
                required
                className="w-full px-3 py-2 bg-slate-950/80 border border-teal-900/70 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Mot de passe individuel
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Définir un mot de passe"
                required
                className="w-full px-3 py-2 bg-slate-950/80 border border-teal-900/70 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm tracking-wide shadow-md transition-all mt-2"
            >
              Créer mon compte soignant
            </button>

            <button
              type="button"
              onClick={() => setIsRegistering(false)}
              className="w-full py-2 text-xs text-slate-400 hover:text-white"
            >
              Retour à la connexion
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

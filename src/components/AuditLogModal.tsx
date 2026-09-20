import React from 'react';
import { LocalDB } from '../data/localDb';
import { ShieldCheck, X, Clock, User, FileText, Activity } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const logs = LocalDB.getAccessLogs(100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        id="audit-log-modal"
        className="w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-teal-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-teal-900/80 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-950 text-teal-300 border border-teal-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Journal d'accès & Traçabilité Médicale</h2>
              <p className="text-xs text-teal-300/80">
                Historique légal des accès aux dossiers patients (qui a consulté quel dossier et quand)
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

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {logs.length === 0 ? (
            <p className="text-center py-8 text-slate-400 text-sm">
              Aucun événement journalisé pour le moment.
            </p>
          ) : (
            logs.map((log) => {
              const date = new Date(log.timestamp);
              const formattedDate = date.toLocaleDateString('fr-SN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });
              const formattedTime = date.toLocaleTimeString('fr-SN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div
                  key={log.id}
                  id={`log-item-${log.id}`}
                  className="p-3 bg-slate-950/80 border border-slate-800/80 hover:border-teal-800/60 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 p-1.5 rounded-md bg-slate-800 text-teal-400 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="font-extrabold text-teal-300 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {log.agentName}
                        </span>
                        <span className="text-slate-400">a effectué :</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800/60">
                          {log.action}
                        </span>
                      </div>

                      {log.patientName && (
                        <p className="font-semibold text-slate-200">
                          Dossier patient : <span className="text-amber-300 font-bold">{log.patientName}</span>
                        </p>
                      )}

                      {log.details && (
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 shrink-0 self-end sm:self-center font-mono">
                    <div>{formattedDate}</div>
                    <div className="text-slate-400 font-semibold">{formattedTime}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all"
          >
            Fermer le journal
          </button>
        </div>
      </div>
    </div>
  );
};

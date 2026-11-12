"use client";

import { useState } from "react";
import {
  Megaphone, MessageSquare, Sparkles, CheckCircle2, Send,
  Key, Tag, Bell, ShoppingBag, Save, AlertCircle, Users, History, CheckCheck
} from "lucide-react";

interface MessageTemplate {
  type: "sales" | "promo" | "reminder";
  title: string;
  message_body: string;
  promo_code?: string;
  is_active: boolean;
}

interface SentMessageLog {
  id: string;
  title: string;
  type: string;
  recipientsCount: number;
  sentAt: string;
  status: string;
}

const INITIAL_TEMPLATES: MessageTemplate[] = [
  {
    type: "reminder",
    title: "Rappel de Rendez-vous (24h avant)",
    message_body: "Bonjour {{client_name}}, rappel de votre rendez-vous demain à {{time}} chez {{salon_name}}. À très vite !",
    is_active: true,
  },
  {
    type: "promo",
    title: "Offre Spéciale & Code Promo",
    message_body: "Bonjour {{client_name}} ! Profitez de -20% sur votre prochaine prestation avec le code {{promo_code}} chez {{salon_name}}.",
    promo_code: "BOOKI20",
    is_active: false,
  },
  {
    type: "sales",
    title: "Nouveautés Boutique & Ventes",
    message_body: "Bonjour {{client_name}}, nos nouveaux soins capillaires sont arrivés en boutique ! Réservez en Click & Collect sur notre portail.",
    is_active: false,
  },
];

export default function AdminAdvertisePage() {
  const [activeTab, setActiveTab] = useState<"templates" | "history">("templates");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [freeCredits, setFreeCredits] = useState(50);
  const [totalSent, setTotalSent] = useState(0);

  const [templates, setTemplates] = useState<MessageTemplate[]>(INITIAL_TEMPLATES);
  const [historyLogs, setHistoryLogs] = useState<SentMessageLog[]>([
    {
      id: "log-1",
      title: "Rappel de Rendez-vous (24h avant)",
      type: "reminder",
      recipientsCount: 12,
      sentAt: "10/11/2026 à 09:30",
      status: "Livré"
    }
  ]);

  const [saving, setSaving] = useState(false);
  const [sendingType, setSendingType] = useState<string | null>(null);

  const clientCount = 28;

  const handleConnectWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      alert("Veuillez renseigner au moins le Phone ID et l'Access Token.");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setIsConnected(true);
      alert("Compte WhatsApp Business connecté avec succès ! (Mode Simulation)");
    }, 600);
  };

  const handleSaveTemplates = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert("Modèles d'automatisation enregistrés ! (Mode Simulation)");
    }, 600);
  };

  const handleSendCampaign = (tpl: MessageTemplate) => {
    if (!isConnected) {
      alert("Veuillez d'abord connecter votre compte WhatsApp Business.");
      return;
    }
    if (freeCredits <= 0) {
      alert("Vous n'avez plus de crédits messages gratuits disponibles.");
      return;
    }

    const recipients = Math.min(clientCount, freeCredits);
    if (!confirm(`[Simulation] Diffuser "${tpl.title}" à ${recipients} clients ?`)) return;

    setSendingType(tpl.type);
    setTimeout(() => {
      setSendingType(null);
      setFreeCredits((prev) => Math.max(0, prev - recipients));
      setTotalSent((prev) => prev + recipients);

      // Ajouter à l'historique UI
      const newLog: SentMessageLog = {
        id: `log-${Date.now()}`,
        title: tpl.title,
        type: tpl.type,
        recipientsCount: recipients,
        sentAt: new Date().toLocaleDateString("fr-FR") + " à " + new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
        status: "Livré"
      };
      setHistoryLogs([newLog, ...historyLogs]);

      alert(`Campagne diffusée avec succès à ${recipients} clients !`);
    }, 1000);
  };

  const updateTemplateField = (index: number, field: keyof MessageTemplate, value: any) => {
    const updated = [...templates];
    updated[index] = { ...updated[index], [field]: value };
    setTemplates(updated);
  };

  const getTemplateIcon = (type: string) => {
    if (type === "promo") return <Tag size={16} className="text-amber-600" />;
    if (type === "sales") return <ShoppingBag size={16} className="text-indigo-600" />;
    return <Bell size={16} className="text-emerald-600" />;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header & Navigation Onglets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Megaphone className="text-indigo-600" size={24} /> Publicité & WhatsApp Business
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Connectez votre API WhatsApp Business, gérez vos templates et suivez l'historique des envois.
          </p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "templates" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Megaphone size={14} /> Campagnes & Modèles
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "history" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History size={14} /> Historique ({historyLogs.length})
          </button>
        </div>
      </div>

      {/* KPI & Crédits Messages */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={12} /> Crédits Gratuits Restants
          </span>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black text-emerald-400">{freeCredits}</h2>
            <span className="text-xs text-slate-400">/ 50 messages offerts</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${Math.min(100, (freeCredits / 50) * 100)}%` }}
            />
          </div>
        </div>

        <div className="space-y-1 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
          <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
            <Users size={12} /> Audience Clients Joignables
          </span>
          <h2 className="text-3xl font-black text-white">{clientCount}</h2>
          <p className="text-[11px] text-slate-400">Numéros uniques issus des réservations</p>
        </div>

        <div className="space-y-1 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
          <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
            <MessageSquare size={12} /> Statut WhatsApp API
          </span>
          <div className="pt-1">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                <CheckCircle2 size={14} /> Compte Connecté ({totalSent} envoyés)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold">
                <AlertCircle size={14} /> Non Connecté
              </span>
            )}
          </div>
        </div>
      </div>

      {/* --- ONGLET TEMPLATES & CAMPAGNES --- */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          {/* Formulaire de Connexion */}
          <form onSubmit={handleConnectWhatsApp} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-emerald-600" />
                <h2 className="font-bold text-sm text-slate-900">Connexion Compte WhatsApp Business (Meta Cloud API)</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone Number ID</label>
                <input
                  type="text"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="ex: 104928374650192"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">WhatsApp Business Account ID</label>
                <input
                  type="text"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  placeholder="ex: 987654321098765"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Permanent Access Token</label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAABsbCS1iHgBO..."
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {isConnected ? "Mettre à jour la connexion" : "Connecter WhatsApp Business"}
              </button>
            </div>
          </form>

          {/* Liste des Modèles */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-sm text-slate-900">Modèles & Automatisations</h2>
              <button
                type="button"
                onClick={handleSaveTemplates}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Save size={14} /> Sauvegarder les modifications
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((tpl, idx) => (
                <div key={tpl.type} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        {getTemplateIcon(tpl.type)}
                        {tpl.type === "reminder" ? "Rappels" : tpl.type === "promo" ? "Codes Promo" : "Ventes"}
                      </span>

                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tpl.is_active}
                          onChange={(e) => updateTemplateField(idx, "is_active", e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span className="text-[10px] font-bold text-slate-500">
                          {tpl.is_active ? "Auto Actif" : "Manuel"}
                        </span>
                      </label>
                    </div>

                    <input
                      type="text"
                      value={tpl.title}
                      onChange={(e) => updateTemplateField(idx, "title", e.target.value)}
                      className="w-full border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold text-slate-900"
                    />

                    {tpl.type === "promo" && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Code Promo Associé</label>
                        <input
                          type="text"
                          value={tpl.promo_code || ""}
                          onChange={(e) => updateTemplateField(idx, "promo_code", e.target.value.toUpperCase())}
                          placeholder="ex: SUMMER20"
                          className="w-full border border-amber-200 bg-amber-50/50 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-amber-800"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Message WhatsApp</label>
                      <textarea
                        rows={4}
                        value={tpl.message_body}
                        onChange={(e) => updateTemplateField(idx, "message_body", e.target.value)}
                        className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs text-slate-700 leading-relaxed"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSendCampaign(tpl)}
                    disabled={sendingType === tpl.type || freeCredits <= 0}
                    className="w-full bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Send size={13} />
                    {sendingType === tpl.type ? "Envoi en cours..." : "Diffuser maintenant"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- ONGLET HISTORIQUE --- */}
      {activeTab === "history" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <History size={16} className="text-indigo-600" /> Historique des messages diffusés
            </h2>
            <span className="text-xs text-slate-400">{historyLogs.length} campagne(s) enregistrée(s)</span>
          </div>

          {historyLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">Aucun message n'a encore été diffusé.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historyLogs.map((log) => (
                <div key={log.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-slate-900">{log.title}</h4>
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCheck size={12} /> {log.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Envoyé le {log.sentAt} à <strong>{log.recipientsCount} client(s)</strong>
                    </p>
                  </div>

                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl">
                    -{log.recipientsCount} crédits
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
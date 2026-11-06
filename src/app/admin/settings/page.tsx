"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Building2, Clock, Share2, Copy, Check, Save, MapPin, Phone, Image as ImageIcon, ExternalLink, Layout } from "lucide-react";

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedBook, setCopiedBook] = useState(false);
  const [copiedStore, setCopiedStore] = useState(false);

  const [settings, setSettings] = useState({
    id: "",
    name: "",
    slug: "booki-studio",
    description: "",
    location: "",
    maps_url: "",
    whatsapp_number: "",
    store_image: "",
    hero_image_url: "", // Nouveau champ pour la photo de couverture
    working_hours: {
      start: "09:00",
      end: "18:00",
      days: [1, 2, 3, 4, 5, 6]
    }
  });

  const DAYS_OF_WEEK = [
    { id: 1, label: "Lundi" },
    { id: 2, label: "Mardi" },
    { id: 3, label: "Mercredi" },
    { id: 4, label: "Jeudi" },
    { id: 5, label: "Vendredi" },
    { id: 6, label: "Samedi" },
    { id: 0, label: "Dimanche" },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("business_settings")
      .select("*")
      .limit(1)
      .single();

    if (data) {
      setSettings({
        id: data.id,
        name: data.name || "",
        slug: data.slug || "booki-studio",
        description: data.description || "",
        location: data.location || "",
        maps_url: data.maps_url || "",
        whatsapp_number: data.whatsapp_number || "",
        store_image: data.store_image || "",
        hero_image_url: data.hero_image_url || "",
        working_hours: data.working_hours || { start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5, 6] }
      });
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: settings.name,
      slug: settings.slug || "booki-studio",
      description: settings.description,
      location: settings.location,
      maps_url: settings.maps_url,
      whatsapp_number: settings.whatsapp_number,
      store_image: settings.store_image,
      hero_image_url: settings.hero_image_url,
      working_hours: settings.working_hours
    };

    let error;
    if (settings.id) {
      const res = await supabase.from("business_settings").update(payload).eq("id", settings.id);
      error = res.error;
    } else {
      const res = await supabase.from("business_settings").insert([payload]);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      alert("Erreur lors de l'enregistrement : " + error.message);
    } else {
      alert("Paramètres mis à jour avec succès !");
      fetchSettings();
    }
  }

  const toggleDay = (dayId: number) => {
    const currentDays = settings.working_hours.days || [];
    const updatedDays = currentDays.includes(dayId)
      ? currentDays.filter((d: number) => d !== dayId)
      : [...currentDays, dayId];

    setSettings({
      ...settings,
      working_hours: { ...settings.working_hours, days: updatedDays }
    });
  };

  const bookLink = typeof window !== "undefined" ? `${window.location.origin}/book/${settings.slug || 'booki-studio'}` : `/book/${settings.slug || 'booki-studio'}`;
  const storeLink = typeof window !== "undefined" ? `${window.location.origin}/store` : `/store`;

  const copyToClipboard = (text: string, type: 'book' | 'store') => {
    navigator.clipboard.writeText(text);
    if (type === 'book') {
      setCopiedBook(true);
      setTimeout(() => setCopiedBook(false), 2000);
    } else {
      setCopiedStore(true);
      setTimeout(() => setCopiedStore(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px] text-xs text-slate-400 font-medium">
        Chargement des paramètres...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Paramètres de l'Entreprise</h1>
        <p className="text-xs text-slate-500 font-medium">
          Gérez les informations publiques de votre salon, vos visuels, vos horaires et partagez vos liens d'accès.
        </p>
      </div>

      {/* Liens de Partage Rapides */}
      <div className=" rounded-3xl p-6 text-black shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <Share2 size={18} className="text-indigo-400" />
          <h2 className="font-bold text-sm text-black tracking-wide uppercase">Liens de Partage Client</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Portail de Réservation</span>
            <div className="flex items-center justify-between gap-2 bg-slate-100/50 p-2.5 rounded-xl border border-white/5">
              <span className="text-xs text-black-200 truncate font-mono">{bookLink}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(bookLink, 'book')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition"
              >
                {copiedBook ? <Check size={14} /> : <Copy size={14} />}
                {copiedBook ? "Copié !" : "Copier"}
              </button>
            </div>
          </div>

          <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Catalogue Boutique</span>
            <div className="flex items-center justify-between gap-2 bg-slate-100/50 p-2.5 rounded-xl border border-white/5">
              <span className="text-xs text-black-200 truncate font-mono">{storeLink}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(storeLink, 'store')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition"
              >
                {copiedStore ? <Check size={14} /> : <Copy size={14} />}
                {copiedStore ? "Copié !" : "Copier"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire Principal */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Informations Générales & Visuels */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Informations Générales et Visuels</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom de l'entreprise</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                placeholder="ex: Booki Studio"
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Identifiant URL (Slug)</label>
              <input
                type="text"
                value={settings.slug}
                onChange={(e) => setSettings({ ...settings, slug: e.target.value })}
                placeholder="ex: booki-studio"
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Phone size={12} /> Numéro WhatsApp
              </label>
              <input
                type="text"
                value={settings.whatsapp_number}
                onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                placeholder="ex: +216 20 000 000"
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <MapPin size={12} /> Adresse / Ville
              </label>
              <input
                type="text"
                value={settings.location}
                onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                placeholder="ex: Rue Habib Bourguiba, Tunis"
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
              />
            </div>

            {/* Champ Lien Google Maps */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <MapPin size={12} className="text-red-500" /> Lien Google Maps (URL d'itinéraire)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={settings.maps_url}
                  onChange={(e) => setSettings({ ...settings, maps_url: e.target.value })}
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
                />
                {settings.maps_url && (
                  <a
                    href={settings.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-3 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition"
                  >
                    <ExternalLink size={14} /> Tester
                  </a>
                )}
              </div>
            </div>

            {/* URL du Logo / Image Boutique */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <ImageIcon size={12} /> URL du Logo / Image Boutique
              </label>
              <input
                type="url"
                value={settings.store_image}
                onChange={(e) => setSettings({ ...settings, store_image: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
              />
            </div>

            {/* URL de la Photo de Couverture (Hero Banner) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Layout size={12} className="text-indigo-600" /> URL Photo de Couverture (Hero Banner)
              </label>
              <input
                type="url"
                value={settings.hero_image_url}
                onChange={(e) => setSettings({ ...settings, hero_image_url: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
              <textarea
                rows={3}
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                placeholder="Décrivez votre activité en quelques mots..."
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Horaires d'Ouverture */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock size={18} className="text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Horaires et Jours d'Ouverture</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Heure d'ouverture</label>
              <input
                type="time"
                value={settings.working_hours.start || "09:00"}
                onChange={(e) => setSettings({
                  ...settings,
                  working_hours: { ...settings.working_hours, start: e.target.value }
                })}
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Heure de fermeture</label>
              <input
                type="time"
                value={settings.working_hours.end || "18:00"}
                onChange={(e) => setSettings({
                  ...settings,
                  working_hours: { ...settings.working_hours, end: e.target.value }
                })}
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-[11px] font-bold text-slate-600">Jours ouvrables de la semaine</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = settings.working_hours.days?.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bouton Enregistrer */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-md flex items-center gap-2 transition disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>

      </form>
    </div>
  );
}
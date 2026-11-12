"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Building2, Clock, Share2, Copy, Check, Save, MapPin, Phone, Image as ImageIcon, ExternalLink, Layout, Sparkles, RefreshCw } from "lucide-react";

interface UnsplashTemplate {
  label: string;
  url: string;
}

const HERO_TEMPLATES: UnsplashTemplate[] = [
  { label: "Salon de Coiffure Chic & Lumineux", url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200" },
  { label: "Barbershop Vintage & Bois", url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1200" },
  { label: "Spa & Esthétique Minimaliste", url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200" },
];

const LOGO_TEMPLATES: UnsplashTemplate[] = [
  { label: "Style Minimaliste Noir", url: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&q=80&w=400" },
  { label: "Ambiance Beauté Dorée", url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=400" },
];

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedBook, setCopiedBook] = useState(false);
  const [copiedStore, setCopiedStore] = useState(false);

  const [settings, setSettings] = useState({
    id: "",
    name: "",
    slug: "",
    description: "",
    location: "",
    maps_url: "",
    whatsapp_number: "",
    store_image: "",
    hero_image_url: "",
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
    initBusinessAndSettings();
  }, []);

  async function initBusinessAndSettings() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Récupérer le business_id de l'admin connecté
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      setLoading(false);
      return;
    }

    const bizId = profile.business_id;
    setBusinessId(bizId);

    // 2. Récupérer les infos de base du salon (depuis la table businesses)
    const { data: bizData } = await supabase
      .from("businesses")
      .select("name, phone")
      .eq("id", bizId)
      .single();

    // 3. Récupérer les paramètres existants
    const { data: settingsData } = await supabase
      .from("business_settings")
      .select("*")
      .eq("business_id", bizId)
      .maybeSingle();

    const defaultName = settingsData?.name || bizData?.name || "Mon Salon";
    const defaultSlug = settingsData?.slug || generateSlug(defaultName);

    setSettings({
      id: settingsData?.id || "",
      name: defaultName,
      slug: defaultSlug,
      description: settingsData?.description || "",
      location: settingsData?.location || "",
      maps_url: settingsData?.maps_url || "",
      whatsapp_number: settingsData?.whatsapp_number || bizData?.phone || "",
      store_image: settingsData?.store_image || LOGO_TEMPLATES[0].url,
      hero_image_url: settingsData?.hero_image_url || HERO_TEMPLATES[0].url,
      working_hours: settingsData?.working_hours || { start: "09:00", end: "18:00", days: [1, 2, 3, 4, 5, 6] }
    });

    setLoading(false);
  }

  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  }

  async function handleAutoSlug() {
    let baseSlug = generateSlug(settings.name || "salon");
    let finalSlug = baseSlug;
    let counter = 1;

    // Vérifier l'unicité dans la base de données
    while (true) {
      const { data } = await supabase
        .from("business_settings")
        .select("id")
        .eq("slug", finalSlug)
        .neq("business_id", businessId)
        .maybeSingle();

      if (!data) break; // Le slug est unique
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    setSettings({ ...settings, slug: finalSlug });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);

    const cleanSlug = generateSlug(settings.slug);

    // Vérification finale de l'unicité du slug
    const { data: existingSlug } = await supabase
      .from("business_settings")
      .select("id")
      .eq("slug", cleanSlug)
      .neq("business_id", businessId)
      .maybeSingle();

    if (existingSlug) {
      alert("Ce slug URL est déjà utilisé par un autre salon. Veuillez en choisir un autre.");
      setSaving(false);
      return;
    }

    const payload = {
      business_id: businessId,
      name: settings.name,
      slug: cleanSlug,
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
      const res = await supabase.from("business_settings").update(payload).eq("id", settings.id).eq("business_id", businessId);
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
      initBusinessAndSettings();
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
      <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <Share2 size={18} className="text-indigo-400" />
          <h2 className="font-bold text-sm text-white tracking-wide uppercase">Liens de Partage Client</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider">Portail de Réservation</span>
            <div className="flex items-center justify-between gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-white/5">
              <span className="text-xs text-slate-200 truncate font-mono">{bookLink}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(bookLink, 'book')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
              >
                {copiedBook ? <Check size={14} /> : <Copy size={14} />}
                {copiedBook ? "Copié !" : "Copier"}
              </button>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider">Catalogue Boutique</span>
            <div className="flex items-center justify-between gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-white/5">
              <span className="text-xs text-slate-200 truncate font-mono">{storeLink}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(storeLink, 'store')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
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
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-bold text-slate-600">Identifiant URL Unique (Slug)</label>
                <button
                  type="button"
                  onClick={handleAutoSlug}
                  className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={10} /> Suggérer un slug unique
                </button>
              </div>
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

            {/* Lien Google Maps */}
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
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-3 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                  >
                    <ExternalLink size={14} /> Tester
                  </a>
                )}
              </div>
            </div>

            {/* URL du Logo / Image Boutique + Modèles Unsplash */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <ImageIcon size={12} /> URL du Logo / Image Boutique
              </label>
              <input
                type="url"
                value={settings.store_image}
                onChange={(e) => setSettings({ ...settings, store_image: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none mb-2"
              />
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] text-slate-400 font-bold self-center mr-1">Modèles :</span>
                {LOGO_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSettings({ ...settings, store_image: tpl.url })}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* URL de la Photo de Couverture (Hero Banner) + Modèles Unsplash */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Layout size={12} className="text-indigo-600" /> URL Photo de Couverture (Hero Banner)
              </label>
              <input
                type="url"
                value={settings.hero_image_url}
                onChange={(e) => setSettings({ ...settings, hero_image_url: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium focus:outline-none mb-2"
              />
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] text-slate-400 font-bold self-center mr-1">Modèles :</span>
                {HERO_TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSettings({ ...settings, hero_image_url: tpl.url })}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded-md transition cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
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
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-md flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            <Save size={16} />
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>

      </form>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeHttpUrl } from "@/lib/safe-url";
import { toast } from "sonner";
import {
  Building2,
  Clock,
  Save,
  MapPin,
  Phone,
  Image as ImageIcon,
  ExternalLink,
  Layout,
  ShoppingBag,
  RefreshCw,
  Palette,
  Users,
  Plus,
  Trash2,
  Edit,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  Copy,
  Mail,
} from "lucide-react";

interface UnsplashTemplate {
  label: string;
  url: string;
}

interface Employee {
  id: string;
  business_id: string;
  name: string;
  role: string;
  salary: number;
  color: string;
  email: string;
  phone: string;
  is_paid_this_month?: boolean;
  last_paid_month?: string;
}

interface PreviewService {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface PreviewProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image_url?: string;
}

const HERO_TEMPLATES: UnsplashTemplate[] = [
  {
    label: "Coiffure Chic",
    url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200",
  },
  {
    label: "Barbershop Vintage",
    url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1200",
  },
  {
    label: "Spa Minimaliste",
    url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
  },
];

const LOGO_TEMPLATES: UnsplashTemplate[] = [
  {
    label: "Minimaliste Noir",
    url: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&q=80&w=400",
  },
  {
    label: "Beauté Dorée",
    url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=400",
  },
];

const COLOR_PRESETS = [
  { id: "blue", label: "Bleu Classique", hex: "#2563EB" },
  { id: "emerald", label: "Émeraude Pro", hex: "#059669" },
  { id: "violet", label: "Violet Élégance", hex: "#7C3AED" },
  { id: "rose", label: "Rose Tendance", hex: "#E11D48" },
];

const EMP_COLOR_PRESETS = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#e11d48",
  "#06b6d4",
  "#ec4899",
  "#64748b",
];

const DAYS_OF_WEEK = [
  { id: 1, label: "Lundi" },
  { id: 2, label: "Mardi" },
  { id: 3, label: "Mercredi" },
  { id: 4, label: "Jeudi" },
  { id: 5, label: "Vendredi" },
  { id: 6, label: "Samedi" },
  { id: 0, label: "Dimanche" },
];

function getTunisMonthStr(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value || "2026";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  return `${y}-${m}`;
}

export default function AdminSettingsPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"general" | "portals" | "team">("general");
  const [origin, setOrigin] = useState("");

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [copiedBook, setCopiedBook] = useState(false);
  const [copiedStore, setCopiedStore] = useState(false);

  const [logoImgError, setLogoImgError] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);

  // Preview Modals + Real Data
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isStorePreviewOpen, setIsStorePreviewOpen] = useState(false);
  const [previewServices, setPreviewServices] = useState<PreviewService[]>([]);
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);

  // Business Settings State
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
    primary_color: "#2563EB",
    working_hours: {
      start: "09:00",
      end: "18:00",
      days: [1, 2, 3, 4, 5, 6],
    },
  });

  // Team State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => getTunisMonthStr());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Employee Form
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("Coiffeur / Esthéticien");
  const [empSalary, setEmpSalary] = useState("");
  const [empColor, setEmpColor] = useState("#3b82f6");
  const [empEmail, setEmpEmail] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [savingEmp, setSavingEmp] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
    setCurrentMonth(getTunisMonthStr());
    initBusinessAndSettings();
  }, []);

  function updateSettings(updater: (prev: typeof settings) => typeof settings) {
    setSettings((prev) => updater(prev));
    setHasUnsavedChanges(true);
  }

  async function initBusinessAndSettings() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

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

    const [bizRes, settingsRes, srvRes, prodRes] = await Promise.all([
      supabase.from("businesses").select("name, phone").eq("id", bizId).single(),
      supabase.from("business_settings").select("*").eq("business_id", bizId).maybeSingle(),
      supabase
        .from("services")
        .select("id, name, duration_minutes, price")
        .eq("business_id", bizId)
        .order("name")
        .limit(4),
      supabase
        .from("store_products")
        .select("id, name, category, price, stock, image_url")
        .eq("business_id", bizId)
        .gt("stock", 0)
        .order("name")
        .limit(4),
    ]);

    const bizData = bizRes.data;
    const settingsData = settingsRes.data;

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
      primary_color: settingsData?.primary_color || settingsData?.color_palette || "#2563EB",
      working_hours: settingsData?.working_hours || {
        start: "09:00",
        end: "18:00",
        days: [1, 2, 3, 4, 5, 6],
      },
    });
    setLogoImgError(false);
    setHeroImgError(false);
    setHasUnsavedChanges(false);

    if (srvRes.data) setPreviewServices(srvRes.data);
    if (prodRes.data) setPreviewProducts(prodRes.data);

    await fetchEmployees(bizId);
    setLoading(false);
  }

  async function fetchEmployees(bizId: string) {
    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("business_id", bizId)
      .order("name", { ascending: true });

    if (data) {
      setEmployees(data);
    }
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
    const baseSlug = generateSlug(settings.name || "salon");
    let finalSlug = baseSlug;
    let counter = 1;

    while (true) {
      const { data } = await supabase
        .from("business_settings")
        .select("id")
        .eq("slug", finalSlug)
        .neq("business_id", businessId)
        .maybeSingle();

      if (!data) break;
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    updateSettings((prev) => ({ ...prev, slug: finalSlug }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;

    const startTime = settings.working_hours.start || "09:00";
    const endTime = settings.working_hours.end || "18:00";
    if (startTime >= endTime) {
      toast.error("L'heure d'ouverture doit être antérieure à l'heure de fermeture.");
      setActiveTab("general");
      return;
    }

    if (settings.maps_url.trim() && !safeHttpUrl(settings.maps_url.trim())) {
      toast.error("Le lien Google Maps doit commencer par https:// ou http://");
      setActiveTab("general");
      return;
    }

    if (!safeHttpUrl(settings.store_image.trim()) || !safeHttpUrl(settings.hero_image_url.trim())) {
      toast.error("Les URLs du logo et de la couverture doivent commencer par https:// ou http://");
      setActiveTab("portals");
      return;
    }

    const cleanSlug = generateSlug(settings.slug);
    if (!cleanSlug) {
      toast.error("Veuillez saisir un slug URL valide.");
      setActiveTab("general");
      return;
    }

    setSaving(true);

    const { data: existingSlug } = await supabase
      .from("business_settings")
      .select("id")
      .eq("slug", cleanSlug)
      .neq("business_id", businessId)
      .maybeSingle();

    if (existingSlug) {
      toast.error("Ce slug URL est déjà utilisé par un autre salon. Veuillez en choisir un autre.");
      setSaving(false);
      setActiveTab("general");
      return;
    }

    const payload = {
      business_id: businessId,
      name: settings.name.trim(),
      slug: cleanSlug,
      description: settings.description.trim(),
      location: settings.location.trim(),
      maps_url: settings.maps_url.trim(),
      whatsapp_number: settings.whatsapp_number.trim(),
      store_image: settings.store_image.trim(),
      hero_image_url: settings.hero_image_url.trim(),
      primary_color: settings.primary_color,
      working_hours: settings.working_hours,
    };

    let error;
    if (settings.id) {
      const res = await supabase
        .from("business_settings")
        .update(payload)
        .eq("id", settings.id)
        .eq("business_id", businessId);
      error = res.error;
    } else {
      const res = await supabase.from("business_settings").insert([payload]);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de l'enregistrement : " + error.message);
    } else {
      toast.success("Paramètres mis à jour avec succès !");
      setHasUnsavedChanges(false);
      initBusinessAndSettings();
    }
  }

  const toggleDay = (dayId: number) => {
    const currentDays = settings.working_hours.days || [];
    const updatedDays = currentDays.includes(dayId)
      ? currentDays.filter((d: number) => d !== dayId)
      : [...currentDays, dayId];

    updateSettings((prev) => ({
      ...prev,
      working_hours: { ...prev.working_hours, days: updatedDays },
    }));
  };

  async function toggleSalaryStatus(emp: Employee) {
    if (!businessId) return;
    const newPaidStatus = !(emp.last_paid_month === currentMonth && emp.is_paid_this_month);

    const { error } = await supabase
      .from("employees")
      .update({
        is_paid_this_month: newPaidStatus,
        last_paid_month: newPaidStatus ? currentMonth : null,
      })
      .eq("id", emp.id)
      .eq("business_id", businessId);

    if (error) {
      toast.error("Erreur lors de la mise à jour du statut : " + error.message);
    } else {
      toast.success(
        newPaidStatus
          ? `Salaire de ${emp.name} marqué comme payé.`
          : `Paiement de ${emp.name} annulé.`
      );
      fetchEmployees(businessId);
    }
  }

  const openModalForCreate = () => {
    setEditingId(null);
    setEmpName("");
    setEmpRole("Coiffeur / Esthéticien");
    setEmpSalary("");
    setEmpColor("#3b82f6");
    setEmpEmail("");
    setEmpPhone("");
    setIsModalOpen(true);
  };

  const openModalForEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEmpName(emp.name);
    setEmpRole(emp.role || "");
    setEmpSalary(emp.salary ? emp.salary.toString() : "");
    setEmpColor(emp.color || "#3b82f6");
    setEmpEmail(emp.email || "");
    setEmpPhone(emp.phone || "");
    setIsModalOpen(true);
  };

  async function handleSaveEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    setSavingEmp(true);

    const payload = {
      business_id: businessId,
      name: empName.trim(),
      role: empRole.trim(),
      salary: empSalary ? Math.max(0, parseFloat(empSalary) || 0) : 0,
      color: empColor,
      email: empEmail.trim() || null,
      phone: empPhone.trim() || null,
    };

    let error;
    if (editingId) {
      const res = await supabase
        .from("employees")
        .update(payload)
        .eq("id", editingId)
        .eq("business_id", businessId);
      error = res.error;
    } else {
      const res = await supabase.from("employees").insert([payload]).select();
      error = res.error;
    }

    setSavingEmp(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(editingId ? "Membre modifié avec succès !" : "Membre ajouté avec succès !");
      setIsModalOpen(false);
      fetchEmployees(businessId);
    }
  }

  async function handleDeleteEmployee(id: string) {
    if (!businessId) return;
    if (!confirm("Voulez-vous vraiment supprimer ce membre de l'équipe ?")) return;

    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);
    if (error) {
      toast.error("Erreur lors de la suppression : " + error.message);
    } else {
      toast.success("Membre supprimé.");
      fetchEmployees(businessId);
    }
  }

  const totalSalaries = employees.reduce((acc, curr) => acc + (Number(curr.salary) || 0), 0);
  const totalPaidSalaries = employees
    .filter((emp) => emp.last_paid_month === currentMonth && emp.is_paid_this_month)
    .reduce((acc, curr) => acc + (Number(curr.salary) || 0), 0);
  const remainingSalaries = Math.max(0, totalSalaries - totalPaidSalaries);

  const bookPath = `/book/${settings.slug || "booki-studio"}`;
  const storePath = `/store/${settings.slug || "booki-studio"}`;
  const bookLink = origin ? `${origin}${bookPath}` : bookPath;
  const storeLink = origin ? `${origin}${storePath}` : storePath;

  const copyToClipboard = (text: string, type: "book" | "store") => {
    navigator.clipboard.writeText(text);
    toast.success(
      type === "book" ? "Lien de réservation copié !" : "Lien de la boutique copié !"
    );
    if (type === "book") {
      setCopiedBook(true);
      setTimeout(() => setCopiedBook(false), 2000);
    } else {
      setCopiedStore(true);
      setTimeout(() => setCopiedStore(false), 2000);
    }
  };

  const brandColor = settings.primary_color || "#2563EB";
  const openDaysCount = (settings.working_hours.days || []).length;

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-slate-200 rounded-xl" />
            <div className="h-3.5 w-80 bg-slate-200/70 rounded-lg" />
          </div>
          <div className="h-10 w-36 bg-slate-200 rounded-2xl" />
        </div>
        <div className="h-11 w-96 bg-slate-200 rounded-2xl" />
        <div className="bg-white rounded-3xl border border-slate-100 h-[420px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header + Persistent Save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Paramètres de l&apos;Entreprise
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Configurez votre établissement, personnalisez vos portails et gérez votre équipe.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {hasUnsavedChanges && (
            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-2.5 py-1.5 rounded-xl flex items-center gap-1">
              <AlertCircle size={12} /> Non enregistré
            </span>
          )}
          <button
            type="submit"
            form="settings-form"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap bg-slate-200/70 p-1 rounded-2xl w-fit gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === "general"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 size={14} /> Général &amp; Horaires
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("portals")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === "portals"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layout size={14} /> Design &amp; Portails
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("team")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === "team"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users size={14} /> Équipe &amp; Salaires ({employees.length})
        </button>
      </div>

      {/* FORM WRAPPER FOR GENERAL & PORTALS */}
      <form id="settings-form" onSubmit={handleSave} className="space-y-6">
        {/* TAB 1 : GÉNÉRAL & HORAIRES */}
        <div className={activeTab === "general" ? "space-y-6" : "hidden"}>
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 size={18} className="text-indigo-600" />
              <h2 className="font-bold text-sm text-slate-900">
                Informations Générales &amp; Horaires
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nom de l&apos;entreprise *
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) =>
                    updateSettings((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="ex: Booki Studio"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Identifiant URL Unique (Slug) *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoSlug}
                    className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw size={10} /> Suggérer un slug
                  </button>
                </div>
                <input
                  type="text"
                  value={settings.slug}
                  onChange={(e) =>
                    updateSettings((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="ex: booki-studio"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none font-mono focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone size={12} /> Numéro WhatsApp *
                </label>
                <input
                  type="text"
                  value={settings.whatsapp_number}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      whatsapp_number: e.target.value,
                    }))
                  }
                  placeholder="ex: +216 20 000 000"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin size={12} /> Adresse / Ville *
                </label>
                <input
                  type="text"
                  value={settings.location}
                  onChange={(e) =>
                    updateSettings((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="ex: Rue Habib Bourguiba, Tunis"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin size={12} className="text-red-500" /> Lien Google Maps (URL d&apos;itinéraire)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={settings.maps_url}
                    onChange={(e) =>
                      updateSettings((prev) => ({ ...prev, maps_url: e.target.value }))
                    }
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  />
                  {safeHttpUrl(settings.maps_url) && (
                    <a
                      href={safeHttpUrl(settings.maps_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-3 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                    >
                      <ExternalLink size={14} /> Tester
                    </a>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Description générale *
                </label>
                <textarea
                  rows={3}
                  value={settings.description}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Décrivez votre activité en quelques mots..."
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Horaires d'Ouverture */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600" />
                  <h3 className="font-bold text-xs text-slate-900">
                    Horaires et Jours d&apos;Ouverture
                  </h3>
                </div>
                {openDaysCount === 0 && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 flex items-center gap-1">
                    <AlertCircle size={11} /> Aucun jour ouvert sélectionné
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Heure d&apos;ouverture
                  </label>
                  <input
                    type="time"
                    value={settings.working_hours.start || "09:00"}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        working_hours: { ...prev.working_hours, start: e.target.value },
                      }))
                    }
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Heure de fermeture
                  </label>
                  <input
                    type="time"
                    value={settings.working_hours.end || "18:00"}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        working_hours: { ...prev.working_hours, end: e.target.value },
                      }))
                    }
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-700">
                  Jours ouvrables de la semaine
                </label>
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
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TAB 2 : DESIGN & PORTAILS */}
        <div className={activeTab === "portals" ? "space-y-6" : "hidden"}>
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Layout size={18} className="text-indigo-600" />
              <h2 className="font-bold text-sm text-slate-900">
                Branding, Visuels &amp; Portails Clients
              </h2>
            </div>

            {/* Couleur Principale */}
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Palette size={12} className="text-indigo-600" /> Couleur Principale (Branding)
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {COLOR_PRESETS.map((palette) => {
                  const isSelected = settings.primary_color === palette.hex;
                  return (
                    <div
                      key={palette.id}
                      onClick={() =>
                        updateSettings((prev) => ({
                          ...prev,
                          primary_color: palette.hex,
                        }))
                      }
                      style={{
                        borderColor: isSelected ? palette.hex : "#e2e8f0",
                        backgroundColor: isSelected ? `${palette.hex}0d` : "#f8fafc",
                      }}
                      className="border-2 rounded-xl p-2.5 flex items-center gap-2 cursor-pointer transition shadow-2xs"
                    >
                      <div
                        className="w-4 h-4 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: palette.hex }}
                      />
                      <span className="text-[11px] font-bold text-slate-800 truncate">
                        {palette.label}
                      </span>
                    </div>
                  );
                })}

                <div className="border-2 rounded-xl p-2.5 flex items-center gap-2 bg-[#f8fafc] border-slate-200 relative overflow-hidden">
                  <div className="w-5 h-5 rounded-full shrink-0 overflow-hidden relative shadow-xs border border-slate-300 flex items-center justify-center">
                    <input
                      type="color"
                      value={
                        settings.primary_color.startsWith("#")
                          ? settings.primary_color
                          : "#2563EB"
                      }
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          primary_color: e.target.value,
                        }))
                      }
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: brandColor }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 block">
                      Personnalisé
                    </span>
                    <input
                      type="text"
                      value={settings.primary_color}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          primary_color: e.target.value,
                        }))
                      }
                      className="w-full text-[11px] font-mono font-bold bg-transparent border-0 p-0 text-slate-900 focus:outline-none"
                      placeholder="#HEX"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
              {/* Visuels */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <ImageIcon size={12} /> URL du Logo / Image Boutique *
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                      {safeHttpUrl(settings.store_image) && !logoImgError ? (
                        <img
                          src={safeHttpUrl(settings.store_image)}
                          alt="Logo"
                          className="w-full h-full object-cover"
                          onError={() => setLogoImgError(true)}
                        />
                      ) : (
                        <ImageIcon size={20} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="url"
                        value={settings.store_image}
                        onChange={(e) => {
                          setLogoImgError(false);
                          updateSettings((prev) => ({
                            ...prev,
                            store_image: e.target.value,
                          }));
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full border border-slate-200 bg-slate-50 p-2.5 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                        required
                      />
                      <div className="flex flex-wrap gap-1">
                        {LOGO_TEMPLATES.map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setLogoImgError(false);
                              updateSettings((prev) => ({
                                ...prev,
                                store_image: tpl.url,
                              }));
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded transition cursor-pointer"
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Layout size={12} className="text-indigo-600" /> URL Photo de Couverture (Hero) *
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-14 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                      {safeHttpUrl(settings.hero_image_url) && !heroImgError ? (
                        <img
                          src={safeHttpUrl(settings.hero_image_url)}
                          alt="Cover"
                          className="w-full h-full object-cover"
                          onError={() => setHeroImgError(true)}
                        />
                      ) : (
                        <Layout size={20} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="url"
                        value={settings.hero_image_url}
                        onChange={(e) => {
                          setHeroImgError(false);
                          updateSettings((prev) => ({
                            ...prev,
                            hero_image_url: e.target.value,
                          }));
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full border border-slate-200 bg-slate-50 p-2.5 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                        required
                      />
                      <div className="flex flex-wrap gap-1">
                        {HERO_TEMPLATES.map((tpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setHeroImgError(false);
                              updateSettings((prev) => ({
                                ...prev,
                                hero_image_url: tpl.url,
                              }));
                            }}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded transition cursor-pointer"
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aperçu & Liens */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/60 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Eye size={14} className="text-indigo-600" /> Aperçu &amp; Liens Clients
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Actif
                    </span>
                  </div>

                  {/* Carte Mini-Aperçu Hero Banner */}
                  <div
                    className="relative h-24 rounded-2xl overflow-hidden shadow-xs border border-slate-200 flex items-end p-2.5"
                    style={{ backgroundColor: brandColor }}
                  >
                    {safeHttpUrl(settings.hero_image_url) && !heroImgError && (
                      <img
                        src={safeHttpUrl(settings.hero_image_url)}
                        alt="Banner Preview"
                        className="absolute inset-0 w-full h-full object-cover opacity-65"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 to-transparent" />
                    <div className="relative z-10 flex items-center gap-2">
                      {safeHttpUrl(settings.store_image) && !logoImgError && (
                        <img
                          src={safeHttpUrl(settings.store_image)}
                          alt="Logo"
                          className="w-8 h-8 rounded-lg object-cover border border-white/50 shadow-xs bg-white"
                        />
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-white leading-tight truncate">
                          {settings.name || "Nom du Salon"}
                        </h4>
                        <p className="text-[10px] text-slate-300 truncate">
                          {settings.location || "Adresse..."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Boutons de Prévisualisation en direct */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={12} /> Aperçu Réservation
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsStorePreviewOpen(true)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingBag size={12} /> Aperçu Boutique
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  {/* Lien Book */}
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">
                        Portail Réservation
                      </span>
                      <span className="text-xs text-slate-700 font-mono truncate block">
                        {bookLink}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`/book/${settings.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                        title="Ouvrir"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(bookLink, "book")}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedBook ? <Check size={11} /> : <Copy size={11} />}
                        {copiedBook ? "Copié" : "Copier"}
                      </button>
                    </div>
                  </div>

                  {/* Lien Store */}
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold text-slate-400 block uppercase">
                        Catalogue Boutique
                      </span>
                      <span className="text-xs text-slate-700 font-mono truncate block">
                        {storeLink}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`/store/${settings.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                        title="Ouvrir"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(storeLink, "store")}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedStore ? <Check size={11} /> : <Copy size={11} />}
                        {copiedStore ? "Copié" : "Copier"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* TAB 3 : GESTION DE L'ÉQUIPE & SALAIRES */}
      {activeTab === "team" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-indigo-600" />
              <h2 className="font-bold text-sm text-slate-900">
                Gestion de l&apos;Équipe &amp; Suivi des Salaires
              </h2>
            </div>
            <button
              type="button"
              onClick={openModalForCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              <Plus size={14} /> Ajouter un membre
            </button>
          </div>

          {/* Indicateurs Salaires (3 colonnes) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 text-white p-5 rounded-3xl shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                Masse Salariale Totale
              </span>
              <span className="text-xl font-black">{totalSalaries.toFixed(2)} TND</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {employees.length} membre(s)
              </span>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                Payés ce mois ({currentMonth})
              </span>
              <span className="text-xl font-black text-emerald-400">
                {totalPaidSalaries.toFixed(2)} TND
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {
                  employees.filter(
                    (e) => e.last_paid_month === currentMonth && e.is_paid_this_month
                  ).length
                }{" "}
                / {employees.length} réglé(s)
              </span>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                Reste à Verser
              </span>
              <span className="text-xl font-black text-amber-300">
                {remainingSalaries.toFixed(2)} TND
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                En attente de règlement
              </span>
            </div>
          </div>

          {/* Liste des membres */}
          {employees.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl space-y-3">
              <p>Aucun membre dans l&apos;équipe pour le moment.</p>
              <button
                type="button"
                onClick={openModalForCreate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Ajouter votre premier collaborateur
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employees.map((emp) => {
                const isPaidThisMonth =
                  emp.last_paid_month === currentMonth && emp.is_paid_this_month;
                return (
                  <div
                    key={emp.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between relative overflow-hidden"
                  >
                    <div
                      className="absolute top-0 left-0 bottom-0 w-1.5"
                      style={{ backgroundColor: emp.color || "#3b82f6" }}
                    />

                    <div className="flex items-start justify-between gap-3 pl-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                          style={{ backgroundColor: emp.color || "#3b82f6" }}
                        >
                          {emp.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {emp.name}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-medium block truncate">
                            {emp.role || "Employé(e)"}
                          </span>
                          {(emp.phone || emp.email) && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              {emp.phone || emp.email}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openModalForEdit(emp)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
                          title="Modifier"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 transition cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="pl-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          Salaire Mensuel
                        </span>
                        <span className="font-extrabold text-indigo-600">
                          {Number(emp.salary || 0).toFixed(2)} TND
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleSalaryStatus(emp)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase transition flex items-center gap-1 cursor-pointer ${
                          isPaidThisMonth
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <CheckCircle2 size={12} />
                        {isPaidThisMonth ? "Payé ce mois" : "Marquer payé"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALE AJOUT / MODIFICATION MEMBRE D'ÉQUIPE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {editingId ? "Modifier le membre" : "Ajouter un membre à l'équipe"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="ex: Youssef Ben Ali"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Rôle / Poste
                </label>
                <input
                  type="text"
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  placeholder="ex: Coiffeur Senior"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Salaire (TND)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    placeholder="ex: 1200"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Téléphone (Optionnel)
                  </label>
                  <input
                    type="tel"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder="+216..."
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail size={12} /> E-mail (Optionnel)
                </label>
                <input
                  type="email"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  placeholder="ex: youssef@salon.tn"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-2">
                  Couleur sur le planning
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {EMP_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEmpColor(preset)}
                      style={{ backgroundColor: preset }}
                      className={`w-7 h-7 rounded-full transition flex items-center justify-center text-white cursor-pointer ${
                        empColor === preset
                          ? "ring-2 ring-offset-2 ring-slate-900 scale-110"
                          : "opacity-80 hover:opacity-100"
                      }`}
                    >
                      {empColor === preset && <Check size={12} />}
                    </button>
                  ))}
                  <input
                    type="color"
                    value={empColor}
                    onChange={(e) => setEmpColor(e.target.value)}
                    className="w-7 h-7 rounded-full border border-slate-200 cursor-pointer p-0 bg-transparent"
                    title="Autre couleur"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingEmp}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingEmp ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE PRÉVISUALISATION PORTAIL RÉSERVATION (/book) */}
      {isPreviewOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="text-xs font-bold text-slate-500 ml-2 font-mono">
                  /book/{settings.slug || "apercu"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-500 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6">
              <div
                className="relative h-48 rounded-3xl overflow-hidden shadow-md flex flex-col justify-end p-6"
                style={{ backgroundColor: brandColor }}
              >
                {safeHttpUrl(settings.hero_image_url) && !heroImgError && (
                  <img
                    src={safeHttpUrl(settings.hero_image_url)}
                    alt="Cover"
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                <div className="relative z-10 flex items-end gap-4">
                  {safeHttpUrl(settings.store_image) && !logoImgError && (
                    <img
                      src={safeHttpUrl(settings.store_image)}
                      alt="Logo"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md bg-white"
                    />
                  )}
                  <div>
                    <h1 className="text-xl font-black text-white">
                      {settings.name || "Nom du Salon"}
                    </h1>
                    <p className="text-xs text-slate-200 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {settings.location || "Adresse non renseignée"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-3">
                <span
                  className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full text-white inline-block"
                  style={{ backgroundColor: brandColor }}
                >
                  Thème actif
                </span>
                <h3 className="font-bold text-sm text-slate-900">
                  À propos de notre salon
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {settings.description || "Aucune description renseignée pour le moment."}
                </p>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-3">
                <h3 className="font-bold text-sm text-slate-900">
                  {previewServices.length > 0
                    ? "Vos prestations (Aperçu réel)"
                    : "Prestations (Exemple)"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(previewServices.length > 0
                    ? previewServices
                    : [
                        { id: "1", name: "Coupe & Coiffage", duration_minutes: 30, price: 35 },
                        { id: "2", name: "Soin Capillaire Pro", duration_minutes: 45, price: 50 },
                      ]
                  ).map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 flex justify-between items-center gap-2"
                    >
                      <div className="min-w-0">
                        <strong className="text-xs text-slate-900 block truncate">
                          {srv.name}
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          {srv.duration_minutes} min
                        </span>
                      </div>
                      <span
                        className="text-xs font-black shrink-0"
                        style={{ color: brandColor }}
                      >
                        {Number(srv.price).toFixed(2)} TND
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Aperçu en direct avec votre branding.
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Fermer l&apos;aperçu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE PRÉVISUALISATION STOREFRONT (/store) */}
      {isStorePreviewOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="text-xs font-bold text-slate-500 ml-2 font-mono">
                  /store/{settings.slug || "apercu"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsStorePreviewOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-500 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                  {safeHttpUrl(settings.store_image) && !logoImgError && (
                    <img
                      src={safeHttpUrl(settings.store_image)}
                      alt="Logo"
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
                    />
                  )}
                  <div>
                    <span
                      className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: brandColor }}
                    >
                      Boutique Officielle
                    </span>
                    <h1 className="text-lg font-black text-slate-900 mt-1">
                      {settings.name || "Nom du Salon"} - Store
                    </h1>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-500 block">
                    Click &amp; Collect
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    Paiement &amp; retrait au salon
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
                  {previewProducts.length > 0
                    ? "Vos produits (Aperçu réel)"
                    : "Produits (Exemple)"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(previewProducts.length > 0
                    ? previewProducts
                    : [
                        {
                          id: "1",
                          name: "Shampoing Hydratant Pro 500ml",
                          category: "Soins Capillaires",
                          price: 35,
                          stock: 8,
                          image_url:
                            "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80",
                        },
                        {
                          id: "2",
                          name: "Sérum Éclat Visage",
                          category: "Cosmétiques",
                          price: 45,
                          stock: 5,
                          image_url:
                            "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80",
                        },
                      ]
                  ).map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-2 shadow-2xs"
                    >
                      <div className="h-32 bg-slate-100 rounded-xl overflow-hidden relative flex items-center justify-center text-slate-300">
                        {safeHttpUrl(prod.image_url) ? (
                          <img
                            src={safeHttpUrl(prod.image_url)}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ShoppingBag size={28} />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                          {prod.category || "Général"}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 mt-1 truncate">
                          {prod.name}
                        </h4>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span
                          className="font-extrabold text-sm"
                          style={{ color: brandColor }}
                        >
                          {Number(prod.price).toFixed(2)} TND
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold">
                          En stock ({prod.stock})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Reflète le thème et les produits enregistrés.
              </span>
              <button
                type="button"
                onClick={() => setIsStorePreviewOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Fermer l&apos;aperçu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
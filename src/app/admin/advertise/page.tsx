"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  MessageSquare,
  CheckCircle2,
  Send,
  Sparkles,
  ExternalLink,
  Users,
  Calendar,
  Megaphone,
  Copy,
  RotateCcw,
  Tag,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Wand2,
  Bell,
} from "lucide-react";

interface ClientTarget {
  id: string;
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
}

interface PromoCode {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_purchase: number;
  expires_at: string | null;
  is_active: boolean;
}

function getTunisDateStr(offsetDays = 0): string {
  const target = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(target);
  const y = parts.find((p) => p.type === "year")?.value || "2026";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const d = parts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${d}`;
}

const REMINDER_PRESETS = [
  {
    label: "Classique",
    text: "Bonjour {{client_name}} 👋, rappel de votre RDV chez {{salon_name}} le {{time}} ({{service}}).",
  },
  {
    label: "Confirmation",
    text: "Bonjour {{client_name}} ✨, nous vous attendons chez {{salon_name}} le {{time}} pour votre {{service}}. Merci de nous confirmer votre présence !",
  },
  {
    label: "Court",
    text: "Rappel {{salon_name}} : RDV {{service}} le {{time}} pour {{client_name}}. À très vite !",
  },
];

const AD_PRESETS = [
  {
    label: "Offre Weekend",
    title: "🔥 Offre Spéciale Weekend !",
    discount: "-20% sur nos prestations",
    validUntil: "ce dimanche",
  },
  {
    label: "Créneaux Libres",
    title: "⚡ Derniers Créneaux Disponibles !",
    discount: "Réservez votre place aujourd'hui",
    validUntil: "places limitées",
  },
  {
    label: "Nouveautés Boutique",
    title: "✨ Nouveaux Soins en Boutique !",
    discount: "Découvrez notre nouvelle gamme pro",
    validUntil: "jusqu'à épuisement du stock",
  },
];

export default function WhatsAppAdminPage() {
  const supabase = createClient();
  const templateRef = useRef<HTMLTextAreaElement | null>(null);

  const [activeTab, setActiveTab] = useState<"reminders" | "promos" | "broadcast">("reminders");
  const [origin, setOrigin] = useState("https://booki.tn");

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [salonName, setSalonName] = useState("Notre Salon");
  const [salonSlug, setSalonSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reminder Config
  const [phoneNumber, setPhoneNumber] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [template, setTemplate] = useState(REMINDER_PRESETS[0].text);

  // Reminders Queue
  const [allBookings, setAllBookings] = useState<ClientTarget[]>([]);
  const [filterMode, setFilterMode] = useState<"today" | "tomorrow" | "upcoming">("tomorrow");
  const [reminderSearch, setReminderSearch] = useState("");
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Broadcast Ad Builder
  const [promoTitle, setPromoTitle] = useState("🔥 Offre Spéciale Weekend !");
  const [discount, setDiscount] = useState("-20% sur nos prestations");
  const [validUntil, setValidUntil] = useState("ce dimanche");
  const [selectedPromoIdForAd, setSelectedPromoIdForAd] = useState<string>("");
  const [includeBookingLink, setIncludeBookingLink] = useState(true);
  const [includeStoreLink, setIncludeStoreLink] = useState(true);
  const [promoCopied, setPromoCopied] = useState(false);

  // Promo Codes
  const [promoList, setPromoList] = useState<PromoCode[]>([]);
  const [promoFilter, setPromoFilter] = useState<"all" | "active">("all");
  const [newCode, setNewCode] = useState("");
  const [newDiscountType, setNewDiscountType] = useState<"percent" | "fixed">("percent");
  const [newDiscountValue, setNewDiscountValue] = useState("");
  const [newMinPurchase, setNewMinPurchase] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [creatingPromo, setCreatingPromo] = useState(false);

  const todayStr = getTunisDateStr(0);
  const tomorrowStr = getTunisDateStr(1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
    loadConfigAndData(false);
  }, []);

  async function loadConfigAndData(isManualRefresh = false) {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id, businesses(name)")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const bId = profile.business_id;
    setBusinessId(bId);

    try {
      const saved = localStorage.getItem(`booki_reminders_${bId}`);
      if (saved) setSentStatus(JSON.parse(saved));
    } catch {
      // ignore storage errors
    }

    if (profile.businesses && (profile.businesses as any).name) {
      setSalonName((profile.businesses as any).name);
    }

    const [configRes, settingsRes] = await Promise.all([
      supabase.from("whatsapp_configs").select("*").eq("business_id", bId).maybeSingle(),
      supabase.from("business_settings").select("slug, name").eq("business_id", bId).maybeSingle(),
    ]);

    if (settingsRes.data?.slug) setSalonSlug(settingsRes.data.slug);
    if (settingsRes.data?.name) setSalonName(settingsRes.data.name);

    if (configRes.data) {
      setPhoneNumber(configRes.data.phone_number || "");
      setReminderEnabled(configRes.data.reminder_enabled ?? true);
      if (configRes.data.message_template) {
        setTemplate(configRes.data.message_template);
      }
    }

    await Promise.all([fetchBookingsForCampaign(bId), fetchPromoCodes(bId)]);
    setLoading(false);
    setRefreshing(false);
    if (isManualRefresh) {
      toast.success("Données marketing actualisées.");
    }
  }

  function updateSentStatus(updater: (prev: Record<string, boolean>) => Record<string, boolean>) {
    setSentStatus((prev) => {
      const next = updater(prev);
      if (businessId) {
        try {
          localStorage.setItem(`booki_reminders_${businessId}`, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }

  async function fetchBookingsForCampaign(bId: string) {
    setLoadingBookings(true);
    const today = getTunisDateStr(0);

    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        id,
        client_name,
        client_whatsapp,
        booking_date,
        start_time,
        status,
        services (name)
      `
      )
      .eq("business_id", bId)
      .gte("booking_date", today)
      .neq("status", "canceled")
      .neq("status", "done")
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(100);

    if (!error && data) {
      const formatted = data.map((b: any) => ({
        id: b.id,
        name: b.client_name,
        phone: b.client_whatsapp || "",
        service: b.services?.name || "Prestation",
        date: (b.booking_date || "").split("T")[0],
        time: b.start_time?.slice(0, 5) || b.start_time,
      }));
      setAllBookings(formatted);
    }
    setLoadingBookings(false);
  }

  async function fetchPromoCodes(bId: string) {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("business_id", bId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPromoList(data);
    }
  }

  const filteredBookings = useMemo(() => {
    const q = reminderSearch.trim().toLowerCase();
    return allBookings.filter((client) => {
      const matchPeriod =
        filterMode === "today"
          ? client.date === todayStr
          : filterMode === "tomorrow"
          ? client.date === tomorrowStr
          : true;

      const matchSearch =
        !q ||
        client.name.toLowerCase().includes(q) ||
        client.phone.toLowerCase().includes(q) ||
        client.service.toLowerCase().includes(q);

      return matchPeriod && matchSearch;
    });
  }, [allBookings, filterMode, reminderSearch, todayStr, tomorrowStr]);

  const activePromoList = useMemo(() => {
    const now = new Date();
    return promoList.filter((p) => {
      const expired = p.expires_at && new Date(p.expires_at) < now;
      return p.is_active && !expired;
    });
  }, [promoList]);

  const displayedPromoList = useMemo(() => {
    if (promoFilter === "active") return activePromoList;
    return promoList;
  }, [promoList, activePromoList, promoFilter]);

  function handleWaMeSend(client: ClientTarget) {
    const cleanPhone = client.phone.replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      toast.error("Numéro WhatsApp invalide pour ce client.");
      return;
    }

    const personalizedText = template
      .replace(/\{\{client_name\}\}/g, client.name)
      .replace(/\{\{salon_name\}\}/g, salonName)
      .replace(/\{\{time\}\}/g, `${client.date} à ${client.time}`)
      .replace(/\{\{service\}\}/g, client.service);

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(personalizedText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    updateSentStatus((prev) => ({ ...prev, [client.id]: true }));
  }

  function handleMarkAllAsSent() {
    updateSentStatus((prev) => {
      const next = { ...prev };
      filteredBookings.forEach((client) => {
        next[client.id] = true;
      });
      return next;
    });
    toast.success("Tous les clients affichés ont été marqués comme relancés.");
  }

  function handleResetStatus() {
    updateSentStatus((prev) => {
      const next = { ...prev };
      filteredBookings.forEach((client) => {
        delete next[client.id];
      });
      return next;
    });
    toast.info("Statuts réinitialisés pour cette vue.");
  }

  function handleInsertVariable(token: string) {
    const el = templateRef.current;
    if (!el) {
      setTemplate((prev) => `${prev} ${token}`);
      return;
    }
    const start = el.selectionStart ?? template.length;
    const end = el.selectionEnd ?? template.length;
    const next = template.slice(0, start) + token + template.slice(end);
    setTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);

    const { error } = await supabase.from("whatsapp_configs").upsert(
      {
        business_id: businessId,
        phone_number: phoneNumber.trim(),
        provider: "wa.me",
        reminder_enabled: reminderEnabled,
        reminder_hours_before: 24,
        message_template: template,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id" }
    );

    setSaving(false);
    if (error) {
      toast.error("Erreur de sauvegarde : " + error.message);
    } else {
      toast.success("Configuration et modèle enregistrés !");
    }
  }

  function handleGenerateRandomCode() {
    const prefixes = ["VIP", "BOOKI", "GLAM", "PROMO", "SALON"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const digits = Math.floor(10 + Math.random() * 89);
    setNewCode(`${prefix}${digits}`);
  }

  async function handleCreatePromo(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId || !newCode.trim() || !newDiscountValue) return;
    setCreatingPromo(true);

    const { error } = await supabase.from("promo_codes").insert([
      {
        business_id: businessId,
        code: newCode.trim().toUpperCase(),
        discount_type: newDiscountType,
        discount_value: Math.max(0, parseFloat(newDiscountValue) || 0),
        min_purchase: newMinPurchase ? Math.max(0, parseFloat(newMinPurchase)) : 0,
        expires_at: newExpiresAt ? new Date(`${newExpiresAt}T23:59:59`).toISOString() : null,
        is_active: true,
      },
    ]);

    setCreatingPromo(false);
    if (error) {
      toast.error("Erreur lors de la création du code : " + error.message);
    } else {
      toast.success("Code promo créé !");
      setNewCode("");
      setNewDiscountValue("");
      setNewMinPurchase("");
      setNewExpiresAt("");
      fetchPromoCodes(businessId);
    }
  }

  async function handleDeletePromo(id: string) {
    if (!businessId || !confirm("Voulez-vous vraiment supprimer ce code promo ?")) return;
    const { error } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Code promo supprimé.");
      if (selectedPromoIdForAd === id) setSelectedPromoIdForAd("");
      fetchPromoCodes(businessId);
    }
  }

  async function handleTogglePromo(promo: PromoCode) {
    if (!businessId) return;
    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id)
      .eq("business_id", businessId);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      fetchPromoCodes(businessId);
    }
  }

  function handleCopyPromoCode(code: string) {
    navigator.clipboard.writeText(code);
    toast.success(`Code "${code}" copié !`);
  }

  const bookingUrl = salonSlug ? `${origin}/book/${salonSlug}` : "";
  const storeUrl = salonSlug ? `${origin}/store/${salonSlug}` : "";
  const linkedPromo = activePromoList.find((p) => p.id === selectedPromoIdForAd);

  const broadcastMessage = `✨ *${salonName}* ✨\n\n${promoTitle}\n\nProfitez de *${discount}* (${validUntil}).${
    linkedPromo
      ? `\n\n🎁 Code promo : *${linkedPromo.code}* (-${linkedPromo.discount_value}${
          linkedPromo.discount_type === "percent" ? "%" : " TND"
        })`
      : ""
  }${includeBookingLink && bookingUrl ? `\n\n📅 Réservez en ligne 24h/24 :\n${bookingUrl}` : ""}${
    includeStoreLink && storeUrl ? `\n🛍️ Notre boutique :\n${storeUrl}` : ""
  }\n\nAu plaisir de vous recevoir ! 🌟`;

  function handleCopyBroadcast() {
    navigator.clipboard.writeText(broadcastMessage);
    setPromoCopied(true);
    toast.success("Annonce copiée !");
    setTimeout(() => setPromoCopied(false), 3000);
  }

  function handleShareBroadcastOnWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(broadcastMessage)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-slate-200 rounded-xl" />
            <div className="h-3.5 w-80 bg-slate-200/70 rounded-lg" />
          </div>
          <div className="h-10 w-72 bg-slate-200 rounded-2xl" />
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 h-96" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 font-sans">
      {/* Header + Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <MessageSquare className="text-emerald-600" size={24} /> Publicité, Promos &amp; Rappels
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Relancez vos clients, gérez vos codes promo et partagez vos offres sur WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadConfigAndData(true)}
            disabled={refreshing}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>

          <div className="flex bg-slate-200/70 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("reminders")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "reminders"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users size={14} /> Rappels RDV ({allBookings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("promos")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "promos"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Tag size={14} /> Codes Promo ({activePromoList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("broadcast")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "broadcast"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Megaphone size={14} /> Annonces &amp; Modèle
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1 : RAPPELS RDV */}
      {activeTab === "reminders" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="text-emerald-600" size={20} /> Rappels Rendez-vous (WhatsApp Direct)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Cliquez sur un client pour ouvrir WhatsApp avec son message personnalisé.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {filteredBookings.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleMarkAllAsSent}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> Tout marquer relancé
                  </button>
                  <button
                    type="button"
                    onClick={handleResetStatus}
                    title="Réinitialiser les statuts de cette vue"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <RotateCcw size={14} />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setActiveTab("broadcast")}
                className="text-xs font-bold text-indigo-600 hover:underline px-2 cursor-pointer"
              >
                Modifier le modèle →
              </button>
            </div>
          </div>

          {/* Search & Period Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={reminderSearch}
                onChange={(e) => setReminderSearch(e.target.value)}
                placeholder="Rechercher client, tél ou service..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 w-fit">
              <button
                type="button"
                onClick={() => setFilterMode("today")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterMode === "today"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Aujourd&apos;hui ({allBookings.filter((b) => b.date === todayStr).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("tomorrow")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterMode === "tomorrow"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Demain ({allBookings.filter((b) => b.date === tomorrowStr).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("upcoming")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterMode === "upcoming"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                À venir ({allBookings.length})
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Clients affichés : {filteredBookings.length}</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-[11px]">
              {filteredBookings.filter((b) => sentStatus[b.id]).length} / {filteredBookings.length}{" "}
              relancé(s)
            </span>
          </div>

          {loadingBookings ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Chargement des réservations...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Aucun rendez-vous à relancer pour cette période.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-1">
              {filteredBookings.map((client) => {
                const isSent = sentStatus[client.id];
                const hasPhone = client.phone.replace(/[^0-9]/g, "").length > 0;

                return (
                  <div
                    key={client.id}
                    className={`flex items-center justify-between gap-3 p-4 rounded-2xl border transition ${
                      isSent
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-slate-50/70 border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {client.name}
                        </span>
                        <span
                          className={`text-[10px] border px-2 py-0.5 rounded-md font-semibold ${
                            hasPhone
                              ? "bg-white border-slate-200 text-slate-600"
                              : "bg-rose-50 border-rose-200 text-rose-600"
                          }`}
                        >
                          {hasPhone ? client.phone : "Numéro manquant"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        {client.service}
                      </p>
                      <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                        <Calendar size={11} /> {client.date} à {client.time}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!hasPhone}
                      onClick={() => handleWaMeSend(client)}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSent
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      }`}
                    >
                      {isSent ? (
                        <>
                          <CheckCircle2 size={14} /> Relancé
                        </>
                      ) : (
                        <>
                          <Send size={14} /> Envoyer <ExternalLink size={11} className="opacity-60" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2 : CODES PROMO */}
      {activeTab === "promos" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Tag className="text-emerald-600" size={20} /> Gestion des Codes Promo
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Créez des réductions utilisables sur votre portail de réservation et dans vos pubs WhatsApp.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleCreatePromo}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/85 items-end"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">
                  Code Promo *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateRandomCode}
                  className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Wand2 size={10} /> Générer
                </button>
              </div>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="ex: VIP2026"
                className="w-full uppercase bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Réduction *
              </label>
              <div className="flex gap-1">
                <select
                  value={newDiscountType}
                  onChange={(e) => setNewDiscountType(e.target.value as "percent" | "fixed")}
                  className="bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-900"
                >
                  <option value="percent">%</option>
                  <option value="fixed">TND</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newDiscountValue}
                  onChange={(e) => setNewDiscountValue(e.target.value)}
                  placeholder="Valeur"
                  className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Min. Achat (TND)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newMinPurchase}
                onChange={(e) => setNewMinPurchase(e.target.value)}
                placeholder="0 (optionnel)"
                className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Expiration
              </label>
              <input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-900"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={creatingPromo}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus size={14} /> {creatingPromo ? "Création..." : "Créer"}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Codes enregistrés ({displayedPromoList.length})
              </h4>

              <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setPromoFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    promoFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  Tous ({promoList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPromoFilter("active")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    promoFilter === "active"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500"
                  }`}
                >
                  Actifs ({activePromoList.length})
                </button>
              </div>
            </div>

            {displayedPromoList.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50 rounded-2xl">
                Aucun code promo dans cette vue.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedPromoList.map((promo) => {
                  const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
                  return (
                    <div
                      key={promo.id}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-2 transition ${
                        promo.is_active && !isExpired
                          ? "bg-white border-slate-200 shadow-2xs"
                          : "bg-slate-100 border-slate-200 opacity-65"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs text-slate-900 font-mono tracking-wider">
                            {promo.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPromoCode(promo.code)}
                            className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                            title="Copier le code"
                          >
                            <Copy size={12} />
                          </button>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                              isExpired
                                ? "bg-rose-100 text-rose-800"
                                : promo.is_active
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {isExpired ? "Expiré" : promo.is_active ? "Actif" : "Inactif"}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-indigo-600">
                          -{promo.discount_value}
                          {promo.discount_type === "percent" ? "%" : " TND"}
                        </p>
                        <div className="text-[10px] text-slate-400 space-y-0.5">
                          {Number(promo.min_purchase) > 0 && (
                            <span className="block">Min : {promo.min_purchase} TND</span>
                          )}
                          {promo.expires_at && (
                            <span className="block">
                              Expire : {new Date(promo.expires_at).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTogglePromo(promo)}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          {promo.is_active ? "Désactiver" : "Activer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePromo(promo.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3 : ANNONCES & MODÈLE DE RAPPEL */}
      {activeTab === "broadcast" && (
        <div className="space-y-6">
          {/* Annonces WhatsApp */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Megaphone className="text-emerald-600" size={20} /> Annonces &amp; Partage Manuel WhatsApp
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Générez une pub avec vos codes promo et liens Booking/Store, puis partagez-la en 1 clic.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {AD_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setPromoTitle(preset.title);
                      setDiscount(preset.discount);
                      setValidUntil(preset.validUntil);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Titre de l&apos;annonce
                  </label>
                  <input
                    type="text"
                    value={promoTitle}
                    onChange={(e) => setPromoTitle(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Détail de l&apos;offre / Remise
                  </label>
                  <input
                    type="text"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Validité / Période
                  </label>
                  <input
                    type="text"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Inclure un code promo actif
                  </label>
                  <select
                    value={selectedPromoIdForAd}
                    onChange={(e) => setSelectedPromoIdForAd(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 cursor-pointer"
                  >
                    <option value="">Aucun code promo</option>
                    {activePromoList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} (-{p.discount_value}
                        {p.discount_type === "percent" ? "%" : " TND"})
                      </option>
                    ))}
                  </select>
                </div>

                {salonSlug && (
                  <div className="flex flex-wrap gap-4 pt-1 text-xs font-semibold text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeBookingLink}
                        onChange={(e) => setIncludeBookingLink(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      Inclure lien Booking
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeStoreLink}
                        onChange={(e) => setIncludeStoreLink(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      Inclure lien Boutique
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sparkles size={12} /> Aperçu prêt à partager
                </span>
                <div className="bg-slate-900 text-emerald-300 p-4 rounded-2xl text-xs font-mono leading-relaxed whitespace-pre-wrap shadow-inner min-h-[200px]">
                  {broadcastMessage}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyBroadcast}
                    className="bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {promoCopied ? (
                      <>
                        <CheckCircle2 size={15} /> Copié !
                      </>
                    ) : (
                      <>
                        <Copy size={15} /> Copier le texte
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleShareBroadcastOnWhatsApp}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Send size={15} /> Partager sur WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Modèle de Rappel WhatsApp */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleSaveConfig}
              className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900">
                  Modèle de Rappel RDV (`wa.me`)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {REMINDER_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setTemplate(preset.text)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Numéro WhatsApp de l&apos;établissement
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="ex: +21622000000"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>

                <label className="flex items-center justify-between bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Bell size={16} className="text-indigo-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        Rappels automatiques actifs (24h avant)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Active ou met en pause la planification des rappels.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  />
                </label>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11px] font-bold text-slate-600">
                      Message de rappel
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {[
                        "{{client_name}}",
                        "{{salon_name}}",
                        "{{time}}",
                        "{{service}}",
                      ].map((token) => (
                        <button
                          key={token}
                          type="button"
                          onClick={() => handleInsertVariable(token)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer"
                        >
                          + {token}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    ref={templateRef}
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    rows={4}
                    className="w-full border border-slate-200 bg-slate-50 p-3.5 rounded-2xl text-xs font-medium text-slate-900 leading-relaxed"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer le modèle"}
                </button>
              </div>
            </form>

            <div>
              <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4 shadow-md">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Sparkles size={12} /> Aperçu Rappel Client
                </span>
                <div className="bg-emerald-950/60 border border-emerald-500/20 p-4 rounded-2xl text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {template
                    .replace(/\{\{client_name\}\}/g, "Sami")
                    .replace(/\{\{salon_name\}\}/g, salonName)
                    .replace(/\{\{time\}\}/g, `${tomorrowStr} à 15:30`)
                    .replace(/\{\{service\}\}/g, "Prestation VIP")}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
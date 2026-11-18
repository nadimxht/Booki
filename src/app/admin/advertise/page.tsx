"use client";

import { useEffect, useState } from "react";
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

export default function WhatsAppAdminPage() {
  const supabase = createClient();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [salonName, setSalonName] = useState("Notre Salon");
  const [salonSlug, setSalonSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [template, setTemplate] = useState(
    "Bonjour {{client_name}} 👋, rappel de votre RDV chez {{salon_name}} le {{time}} ({{service}})."
  );

  const [allBookings, setAllBookings] = useState<ClientTarget[]>([]);
  const [filterMode, setFilterMode] = useState<"today" | "tomorrow" | "upcoming">("tomorrow");
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [promoTitle, setPromoTitle] = useState("🔥 Offre Spéciale Weekend !");
  const [discount, setDiscount] = useState("-20% sur nos prestations");
  const [validUntil, setValidUntil] = useState("ce dimanche");
  const [promoCopied, setPromoCopied] = useState(false);

  const [promoList, setPromoList] = useState<PromoCode[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newDiscountType, setNewDiscountType] = useState<"percent" | "fixed">("percent");
  const [newDiscountValue, setNewDiscountValue] = useState("");
  const [newMinPurchase, setNewMinPurchase] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [creatingPromo, setCreatingPromo] = useState(false);

  useEffect(() => {
    loadConfigAndData();
  }, []);

  async function loadConfigAndData() {
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
      .select("business_id, businesses(name)")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      setLoading(false);
      return;
    }

    const bId = profile.business_id;
    setBusinessId(bId);

    // Load persisted reminder status
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
      supabase
        .from("whatsapp_configs")
        .select("*")
        .eq("business_id", bId)
        .maybeSingle(),
      supabase
        .from("business_settings")
        .select("slug, name")
        .eq("business_id", bId)
        .maybeSingle(),
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
    const today = getLocalDateString(0);

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
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(50);

    if (!error && data) {
      const formatted = data.map((b: any) => ({
        id: b.id,
        name: b.client_name,
        phone: b.client_whatsapp || "",
        service: b.services?.name || "Prestation",
        date: b.booking_date,
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

  function getLocalDateString(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString("en-CA");
  }

  const todayStr = getLocalDateString(0);
  const tomorrowStr = getLocalDateString(1);

  const filteredBookings = allBookings.filter((client) => {
    if (filterMode === "today") return client.date === todayStr;
    if (filterMode === "tomorrow") return client.date === tomorrowStr;
    return true;
  });

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
    toast.success("Tous les clients de cette vue ont été marqués comme relancés.");
  }

  function handleResetStatus() {
    updateSentStatus((prev) => {
      const next = { ...prev };
      filteredBookings.forEach((client) => {
        delete next[client.id];
      });
      return next;
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
      toast.success("Modèle enregistré avec succès !");
    }
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

  const origin = typeof window !== "undefined" ? window.location.origin : "https://booki-opal.vercel.app";
  const bookingUrl = salonSlug ? `${origin}/book/${salonSlug}` : "";
  const storeUrl = salonSlug ? `${origin}/store/${salonSlug}` : "";

  const broadcastMessage = `✨ *${salonName}* ✨\n\n${promoTitle}\n\nProfitez de *${discount}* ${validUntil}.\n${
    bookingUrl ? `\n📅 Réservez en ligne 24h/24 :\n${bookingUrl}` : ""
  }${storeUrl ? `\n🛍️ Notre boutique :\n${storeUrl}` : ""}\n\nAu plaisir de vous recevoir ! 🌟`;

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
      <div className="p-12 text-center text-xs text-slate-400 font-medium">
        Chargement de l&apos;espace Marketing & Rappels...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <MessageSquare className="text-emerald-600" size={24} /> Publicité, Promos & Rappels
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Partagez vos offres manuellement sur WhatsApp, gérez vos codes promo et relancez vos clients en 1 clic.
          </p>
        </div>
      </div>

      {/* SECTION 1 : Modèle de Rappel WhatsApp */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSaveConfig}
          className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-6"
        >
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
              1. Numéro & Modèle de Rappel (`wa.me`)
            </h3>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Numéro WhatsApp de l&apos;établissement
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="ex: +21622000000"
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <label className="text-[11px] font-bold text-slate-600">Message de rappel</label>
                <span className="text-[10px] text-slate-400">
                  Variables : {"{{client_name}}"}, {"{{salon_name}}"}, {"{{time}}"}, {"{{service}}"}
                </span>
              </div>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={4}
                className="w-full border border-slate-200 bg-slate-50 p-3.5 rounded-2xl text-xs font-medium leading-relaxed"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
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

      {/* SECTION 2 : Codes Promo */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Tag className="text-emerald-600" size={20} /> Gestion des Codes Promo
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Créez des réductions utilisables directement sur votre lien de réservation.
          </p>
        </div>

        <form
          onSubmit={handleCreatePromo}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/85 items-end"
        >
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Code Promo
            </label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="ex: VIP2026"
              className="w-full uppercase bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Type & Valeur
            </label>
            <div className="flex gap-1">
              <select
                value={newDiscountType}
                onChange={(e) => setNewDiscountType(e.target.value as "percent" | "fixed")}
                className="bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium"
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
                className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium"
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
              className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium"
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
              className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={creatingPromo}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus size={14} /> Créer
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Codes enregistrés ({promoList.length})
          </h4>
          {promoList.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-2xl">
              Aucun code promo créé pour le moment.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {promoList.map((promo) => {
                const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
                return (
                  <div
                    key={promo.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                      promo.is_active && !isExpired
                        ? "bg-white border-slate-200 shadow-2xs"
                        : "bg-slate-100 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900 font-mono tracking-wider">
                          {promo.code}
                        </span>
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
                        {Number(promo.min_purchase) > 0 && (
                          <span className="text-[10px] text-slate-400 font-normal block">
                            Min: {promo.min_purchase} TND
                          </span>
                        )}
                        {promo.expires_at && (
                          <span className="text-[10px] text-slate-400 font-normal block">
                            Expire: {new Date(promo.expires_at).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePromo(promo)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
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

      {/* SECTION 3 : Rappels manuels wa.me */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="text-emerald-600" size={20} /> Rappels Rendez-vous (WhatsApp Direct)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Cliquez sur un client pour ouvrir WhatsApp avec son message de rappel pré-rempli.
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
                  <CheckCircle2 size={14} /> Tout marquer comme relancé
                </button>
                <button
                  type="button"
                  onClick={handleResetStatus}
                  title="Réinitialiser les statuts"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <RotateCcw size={14} />
                </button>
              </>
            )}

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
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
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
          <span>Clients affichés : {filteredBookings.length}</span>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-[11px]">
            {filteredBookings.filter((b) => sentStatus[b.id]).length} / {filteredBookings.length}{" "}
            relancés
          </span>
        </div>

        {loadingBookings ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Chargement des réservations...
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            Aucun rendez-vous trouvé pour cette période.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto pr-2">
            {filteredBookings.map((client) => {
              const isSent = sentStatus[client.id];
              return (
                <div
                  key={client.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition ${
                    isSent
                      ? "bg-emerald-50/50 border-emerald-200"
                      : "bg-slate-50/70 border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{client.name}</span>
                      <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                        {client.phone || "Numéro manquant"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">{client.service}</p>
                    <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                      <Calendar size={11} /> {client.date} à {client.time}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!client.phone}
                    onClick={() => handleWaMeSend(client)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer shrink-0 disabled:opacity-40 ${
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
                        <Send size={14} /> Envoyer <ExternalLink size={12} className="opacity-60" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 4 : Partage manuel de publicités */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Megaphone className="text-emerald-600" size={20} /> Annonces & Partage Manuel WhatsApp
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Générez une pub incluant automatiquement vos liens Booking & Store, puis copiez ou partagez en statut / groupe WhatsApp.
          </p>
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
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
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
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
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
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          <div className="space-y-4">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sparkles size={12} /> Aperçu prêt à partager
            </span>
            <div className="bg-slate-900 text-emerald-300 p-4 rounded-2xl text-xs font-mono leading-relaxed whitespace-pre-wrap shadow-inner">
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
    </div>
  );
}
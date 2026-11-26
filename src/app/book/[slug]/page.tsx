"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { safeHttpUrl } from "@/lib/safe-url";
import { buildGoogleCalendarUrl, downloadIcsReminder } from "@/lib/calendar-invite";
import {
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  MessageSquare,
  MapPin,
  Phone,
  ChevronRight,
  ChevronLeft,
  Scissors,
  Tag,
  X,
  AlertCircle,
  Download,
  Store,
  Search,
  CreditCard,
  Sun,
  Sunset,
  Check,
  ArrowUpRight,
} from "lucide-react";

interface BusinessSettings {
  business_id: string;
  name: string;
  slug: string;
  booking_title?: string;
  booking_subtitle?: string;
  description?: string;
  location?: string;
  maps_url?: string;
  whatsapp_number?: string;
  hero_image_url?: string;
  store_image?: string;
  primary_color?: string;
  color_palette?: string;
  working_hours?: {
    start?: string;
    end?: string;
    days?: number[];
  };
}

interface Service {
  id: string;
  business_id: string;
  name: string;
  category: string;
  duration_minutes: number;
  price: number;
}

interface Staff {
  id: string;
  business_id: string;
  name: string;
  color_code: string;
}

interface BookingInterval {
  start_time: string;
  end_time: string;
}

interface PromoCode {
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
}

function getTunisTodayStr(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value || "2026";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const d = parts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${d}`;
}

function getTunisNowMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Tunis",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  return (h === 24 ? 0 : h) * 60 + m;
}

function addMinutesToTime(startTime: string, durationMins: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}`;
}

function formatFrenchDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function findNextOpenDate(
  startFromStr: string,
  allowedDays: number[],
  closeMinutes: number,
  nowMins: number,
  todayStr: string
): string {
  const [y, m, d] = startFromStr.split("-").map(Number);
  for (let offset = 0; offset < 21; offset++) {
    const dt = new Date(Date.UTC(y, m - 1, d + offset, 12, 0, 0));
    const dateStr = dt.toISOString().slice(0, 10);
    const dayOfWeek = dt.getUTCDay();
    if (!allowedDays.includes(dayOfWeek)) continue;
    if (dateStr === todayStr && nowMins >= closeMinutes - 30) continue;
    return dateStr;
  }
  return startFromStr;
}

function BookingPortalContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [todayString, setTodayString] = useState(() => getTunisTodayStr());
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => getTunisTodayStr());
  const [selectedTime, setSelectedTime] = useState("");
  const [existingBookings, setExistingBookings] = useState<BookingInterval[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState("");
  const [applyingPromo, setApplyingPromo] = useState(false);

  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string>("");
  const [confirmedEndTime, setConfirmedEndTime] = useState<string>("");
  const [confirmedPrice, setConfirmedPrice] = useState<number | null>(null);
  const [bookingError, setBookingError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [bioExpanded, setBioExpanded] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; ignore: boolean } | null>(null);

  useEffect(() => {
    const tunisToday = getTunisTodayStr();
    setTodayString(tunisToday);

    async function fetchPortalData() {
      if (!slug) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/public/book/portal?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) {
          setSettings(null);
          return;
        }
        const data = await res.json();
        const loadedSettings: BusinessSettings | null = data.settings || null;
        setSettings(loadedSettings);
        setServices(data.services || []);
        const loadedStaff: Staff[] = data.staffList || [];
        setStaffList(loadedStaff);

        if (loadedStaff.length === 1) {
          setSelectedStaff(loadedStaff[0]);
        }

        if (loadedSettings) {
          const allowed = loadedSettings.working_hours?.days || [1, 2, 3, 4, 5, 6];
          const closeStr = loadedSettings.working_hours?.end || "18:00";
          const [cH, cM] = closeStr.split(":").map(Number);
          const closeMins = (Number.isNaN(cH) ? 18 : cH) * 60 + (Number.isNaN(cM) ? 0 : cM);
          const bestDate = findNextOpenDate(
            tunisToday,
            allowed,
            closeMins,
            getTunisNowMinutes(),
            tunisToday
          );
          setSelectedDate(bestDate);
          const [bY, bM] = bestDate.split("-").map(Number);
          setCurrentMonthDate(new Date(bY, bM - 1, 1));
        }
      } catch {
        setSettings(null);
      } finally {
        setLoading(false);
      }
    }

    fetchPortalData();
  }, [slug]);

  useEffect(() => {
    async function fetchStaffBookings() {
      if (!selectedDate || !selectedStaff || !slug) {
        setExistingBookings([]);
        return;
      }

      setLoadingSlots(true);
      try {
        const res = await fetch(
          `/api/public/book/portal?slug=${encodeURIComponent(slug)}&date=${encodeURIComponent(
            selectedDate
          )}&staffId=${encodeURIComponent(selectedStaff.id)}`
        );
        if (res.ok) {
          const data = await res.json();
          setExistingBookings(data.busySlots || []);
        } else {
          setExistingBookings([]);
        }
      } catch {
        setExistingBookings([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchStaffBookings();
  }, [selectedDate, selectedStaff, slug]);

  const serviceCategories = useMemo(() => {
    const cats = Array.from(
      new Set(services.map((s) => (s.category || "Général").trim()).filter(Boolean))
    );
    return ["Tous", ...cats];
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return services.filter((s) => {
      const cat = (s.category || "Général").trim();
      const matchCat = selectedCategory === "Tous" || cat === selectedCategory;
      const matchSearch =
        !q || s.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [services, serviceSearch, selectedCategory]);

  const handleApplyPromo = async () => {
    setPromoError("");
    const codeClean = promoInput.trim().toUpperCase();
    if (!codeClean || !slug || !selectedService) return;

    setApplyingPromo(true);
    try {
      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          serviceId: selectedService.id,
          promoCode: codeClean,
          checkPromoOnly: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.promo) {
        setPromoError(data.error || "Code promo invalide ou introuvable.");
        setAppliedPromo(null);
        return;
      }
      setAppliedPromo(data.promo);
      setPromoInput("");
    } catch {
      setPromoError("Impossible de vérifier ce code promo.");
    } finally {
      setApplyingPromo(false);
    }
  };

  const originalPrice = Number(selectedService?.price || 0);
  let finalPrice = originalPrice;
  if (appliedPromo) {
    if (appliedPromo.discount_type === "percent") {
      finalPrice = Math.max(0, originalPrice * (1 - appliedPromo.discount_value / 100));
    } else {
      finalPrice = Math.max(0, originalPrice - appliedPromo.discount_value);
    }
  }

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !selectedService || !selectedStaff) return;

    setSubmitting(true);
    setBookingError("");

    try {
      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          serviceId: selectedService.id,
          staffId: selectedStaff.id,
          bookingDate: selectedDate,
          startTime: selectedTime,
          promoCode: appliedPromo?.code || null,
          clientName,
          clientPhone,
          clientEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBookingError(data.error || "Erreur lors de la réservation.");
        if (res.status === 409) {
          setSelectedTime("");
          setStep(2);
        }
        return;
      }

      setConfirmedBookingId(data.bookingId || `booki-${Date.now()}`);
      setConfirmedEndTime(
        data.endTime ||
          addMinutesToTime(selectedTime, selectedService.duration_minutes || 30)
      );
      setConfirmedPrice(typeof data.finalPrice === "number" ? data.finalPrice : finalPrice);
      setBookingSuccess(true);
    } catch {
      setBookingError("Erreur réseau lors de la confirmation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    const isScrollable = Boolean(target?.closest("[data-no-swipe]"));
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      ignore: isScrollable,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || touchStartRef.current.ignore) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Swipe left to switch to Boutique
    if (dx < -90 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      router.push(`/store/${slug}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" /> Chargement du portail salon...
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800 font-bold text-sm">
        Salon introuvable. Veuillez vérifier l&apos;adresse URL.
      </div>
    );
  }

  const primaryColor = settings.primary_color || settings.color_palette || "#2563EB";
  const heroImageUrl = safeHttpUrl(settings.hero_image_url);
  const storeImageUrl = safeHttpUrl(settings.store_image);
  const safeMapsUrl = safeHttpUrl(settings.maps_url);
  const cleanWhatsapp = (settings.whatsapp_number || "").replace(/[^0-9]/g, "");

  const [todayY, todayM] = todayString.split("-").map(Number);
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const isCurrentOrPastMonth = year < todayY || (year === todayY && month <= todayM - 1);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startingDayIndex = (firstDayOfMonth + 6) % 7;
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const allowedDays = settings.working_hours?.days || [1, 2, 3, 4, 5, 6];
  const openTimeStr = settings.working_hours?.start || "09:00";
  const closeTimeStr = settings.working_hours?.end || "18:00";

  const calendarDays: (Date | null)[] = [];
  for (let i = 0; i < startingDayIndex; i++) calendarDays.push(null);
  for (let d = 1; d <= totalDaysInMonth; d++) calendarDays.push(new Date(year, month, d));

  const displayFinalPrice = confirmedPrice !== null ? confirmedPrice : finalPrice;

  const calendarEventOpts = {
    id: confirmedBookingId || `booki-${selectedDate}`,
    title: `${selectedService?.name || "Rendez-vous"} — ${settings.name}`,
    description: `Prestation : ${selectedService?.name}\nAvec : ${selectedStaff?.name}\nTarif : ${displayFinalPrice.toFixed(
      2
    )} TND`,
    location: settings.location || settings.name,
    bookingDate: selectedDate,
    startTime: selectedTime,
    endTime: confirmedEndTime || selectedTime,
  };

  // Compute available slots for selected date & staff
  const serviceDuration = selectedService?.duration_minutes || 30;
  const [openH, openM] = openTimeStr.split(":").map(Number);
  const [closeH, closeM] = closeTimeStr.split(":").map(Number);
  const openMinutes = (Number.isNaN(openH) ? 9 : openH) * 60 + (Number.isNaN(openM) ? 0 : openM);
  const closeMinutes = (Number.isNaN(closeH) ? 18 : closeH) * 60 + (Number.isNaN(closeM) ? 0 : closeM);

  const dynamicSlots: string[] = [];
  for (let m = openMinutes; m < closeMinutes; m += 30) {
    dynamicSlots.push(
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
    );
  }

  const currentTotalMins = getTunisNowMinutes();
  const isTodaySelected = selectedDate === todayString;

  const availableSlots = dynamicSlots.filter((time) => {
    const [h, m] = time.split(":").map(Number);
    const slotStartMins = h * 60 + m;
    const slotEndMins = slotStartMins + serviceDuration;

    if (slotEndMins > closeMinutes) return false;
    if (isTodaySelected && slotStartMins <= currentTotalMins) return false;

    const hasCollision = existingBookings.some((booking) => {
      const [bH, bM] = booking.start_time.split(":").map(Number);
      const [eH, eM] = booking.end_time.split(":").map(Number);
      const bStartMins = bH * 60 + bM;
      const bEndMins = eH * 60 + eM;
      return slotStartMins < bEndMins && slotEndMins > bStartMins;
    });

    return !hasCollision;
  });

  const morningSlots = availableSlots.filter((t) => parseInt(t.split(":")[0], 10) < 12);
  const afternoonSlots = availableSlots.filter((t) => parseInt(t.split(":")[0], 10) >= 12);

  const handleJumpNextOpenDay = () => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const nextStart = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0)).toISOString().slice(0, 10);
    const nextOpen = findNextOpenDate(
      nextStart,
      allowedDays,
      closeMinutes,
      currentTotalMins,
      todayString
    );
    setSelectedDate(nextOpen);
    setSelectedTime("");
    const [ny, nm] = nextOpen.split("-").map(Number);
    setCurrentMonthDate(new Date(ny, nm - 1, 1));
  };

  const bioText =
    settings.description ||
    settings.booking_subtitle ||
    "Réservez votre créneau en quelques secondes.";

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-32"
    >
      {/* COMPACT HERO HEADER */}
      <div
        className="relative pt-4 pb-11 px-4 sm:px-8 overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {heroImageUrl ? (
          <div className="absolute inset-0 z-0">
            <img
              src={heroImageUrl}
              alt={settings.name}
              className="w-full h-full object-cover scale-105 filter brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/35" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
        )}

        <div className="relative z-10 max-w-3xl mx-auto space-y-4">
          {/* Top Switcher Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex bg-black/35 backdrop-blur-md p-1 rounded-full border border-white/20 text-xs font-bold shadow-sm">
              <span className="px-3.5 py-1.5 rounded-full bg-white text-slate-900 shadow-xs flex items-center gap-1.5">
                <CalendarIcon size={13} /> Prendre RDV
              </span>
              <Link
                href={`/store/${slug}`}
                className="px-3.5 py-1.5 rounded-full text-white/90 hover:text-white flex items-center gap-1.5 transition"
              >
                <Store size={13} /> Boutique
              </Link>
            </div>
          </div>

          {/* Tight Avatar + Title Lockup */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 flex items-center justify-center shadow-xl overflow-hidden shrink-0">
                {storeImageUrl ? (
                  <img
                    src={storeImageUrl}
                    alt={settings.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Scissors size={26} className="text-white/90" />
                )}
              </div>
              <div className="min-w-0 space-y-1">
              
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white truncate">
                  {settings.name}
                </h1>
              </div>

             
            </div>

            {/* Full-Width Compact Bio */}
            <p
              onClick={() => setBioExpanded((prev) => !prev)}
              className={`text-xs sm:text-sm text-white/85 max-w-2xl leading-relaxed cursor-pointer ${
                bioExpanded ? "" : "line-clamp-2"
              }`}
            >
              {bioText}
            </p>

            {/* Single-Row Compact Metadata Strip */}
            <div className="flex items-center gap-1.5 text-[11px] text-white/95 font-medium flex-wrap pt-0.5">
              <span className="inline-flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/15">
                <Clock size={11} /> {openTimeStr}–{closeTimeStr}
              </span>

              {settings.location &&
                (safeMapsUrl ? (
                  <a
                    href={safeMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full backdrop-blur-md transition border border-white/15"
                  >
                    <MapPin size={11} />
                    <span className="truncate max-w-[160px] sm:max-w-none">{settings.location}</span>
                    <ArrowUpRight size={10} className="opacity-75" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/15">
                    <MapPin size={11} />
                    <span className="truncate max-w-[160px] sm:max-w-none">{settings.location}</span>
                  </span>
                ))}

              {cleanWhatsapp && (
                <a
                  href={`https://wa.me/${cleanWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full backdrop-blur-md transition border border-white/15"
                >
                  <Phone size={11} /> {settings.whatsapp_number}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN BOOKING CONTAINER */}
      <div className="max-w-3xl mx-auto px-3.5 sm:px-6 -mt-6 relative z-20">
        {bookingSuccess ? (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 text-center shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={32} />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-slate-900">Réservation Confirmée !</h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Votre rendez-vous est bien enregistré.
                {clientEmail
                  ? " Un e-mail de confirmation et un rappel 24h avant vous seront envoyés."
                  : ""}
              </p>
            </div>

            {/* Structured Receipt Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 max-w-md mx-auto text-left text-xs space-y-2.5">
              <div className="flex justify-between items-center border-b border-slate-200/70 pb-2.5">
                <strong className="text-slate-900 text-sm">{selectedService?.name}</strong>
                <span className="font-black text-sm" style={{ color: primaryColor }}>
                  {displayFinalPrice.toFixed(2)} TND
                </span>
              </div>
              <p className="text-slate-600">
                <strong>Salon :</strong> {settings.name}
              </p>
              <p className="text-slate-600">
                <strong>Avec :</strong> {selectedStaff?.name}
              </p>
              <p className="text-slate-600">
                <strong>Date &amp; Heure :</strong> {formatFrenchDateLabel(selectedDate)} ({selectedDate}) •{" "}
                {selectedTime} → {confirmedEndTime}
              </p>
              {settings.location && (
                <p className="text-slate-600 flex items-center justify-between gap-2">
                  <span>
                    <strong>Adresse :</strong> {settings.location}
                  </span>
                  {safeMapsUrl && (
                    <a
                      href={safeMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 font-bold hover:underline shrink-0"
                    >
                      Itinéraire ↗
                    </a>
                  )}
                </p>
              )}
            </div>

            {/* Calendar Reminders */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 max-w-md mx-auto space-y-3">
              <p className="text-[11px] font-bold text-slate-700">
                Ajouter un rappel automatique sur votre téléphone (24h et 2h avant) :
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => downloadIcsReminder(calendarEventOpts)}
                  className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Download size={14} /> Apple / Outlook (.ics)
                </button>
                <a
                  href={buildGoogleCalendarUrl(calendarEventOpts)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  <CalendarIcon size={14} /> Google Agenda
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {cleanWhatsapp && (
                <a
                  href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                    `Bonjour ${settings.name} 👋\n\nJe viens de réserver un rendez-vous en ligne :\n- *Prestation* : ${selectedService?.name}\n- *Avec* : ${selectedStaff?.name}\n- *Date* : ${selectedDate} à ${selectedTime}\n- *Client* : ${clientName} (${clientPhone})\n- *Total* : ${displayFinalPrice.toFixed(2)} TND\n\nMerci !`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  <MessageSquare size={15} /> Envoyer sur WhatsApp
                </a>
              )}

              <Link
                href={`/store/${slug}`}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-3 rounded-2xl text-xs font-bold transition"
              >
                <Store size={15} /> Découvrir la boutique
              </Link>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Effectuer une autre réservation
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-7 shadow-xl space-y-5">
            {/* Single-Line Progress Stepper */}
            <div className="grid grid-cols-3 gap-1.5 pb-3.5 border-b border-slate-100">
              {[
                { num: 1, label: "Soin", done: Boolean(selectedService) && step > 1, disabled: false },
                {
                  num: 2,
                  label: "Créneau",
                  done: Boolean(selectedStaff && selectedTime) && step > 2,
                  disabled: !selectedService,
                },
                {
                  num: 3,
                  label: "Infos",
                  done: false,
                  disabled: !selectedService || !selectedStaff || !selectedTime,
                },
              ].map((item) => {
                const isActive = step === item.num;
                return (
                  <button
                    key={item.num}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => !item.disabled && setStep(item.num)}
                    style={{
                      borderColor: isActive ? primaryColor : "transparent",
                      color: isActive ? primaryColor : item.done ? "#0f172a" : "#64748b",
                    }}
                    className="flex items-center justify-center gap-1.5 text-xs font-bold pb-2.5 border-b-2 transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <span
                      className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 transition"
                      style={{
                        backgroundColor: isActive || item.done ? primaryColor : "#e2e8f0",
                        color: isActive || item.done ? "#ffffff" : "#475569",
                      }}
                    >
                      {item.done ? <Check size={11} strokeWidth={3} /> : item.num}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {bookingError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            {/* STEP 1 : SERVICES */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {settings.booking_title || "Choisissez une prestation"}
                  </h2>
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                    {filteredServices.length} soin{filteredServices.length > 1 ? "s" : ""}
                  </span>
                </div>

                {settings.booking_subtitle && (
                  <p className="text-xs text-slate-500 -mt-2">{settings.booking_subtitle}</p>
                )}

                {services.length > 3 && (
                  <div className="space-y-2.5">
                    <div className="relative">
                      <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        placeholder="Rechercher une prestation..."
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-slate-300 transition"
                      />
                    </div>

                    {serviceCategories.length > 2 && (
                      <div
                        data-no-swipe
                        className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
                      >
                        {serviceCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            style={
                              selectedCategory === cat ? { backgroundColor: primaryColor } : {}
                            }
                            className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                              selectedCategory === cat
                                ? "text-white shadow-xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {filteredServices.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    Aucun service disponible pour cette recherche.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {filteredServices.map((service) => {
                      const isChosen = selectedService?.id === service.id;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => {
                            setSelectedService(service);
                            setSelectedTime("");
                            setAppliedPromo(null);
                            setPromoError("");
                            setStep(2);
                          }}
                          style={{
                            borderColor: isChosen ? primaryColor : undefined,
                            backgroundColor: isChosen ? `${primaryColor}08` : undefined,
                          }}
                          className="w-full text-left bg-slate-50/80 hover:bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 group shadow-2xs hover:shadow-sm"
                        >
                          <div className="space-y-1 min-w-0">
                            <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {service.name}
                            </h3>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                              <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200/70 text-slate-600">
                                <Clock size={11} /> {service.duration_minutes} min
                              </span>
                              <span className="truncate">{service.category || "Général"}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-black text-slate-900 text-sm sm:text-base">
                              {service.price} TND
                            </span>
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center transition text-white group-hover:translate-x-0.5"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <ChevronRight size={16} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 : PRACTITIONER & DATE/TIME */}
            {step === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                      Praticien &amp; Créneau
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {selectedService?.name} • {serviceDuration} min
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition cursor-pointer shrink-0"
                  >
                    ← Prestations
                  </button>
                </div>

                {/* Staff Selector */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Choisissez l&apos;expert
                  </label>
                  {staffList.length === 0 ? (
                    <p className="text-xs text-slate-400">Aucun membre d&apos;équipe enregistré.</p>
                  ) : (
                    <div
                      data-no-swipe
                      className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar sm:grid sm:grid-cols-3"
                    >
                      {staffList.map((staff) => {
                        const isSelected = selectedStaff?.id === staff.id;
                        return (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() => {
                              setSelectedStaff(staff);
                              setSelectedTime("");
                              setBookingError("");
                            }}
                            style={{
                              borderColor: isSelected ? primaryColor : "#e2e8f0",
                              backgroundColor: isSelected ? `${primaryColor}0d` : "#f8fafc",
                            }}
                            className="border-2 rounded-2xl p-2.5 sm:p-3 transition cursor-pointer flex items-center gap-2.5 shrink-0 min-w-[155px] sm:min-w-0 text-left"
                          >
                            <div
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                              style={{ backgroundColor: staff.color_code || primaryColor }}
                            >
                              {staff.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 text-xs truncate">
                                {staff.name}
                              </h3>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {isSelected ? "Sélectionné ✓" : "Disponible"}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedStaff && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                    {/* Calendar */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Date souhaitée
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isCurrentOrPastMonth}
                            onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <ChevronLeft size={14} />
                          </button>
                          <span className="text-xs font-bold text-slate-800 px-2 capitalize">
                            {currentMonthDate.toLocaleDateString("fr-FR", {
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center">
                        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                          <span key={d} className="text-[10px] font-bold text-slate-400 py-1">
                            {d}
                          </span>
                        ))}

                        {calendarDays.map((dayDate, idx) => {
                          if (!dayDate) return <div key={`empty-${idx}`} />;

                          const dateStr = `${dayDate.getFullYear()}-${String(
                            dayDate.getMonth() + 1
                          ).padStart(2, "0")}-${String(dayDate.getDate()).padStart(2, "0")}`;
                          const dayOfWeek = dayDate.getDay();
                          const isPast = dateStr < todayString;
                          const isAllowedDay = allowedDays.includes(dayOfWeek);
                          const isDisabled = isPast || !isAllowedDay;
                          const isSelected = selectedDate === dateStr;
                          const isToday = dateStr === todayString;

                          return (
                            <button
                              key={dateStr}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => {
                                setSelectedDate(dateStr);
                                setSelectedTime("");
                                setBookingError("");
                              }}
                              style={{
                                backgroundColor: isSelected
                                  ? primaryColor
                                  : isDisabled
                                  ? "#f1f5f9"
                                  : "#f8fafc",
                                color: isSelected
                                  ? "#ffffff"
                                  : isDisabled
                                  ? "#cbd5e1"
                                  : "#334155",
                                borderColor: isSelected ? primaryColor : "#e2e8f0",
                              }}
                              className={`relative h-9 rounded-xl text-xs font-bold border transition flex items-center justify-center ${
                                isDisabled
                                  ? "cursor-not-allowed opacity-60"
                                  : "cursor-pointer hover:border-slate-400"
                              }`}
                            >
                              {dayDate.getDate()}
                              {isToday && !isSelected && (
                                <span
                                  className="absolute bottom-1 w-1 h-1 rounded-full"
                                  style={{ backgroundColor: primaryColor }}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Grouped Morning / Afternoon Slots */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Créneaux • <span className="capitalize text-slate-800">{formatFrenchDateLabel(selectedDate)}</span>
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {serviceDuration} min
                        </span>
                      </div>

                      {loadingSlots ? (
                        <p className="text-xs text-slate-500 animate-pulse py-4">
                          Recherche des disponibilités...
                        </p>
                      ) : availableSlots.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center space-y-2.5">
                          <p className="text-xs text-rose-500 font-semibold">
                            Aucun créneau libre pour cette date.
                          </p>
                          <button
                            type="button"
                            onClick={handleJumpNextOpenDay}
                            style={{ color: primaryColor }}
                            className="text-xs font-bold hover:underline cursor-pointer"
                          >
                            Aller au prochain jour disponible →
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                          {morningSlots.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                <Sun size={11} className="text-amber-500" /> Matin
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                {morningSlots.map((time) => {
                                  const isSelected = selectedTime === time;
                                  return (
                                    <button
                                      key={time}
                                      type="button"
                                      onClick={() => {
                                        setSelectedTime(time);
                                        setBookingError("");
                                      }}
                                      style={{
                                        backgroundColor: isSelected ? primaryColor : "#f8fafc",
                                        color: isSelected ? "#ffffff" : "#334155",
                                        borderColor: isSelected ? primaryColor : "#e2e8f0",
                                      }}
                                      className="py-2 text-xs font-bold rounded-xl border transition shadow-2xs cursor-pointer active:scale-95"
                                    >
                                      {time}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {afternoonSlots.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                <Sunset size={11} className="text-orange-500" /> Après-midi
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                {afternoonSlots.map((time) => {
                                  const isSelected = selectedTime === time;
                                  return (
                                    <button
                                      key={time}
                                      type="button"
                                      onClick={() => {
                                        setSelectedTime(time);
                                        setBookingError("");
                                      }}
                                      style={{
                                        backgroundColor: isSelected ? primaryColor : "#f8fafc",
                                        color: isSelected ? "#ffffff" : "#334155",
                                        borderColor: isSelected ? primaryColor : "#e2e8f0",
                                      }}
                                      className="py-2 text-xs font-bold rounded-xl border transition shadow-2xs cursor-pointer active:scale-95"
                                    >
                                      {time}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3 : FORM + PROMO */}
            {step === 3 && (
              <form
                id="booking-confirm-form"
                onSubmit={handleConfirmBooking}
                className="space-y-5 animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                      Vos coordonnées
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Finalisez votre rendez-vous chez {settings.name}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition cursor-pointer shrink-0"
                  >
                    ← Horaire
                  </button>
                </div>

                <div className="rounded-2xl p-4 border text-xs space-y-2 text-slate-700 bg-slate-50/80 border-slate-200">
                  <div className="flex justify-between font-bold text-slate-900 pb-2 border-b border-slate-200/60">
                    <span>{selectedService?.name}</span>
                    <div className="text-right">
                      {appliedPromo ? (
                        <div>
                          <span className="line-through text-slate-400 mr-2">
                            {originalPrice.toFixed(2)} TND
                          </span>
                          <span className="text-emerald-600 font-black">
                            {finalPrice.toFixed(2)} TND
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: primaryColor }}>
                          {originalPrice.toFixed(2)} TND
                        </span>
                      )}
                    </div>
                  </div>

                  <p>
                    <strong>Praticien :</strong> {selectedStaff?.name}
                  </p>
                  <p>
                    <strong>Date &amp; Heure :</strong>{" "}
                    <span className="capitalize">{formatFrenchDateLabel(selectedDate)}</span> •{" "}
                    {selectedTime} → {addMinutesToTime(selectedTime, serviceDuration)}
                  </p>

                  <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Tag size={12} className="text-indigo-600" /> Avez-vous un code promo ?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder="Entrez votre code"
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 uppercase focus:outline-none focus:border-slate-400"
                      />
                      <button
                        type="button"
                        disabled={applyingPromo}
                        onClick={handleApplyPromo}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                      >
                        {applyingPromo ? "..." : "Appliquer"}
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-[10px] text-rose-500 font-semibold">{promoError}</p>
                    )}
                    {appliedPromo && (
                      <div className="flex items-center justify-between bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200 text-[11px] font-bold">
                        <span>
                          Code &quot;{appliedPromo.code}&quot; appliqué (-
                          {appliedPromo.discount_type === "percent"
                            ? `${appliedPromo.discount_value}%`
                            : `${appliedPromo.discount_value} TND`}
                          )
                        </span>
                        <button
                          type="button"
                          onClick={() => setAppliedPromo(null)}
                          className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      required
                      placeholder="ex: Youssef Ben Amor"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Numéro de téléphone (WhatsApp) *
                    </label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      required
                      placeholder="+216 98 000 000"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      E-mail (Recommandé — rappel 24h avant)
                    </label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none transition"
                    />
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-emerald-950">
                    <CreditCard size={18} className="text-emerald-600 shrink-0" />
                    <div>
                      <strong className="block">Paiement sur place le jour du RDV</strong>
                      <span className="text-[11px] text-emerald-700">
                        Aucun prépaiement requis en ligne (Espèces ou Carte au salon).
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* SINGLE-CTA STICKY BOTTOM SUMMARY BAR */}
      {selectedService && !bookingSuccess && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-2xl p-3.5 sm:px-8">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                <Scissors size={18} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 truncate">
                    {selectedService.name}
                  </span>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full text-white shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {finalPrice.toFixed(2)} TND
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">
                  {selectedStaff ? `Avec ${selectedStaff.name}` : "Choisissez l'expert"}
                  {selectedDate && selectedTime
                    ? ` • ${formatFrenchDateLabel(selectedDate)} (${selectedTime})`
                    : ""}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer hover:opacity-90"
                >
                  Continuer →
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  disabled={!selectedStaff || !selectedDate || !selectedTime}
                  onClick={() => setStep(3)}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-40 transition shadow-sm cursor-pointer hover:opacity-90 disabled:cursor-not-allowed"
                >
                  Continuer →
                </button>
              )}

              {step === 3 && (
                <button
                  type="submit"
                  form="booking-confirm-form"
                  disabled={submitting}
                  style={{ backgroundColor: primaryColor }}
                  className="text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 transition shadow-md cursor-pointer hover:opacity-95"
                >
                  {submitting ? "Validation..." : "Confirmer le RDV ✓"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="mt-14 text-center text-xs text-slate-400 space-y-1">
        <p className="font-bold text-slate-600">
          Propulsé par Booki<span style={{ color: primaryColor }}>.tn</span>
        </p>
        <p className="text-[11px]">
          Plateforme de réservation et gestion pour salons, spas &amp; studios.
        </p>
      </footer>
    </div>
  );
}

export default function BookingPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-pulse flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" /> Chargement du portail...
          </div>
        </div>
      }
    >
      <BookingPortalContent />
    </Suspense>
  );
}

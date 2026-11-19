"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Calendar as CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  List,
  LayoutGrid,
  MessageSquare,
  CheckCircle2,
  Clock,
  Ban,
  Edit3,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  color: string;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

interface Booking {
  id: string;
  client_name: string;
  client_whatsapp: string;
  service_id: string;
  employee_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "still" | "ongoing" | "done" | "canceled";
  is_walk_in: boolean;
  total_price?: number | null;
  services?: { name: string; duration_minutes: number; price: number };
  employees?: { name: string; color: string };
}

interface PositionedBooking extends Booking {
  startMins: number;
  endMins: number;
  lane: number;
  totalLanes: number;
}

const HOUR_HEIGHT = 88; // 88px per 60 minutes

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

function formatTime(t?: string | null): string {
  if (!t) return "00:00";
  return t.slice(0, 5);
}

function toMinutes(t?: string | null): number {
  const [h, m] = formatTime(t).split(":").map(Number);
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
}

function addMinutesToTime(startTime: string, durationMins: number): string {
  const start = toMinutes(startTime);
  const end = start + durationMins;
  const h = Math.floor(end / 60) % 24;
  const m = end % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function shiftDate(dateStr: string, offsetDays: number): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return getTunisTodayStr();
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return dt.toISOString().slice(0, 10);
}

function formatFrenchDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return dt.toLocaleDateString("fr-FR", {
    timeZone: "Africa/Tunis",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getBookingPrice(b: Booking): number {
  if (b.total_price !== undefined && b.total_price !== null) {
    return Number(b.total_price) || 0;
  }
  return Number(b.services?.price) || 0;
}

function layoutOverlappingBookings(items: Booking[]): PositionedBooking[] {
  const sorted = [...items]
    .map((b) => {
      const startMins = toMinutes(b.start_time);
      const rawEnd = toMinutes(b.end_time);
      const endMins = rawEnd > startMins ? rawEnd : startMins + 30;
      return { ...b, startMins, endMins, lane: 0, totalLanes: 1 };
    })
    .sort((a, b) => a.startMins - b.startMins || a.endMins - b.endMins);

  const clusters: PositionedBooking[][] = [];
  let currentCluster: PositionedBooking[] = [];
  let clusterEnd = -1;

  for (const item of sorted) {
    if (currentCluster.length === 0 || item.startMins < clusterEnd) {
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMins);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMins;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  for (const cluster of clusters) {
    const laneEnds: number[] = [];
    for (const item of cluster) {
      let assigned = laneEnds.findIndex((end) => end <= item.startMins);
      if (assigned === -1) {
        assigned = laneEnds.length;
        laneEnds.push(item.endMins);
      } else {
        laneEnds[assigned] = item.endMins;
      }
      item.lane = assigned;
    }
    const total = Math.max(1, laneEnds.length);
    for (const item of cluster) {
      item.totalLanes = total;
    }
  }

  return sorted;
}

export default function AdminCalendarPage() {
  const supabase = createClient();
  const [todayStr, setTodayStr] = useState(() => getTunisTodayStr());

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [salonName, setSalonName] = useState("Notre Salon");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workingStartHour, setWorkingStartHour] = useState(9);
  const [workingEndHour, setWorkingEndHour] = useState(19);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedDate, setSelectedDate] = useState(() => getTunisTodayStr());
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [showCanceled, setShowCanceled] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [nowMinutes, setNowMinutes] = useState(() => getTunisNowMinutes());

  const skipNextDateEffect = useRef(true);

  // Detail & Reschedule Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditingBooking, setIsEditingBooking] = useState(false);
  const [editForm, setEditForm] = useState({
    booking_date: getTunisTodayStr(),
    start_time: "10:00",
    employee_id: "",
    service_id: "",
  });
  const [updatingBooking, setUpdatingBooking] = useState(false);

  // Walk-in Modal
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [creatingWalkIn, setCreatingWalkIn] = useState(false);
  const [newWalkIn, setNewWalkIn] = useState({
    client_name: "",
    client_whatsapp: "",
    service_id: "",
    employee_id: "",
    booking_date: getTunisTodayStr(),
    start_time: "10:00",
    custom_price: "",
  });

  useEffect(() => {
    const freshToday = getTunisTodayStr();
    setTodayStr(freshToday);
    setSelectedDate(freshToday);
    setNowMinutes(getTunisNowMinutes());

    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("list");
    }

    initBusinessAndData(freshToday);

    const timer = setInterval(() => {
      setTodayStr(getTunisTodayStr());
      setNowMinutes(getTunisNowMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (skipNextDateEffect.current) {
      skipNextDateEffect.current = false;
      return;
    }
    if (selectedDate && businessId) {
      fetchBookings(businessId, selectedDate, false);
    }
  }, [selectedDate, businessId]);

  async function initBusinessAndData(initialDate: string) {
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

    const bizId = profile.business_id;
    setBusinessId(bizId);

    if (profile.businesses && (profile.businesses as any).name) {
      setSalonName((profile.businesses as any).name);
    }

    const [empRes, sRes, settingsRes] = await Promise.all([
      supabase.from("employees").select("*").eq("business_id", bizId).order("name"),
      supabase.from("services").select("*").eq("business_id", bizId).order("name"),
      supabase
        .from("business_settings")
        .select("name, working_hours")
        .eq("business_id", bizId)
        .maybeSingle(),
    ]);

    if (empRes.data) setEmployees(empRes.data);
    if (sRes.data) setServices(sRes.data);
    if (settingsRes.data?.name) setSalonName(settingsRes.data.name);

    if (settingsRes.data?.working_hours) {
      const sH = parseInt((settingsRes.data.working_hours.start || "09:00").split(":")[0], 10);
      const eH = parseInt((settingsRes.data.working_hours.end || "19:00").split(":")[0], 10);
      if (!Number.isNaN(sH) && !Number.isNaN(eH) && sH < eH) {
        setWorkingStartHour(sH);
        setWorkingEndHour(eH);
      }
    }

    await fetchBookings(bizId, initialDate, false);
    setLoading(false);
  }

  async function fetchBookings(
    bizId: string,
    targetDate: string,
    isManualRefresh = false
  ) {
    if (isManualRefresh) setRefreshing(true);

    const { data, error } = await supabase
      .from("bookings")
      .select("*, services(name, duration_minutes, price), employees(name, color)")
      .eq("business_id", bizId)
      .eq("booking_date", targetDate)
      .order("start_time", { ascending: true });

    if (error) {
      toast.error("Erreur chargement réservations : " + error.message);
      setRefreshing(false);
      return;
    }

    const fetchedBookings = (data || []) as Booking[];
    const currentTunisDate = getTunisTodayStr();
    const currentTunisMins = getTunisNowMinutes();
    const idsToComplete: string[] = [];

    for (const booking of fetchedBookings) {
      if (booking.status !== "done" && booking.status !== "canceled") {
        const bDate = (booking.booking_date || "").split("T")[0];
        const endMins = toMinutes(booking.end_time);
        if (bDate < currentTunisDate || (bDate === currentTunisDate && currentTunisMins > endMins)) {
          idsToComplete.push(booking.id);
        }
      }
    }

    if (idsToComplete.length > 0) {
      const { error: batchErr } = await supabase
        .from("bookings")
        .update({ status: "done" })
        .in("id", idsToComplete)
        .eq("business_id", bizId);

      if (!batchErr) {
        for (const b of fetchedBookings) {
          if (idsToComplete.includes(b.id)) {
            b.status = "done";
          }
        }
      }
    }

    setBookings(fetchedBookings);
    setRefreshing(false);
    if (isManualRefresh) {
      toast.success("Planning actualisé.");
    }
  }

  function getEffectiveStatus(booking: Booking): Booking["status"] {
    if (booking.status === "canceled") return "canceled";
    if (booking.status === "done") return "done";

    const bDate = (booking.booking_date || "").split("T")[0];
    const startMins = toMinutes(booking.start_time);
    const endMins = toMinutes(booking.end_time);

    if (bDate < todayStr) return "done";
    if (bDate > todayStr) return "still";

    if (nowMinutes > endMins) return "done";
    if (nowMinutes >= startMins && nowMinutes <= endMins) return "ongoing";
    return "still";
  }

  function openWalkInModal(prefillEmployeeId?: string, prefillTime?: string) {
    setNewWalkIn({
      client_name: "",
      client_whatsapp: "",
      service_id: services[0]?.id || "",
      employee_id:
        prefillEmployeeId !== undefined
          ? prefillEmployeeId
          : filterEmployee !== "all"
          ? filterEmployee
          : employees[0]?.id || "",
      booking_date: selectedDate,
      start_time: prefillTime || "10:00",
      custom_price: "",
    });
    setIsWalkInModalOpen(true);
  }

  async function handleCreateWalkIn(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;

    const service = services.find((s) => s.id === newWalkIn.service_id);
    if (!service) {
      toast.error("Veuillez sélectionner une prestation.");
      return;
    }

    const duration = service.duration_minutes || 30;
    const startMins = toMinutes(newWalkIn.start_time);
    const endMins = startMins + duration;
    const formattedEndTime = addMinutesToTime(newWalkIn.start_time, duration);

    setCreatingWalkIn(true);

    if (newWalkIn.employee_id) {
      const { data: dayBookings } = await supabase
        .from("bookings")
        .select("id, start_time, end_time, status")
        .eq("business_id", businessId)
        .eq("booking_date", newWalkIn.booking_date)
        .eq("employee_id", newWalkIn.employee_id)
        .neq("status", "canceled");

      const conflict = (dayBookings || []).some((b: any) => {
        const bStart = toMinutes(b.start_time);
        const bEnd = toMinutes(b.end_time);
        return startMins < bEnd && endMins > bStart;
      });

      if (conflict) {
        setCreatingWalkIn(false);
        toast.error("Ce collaborateur a déjà un rendez-vous sur ce créneau.");
        return;
      }
    }

    const parsedPrice =
      newWalkIn.custom_price.trim() !== ""
        ? Math.max(0, parseFloat(newWalkIn.custom_price) || 0)
        : Number(service.price) || 0;

    const { error } = await supabase.from("bookings").insert([
      {
        business_id: businessId,
        client_name: newWalkIn.client_name.trim(),
        client_whatsapp: newWalkIn.client_whatsapp.trim() || "N/A",
        service_id: newWalkIn.service_id,
        employee_id: newWalkIn.employee_id || null,
        booking_date: newWalkIn.booking_date,
        start_time: newWalkIn.start_time,
        end_time: formattedEndTime,
        status: "still",
        is_walk_in: true,
        total_price: parsedPrice,
      },
    ]);

    setCreatingWalkIn(false);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Rendez-vous enregistré !");
      setIsWalkInModalOpen(false);
      if (newWalkIn.booking_date !== selectedDate) {
        setSelectedDate(newWalkIn.booking_date);
      } else {
        fetchBookings(businessId, selectedDate, false);
      }
    }
  }

  function openBookingDetail(booking: Booking) {
    setSelectedBooking(booking);
    setIsEditingBooking(false);
    setEditForm({
      booking_date: (booking.booking_date || selectedDate).split("T")[0],
      start_time: formatTime(booking.start_time),
      employee_id: booking.employee_id || "",
      service_id: booking.service_id,
    });
    setIsDetailModalOpen(true);
  }

  async function updateBookingStatus(
    id: string,
    newStatus: "done" | "canceled" | "still"
  ) {
    if (!businessId) return;

    if (newStatus === "canceled" && !confirm("Annuler ce rendez-vous ?")) {
      return;
    }

    setUpdatingBooking(true);
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", id)
      .eq("business_id", businessId);

    setUpdatingBooking(false);

    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }

    const msgMap = {
      done: "Rendez-vous marqué comme terminé.",
      canceled: "Rendez-vous annulé.",
      still: "Rendez-vous réactivé.",
    };
    toast.success(msgMap[newStatus]);
    setIsDetailModalOpen(false);
    fetchBookings(businessId, selectedDate, false);
  }

  async function handleSaveReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId || !selectedBooking) return;

    const service = services.find((s) => s.id === editForm.service_id);
    const duration =
      service?.duration_minutes || selectedBooking.services?.duration_minutes || 30;
    const startMins = toMinutes(editForm.start_time);
    const endMins = startMins + duration;
    const newEndTime = addMinutesToTime(editForm.start_time, duration);

    setUpdatingBooking(true);

    if (editForm.employee_id) {
      const { data: dayBookings } = await supabase
        .from("bookings")
        .select("id, start_time, end_time")
        .eq("business_id", businessId)
        .eq("booking_date", editForm.booking_date)
        .eq("employee_id", editForm.employee_id)
        .neq("status", "canceled")
        .neq("id", selectedBooking.id);

      const conflict = (dayBookings || []).some((b: any) => {
        const bStart = toMinutes(b.start_time);
        const bEnd = toMinutes(b.end_time);
        return startMins < bEnd && endMins > bStart;
      });

      if (conflict) {
        setUpdatingBooking(false);
        toast.error("Conflit : ce praticien a déjà un rendez-vous sur ce créneau.");
        return;
      }
    }

    const newPrice = service
      ? Number(service.price) || 0
      : getBookingPrice(selectedBooking);

    const { error } = await supabase
      .from("bookings")
      .update({
        booking_date: editForm.booking_date,
        start_time: editForm.start_time,
        end_time: newEndTime,
        employee_id: editForm.employee_id || null,
        service_id: editForm.service_id,
        total_price:
          editForm.service_id === selectedBooking.service_id
            ? getBookingPrice(selectedBooking)
            : newPrice,
      })
      .eq("id", selectedBooking.id)
      .eq("business_id", businessId);

    setUpdatingBooking(false);

    if (error) {
      toast.error("Erreur lors de la modification : " + error.message);
      return;
    }

    toast.success("Rendez-vous mis à jour !");
    setIsDetailModalOpen(false);
    if (editForm.booking_date !== selectedDate) {
      setSelectedDate(editForm.booking_date);
    } else {
      fetchBookings(businessId, selectedDate, false);
    }
  }

  const visibleBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (!showCanceled && b.status === "canceled") return false;
      if (filterEmployee !== "all" && b.employee_id !== filterEmployee) return false;
      return true;
    });
  }, [bookings, showCanceled, filterEmployee]);

  const { gridStartHour, gridEndHour, hours } = useMemo(() => {
    let minH = workingStartHour;
    let maxH = workingEndHour;

    for (const b of visibleBookings) {
      const sH = Math.floor(toMinutes(b.start_time) / 60);
      const eH = Math.ceil(toMinutes(b.end_time) / 60);
      if (sH < minH) minH = Math.max(0, sH);
      if (eH > maxH) maxH = Math.min(24, eH);
    }

    const list: number[] = [];
    for (let h = minH; h < maxH; h++) {
      list.push(h);
    }
    return { gridStartHour: minH, gridEndHour: maxH, hours: list };
  }, [workingStartHour, workingEndHour, visibleBookings]);

  const gridStartMins = gridStartHour * 60;
  const gridEndMins = gridEndHour * 60;
  const totalGridHeight = hours.length * HOUR_HEIGHT;

  const hasUnassignedVisible =
    filterEmployee === "all" && visibleBookings.some((b) => !b.employee_id);

  const columns: { id: string; name: string; color: string; isUnassigned?: boolean }[] = [
    ...(filterEmployee === "all"
      ? employees
      : employees.filter((e) => e.id === filterEmployee)),
    ...(hasUnassignedVisible
      ? [{ id: "__unassigned__", name: "Non assigné", color: "#64748b", isUnassigned: true }]
      : []),
  ];

  const activeBookings = bookings.filter((b) => b.status !== "canceled");
  const stats = useMemo(() => {
    let upcoming = 0;
    let ongoing = 0;
    let done = 0;
    let revenue = 0;

    for (const b of activeBookings) {
      const eff = getEffectiveStatus(b);
      if (eff === "done") done++;
      else if (eff === "ongoing") ongoing++;
      else upcoming++;
      revenue += getBookingPrice(b);
    }
    return { total: activeBookings.length, upcoming, ongoing, done, revenue };
  }, [activeBookings, todayStr, nowMinutes]);

  const selectedWalkInService = services.find((s) => s.id === newWalkIn.service_id);
  const walkInEndPreview = selectedWalkInService
    ? addMinutesToTime(newWalkIn.start_time, selectedWalkInService.duration_minutes || 30)
    : null;

  const showLiveTimeLine =
    selectedDate === todayStr &&
    nowMinutes >= gridStartMins &&
    nowMinutes <= gridEndMins;
  const liveLineTop = ((nowMinutes - gridStartMins) / 60) * HOUR_HEIGHT;

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 h-20" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 h-16" />
          ))}
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 h-[520px]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1">
              <button
                type="button"
                onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                className="p-1.5 hover:bg-white rounded-xl text-slate-600 transition cursor-pointer"
                title="Jour précédent"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <CalendarIcon size={14} className="text-indigo-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || todayStr)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
                className="p-1.5 hover:bg-white rounded-xl text-slate-600 transition cursor-pointer"
                title="Jour suivant"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {selectedDate == todayStr && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer"
              >
                Aujourd&apos;hui
              </button>
            )}

            <span className="text-xs font-bold text-slate-500 capitalize hidden sm:inline ml-1">
              {formatFrenchDate(selectedDate)}
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="border border-slate-200 bg-slate-50 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tous ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowCanceled((v) => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                showCanceled
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
              title="Afficher ou masquer les rendez-vous annulés"
            >
              {showCanceled ? <Eye size={14} /> : <EyeOff size={14} />}
              <span className="hidden sm:inline">Annulés</span>
            </button>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Grille</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <List size={14} />
                <span className="hidden sm:inline">Liste</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => businessId && fetchBookings(businessId, selectedDate, true)}
              disabled={refreshing}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition cursor-pointer disabled:opacity-50"
              title="Actualiser le planning"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              onClick={() => openWalkInModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus size={15} /> Walk-in
            </button>
          </div>
        </div>
      </div>

      {/* Daily Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">RDV Actifs</span>
          <span className="text-base font-black text-slate-900">{stats.total}</span>
        </div>
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">À venir / En cours</span>
          <span className="text-base font-black text-indigo-600">
            {stats.upcoming + stats.ongoing}
          </span>
        </div>
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">Terminés</span>
          <span className="text-base font-black text-emerald-600">{stats.done}</span>
        </div>
        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-2xs flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">CA Prévu</span>
          <span className="text-base font-black text-slate-900">
            {stats.revenue.toFixed(0)} TND
          </span>
        </div>
      </div>

      {/* VIEW 1: PROPORTIONAL TIMELINE GRID */}
      {viewMode === "grid" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Sticky Header Row */}
            <div
              className="grid border-b border-slate-100 bg-slate-50/90 sticky top-0 z-20"
              style={{
                gridTemplateColumns: `76px repeat(${columns.length || 1}, minmax(0, 1fr))`,
              }}
            >
              <div className="p-3 text-center text-[10px] font-black text-slate-400 uppercase border-r border-slate-100">
                Heure
              </div>
              {columns.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  Aucun membre d&apos;équipe disponible. Ajoutez-en dans Équipe &amp; Salaires !
                </div>
              ) : (
                columns.map((emp) => (
                  <div
                    key={emp.id}
                    className="p-3 text-center border-r border-slate-100 last:border-r-0 flex items-center justify-center gap-2"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: emp.color }}
                    />
                    <span className="font-bold text-xs text-slate-800 truncate">
                      {emp.name}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Timeline Body */}
            <div
              className="grid relative"
              style={{
                gridTemplateColumns: `76px repeat(${columns.length || 1}, minmax(0, 1fr))`,
                height: `${totalGridHeight}px`,
              }}
            >
              {/* Left Time Gutter */}
              <div className="border-r border-slate-100 relative bg-slate-50/30 select-none">
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    className="border-b border-slate-100 px-2 pt-2 text-center text-[11px] font-bold text-slate-400"
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}

                {showLiveTimeLine && (
                  <div
                    style={{ top: `${liveLineTop}px` }}
                    className="absolute right-1 -translate-y-1/2 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md z-30 shadow-xs"
                  >
                    {String(Math.floor(nowMinutes / 60)).padStart(2, "0")}:
                    {String(nowMinutes % 60).padStart(2, "0")}
                  </div>
                )}
              </div>

              {/* Employee Columns */}
              {columns.length === 0 ? (
                <div className="flex items-center justify-center text-xs text-slate-400">
                  Aucun collaborateur à afficher.
                </div>
              ) : (
                columns.map((emp) => {
                  const colBookings = visibleBookings.filter((b) =>
                    emp.isUnassigned ? !b.employee_id : b.employee_id === emp.id
                  );
                  const positioned = layoutOverlappingBookings(colBookings);

                  return (
                    <div
                      key={emp.id}
                      className="border-r border-slate-100 last:border-r-0 relative"
                    >
                      {hours.map((h) => (
                        <div
                          key={h}
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          className="border-b border-slate-100 flex flex-col"
                        >
                          <div
                            onClick={() =>
                              openWalkInModal(
                                emp.isUnassigned ? "" : emp.id,
                                `${String(h).padStart(2, "0")}:00`
                              )
                            }
                            className="flex-1 hover:bg-indigo-50/40 cursor-pointer border-b border-dashed border-slate-100/80 transition"
                            title={`Ajouter un RDV à ${String(h).padStart(2, "0")}:00`}
                          />
                          <div
                            onClick={() =>
                              openWalkInModal(
                                emp.isUnassigned ? "" : emp.id,
                                `${String(h).padStart(2, "0")}:30`
                              )
                            }
                            className="flex-1 hover:bg-indigo-50/40 cursor-pointer transition"
                            title={`Ajouter un RDV à ${String(h).padStart(2, "0")}:30`}
                          />
                        </div>
                      ))}

                      {positioned.map((booking) => {
                        const currentStatus = getEffectiveStatus(booking);
                        const top = Math.max(
                          0,
                          ((booking.startMins - gridStartMins) / 60) * HOUR_HEIGHT
                        );
                        const height = Math.max(
                          38,
                          ((booking.endMins - booking.startMins) / 60) * HOUR_HEIGHT - 4
                        );
                        const widthPct = 100 / booking.totalLanes;
                        const leftPct = booking.lane * widthPct;
                        const isCompact = height < 56;

                        return (
                          <div
                            key={booking.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openBookingDetail(booking);
                            }}
                            style={{
                              top: `${top + 2}px`,
                              height: `${height}px`,
                              left: `calc(${leftPct}% + 4px)`,
                              width: `calc(${widthPct}% - 8px)`,
                              borderLeftWidth: "4px",
                              borderLeftColor: emp.color,
                              backgroundColor:
                                currentStatus === "done"
                                  ? "#f0fdf4"
                                  : currentStatus === "canceled"
                                  ? "#fff1f2"
                                  : currentStatus === "ongoing"
                                  ? "#eff6ff"
                                  : "#ffffff",
                            }}
                            className={`absolute z-10 rounded-xl border border-slate-200/80 shadow-xs p-2 cursor-pointer overflow-hidden hover:shadow-md hover:z-20 transition flex flex-col justify-between ${
                              currentStatus === "canceled" ? "opacity-65 line-through" : ""
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-[11px] text-slate-900 truncate">
                                  {booking.client_name}
                                </span>
                                {booking.is_walk_in && (
                                  <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-1.5 py-0.5 rounded shrink-0">
                                    WI
                                  </span>
                                )}
                              </div>
                              {!isCompact && (
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                  {booking.services?.name || "Prestation"}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-1 text-[9px] font-bold">
                              <span className="text-slate-500 truncate">
                                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                              </span>
                              <span
                                className={`uppercase shrink-0 ${
                                  currentStatus === "done"
                                    ? "text-emerald-600"
                                    : currentStatus === "ongoing"
                                    ? "text-blue-600"
                                    : currentStatus === "canceled"
                                    ? "text-rose-600"
                                    : "text-amber-600"
                                }`}
                              >
                                {currentStatus === "done"
                                  ? "Terminé"
                                  : currentStatus === "ongoing"
                                  ? "En cours"
                                  : currentStatus === "canceled"
                                  ? "Annulé"
                                  : "À venir"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              )}

              {/* Live Time Indicator Line across Grid */}
              {showLiveTimeLine && (
                <div
                  style={{ top: `${liveLineTop}px`, left: "76px", right: 0 }}
                  className="pointer-events-none absolute border-t-2 border-rose-500 z-25"
                >
                  <span className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-rose-500" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: AGENDA LIST VIEW */}
      {viewMode === "list" && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-4 sm:p-6 space-y-3">
          {visibleBookings.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-xs text-slate-400">
                Aucun rendez-vous prévu pour cette date.
              </p>
              <button
                type="button"
                onClick={() => openWalkInModal()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Ajouter un Walk-in
              </button>
            </div>
          ) : (
            visibleBookings.map((booking) => {
              const currentStatus = getEffectiveStatus(booking);
              const empColor = booking.employees?.color || "#64748b";
              const cleanWa = (booking.client_whatsapp || "").replace(/[^0-9]/g, "");

              return (
                <div
                  key={booking.id}
                  onClick={() => openBookingDetail(booking)}
                  style={{ borderLeftWidth: "5px", borderLeftColor: empColor }}
                  className={`p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:shadow-xs transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    currentStatus === "canceled" ? "opacity-60" : ""
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg">
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                        {booking.client_name}
                      </h4>
                      {booking.is_walk_in && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-md">
                          Walk-in
                        </span>
                      )}
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          currentStatus === "done"
                            ? "bg-emerald-100 text-emerald-700"
                            : currentStatus === "ongoing"
                            ? "bg-blue-100 text-blue-700"
                            : currentStatus === "canceled"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {currentStatus === "done"
                          ? "Terminé"
                          : currentStatus === "ongoing"
                          ? "En cours"
                          : currentStatus === "canceled"
                          ? "Annulé"
                          : "À venir"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">
                      {booking.services?.name || "Prestation"} • Avec{" "}
                      <strong className="text-slate-700">
                        {booking.employees?.name || "Non assigné"}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    <span className="font-black text-xs text-slate-900 mr-1">
                      {getBookingPrice(booking).toFixed(2)} TND
                    </span>

                    {cleanWa && (
                      <a
                        href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                          `Bonjour ${booking.client_name}, rappel pour votre rendez-vous chez ${salonName} le ${booking.booking_date} à ${formatTime(
                            booking.start_time
                          )}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition"
                        title="Envoyer un message WhatsApp"
                      >
                        <MessageSquare size={14} />
                      </a>
                    )}

                    {currentStatus !== "done" && currentStatus !== "canceled" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateBookingStatus(booking.id, "done");
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition cursor-pointer"
                      >
                        Terminer
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL WALK-IN */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900">
                Ajouter une Réservation / Walk-in
              </h3>
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Nom du Client *
                </label>
                <input
                  type="text"
                  placeholder="ex: Mohamed Ali"
                  value={newWalkIn.client_name}
                  onChange={(e) =>
                    setNewWalkIn({ ...newWalkIn, client_name: e.target.value })
                  }
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Numéro WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="ex: +216 20 000 000"
                  value={newWalkIn.client_whatsapp}
                  onChange={(e) =>
                    setNewWalkIn({ ...newWalkIn, client_whatsapp: e.target.value })
                  }
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Prestation *
                </label>
                <select
                  value={newWalkIn.service_id}
                  onChange={(e) =>
                    setNewWalkIn({ ...newWalkIn, service_id: e.target.value })
                  }
                  className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none"
                  required
                >
                  <option value="">Sélectionner une prestation</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration_minutes} min - {s.price} TND)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newWalkIn.booking_date}
                    onChange={(e) =>
                      setNewWalkIn({
                        ...newWalkIn,
                        booking_date: e.target.value || selectedDate,
                      })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Heure de début
                  </label>
                  <input
                    type="time"
                    value={newWalkIn.start_time}
                    onChange={(e) =>
                      setNewWalkIn({ ...newWalkIn, start_time: e.target.value })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Praticien Assigné
                  </label>
                  <select
                    value={newWalkIn.employee_id}
                    onChange={(e) =>
                      setNewWalkIn({ ...newWalkIn, employee_id: e.target.value })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none"
                  >
                    <option value="">Non assigné</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Prix (TND)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={
                      selectedWalkInService ? `${selectedWalkInService.price}` : "0"
                    }
                    value={newWalkIn.custom_price}
                    onChange={(e) =>
                      setNewWalkIn({ ...newWalkIn, custom_price: e.target.value })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {selectedWalkInService && walkInEndPreview && (
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl px-3.5 py-2.5 text-[11px] text-indigo-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Clock size={13} /> Créneau : {newWalkIn.start_time} → {walkInEndPreview}
                  </span>
                  <span className="font-black">
                    {(newWalkIn.custom_price.trim() !== ""
                      ? parseFloat(newWalkIn.custom_price) || 0
                      : selectedWalkInService.price
                    ).toFixed(2)}{" "}
                    TND
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={creatingWalkIn}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition mt-2 cursor-pointer disabled:opacity-50"
              >
                {creatingWalkIn ? "Enregistrement..." : "Enregistrer la réservation"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DÉTAILS & MODIFICATION */}
      {isDetailModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900">
                  {isEditingBooking ? "Modifier le Rendez-vous" : "Détails du Rendez-vous"}
                </h3>
                {selectedBooking.is_walk_in && (
                  <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-md">
                    Walk-in
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {!isEditingBooking ? (
              <>
                {(() => {
                  const effStatus = getEffectiveStatus(selectedBooking);
                  const cleanWa = (selectedBooking.client_whatsapp || "").replace(
                    /[^0-9]/g,
                    ""
                  );

                  return (
                    <>
                      <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                          <strong className="text-sm text-slate-900">
                            {selectedBooking.client_name}
                          </strong>
                          <span
                            className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full ${
                              effStatus === "done"
                                ? "bg-emerald-100 text-emerald-700"
                                : effStatus === "ongoing"
                                ? "bg-blue-100 text-blue-700"
                                : effStatus === "canceled"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {effStatus === "done"
                              ? "Terminé"
                              : effStatus === "ongoing"
                              ? "En cours"
                              : effStatus === "canceled"
                              ? "Annulé"
                              : "À venir"}
                          </span>
                        </div>

                        <p>
                          <strong>WhatsApp :</strong>{" "}
                          {selectedBooking.client_whatsapp || "Non renseigné"}
                        </p>
                        <p>
                          <strong>Prestation :</strong>{" "}
                          {selectedBooking.services?.name || "Prestation"} (
                          {selectedBooking.services?.duration_minutes || 30} min)
                        </p>
                        <p>
                          <strong>Praticien :</strong>{" "}
                          {selectedBooking.employees?.name || "Non assigné"}
                        </p>
                        <p>
                          <strong>Date &amp; Horaire :</strong>{" "}
                          {(selectedBooking.booking_date || "").split("T")[0]} •{" "}
                          {formatTime(selectedBooking.start_time)} -{" "}
                          {formatTime(selectedBooking.end_time)}
                        </p>
                        <p>
                          <strong>Tarif :</strong>{" "}
                          <span className="font-black text-indigo-600">
                            {getBookingPrice(selectedBooking).toFixed(2)} TND
                          </span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {cleanWa && (
                          <a
                            href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                              `Bonjour ${selectedBooking.client_name} 👋, rappel de votre rendez-vous chez ${salonName} le ${(
                                selectedBooking.booking_date || ""
                              ).split("T")[0]} à ${formatTime(selectedBooking.start_time)}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                          >
                            <MessageSquare size={14} /> WhatsApp
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsEditingBooking(true)}
                          className={`py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            !cleanWa ? "col-span-2" : ""
                          }`}
                        >
                          <Edit3 size={14} /> Modifier / Déplacer
                        </button>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        {selectedBooking.status !== "done" &&
                          selectedBooking.status !== "canceled" && (
                            <button
                              type="button"
                              disabled={updatingBooking}
                              onClick={() =>
                                updateBookingStatus(selectedBooking.id, "done")
                              }
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 size={14} /> Marquer comme Terminé
                            </button>
                          )}

                        {selectedBooking.status !== "canceled" ? (
                          <button
                            type="button"
                            disabled={updatingBooking}
                            onClick={() =>
                              updateBookingStatus(selectedBooking.id, "canceled")
                            }
                            className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition border border-rose-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Ban size={14} /> Annuler le rendez-vous
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={updatingBooking}
                            onClick={() =>
                              updateBookingStatus(selectedBooking.id, "still")
                            }
                            className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition border border-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw size={14} /> Réactiver le rendez-vous
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (<form onSubmit={handleSaveReschedule} className="space-y-3.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Prestation
                  </label>
                  <select
                    value={editForm.service_id}
                    onChange={(e) =>
                      setEditForm({ ...editForm, service_id: e.target.value })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 text-slate-900"
                    required
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.duration_minutes} min - {s.price} TND)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Praticien
                  </label>
                  <select
                    value={editForm.employee_id}
                    onChange={(e) =>
                      setEditForm({ ...editForm, employee_id: e.target.value })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 text-slate-900"
                  >
                    <option value="">Non assigné</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={editForm.booking_date}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          booking_date: e.target.value || selectedDate,
                        })
                      }
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 text-slate-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Heure de début
                    </label>
                    <input
                      type="time"
                      value={editForm.start_time}
                      onChange={(e) =>
                        setEditForm({ ...editForm, start_time: e.target.value })
                      }
                      className="w-full border border-slate-200 p-2.5 rounded-xl text-xs bg-slate-50 text-slate-900"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingBooking(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={updatingBooking}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {updatingBooking ? "Sauvegarde..." : "Enregistrer"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
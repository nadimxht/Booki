"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Calendar,
  DollarSign,
  Users,
  AlertTriangle,
  Clock,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  MessageSquare,
  X,
  ChevronRight,
  ChevronLeft,
  Link2,
  Store,
  Copy,
  ExternalLink,
  Search,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Booking {
  id: string;
  created_at: string;
  booking_date: string;
  start_time: string;
  end_time?: string;
  client_name: string;
  client_phone?: string;
  client_whatsapp?: string;
  status: string;
  total_price?: number | null;
  service_id: string;
  employee_id: string;
  services?: { name: string; price: number };
  employees?: { name: string; color?: string };
}

interface Sale {
  id: string;
  created_at: string;
  total_amount: number;
  status?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  min_alert: number;
  unit: string;
}

interface StoreProduct {
  id: string;
  name: string;
  stock: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  color?: string;
}

interface ClientSummary {
  name: string;
  phone: string;
  totalVisits: number;
  totalSpent: number;
  lastVisitDate: string;
  history: Booking[];
}

function getBookingRevenue(b: Booking): number {
  if (b.total_price !== undefined && b.total_price !== null) {
    return Number(b.total_price) || 0;
  }
  return Number(b.services?.price) || 0;
}

function isCompletedStatus(status?: string): boolean {
  const s = (status || "").trim().toLowerCase();
  return s === "done" || s === "completed" || s === "terminé";
}

function getEffectiveTodayStatus(b: Booking): "done" | "ongoing" | "upcoming" {
  if (isCompletedStatus(b.status)) return "done";

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const [sH, sM] = (b.start_time || "00:00").split(":").map(Number);
  const startMins = sH * 60 + sM;

  let endMins = startMins + 30;
  if (b.end_time) {
    const [eH, eM] = b.end_time.split(":").map(Number);
    endMins = eH * 60 + eM;
  }

  if (currentMins >= endMins) return "done";
  if (currentMins >= startMins && currentMins < endMins) return "ongoing";
  return "upcoming";
}

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salonSlug, setSalonSlug] = useState<string | null>(null);

  const [todayBookings, setTodayBookings] = useState<Booking[]>([]);
  const [todayActivityFilter, setTodayActivityFilter] = useState<"all" | "upcoming" | "done">("all");
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);

  const [lowStockInventory, setLowStockInventory] = useState<InventoryItem[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<StoreProduct[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<
    { id: string; name: string; color: string; revenue: number; bookingsCount: number }[]
  >([]);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [clientsList, setClientsList] = useState<ClientSummary[]>([]);

  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);

  useEffect(() => {
    fetchDashboardData(false);
  }, []);

  async function fetchDashboardData(isManualRefresh = false) {
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
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const bizId = profile.business_id;
    const todayStr = new Date().toLocaleDateString("en-CA");
    const currentMonth = todayStr.slice(0, 7);

    const [
      settingsRes,
      bookingsRes,
      servicesRes,
      employeesRes,
      salesRes,
      inventoryRes,
      storeProductsRes,
    ] = await Promise.all([
      supabase
        .from("business_settings")
        .select("slug")
        .eq("business_id", bizId)
        .maybeSingle(),
      supabase
        .from("bookings")
        .select("*")
        .eq("business_id", bizId)
        .order("booking_date", { ascending: false }),
      supabase.from("services").select("*").eq("business_id", bizId),
      supabase.from("employees").select("*").eq("business_id", bizId),
      supabase
        .from("store_sales")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false }),
      supabase.from("inventory").select("*").eq("business_id", bizId),
      supabase.from("store_products").select("id, name, stock").eq("business_id", bizId),
    ]);

    if (settingsRes.data?.slug) {
      setSalonSlug(settingsRes.data.slug);
    }

    const rawBookings = bookingsRes.data || [];
    const servicesList = servicesRes.data || [];
    const team: TeamMember[] = employeesRes.data || [];
    const sales: Sale[] = salesRes.data || [];
    const inventory: InventoryItem[] = inventoryRes.data || [];
    const storeProducts: StoreProduct[] = storeProductsRes.data || [];

    setAllSales(sales);

    const servicesMap = new Map(servicesList.map((s: any) => [s.id, s]));
    const employeesMap = new Map(team.map((e: any) => [e.id, e]));

    const bookings: Booking[] = rawBookings.map((b: any) => ({
      ...b,
      services: servicesMap.has(b.service_id)
        ? {
            name: servicesMap.get(b.service_id).name,
            price: Number(servicesMap.get(b.service_id).price) || 0,
          }
        : undefined,
      employees: employeesMap.has(b.employee_id)
        ? {
            name: employeesMap.get(b.employee_id).name,
            color: employeesMap.get(b.employee_id).color || "#4f46e5",
          }
        : undefined,
    }));

    setAllBookings(bookings);

    // Today's non-canceled bookings sorted chronologically
    const todayList = bookings
      .filter((b) => {
        const bDate = b.booking_date ? b.booking_date.split("T")[0] : "";
        return bDate === todayStr && (b.status || "").toLowerCase() !== "canceled";
      })
      .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

    setTodayBookings(todayList);

    const todaySalesList = sales.filter(
      (s) => s.status === "paid" && s.created_at?.startsWith(todayStr)
    );
    setTodaySales(todaySalesList);

    // Revenue totals (Global, This Month, Today)
    const doneBookings = bookings.filter((b) => isCompletedStatus(b.status));
    const paidSales = sales.filter((s) => s.status === "paid");

    const servicesRevGlobal = doneBookings.reduce((acc, b) => acc + getBookingRevenue(b), 0);
    const storeRevGlobal = paidSales.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
    setTotalRevenue(servicesRevGlobal + storeRevGlobal);

    const servicesRevMonth = doneBookings
      .filter((b) => (b.booking_date || "").startsWith(currentMonth))
      .reduce((acc, b) => acc + getBookingRevenue(b), 0);
    const storeRevMonth = paidSales
      .filter((s) => {
        if (!s.created_at) return false;
        return new Date(s.created_at).toLocaleDateString("en-CA").startsWith(currentMonth);
      })
      .reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
    setMonthlyRevenue(servicesRevMonth + storeRevMonth);

    const servicesRevToday = todayList
      .filter((b) => getEffectiveTodayStatus(b) === "done")
      .reduce((acc, b) => acc + getBookingRevenue(b), 0);
    const storeRevToday = todaySalesList.reduce(
      (acc, s) => acc + (Number(s.total_amount) || 0),
      0
    );
    setTodayRevenue(servicesRevToday + storeRevToday);

    // Aggregate loyal clients
    const clientMap = new Map<string, ClientSummary>();
    bookings.forEach((b) => {
      const phoneVal = (b.client_whatsapp || b.client_phone || "").trim();
      const key = (phoneVal || b.client_name || "").trim();
      if (!key) return;

      const existing = clientMap.get(key) || {
        name: b.client_name || "Client sans nom",
        phone: phoneVal || "Non renseigné",
        totalVisits: 0,
        totalSpent: 0,
        lastVisitDate: b.booking_date,
        history: [],
      };

      existing.totalVisits += 1;
      if (isCompletedStatus(b.status)) {
        existing.totalSpent += getBookingRevenue(b);
      }
      existing.history.push(b);
      clientMap.set(key, existing);
    });

    const aggregatedClients = Array.from(clientMap.values()).sort(
      (a, b) => b.totalVisits - a.totalVisits
    );
    setClientsList(aggregatedClients);

    // Low stock alerts (both consumables & retail store products)
    setLowStockInventory(
      inventory.filter((item) => Number(item.quantity) <= Number(item.min_alert))
    );
    setLowStockProducts(storeProducts.filter((prod) => Number(prod.stock) <= 3));

    // Monthly Team Performance (NO commissions)
    const monthlyDoneBookings = doneBookings.filter((b) => {
      const bDate = b.booking_date ? b.booking_date.split("T")[0] : "";
      return bDate.startsWith(currentMonth);
    });

    const perfMap = team
      .map((emp) => {
        const empBookings = monthlyDoneBookings.filter((b) => b.employee_id === emp.id);
        const rev = empBookings.reduce((acc, curr) => acc + getBookingRevenue(curr), 0);

        return {
          id: emp.id,
          name: emp.name,
          color: emp.color || "#4f46e5",
          revenue: rev,
          bookingsCount: empBookings.length,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    setTeamPerformance(perfMap);
    setLoading(false);
    setRefreshing(false);
    if (isManualRefresh) {
      toast.success("Tableau de bord actualisé.");
    }
  }

  // Monthly stacked chart data: Prestations vs Boutique
  const monthlyChartData = useMemo(() => {
    const monthlyMap: Record<string, { services: number; store: number }> = {};
    const monthsNames = [
      "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
      "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
    ];

    const currentYear = new Date().getFullYear();
    monthsNames.forEach((_, idx) => {
      const key = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
      monthlyMap[key] = { services: 0, store: 0 };
    });

    allSales.forEach((sale) => {
      if (sale.status === "paid" && sale.created_at) {
        const d = new Date(sale.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyMap[key] !== undefined) {
          monthlyMap[key].store += Number(sale.total_amount) || 0;
        }
      }
    });

    allBookings.forEach((b) => {
      if (isCompletedStatus(b.status) && b.booking_date) {
        const key = b.booking_date.slice(0, 7);
        if (monthlyMap[key] !== undefined) {
          monthlyMap[key].services += getBookingRevenue(b);
        }
      }
    });

    return Object.keys(monthlyMap).map((key) => {
      const [, monthIdx] = key.split("-");
      return {
        month: monthsNames[parseInt(monthIdx, 10) - 1],
        services: Number(monthlyMap[key].services.toFixed(2)),
        store: Number(monthlyMap[key].store.toFixed(2)),
      };
    });
  }, [allSales, allBookings]);

  function handleCopyLink(path: string, label: string) {
    if (typeof window === "undefined") return;
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success(`${label} copié !`);
  }

  const todayUpcomingCount = todayBookings.filter(
    (b) => getEffectiveTodayStatus(b) !== "done"
  ).length;
  const todayDoneCount = todayBookings.filter(
    (b) => getEffectiveTodayStatus(b) === "done"
  ).length;

  const filteredTodayBookings = todayBookings.filter((b) => {
    const eff = getEffectiveTodayStatus(b);
    if (todayActivityFilter === "upcoming") return eff !== "done";
    if (todayActivityFilter === "done") return eff === "done";
    return true;
  });

  const totalLowStockCount = lowStockInventory.length + lowStockProducts.length;
  const lowStockLink =
    lowStockInventory.length === 0 && lowStockProducts.length > 0
      ? "/admin/store"
      : "/admin/services";

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clientsList;
    return clientsList.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    );
  }, [clientsList, clientSearch]);

  // Skeleton Loader
  if (loading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-pulse">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 rounded-xl" />
            <div className="h-3.5 w-72 bg-slate-200/70 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-40 bg-slate-200 rounded-2xl" />
            <div className="h-10 w-40 bg-slate-200 rounded-2xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-3xl border border-slate-100 h-32 flex flex-col justify-between"
            >
              <div className="flex justify-between items-center">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="w-8 h-8 bg-slate-200 rounded-xl" />
              </div>
              <div className="space-y-2">
                <div className="h-7 w-32 bg-slate-200 rounded-lg" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 h-80" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 h-64" />
          <div className="bg-white rounded-3xl p-6 border border-slate-100 h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header & Quick Links */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Tableau de Bord</h1>
          <p className="text-xs text-slate-500 font-medium">
            Vue d&apos;ensemble en temps réel de votre établissement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Actualiser les données"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>

          {salonSlug && (
            <>
              <button
                type="button"
                onClick={() => handleCopyLink(`/book/${salonSlug}`, "Lien de réservation")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Link2 size={14} /> Copier Lien Booking <Copy size={12} className="opacity-75" />
              </button>
              <button
                type="button"
                onClick={() => handleCopyLink(`/store/${salonSlug}`, "Lien boutique")}
                className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Store size={14} className="text-indigo-600" /> Copier Lien Store{" "}
                <Copy size={12} className="text-slate-400" />
              </button>
              <a
                href={`/book/${salonSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 transition"
                title="Ouvrir le portail de réservation"
              >
                <ExternalLink size={15} />
              </a>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/expenses"
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3 hover:border-emerald-300 hover:shadow-md transition group block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider group-hover:text-emerald-600 transition">
              CA Global Encaissé
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-2xl font-black text-slate-900 truncate">
                {totalRevenue.toFixed(2)} TND
              </h2>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center shrink-0">
                <TrendingUp size={12} className="mr-0.5" /> Bilan
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Ce mois : <strong className="text-slate-700">{monthlyRevenue.toFixed(0)}</strong> • Auj. :{" "}
              <strong className="text-emerald-600">+{todayRevenue.toFixed(0)} TND</strong>
            </p>
          </div>
        </Link>

        <Link
          href="/admin/calendar"
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3 hover:border-indigo-300 hover:shadow-md transition group block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition">
              RDV Aujourd&apos;hui
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Calendar size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-black text-slate-900">{todayBookings.length}</h2>
              <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-0.5">
                Planning <ArrowUpRight size={12} />
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              <strong className="text-indigo-600">{todayUpcomingCount}</strong> à venir •{" "}
              <strong className="text-emerald-600">{todayDoneCount}</strong> terminé(s)
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setIsClientsModalOpen(true)}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3 cursor-pointer hover:border-purple-300 hover:shadow-md transition group text-left w-full"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider group-hover:text-purple-600 transition">
              Clients Fidèles
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:bg-purple-600 group-hover:text-white transition">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-black text-slate-900">{clientsList.length}</h2>
              <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
                Voir la liste <ChevronRight size={12} />
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Répertoire & historique WhatsApp
            </p>
          </div>
        </button>

        <Link
          href={lowStockLink}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3 hover:border-rose-300 hover:shadow-md transition group block"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider group-hover:text-rose-600 transition">
              Alertes Stock
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                totalLowStockCount > 0
                  ? "bg-rose-50 text-rose-600 animate-pulse"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <AlertTriangle size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <h2
                className={`text-2xl font-black ${
                  totalLowStockCount > 0 ? "text-rose-600" : "text-slate-900"
                }`}
              >
                {totalLowStockCount}
              </h2>
              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5">
                Gérer <ArrowUpRight size={12} />
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              {lowStockInventory.length} conso. • {lowStockProducts.length} boutique
            </p>
          </div>
        </Link>
      </div>

      {/* Graphique CA Mensuel Empilé (Prestations + Boutique) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Évolution du Chiffre d&apos;Affaires Mensuel ({new Date().getFullYear()})
            </h3>
            <p className="text-xs text-slate-500">
              Comparatif Prestations réalisées vs. Ventes Boutique encaissées (en TND)
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block" /> Prestations
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Boutique
            </span>
          </div>
        </div>

        <div className="h-72 w-full min-w-0 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyChartData}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                width={56}
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  `${Number(value || 0).toFixed(2)} TND`,
                  name === "services" ? "Prestations" : "Boutique",
                ]}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "12px",
                  border: "none",
                  color: "#fff",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Bar dataKey="services" stackId="rev" fill="#4f46e5" radius={[0, 0, 0, 0]} />
              <Bar dataKey="store" stackId="rev" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activité du Jour */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock size={16} className="text-indigo-600" /> Activité du Jour (Rendez-vous & Ventes)
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {todayBookings.length} RDV • {todaySales.length} Vente(s) boutique
              </p>
            </div>

            <Link
              href="/admin/calendar"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 self-start sm:self-auto"
            >
              Ouvrir le planning <ChevronRight size={14} />
            </Link>
          </div>

          {/* Rendez-vous du jour (À venir, En cours & Terminés) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                Rendez-vous du jour
              </h4>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: "all", label: `Tous (${todayBookings.length})` },
                  { id: "upcoming", label: `À venir (${todayUpcomingCount})` },
                  { id: "done", label: `Terminés (${todayDoneCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTodayActivityFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      todayActivityFilter === tab.id
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredTodayBookings.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl text-center">
                Aucun rendez-vous dans cette catégorie pour aujourd&apos;hui.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-4 bg-slate-50/50 max-h-96 overflow-y-auto">
                {filteredTodayBookings.map((b) => {
                  const effStatus = getEffectiveTodayStatus(b);
                  return (
                    <div
                      key={b.id}
                      className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {b.client_name}
                          </h4>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                            {b.services?.name || "Prestation"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>🕒 {b.start_time?.slice(0, 5)}</span>
                          <span>• Avec {b.employees?.name || "Non assigné"}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-black text-xs text-slate-900 block">
                          {getBookingRevenue(b).toFixed(2)} TND
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            effStatus === "done"
                              ? "bg-emerald-100 text-emerald-700"
                              : effStatus === "ongoing"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {effStatus === "done"
                            ? "Terminé"
                            : effStatus === "ongoing"
                            ? "En cours"
                            : "À venir"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ventes Boutique du jour */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Ventes Boutique du jour
            </h4>
            {todaySales.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-2xl">
                Aucune vente encaissée aujourd&apos;hui.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                {todaySales.map((s) => (
                  <div
                    key={s.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <ShoppingBag size={14} className="text-emerald-600" /> Vente Store
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {new Date(s.created_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-xs text-emerald-600 block">
                        +{Number(s.total_amount).toFixed(2)} TND
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        Payé
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne Droite */}
        <div className="space-y-6">
          {/* Alertes Stock */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-500" /> Produits à Recommander
              </h3>
              <Link
                href={lowStockLink}
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                Gérer →
              </Link>
            </div>

            {totalLowStockCount === 0 ? (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Tous les stocks sont suffisants.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {lowStockInventory.map((item) => (
                  <div
                    key={`inv-${item.id}`}
                    className="bg-rose-50 border border-rose-100 p-3 rounded-2xl flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-rose-900 block truncate">{item.name}</span>
                      <span className="text-[10px] text-rose-600/80">Inventaire salon</span>
                    </div>
                    <span className="font-extrabold text-rose-600 shrink-0">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}

                {lowStockProducts.map((prod) => (
                  <div
                    key={`prod-${prod.id}`}
                    className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-amber-900 block truncate">{prod.name}</span>
                      <span className="text-[10px] text-amber-700/80">Boutique en ligne</span>
                    </div>
                    <span className="font-extrabold text-amber-700 shrink-0">
                      {prod.stock} restant(s)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Performance Équipe du Mois (Sans Commissions) */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-indigo-600" /> Performance Équipe (Ce mois)
              </h3>
              <Link
                href="/admin/manage"
                className="text-[11px] font-bold text-indigo-600 hover:underline"
              >
                Équipe →
              </Link>
            </div>

            {teamPerformance.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Aucun membre d&apos;équipe enregistré.
              </p>
            ) : (
              <div className="space-y-3">
                {teamPerformance.map((emp) => (
                  <div
                    key={emp.id}
                    className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: emp.color }}
                      />
                      <div className="min-w-0">
                        <strong className="text-slate-900 block truncate">{emp.name}</strong>
                        <span className="text-[10px] text-slate-400">
                          {emp.bookingsCount} prestation{emp.bookingsCount > 1 ? "s" : ""} terminée
                          {emp.bookingsCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-indigo-600 shrink-0">
                      {emp.revenue.toFixed(2)} TND
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modale Clients Fidèles */}
      {isClientsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl h-[85vh] md:h-[600px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    Répertoire des Clients Fidèles
                  </h2>
                  <p className="text-xs text-slate-500">
                    {clientsList.length} client(s) unique(s) enregistrés
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsClientsModalOpen(false);
                  setSelectedClient(null);
                  setClientSearch("");
                }}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 overflow-hidden">
              {/* Liste Clients (cachée sur mobile si un client est sélectionné) */}
              <div
                className={`p-5 overflow-y-auto md:border-r border-slate-100 space-y-3 ${
                  selectedClient ? "hidden md:block" : "block"
                }`}
              >
                <div className="relative sticky top-0 bg-white pb-2 z-10">
                  <Search
                    size={14}
                    className="absolute left-3.5 top-3 text-slate-400"
                  />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Rechercher par nom ou téléphone..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {filteredClients.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-10">
                    Aucun client trouvé.
                  </p>
                ) : (
                  filteredClients.map((client, idx) => {
                    const isSelected =
                      selectedClient?.phone === client.phone &&
                      selectedClient?.name === client.name;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedClient(client)}
                        className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-purple-600 bg-purple-50/50 shadow-xs"
                            : "border-slate-100 bg-slate-50/50 hover:bg-slate-100"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {client.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                            <span>📞 {client.phone}</span>
                            <span>•</span>
                            <span className="font-bold text-slate-700">
                              {client.totalVisits} visite(s)
                            </span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-xs text-purple-600 block">
                            {client.totalSpent.toFixed(2)} TND
                          </span>
                          <span className="text-[10px] text-slate-400">Total dépensé</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Détail Client */}
              <div
                className={`p-5 overflow-y-auto bg-slate-50/50 flex-col justify-between ${
                  selectedClient ? "flex" : "hidden md:flex"
                }`}
              >
                {selectedClient ? (
                  <div className="space-y-5">
                    <button
                      type="button"
                      onClick={() => setSelectedClient(null)}
                      className="md:hidden inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      <ChevronLeft size={15} /> Retour à la liste
                    </button>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
                      <div>
                        <h3 className="font-black text-sm text-slate-900">
                          {selectedClient.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Tél : {selectedClient.phone}
                        </p>
                      </div>

                      {selectedClient.phone.replace(/[^0-9]/g, "") && (
                        <a
                          href={`https://wa.me/${selectedClient.phone.replace(
                            /[^0-9]/g,
                            ""
                          )}?text=${encodeURIComponent(
                            `Bonjour ${selectedClient.name}, nous espérons que vous allez bien ! Souhaitez-vous réserver un prochain rendez-vous ?`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                          <MessageSquare size={14} /> WhatsApp
                        </a>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Historique des Prestations ({selectedClient.history.length})
                      </h4>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {selectedClient.history.map((h, i) => (
                          <div
                            key={i}
                            className="bg-white p-3 rounded-xl border border-slate-200/60 text-xs flex items-center justify-between shadow-2xs gap-2"
                          >
                            <div className="min-w-0">
                              <strong className="text-slate-900 block truncate">
                                {h.services?.name || "Prestation"}
                              </strong>
                              <span className="text-[10px] text-slate-400">
                                📅 {h.booking_date} à {h.start_time?.slice(0, 5)}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-slate-900 block">
                                {getBookingRevenue(h).toFixed(2)} TND
                              </span>
                              <span
                                className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                                  isCompletedStatus(h.status)
                                    ? "bg-emerald-100 text-emerald-700"
                                    : (h.status || "").toLowerCase() === "canceled"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {h.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="my-auto text-center text-slate-400 text-xs space-y-2 py-20">
                    <Users size={32} className="mx-auto text-slate-300" />
                    <p>
                      Sélectionnez un client dans la liste de gauche pour voir son
                      historique et lui envoyer un message WhatsApp.
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200/60 flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsClientsModalOpen(false);
                      setSelectedClient(null);
                      setClientSearch("");
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
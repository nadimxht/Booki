"use client";

import { useEffect, useState, useMemo } from "react";
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
  Link2,
  Store,
  Copy,
  ExternalLink,
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
  client_name: string;
  client_phone?: string;
  client_whatsapp?: string;
  status: string;
  total_price?: number | null;
  service_id: string;
  employee_id: string;
  services?: { name: string; price: number };
  employees?: { name: string; commission_rate?: number };
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

interface TeamMember {
  id: string;
  name: string;
  role: string;
  commission_rate: number;
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

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [salonSlug, setSalonSlug] = useState<string | null>(null);

  const [todayDoneBookings, setTodayDoneBookings] = useState<Booking[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<
    { id: string; name: string; revenue: number; commission: number }[]
  >([]);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [todayBookingsCount, setTodayBookingsCount] = useState(0);
  const [clientsList, setClientsList] = useState<ClientSummary[]>([]);

  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
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
    const todayStr = new Date().toLocaleDateString("en-CA");

    const [
      settingsRes,
      bookingsRes,
      servicesRes,
      employeesRes,
      salesRes,
      inventoryRes,
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
    ]);

    if (settingsRes.data?.slug) {
      setSalonSlug(settingsRes.data.slug);
    }

    const rawBookings = bookingsRes.data || [];
    const servicesList = servicesRes.data || [];
    const team: TeamMember[] = employeesRes.data || [];
    const sales: Sale[] = salesRes.data || [];
    const inventory: InventoryItem[] = inventoryRes.data || [];

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
            commission_rate:
              Number(employeesMap.get(b.employee_id).commission_rate) || 0,
          }
        : undefined,
    }));

    setAllBookings(bookings);

    const todayList = bookings.filter((b) => {
      const bDate = b.booking_date ? b.booking_date.split("T")[0] : "";
      return bDate === todayStr && (b.status || "").toLowerCase() !== "canceled";
    });

    const todayDoneList = todayList.filter((b) => isCompletedStatus(b.status));
    setTodayDoneBookings(todayDoneList);
    setTodayBookingsCount(todayList.length);

    const todaySalesList = sales.filter(
      (s) => s.status === "paid" && s.created_at?.startsWith(todayStr)
    );
    setTodaySales(todaySalesList);

    const servicesRevenue = bookings
      .filter((b) => isCompletedStatus(b.status))
      .reduce((acc, curr) => acc + getBookingRevenue(curr), 0);

    const storeRevenue = sales
      .filter((s) => s.status === "paid")
      .reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);

    setTotalRevenue(servicesRevenue + storeRevenue);

    // Aggregate loyal clients using client_whatsapp first
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

    const lowStock = inventory.filter(
      (item) => Number(item.quantity) <= Number(item.min_alert)
    );
    setLowStockItems(lowStock);

    const currentMonth = todayStr.slice(0, 7);
    const monthlyDoneBookings = bookings.filter((b) => {
      const bDate = b.booking_date ? b.booking_date.split("T")[0] : "";
      return bDate.startsWith(currentMonth) && isCompletedStatus(b.status);
    });

    const perfMap = team.map((emp) => {
      const empBookings = monthlyDoneBookings.filter(
        (b) => b.employee_id === emp.id
      );
      const rev = empBookings.reduce(
        (acc, curr) => acc + getBookingRevenue(curr),
        0
      );
      const commRate = Number(emp.commission_rate) || 0;
      const comm = (rev * commRate) / 100;

      return { id: emp.id, name: emp.name, revenue: rev, commission: comm };
    });

    setTeamPerformance(perfMap);
    setLoading(false);
  }

  const monthlyChartData = useMemo(() => {
    const monthlyMap: Record<string, number> = {};
    const monthsNames = [
      "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
      "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
    ];

    const currentYear = new Date().getFullYear();
    monthsNames.forEach((_, idx) => {
      const key = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
      monthlyMap[key] = 0;
    });

    allSales.forEach((sale) => {
      if (sale.status === "paid" && sale.created_at) {
        const d = new Date(sale.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyMap[key] !== undefined) {
          monthlyMap[key] += Number(sale.total_amount) || 0;
        }
      }
    });

    allBookings.forEach((b) => {
      if (isCompletedStatus(b.status) && b.booking_date) {
        const key = b.booking_date.slice(0, 7);
        if (monthlyMap[key] !== undefined) {
          monthlyMap[key] += getBookingRevenue(b);
        }
      }
    });

    return Object.keys(monthlyMap).map((key) => {
      const [, monthIdx] = key.split("-");
      return {
        month: monthsNames[parseInt(monthIdx, 10) - 1],
        revenue: Number(monthlyMap[key].toFixed(2)),
      };
    });
  }, [allSales, allBookings]);

  function handleCopyLink(path: string, label: string) {
    if (typeof window === "undefined") return;
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success(`${label} copié !`);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px] text-xs text-slate-400 font-medium">
        Actualisation des données en direct...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Tableau de Bord</h1>
          <p className="text-xs text-slate-500 font-medium">
            Vue d&apos;ensemble en temps réel de votre établissement.
          </p>
        </div>

        {/* Liens Publics Rapides */}
        {salonSlug && (
          <div className="flex flex-wrap items-center gap-2">
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
              title="Ouvrir mon portail public"
            >
              <ExternalLink size={15} />
            </a>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Chiffre d&apos;Affaires
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">
              {totalRevenue.toFixed(2)} TND
            </h2>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center">
              <TrendingUp size={12} /> Réel
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              RDV Aujourd&apos;hui
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Calendar size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">
              {todayBookingsCount}
            </h2>
            <span className="text-[10px] font-bold text-indigo-600">
              Réservation(s)
            </span>
          </div>
        </div>

        <div
          onClick={() => setIsClientsModalOpen(true)}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3 cursor-pointer hover:border-purple-300 hover:shadow-md transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider group-hover:text-purple-600 transition">
              Clients Fidèles
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:bg-purple-600 group-hover:text-white transition">
              <Users size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">
              {clientsList.length}
            </h2>
            <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
              Voir la liste <ChevronRight size={12} />
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Alertes Stock
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                lowStockItems.length > 0
                  ? "bg-rose-50 text-rose-600 animate-pulse"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2
              className={`text-2xl font-black ${
                lowStockItems.length > 0 ? "text-rose-600" : "text-slate-900"
              }`}
            >
              {lowStockItems.length}
            </h2>
            <span className="text-[10px] font-bold text-slate-400">
              Produit(s) bas
            </span>
          </div>
        </div>
      </div>

      {/* Graphique CA Mensuel (Prestations + Boutique) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Évolution du Chiffre d&apos;Affaires Mensuel
            </h3>
            <p className="text-xs text-slate-500">
              Revenus cumulés des prestations terminées et ventes boutique validées (en TND)
            </p>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyChartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any) => [
                  `${Number(value).toFixed(2)} TND`,
                  "Chiffre d'affaires",
                ]}
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderRadius: "12px",
                  border: "none",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="revenue" fill="#4f46e5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" /> Activité du Jour (Prestations & Ventes)
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {todayDoneBookings.length} terminée(s) • {todaySales.length} Vente(s)
            </span>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Prestations Terminées du jour
            </h4>
            {todayDoneBookings.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-2xl">
                Aucune prestation terminée trouvée pour aujourd&apos;hui.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                {todayDoneBookings.map((b) => (
                  <div
                    key={b.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900">
                          {b.client_name}
                        </h4>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                          {b.services?.name || "Prestation"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>🕒 {b.start_time}</span>
                        <span>Avec {b.employees?.name || "Non assigné"}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-xs text-slate-900 block">
                        {getBookingRevenue(b).toFixed(2)} TND
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
                        {new Date(s.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-xs text-emerald-600 block">
                        +{s.total_amount} TND
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

        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-500" /> Produits à Recommander
            </h3>

            {lowStockItems.length === 0 ? (
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Tous les stocks sont suffisants.
              </p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-rose-50 border border-rose-100 p-3 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-rose-900">{item.name}</span>
                    <span className="font-extrabold text-rose-600">
                      {item.quantity} {item.unit} restants
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Users size={16} className="text-indigo-600" /> Commissions du Mois
            </h3>

            <div className="space-y-3">
              {teamPerformance.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <strong className="text-slate-900 block">{emp.name}</strong>
                    <span className="text-[10px] text-slate-400">
                      Généré : {emp.revenue.toFixed(2)} TND
                    </span>
                  </div>
                  <span className="font-black text-indigo-600">
                    {emp.commission.toFixed(2)} TND
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modale Clients Fidèles */}
      {isClientsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
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
                onClick={() => {
                  setIsClientsModalOpen(false);
                  setSelectedClient(null);
                }}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto border-r border-slate-100 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Sélectionnez un client
                </h3>
                {clientsList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-10">
                    Aucun client enregistré pour le moment.
                  </p>
                ) : (
                  clientsList.map((client, idx) => {
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
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs text-slate-900">
                            {client.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 flex items-center gap-2">
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
                          <span className="text-[10px] text-slate-400">
                            Total dépensé
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-6 overflow-y-auto bg-slate-50/50 flex flex-col justify-between">
                {selectedClient ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
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
                          <MessageSquare size={14} /> Message WhatsApp
                        </a>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Historique des Prestations ({selectedClient.history.length})
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {selectedClient.history.map((h, i) => (
                          <div
                            key={i}
                            className="bg-white p-3 rounded-xl border border-slate-200/60 text-xs flex items-center justify-between shadow-2xs"
                          >
                            <div>
                              <strong className="text-slate-900 block">
                                {h.services?.name || "Prestation"}
                              </strong>
                              <span className="text-[10px] text-slate-400">
                                📅 {h.booking_date} à {h.start_time}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900 block">
                                {getBookingRevenue(h).toFixed(2)} TND
                              </span>
                              <span
                                className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full ${
                                  isCompletedStatus(h.status)
                                    ? "bg-emerald-100 text-emerald-700"
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

                <div className="pt-4 border-t border-slate-200/60 flex justify-end">
                  <button
                    onClick={() => {
                      setIsClientsModalOpen(false);
                      setSelectedClient(null);
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
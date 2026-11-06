"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Calendar, DollarSign, Users, AlertTriangle, Clock, 
  TrendingUp, Scissors, ShoppingBag, CheckCircle2, Bug 
} from "lucide-react";

interface Booking {
  id: string;
  created_at: string;
  booking_date: string;
  start_time: string;
  client_name: string;
  client_phone: string;
  status: string;
  service_id: string;
  employee_id: string;
  services?: { name: string; price: number };
  employees?: { name: string; commission_rate?: number };
}

interface Sale {
  id: string;
  created_at: string;
  total_amount: number;
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

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);

  const [todayDoneBookings, setTodayDoneBookings] = useState<Booking[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<{ id: string; name: string; revenue: number; commission: number }[]>([]);

  const [totalRevenue, setTotalRevenue] = useState(0);
  const [todayBookingsCount, setTodayBookingsCount] = useState(0);
  const [totalClientsCount, setTotalClientsCount] = useState(0);

  // État de débogage pour voir toutes les réservations brutes reçues
  const [debugBookings, setDebugBookings] = useState<any[]>([]);
  const [debugTodayStr, setDebugTodayStr] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    const localDate = new Date();
    const todayStr = localDate.toLocaleDateString("en-CA"); // Format YYYY-MM-DD local
    setDebugTodayStr(todayStr);

    // Requêtes séparées et sécurisées (sans jointure SQL complexe)
    const [bookingsRes, servicesRes, employeesRes, salesRes, inventoryRes, teamRes] = await Promise.all([
      supabase.from("bookings").select("*").order("booking_date", { ascending: true }),
      supabase.from("services").select("*"),
      supabase.from("employees").select("*"),
      supabase.from("store_sales").select("*").order("created_at", { ascending: false }),
      supabase.from("inventory").select("*"),
      supabase.from("employees").select("*")
    ]);

    const rawBookings = bookingsRes.data || [];
    setDebugBookings(rawBookings); // Sauvegarde pour le débogage visuel

    const servicesList = servicesRes.data || [];
    const employeesList = employeesRes.data || [];
    const sales: Sale[] = salesRes.data || [];
    const inventory: InventoryItem[] = inventoryRes.data || [];
    const team: TeamMember[] = teamRes.data || [];

    const servicesMap = new Map(servicesList.map((s: any) => [s.id, s]));
    const employeesMap = new Map(employeesList.map((e: any) => [e.id, e]));

    const bookings: Booking[] = rawBookings.map((b: any) => ({
      ...b,
      services: servicesMap.has(b.service_id) ? {
        name: servicesMap.get(b.service_id).name,
        price: Number(servicesMap.get(b.service_id).price) || 0
      } : undefined,
      employees: employeesMap.has(b.employee_id) ? {
        name: employeesMap.get(b.employee_id).name,
        commission_rate: Number(employeesMap.get(b.employee_id).commission_rate) || 0
      } : undefined
    }));

    // Filtrage assoupli pour le test : on prend tout ce qui correspond à la date du jour (peu importe le statut exact pour l'instant)
    const todayList = bookings.filter((b) => {
      const bDate = b.booking_date ? b.booking_date.split("T")[0] : "";
      return bDate === todayStr;
    });

    // Celles qui sont 'done'
    const todayDoneList = todayList.filter((b) => {
      const status = (b.status || "").trim().toLowerCase();
      return status === "done" || status === "completed" || status === "terminé";
    });

    setTodayDoneBookings(todayDoneList);
    setTodayBookingsCount(todayList.length);

    // Ventes du jour
    const todaySalesList = sales.filter((s) => s.created_at?.startsWith(todayStr));
    setTodaySales(todaySalesList);

    // CA Total
    const servicesRevenue = bookings
      .filter((b) => {
        const status = (b.status || "").trim().toLowerCase();
        return status === "done" || status === "completed" || status === "terminé";
      })
      .reduce((acc, curr) => acc + (Number(curr.services?.price) || 0), 0);

    const storeRevenue = sales.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
    setTotalRevenue(servicesRevenue + storeRevenue);

    // Clients uniques
    const uniqueClients = new Set(bookings.map((b) => b.client_phone || b.client_name));
    setTotalClientsCount(uniqueClients.size);

    // Stock bas
    const lowStock = inventory.filter((item) => Number(item.quantity) <= Number(item.min_alert));
    setLowStockItems(lowStock);

    // Performance équipe
    const currentMonth = todayStr.slice(0, 7);
    const monthlyDoneBookings = bookings.filter((b) => {
      const bDate = b.booking_date ? b.booking_date.split("T")[0] : "";
      const status = (b.status || "").trim().toLowerCase();
      return bDate.startsWith(currentMonth) && (status === "done" || status === "completed");
    });

    const perfMap = team.map((emp) => {
      const empBookings = monthlyDoneBookings.filter((b) => b.employee_id === emp.id);
      const rev = empBookings.reduce((acc, curr) => acc + (Number(curr.services?.price) || 0), 0);
      const commRate = Number(emp.commission_rate) || 0;
      const comm = (rev * commRate) / 100;

      return { id: emp.id, name: emp.name, revenue: rev, commission: comm };
    });

    setTeamPerformance(perfMap);
    setLoading(false);
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px] text-xs text-slate-400 font-medium">Actualisation des données en direct...</div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      
      <div>
        <h1 className="text-2xl font-black text-slate-900">Tableau de Bord</h1>
        <p className="text-xs text-slate-500 font-medium">Vue d'ensemble en temps réel de votre salon de coiffure.</p>
      </div>

     
      {/* ------------------------------------------------- */}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Chiffre d'Affaires</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{totalRevenue.toFixed(2)} TND</h2>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center"><TrendingUp size={12} /> Réel</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">RDV Aujourd'hui</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Calendar size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{todayBookingsCount}</h2>
            <span className="text-[10px] font-bold text-indigo-600">Réservation(s)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Clients Uniques</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-black text-slate-900">{totalClientsCount}</h2>
            <span className="text-[10px] font-bold text-purple-600">Fidélisés</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Alertes Stock</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              lowStockItems.length > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-slate-100 text-slate-400"
            }`}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h2 className={`text-2xl font-black ${lowStockItems.length > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {lowStockItems.length}
            </h2>
            <span className="text-[10px] font-bold text-slate-400">Produit(s) bas</span>
          </div>
        </div>
      </div>

      {/* Grille principale */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activité du Jour */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" /> Activité du Jour (Réservations Terminées & Ventes)
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {todayDoneBookings.length} terminée(s) • {todaySales.length} Vente(s)
            </span>
          </div>

          {/* Réservations terminées */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Réservations Terminées du jour</h4>
            {todayDoneBookings.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-2xl">
                Aucune réservation terminée trouvée pour aujourd'hui. Regardez le panneau orange ci-dessus pour comparer la "Date DB" avec la "Date calculée".
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                {todayDoneBookings.map((b) => (
                  <div key={b.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900">{b.client_name}</h4>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                          {b.services?.name || "Prestation"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>🕒 {b.start_time}</span>
                        <span>• Coiffé par {b.employees?.name || "Non assigné"}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-xs text-slate-900 block">{b.services?.price || 0} TND</span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ventes Boutique */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Ventes Boutique du jour</h4>
            {todaySales.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-2xl">Aucune vente enregistrée aujourd'hui.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                {todaySales.map((s) => (
                  <div key={s.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <ShoppingBag size={14} className="text-emerald-600" /> Vente Store
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-xs text-emerald-600 block">+{s.total_amount} TND</span>
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

        {/* Colonne de droite */}
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
                  <div key={item.id} className="bg-rose-50 border border-rose-100 p-3 rounded-2xl flex items-center justify-between text-xs">
                    <span className="font-bold text-rose-900">{item.name}</span>
                    <span className="font-extrabold text-rose-600">{item.quantity} {item.unit} restants</span>
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
                <div key={emp.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900 block">{emp.name}</strong>
                    <span className="text-[10px] text-slate-400">Généré : {emp.revenue.toFixed(2)} TND</span>
                  </div>
                  <span className="font-black text-indigo-600">{emp.commission.toFixed(2)} TND</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
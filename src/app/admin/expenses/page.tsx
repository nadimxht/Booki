"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Printer,
  Package,
  UserCheck,
  PieChart,
  AlertCircle,
  Download,
  Copy,
  Search,
  Target,
  CheckCircle2,
  Clock,
  ArrowUpDown,
} from "lucide-react";

interface UnifiedExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  source: "manual" | "inventory" | "payroll";
  notes?: string;
}

const CATEGORIES = [
  "Loyer",
  "Achats Produits",
  "Salaires & Prime",
  "Factures (Eau/Elec/Net)",
  "Marketing & Pub",
  "Autre",
];

const RECURRING_CATEGORIES = ["Loyer", "Factures (Eau/Elec/Net)"];

const EXPENSE_PRESETS = [
  { label: "Loyer", title: "Loyer du local", category: "Loyer" },
  { label: "Facture STEG", title: "Facture STEG (Électricité)", category: "Factures (Eau/Elec/Net)" },
  { label: "Facture SONEDE", title: "Facture SONEDE (Eau)", category: "Factures (Eau/Elec/Net)" },
  { label: "Internet / Fibre", title: "Abonnement Internet / Fibre", category: "Factures (Eau/Elec/Net)" },
  { label: "Pub Sponsorisée", title: "Campagne Pub Instagram / Facebook", category: "Marketing & Pub" },
];

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

function getTunisMonthStr(): string {
  return getTunisTodayStr().slice(0, 7);
}

function formatSafeDateFr(dateStr: string): string {
  if (!dateStr) return "";
  const clean = dateStr.split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return new Date(dateStr).toLocaleDateString("fr-FR");
  }
  const [y, m, d] = clean.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).toLocaleDateString("fr-FR", {
    timeZone: "Africa/Tunis",
  });
}

function getMonthBounds(monthStr: string) {
  const [y, m] = monthStr.split("-").map(Number);
  const startOfMonth = `${monthStr}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const endOfMonth = `${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const nextMonthDate = new Date(Date.UTC(y, m, 1));
  const nextMonthStart = `${nextMonthDate.getUTCFullYear()}-${String(
    nextMonthDate.getUTCMonth() + 1
  ).padStart(2, "0")}-01`;

  const prevMonthDate = new Date(Date.UTC(y, m - 2, 1));
  const prevMonthStr = `${prevMonthDate.getUTCFullYear()}-${String(
    prevMonthDate.getUTCMonth() + 1
  ).padStart(2, "0")}`;

  return { startOfMonth, endOfMonth, nextMonthStart, prevMonthStr };
}

export default function ExpensesPage() {
  const supabase = createClient();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [salonName, setSalonName] = useState("Mon Établissement");
  const [unifiedExpenses, setUnifiedExpenses] = useState<UnifiedExpense[]>([]);

  // Revenues
  const [bookingsRevenue, setBookingsRevenue] = useState(0);
  const [storeRevenue, setStoreRevenue] = useState(0);
  const [upcomingBookingsRevenue, setUpcomingBookingsRevenue] = useState(0);

  // Previous month comparison
  const [prevMonthRevenue, setPrevMonthRevenue] = useState(0);
  const [prevMonthExpenses, setPrevMonthExpenses] = useState(0);

  // Unpaid payroll alert
  const [unpaidEmployees, setUnpaidEmployees] = useState<
    { id: string; name: string; salary: number }[]
  >([]);

  const [selectedMonth, setSelectedMonth] = useState(() => getTunisMonthStr());
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("Tous");
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<
    "all" | "manual" | "payroll" | "inventory"
  >("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [copyingRecurring, setCopyingRecurring] = useState(false);

  // Create / Edit Manual Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [expenseDate, setExpenseDate] = useState(() => getTunisTodayStr());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initData();
  }, [selectedMonth]);

  async function initData() {
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

    const { startOfMonth, endOfMonth, nextMonthStart, prevMonthStr } =
      getMonthBounds(selectedMonth);
    const prevBounds = getMonthBounds(prevMonthStr);

    const [
      settingsRes,
      manualRes,
      employeesRes,
      salesRes,
      productsRes,
      restocksRes,
      bookingsRes,
      prevManualRes,
      prevRestocksRes,
      prevBookingsRes,
      prevSalesRes,
    ] = await Promise.all([
      supabase
        .from("business_settings")
        .select("name")
        .eq("business_id", bizId)
        .maybeSingle(),
      supabase
        .from("expenses")
        .select("*")
        .eq("business_id", bizId)
        .gte("expense_date", startOfMonth)
        .lte("expense_date", endOfMonth),
      supabase
        .from("employees")
        .select("id, name, salary, last_paid_month, is_paid_this_month")
        .eq("business_id", bizId),
      supabase
        .from("store_sales")
        .select("created_at, items, total_amount")
        .eq("business_id", bizId)
        .eq("status", "paid")
        .gte("created_at", startOfMonth)
        .lt("created_at", nextMonthStart),
      supabase
        .from("store_products")
        .select("id, cost_price, name")
        .eq("business_id", bizId),
      supabase
        .from("inventory_restocks")
        .select("*")
        .eq("business_id", bizId)
        .gte("restock_date", startOfMonth)
        .lte("restock_date", endOfMonth),
      supabase
        .from("bookings")
        .select("total_price, status, services(price)")
        .eq("business_id", bizId)
        .gte("booking_date", startOfMonth)
        .lte("booking_date", endOfMonth)
        .neq("status", "canceled"),
      supabase
        .from("expenses")
        .select("amount")
        .eq("business_id", bizId)
        .gte("expense_date", prevBounds.startOfMonth)
        .lte("expense_date", prevBounds.endOfMonth),
      supabase
        .from("inventory_restocks")
        .select("total_cost")
        .eq("business_id", bizId)
        .gte("restock_date", prevBounds.startOfMonth)
        .lte("restock_date", prevBounds.endOfMonth),
      supabase
        .from("bookings")
        .select("total_price, status, services(price)")
        .eq("business_id", bizId)
        .gte("booking_date", prevBounds.startOfMonth)
        .lte("booking_date", prevBounds.endOfMonth)
        .neq("status", "canceled"),
      supabase
        .from("store_sales")
        .select("created_at, items, total_amount")
        .eq("business_id", bizId)
        .eq("status", "paid")
        .gte("created_at", prevBounds.startOfMonth)
        .lt("created_at", prevBounds.nextMonthStart),
    ]);

    setSalonName(
      settingsRes.data?.name ||
        (profile.businesses && (profile.businesses as any).name) ||
        "Mon Établissement"
    );

    const allEmployees = employeesRes.data || [];
    const paidEmployees = allEmployees.filter(
      (emp: any) =>
        emp.last_paid_month === selectedMonth && emp.is_paid_this_month
    );
    const unpaid = allEmployees
      .filter(
        (emp: any) =>
          Number(emp.salary) > 0 &&
          !(emp.last_paid_month === selectedMonth && emp.is_paid_this_month)
      )
      .map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        salary: Number(emp.salary) || 0,
      }));
    setUnpaidEmployees(unpaid);

    const productCostMap = new Map(
      (productsRes.data || []).map((p: any) => [
        p.id,
        Number(p.cost_price) || 0,
      ])
    );

    const list: UnifiedExpense[] = [];

    (restocksRes.data || []).forEach((r: any) => {
      list.push({
        id: `restock-${r.id}`,
        title: `Restock : ${r.item_name} (${r.quantity_added} unités)`,
        amount: Number(r.total_cost) || 0,
        category: "Achats Produits",
        date: r.restock_date,
        source: "inventory",
        notes: `Coût unitaire : ${r.unit_cost} TND`,
      });
    });

    (manualRes.data || []).forEach((e: any) => {
      list.push({
        id: e.id,
        title: e.title,
        amount: Number(e.amount) || 0,
        category: e.category,
        date: e.expense_date,
        source: "manual",
        notes: e.notes,
      });
    });

    paidEmployees.forEach((emp: any) => {
      list.push({
        id: `payroll-${emp.id}`,
        title: `Salaire versé : ${emp.name}`,
        amount: Number(emp.salary) || 0,
        category: "Salaires & Prime",
        date: `${selectedMonth}-01`,
        source: "payroll",
        notes: "Statut : Payé (Équipe)",
      });
    });

    let totalInventoryCogs = 0;
    let currentStoreRev = 0;
    (salesRes.data || []).forEach((sale: any) => {
      currentStoreRev += Number(sale.total_amount) || 0;
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const cost = productCostMap.get(item.product_id) || 0;
          totalInventoryCogs += cost * (Number(item.quantity) || 1);
        });
      }
    });

    if (totalInventoryCogs > 0) {
      list.push({
        id: "auto-inventory-cost",
        title: "Coût d'achat des produits vendus (COGS)",
        amount: totalInventoryCogs,
        category: "Achats Produits",
        date: endOfMonth,
        source: "inventory",
        notes: "Calculé automatiquement depuis les ventes boutique payées",
      });
    }

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let realizedBookings = 0;
    let upcomingBookings = 0;
    (bookingsRes.data || []).forEach((b: any) => {
      const price =
        b.total_price !== null && b.total_price !== undefined
          ? Number(b.total_price) || 0
          : Number(b.services?.price) || 0;
      const st = (b.status || "").toLowerCase();
      if (st === "done" || st === "completed" || st === "terminé") {
        realizedBookings += price;
      } else {
        upcomingBookings += price;
      }
    });

    const prevManualTotal = (prevManualRes.data || []).reduce(
      (s: number, e: any) => s + (Number(e.amount) || 0),
      0
    );
    const prevRestockTotal = (prevRestocksRes.data || []).reduce(
      (s: number, r: any) => s + (Number(r.total_cost) || 0),
      0
    );
    const prevPaidPayroll = allEmployees
      .filter(
        (emp: any) =>
          emp.last_paid_month === prevMonthStr && emp.is_paid_this_month
      )
      .reduce((s: number, emp: any) => s + (Number(emp.salary) || 0), 0);

    let prevInventoryCogs = 0;
    let prevStoreRev = 0;
    (prevSalesRes.data || []).forEach((sale: any) => {
      prevStoreRev += Number(sale.total_amount) || 0;
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const cost = productCostMap.get(item.product_id) || 0;
          prevInventoryCogs += cost * (Number(item.quantity) || 1);
        });
      }
    });

    const prevBookingsRev = (prevBookingsRes.data || []).reduce(
      (s: number, b: any) => {
        const st = (b.status || "").toLowerCase();
        if (st === "done" || st === "completed" || st === "terminé") {
          const p =
            b.total_price !== null && b.total_price !== undefined
              ? Number(b.total_price) || 0
              : Number(b.services?.price) || 0;
          return s + p;
        }
        return s;
      },
      0
    );

    setUnifiedExpenses(list);
    setBookingsRevenue(realizedBookings);
    setStoreRevenue(currentStoreRev);
    setUpcomingBookingsRevenue(upcomingBookings);
    setPrevMonthRevenue(prevBookingsRev + prevStoreRev);
    setPrevMonthExpenses(
      prevManualTotal + prevRestockTotal + prevPaidPayroll + prevInventoryCogs
    );
    setLoading(false);
  }

  function openCreateModal() {
    setEditingExpenseId(null);
    setTitle("");
    setAmount("");
    setCategory(CATEGORIES[0]);
    const todayLocal = getTunisTodayStr();
    setExpenseDate(
      todayLocal.startsWith(selectedMonth) ? todayLocal : `${selectedMonth}-01`
    );
    setNotes("");
    setIsModalOpen(true);
  }

  function openEditModal(exp: UnifiedExpense) {
    if (exp.source !== "manual") return;
    setEditingExpenseId(exp.id);
    setTitle(exp.title);
    setAmount(exp.amount.toString());
    setCategory(exp.category);
    setExpenseDate((exp.date || "").split("T")[0]);
    setNotes(exp.notes || "");
    setIsModalOpen(true);
  }

  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    setSubmitting(true);

    const payload = {
      business_id: businessId,
      title: title.trim(),
      amount: Math.max(0, parseFloat(amount) || 0),
      category,
      expense_date: expenseDate,
      notes: notes.trim(),
    };

    let error;
    if (editingExpenseId) {
      const res = await supabase
        .from("expenses")
        .update(payload)
        .eq("id", editingExpenseId)
        .eq("business_id", businessId);
      error = res.error;
    } else {
      const res = await supabase.from("expenses").insert([payload]);
      error = res.error;
    }

    setSubmitting(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(
        editingExpenseId ? "Dépense modifiée !" : "Dépense enregistrée !"
      );
      setIsModalOpen(false);
      initData();
    }
  }

  async function handleDeleteExpense(exp: UnifiedExpense) {
    if (exp.source !== "manual") {
      toast.info(
        "Cette dépense est générée automatiquement par le système (Salaires / Inventaire)."
      );
      return;
    }
    if (!businessId || !confirm("Supprimer cette dépense ?")) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", exp.id)
      .eq("business_id", businessId);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Dépense supprimée.");
      initData();
    }
  }

  async function handleCopyRecurringFromPrevMonth() {
    if (!businessId) return;
    setCopyingRecurring(true);

    const { prevMonthStr } = getMonthBounds(selectedMonth);
    const prevBounds = getMonthBounds(prevMonthStr);

    const { data: prevRecurring, error } = await supabase
      .from("expenses")
      .select("title, amount, category, notes")
      .eq("business_id", businessId)
      .in("category", RECURRING_CATEGORIES)
      .gte("expense_date", prevBounds.startOfMonth)
      .lte("expense_date", prevBounds.endOfMonth);

    if (error) {
      setCopyingRecurring(false);
      toast.error("Erreur : " + error.message);
      return;
    }

    if (!prevRecurring || prevRecurring.length === 0) {
      setCopyingRecurring(false);
      toast.info(
        "Aucun loyer ou facture récurrente trouvé sur le mois précédent."
      );
      return;
    }

    const existingTitles = new Set(
      unifiedExpenses
        .filter((e) => e.source === "manual")
        .map((e) => e.title.trim().toLowerCase())
    );

    const toInsert = prevRecurring
      .filter((item) => !existingTitles.has(item.title.trim().toLowerCase()))
      .map((item) => ({
        business_id: businessId,
        title: item.title,
        amount: item.amount,
        category: item.category,
        expense_date: `${selectedMonth}-01`,
        notes: item.notes || "Importé du mois précédent",
      }));

    if (toInsert.length === 0) {
      setCopyingRecurring(false);
      toast.info("Toutes vos charges fixes du mois dernier sont déjà présentes.");
      return;
    }

    const { error: insertErr } = await supabase
      .from("expenses")
      .insert(toInsert);

    setCopyingRecurring(false);
    if (insertErr) {
      toast.error("Erreur lors de l'import : " + insertErr.message);
    } else {
      toast.success(`${toInsert.length} charge(s) fixe(s) importée(s) !`);
      initData();
    }
  }

  function handleExportCsv() {
    const header = ["Date", "Intitule", "Categorie", "Source", "Montant (TND)", "Notes"];
    const rows = unifiedExpenses.map((e) => [
      e.date,
      `"${(e.title || "").replace(/"/g, '""')}"`,
      `"${e.category}"`,
      e.source,
      `-${e.amount.toFixed(2)}`,
      `"${(e.notes || "").replace(/"/g, '""')}"`,
    ]);

    const summaryRows = [
      [],
      ["RESUME DU MOIS", selectedMonth],
      ["Recettes Prestations (TND)", bookingsRevenue.toFixed(2)],
      ["Recettes Boutique (TND)", storeRevenue.toFixed(2)],
      ["Recettes Totales (TND)", monthlyRevenue.toFixed(2)],
      ["Charges Totales (TND)", totalExpenses.toFixed(2)],
      ["Benefice Net Reel (TND)", netProfit.toFixed(2)],
    ];

    const csvContent =
      "\uFEFF" +
      [header, ...rows, ...summaryRows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `booki-bilan-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé !");
  }

  const monthlyRevenue = bookingsRevenue + storeRevenue;
  const totalExpenses = unifiedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = monthlyRevenue - totalExpenses;
  const profitMarginPct =
    monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0;
  const expenseRatio =
    monthlyRevenue > 0 ? (totalExpenses / monthlyRevenue) * 100 : 0;

  const unpaidSalariesTotal = unpaidEmployees.reduce(
    (sum, emp) => sum + emp.salary,
    0
  );
  const projectedProfitAfterPayroll =
    netProfit + upcomingBookingsRevenue - unpaidSalariesTotal;

  const breakEvenGap = Math.max(0, totalExpenses - monthlyRevenue);
  const breakEvenProgress =
    totalExpenses > 0
      ? Math.min(100, (monthlyRevenue / totalExpenses) * 100)
      : 100;

  const calcDelta = (curr: number, prev: number) => {
    if (prev <= 0) return null;
    return ((curr - prev) / prev) * 100;
  };
  const revDelta = calcDelta(monthlyRevenue, prevMonthRevenue);
  const expDelta = calcDelta(totalExpenses, prevMonthExpenses);

  const categoryBreakdown = CATEGORIES.map((cat) => {
    const totalCat = unifiedExpenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    const percentage = totalExpenses > 0 ? (totalCat / totalExpenses) * 100 : 0;
    return { category: cat, total: totalCat, percentage };
  }).sort((a, b) => b.total - a.total);

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = unifiedExpenses.filter((e) => {
      const matchCat =
        selectedCategoryFilter === "Tous" ||
        e.category === selectedCategoryFilter;
      const matchSource =
        selectedSourceFilter === "all" || e.source === selectedSourceFilter;
      const matchSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q));
      return matchCat && matchSource && matchSearch;
    });

    if (sortBy === "amount") {
      return [...list].sort((a, b) => b.amount - a.amount);
    }
    return list;
  }, [
    unifiedExpenses,
    selectedCategoryFilter,
    selectedSourceFilter,
    searchQuery,
    sortBy,
  ]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-pulse">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-72 bg-slate-200 rounded-xl" />
            <div className="h-3.5 w-96 bg-slate-200/70 rounded-lg" />
          </div>
          <div className="h-10 w-80 bg-slate-200 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl border border-slate-100 h-64" />
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 h-64" />
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 h-72" />
      </div>
    );
  }

  return (
    <div id="printable-report" className="max-w-6xl mx-auto space-y-6 pb-12 font-sans">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-report, #printable-report * { visibility: visible !important; }
          #printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            padding: 16px !important;
            background: #ffffff !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Print-Only Formal Header */}
      <div className="hidden print:flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            BILAN FINANCIER MENSUEL — {salonName}
          </h1>
          <p className="text-xs text-slate-600">Période : {selectedMonth}</p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>Généré le {formatSafeDateFr(getTunisTodayStr())}</p>
          <p>Booki.tn</p>
        </div>
      </div>

      {/* En-tête & Actions */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Bilan &amp; Gestion Financière
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Suivi automatisé des charges, seuil de rentabilité, salaires et export comptable.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold shadow-2xs">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || getTunisMonthStr())}
              className="bg-transparent focus:outline-none cursor-pointer font-bold text-slate-800"
            />
          </div>

          <button
            type="button"
            onClick={handleCopyRecurringFromPrevMonth}
            disabled={copyingRecurring}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Importer loyer et factures du mois précédent"
          >
            <Copy size={14} className="text-indigo-600" />
            {copyingRecurring ? "Import..." : "Importer charges fixes"}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Download size={14} className="text-emerald-600" /> Export CSV
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Printer size={14} /> Imprimer
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Plus size={15} /> Ajouter dépense
          </button>
        </div>
      </div>

      {/* Alerte Salaires non encore versés ce mois */}
      {unpaidEmployees.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-amber-950">
                Salaires en attente ce mois ({unpaidEmployees.length} membre
                {unpaidEmployees.length > 1 ? "s" : ""} :{" "}
                {unpaidSalariesTotal.toFixed(2)} TND)
              </p>
              <p className="text-amber-800">
                En attente :{" "}
                {unpaidEmployees.map((e) => `${e.name} (${e.salary} TND)`).join(", ")}.
                Bénéfice prévisionnel une fois payés (avec RDV à venir) :{" "}
                <strong>{projectedProfitAfterPayroll.toFixed(2)} TND</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cartes KPI Financiers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Recettes Encaissées
          </span>
          <h2 className="text-2xl font-black text-slate-900">
            {monthlyRevenue.toFixed(2)} TND
          </h2>
          <div className="text-[11px] space-y-0.5">
            <p className="text-slate-500">
              Prestations : <strong>{bookingsRevenue.toFixed(0)}</strong> • Store :{" "}
              <strong>{storeRevenue.toFixed(0)}</strong> TND
            </p>
            {revDelta !== null && (
              <p
                className={`font-bold flex items-center gap-0.5 ${
                  revDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {revDelta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {revDelta >= 0 ? "+" : ""}
                {revDelta.toFixed(1)}% vs mois dernier
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Charges Totales
          </span>
          <h2 className="text-2xl font-black text-rose-600">
            -{totalExpenses.toFixed(2)} TND
          </h2>
          <div className="text-[11px] space-y-0.5">
            <p className="text-slate-400">{expenseRatio.toFixed(1)}% du CA absorbé</p>
            {expDelta !== null && (
              <p
                className={`font-bold flex items-center gap-0.5 ${
                  expDelta <= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {expDelta >= 0 ? "+" : ""}
                {expDelta.toFixed(1)}% vs mois dernier
              </p>
            )}
          </div>
        </div>

        <div
          className={`rounded-3xl p-6 shadow-2xs space-y-2 border ${
            netProfit >= 0
              ? "bg-slate-900 text-white border-slate-800"
              : "bg-rose-950 text-white border-rose-900"
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
            Bénéfice Net Réel
          </span>
          <h2 className="text-2xl font-black">{netProfit.toFixed(2)} TND</h2>
          <p className="text-[11px] text-slate-300">
            Marge nette : <strong>{profitMarginPct.toFixed(1)}%</strong>
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Clock size={12} /> RDV À Venir Ce Mois
          </span>
          <h2 className="text-2xl font-black text-indigo-600">
            +{upcomingBookingsRevenue.toFixed(2)} TND
          </h2>
          <p className="text-[11px] text-slate-500">
            Chiffre d&apos;affaires déjà réservé à encaisser
          </p>
        </div>
      </div>

      {/* Point Mort (Break-Even) + Répartition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Target size={16} className="text-emerald-600" /> Seuil de Rentabilité (Point Mort)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {breakEvenGap === 0
                ? "Félicitations ! Toutes vos charges du mois sont couvertes. Chaque nouvelle prestation ou vente est du bénéfice net."
                : `Il vous reste ${breakEvenGap.toFixed(
                    2
                  )} TND à encaisser pour couvrir 100% de vos charges du mois.`}
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-600">Couverture des charges</span>
              <span
                className={breakEvenGap === 0 ? "text-emerald-600" : "text-indigo-600"}
              >
                {breakEvenProgress.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  breakEvenGap === 0 ? "bg-emerald-500" : "bg-indigo-600"
                }`}
                style={{ width: `${breakEvenProgress}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 pt-1">
              {breakEvenGap === 0 && (
                <CheckCircle2 size={14} className="text-emerald-600" />
              )}
              <span>
                Santé :{" "}
                {expenseRatio < 60
                  ? "Excellente (<60% charges)"
                  : expenseRatio < 80
                  ? "Correcte"
                  : "Charges élevées (>80%)"}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <PieChart size={16} className="text-indigo-600" /> Répartition Analytique des Charges
            </h3>
            <span className="text-xs text-slate-400 font-medium">{selectedMonth}</span>
          </div>

          <div className="space-y-3">
            {categoryBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">{item.category}</span>
                  <span className="font-black text-slate-900">
                    {item.total.toFixed(2)} TND{" "}
                    <span className="text-slate-400 font-normal">
                      ({item.percentage.toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tableau des dépenses avec recherche, filtres source/catégorie, tri & sous-total */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-bold text-sm text-slate-900">
              Flux détaillé des charges ({filteredExpenses.length})
            </h3>
            <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[11px] font-black px-3 py-1 rounded-full">
              Total affiché : -{filteredTotal.toFixed(2)} TND
            </span>
          </div>

          <div className="no-print flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSortBy((s) => (s === "date" ? "amount" : "date"))}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer transition"
            >
              <ArrowUpDown size={13} />
              {sortBy === "date" ? "Tri : Date" : "Tri : Montant"}
            </button>

            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une dépense..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Filtres Source */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter("Tous")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedCategoryFilter === "Tous"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tous
            </button>
            {CATEGORIES.map((cat, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCategoryFilter === cat
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
            {[
              { id: "all", label: "Toutes sources" },
              { id: "manual", label: "Manuelles" },
              { id: "payroll", label: "Salaires" },
              { id: "inventory", label: "Inventaire" },
            ].map((src) => (
              <button
                key={src.id}
                type="button"
                onClick={() => setSelectedSourceFilter(src.id as any)}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  selectedSourceFilter === src.id
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Aucune dépense enregistrée pour ce filtre.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-2xl transition"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-xs text-slate-900">{exp.title}</h4>
                    <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      {exp.category}
                    </span>

                    {exp.source === "payroll" && (
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <UserCheck size={10} /> Salaire Automatique
                      </span>
                    )}
                    {exp.source === "inventory" && (
                      <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Package size={10} /> Inventaire Automatique
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Date : {formatSafeDateFr(exp.date)} {exp.notes && `| ${exp.notes}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-sm text-rose-600 mr-2">
                    -{exp.amount.toFixed(2)} TND
                  </span>
                  {exp.source === "manual" && (
                    <div className="no-print flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(exp)}
                        className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition cursor-pointer"
                        title="Modifier"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp)}
                        className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ajout / Modification Dépense Manuelle */}
      {isModalOpen && (
        <div className="no-print fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-base text-slate-900">
                {editingExpenseId
                  ? "Modifier la charge"
                  : "Ajouter une charge (ex: Loyer)"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {!editingExpenseId && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Raccourcis rapides
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {EXPENSE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setTitle(preset.title);
                        setCategory(preset.category);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[10px] font-bold transition cursor-pointer"
                    >
                      + {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Intitulé *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Loyer du local, Facture STEG..."
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Montant (TND) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="ex: 850.00"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value || getTunisTodayStr())}
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Notes / Référence (Optionnel)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ex: Facture N°12345"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
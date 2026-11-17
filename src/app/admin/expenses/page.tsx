"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  DollarSign, Plus, Trash2, Calendar, TrendingDown, 
  TrendingUp, FileSpreadsheet, ArrowUpRight, ArrowDownRight, X, Printer, Package, UserCheck, Receipt, PieChart, AlertCircle, Filter
} from "lucide-react";

interface UnifiedExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  source: 'manual' | 'inventory' | 'payroll';
  notes?: string;
}

const CATEGORIES = ["Loyer", "Achats Produits", "Salaires & Prime", "Factures (Eau/Elec/Net)", "Marketing & Pub", "Autre"];

export default function ExpensesPage() {
  const supabase = createClient();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [unifiedExpenses, setUnifiedExpenses] = useState<UnifiedExpense[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("Tous");
  const [loading, setLoading] = useState(true);

  // Form State pour dépenses manuelles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initData();
  }, [selectedMonth]);

  async function initData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!profile?.business_id) return setLoading(false);
    const bizId = profile.business_id;
    setBusinessId(bizId);

    const startOfMonth = `${selectedMonth}-01`;
    const lastDay = new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate();
    const endOfMonth = `${selectedMonth}-${lastDay}`;

    // 1. Dépenses manuelles
    const { data: manualData } = await supabase
      .from('expenses')
      .select('*')
      .eq('business_id', bizId)
      .gte('expense_date', startOfMonth)
      .lte('expense_date', endOfMonth);

    // 2. Employés payés
    const { data: paidEmployees } = await supabase
      .from('employees')
      .select('id, name, salary, last_paid_month, is_paid_this_month')
      .eq('business_id', bizId)
      .eq('last_paid_month', selectedMonth)
      .eq('is_paid_this_month', true);

    // 3. Ventes & Coûts d'inventaire
    const { data: salesData } = await supabase
      .from('store_sales')
      .select('created_at, items')
      .eq('business_id', bizId)
      .eq('status', 'paid')
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth);

    const { data: productsData } = await supabase
      .from('store_products')
      .select('id, cost_price, name')
      .eq('business_id', bizId);

    const productCostMap = new Map((productsData || []).map(p => [p.id, Number(p.cost_price) || 0]));

    const list: UnifiedExpense[] = [];

    // Restockages
    const { data: restocksData } = await supabase
      .from('inventory_restocks')
      .select('*')
      .eq('business_id', bizId)
      .gte('restock_date', startOfMonth)
      .lte('restock_date', endOfMonth);

    (restocksData || []).forEach(r => {
      list.push({
        id: r.id,
        title: `Restock : ${r.item_name} (${r.quantity_added} unités)`,
        amount: Number(r.total_cost),
        category: 'Achats Produits',
        date: r.restock_date,
        source: 'inventory',
        notes: `Coût unitaire : ${r.unit_cost} TND`
      });
    });

    // Dépenses manuelles
    (manualData || []).forEach(e => {
      list.push({
        id: e.id,
        title: e.title,
        amount: Number(e.amount),
        category: e.category,
        date: e.expense_date,
        source: 'manual',
        notes: e.notes
      });
    });

    // Salaires
    (paidEmployees || []).forEach((emp: any) => {
      list.push({
        id: emp.id,
        title: `Salaire versé : ${emp.name}`,
        amount: Number(emp.salary) || 0,
        category: 'Salaires & Prime',
        date: `${selectedMonth}-01`,
        source: 'payroll',
        notes: 'Statut : Payé (Équipe)'
      });
    });

    // Coût inventaire vendu
    let totalInventoryCost = 0;
    (salesData || []).forEach(sale => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const cost = productCostMap.get(item.product_id) || 0;
          totalInventoryCost += cost * (item.quantity || 1);
        });
      }
    });

    if (totalInventoryCost > 0) {
      list.push({
        id: 'auto-inventory-cost',
        title: "Coût de réapprovisionnement / Inventaire vendu",
        amount: totalInventoryCost,
        category: 'Achats Produits',
        date: `${selectedMonth}-28`,
        source: 'inventory',
        notes: 'Calculé automatiquement depuis les ventes validées'
      });
    }

    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 4. Recettes Totales
    const [bookingsRes, salesRes] = await Promise.all([
      supabase.from('bookings').select('total_price').eq('business_id', bizId).gte('booking_date', startOfMonth).lte('booking_date', endOfMonth).neq('status', 'canceled'),
      supabase.from('store_sales').select('total_amount').eq('business_id', bizId).eq('status', 'paid').gte('created_at', startOfMonth).lte('created_at', endOfMonth)
    ]);

    const totalBookings = (bookingsRes.data || []).reduce((acc, b) => acc + (Number(b.total_price) || 0), 0);
    const totalSales = (salesRes.data || []).reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);

    setUnifiedExpenses(list);
    setMonthlyRevenue(totalBookings + totalSales);
    setLoading(false);
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    setSubmitting(true);

    const { error } = await supabase.from('expenses').insert([{
      business_id: businessId,
      title,
      amount: parseFloat(amount),
      category,
      expense_date: expenseDate,
      notes
    }]);

    setSubmitting(false);
    if (error) {
      alert("Erreur : " + error.message);
    } else {
      setIsModalOpen(false);
      setTitle('');
      setAmount('');
      setNotes('');
      initData();
    }
  }

  async function handleDeleteExpense(exp: UnifiedExpense) {
    if (exp.source !== 'manual') {
      alert("Cette dépense est générée automatiquement par le système (Salaires / Inventaire).");
      return;
    }
    if (!confirm("Supprimer cette dépense ?")) return;
    await supabase.from('expenses').delete().eq('id', exp.id);
    initData();
  }

  const totalExpenses = unifiedExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netProfit = monthlyRevenue - totalExpenses;
  const expenseRatio = monthlyRevenue > 0 ? (totalExpenses / monthlyRevenue) * 100 : 0;

  // Calcul par catégorie pour le graphique analytique
  const categoryBreakdown = CATEGORIES.map(cat => {
    const totalCat = unifiedExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
    const percentage = totalExpenses > 0 ? (totalCat / totalExpenses) * 100 : 0;
    return { category: cat, total: totalCat, percentage };
  }).sort((a, b) => b.total - a.total);

  // Filtrage des dépenses pour le tableau
  const filteredExpenses = selectedCategoryFilter === "Tous" 
    ? unifiedExpenses 
    : unifiedExpenses.filter(e => e.category === selectedCategoryFilter);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400 font-medium">Calcul du bilan automatisé...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 font-sans">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Bilan & Gestion Financière</h1>
          <p className="text-xs text-slate-500 font-medium">Suivi automatisé des charges, analyse des marges et rentabilité du salon.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-bold shadow-2xs">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-bold text-slate-800"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Printer size={15} /> Imprimer Bilan
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Plus size={16} /> Dépense Manuelle
          </button>
        </div>
      </div>

      {/* Cartes KPI Financiers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Recettes Totales</span>
          <h2 className="text-2xl font-black text-slate-900">{monthlyRevenue.toFixed(2)} TND</h2>
          <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1"><ArrowUpRight size={14} /> Prestations + Boutique</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Charges Totales</span>
          <h2 className="text-2xl font-black text-rose-600">-{totalExpenses.toFixed(2)} TND</h2>
          <p className="text-[11px] text-slate-400">{expenseRatio.toFixed(1)}% du CA absorbé</p>
        </div>

        <div className={`rounded-3xl p-6 shadow-2xs space-y-2 border ${
          netProfit >= 0 ? 'bg-slate-900 text-white border-slate-800' : 'bg-rose-950 text-white border-rose-900'
        }`}>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">Bénéfice Net Réel</span>
          <h2 className="text-2xl font-black">{netProfit.toFixed(2)} TND</h2>
          <p className="text-[11px] text-slate-300">Marge nette globale</p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Santé Financière</span>
          <div className="flex items-center gap-2 pt-1">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
              expenseRatio < 60 ? 'bg-emerald-100 text-emerald-700' :
              expenseRatio < 80 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {expenseRatio < 60 ? 'Excellente' : expenseRatio < 80 ? 'Stable' : 'Attention requise'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Basé sur ratio de charges</p>
        </div>
      </div>

      {/* --- SECTION ANALYTIQUE : RÉPARTITION PAR CATÉGORIE --- */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <PieChart size={16} className="text-indigo-600" /> Répartition Analytique des Charges
          </h3>
          <span className="text-xs text-slate-400 font-medium">Mois de {selectedMonth}</span>
        </div>

        <div className="space-y-3">
          {categoryBreakdown.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">{item.category}</span>
                <span className="font-black text-slate-900">{item.total.toFixed(2)} TND <span className="text-slate-400 font-normal">({item.percentage.toFixed(1)}%)</span></span>
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

      {/* --- TABLEAU DES DÉPENSES AVEC FILTRES --- */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden p-6 space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-sm text-slate-900">Flux détaillé des charges ({filteredExpenses.length})</h3>

          {/* Filtres par catégorie */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => setSelectedCategoryFilter("Tous")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedCategoryFilter === "Tous" ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Tous
            </button>
            {CATEGORIES.map((cat, i) => (
              <button
                key={i}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedCategoryFilter === cat ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">Aucune dépense enregistrée pour ce filtre.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map((exp) => (
              <div key={exp.id} className="py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-2xl transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-xs text-slate-900">{exp.title}</h4>
                    <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      {exp.category}
                    </span>
                    
                    {exp.source === 'payroll' && (
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <UserCheck size={10} /> Salaire Automatique
                      </span>
                    )}
                    {exp.source === 'inventory' && (
                      <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Package size={10} /> Inventaire Automatique
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Date : {new Date(exp.date).toLocaleDateString('fr-FR')} {exp.notes && `| ${exp.notes}`}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-black text-sm text-rose-600">-{exp.amount.toFixed(2)} TND</span>
                  {exp.source === 'manual' && (
                    <button onClick={() => handleDeleteExpense(exp)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-xl transition cursor-pointer" title="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'ajout manuel */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-base text-slate-900">Ajouter une charge (ex: Loyer)</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"><X size={18} /></button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Intitulé</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Loyer du local, Facture STEG..." className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Montant (TND)</label>
                  <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="ex: 850.00" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Catégorie</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium cursor-pointer">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Date</label>
                <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Notes / Référence (Optionnel)</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ex: Facture N°12345" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer">Annuler</button>
                <button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">
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
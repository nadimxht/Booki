"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  ShoppingBag, Plus, Trash2, Edit, DollarSign, Package, 
  Receipt, Palette, Image as ImageIcon, X, Check, FileText, 
  CreditCard, Search, ExternalLink, Calendar, Sparkles, Ticket, CheckCircle2 
} from "lucide-react";

interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
}

interface SaleItem {
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Sale {
  id: string;
  created_at: string;
  invoice_number: string;
  pickup_code: string;
  client_name: string;
  client_phone: string;
  total_amount: number;
  payment_method: string;
  status: string; // 'pending' ou 'paid'
  items: SaleItem[];
}

interface StoreDesign {
  banner_url: string;
  welcome_title: string;
  welcome_subtitle: string;
  primary_color: string;
  layout_style: string;
}

const COVER_PRESETS = [
  { name: "Salon Minimaliste Chic", url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80" },
  { name: "Cosmétiques Botaniques", url: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1600&q=80" },
  { name: "Ambiance Coiffure Pro", url: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1600&q=80" },
];

export default function AdminStorePage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"products" | "sales" | "invoices" | "design">("sales");

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [design, setDesign] = useState<StoreDesign>({
    banner_url: "",
    welcome_title: "Bienvenue sur notre boutique",
    welcome_subtitle: "Découvrez nos produits professionnels",
    primary_color: "#4f46e5",
    layout_style: "grid"
  });
  const [loading, setLoading] = useState(true);

  // Modals & State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);

  // Product Form State
  const [pName, setPName] = useState("");
  const [pDescription, setPDescription] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pStock, setPStock] = useState("");
  const [pCategory, setPCategory] = useState("Soins Capillaires");
  const [pImageUrl, setPImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [prodRes, salesRes, designRes] = await Promise.all([
      supabase.from("store_products").select("*").order("name"),
      supabase.from("store_sales").select("*").order("created_at", { ascending: false }),
      supabase.from("store_settings").select("*").eq("id", 1).single()
    ]);

    if (prodRes.data) setProducts(prodRes.data);
    if (salesRes.data) setSales(salesRes.data);
    if (designRes.data) {
      setDesign({
        banner_url: designRes.data.banner_url || "",
        welcome_title: designRes.data.welcome_title || "Bienvenue sur notre boutique",
        welcome_subtitle: designRes.data.welcome_subtitle || "Découvrez nos produits professionnels",
        primary_color: designRes.data.primary_color || "#4f46e5",
        layout_style: designRes.data.layout_style || "grid"
      });
    }

    setLoading(false);
  }

  // --- ACTIONS DE VALIDATION DE COMMANDE (CLICK & COLLECT) ---
  async function handleMarkAsPaid(sale: Sale) {
    if (!confirm(`Confirmer l'encaissement de la commande ${sale.invoice_number} pour ${sale.client_name} ?`)) return;

    try {
      // 1. Mettre à jour le statut de la vente à "paid"
      const { error: saleError } = await supabase
        .from("store_sales")
        .update({ status: "paid" })
        .eq("id", sale.id);

      if (saleError) throw new Error(saleError.message);

      // 2. Déduire le stock des produits commandés
      if (sale.items && Array.isArray(sale.items)) {
        for (const item of sale.items) {
          if (item.product_id) {
            // Trouver le produit actuel pour déduire correctement
            const prod = products.find(p => p.id === item.product_id);
            if (prod) {
              const newStock = Math.max(0, prod.stock - item.quantity);
              await supabase
                .from("store_products")
                .update({ stock: newStock })
                .eq("id", item.product_id);
            }
          }
        }
      }

      alert("Commande encaissée et stock déduit avec succès !");
      fetchData();
    } catch (err: any) {
      alert("Erreur lors de la validation : " + err.message);
    }
  }

  // --- PRODUCT ACTIONS ---
  const openProductModalForCreate = () => {
    setEditingProductId(null);
    setPName("");
    setPDescription("");
    setPPrice("");
    setPStock("");
    setPCategory("Soins Capillaires");
    setPImageUrl("");
    setIsProductModalOpen(true);
  };

  const openProductModalForEdit = (prod: StoreProduct) => {
    setEditingProductId(prod.id);
    setPName(prod.name);
    setPDescription(prod.description || "");
    setPPrice(prod.price.toString());
    setPStock(prod.stock.toString());
    setPCategory(prod.category || "Général");
    setPImageUrl(prod.image_url || "");
    setIsProductModalOpen(true);
  };

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: pName,
      description: pDescription,
      price: parseFloat(pPrice) || 0,
      stock: parseInt(pStock) || 0,
      category: pCategory,
      image_url: pImageUrl,
    };

    let error;
    if (editingProductId) {
      const res = await supabase.from("store_products").update(payload).eq("id", editingProductId);
      error = res.error;
    } else {
      const res = await supabase.from("store_products").insert([payload]);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      alert("Erreur lors de l'enregistrement : " + error.message);
    } else {
      setIsProductModalOpen(false);
      fetchData();
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;
    await supabase.from("store_products").delete().eq("id", id);
    fetchData();
  }

  // --- DESIGN ACTIONS ---
  async function handleSaveDesign(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("store_settings")
      .upsert({ id: 1, ...design });

    setSaving(false);
    if (error) {
      alert("Erreur de sauvegarde du design : " + error.message);
    } else {
      alert("Design de la boutique mis à jour !");
    }
  }

  // Ventes filtrées par recherche (Nom ou Code de retrait)
  const filteredSales = sales.filter(s => {
    const query = searchQuery.toLowerCase();
    const matchName = s.client_name?.toLowerCase().includes(query) || false;
    const matchCode = s.pickup_code?.toLowerCase().includes(query) || false;
    const matchInvoice = s.invoice_number?.toLowerCase().includes(query) || false;
    return matchName || matchCode || matchInvoice;
  });

  // Calcul du Chiffre d'Affaires uniquement pour les ventes payées
  const totalSalesRevenue = sales
    .filter(s => s.status === "paid")
    .reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px] text-xs text-slate-400 font-medium">Chargement du Store...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* En-tête & Onglets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Boutique & Commandes Click & Collect</h1>
          <p className="text-xs text-slate-500 font-medium">
            Gérez vos produits, validez les paiements en salon et suivez vos ventes en temps réel.
          </p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-2xl w-fit flex-wrap">
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "sales" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Receipt size={14} /> Commandes ({sales.filter(s => s.status === 'pending').length} en attente)
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "products" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Package size={14} /> Produits ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "invoices" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText size={14} /> Factures
          </button>
          <button
            onClick={() => setActiveTab("design")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "design" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Palette size={14} /> Design Store
          </button>
        </div>
      </div>

      {/* --- ONGLET COMMANDES & VENTES (CLICK & COLLECT) --- */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-indigo-100 to-slate-100 rounded-3xl p-6 shadow-xs">
              <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider">Chiffre d'Affaires Encaissé</span>
              <h2 className="text-3xl font-black">{totalSalesRevenue.toFixed(2)} TND</h2>
              <p className="text-xs text-slate-600 mt-0.5">Ventes validées et payées au salon</p>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-3xl p-6 shadow-xs border border-amber-200/50">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">Commandes en attente de retrait</span>
              <h2 className="text-3xl font-black text-amber-950">{sales.filter(s => s.status === 'pending').length}</h2>
              <p className="text-xs text-amber-800 mt-0.5">Clients devant payer en personne</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="font-bold text-sm text-slate-900">Rechercher une commande ou un code client</h3>
              <div className="relative w-full sm:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Code (ex: BK-8492) ou Nom..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            {filteredSales.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">Aucune commande trouvée.</div>
            ) : (
              <div className="divide-y divide-slate-100">
               {filteredSales.map((sale) => {
  // Calculer si la commande a plus de 7 jours et est toujours en attente
  const createdAt = new Date(sale.created_at);
  const now = new Date();
  const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
  const isOverdue = sale.status === 'pending' && diffDays > 7;

  return (
    <div key={sale.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 font-mono">
            <Ticket size={14} /> {sale.pickup_code || "N/A"}
          </span>
          <h4 className="font-bold text-xs text-slate-900">{sale.client_name}</h4>
          
          {/* Badge de statut ou d'expiration */}
          {isOverdue ? (
            <span className="bg-rose-100 text-rose-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
              ⚠️ Non récupéré ({'>'} 7 jours)
            </span>
          ) : (
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
              sale.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
              sale.status === 'canceled' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
            }`}>
              {sale.status === 'paid' ? 'Payé & Terminé' : sale.status === 'canceled' ? 'Annulé' : 'En attente'}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500">
          📞 {sale.client_phone} • Créé le : {new Date(sale.created_at).toLocaleDateString("fr-FR")} ({Math.floor(diffDays)} jours)
        </p>
      </div>

      <div className="flex items-center gap-3 justify-end">
        <span className="font-black text-sm text-slate-900">{sale.total_amount} TND</span>

        {sale.status === 'pending' && (
          <>
            <button
              onClick={() => handleMarkAsPaid(sale)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <CheckCircle2 size={15} /> Encaisser
            </button>
            <button
              onClick={async () => {
                if (confirm("Voulez-vous annuler cette commande expirée ou non récupérée ?")) {
                  await supabase.from("store_sales").update({ status: "canceled" }).eq("id", sale.id);
                  fetchData();
                }
              }}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2.5 rounded-xl text-xs font-bold transition border border-rose-200"
            >
              Annuler
            </button>
          </>
        )}
      </div>
    </div>
  );
})}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ONGLET PRODUITS --- */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-sm text-slate-900">Catalogue Produits</h2>
            <button
              onClick={openProductModalForCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
            >
              <Plus size={16} /> Ajouter un produit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod) => (
              <div key={prod.id} className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden flex flex-col justify-between group">
                <div>
                  {prod.image_url ? (
                    <div className="h-44 w-full overflow-hidden bg-slate-100 relative">
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    </div>
                  ) : (
                    <div className="h-32 bg-slate-100 flex items-center justify-center text-slate-400">
                      <ShoppingBag size={32} />
                    </div>
                  )}

                  <div className="p-5 space-y-2">
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {prod.category}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">{prod.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{prod.description || "Pas de description."}</p>
                  </div>
                </div>

                <div className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Stock : {prod.stock}</span>
                    <span className="font-extrabold text-indigo-600 text-sm">{prod.price} TND</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={() => openProductModalForEdit(prod)} className="p-2 hover:bg-white rounded-xl text-slate-500 transition shadow-2xs" title="Modifier">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDeleteProduct(prod.id)} className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition" title="Supprimer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ONGLET FACTURES --- */}
      {activeTab === "invoices" && (
        <div className="space-y-6">
          <h2 className="font-bold text-sm text-slate-900">Générateur & Visionneuse de Factures</h2>

          {selectedSaleForInvoice ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md max-w-2xl mx-auto space-y-6 font-sans">
              <div className="flex justify-between items-start border-b border-slate-100 pb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">FACTURE / REÇU</h2>
                  <p className="text-xs text-indigo-600 font-bold">{selectedSaleForInvoice.invoice_number}</p>
                  {selectedSaleForInvoice.pickup_code && (
                    <span className="inline-block mt-1 bg-slate-100 text-slate-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                      Code de Retrait : {selectedSaleForInvoice.pickup_code}
                    </span>
                  )}
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="font-bold text-slate-800">Booki Store</p>
                  <p>Date : {new Date(selectedSaleForInvoice.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Facturé à :</span>
                <p className="font-bold text-slate-900">{selectedSaleForInvoice.client_name}</p>
                {selectedSaleForInvoice.client_phone && <p className="text-slate-500">{selectedSaleForInvoice.client_phone}</p>}
              </div>

              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold">
                  <tr>
                    <th className="p-3 rounded-l-xl">Article</th>
                    <th className="p-3 text-center">Qté</th>
                    <th className="p-3 text-right">Prix Unitaire</th>
                    <th className="p-3 text-right rounded-r-xl">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSaleForInvoice.items && selectedSaleForInvoice.items.length > 0 ? (
                    selectedSaleForInvoice.items.map((item, i) => (
                      <tr key={i}>
                        <td className="p-3 font-medium text-slate-900">{item.product_name}</td>
                        <td className="p-3 text-center font-bold">{item.quantity}</td>
                        <td className="p-3 text-right">{item.unit_price} TND</td>
                        <td className="p-3 text-right font-bold">{(item.quantity * item.unit_price).toFixed(2)} TND</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-400">Article général</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Mode de paiement : <strong>{selectedSaleForInvoice.payment_method}</strong></span>
                  <span className="text-xs text-slate-500 font-medium">Statut : <strong className={selectedSaleForInvoice.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>{selectedSaleForInvoice.status === 'paid' ? 'Payé' : 'En attente'}</strong></span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total</span>
                  <span className="text-xl font-black text-indigo-600">{selectedSaleForInvoice.total_amount} TND</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Imprimer / Télécharger PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center text-slate-400 text-xs">
              Sélectionnez une commande dans l'onglet <strong>Commandes</strong> pour générer sa facture détaillée.
            </div>
          )}
        </div>
      )}

      {/* --- ONGLET DESIGN STORE --- */}
      {activeTab === "design" && (
        <form onSubmit={handleSaveDesign} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs max-w-2xl mx-auto space-y-6">
          <h2 className="font-bold text-base text-slate-900 border-b border-slate-100 pb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-600" /> Personnalisation & Couvertures Professionnelles
          </h2>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Titre de bienvenue</label>
            <input
              type="text"
              value={design.welcome_title}
              onChange={(e) => setDesign({ ...design, welcome_title: e.target.value })}
              className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Sous-titre / Message d'accroche</label>
            <input
              type="text"
              value={design.welcome_subtitle}
              onChange={(e) => setDesign({ ...design, welcome_subtitle: e.target.value })}
              className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-600">Suggestions de bannières professionnelles (Cliquez pour appliquer)</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {COVER_PRESETS.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => setDesign({ ...design, banner_url: preset.url })}
                  className="cursor-pointer group relative rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-indigo-600 transition"
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-20 object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute inset-0 bg-slate-900/40 flex items-end p-2">
                    <span className="text-[10px] font-bold text-white">{preset.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">URL de la Bannière personnalisée</label>
            <input
              type="url"
              value={design.banner_url}
              onChange={(e) => setDesign({ ...design, banner_url: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Couleur principale</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={design.primary_color}
                  onChange={(e) => setDesign({ ...design, primary_color: e.target.value })}
                  className="w-10 h-10 rounded-xl border-0 cursor-pointer p-0"
                />
                <span className="text-xs font-bold text-slate-700">{design.primary_color}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Disposition des produits</label>
              <select
                value={design.layout_style}
                onChange={(e) => setDesign({ ...design, layout_style: e.target.value })}
                className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
              >
                <option value="grid">Grille de cartes (Recommandé)</option>
                <option value="list">Liste horizontale</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition"
            >
              {saving ? "Sauvegarde..." : "Enregistrer le Design"}
            </button>
          </div>
        </form>
      )}

      {/* --- MODAL PRODUIT --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-base text-slate-900">{editingProductId ? "Modifier le produit" : "Ajouter un produit au Store"}</h2>
              <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nom du produit</label>
                <input type="text" value={pName} onChange={(e) => setPName(e.target.value)} placeholder="ex: Shampoing Hydratant 500ml" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Prix de vente (TND)</label>
                  <input type="number" step="0.01" value={pPrice} onChange={(e) => setPPrice(e.target.value)} placeholder="ex: 35.00" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Stock disponible</label>
                  <input type="number" value={pStock} onChange={(e) => setPStock(e.target.value)} placeholder="ex: 15" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" required />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Catégorie</label>
                <input type="text" value={pCategory} onChange={(e) => setPCategory(e.target.value)} placeholder="ex: Soins, Huiles, Matériel" className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">URL de l'image du produit</label>
                <input type="url" value={pImageUrl} onChange={(e) => setPImageUrl(e.target.value)} placeholder="https://images.unsplash.com/..." className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                <textarea rows={3} value={pDescription} onChange={(e) => setPDescription(e.target.value)} placeholder="Avantages du produit..." className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium" />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold">Annuler</button>
                <button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm">{saving ? "Enregistrement..." : "Enregistrer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
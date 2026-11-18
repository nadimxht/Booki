"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeHttpUrl } from "@/lib/safe-url";
import { toast } from "sonner";
import {
  ShoppingBag,
  Plus,
  Trash2,
  Edit,
  Package,
  Receipt,
  X,
  FileText,
  Search,
  Ticket,
  CheckCircle2,
  Printer,
  AlertTriangle,
} from "lucide-react";

interface StoreProduct {
  id: string;
  business_id: string;
  name: string;
  description: string;
  price: number;
  cost_price?: number;
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
  business_id: string;
  created_at: string;
  invoice_number: string;
  pickup_code: string;
  client_name: string;
  client_phone: string;
  total_amount: number;
  payment_method: string;
  status: string;
  items: SaleItem[];
}

export default function AdminStorePage() {
  const supabase = createClient();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sales" | "products">("sales");

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] =
    useState<Sale | null>(null);

  const [pName, setPName] = useState("");
  const [pDescription, setPDescription] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pCostPrice, setPCostPrice] = useState("");
  const [pStock, setPStock] = useState("");
  const [pCategory, setPCategory] = useState("Soins Capillaires");
  const [pImageUrl, setPImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    initBusinessAndData();
  }, []);

  async function initBusinessAndData() {
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
    setBusinessId(bizId);
    fetchData(bizId);
  }

  async function fetchData(bizId: string) {
    const [prodRes, salesRes] = await Promise.all([
      supabase
        .from("store_products")
        .select("*")
        .eq("business_id", bizId)
        .order("name"),
      supabase
        .from("store_sales")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false }),
    ]);

    if (prodRes.data) setProducts(prodRes.data);
    if (salesRes.data) setSales(salesRes.data);
    setLoading(false);
  }

  async function handleMarkAsPaid(sale: Sale) {
    if (!businessId) return;

    // Check stock availability before confirming
    if (Array.isArray(sale.items)) {
      for (const item of sale.items) {
        if (!item.product_id) continue;
        const prod = products.find((p) => p.id === item.product_id);
        if (prod && prod.stock < item.quantity) {
          toast.error(
            `Stock insuffisant pour "${prod.name}" (Stock: ${prod.stock}, Demandé: ${item.quantity}).`
          );
          return;
        }
      }
    }

    if (
      !confirm(
        `Confirmer l'encaissement de la commande ${sale.invoice_number} pour ${sale.client_name} ?`
      )
    ) {
      return;
    }

    try {
      const { error: saleError } = await supabase
        .from("store_sales")
        .update({ status: "paid" })
        .eq("id", sale.id)
        .eq("business_id", businessId);

      if (saleError) throw new Error(saleError.message);

      toast.success("Commande encaissée et stock mis à jour !");
      fetchData(businessId);
    } catch (err: any) {
      toast.error("Erreur lors de la validation : " + err.message);
    }
  }

  async function handleCancelSale(saleId: string) {
    if (!businessId) return;
    if (
      !confirm(
        "Voulez-vous annuler cette commande expirée ou non récupérée ?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("store_sales")
      .update({ status: "canceled" })
      .eq("id", saleId)
      .eq("business_id", businessId);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Commande annulée.");
      fetchData(businessId);
    }
  }

  const openProductModalForCreate = () => {
    setEditingProductId(null);
    setPName("");
    setPDescription("");
    setPPrice("");
    setPCostPrice("");
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
    setPCostPrice(prod.cost_price ? prod.cost_price.toString() : "");
    setPStock(prod.stock.toString());
    setPCategory(prod.category || "Général");
    setPImageUrl(prod.image_url || "");
    setIsProductModalOpen(true);
  };

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;

    const trimmedImg = pImageUrl.trim();
    if (trimmedImg && !safeHttpUrl(trimmedImg)) {
      toast.error("L'URL de l'image doit commencer par https:// ou http://");
      return;
    }

    setSaving(true);

    const payload = {
      business_id: businessId,
      name: pName.trim(),
      description: pDescription.trim(),
      price: Math.max(0, parseFloat(pPrice) || 0),
      cost_price: Math.max(0, parseFloat(pCostPrice) || 0),
      stock: Math.max(0, parseInt(pStock, 10) || 0),
      category: pCategory.trim() || "Général",
      image_url: trimmedImg || null,
    };

    let error;
    if (editingProductId) {
      const res = await supabase
        .from("store_products")
        .update(payload)
        .eq("id", editingProductId)
        .eq("business_id", businessId);
      error = res.error;
    } else {
      const res = await supabase.from("store_products").insert([payload]);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      toast.error("Erreur lors de l'enregistrement : " + error.message);
    } else {
      toast.success(
        editingProductId ? "Produit modifié !" : "Produit ajouté au store !"
      );
      setIsProductModalOpen(false);
      fetchData(businessId);
    }
  }

  async function handleDeleteProduct(id: string) {
    if (!businessId) return;
    if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;

    const { error } = await supabase
      .from("store_products")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Produit supprimé.");
      fetchData(businessId);
    }
  }

  const filteredSales = sales.filter((s) => {
    const query = searchQuery.toLowerCase();
    const matchName = s.client_name?.toLowerCase().includes(query) || false;
    const matchCode = s.pickup_code?.toLowerCase().includes(query) || false;
    const matchInvoice =
      s.invoice_number?.toLowerCase().includes(query) || false;
    return matchName || matchCode || matchInvoice;
  });

  const totalSalesRevenue = sales
    .filter((s) => s.status === "paid")
    .reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);

  const lowStockProducts = products.filter((p) => p.stock <= 3);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px] text-xs text-slate-400 font-medium">
        Chargement du Store...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-4 rounded-3xl flex items-center justify-between shadow-xs gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-xs">
                Alerte de stock faible ({lowStockProducts.length} produit
                {lowStockProducts.length > 1 ? "s" : ""})
              </h4>
              <p className="text-[11px] text-amber-700">
                {lowStockProducts
                  .map((p) => `${p.name} (${p.stock} restants)`)
                  .join(", ")}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("products")}
            className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs whitespace-nowrap"
          >
            Gérer les stocks
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Boutique & Commandes Click & Collect
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Gérez vos produits, validez les paiements sur place et suivez vos ventes.
          </p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "sales"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Receipt size={14} /> Commandes (
            {sales.filter((s) => s.status === "pending").length} en attente)
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "products"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Package size={14} /> Produits ({products.length})
            {lowStockProducts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* ONGLET COMMANDES */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-indigo-100 to-slate-100 rounded-3xl p-6 shadow-xs">
              <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider">
                Chiffre d&apos;Affaires Encaissé
              </span>
              <h2 className="text-3xl font-black">
                {totalSalesRevenue.toFixed(2)} TND
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Ventes validées et payées sur place
              </p>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-3xl p-6 shadow-xs border border-amber-200/50">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                Commandes en attente de retrait
              </span>
              <h2 className="text-3xl font-black text-amber-950">
                {sales.filter((s) => s.status === "pending").length}
              </h2>
              <p className="text-xs text-amber-800 mt-0.5">
                Clients devant payer en personne
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="font-bold text-sm text-slate-900">
                Rechercher une commande ou un code client
              </h3>
              <div className="relative w-full sm:w-80">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Code (ex: BK-8492A1F0) ou Nom..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            {filteredSales.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Aucune commande trouvée.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredSales.map((sale) => {
                  const createdAt = new Date(sale.created_at);
                  const diffDays =
                    (Date.now() - createdAt.getTime()) / (1000 * 3600 * 24);
                  const isOverdue = sale.status === "pending" && diffDays > 7;

                  return (
                    <div
                      key={sale.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 font-mono">
                            <Ticket size={14} /> {sale.pickup_code || "N/A"}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900">
                            {sale.client_name}
                          </h4>

                          {isOverdue ? (
                            <span className="bg-rose-100 text-rose-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                              ⚠️ Non récupéré ({">"} 7 jours)
                            </span>
                          ) : (
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                sale.status === "paid"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : sale.status === "canceled"
                                  ? "bg-slate-100 text-slate-500"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {sale.status === "paid"
                                ? "Payé & Terminé"
                                : sale.status === "canceled"
                                ? "Annulé"
                                : "En attente"}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          📞 {sale.client_phone} | Créé le :{" "}
                          {createdAt.toLocaleDateString("fr-FR")} (
                          {Math.floor(diffDays)} jours)
                        </p>
                      </div>

                      <div className="flex items-center gap-3 justify-end flex-wrap">
                        <span className="font-black text-sm text-slate-900">
                          {Number(sale.total_amount).toFixed(2)} TND
                        </span>

                        <button
                          onClick={() => setSelectedSaleForInvoice(sale)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <FileText size={14} /> Facture
                        </button>

                        {sale.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleMarkAsPaid(sale)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckCircle2 size={15} /> Encaisser
                            </button>
                            <button
                              onClick={() => handleCancelSale(sale.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2.5 rounded-xl text-xs font-bold transition border border-rose-200 cursor-pointer"
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

      {/* ONGLET PRODUITS */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-sm text-slate-900">
              Catalogue Produits & Stocks
            </h2>
            <button
              onClick={openProductModalForCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Plus size={16} /> Ajouter un produit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod) => {
              const isLowStock = prod.stock <= 3;
              const safeImg = safeHttpUrl(prod.image_url);
              const unitMargin =
                Number(prod.price) - (Number(prod.cost_price) || 0);

              return (
                <div
                  key={prod.id}
                  className={`bg-white rounded-3xl border shadow-2xs overflow-hidden flex flex-col justify-between group relative ${
                    isLowStock
                      ? "border-amber-300 ring-1 ring-amber-300/40"
                      : "border-slate-100"
                  }`}
                >
                  {isLowStock && (
                    <span className="absolute top-3 left-3 z-10 bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                      <AlertTriangle size={11} /> Stock Faible ({prod.stock})
                    </span>
                  )}

                  <div>
                    {safeImg ? (
                      <div className="h-44 w-full overflow-hidden bg-slate-100 relative">
                        <img
                          src={safeImg}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
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
                      <h3 className="font-bold text-sm text-slate-900">
                        {prod.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {prod.description || "Pas de description."}
                      </p>
                      {Number(prod.cost_price) > 0 && (
                        <p className="text-[10px] text-emerald-700 font-bold">
                          Coût : {Number(prod.cost_price).toFixed(2)} TND • Marge : +
                          {unitMargin.toFixed(2)} TND/u
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex flex-col">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          isLowStock
                            ? "text-rose-600 font-black"
                            : "text-slate-400"
                        }`}
                      >
                        Stock : {prod.stock} unités
                      </span>
                      <span className="font-extrabold text-indigo-600 text-sm">
                        {prod.price} TND
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openProductModalForEdit(prod)}
                        className="p-2 hover:bg-white rounded-xl text-slate-500 transition shadow-2xs cursor-pointer"
                        title="Modifier"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-2 hover:bg-rose-50 rounded-xl text-rose-500 transition cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODALE FACTURE */}
      {selectedSaleForInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-xs text-slate-700 flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" /> Aperçu de la
                Facture
              </span>
              <button
                onClick={() => setSelectedSaleForInvoice(null)}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 bg-white font-sans">
              <div className="flex justify-between items-start border-b border-slate-100 pb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    FACTURE / REÇU
                  </h2>
                  <p className="text-xs text-indigo-600 font-bold">
                    {selectedSaleForInvoice.invoice_number}
                  </p>
                  {selectedSaleForInvoice.pickup_code && (
                    <span className="inline-block mt-1.5 bg-slate-100 text-slate-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md">
                      Code de Retrait : {selectedSaleForInvoice.pickup_code}
                    </span>
                  )}
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="font-bold text-slate-800">Booki Store</p>
                  <p>
                    Date :{" "}
                    {new Date(
                      selectedSaleForInvoice.created_at
                    ).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Facturé à :
                </span>
                <p className="font-bold text-slate-900">
                  {selectedSaleForInvoice.client_name}
                </p>
                {selectedSaleForInvoice.client_phone && (
                  <p className="text-slate-500">
                    Tél : {selectedSaleForInvoice.client_phone}
                  </p>
                )}
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
                  {selectedSaleForInvoice.items &&
                  selectedSaleForInvoice.items.length > 0 ? (
                    selectedSaleForInvoice.items.map((item, i) => (
                      <tr key={i}>
                        <td className="p-3 font-medium text-slate-900">
                          {item.product_name}
                        </td>
                        <td className="p-3 text-center font-bold">
                          {item.quantity}
                        </td>
                        <td className="p-3 text-right">
                          {item.unit_price} TND
                        </td>
                        <td className="p-3 text-right font-bold">
                          {(item.quantity * item.unit_price).toFixed(2)} TND
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-400">
                        Article général
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">
                    Mode de paiement :{" "}
                    <strong>{selectedSaleForInvoice.payment_method}</strong>
                  </span>
                  <span className="text-slate-500 font-medium">
                    Statut :{" "}
                    <strong
                      className={
                        selectedSaleForInvoice.status === "paid"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }
                    >
                      {selectedSaleForInvoice.status === "paid"
                        ? "Payé"
                        : "En attente"}
                    </strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Total
                  </span>
                  <span className="text-xl font-black text-indigo-600">
                    {Number(selectedSaleForInvoice.total_amount).toFixed(2)} TND
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedSaleForInvoice(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Printer size={15} /> Imprimer / Télécharger PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRODUIT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-base text-slate-900">
                {editingProductId
                  ? "Modifier le produit"
                  : "Ajouter un produit au Store"}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nom du produit
                </label>
                <input
                  type="text"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="ex: Shampoing Hydratant 500ml"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Prix vente (TND)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    placeholder="35.00"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Coût achat
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pCostPrice}
                    onChange={(e) => setPCostPrice(e.target.value)}
                    placeholder="18.00"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value)}
                    placeholder="15"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Catégorie
                </label>
                <input
                  type="text"
                  value={pCategory}
                  onChange={(e) => setPCategory(e.target.value)}
                  placeholder="ex: Soins Capillaires / Aftercare"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  URL de l&apos;image (Optionnel)
                </label>
                <input
                  type="url"
                  value={pImageUrl}
                  onChange={(e) => setPImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Description
                </label>
                <textarea
                  value={pDescription}
                  onChange={(e) => setPDescription(e.target.value)}
                  placeholder="Description détaillée..."
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium h-20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
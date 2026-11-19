"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeHttpUrl } from "@/lib/safe-url";
import { toast } from "sonner";
import {
  ShoppingBag,
  Plus,
  Minus,
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
  RefreshCw,
  MessageSquare,
  Link2,
  Copy,
  ExternalLink,
  CreditCard,
  Banknote,
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

interface SalonInfo {
  name: string;
  slug: string | null;
  location: string | null;
  whatsapp_number: string | null;
}

const PRODUCT_CATEGORY_PRESETS = [
  "Soins Capillaires",
  "Barbe",
  "Soins Visage",
  "Aftercare",
  "Styling & Cire",
  "Accessoires",
];

function formatRelativeDays(dateInput: string): { text: string; diffDays: number } {
  const created = new Date(dateInput);
  const diffDays = Math.max(0, Math.floor((Date.now() - created.getTime()) / (1000 * 3600 * 24)));
  if (diffDays === 0) return { text: "Aujourd'hui", diffDays };
  if (diffDays === 1) return { text: "Hier", diffDays };
  return { text: `Il y a ${diffDays} jours`, diffDays };
}

function makeShortCode(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${out}`;
}

export default function AdminStorePage() {
  const supabase = createClient();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [salonInfo, setSalonInfo] = useState<SalonInfo>({
    name: "Booki Store",
    slug: null,
    location: null,
    whatsapp_number: null,
  });

  const [activeTab, setActiveTab] = useState<"sales" | "products">("products");
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    "all" | "pending" | "paid" | "canceled"
  >("all");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProdCategory, setSelectedProdCategory] = useState("Tous");
  const [onlyLowStockProducts, setOnlyLowStockProducts] = useState(false);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState<Sale | null>(null);
  const [adjustingStockId, setAdjustingStockId] = useState<string | null>(null);

  // POS Modal
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [posSearch, setPosSearch] = useState("");
  const [posCart, setPosCart] = useState<{ product: StoreProduct; quantity: number }[]>([]);
  const [posClientName, setPosClientName] = useState("");
  const [posClientPhone, setPosClientPhone] = useState("");
  const [posPaymentMethod, setPosPaymentMethod] = useState<"Espèces" | "Carte">("Espèces");
  const [posSubmitting, setPosSubmitting] = useState(false);

  // Product Form
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
      .select("business_id, businesses(name)")
      .eq("id", user.id)
      .single();

    if (!profile?.business_id) {
      setLoading(false);
      return;
    }

    const bizId = profile.business_id;
    setBusinessId(bizId);

    const { data: settingsData } = await supabase
      .from("business_settings")
      .select("name, slug, location, whatsapp_number")
      .eq("business_id", bizId)
      .maybeSingle();

    setSalonInfo({
      name:
        settingsData?.name ||
        (profile.businesses && (profile.businesses as any).name) ||
        "Booki Store",
      slug: settingsData?.slug || null,
      location: settingsData?.location || null,
      whatsapp_number: settingsData?.whatsapp_number || null,
    });

    await fetchData(bizId, false);
  }

  async function fetchData(bizId: string, isManualRefresh = false) {
    if (isManualRefresh) setRefreshing(true);

    const [prodRes, salesRes] = await Promise.all([
      supabase.from("store_products").select("*").eq("business_id", bizId).order("name"),
      supabase
        .from("store_sales")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false }),
    ]);

    if (prodRes.data) setProducts(prodRes.data);
    if (salesRes.data) setSales(salesRes.data);

    setLoading(false);
    setRefreshing(false);
    if (isManualRefresh) {
      toast.success("Boutique actualisée.");
    }
  }

  async function handleMarkAsPaid(sale: Sale) {
    if (!businessId) return;

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

    const { error: saleError } = await supabase
      .from("store_sales")
      .update({ status: "paid" })
      .eq("id", sale.id)
      .eq("business_id", businessId);

    if (saleError) {
      toast.error("Erreur lors de la validation : " + saleError.message);
      return;
    }

    toast.success("Commande encaissée et stock mis à jour !");
    fetchData(businessId, false);
  }

  async function handleCancelSale(saleId: string) {
    if (!businessId) return;
    if (!confirm("Voulez-vous annuler cette commande ?")) return;

    const { error } = await supabase
      .from("store_sales")
      .update({ status: "canceled" })
      .eq("id", saleId)
      .eq("business_id", businessId);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Commande annulée.");
      fetchData(businessId, false);
    }
  }

  // POS Sale Modal Handlers
  function openPosModal() {
    setPosSearch("");
    setPosCart([]);
    setPosClientName("");
    setPosClientPhone("");
    setPosPaymentMethod("Espèces");
    setIsPosModalOpen(true);
  }

  function addToPosCart(product: StoreProduct) {
    if (product.stock <= 0) return;
    setPosCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Stock max atteint (${product.stock}) pour ${product.name}.`);
          return prev;
        }
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updatePosCartQty(productId: string, delta: number) {
    setPosCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.product.stock) return item;
          return { ...item, quantity: nextQty };
        })
        .filter(Boolean) as { product: StoreProduct; quantity: number }[]
    );
  }

  const posTotal = useMemo(
    () => posCart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
    [posCart]
  );

  async function handleSubmitPosSale(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId || posCart.length === 0) return;
    setPosSubmitting(true);

    const invoiceNumber = makeShortCode("FAC");
    const pickupCode = makeShortCode("POS");
    const itemsPayload: SaleItem[] = posCart.map((c) => ({
      product_id: c.product.id,
      product_name: c.product.name,
      quantity: c.quantity,
      unit_price: Number(c.product.price),
    }));

    try {
      // Insert as pending first then update to paid so UPDATE triggers deduct stock cleanly once
      const { data: inserted, error: insertErr } = await supabase
        .from("store_sales")
        .insert([
          {
            business_id: businessId,
            invoice_number: invoiceNumber,
            pickup_code: pickupCode,
            client_name: posClientName.trim() || "Client Comptoir",
            client_phone: posClientPhone.trim() || "Sur place",
            total_amount: Number(posTotal.toFixed(2)),
            payment_method: posPaymentMethod,
            status: "pending",
            items: itemsPayload,
          },
        ])
        .select("*")
        .single();

      if (insertErr || !inserted) throw new Error(insertErr?.message || "Insertion échouée");

      const { data: paidRow, error: updateErr } = await supabase
        .from("store_sales")
        .update({ status: "paid" })
        .eq("id", inserted.id)
        .eq("business_id", businessId)
        .select("*")
        .single();

      if (updateErr) throw new Error(updateErr.message);

      toast.success("Vente comptoir enregistrée !");
      setIsPosModalOpen(false);
      await fetchData(businessId, false);
      setSelectedSaleForInvoice((paidRow || { ...inserted, status: "paid" }) as Sale);
    } catch (err: any) {
      toast.error("Erreur vente comptoir : " + err.message);
    } finally {
      setPosSubmitting(false);
    }
  }

  // Quick Stock Adjuster (+/- 1)
  async function handleQuickStockAdjust(prod: StoreProduct, delta: number) {
    if (!businessId || adjustingStockId) return;
    const nextStock = Math.max(0, prod.stock + delta);
    if (nextStock === prod.stock) return;

    setAdjustingStockId(prod.id);
    const { error } = await supabase
      .from("store_products")
      .update({ stock: nextStock })
      .eq("id", prod.id)
      .eq("business_id", businessId);

    setAdjustingStockId(null);
    if (error) {
      toast.error("Erreur mise à jour stock : " + error.message);
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, stock: nextStock } : p))
      );
    }
  }

  // Product Modal Handlers
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
      toast.success(editingProductId ? "Produit modifié !" : "Produit ajouté au store !");
      setIsProductModalOpen(false);
      fetchData(businessId, false);
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
      fetchData(businessId, false);
    }
  }

  function handleCopyStoreLink() {
    if (!salonInfo.slug || typeof window === "undefined") return;
    navigator.clipboard.writeText(`${window.location.origin}/store/${salonInfo.slug}`);
    toast.success("Lien de la boutique copié !");
  }

  // Computed lists & KPIs
  const pendingCount = useMemo(
    () => sales.filter((s) => s.status === "pending").length,
    [sales]
  );
  const paidCount = useMemo(() => sales.filter((s) => s.status === "paid").length, [sales]);
  const canceledCount = useMemo(
    () => sales.filter((s) => s.status === "canceled").length,
    [sales]
  );

  const filteredSales = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sales.filter((s) => {
      const matchStatus = orderStatusFilter === "all" || s.status === orderStatusFilter;
      const itemsText = Array.isArray(s.items)
        ? s.items.map((i) => i.product_name).join(" ").toLowerCase()
        : "";
      const matchSearch =
        !query ||
        (s.client_name?.toLowerCase().includes(query) ?? false) ||
        (s.client_phone?.toLowerCase().includes(query) ?? false) ||
        (s.pickup_code?.toLowerCase().includes(query) ?? false) ||
        (s.invoice_number?.toLowerCase().includes(query) ?? false) ||
        itemsText.includes(query);
      return matchStatus && matchSearch;
    });
  }, [sales, orderStatusFilter, searchQuery]);

  const productCategories = useMemo(() => {
    const cats = Array.from(
      new Set(products.map((p) => (p.category || "Général").trim()).filter(Boolean))
    );
    return ["Tous", ...cats];
  }, [products]);

  const allProductCatSuggestions = useMemo(
    () =>
      Array.from(
        new Set([
          ...PRODUCT_CATEGORY_PRESETS,
          ...products.map((p) => (p.category || "").trim()).filter(Boolean),
        ])
      ),
    [products]
  );

  const lowStockProducts = useMemo(() => products.filter((p) => p.stock <= 3), [products]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      const cat = (p.category || "Général").trim();
      const matchCat = selectedProdCategory === "Tous" || cat === selectedProdCategory;
      const matchLow = !onlyLowStockProducts || p.stock <= 3;
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        cat.toLowerCase().includes(q);
      return matchCat && matchLow && matchSearch;
    });
  }, [products, productSearch, selectedProdCategory, onlyLowStockProducts]);

  const totalSalesRevenue = useMemo(
    () =>
      sales
        .filter((s) => s.status === "paid")
        .reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0),
    [sales]
  );

  const catalogMetrics = useMemo(() => {
    let retailValue = 0;
    let costValue = 0;
    for (const p of products) {
      retailValue += (Number(p.price) || 0) * (Number(p.stock) || 0);
      costValue += (Number(p.cost_price) || 0) * (Number(p.stock) || 0);
    }
    return {
      retailValue,
      costValue,
      potentialMargin: retailValue - costValue,
    };
  }, [products]);

  const posFilteredProducts = useMemo(() => {
    const q = posSearch.trim().toLowerCase();
    return products.filter(
      (p) => p.stock > 0 && (!q || p.name.toLowerCase().includes(q))
    );
  }, [products, posSearch]);

  const modalPriceVal = parseFloat(pPrice) || 0;
  const modalCostVal = parseFloat(pCostPrice) || 0;
  const modalUnitMargin = modalPriceVal - modalCostVal;
  const modalMarginPct = modalPriceVal > 0 ? (modalUnitMargin / modalPriceVal) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-7 w-64 bg-slate-200 rounded-xl" />
            <div className="h-3.5 w-80 bg-slate-200/70 rounded-lg" />
          </div>
          <div className="h-10 w-64 bg-slate-200 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-28 bg-slate-200 rounded-3xl" />
          <div className="h-28 bg-slate-200 rounded-3xl" />
        </div>
        <div className="h-80 bg-white rounded-3xl border border-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Low Stock Banner */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-5 py-4 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between shadow-xs gap-4">
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
                {lowStockProducts.map((p) => `${p.name} (${p.stock} restants)`).join(", ")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab("products");
              setOnlyLowStockProducts(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs whitespace-nowrap self-start sm:self-auto"
          >
            Voir les stocks faibles
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Boutique &amp; Click &amp; Collect
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Encaissez vos ventes comptoir, validez les retraits en ligne et gérez votre catalogue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => businessId && fetchData(businessId, true)}
            disabled={refreshing}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 p-2.5 rounded-2xl text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>

          {salonInfo.slug && (
            <>
              <button
                type="button"
                onClick={handleCopyStoreLink}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              >
                <Link2 size={14} className="text-indigo-600" />
                <span className="hidden sm:inline">Lien Boutique</span>
                <Copy size={12} className="text-slate-400" />
              </button>
              <a
                href={`/store/${salonInfo.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 transition"
                title="Ouvrir la boutique publique"
              >
                <ExternalLink size={15} />
              </a>
            </>
          )}

          <button
            type="button"
            onClick={openPosModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <Plus size={15} /> Vente Comptoir
          </button>

          <div className="flex bg-slate-200/70 p-1 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("sales")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "sales"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Receipt size={14} /> Commandes ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
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
      </div>

      {/* ONGLET COMMANDES */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-indigo-100 to-slate-100 rounded-3xl p-6 shadow-xs">
              <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider">
                Chiffre d&apos;Affaires Encaissé
              </span>
              <h2 className="text-3xl font-black text-slate-900">
                {totalSalesRevenue.toFixed(2)} TND
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {paidCount} vente(s) payée(s) (Boutique &amp; Comptoir)
              </p>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-3xl p-6 shadow-xs border border-amber-200/50">
              <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                Commandes en attente de retrait
              </span>
              <h2 className="text-3xl font-black text-amber-950">{pendingCount}</h2>
              <p className="text-xs text-amber-800 mt-0.5">
                Clients devant payer et retirer au salon
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-fit">
                {[
                  { id: "all", label: `Toutes (${sales.length})` },
                  { id: "pending", label: `En attente (${pendingCount})` },
                  { id: "paid", label: `Payées (${paidCount})` },
                  { id: "canceled", label: `Annulées (${canceledCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setOrderStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      orderStatusFilter === tab.id
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-80">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Code, client, téléphone ou produit..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
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
                  const rel = formatRelativeDays(sale.created_at);
                  const isOverdue = sale.status === "pending" && rel.diffDays > 7;
                  const cleanWa = (sale.client_phone || "").replace(/[^0-9]/g, "");

                  return (
                    <div
                      key={sale.id}
                      className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-xl flex items-center gap-1 font-mono">
                            <Ticket size={13} /> {sale.pickup_code || "N/A"}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900">
                            {sale.client_name}
                          </h4>

                          {isOverdue ? (
                            <span className="bg-rose-100 text-rose-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                              ⚠️ Non récupéré (&gt; 7 jours)
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

                          <span className="text-[10px] text-slate-400 font-semibold">
                            {sale.payment_method}
                          </span>
                        </div>

                        {Array.isArray(sale.items) && sale.items.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {sale.items.map((item, idx) => (
                              <span
                                key={idx}
                                className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg"
                              >
                                {item.quantity}× {item.product_name}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-[11px] text-slate-500">
                          📞 {sale.client_phone} •{" "}
                          {new Date(sale.created_at).toLocaleDateString("fr-FR")} ({rel.text})
                        </p>
                      </div>

                      <div className="flex items-center gap-2 justify-end flex-wrap shrink-0">
                        <span className="font-black text-sm text-slate-900 mr-1">
                          {Number(sale.total_amount).toFixed(2)} TND
                        </span>

                        {cleanWa && (
                          <a
                            href={`https://wa.me/${cleanWa}?text=${encodeURIComponent(
                              `Bonjour ${sale.client_name} 👋, votre commande ${sale.pickup_code} (${Number(
                                sale.total_amount
                              ).toFixed(2)} TND) chez ${salonInfo.name} est prête !`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-2.5 rounded-xl transition"
                            title="Contacter le client sur WhatsApp"
                          >
                            <MessageSquare size={15} />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedSaleForInvoice(sale)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <FileText size={14} /> Facture
                        </button>

                        {sale.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleMarkAsPaid(sale)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckCircle2 size={15} /> Encaisser
                            </button>
                            <button
                              type="button"
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
        <div className="space-y-5">
          {/* Catalog Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Valeur Vente Stock
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-1">
                {catalogMetrics.retailValue.toFixed(2)} TND
              </h3>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Coût d&apos;Achat Stock
              </span>
              <h3 className="text-xl font-black text-slate-700 mt-1">
                {catalogMetrics.costValue.toFixed(2)} TND
              </h3>
            </div>
            <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xs">
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                Marge Potentielle
              </span>
              <h3 className="text-xl font-black mt-1">
                +{catalogMetrics.potentialMargin.toFixed(2)} TND
              </h3>
            </div>
          </div>

          {/* Search, Category Filter & Add */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative w-full sm:w-72">
                  <Search
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Rechercher un produit..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setOnlyLowStockProducts((v) => !v)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    onlyLowStockProducts
                      ? "bg-rose-50 border-rose-200 text-rose-700"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <AlertTriangle size={13} /> Stock faible ({lowStockProducts.length})
                </button>
              </div>

              <button
                type="button"
                onClick={openProductModalForCreate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer shrink-0"
              >
                <Plus size={16} /> Ajouter un produit
              </button>
            </div>

            {productCategories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {productCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedProdCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                      selectedProdCategory === cat
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-3">
              <ShoppingBag size={32} className="mx-auto text-slate-300" />
              <p className="text-xs text-slate-400">Aucun produit trouvé dans ce filtre.</p>
              {products.length === 0 && (
                <button
                  type="button"
                  onClick={openProductModalForCreate}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus size={15} /> Ajouter votre premier produit
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((prod) => {
                const isLowStock = prod.stock <= 3;
                const safeImg = safeHttpUrl(prod.image_url);
                const unitMargin = Number(prod.price) - (Number(prod.cost_price) || 0);

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
                        <h3 className="font-bold text-sm text-slate-900">{prod.name}</h3>
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

                    <div className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 gap-2">
                      <div className="space-y-1">
                        <span className="font-extrabold text-indigo-600 text-sm block">
                          {Number(prod.price).toFixed(2)} TND
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={prod.stock <= 0 || adjustingStockId === prod.id}
                            onClick={() => handleQuickStockAdjust(prod, -1)}
                            className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer disabled:opacity-40"
                            title="Retirer 1 du stock"
                          >
                            <Minus size={11} />
                          </button>
                          <span
                            className={`text-[11px] font-bold min-w-[54px] text-center ${
                              isLowStock ? "text-rose-600 font-black" : "text-slate-600"
                            }`}
                          >
                            {prod.stock} en stock
                          </span>
                          <button
                            type="button"
                            disabled={adjustingStockId === prod.id}
                            onClick={() => handleQuickStockAdjust(prod, 1)}
                            className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer disabled:opacity-40"
                            title="Ajouter 1 au stock"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openProductModalForEdit(prod)}
                          className="p-2 hover:bg-white rounded-xl text-slate-500 transition shadow-2xs cursor-pointer"
                          title="Modifier"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
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
          )}
        </div>
      )}

      {/* MODAL VENTE COMPTOIR (POS) */}
      {isPosModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="font-black text-base text-slate-900">
                  Nouvelle Vente Comptoir (POS)
                </h2>
                <p className="text-[11px] text-slate-500">
                  Sélectionnez les produits achetés sur place et encaissez immédiatement.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPosModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0 overflow-hidden">
              {/* Product Picker */}
              <div className="p-5 overflow-y-auto md:border-r border-slate-100 space-y-3">
                <div className="relative sticky top-0 bg-white pb-2 z-10">
                  <Search size={14} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={posSearch}
                    onChange={(e) => setPosSearch(e.target.value)}
                    placeholder="Rechercher un produit en stock..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  />
                </div>

                {posFilteredProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">
                    Aucun produit disponible en stock.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {posFilteredProducts.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => addToPosCart(prod)}
                        className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-200 transition cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {prod.name}
                          </h4>
                          <span className="text-[10px] text-slate-500">
                            Stock : {prod.stock} unités
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-xs text-indigo-600">
                            {Number(prod.price).toFixed(2)} TND
                          </span>
                          <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                            <Plus size={14} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart & Checkout */}
              <form
                onSubmit={handleSubmitPosSale}
                className="p-5 bg-slate-50/50 flex flex-col justify-between overflow-y-auto space-y-4"
              >
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Panier Comptoir ({posCart.reduce((s, c) => s + c.quantity, 0)})
                  </h3>

                  {posCart.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
                      Cliquez sur des produits à gauche pour les ajouter.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {posCart.map((item) => (
                        <div
                          key={item.product.id}
                          className="p-3 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <strong className="text-slate-900 block truncate">
                              {item.product.name}
                            </strong>
                            <span className="text-[10px] text-slate-400">
                              {Number(item.product.price).toFixed(2)} TND / u
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => updatePosCartQty(item.product.id, -1)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-6 text-center font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updatePosCartQty(item.product.id, 1)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Client (optionnel)
                      </label>
                      <input
                        type="text"
                        value={posClientName}
                        onChange={(e) => setPosClientName(e.target.value)}
                        placeholder="Client Comptoir"
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Téléphone (optionnel)
                      </label>
                      <input
                        type="tel"
                        value={posClientPhone}
                        onChange={(e) => setPosClientPhone(e.target.value)}
                        placeholder="+216..."
                        className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-medium text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Mode de paiement
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPosPaymentMethod("Espèces")}
                        className={`py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition ${
                          posPaymentMethod === "Espèces"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        <Banknote size={14} /> Espèces
                      </button>
                      <button
                        type="button"
                        onClick={() => setPosPaymentMethod("Carte")}
                        className={`py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 cursor-pointer transition ${
                          posPaymentMethod === "Carte"
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        <CreditCard size={14} /> Carte
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Total à encaisser</span>
                    <span className="text-xl font-black text-slate-900">
                      {posTotal.toFixed(2)} TND
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={posCart.length === 0 || posSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {posSubmitting ? "Encaissement..." : "Valider & Encaisser"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODALE FACTURE (AVEC CSS IMPRESSION PROPRE) */}
      {selectedSaleForInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-invoice, #printable-invoice * { visibility: visible !important; }
              #printable-invoice {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: none !important;
                background: #ffffff !important;
                padding: 24px !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print { display: none !important; }
            }
          `}</style>

          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
            <div className="no-print p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="font-bold text-xs text-slate-700 flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" /> Aperçu de la Facture
              </span>
              <button
                type="button"
                onClick={() => setSelectedSaleForInvoice(null)}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div
              id="printable-invoice"
              className="p-8 overflow-y-auto space-y-6 bg-white font-sans"
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-6 gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">FACTURE / REÇU</h2>
                  <p className="text-xs text-indigo-600 font-bold">
                    {selectedSaleForInvoice.invoice_number}
                  </p>
                  {selectedSaleForInvoice.pickup_code && (
                    <span className="inline-block mt-1.5 bg-slate-100 text-slate-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md">
                      Réf / Retrait : {selectedSaleForInvoice.pickup_code}
                    </span>
                  )}
                </div>
                <div className="text-right text-xs text-slate-500 space-y-0.5">
                  <p className="font-bold text-slate-900 text-sm">{salonInfo.name}</p>
                  {salonInfo.location && <p>{salonInfo.location}</p>}
                  {salonInfo.whatsapp_number && <p>{salonInfo.whatsapp_number}</p>}
                  <p>
                    Date :{" "}
                    {new Date(selectedSaleForInvoice.created_at).toLocaleDateString("fr-FR")}
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
                        <td className="p-3 text-center font-bold">{item.quantity}</td>
                        <td className="p-3 text-right">{item.unit_price} TND</td>
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
                          : selectedSaleForInvoice.status === "canceled"
                          ? "text-rose-600"
                          : "text-amber-600"
                      }
                    >
                      {selectedSaleForInvoice.status === "paid"
                        ? "Payé"
                        : selectedSaleForInvoice.status === "canceled"
                        ? "Annulé"
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

            <div className="no-print p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedSaleForInvoice(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
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
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="font-bold text-base text-slate-900">
                {editingProductId ? "Modifier le produit" : "Ajouter un produit au Store"}
              </h2>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Nom du produit *
                </label>
                <input
                  type="text"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="ex: Shampoing Hydratant 500ml"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Prix vente *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    placeholder="35.00"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
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
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value)}
                    placeholder="15"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                    required
                  />
                </div>
              </div>

              {pPrice && (
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl px-3.5 py-2 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-500">Marge unitaire :</span>
                  <span className={modalUnitMargin >= 0 ? "text-emerald-600" : "text-rose-600"}>
                    {modalUnitMargin >= 0 ? "+" : ""}
                    {modalUnitMargin.toFixed(2)} TND ({modalMarginPct.toFixed(0)}%)
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Catégorie
                </label>
                <input
                  type="text"
                  list="store-categories-list"
                  value={pCategory}
                  onChange={(e) => setPCategory(e.target.value)}
                  placeholder="ex: Soins Capillaires / Aftercare"
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                />
                <datalist id="store-categories-list">
                  {allProductCatSuggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
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
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
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
                  className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 h-20 resize-none"
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
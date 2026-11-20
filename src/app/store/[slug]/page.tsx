"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeHttpUrl } from "@/lib/safe-url";
import { toast } from "sonner";
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  Minus,
  X,
  CheckCircle,
  Phone,
  Sparkles,
  AlertCircle,
  Search,
  Ticket,
  MapPin,
  Scissors,
  Calendar,
  Clock,
  Copy,
  Check,
  Trash2,
  MessageSquare,
  ArrowRight,
  CreditCard,
} from "lucide-react";

interface BusinessSettings {
  business_id: string;
  name: string;
  slug: string;
  description?: string;
  location?: string;
  maps_url?: string;
  whatsapp_number?: string;
  hero_image_url?: string;
  store_image?: string;
  color_palette?: string;
  primary_color?: string;
  working_hours?: {
    start?: string;
    end?: string;
    days?: number[];
  };
}

interface StoreProduct {
  id: string;
  business_id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
}

interface StoreDesign {
  banner_url: string;
  welcome_title: string;
  welcome_subtitle: string;
  primary_color: string;
  layout_style: string;
}

interface CartItem extends StoreProduct {
  quantity: number;
}

interface TrackedOrder {
  id: string;
  client_name: string;
  total_amount: number;
  status: string;
  pickup_code: string;
}

interface OrderSummary {
  pickupCode: string;
  totalAmount: number;
  clientName: string;
  clientPhone: string;
  items: { name: string; quantity: number; price: number }[];
}

function StoreContent() {
  const supabase = createClient();
  const params = useParams();
  const slug = params?.slug as string;

  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [design, setDesign] = useState<StoreDesign>({
    banner_url: "",
    welcome_title: "Boutique en ligne",
    welcome_subtitle: "Découvrez nos produits professionnels",
    primary_color: "#2563EB",
    layout_style: "grid",
  });
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState<OrderSummary | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Order Tracking Modal
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingPhone, setTrackingPhone] = useState("");
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    async function initStore() {
      if (!slug) return;
      setLoading(true);
      const cleanSlug = decodeURIComponent(slug).trim();

      const { data: settingsData } = await supabase
        .from("business_settings")
        .select("*")
        .ilike("slug", cleanSlug)
        .maybeSingle();

      if (!settingsData) {
        setLoading(false);
        return;
      }

      setSettings(settingsData);
      const bizId = settingsData.business_id;

      const [prodRes, designRes] = await Promise.all([
        supabase
          .from("store_products")
          .select("*")
          .eq("business_id", bizId)
          .gt("stock", 0)
          .order("name"),
        supabase
          .from("store_settings")
          .select("*")
          .eq("business_id", bizId)
          .maybeSingle(),
      ]);

      const loadedProducts: StoreProduct[] = prodRes.data || [];
      setProducts(loadedProducts);

      // Hydrate cart from localStorage reconciled with live stock
      try {
        const rawSaved = localStorage.getItem(`booki_cart_${cleanSlug}`);
        if (rawSaved) {
          const parsed = JSON.parse(rawSaved) as { id: string; quantity: number }[];
          const prodMap = new Map(loadedProducts.map((p) => [p.id, p]));
          const restored: CartItem[] = [];
          for (const entry of parsed) {
            const p = prodMap.get(entry.id);
            if (p && p.stock > 0) {
              restored.push({
                ...p,
                quantity: Math.min(p.stock, Math.max(1, Number(entry.quantity) || 1)),
              });
            }
          }
          setCart(restored);
        }
      } catch {
        // ignore storage errors
      } finally {
        setCartHydrated(true);
      }

      setDesign({
        banner_url: designRes.data?.banner_url || settingsData.hero_image_url || "",
        welcome_title: designRes.data?.welcome_title || `Boutique - ${settingsData.name}`,
        welcome_subtitle:
          designRes.data?.welcome_subtitle ||
          settingsData.description ||
          "Découvrez nos produits de soins professionnels",
        primary_color:
          designRes.data?.primary_color ||
          settingsData.primary_color ||
          settingsData.color_palette ||
          "#2563EB",
        layout_style: designRes.data?.layout_style || "grid",
      });

      setLoading(false);
    }

    initStore();
  }, [slug, supabase]);

  // Persist cart to localStorage
  useEffect(() => {
    if (!cartHydrated || !slug) return;
    try {
      const cleanSlug = decodeURIComponent(slug).trim();
      const compact = cart.map((c) => ({ id: c.id, quantity: c.quantity }));
      localStorage.setItem(`booki_cart_${cleanSlug}`, JSON.stringify(compact));
    } catch {
      // ignore storage errors
    }
  }, [cart, cartHydrated, slug]);

  async function handleTrackOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingCode.trim() || !trackingPhone.trim() || !slug) return;

    setTrackingLoading(true);
    setTrackingError(null);
    setTrackedOrder(null);

    try {
      const res = await fetch("/api/public/store/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          pickupCode: trackingCode,
          clientPhone: trackingPhone,
          action: "track",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.order) {
        setTrackingError(data.error || "Aucune commande trouvée avec ces informations.");
      } else {
        setTrackedOrder(data.order);
      }
    } catch {
      setTrackingError("Erreur réseau lors de la vérification.");
    } finally {
      setTrackingLoading(false);
    }
  }

  async function handleClientCancelOrder() {
    if (!trackedOrder || !slug) return;
    if (!confirm("Voulez-vous vraiment annuler cette commande ?")) return;

    try {
      const res = await fetch("/api/public/store/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          pickupCode: trackedOrder.pickup_code,
          clientPhone: trackingPhone,
          action: "cancel",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTrackingError(data.error || "Erreur lors de l'annulation.");
      } else {
        setTrackedOrder(data.order);
        toast.success("Votre commande a été annulée.");
      }
    } catch {
      setTrackingError("Erreur réseau lors de l'annulation.");
    }
  }

  const categories = useMemo(
    () => ["Tous", ...Array.from(new Set(products.map((p) => p.category || "Général")))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));
      const matchesCategory =
        selectedCategory === "Tous" || (p.category || "Général") === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const addToCart = (product: StoreProduct) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing && existing.quantity >= product.stock) {
      toast.info(`Stock maximum atteint (${product.stock}) pour ce produit.`);
      return;
    }
    setCart((prevCart) => {
      const found = prevCart.find((item) => item.id === product.id);
      if (found) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    setLastOrder(null);
    toast.success(`"${product.name}" ajouté au panier`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.id !== id) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.stock) {
            toast.info(`Maximum ${item.stock} unité(s) disponible(s).`);
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCartAmount = cart.reduce((acc, curr) => acc + Number(curr.price) * curr.quantity, 0);
  const totalCartItemsCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0 || !slug) return;
    setSubmitting(true);
    setErrorMessage(null);

    const snapshotItems = cart.map((c) => ({
      name: c.name,
      quantity: c.quantity,
      price: Number(c.price),
    }));

    try {
      const res = await fetch("/api/public/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
          clientName,
          clientPhone,
          paymentMethod: "Espèces",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la validation de la commande.");
      }

      setLastOrder({
        pickupCode: data.pickupCode,
        totalAmount: Number(data.totalAmount ?? totalCartAmount),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        items: snapshotItems,
      });
      setCart([]);
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la validation de la commande.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyPickupCode(code: string) {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    toast.success("Code de retrait copié !");
    setTimeout(() => setCodeCopied(false), 2500);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" /> Chargement de la boutique...
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-800 font-bold text-sm">
        Boutique introuvable. Veuillez vérifier l&apos;adresse URL.
      </div>
    );
  }

  const primaryColor = design.primary_color || settings.color_palette || "#2563EB";
  const heroImageUrl = safeHttpUrl(settings.hero_image_url || design.banner_url);
  const storeImageUrl = safeHttpUrl(settings.store_image);
  const safeMapsUrl = safeHttpUrl(settings.maps_url);
  const cleanWhatsapp = (settings.whatsapp_number || "").replace(/[^0-9]/g, "");
  const openTimeStr = settings.working_hours?.start || "09:00";
  const closeTimeStr = settings.working_hours?.end || "18:00";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-32">
      {/* HERO HEADER */}
      <div
        className="relative min-h-[330px] sm:min-h-[360px] flex items-end justify-start px-6 sm:px-12 pb-16 overflow-hidden border-b border-white/10"
        style={{ backgroundColor: primaryColor }}
      >
        {heroImageUrl ? (
          <div className="absolute inset-0 z-0">
            <img
              src={heroImageUrl}
              alt={settings.name}
              className="w-full h-full object-cover scale-105 filter brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
        )}

        {/* Top Switcher & Quick Cart Trigger */}
        <div className="absolute top-5 right-5 left-5 sm:right-12 sm:left-12 z-20 flex items-center justify-between gap-3">
          <div className="inline-flex bg-black/30 backdrop-blur-md p-1 rounded-2xl border border-white/20 text-xs font-bold">
            <Link
              href={`/book/${slug}`}
              className="px-3.5 py-1.5 rounded-xl text-white/90 hover:text-white flex items-center gap-1.5 transition"
            >
              <Calendar size={13} /> Prendre RDV
            </Link>
            <span className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 shadow-xs flex items-center gap-1.5">
              <ShoppingBag size={13} /> Boutique
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="bg-white/95 hover:bg-white text-slate-900 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 transition cursor-pointer"
          >
            <ShoppingCart size={14} style={{ color: primaryColor }} />
            <span>Panier ({totalCartItemsCount})</span>
          </button>
        </div>

        <div className="relative z-10 max-w-3xl w-full flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pt-16">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl overflow-hidden shrink-0">
              {storeImageUrl ? (
                <img src={storeImageUrl} alt={settings.name} className="w-full h-full object-cover" />
              ) : (
                <Scissors size={36} className="text-white/90" />
              )}
            </div>

            <div className="space-y-2">
              
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                {settings.name}
              </h1>
              <p className="text-xs sm:text-sm text-white/90 max-w-xl font-normal leading-relaxed">
                {design.welcome_subtitle ||
                  settings.description ||
                  "Retrouvez tous nos produits professionnels de soin et de beauté."}
              </p>

              <div className="flex items-center gap-2.5 text-xs text-white/95 font-medium pt-1 flex-wrap">
                <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/20">
                  <Clock size={13} /> {openTimeStr} - {closeTimeStr}
                </span>

                {settings.location &&
                  (safeMapsUrl ? (
                    <a
                      href={safeMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-xl backdrop-blur-md transition border border-white/20"
                    >
                      <MapPin size={13} /> {settings.location}
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/20">
                      <MapPin size={13} /> {settings.location}
                    </span>
                  ))}

                {cleanWhatsapp && (
                  <a
                    href={`https://wa.me/${cleanWhatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-xl backdrop-blur-md transition border border-white/20"
                  >
                    <Phone size={13} /> {settings.whatsapp_number}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corps Principal (-mt-6 overlap matching Book page) */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 relative z-20 space-y-8">
        {/* Clean Search, Categories & Tracking Trigger Toolbar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-sm">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setTrackingError(null);
                setIsTrackingModalOpen(true);
              }}
              style={{ borderColor: primaryColor, color: primaryColor }}
              className="bg-white border-2 border-dashed py-2.5 px-4 rounded-2xl text-xs font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Ticket size={15} /> Suivre ma commande
            </button>
          </div>

          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={selectedCategory === cat ? { backgroundColor: primaryColor } : {}}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
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

        {/* Grille de Produits */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center text-slate-400 text-xs shadow-2xs space-y-2 border border-slate-100">
            <ShoppingBag size={32} className="mx-auto text-slate-300" />
            <p>Aucun produit ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              design.layout_style === "list"
                ? "grid-cols-1"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {filteredProducts.map((prod) => {
              const safeImg = safeHttpUrl(prod.image_url);
              const inCartItem = cart.find((c) => c.id === prod.id);

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden flex flex-col justify-between group hover:shadow-md transition"
                >
                  <div>
                    {safeImg ? (
                      <div className="h-52 w-full overflow-hidden bg-slate-100 relative">
                        <img
                          src={safeImg}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        {prod.stock <= 3 && (
                          <span className="absolute top-3 right-3 bg-rose-500 text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            Derniers articles
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-40 bg-slate-100 flex items-center justify-center text-slate-400">
                        <ShoppingBag size={32} />
                      </div>
                    )}

                    <div className="p-5 space-y-2">
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {prod.category || "Général"}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">{prod.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {prod.description || "Pas de description."}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">
                        En stock ({prod.stock})
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {Number(prod.price).toFixed(2)} TND
                      </span>
                    </div>

                    {inCartItem ? (
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateQuantity(prod.id, -1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-black w-6 text-center text-slate-900">
                          {inCartItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(prod.id, 1)}
                          className="w-7 h-7 rounded-lg text-white flex items-center justify-center cursor-pointer"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(prod)}
                        style={{ backgroundColor: primaryColor }}
                        className="text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-90 transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        Ajouter <Plus size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* STICKY BOTTOM CART BAR (When items in cart and drawer closed) */}
      {totalCartItemsCount > 0 && !isCartOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-2xl p-3.5 sm:px-8 animate-in slide-in-from-bottom duration-200">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                <ShoppingCart size={18} />
              </div>
              <div className="min-w-0">
                <span className="font-black text-xs sm:text-sm text-slate-900 block">
                  {totalCartItemsCount} article{totalCartItemsCount > 1 ? "s" : ""} dans votre panier
                </span>
                <span className="text-[11px] font-bold" style={{ color: primaryColor }}>
                  Total estimé : {totalCartAmount.toFixed(2)} TND • Retrait au salon
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              style={{ backgroundColor: primaryColor }}
              className="text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:opacity-95 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              Voir le panier <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* MODALE SUIVRE MA COMMANDE */}
      {isTrackingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Ticket size={16} style={{ color: primaryColor }} /> Suivre ou annuler ma commande
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsTrackingModalOpen(false);
                  setTrackedOrder(null);
                  setTrackingError(null);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTrackOrder} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Code de retrait *
                </label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="ex: BK-A1B2C3D4"
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase font-bold text-slate-900 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Téléphone utilisé lors de la commande *
                </label>
                <input
                  type="tel"
                  value={trackingPhone}
                  onChange={(e) => setTrackingPhone(e.target.value)}
                  placeholder="+216..."
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={trackingLoading}
                style={{ backgroundColor: primaryColor }}
                className="w-full text-white px-4 py-3 rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {trackingLoading ? "Recherche en cours..." : "Vérifier ma commande"}
              </button>
            </form>

            {trackingError && (
              <p className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 p-3 rounded-xl">
                {trackingError}
              </p>
            )}

            {trackedOrder && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{trackedOrder.client_name}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-black uppercase text-[9px] ${
                      trackedOrder.status === "paid"
                        ? "bg-emerald-100 text-emerald-700"
                        : trackedOrder.status === "canceled"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {trackedOrder.status === "paid"
                      ? "Payé & Retiré"
                      : trackedOrder.status === "canceled"
                      ? "Annulé"
                      : "En attente au salon"}
                  </span>
                </div>
                <p className="text-slate-600">
                  Montant total :{" "}
                  <strong className="text-slate-900">
                    {Number(trackedOrder.total_amount).toFixed(2)} TND
                  </strong>
                </p>
                {trackedOrder.status === "pending" && (
                  <button
                    type="button"
                    onClick={handleClientCancelOrder}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 py-2.5 rounded-xl font-bold transition border border-rose-200 cursor-pointer"
                  >
                    Annuler ma commande
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TIROIR PANIER */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <ShoppingCart size={18} /> Votre Panier
                </h2>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {lastOrder ? (
                <div className="bg-blue-50/70 border border-blue-100 rounded-3xl p-6 text-center space-y-4">
                  <div
                    className="w-14 h-14 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <CheckCircle size={28} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900">Commande Réservée !</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Présentez ce code de retrait à l&apos;accueil lors de votre paiement sur place :
                    </p>
                  </div>

                  <div
                    className="bg-white border-2 border-dashed p-3.5 rounded-2xl flex items-center justify-between gap-2 shadow-inner"
                    style={{ borderColor: `${primaryColor}66` }}
                  >
                    <div className="flex items-center gap-2">
                      <Ticket size={20} style={{ color: primaryColor }} />
                      <span
                        className="text-lg font-black tracking-wider font-mono"
                        style={{ color: primaryColor }}
                      >
                        {lastOrder.pickupCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyPickupCode(lastOrder.pickupCode)}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {codeCopied ? <Check size={12} /> : <Copy size={12} />}
                      {codeCopied ? "Copié" : "Copier"}
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl p-3 border border-slate-200/70 text-left text-xs space-y-1.5">
                    {lastOrder.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-slate-700">
                        <span>
                          {it.quantity}× {it.name}
                        </span>
                        <span className="font-bold">
                          {(it.quantity * it.price).toFixed(2)} TND
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-slate-100 font-black text-slate-900">
                      <span>Total à payer au salon</span>
                      <span style={{ color: primaryColor }}>
                        {lastOrder.totalAmount.toFixed(2)} TND
                      </span>
                    </div>
                  </div>

                  {cleanWhatsapp && (
                    <a
                      href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                        `Bonjour ${settings.name} 👋\n\nJe viens de réserver une commande Click & Collect :\n- *Code de retrait* : ${lastOrder.pickupCode}\n- *Client* : ${lastOrder.clientName} (${lastOrder.clientPhone})\n- *Articles* :\n${lastOrder.items
                          .map((i) => `  • ${i.quantity}x ${i.name}`)
                          .join("\n")}\n- *Total* : ${lastOrder.totalAmount.toFixed(2)} TND\n\nMerci !`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl text-xs font-bold shadow-sm transition"
                    >
                      <MessageSquare size={15} /> Confirmer sur WhatsApp
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setLastOrder(null);
                      setIsCartOpen(false);
                    }}
                    style={{ backgroundColor: primaryColor }}
                    className="w-full text-white py-3 rounded-2xl text-xs font-bold shadow-sm transition cursor-pointer"
                  >
                    Terminer
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <ShoppingBag size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs text-slate-400">Votre panier est vide.</p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Continuer mes achats
                  </button>
                </div>
              ) : (
                <div className="space-y-4 divide-y divide-slate-100">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="pt-4 first:pt-0 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{item.name}</h4>
                        <span className="text-[11px] font-bold" style={{ color: primaryColor }}>
                          {(Number(item.price) * item.quantity).toFixed(2)} TND
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer ml-1"
                          title="Retirer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!lastOrder && cart.length > 0 && (
              <form onSubmit={handleCheckout} className="space-y-3.5 pt-6 border-t border-slate-100 mt-6">
                {errorMessage && (
                  <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                    <AlertCircle size={16} /> {errorMessage}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="ex: Amine Ben Ali"
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="ex: +216..."
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900"
                    required
                  />
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-emerald-900">
                  <CreditCard size={14} className="text-emerald-600 shrink-0" />
                  <span>Paiement sur place lors du retrait au salon</span>
                </div>

                <div className="flex justify-between items-center py-1 text-xs font-bold text-slate-800">
                  <span>Total à payer au salon :</span>
                  <span className="text-base font-black" style={{ color: primaryColor }}>
                    {totalCartAmount.toFixed(2)} TND
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: primaryColor }}
                  className="w-full text-white py-3.5 rounded-2xl text-xs font-bold shadow-md hover:opacity-95 transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Génération du code..." : "Réserver au Salon (Click & Collect)"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <footer className="mt-16 text-center text-xs text-slate-400 space-y-1">
        <p className="font-bold text-slate-600">
          Propulsé par Booki<span style={{ color: primaryColor }}>.tn</span>
        </p>
        <p className="text-[11px]">Boutique en ligne et catalogue pour salons, spas &amp; studios.</p>
      </footer>
    </div>
  );
}

export default function PublicStorePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-pulse flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" /> Chargement de la boutique...
          </div>
        </div>
      }
    >
      <StoreContent />
    </Suspense>
  );
}
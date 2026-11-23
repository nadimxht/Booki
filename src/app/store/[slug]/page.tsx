"use client";

import { useEffect, useState, Suspense, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  ArrowUpRight,
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
  const router = useRouter();
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
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
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

  const [bioExpanded, setBioExpanded] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; ignore: boolean } | null>(null);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    const isScrollable = Boolean(target?.closest("[data-no-swipe]"));
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      ignore: isScrollable || isCartOpen || isTrackingModalOpen || Boolean(selectedProduct),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || touchStartRef.current.ignore) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Swipe right to switch back to Prendre RDV
    if (dx > 90 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      router.push(`/book/${slug}`);
    }
  };

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

  const bioText =
    design.welcome_subtitle ||
    settings.description ||
    "Retrouvez tous nos produits professionnels de soin et de beauté.";

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-32"
    >
      {/* COMPACT HERO HEADER */}
      <div
        className="relative pt-4 pb-11 px-4 sm:px-8 overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        {heroImageUrl ? (
          <div className="absolute inset-0 z-0">
            <img
              src={heroImageUrl}
              alt={settings.name}
              className="w-full h-full object-cover scale-105 filter brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/35" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
        )}

        <div className="relative z-10 max-w-6xl mx-auto space-y-4">
          {/* Top Switcher & Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex bg-black/35 backdrop-blur-md p-1 rounded-full border border-white/20 text-xs font-bold shadow-sm">
              <Link
                href={`/book/${slug}`}
                className="px-3 sm:px-3.5 py-1.5 rounded-full text-white/90 hover:text-white flex items-center gap-1.5 transition"
              >
                <Calendar size={13} /> Prendre RDV
              </Link>
              <span className="px-3 sm:px-3.5 py-1.5 rounded-full bg-white text-slate-900 shadow-xs flex items-center gap-1.5">
                <ShoppingBag size={13} /> Boutique
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTrackingError(null);
                  setIsTrackingModalOpen(true);
                }}
                title="Suivre ma commande"
                aria-label="Suivre ma commande"
                className="bg-black/35 hover:bg-black/50 backdrop-blur-md text-white border border-white/20 px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Ticket size={14} />
                <span className="hidden sm:inline">Suivre</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="bg-white/95 hover:bg-white text-slate-900 px-3 sm:px-3.5 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <ShoppingCart size={14} style={{ color: primaryColor }} />
                <span>({totalCartItemsCount})</span>
              </button>
            </div>
          </div>

          {/* Tight Avatar + Title Lockup */}
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 flex items-center justify-center shadow-xl overflow-hidden shrink-0">
                {storeImageUrl ? (
                  <img
                    src={storeImageUrl}
                    alt={settings.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Scissors size={26} className="text-white/90" />
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-[10px] font-bold text-white/95 backdrop-blur-sm">
                  Click &amp; Collect au salon
                </div>
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white truncate">
                  {settings.name}
                </h1>
              </div>
            </div>

            {/* Full-Width Compact Bio */}
            <p
              onClick={() => setBioExpanded((prev) => !prev)}
              className={`text-xs sm:text-sm text-white/85 max-w-2xl leading-relaxed cursor-pointer ${
                bioExpanded ? "" : "line-clamp-2"
              }`}
            >
              {bioText}
            </p>

            {/* Single-Row Compact Metadata Strip */}
            <div className="flex items-center gap-1.5 text-[11px] text-white/95 font-medium flex-wrap pt-0.5">
              <span className="inline-flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/15">
                <Clock size={11} /> {openTimeStr}–{closeTimeStr}
              </span>

              {settings.location &&
                (safeMapsUrl ? (
                  <a
                    href={safeMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full backdrop-blur-md transition border border-white/15"
                  >
                    <MapPin size={11} />
                    <span className="truncate max-w-[160px] sm:max-w-none">{settings.location}</span>
                    <ArrowUpRight size={10} className="opacity-75" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded-full backdrop-blur-md border border-white/15">
                    <MapPin size={11} />
                    <span className="truncate max-w-[160px] sm:max-w-none">{settings.location}</span>
                  </span>
                ))}

              {cleanWhatsapp && (
                <a
                  href={`https://wa.me/${cleanWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full backdrop-blur-md transition border border-white/15"
                >
                  <Phone size={11} /> {settings.whatsapp_number}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN STOREFRONT */}
      <main className="max-w-6xl mx-auto px-3.5 sm:px-6 -mt-6 relative z-20 space-y-5">
        {/* Clean Search & Categories Toolbar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xl space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-slate-300 transition"
            />
          </div>

          {categories.length > 1 && (
            <div data-no-swipe className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={selectedCategory === cat ? { backgroundColor: primaryColor } : {}}
                  className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
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

        {/* Product Grid (2-col on mobile, 3-col on desktop) */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-14 text-center text-slate-400 text-xs shadow-2xs space-y-2 border border-slate-100">
            <ShoppingBag size={32} className="mx-auto text-slate-300" />
            <p>Aucun produit ne correspond à votre recherche.</p>
          </div>
        ) : (
          <div
            className={`grid gap-3 sm:gap-5 ${
              design.layout_style === "list"
                ? "grid-cols-1"
                : "grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {filteredProducts.map((prod) => {
              const safeImg = safeHttpUrl(prod.image_url);
              const inCartItem = cart.find((c) => c.id === prod.id);
              const hasDescription = Boolean(prod.description && prod.description.trim().length > 0);

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/70 shadow-2xs overflow-hidden flex flex-col justify-between group hover:shadow-md transition"
                >
                  <div
                    onClick={() => setSelectedProduct(prod)}
                    className="cursor-pointer flex-1 flex flex-col"
                  >
                    {safeImg ? (
                      <div className="aspect-square sm:aspect-[4/3] w-full overflow-hidden bg-slate-100 relative">
                        <img
                          src={safeImg}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        {prod.stock <= 3 && (
                          <span className="absolute top-2 left-2 bg-rose-500/95 backdrop-blur-xs text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                            Plus que {prod.stock}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-square sm:aspect-[4/3] bg-slate-100 flex items-center justify-center text-slate-300 relative">
                        <ShoppingBag size={28} />
                        {prod.stock <= 3 && (
                          <span className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                            Plus que {prod.stock}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-3 sm:p-4 space-y-1 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                        {prod.category || "Général"}
                      </span>
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug">
                        {prod.name}
                      </h3>
                      {hasDescription && (
                        <p className="hidden sm:line-clamp-2 text-xs text-slate-500 leading-relaxed pt-0.5">
                          {prod.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/40">
                    <span className="font-black text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                     {Number(prod.price).toFixed(2).replace(/\.00$/, "")} <span className="text-[10px] font-bold">TND</span>
                    </span>

                    {inCartItem ? (
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => updateQuantity(prod.id, -1)}
                          aria-label="Diminuer la quantité"
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-[11px] sm:text-xs font-black w-5 text-center text-slate-900">
                          {inCartItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(prod.id, 1)}
                          aria-label="Augmenter la quantité"
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-white flex items-center justify-center cursor-pointer"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(prod)}
                        style={{ backgroundColor: primaryColor }}
                        aria-label={`Ajouter ${prod.name}`}
                        className="text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold shadow-xs hover:opacity-90 transition flex items-center gap-1 active:scale-95 cursor-pointer"
                      >
                        <span className="hidden sm:inline">Ajouter</span>
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* PRODUCT QUICK-VIEW MODAL */}
      {selectedProduct && (
        <div
          onClick={() => setSelectedProduct(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="relative bg-slate-100 aspect-[4/3]">
              {safeHttpUrl(selectedProduct.image_url) ? (
                <img
                  src={safeHttpUrl(selectedProduct.image_url)!}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ShoppingBag size={42} />
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                aria-label="Fermer"
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white backdrop-blur-md flex items-center justify-center cursor-pointer hover:bg-black/70 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {selectedProduct.category || "Général"}
                  </span>
                  {selectedProduct.stock <= 3 && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                      Plus que {selectedProduct.stock} en stock
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900">{selectedProduct.name}</h3>
                <p className="text-base font-black" style={{ color: primaryColor }}>
                  {Number(selectedProduct.price).toFixed(2)} TND
                </p>
              </div>

              {selectedProduct.description && selectedProduct.description.trim() && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedProduct.description}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  addToCart(selectedProduct);
                  setSelectedProduct(null);
                }}
                style={{ backgroundColor: primaryColor }}
                className="w-full text-white py-3.5 rounded-2xl text-xs font-bold shadow-md hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                Ajouter au panier <Plus size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STICKY BOTTOM CART BAR */}
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
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
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
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
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
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
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
                    className="w-full border border-slate-200 bg-slate-50 p-3 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-slate-400"
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

      <footer className="mt-14 text-center text-xs text-slate-400 space-y-2">
        <button
          type="button"
          onClick={() => {
            setTrackingError(null);
            setIsTrackingModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 underline underline-offset-4 cursor-pointer"
        >
          <Ticket size={12} /> Suivre ou annuler une commande
        </button>
        <div className="space-y-0.5">
          <p className="font-bold text-slate-600">
            Propulsé par Booki<span style={{ color: primaryColor }}>.tn</span>
          </p>
          <p className="text-[11px]">Boutique en ligne et catalogue pour salons, spas &amp; studios.</p>
        </div>
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

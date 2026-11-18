import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { slug, items, clientName, clientPhone, paymentMethod } = await req.json();

    if (!slug || !Array.isArray(items) || items.length === 0 || !clientName?.trim() || !clientPhone?.trim()) {
      return NextResponse.json({ error: "Panier ou coordonnées invalides." }, { status: 400 });
    }

    const { data: settings } = await supabaseAdmin
      .from("business_settings")
      .select("business_id")
      .eq("slug", slug)
      .maybeSingle();

    if (!settings) {
      return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });
    }

    const productIds = items.map((i: any) => i.product_id).filter(Boolean);
    const { data: dbProducts } = await supabaseAdmin
      .from("store_products")
      .select("id, name, price, stock")
      .eq("business_id", settings.business_id)
      .in("id", productIds);

    if (!dbProducts || dbProducts.length === 0) {
      return NextResponse.json({ error: "Produits introuvables." }, { status: 400 });
    }

    const prodMap = new Map(dbProducts.map((p) => [p.id, p]));
    let serverTotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
        return NextResponse.json({ error: "Quantité invalide." }, { status: 400 });
      }
      const dbProd = prodMap.get(item.product_id);
      if (!dbProd) {
        return NextResponse.json({ error: "Un produit du panier n'existe plus." }, { status: 400 });
      }
      if (qty > dbProd.stock) {
        return NextResponse.json({ error: `Stock insuffisant pour ${dbProd.name}.` }, { status: 409 });
      }

      const unitPrice = Number(dbProd.price);
      serverTotal += unitPrice * qty;
      verifiedItems.push({
        product_id: dbProd.id,
        product_name: dbProd.name,
        quantity: qty,
        unit_price: unitPrice,
      });
    }

    // High-entropy 8-char code (not brute-forceable like 4 digits)
    const pickupCode = `BK-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const invoiceNumber = `FAC-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const { error: insertErr } = await supabaseAdmin.from("store_sales").insert([
      {
        business_id: settings.business_id,
        invoice_number: invoiceNumber,
        pickup_code: pickupCode,
        client_name: clientName.trim().slice(0, 100),
        client_phone: clientPhone.trim().slice(0, 30),
        total_amount: Number(serverTotal.toFixed(2)),
        payment_method: paymentMethod === "Carte" ? "Carte" : "Espèces",
        status: "pending",
        items: verifiedItems,
      },
    ]);

    if (insertErr) throw new Error(insertErr.message);

    return NextResponse.json({ success: true, pickupCode, totalAmount: serverTotal });
  } catch (err: any) {
    console.error("Erreur POST /api/public/store/checkout:", err);
    return NextResponse.json({ error: "Erreur lors de la commande." }, { status: 500 });
  }
}
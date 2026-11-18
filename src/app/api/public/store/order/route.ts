import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizePhone(p: string) {
  return p.replace(/[^0-9]/g, "");
}

export async function POST(req: Request) {
  try {
    const { slug, pickupCode, clientPhone, action } = await req.json();

    if (!slug || !pickupCode?.trim() || !clientPhone?.trim()) {
      return NextResponse.json(
        { error: "Code de retrait et numéro de téléphone requis." },
        { status: 400 }
      );
    }

    const { data: settings } = await supabaseAdmin
      .from("business_settings")
      .select("business_id")
      .eq("slug", slug)
      .maybeSingle();

    if (!settings) {
      return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });
    }

    const { data: order } = await supabaseAdmin
      .from("store_sales")
      .select("id, client_name, client_phone, total_amount, status, pickup_code")
      .eq("business_id", settings.business_id)
      .eq("pickup_code", pickupCode.trim().toUpperCase())
      .maybeSingle();

    if (!order || normalizePhone(order.client_phone || "") !== normalizePhone(clientPhone)) {
      return NextResponse.json(
        { error: "Commande introuvable ou téléphone incorrect." },
        { status: 404 }
      );
    }

    if (action === "cancel") {
      if (order.status !== "pending") {
        return NextResponse.json(
          { error: "Seules les commandes en attente peuvent être annulées." },
          { status: 400 }
        );
      }

      const { error: cancelErr } = await supabaseAdmin
        .from("store_sales")
        .update({ status: "canceled" })
        .eq("id", order.id)
        .eq("business_id", settings.business_id);

      if (cancelErr) throw new Error(cancelErr.message);
      return NextResponse.json({ order: { ...order, status: "canceled" } });
    }

    return NextResponse.json({ order });
  } catch (err: any) {
    console.error("Erreur POST /api/public/store/order:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
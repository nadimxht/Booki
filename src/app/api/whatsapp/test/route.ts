import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVO_URL = process.env.EVOLUTION_API_URL!;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

export async function POST(req: Request) {
  try {
    const { businessId, to } = await req.json();
    if (!businessId || !to) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // 1. Récupérer l'instance_id du salon
    const { data: config } = await supabaseAdmin
      .from("whatsapp_configs")
      .select("instance_id")
      .eq("business_id", businessId)
      .single();

    if (!config?.instance_id) {
      return NextResponse.json({ error: "Configuration WhatsApp introuvable" }, { status: 404 });
    }

    const cleanPhone = to.replace(/[^0-9]/g, "");
    const text = "👋 Test réussi ! Vos rappels WhatsApp Booki sont prêts à l'emploi pour votre salon.";

    // 2. Envoyer le message via l'Evolution API
    const res = await fetch(`${EVO_URL}/message/sendText/${config.instance_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVO_KEY,
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: text,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Échec de l'envoi du message test");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erreur API /whatsapp/test:", err);
    return NextResponse.json({ error: err.message || "Erreur serveur" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Utilisation du client Admin Supabase pour contourner les RLS côté serveur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVO_URL = process.env.EVOLUTION_API_URL!;
const EVO_KEY = process.env.EVOLUTION_API_KEY!;

export async function POST(req: Request) {
  try {
    const { businessId } = await req.json();

    if (!businessId) {
      return NextResponse.json(
        { error: "Paramètre businessId manquant" },
        { status: 400 }
      );
    }

    // Nom unique de l'instance par salon (sans tirets pour l'API Evolution)
    const instanceName = `booki_${businessId.replace(/-/g, "")}`;

    // 1. Vérifier l'état de la connexion auprès de l'Evolution API
    const stateResponse = await fetch(
      `${EVO_URL}/instance/connectionState/${instanceName}`,
      {
        headers: { apikey: EVO_KEY },
      }
    );

    if (stateResponse.ok) {
      const stateData = await stateResponse.json();
      const currentState = stateData?.instance?.state;

      if (currentState === "open") {
        return NextResponse.json({
          status: "connected",
          instanceName,
        });
      }
    }

    // 2. Si l'instance n'existe pas ou est déconnectée, tenter de récupérer le QR code existant
    const connectResponse = await fetch(
      `${EVO_URL}/instance/connect/${instanceName}`,
      {
        headers: { apikey: EVO_KEY },
      }
    );

    if (connectResponse.ok) {
      const connectData = await connectResponse.json();
      if (connectData?.base64) {
        return NextResponse.json({
          status: "qr_ready",
          qrBase64: connectData.base64,
          instanceName,
        });
      }
    }

    // 3. Si l'instance n'existe pas du tout, la créer de zéro
    const createResponse = await fetch(`${EVO_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVO_KEY,
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      throw new Error(
        createData?.message || "Échec de la création de l'instance Evolution API"
      );
    }

    // 4. Enregistrer ou mettre à jour la référence dans Supabase
    await supabaseAdmin.from("whatsapp_configs").upsert(
      {
        business_id: businessId,
        provider: "evolution",
        instance_id: instanceName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id" }
    );

    // Retourner le QR code initial généré lors de la création
    const qrBase64 =
      createData?.qrcode?.base64 || createData?.base64 || null;

    return NextResponse.json({
      status: qrBase64 ? "qr_ready" : "disconnected",
      qrBase64,
      instanceName,
    });
  } catch (err: any) {
    console.error("Erreur API /whatsapp/connect:", err);
    return NextResponse.json(
      { error: err.message || "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("MISSING_SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey);
}

async function resolveBusinessBySlug(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  rawSlug: string
) {
  const cleanSlug = decodeURIComponent(rawSlug).trim();

  const { data: settingsRows } = await supabaseAdmin
    .from("business_settings")
    .select("business_id, name, location, working_hours")
    .ilike("slug", cleanSlug)
    .limit(1);

  if (settingsRows && settingsRows.length > 0) {
    return settingsRows[0];
  }

  const { data: bizRows } = await supabaseAdmin
    .from("businesses")
    .select("id, name, slug")
    .ilike("slug", cleanSlug)
    .limit(1);

  if (!bizRows || bizRows.length === 0) return null;

  const biz = bizRows[0];
  const { data: linkedRows } = await supabaseAdmin
    .from("business_settings")
    .select("business_id, name, location, working_hours")
    .eq("business_id", biz.id)
    .limit(1);

  const linked: Record<string, any> | undefined = linkedRows?.[0];
  return {
    business_id: biz.id,
    name: linked?.name || biz.name,
    location: linked?.location || null,
    working_hours: linked?.working_hours || null,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      slug,
      serviceId,
      staffId,
      bookingDate,
      startTime,
      promoCode,
      clientName,
      clientPhone,
      clientEmail,
      checkPromoOnly,
    } = body;

    if (!slug || !serviceId) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const settings = await resolveBusinessBySlug(supabaseAdmin, slug);

    if (!settings) {
      return NextResponse.json({ error: "Salon introuvable" }, { status: 404 });
    }

    const { data: service } = await supabaseAdmin
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("id", serviceId)
      .eq("business_id", settings.business_id)
      .maybeSingle();

    if (!service) {
      return NextResponse.json({ error: "Prestation introuvable" }, { status: 404 });
    }

    let finalPrice = Number(service.price);
    let validPromo: { code: string; discount_type: string; discount_value: number } | null = null;

    if (promoCode && String(promoCode).trim()) {
      const codeClean = String(promoCode).trim().toUpperCase();
      const { data: promo } = await supabaseAdmin
        .from("promo_codes")
        .select("*")
        .eq("business_id", settings.business_id)
        .eq("code", codeClean)
        .eq("is_active", true)
        .maybeSingle();

      if (!promo) {
        return NextResponse.json({ error: "Code promo invalide ou introuvable." }, { status: 400 });
      }
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return NextResponse.json({ error: "Ce code promo a expiré." }, { status: 400 });
      }
      if (promo.min_purchase && finalPrice < Number(promo.min_purchase)) {
        return NextResponse.json(
          { error: `Montant minimum requis pour ce code : ${promo.min_purchase} TND.` },
          { status: 400 }
        );
      }

      if (promo.discount_type === "percent") {
        finalPrice = Math.max(0, finalPrice * (1 - Number(promo.discount_value) / 100));
      } else {
        finalPrice = Math.max(0, finalPrice - Number(promo.discount_value));
      }

      validPromo = {
        code: promo.code,
        discount_type: promo.discount_type,
        discount_value: Number(promo.discount_value),
      };
    }

    if (checkPromoOnly) {
      return NextResponse.json({ promo: validPromo, finalPrice });
    }

    if (!staffId || !bookingDate || !startTime || !clientName?.trim() || !clientPhone?.trim()) {
      return NextResponse.json({ error: "Veuillez remplir tous les champs requis." }, { status: 400 });
    }

    const { data: staff } = await supabaseAdmin
      .from("employees")
      .select("id, name")
      .eq("id", staffId)
      .eq("business_id", settings.business_id)
      .maybeSingle();

    if (!staff) {
      return NextResponse.json({ error: "Praticien invalide" }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || !/^\d{2}:\d{2}$/.test(startTime)) {
      return NextResponse.json({ error: "Date ou heure invalide" }, { status: 400 });
    }

    const [h, m] = startTime.split(":").map(Number);
    const startMins = h * 60 + m;
    const endMins = startMins + Number(service.duration_minutes);
    const endTime = `${String(Math.floor(endMins / 60)).padStart(2, "0")}:${String(
      endMins % 60
    ).padStart(2, "0")}`;

    const cleanEmail = (clientEmail || "").trim().slice(0, 120);

    const { data: bookingId, error: rpcError } = await supabaseAdmin.rpc("insert_booking_atomic", {
      p_business_id: settings.business_id,
      p_client_name: clientName.trim().slice(0, 100),
      p_client_whatsapp: clientPhone.trim().slice(0, 30),
      p_client_email: cleanEmail,
      p_service_id: service.id,
      p_employee_id: staff.id,
      p_booking_date: bookingDate,
      p_start_time: startTime,
      p_end_time: endTime,
      p_total_price: Number(finalPrice.toFixed(2)),
    });

    if (rpcError) {
      if (rpcError.message?.includes("SLOT_TAKEN")) {
        return NextResponse.json(
          { error: "Ce créneau vient d'être réservé. Veuillez en choisir un autre." },
          { status: 409 }
        );
      }
      throw new Error(rpcError.message);
    }

    if (cleanEmail && process.env.RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Booki Confirmation <onboarding@resend.dev>",
            to: [cleanEmail],
            subject: `Confirmation RDV chez ${settings.name}`,
            html: `
              <div style="font-family:sans-serif;line-height:1.6;color:#0f172a">
                <h2>Votre rendez-vous est confirmé ✅</h2>
                <p>Bonjour <strong>${clientName.trim()}</strong>,</p>
                <p>Votre réservation chez <strong>${settings.name}</strong> est enregistrée :</p>
                <ul>
                  <li><strong>Prestation :</strong> ${service.name}</li>
                  <li><strong>Avec :</strong> ${staff.name}</li>
                  <li><strong>Date :</strong> ${bookingDate}</li>
                  <li><strong>Heure :</strong> ${startTime} - ${endTime}</li>
                  <li><strong>Tarif :</strong> ${Number(finalPrice).toFixed(2)} TND</li>
                  ${settings.location ? `<li><strong>Adresse :</strong> ${settings.location}</li>` : ""}
                </ul>
                <p>Vous recevrez un rappel automatique la veille de votre rendez-vous.</p>
              </div>
            `,
          }),
        });
      } catch (mailErr) {
        console.error("Confirmation email skipped:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      bookingId,
      finalPrice,
      endTime,
    });
  } catch (err: any) {
    console.error("Erreur POST /api/public/book:", err.message);
    return NextResponse.json({ error: "Erreur lors de la réservation." }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Compute tomorrow's date in Tunisia (UTC+1)
    const nowTunis = new Date(Date.now() + 60 * 60 * 1000);
    nowTunis.setUTCDate(nowTunis.getUTCDate() + 1);
    const tomorrow = nowTunis.toISOString().slice(0, 10);

    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select("id, business_id, client_id, service_id, client_name, booking_date, start_time")
      .eq("booking_date", tomorrow)
      .eq("status", "still")
      .is("reminder_sent_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        ok: true,
        tomorrow,
        bookingsFound: 0,
        sentCount: 0,
      });
    }

    const clientIds = [...new Set(bookings.map((b) => b.client_id).filter(Boolean))];
    const serviceIds = [...new Set(bookings.map((b) => b.service_id).filter(Boolean))];
    const bizIds = [...new Set(bookings.map((b) => b.business_id).filter(Boolean))];

    const [clientsRes, servicesRes, settingsRes] = await Promise.all([
      clientIds.length
        ? supabaseAdmin.from("clients").select("id, email").in("id", clientIds)
        : Promise.resolve({ data: [] }),
      serviceIds.length
        ? supabaseAdmin.from("services").select("id, name").in("id", serviceIds)
        : Promise.resolve({ data: [] }),
      bizIds.length
        ? supabaseAdmin.from("business_settings").select("business_id, name").in("business_id", bizIds)
        : Promise.resolve({ data: [] }),
    ]);

    const emailByClient = new Map((clientsRes.data || []).map((c: any) => [c.id, c.email]));
    const nameByService = new Map((servicesRes.data || []).map((s: any) => [s.id, s.name]));
    const nameByBiz = new Map((settingsRes.data || []).map((s: any) => [s.business_id, s.name]));

    let sentCount = 0;
    const errors: string[] = [];

    for (const b of bookings) {
      const email = emailByClient.get(b.client_id);
      if (!email) continue;

      const salonName = nameByBiz.get(b.business_id) || "Votre Salon";
      const serviceName = nameByService.get(b.service_id) || "Prestation";

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Booki Rappels <onboarding@resend.dev>",
          to: [email],
          subject: `Rappel : votre rendez-vous demain chez ${salonName}`,
          html: `
            <div style="font-family:sans-serif;line-height:1.6;color:#0f172a">
              <h2>Bonjour ${b.client_name} 👋</h2>
              <p>Ceci est un rappel automatique pour votre rendez-vous demain chez <strong>${salonName}</strong> :</p>
              <ul>
                <li><strong>Prestation :</strong> ${serviceName}</li>
                <li><strong>Date :</strong> ${b.booking_date}</li>
                <li><strong>Heure :</strong> ${String(b.start_time).slice(0, 5)}</li>
              </ul>
              <p>À demain !</p>
            </div>
          `,
        }),
      });

      if (res.ok) {
        await supabaseAdmin
          .from("bookings")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", b.id);
        sentCount++;
      } else {
        const errBody = await res.text();
        console.error("Resend error for booking", b.id, errBody);
        errors.push(errBody);
      }
    }

    return NextResponse.json({
      ok: true,
      tomorrow,
      bookingsFound: bookings.length,
      sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
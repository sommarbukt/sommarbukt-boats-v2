import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Called daily by Vercel Cron (see vercel.json) so the free-tier Supabase
// project is not paused for inactivity. Vercel sends CRON_SECRET as a bearer token.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("Keepalive error: CRON_SECRET is not set.");
    return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Keepalive error: Supabase settings are incomplete.");
    return NextResponse.json({ error: "Supabase settings are incomplete." }, { status: 500 });
  }

  // Read-only pings did not stop the pause; keepalive() writes a timestamp
  // to the single-row public.keepalive table.
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error, status } = await supabase.rpc("keepalive");
  if (error) {
    console.error(`Keepalive error: Supabase responded with HTTP ${status}:`, error.message);
    return NextResponse.json({ error: error.message, status }, { status: 502 });
  }

  console.log(`Keepalive ok: pinged_at = ${data}`);
  return NextResponse.json({ success: true, pingedAt: data });
}

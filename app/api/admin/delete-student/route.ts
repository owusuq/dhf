import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-only. SUPABASE_SERVICE_ROLE_KEY must NOT start with NEXT_PUBLIC_.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  try {
    // 1. Who is calling? Read the login token sent by the browser.
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const asCaller = createClient(url, anonKey);
    const { data: caller, error: callerErr } = await asCaller.auth.getUser(token);
    if (callerErr || !caller.user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // 2. Powerful client (bypasses row-level security). Never send this to the browser.
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Is the caller really an admin?
    const { data: me } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", caller.user.id)
      .single();
    if (!me?.is_admin) {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }

    // 4. Which student?
    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (userId === caller.user.id) {
      return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });
    }

    // 5. Don't allow deleting other admins by accident.
    const { data: target } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();
    if (target?.is_admin) {
      return NextResponse.json(
        { error: "Remove admin rights first before deleting this account" },
        { status: 400 }
      );
    }

    // 6. Delete the login (email + password). This also signs them out for good.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // 7. Delete their profile row (a no-op if your schema already cascades).
    await admin.from("profiles").delete().eq("id", userId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

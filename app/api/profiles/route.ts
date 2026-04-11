import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getAuthUserFromRequest } from "@/lib/supabase-server-auth";

export async function GET(request: Request) {
  const { user, error: authError } = await getAuthUserFromRequest(request);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,role,school,instructor_id,phone,start_date")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthUserFromRequest(request);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const { name, role, school, instructor_id, phone, start_date } = payload;

  if (!name || !role || !school || !start_date) {
    return NextResponse.json({ error: "Missing required profile fields." }, { status: 400 });
  }

  const profile = {
    id: user.id,
    name,
    role,
    school,
    instructor_id: instructor_id || null,
    phone: phone || null,
    start_date,
  };

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.from("profiles").upsert(profile, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

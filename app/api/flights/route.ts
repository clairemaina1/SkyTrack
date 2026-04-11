import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getAuthUserFromRequest } from "@/lib/supabase-server-auth";

export async function GET(request: Request) {
  const { user, error: authError } = await getAuthUserFromRequest(request);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data: profile, error: profileError } = await supabaseServer
    .from("profiles")
    .select("role,instructor_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  let query = supabaseServer.from("flights").select("*").limit(100);
  if (profile.role === "instructor") {
    query = query.eq("instructor_id", user.id);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthUserFromRequest(request);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { date, type, reg, instructor, dur, notes } = body;

  if (!date || !type || !reg || !instructor || dur === undefined || dur === null) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const duration = Number(dur);
  if (Number.isNaN(duration)) {
    return NextResponse.json({ error: "Duration must be a valid number." }, { status: 400 });
  }

  const supabaseServer = getSupabaseServer();
  const { data: profile, error: profileError } = await supabaseServer
    .from("profiles")
    .select("role,instructor_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const newRow = {
    user_id: user.id,
    instructor_id: profile.role === "instructor" ? user.id : profile.instructor_id,
    date,
    type,
    reg,
    inst: instructor,
    dur: duration,
    notes: notes ?? null,
  };

  const { error } = await supabaseServer.from("flights").insert([newRow]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: newRow }, { status: 201 });
}

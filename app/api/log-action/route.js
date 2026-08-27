import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseClient";

export const runtime = "nodejs";

// Logs the agent's edit / approval action against the most recent
// interaction for a conversation, so we have a full trail:
// AI-generated -> agent-edited -> final approved response.
export async function POST(req) {
  try {
    const body = await req.json();
    const { conversationId, editedResponse, finalResponse, action } = body;

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ ok: true, skipped: "supabase not configured" });
    }

    const { data: rows, error: findErr } = await supabase
      .from("reply_interactions")
      .select("id")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (findErr || !rows?.length) {
      return NextResponse.json({ ok: false, error: findErr?.message || "No prior interaction found" }, { status: 404 });
    }

    const { error: updateErr } = await supabase
      .from("reply_interactions")
      .update({
        edited_response: editedResponse ?? null,
        final_response: finalResponse,
        agent_action: action, // "edited" | "approved"
      })
      .eq("id", rows[0].id);

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

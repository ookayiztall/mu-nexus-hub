import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: raffles, error } = await supabase
      .from("raffles")
      .select("id")
      .eq("status", "active")
      .lte("end_at", new Date().toISOString());

    if (error) throw error;

    const results: Array<{ id: string; winner_id: string | null; participants: number }> = [];

    for (const r of raffles ?? []) {
      const { data: entries } = await supabase
        .from("raffle_entries")
        .select("user_id")
        .eq("raffle_id", r.id);

      let winnerId: string | null = null;
      if (entries && entries.length > 0) {
        // Cryptographically random selection
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        const idx = buf[0] % entries.length;
        winnerId = entries[idx].user_id;
      }

      await supabase
        .from("raffles")
        .update({ status: "completed", winner_id: winnerId })
        .eq("id", r.id);

      results.push({ id: r.id, winner_id: winnerId, participants: entries?.length ?? 0 });
    }

    return new Response(JSON.stringify({ closed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

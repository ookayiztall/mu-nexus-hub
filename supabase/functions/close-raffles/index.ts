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

    const results: Array<{
      id: string;
      winner_id: string | null;
      participants: number;
      draw_id?: string;
      seed?: string;
      winner_index?: number | null;
    }> = [];

    for (const r of raffles ?? []) {
      const { data: entries } = await supabase
        .from("raffle_entries")
        .select("user_id, created_at")
        .eq("raffle_id", r.id)
        .order("created_at", { ascending: true });

      const participantIds = (entries ?? []).map((e) => e.user_id);
      const n = participantIds.length;

      // Cryptographically-secure seed we can persist for audit
      const seedBuf = new Uint8Array(32);
      crypto.getRandomValues(seedBuf);
      const seedHex = Array.from(seedBuf)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      let winnerId: string | null = null;
      let winnerIndex: number | null = null;
      if (n > 0) {
        // Derive index from first 4 bytes of seed (uint32) mod n
        const idxBuf = seedBuf.slice(0, 4);
        const idx =
          ((idxBuf[0] << 24) | (idxBuf[1] << 16) | (idxBuf[2] << 8) | idxBuf[3]) >>> 0;
        winnerIndex = idx % n;
        winnerId = participantIds[winnerIndex];
      }

      await supabase
        .from("raffles")
        .update({ status: "completed", winner_id: winnerId })
        .eq("id", r.id);

      const { data: draw } = await supabase
        .from("raffle_draws")
        .insert({
          raffle_id: r.id,
          winner_user_id: winnerId,
          participant_count: n,
          participant_ids: participantIds,
          random_seed: seedHex,
          random_source: "Deno.crypto.getRandomValues (CSPRNG)",
          winner_index: winnerIndex,
          algorithm: "sha-free: seed[0..3] as uint32 BE, mod participant_count (ordered by entry created_at asc)",
        })
        .select("id")
        .maybeSingle();

      results.push({
        id: r.id,
        winner_id: winnerId,
        participants: n,
        draw_id: draw?.id,
        seed: seedHex,
        winner_index: winnerIndex,
      });
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

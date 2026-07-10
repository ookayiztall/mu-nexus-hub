import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivateRequest {
  stripeSessionId?: string;
  paypalOrderId?: string;
  draftId: string;
  draftType: "server" | "advertisement" | "text_server" | "promo" | "banner";
  slotId: number;
  durationDays: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ActivateRequest = await req.json();
    const { stripeSessionId, paypalOrderId, draftId, draftType, slotId, durationDays } = body;

    // Validate required fields
    if (!draftId || !draftType || !slotId || !durationDays) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: draftId, draftType, slotId, durationDays" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Activate draft request:", { 
      userId: user.id, 
      draftId, 
      draftType, 
      slotId, 
      durationDays,
      stripeSessionId: stripeSessionId ? "provided" : "none",
      paypalOrderId: paypalOrderId ? "provided" : "none"
    });

    // Create admin client for updates
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Payment verification is REQUIRED. Refuse if no payment reference provided.
    if (!stripeSessionId && !paypalOrderId) {
      return new Response(
        JSON.stringify({ error: "Payment reference required" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let paymentVerified = false;

    // Verify Stripe session
    if (stripeSessionId) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) {
        return new Response(
          JSON.stringify({ error: "Payment provider not configured" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

      let session;
      try {
        session = await stripe.checkout.sessions.retrieve(stripeSessionId);
      } catch (stripeError) {
        console.error("Stripe session verification failed:", stripeError);
        return new Response(
          JSON.stringify({ error: "Unable to verify payment session" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (session.payment_status !== "paid") {
        return new Response(
          JSON.stringify({ error: "Payment not completed", status: session.payment_status }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the session belongs to this user and this draft
      const md = session.metadata ?? {};
      if (md.user_id && md.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Payment does not belong to this user" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (md.draft_id && md.draft_id !== draftId) {
        return new Response(
          JSON.stringify({ error: "Payment does not match requested draft" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (md.slot_id && Number(md.slot_id) !== Number(slotId)) {
        return new Response(
          JSON.stringify({ error: "Payment does not match requested slot" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      paymentVerified = true;
    }

    // Verify PayPal order
    if (!paymentVerified && paypalOrderId) {
      const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
      const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: "PayPal not configured" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const isSandbox = clientId.startsWith("sb-") || clientId.startsWith("A");
      const baseUrl = isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";

      const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: "grant_type=client_credentials",
      });
      if (!authResponse.ok) {
        return new Response(
          JSON.stringify({ error: "PayPal auth failed" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const authData = await authResponse.json();
      const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}`, {
        headers: {
          "Authorization": `Bearer ${authData.access_token}`,
          "Content-Type": "application/json",
        },
      });
      if (!orderResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Unable to verify PayPal order" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const orderData = await orderResponse.json();
      if (orderData.status !== "COMPLETED") {
        return new Response(
          JSON.stringify({ error: "PayPal payment not completed", status: orderData.status }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Verify the order's custom_id references this user and draft
      const customId = orderData.purchase_units?.[0]?.custom_id;
      if (customId) {
        try {
          const customData = JSON.parse(customId);
          if (customData.user_id && customData.user_id !== user.id) {
            return new Response(
              JSON.stringify({ error: "PayPal order does not belong to this user" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (customData.draft_id && customData.draft_id !== draftId) {
            return new Response(
              JSON.stringify({ error: "PayPal order does not match requested draft" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch {
          // custom_id not JSON, fall through — reject to be safe
          return new Response(
            JSON.stringify({ error: "PayPal order reference invalid" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      paymentVerified = true;
    }

    if (!paymentVerified) {
      return new Response(
        JSON.stringify({ error: "Payment verification failed" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    const expiresAtIso = expiresAt.toISOString();

    // Determine table and activate the draft
    let updateError: { message: string } | null = null;

    switch (draftType) {
      case "server": {
        const { error } = await supabaseAdmin
          .from("servers")
          .update({ 
            is_active: true, 
            expires_at: expiresAtIso,
            slot_id: slotId
          })
          .eq("id", draftId)
          .eq("user_id", user.id);
        updateError = error;
        break;
      }

      case "advertisement": {
        const { error } = await supabaseAdmin
          .from("advertisements")
          .update({ 
            is_active: true, 
            expires_at: expiresAtIso,
            slot_id: slotId
          })
          .eq("id", draftId)
          .eq("user_id", user.id);
        updateError = error;
        break;
      }

      case "text_server": {
        const { error } = await supabaseAdmin
          .from("premium_text_servers")
          .update({ 
            is_active: true, 
            expires_at: expiresAtIso,
            slot_id: slotId
          })
          .eq("id", draftId)
          .eq("user_id", user.id);
        updateError = error;
        break;
      }

      case "promo": {
        const { error } = await supabaseAdmin
          .from("rotating_promos")
          .update({ 
            is_active: true, 
            expires_at: expiresAtIso,
            slot_id: slotId
          })
          .eq("id", draftId)
          .eq("user_id", user.id);
        updateError = error;
        break;
      }

      case "banner": {
        const { error } = await supabaseAdmin
          .from("premium_banners")
          .update({ 
            is_active: true,
            slot_id: slotId
          })
          .eq("id", draftId);
        updateError = error;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown draft type: ${draftType}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (updateError) {
      console.error(`Failed to activate ${draftType}:`, updateError);
      return new Response(
        JSON.stringify({ error: `Failed to activate draft: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully activated ${draftType} ${draftId} until ${expiresAtIso}`);

    // Also create/update slot_purchase record
    await supabaseAdmin.from("slot_purchases").upsert({
      user_id: user.id,
      slot_id: slotId,
      is_active: true,
      expires_at: expiresAtIso,
      completed_at: new Date().toISOString(),
      product_type: draftType,
      stripe_session_id: stripeSessionId || null,
    }, {
      onConflict: "user_id,slot_id"
    }).select();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Draft activated successfully",
        expiresAt: expiresAtIso,
        draftId,
        draftType
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Activate draft error:", error);
    const message = error instanceof Error ? error.message : "Failed to activate draft";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

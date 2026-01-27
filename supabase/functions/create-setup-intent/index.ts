import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetupIntentRequest {
  sessionId?: string; // For finalization
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ 
          error: "Payment system not configured. Please contact support.",
          code: "STRIPE_NOT_CONFIGURED",
          needsConfiguration: true 
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required", code: "UNAUTHORIZED" }),
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
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication", code: "INVALID_AUTH" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Import Stripe dynamically
    const Stripe = (await import("https://esm.sh/stripe@14.21.0")).default;
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Parse request body
    let body: SetupIntentRequest = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is fine for initial request
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // If sessionId provided, this is a finalization request
    if (body.sessionId) {
      console.log("Finalizing setup session:", body.sessionId);
      
      // Retrieve the checkout session
      const session = await stripe.checkout.sessions.retrieve(body.sessionId, {
        expand: ["setup_intent", "setup_intent.payment_method"],
      });

      if (!session) {
        return new Response(
          JSON.stringify({ error: "Session not found", code: "SESSION_NOT_FOUND" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify session belongs to this user by checking customer email
      const customer = await stripe.customers.retrieve(session.customer as string);
      if (customer.deleted || (customer as any).email !== user.email) {
        return new Response(
          JSON.stringify({ error: "Session does not belong to this user", code: "SESSION_MISMATCH" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the setup intent and payment method
      const setupIntent = session.setup_intent as any;
      if (!setupIntent || setupIntent.status !== "succeeded") {
        return new Response(
          JSON.stringify({ error: "Setup was not completed", code: "SETUP_INCOMPLETE" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const paymentMethod = setupIntent.payment_method;
      if (!paymentMethod) {
        return new Response(
          JSON.stringify({ error: "No payment method found", code: "NO_PAYMENT_METHOD" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract card details
      const card = paymentMethod.card || {};
      const lastFour = card.last4 || null;
      const cardBrand = card.brand || null;

      // Check if this payment method already exists
      const { data: existingMethod } = await supabaseAdmin
        .from("user_payment_methods")
        .select("id")
        .eq("user_id", user.id)
        .eq("stripe_payment_method_id", paymentMethod.id)
        .maybeSingle();

      if (existingMethod) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Payment method already saved",
            paymentMethodId: existingMethod.id 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user has any existing payment methods
      const { data: existingMethods } = await supabaseAdmin
        .from("user_payment_methods")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      const isDefault = !existingMethods || existingMethods.length === 0;

      // Save the payment method
      const { data: savedMethod, error: saveError } = await supabaseAdmin
        .from("user_payment_methods")
        .insert({
          user_id: user.id,
          payment_type: "stripe",
          stripe_customer_id: session.customer as string,
          stripe_payment_method_id: paymentMethod.id,
          last_four: lastFour,
          card_brand: cardBrand,
          is_default: isDefault,
        })
        .select()
        .single();

      if (saveError) {
        console.error("Failed to save payment method:", saveError);
        return new Response(
          JSON.stringify({ error: "Failed to save payment method", code: "SAVE_FAILED" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Payment method saved:", savedMethod.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Payment method saved successfully",
          paymentMethodId: savedMethod.id,
          lastFour,
          cardBrand,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initial request - create a setup session
    console.log("Creating setup session for user:", user.id);

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // Create a Checkout Session in setup mode
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "setup",
      success_url: `${req.headers.get("origin") || "https://example.com"}/buyer-dashboard?setup_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin") || "https://example.com"}/buyer-dashboard?setup_canceled=true`,
      metadata: {
        user_id: user.id,
        purpose: "add_payment_method",
      },
    });

    console.log("Setup session created:", session.id);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Setup intent error:", error);
    const message = error instanceof Error ? error.message : "Failed to process request";
    return new Response(
      JSON.stringify({ error: message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

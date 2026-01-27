import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CaptureRequest {
  orderId: string;
}

async function getPayPalAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error("PayPal credentials not configured");
    return null;
  }

  const isSandbox = clientId.startsWith("sb-") || clientId.startsWith("A");
  const baseUrl = isSandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    console.error("Failed to get PayPal access token:", await response.text());
    return null;
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { orderId }: CaptureRequest = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Order ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Capturing PayPal order:", orderId);

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();
    if (!accessToken) {
      return new Response(
        JSON.stringify({ 
          error: "PayPal is not configured",
          needsConfiguration: true 
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine environment
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID") || "";
    const isSandbox = clientId.startsWith("sb-") || clientId.startsWith("A");
    const baseUrl = isSandbox
      ? "https://api-m.sandbox.paypal.com"
      : "https://api-m.paypal.com";

    // First, get the order details to retrieve metadata
    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error("Failed to get PayPal order:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve order details" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderData = await orderResponse.json();
    console.log("Order data:", JSON.stringify(orderData, null, 2));

    // Check if already captured
    if (orderData.status === "COMPLETED") {
      console.log("Order already captured");
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: "COMPLETED",
          message: "Order was already captured" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Capture the payment
    const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!captureResponse.ok) {
      const errorText = await captureResponse.text();
      console.error("Failed to capture PayPal payment:", errorText);
      return new Response(
        JSON.stringify({ error: "Payment capture failed", details: errorText }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const captureData = await captureResponse.json();
    console.log("Capture response:", JSON.stringify(captureData, null, 2));

    // Parse the reference_id to get purchase details
    // Format: slot_SLOTID_USERID or listing_LISTINGID_USERID
    const purchaseUnit = orderData.purchase_units?.[0];
    const referenceId = purchaseUnit?.reference_id || "";
    const parts = referenceId.split("_");
    
    const productType = parts[0] || "unknown";
    const productId = parts[1] || null;
    const userId = parts[2] || null;

    const amount = parseFloat(purchaseUnit?.amount?.value || "0");
    const amountCents = Math.round(amount * 100);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // If this is a slot purchase, activate it
    if (productType === "slot" && productId && userId) {
      const slotId = parseInt(productId, 10);
      
      // Find the pending slot purchase
      const { data: pendingPurchase, error: findError } = await supabaseAdmin
        .from("slot_purchases")
        .select("*")
        .eq("user_id", userId)
        .eq("slot_id", slotId)
        .is("completed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingPurchase) {
        // Calculate expiration (default 30 days if no package)
        const durationDays = 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        // Update the slot purchase
        await supabaseAdmin
          .from("slot_purchases")
          .update({
            completed_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            is_active: true,
          })
          .eq("id", pendingPurchase.id);

        console.log(`Activated slot ${slotId} for user ${userId}`);
      }
    }

    // If this is a listing purchase, update it
    if (productType === "listing" && productId && userId) {
      const { data: pendingPurchase } = await supabaseAdmin
        .from("listing_purchases")
        .select("*")
        .eq("user_id", userId)
        .eq("listing_id", productId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingPurchase) {
        await supabaseAdmin
          .from("listing_purchases")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", pendingPurchase.id);

        console.log(`Completed listing purchase for ${productId}`);
      }
    }

    // Record in payments table for analytics
    if (userId) {
      await supabaseAdmin.from("payments").insert({
        user_id: userId,
        amount: amountCents,
        currency: "usd",
        status: "completed",
        product_type: productType,
        product_id: productId,
        duration_days: 30,
        completed_at: new Date().toISOString(),
        metadata: {
          payment_provider: "paypal",
          paypal_order_id: orderId,
          paypal_capture_id: captureData.id,
          environment: isSandbox ? "sandbox" : "live",
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: captureData.status,
        orderId: orderId,
        captureId: captureData.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Capture error:", error);
    const message = error instanceof Error ? error.message : "Failed to capture payment";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

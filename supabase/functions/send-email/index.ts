import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: "welcome" | "payment_success" | "password_reset" | "listing_purchased" | "listing_expiring" | "new_review";
  to: string;
  data?: Record<string, string>;
}

// Sanitize any user-controllable value before dropping it into HTML.
const esc = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return s
    .slice(0, 500)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// URL sanitizer — only allow http(s) URLs
const escUrl = (v: unknown): string => {
  const s = String(v ?? "");
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "#";
    return esc(u.toString());
  } catch {
    return "#";
  }
};

const emailTemplates = {
  welcome: (data: Record<string, string>) => ({
    subject: "Welcome to MU Online Hub!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
        <h1 style="color: #f4c430; text-align: center;">Welcome to MU Online Hub!</h1>
        <p>Hi ${esc(data.name || "there")},</p>
        <p>Thank you for joining MU Online Hub - the ultimate marketplace for MU Online servers, services, and partners.</p>
        <ul><li>List your server for free</li><li>Create advertisements</li><li>Upgrade to premium for more visibility</li></ul>
        <p style="text-align: center; margin-top: 30px;">
          <a href="${escUrl(data.siteUrl)}/dashboard" style="background: #f4c430; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
        </p>
      </div>
    `,
  }),

  payment_success: (data: Record<string, string>) => ({
    subject: "Payment Successful - MU Online Hub",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
        <h1 style="color: #f4c430; text-align: center;">Payment Successful!</h1>
        <p>Hi ${esc(data.name || "there")},</p>
        <p>Your payment for <strong>${esc(data.packageName)}</strong> has been processed successfully.</p>
        <div style="background: #2a2a4e; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount:</strong> $${esc(data.amount)}</p>
          <p><strong>Duration:</strong> ${esc(data.duration)} days</p>
          <p><strong>Expires:</strong> ${esc(data.expiresAt)}</p>
        </div>
        <p style="text-align: center; margin-top: 30px;">
          <a href="${escUrl(data.siteUrl)}/dashboard" style="background: #f4c430; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Dashboard</a>
        </p>
      </div>
    `,
  }),

  password_reset: (data: Record<string, string>) => ({
    subject: "Reset Your Password - MU Online Hub",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
        <h1 style="color: #f4c430; text-align: center;">Password Reset</h1>
        <p>Click the button below to create a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${escUrl(data.resetLink)}" style="background: #f4c430; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </p>
        <p style="color: #888; font-size: 14px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  }),

  listing_purchased: (data: Record<string, string>) => ({
    subject: "Your Listing Was Purchased! - MU Online Hub",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
        <h1 style="color: #f4c430; text-align: center;">🎉 You Made a Sale!</h1>
        <p>Hi ${esc(data.sellerName || "there")},</p>
        <div style="background: #2a2a4e; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Listing:</strong> ${esc(data.listingTitle)}</p>
          <p><strong>Amount:</strong> $${esc(data.amount)}</p>
          <p><strong>Buyer:</strong> ${esc(data.buyerEmail)}</p>
        </div>
        <p style="text-align: center;"><a href="${escUrl(data.siteUrl)}/seller-dashboard" style="background: #f4c430; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Dashboard</a></p>
      </div>
    `,
  }),

  listing_expiring: (data: Record<string, string>) => ({
    subject: "Your Listing is Expiring Soon - MU Online Hub",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
        <h1 style="color: #f4c430; text-align: center;">⏰ Listing Expiring Soon</h1>
        <p>Hi ${esc(data.sellerName || "there")},</p>
        <div style="background: #2a2a4e; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Listing:</strong> ${esc(data.listingTitle)}</p>
          <p><strong>Expires:</strong> ${esc(data.expiresAt)}</p>
        </div>
        <p style="text-align: center;"><a href="${escUrl(data.siteUrl)}/seller-dashboard" style="background: #f4c430; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Renew Listing</a></p>
      </div>
    `,
  }),

  new_review: (data: Record<string, string>) => ({
    subject: "New Review on Your Listing! - MU Online Hub",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee;">
        <h1 style="color: #f4c430; text-align: center;">⭐ New Review Received!</h1>
        <p>Hi ${esc(data.sellerName || "there")},</p>
        <div style="background: #2a2a4e; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Listing:</strong> ${esc(data.listingTitle)}</p>
          <p><strong>Rating:</strong> ${"⭐".repeat(Math.min(5, Math.max(0, parseInt(data.rating) || 5)))}</p>
          ${data.reviewTitle ? `<p><strong>Title:</strong> ${esc(data.reviewTitle)}</p>` : ''}
          ${data.reviewContent ? `<p><strong>Review:</strong> "${esc(data.reviewContent)}"</p>` : ''}
          <p><strong>Reviewer:</strong> ${esc(data.reviewerName)}</p>
          ${data.isVerified === 'true' ? '<p style="color: #4ade80;">✓ Verified Purchase</p>' : ''}
        </div>
        <p style="text-align: center;"><a href="${escUrl(data.siteUrl)}/marketplace/${esc(data.listingId)}" style="background: #f4c430; color: #1a1a2e; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Listing</a></p>
      </div>
    `,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
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

    const { type, to, data = {} }: EmailRequest = await req.json();

    if (!type || !to) {
      return new Response(
        JSON.stringify({ error: "Missing type or recipient" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic recipient validation
    if (typeof to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) {
      return new Response(
        JSON.stringify({ error: "Invalid recipient email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Restrict recipient: users can only email themselves, unless admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: adminRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!adminRow;
    if (!isAdmin && to.toLowerCase() !== (user.email ?? "").toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "You can only send email to your own address" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Size-limit metadata
    if (JSON.stringify(data).length > 10 * 1024) {
      return new Response(
        JSON.stringify({ error: "Metadata too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const template = emailTemplates[type];
    if (!template) {
      return new Response(
        JSON.stringify({ error: "Unknown email type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = template(data);

    const emailResponse = await resend.emails.send({
      from: "MU Online Hub <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Email error:", error);
    const message = error instanceof Error ? error.message : "Failed to send email";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

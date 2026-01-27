-- Add RLS policy to allow authenticated users to read payment_config for paypal status
-- This fixes the issue where non-admin sellers couldn't see PayPal enablement status

-- Drop existing restrictive policy if it exists (for paypal key only)
DROP POLICY IF EXISTS "Anyone can view payment config" ON public.payment_config;

-- Create a more permissive read policy for specific config keys
CREATE POLICY "Authenticated users can view payment enablement status"
ON public.payment_config
FOR SELECT
TO authenticated
USING (config_key IN ('stripe', 'paypal', 'paypal_email'));
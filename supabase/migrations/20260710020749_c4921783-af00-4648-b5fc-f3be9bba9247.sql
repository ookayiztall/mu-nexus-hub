
-- service_role bypasses RLS; these policies are unnecessary and trip the "always true" linter
DROP POLICY IF EXISTS "Service role manages listing purchases" ON public.listing_purchases;
DROP POLICY IF EXISTS "Service role manages payments" ON public.payments;
DROP POLICY IF EXISTS "Service role manages seller payouts" ON public.seller_payouts;
DROP POLICY IF EXISTS "Service role manages slot purchases" ON public.slot_purchases;
DROP POLICY IF EXISTS "Service role manages user stats" ON public.user_stats;
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Make aggregate view use invoker rights (not creator's)
ALTER VIEW public.server_vote_counts SET (security_invoker = true);

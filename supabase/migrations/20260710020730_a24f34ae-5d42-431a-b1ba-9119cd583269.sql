
-- ========== profiles: hide email and stripe_account_id from public/authenticated ==========
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public can view non-sensitive profile fields"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Owners and admins can view full profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Column-level restrictions: revoke broad SELECT then re-grant only non-sensitive columns
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, display_name, avatar_url, user_type, created_at, updated_at, stripe_onboarding_complete)
  ON public.profiles TO anon, authenticated;
-- Owners/admins fetch email + stripe_account_id via edge functions (service role) or the RPC below
GRANT ALL ON public.profiles TO service_role;

-- RPC so owners/admins can read their sensitive fields safely
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (
  id uuid, user_id uuid, email text, display_name text, avatar_url text,
  user_type text, stripe_account_id text, stripe_onboarding_complete boolean,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.email, p.display_name, p.avatar_url,
         p.user_type::text, p.stripe_account_id, p.stripe_onboarding_complete,
         p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- ========== seller_payment_settings: drop public policy ==========
DROP POLICY IF EXISTS "Anyone can view seller payment settings" ON public.seller_payment_settings;

-- ========== Service-role policies: scope to service_role only ==========
DROP POLICY IF EXISTS "Service role can manage purchases" ON public.listing_purchases;
CREATE POLICY "Service role manages listing purchases"
  ON public.listing_purchases FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage payments" ON public.payments;
CREATE POLICY "Service role manages payments"
  ON public.payments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage payouts" ON public.seller_payouts;
CREATE POLICY "Service role manages seller payouts"
  ON public.seller_payouts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage slot purchases" ON public.slot_purchases;
CREATE POLICY "Service role manages slot purchases"
  ON public.slot_purchases FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage all stats" ON public.user_stats;
CREATE POLICY "Service role manages user stats"
  ON public.user_stats FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ========== notifications: only service role can insert ==========
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT TO service_role
  WITH CHECK (true);

-- ========== payment_config: only expose boolean enablement flags to authenticated ==========
DROP POLICY IF EXISTS "Authenticated users can view payment enablement status" ON public.payment_config;
CREATE POLICY "Authenticated users can view enablement flags"
  ON public.payment_config FOR SELECT TO authenticated
  USING (config_key IN ('stripe_enabled', 'paypal_enabled'));

-- ========== raffle_entries: hide from public ==========
DROP POLICY IF EXISTS "Anyone can view entries" ON public.raffle_entries;
CREATE POLICY "Entrants, raffle creators, and admins view entries"
  ON public.raffle_entries FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.raffles r
      WHERE r.id = raffle_entries.raffle_id AND r.creator_id = auth.uid()
    )
  );

-- ========== user_stats: owner + admin only ==========
DROP POLICY IF EXISTS "User stats are viewable by everyone" ON public.user_stats;
CREATE POLICY "Owner and admins view user stats"
  ON public.user_stats FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- ========== server_votes: hide row-level, expose aggregate view ==========
DROP POLICY IF EXISTS "Anyone can view vote counts" ON public.server_votes;
CREATE POLICY "Voters and admins view votes"
  ON public.server_votes FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE OR REPLACE VIEW public.server_vote_counts AS
SELECT server_id, count(*)::bigint AS vote_count
FROM public.server_votes
GROUP BY server_id;
GRANT SELECT ON public.server_vote_counts TO anon, authenticated;

-- ========== Storage: drop broad public LIST/SELECT policies on the three public buckets ==========
DROP POLICY IF EXISTS "Anyone can view ad banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view premium banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view server banners" ON storage.objects;
-- Files remain publicly downloadable via CDN (buckets marked public); LIST via API is no longer allowed.

-- ========== Lock down SECURITY DEFINER functions from anon ==========
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_conversations() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_conversations() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_user_stats_on_purchase() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_badges() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.raffle_entry_count_sync() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

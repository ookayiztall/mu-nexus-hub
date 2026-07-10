
CREATE TABLE public.raffle_draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id uuid NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  winner_user_id uuid,
  participant_count integer NOT NULL DEFAULT 0,
  participant_ids uuid[] NOT NULL DEFAULT '{}',
  random_seed text NOT NULL,
  random_source text NOT NULL,
  winner_index integer,
  algorithm text NOT NULL DEFAULT 'crypto.getRandomValues:uint32-mod-n',
  drawn_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.raffle_draws TO anon, authenticated;
GRANT ALL ON public.raffle_draws TO service_role;

ALTER TABLE public.raffle_draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Raffle draws are public for verification"
  ON public.raffle_draws FOR SELECT
  USING (true);

CREATE INDEX raffle_draws_raffle_id_idx ON public.raffle_draws(raffle_id);


-- RAFFLES
CREATE TABLE public.raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  prize TEXT NOT NULL,
  banner_url TEXT,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  participant_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.raffles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raffles TO authenticated;
GRANT ALL ON public.raffles TO service_role;
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view raffles" ON public.raffles FOR SELECT USING (true);
CREATE POLICY "Users with active server can create raffles" ON public.raffles
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = creator_id
    AND EXISTS (SELECT 1 FROM public.servers WHERE user_id = auth.uid() AND is_active = true)
  );
CREATE POLICY "Creator or admin can update raffle" ON public.raffles
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id OR public.is_admin())
  WITH CHECK (auth.uid() = creator_id OR public.is_admin());
CREATE POLICY "Creator or admin can delete raffle" ON public.raffles
  FOR DELETE TO authenticated USING (auth.uid() = creator_id OR public.is_admin());

CREATE INDEX idx_raffles_status ON public.raffles(status);
CREATE INDEX idx_raffles_end_at ON public.raffles(end_at);
CREATE INDEX idx_raffles_creator ON public.raffles(creator_id);

CREATE TRIGGER raffles_updated_at BEFORE UPDATE ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RAFFLE ENTRIES
CREATE TABLE public.raffle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (raffle_id, user_id)
);
GRANT SELECT ON public.raffle_entries TO anon;
GRANT SELECT, INSERT, DELETE ON public.raffle_entries TO authenticated;
GRANT ALL ON public.raffle_entries TO service_role;
ALTER TABLE public.raffle_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view entries" ON public.raffle_entries FOR SELECT USING (true);
CREATE POLICY "Users enter active raffles once" ON public.raffle_entries
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.raffles r
      WHERE r.id = raffle_id AND r.status = 'active' AND r.end_at > now() AND r.start_at <= now()
    )
  );

CREATE INDEX idx_raffle_entries_raffle ON public.raffle_entries(raffle_id);

CREATE OR REPLACE FUNCTION public.raffle_entry_count_sync()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.raffles SET participant_count = participant_count + 1 WHERE id = NEW.raffle_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.raffles SET participant_count = GREATEST(0, participant_count - 1) WHERE id = OLD.raffle_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER raffle_entries_count_sync
  AFTER INSERT OR DELETE ON public.raffle_entries
  FOR EACH ROW EXECUTE FUNCTION public.raffle_entry_count_sync();

-- SUPPORT CONVERSATIONS
CREATE TABLE public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  user_unread_count INTEGER NOT NULL DEFAULT 0,
  admin_unread_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own convo, admins all" ON public.support_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Users create own convo" ON public.support_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own, admin any" ON public.support_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE TRIGGER support_conversations_updated_at BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SUPPORT MESSAGES
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and admins view messages" ON public.support_messages
  FOR SELECT TO authenticated USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );
CREATE POLICY "Participants and admins send messages" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()
      )
    )
  );
CREATE POLICY "Participants mark messages read" ON public.support_messages
  FOR UPDATE TO authenticated USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.support_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE INDEX idx_support_messages_convo ON public.support_messages(conversation_id, created_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.raffles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.raffle_entries;

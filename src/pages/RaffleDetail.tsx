import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Clock, Loader2, Crown, Trash2, ShieldCheck, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { SEOHead } from '@/components/SEOHead';

const RaffleDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [winner, setWinner] = useState<any>(null);
  const [draw, setDraw] = useState<any>(null);
  const [entered, setEntered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!id) return;
    load();
    const channel = supabase
      .channel(`raffle-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'raffles', filter: `id=eq.${id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'raffle_entries', filter: `raffle_id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  const load = async () => {
    if (!id) return;
    const { data: r } = await supabase.from('raffles').select('*').eq('id', id).maybeSingle();
    if (!r) { setLoading(false); return; }
    setRaffle(r);

    const { data: cp } = await supabase.from('profiles').select('user_id, display_name, avatar_url').eq('user_id', r.creator_id).maybeSingle();
    setCreator(cp);

    if (r.winner_id) {
      const { data: wp } = await supabase.from('profiles').select('user_id, display_name, avatar_url').eq('user_id', r.winner_id).maybeSingle();
      setWinner(wp);
    }

    if (r.status === 'completed') {
      const { data: d } = await supabase
        .from('raffle_draws')
        .select('*')
        .eq('raffle_id', r.id)
        .order('drawn_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setDraw(d);
    }

    if (user) {
      const { data: e } = await supabase.from('raffle_entries').select('id').eq('raffle_id', id).eq('user_id', user.id).maybeSingle();
      setEntered(!!e);
    }
    setLoading(false);
  };

  const join = async () => {
    if (!user) { navigate('/auth'); return; }
    setJoining(true);
    const { error } = await supabase.from('raffle_entries').insert({ raffle_id: id!, user_id: user.id });
    setJoining(false);
    if (error) { toast.error(error.message.includes('duplicate') ? 'You already joined this raffle' : error.message); return; }
    toast.success('You entered the raffle!');
    setEntered(true);
    load();
  };

  const cancel = async () => {
    if (!confirm('Cancel this raffle?')) return;
    const { error } = await supabase.from('raffles').update({ status: 'cancelled' }).eq('id', id!);
    if (error) { toast.error(error.message); return; }
    toast.success('Raffle cancelled');
    load();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!raffle) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Raffle not found</div>;

  const endAt = new Date(raffle.end_at).getTime();
  const remainingMs = Math.max(0, endAt - now);
  const days = Math.floor(remainingMs / 86400000);
  const hours = Math.floor((remainingMs % 86400000) / 3600000);
  const mins = Math.floor((remainingMs % 3600000) / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000);
  const isActive = raffle.status === 'active' && remainingMs > 0;
  const notStarted = new Date(raffle.start_at).getTime() > now;
  const isOwner = user?.id === raffle.creator_id;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={`${raffle.title} - Raffle`} description={raffle.description.slice(0, 160)} />
      <Header />
      <main className="container py-8 max-w-4xl">
        {raffle.banner_url && (
          <div className="aspect-[3/1] rounded-xl overflow-hidden mb-6 bg-muted">
            <img src={raffle.banner_url} alt={raffle.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-gradient-gold">{raffle.title}</h1>
            {creator && <p className="text-sm text-muted-foreground mt-1">by {creator.display_name || 'Unknown'}</p>}
          </div>
          <Badge variant={isActive ? 'default' : 'secondary'} className="text-sm">{raffle.status}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Prize</p>
              <p className="font-semibold">{raffle.prize}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Participants</p>
              <p className="font-semibold text-2xl">{raffle.participant_count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">{isActive ? 'Time Left' : 'Ended'}</p>
              <p className="font-semibold font-mono">
                {isActive ? `${days}d ${hours}h ${mins}m ${secs}s` : format(new Date(raffle.end_at), 'PPp')}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader><CardTitle>About</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap text-muted-foreground">{raffle.description}</CardContent>
        </Card>

        {winner && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-primary" /> Winner</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-lg">{winner.display_name || 'Anonymous'}</p>
              <p className="text-xs text-muted-foreground">Selected randomly from {raffle.participant_count} participants</p>
            </CardContent>
          </Card>
        )}

        {raffle.status === 'completed' && !winner && (
          <Card className="mb-6"><CardContent className="pt-6 text-muted-foreground text-center">Raffle ended with no participants.</CardContent></Card>
        )}

        <div className="flex gap-3 flex-wrap">
          {isActive && !notStarted && (
            <Button onClick={join} disabled={entered || joining || !user} size="lg">
              {joining && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {!user ? 'Sign in to enter' : entered ? '✓ You entered' : 'Join Raffle'}
            </Button>
          )}
          {notStarted && <Button disabled size="lg">Starts {formatDistanceToNow(new Date(raffle.start_at), { addSuffix: true })}</Button>}
          {isOwner && raffle.status === 'active' && (
            <Button variant="outline" onClick={cancel} className="gap-2"><Trash2 size={16} /> Cancel Raffle</Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default RaffleDetail;

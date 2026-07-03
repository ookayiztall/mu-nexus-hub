import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Clock, Plus, Loader2 } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { formatDistanceToNow } from 'date-fns';

interface Raffle {
  id: string;
  title: string;
  prize: string;
  banner_url: string | null;
  end_at: string;
  status: string;
  participant_count: number;
  winner_id: string | null;
  creator_id: string;
}

const Raffles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  useEffect(() => { load(); }, [tab]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('raffles')
      .select('*')
      .eq('status', tab === 'active' ? 'active' : 'completed')
      .order('end_at', { ascending: tab === 'active' });
    setRaffles((data as Raffle[]) || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Raffles - MU Online Hub" description="Enter raffles and win prizes from the community." />
      <Header />
      <main className="container py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-7 h-7 text-primary" />
            <h1 className="font-display text-3xl font-bold text-gradient-gold">Raffles</h1>
          </div>
          <Button onClick={() => navigate(user ? '/raffles/create' : '/auth')} className="gap-2">
            <Plus size={16} /> Create Raffle
          </Button>
        </div>

        <div className="flex gap-2 mb-6">
          <Button variant={tab === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setTab('active')}>Active</Button>
          <Button variant={tab === 'completed' ? 'default' : 'outline'} size="sm" onClick={() => setTab('completed')}>Completed</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : raffles.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No {tab} raffles yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {raffles.map(r => (
              <Link key={r.id} to={`/raffles/${r.id}`}>
                <Card className="hover:border-primary/50 transition-colors overflow-hidden">
                  {r.banner_url && (
                    <div className="aspect-video overflow-hidden bg-muted">
                      <img src={r.banner_url} alt={r.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{r.title}</CardTitle>
                      <Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-primary font-semibold flex items-center gap-1"><Trophy size={14} /> {r.prize}</p>
                    <p className="text-muted-foreground flex items-center gap-1"><Users size={14} /> {r.participant_count} participants</p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Clock size={14} />
                      {r.status === 'active'
                        ? `Ends ${formatDistanceToNow(new Date(r.end_at), { addSuffix: true })}`
                        : `Ended ${formatDistanceToNow(new Date(r.end_at), { addSuffix: true })}`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Raffles;

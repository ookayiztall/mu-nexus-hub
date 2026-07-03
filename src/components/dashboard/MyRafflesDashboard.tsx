import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export const MyRafflesDashboard = () => {
  const { user } = useAuth();
  const [raffles, setRaffles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('raffles').select('*').eq('creator_id', user.id).order('created_at', { ascending: false });
    setRaffles(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const cancel = async (id: string) => {
    if (!confirm('Cancel this raffle?')) return;
    const { error } = await supabase.from('raffles').update({ status: 'cancelled' }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Cancelled'); load();
  };
  const del = async (id: string) => {
    if (!confirm('Delete this raffle permanently?')) return;
    const { error } = await supabase.from('raffles').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); load();
  };

  if (loading) return <Loader2 className="w-6 h-6 animate-spin text-primary" />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5" /> My Raffles</CardTitle>
        <Link to="/raffles/create"><Button size="sm">Create Raffle</Button></Link>
      </CardHeader>
      <CardContent>
        {raffles.length === 0 ? (
          <p className="text-muted-foreground text-sm">You haven't created any raffles yet.</p>
        ) : (
          <div className="space-y-3">
            {raffles.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/raffles/${r.id}`} className="font-semibold hover:underline truncate">{r.title}</Link>
                    <Badge variant={r.status === 'active' ? 'default' : 'secondary'}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1"><Users size={12} />{r.participant_count}</span>
                    <span>Ends {formatDistanceToNow(new Date(r.end_at), { addSuffix: true })}</span>
                    {r.winner_id && <span className="text-primary">Winner selected</span>}
                  </p>
                </div>
                <div className="flex gap-1">
                  {r.status === 'active' && <Button size="sm" variant="outline" onClick={() => cancel(r.id)}>Cancel</Button>}
                  {r.status !== 'active' && <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 size={14} /></Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

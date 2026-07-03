import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';

const CreateRaffle = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    prize: '',
    banner_url: '',
    start_at: '',
    end_at: '',
  });

  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate('/auth'); return; }
    (async () => {
      const { count } = await supabase
        .from('servers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);
      setEligible((count ?? 0) > 0);
      setChecking(false);
    })();
  }, [user, isLoading]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title || !form.description || !form.prize || !form.end_at) {
      toast.error('Please fill all required fields');
      return;
    }
    const endAt = new Date(form.end_at);
    if (endAt <= new Date()) { toast.error('End date must be in the future'); return; }
    setSubmitting(true);
    const { data, error } = await supabase.from('raffles').insert({
      creator_id: user.id,
      title: form.title,
      description: form.description,
      prize: form.prize,
      banner_url: form.banner_url || null,
      start_at: form.start_at ? new Date(form.start_at).toISOString() : new Date().toISOString(),
      end_at: endAt.toISOString(),
    }).select().maybeSingle();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Raffle created!');
    navigate(`/raffles/${data!.id}`);
  };

  if (isLoading || checking) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Create Raffle - MU Online Hub" description="Create a community raffle." />
      <Header />
      <main className="container py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-gradient-gold mb-6">Create a Raffle</h1>

        {!eligible ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" /> Not Eligible
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                You need at least one <strong>active server listing</strong> published on the website to create a raffle.
              </p>
              <Button onClick={() => navigate('/create-server')}>Publish a Server</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={120} required />
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength={2000} required rows={4} />
                </div>
                <div>
                  <Label>Prize / Reward *</Label>
                  <Input value={form.prize} onChange={e => setForm({ ...form, prize: e.target.value })} maxLength={200} required />
                </div>
                <div>
                  <Label>Banner Image URL (optional)</Label>
                  <Input value={form.banner_url} onChange={e => setForm({ ...form, banner_url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date (optional)</Label>
                    <Input type="datetime-local" value={form.start_at} onChange={e => setForm({ ...form, start_at: e.target.value })} />
                  </div>
                  <div>
                    <Label>End Date & Time *</Label>
                    <Input type="datetime-local" value={form.end_at} onChange={e => setForm({ ...form, end_at: e.target.value })} required />
                  </div>
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Raffle
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CreateRaffle;

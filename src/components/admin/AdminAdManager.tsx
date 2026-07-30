import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/upload/ImageUpload';
import RichTextEditor from '@/components/editor/RichTextEditor';
import { marketplaceCategories, serviceCategories } from '@/lib/categories';
import { Loader2, Plus, Trash2, Pencil, ExternalLink, RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';
import type { Tables } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Advertisement = Tables<'advertisements'>;
type AdType = 'marketplace' | 'services';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);

const emptyForm = {
  title: '',
  slug: '',
  short_description: '',
  description: '',
  full_description: '',
  website: '',
  banner_url: '',
  category: '',
  price_usd: '',
  price_range: '',
  delivery_time: '',
  location: '',
  experience_level: '',
  supported_seasons: '',
  discord_link: '',
  video_url: '',
  tags: '',
  vip_level: 'none' as 'none' | 'gold' | 'diamond',
  rotation_order: '0',
  expires_at: '',
  is_active: true,
};

type FormState = typeof emptyForm;

export const AdminAdManager = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [adType, setAdType] = useState<AdType>('marketplace');
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Advertisement | null>(null);

  const categories = adType === 'marketplace' ? marketplaceCategories : serviceCategories;

  const fetchAds = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('ad_type', adType)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: 'Failed to load advertisements', variant: 'destructive' });
    } else {
      setAds(data || []);
    }
    setLoading(false);
  }, [adType, toast]);

  useEffect(() => {
    if (isAdmin) fetchAds();
  }, [isAdmin, fetchAds]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (ad: Advertisement) => {
    setForm({
      title: ad.title || '',
      slug: ad.slug || '',
      short_description: ad.short_description || '',
      description: ad.description || '',
      full_description: ad.full_description || '',
      website: ad.website || '',
      banner_url: ad.banner_url || '',
      category: ad.category || '',
      price_usd: ad.price_usd != null ? String(ad.price_usd) : '',
      price_range: ad.price_range || '',
      delivery_time: ad.delivery_time || '',
      location: ad.location || '',
      experience_level: ad.experience_level || '',
      supported_seasons: ad.supported_seasons || '',
      discord_link: ad.discord_link || '',
      video_url: ad.video_url || '',
      tags: (ad.tags || []).join(', '),
      vip_level: (ad.vip_level as FormState['vip_level']) || 'none',
      rotation_order: ad.rotation_order != null ? String(ad.rotation_order) : '0',
      expires_at: ad.expires_at ? ad.expires_at.slice(0, 10) : '',
      is_active: ad.is_active ?? true,
    });
    setEditingId(ad.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.title.trim() || !form.website.trim()) {
      toast({ title: 'Missing fields', description: 'Title and website are required', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const baseSlug = slugify(form.slug || form.title);
    const payload = {
      ad_type: adType,
      slot_id: adType === 'marketplace' ? 1 : 2,
      title: form.title.trim(),
      slug: baseSlug || null,
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      full_description: form.full_description?.trim() ? form.full_description : null,
      website: form.website.trim(),
      banner_url: form.banner_url || null,
      category: (form.category || null) as Advertisement['category'],
      price_usd: form.price_usd ? Number(form.price_usd) : null,
      price_range: form.price_range.trim() || null,
      delivery_time: form.delivery_time.trim() || null,
      location: form.location.trim() || null,
      experience_level: form.experience_level.trim() || null,
      supported_seasons: form.supported_seasons.trim() || null,
      discord_link: form.discord_link.trim() || null,
      video_url: form.video_url.trim() || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      vip_level: form.vip_level,
      rotation_order: form.rotation_order ? Number(form.rotation_order) : 0,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('advertisements').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('advertisements').insert({ ...payload, user_id: user.id }));
    }

    setSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message.includes('slug')
          ? 'That slug is already taken — choose another one.'
          : error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: editingId ? 'Advertisement updated' : 'Advertisement created',
      description: `Published free of charge to ${adType === 'marketplace' ? 'Marketplace' : 'Services'} ads.`,
    });
    resetForm();
    fetchAds();
  };

  const toggleActive = async (ad: Advertisement) => {
    const { error } = await supabase
      .from('advertisements')
      .update({ is_active: !ad.is_active })
      .eq('id', ad.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    } else {
      fetchAds();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('advertisements').delete().eq('id', deleteTarget.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Advertisement removed' });
      fetchAds();
    }
    setDeleteTarget(null);
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Advertisements Manager</h2>
          <p className="text-xs text-muted-foreground">
            Create Marketplace (/marketplace-ads) and Services (/service-ads) advertisements — free for admins.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchAds}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={startCreate}>
            <Plus className="w-4 h-4 mr-2" />
            New Ad
          </Button>
        </div>
      </div>

      <Tabs value={adType} onValueChange={(v) => { setAdType(v as AdType); resetForm(); }}>
        <TabsList>
          <TabsTrigger value="marketplace">Marketplace Ads</TabsTrigger>
          <TabsTrigger value="services">Services Ads</TabsTrigger>
        </TabsList>

        <TabsContent value={adType} className="space-y-6 mt-4">
          {showForm && (
            <form onSubmit={handleSubmit} className="glass-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {editingId ? 'Edit' : 'New'} {adType === 'marketplace' ? 'Marketplace' : 'Services'} Ad
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="Arcana Server Files"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setField('slug', e.target.value)}
                    placeholder={slugify(form.title) || 'auto-generated'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website *</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => setField('website', e.target.value)}
                    placeholder="https://example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setField('category', v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Short description</Label>
                  <Input
                    value={form.short_description}
                    onChange={(e) => setField('short_description', e.target.value)}
                    placeholder="One line shown on cards and SEO meta"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    rows={2}
                    placeholder="Short summary shown in the homepage widget"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Full description</Label>
                <RichTextEditor
                  content={form.full_description}
                  onChange={(html) => setField('full_description', html)}
                  placeholder="Detailed description shown on the ad detail page..."
                />
              </div>

              <div className="space-y-2">
                <Label>Banner image</Label>
                <ImageUpload
                  bucket="ad-banners"
                  userId={user?.id || ''}
                  currentImageUrl={form.banner_url}
                  onUploadComplete={(url) => setField('banner_url', url)}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Price (USD)</Label>
                  <Input type="number" step="0.01" value={form.price_usd} onChange={(e) => setField('price_usd', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Price range</Label>
                  <Input value={form.price_range} onChange={(e) => setField('price_range', e.target.value)} placeholder="$50 - $200" />
                </div>
                <div className="space-y-2">
                  <Label>Delivery time</Label>
                  <Input value={form.delivery_time} onChange={(e) => setField('delivery_time', e.target.value)} placeholder="3-5 days" />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setField('location', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Experience level</Label>
                  <Input value={form.experience_level} onChange={(e) => setField('experience_level', e.target.value)} placeholder="5+ years" />
                </div>
                <div className="space-y-2">
                  <Label>Supported seasons</Label>
                  <Input value={form.supported_seasons} onChange={(e) => setField('supported_seasons', e.target.value)} placeholder="S6 - S19" />
                </div>
                <div className="space-y-2">
                  <Label>Discord link</Label>
                  <Input value={form.discord_link} onChange={(e) => setField('discord_link', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Video URL</Label>
                  <Input value={form.video_url} onChange={(e) => setField('video_url', e.target.value)} placeholder="YouTube link" />
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input value={form.tags} onChange={(e) => setField('tags', e.target.value)} placeholder="files, season 19" />
                </div>
                <div className="space-y-2">
                  <Label>VIP level</Label>
                  <Select value={form.vip_level} onValueChange={(v) => setField('vip_level', v as FormState['vip_level'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="diamond">Diamond</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rotation order</Label>
                  <Input type="number" value={form.rotation_order} onChange={(e) => setField('rotation_order', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Expires at (optional)</Label>
                  <Input type="date" value={form.expires_at} onChange={(e) => setField('expires_at', e.target.value)} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={(v) => setField('is_active', v)} />
                <span className="text-sm">Publish immediately (visible on homepage)</span>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Save changes' : 'Create advertisement'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </form>
          )}

          <div className="glass-card p-4">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : ads.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No advertisements yet.</p>
            ) : (
              <div className="space-y-2">
                {ads.map(ad => {
                  const expired = ad.expires_at && new Date(ad.expires_at) < new Date();
                  return (
                    <div key={ad.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                      {ad.banner_url && (
                        <img src={ad.banner_url} alt={ad.title} className="w-16 h-8 object-cover rounded shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{ad.title}</span>
                          {ad.vip_level && ad.vip_level !== 'none' && (
                            <Badge variant="outline" className="text-xs uppercase">{ad.vip_level}</Badge>
                          )}
                          {expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                          {!ad.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <a
                            href={`/marketplace-ads/${ad.slug || ad.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary"
                          >
                            View page <ExternalLink className="w-3 h-3" />
                          </a>
                          {ad.category && <span>{ad.category}</span>}
                          <span>{format(new Date(ad.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={ad.is_active ?? false} onCheckedChange={() => toggleActive(ad)} />
                        <Button variant="ghost" size="sm" onClick={() => startEdit(ad)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(ad)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete advertisement?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

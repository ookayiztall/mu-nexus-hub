import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, DollarSign, Package } from 'lucide-react';
import { SLOT_CONFIG } from '@/lib/slotConfig';

interface PricingPackage {
  id: string;
  name: string;
  description: string | null;
  product_type: string;
  duration_days: number;
  price_cents: number;
  features: string[] | null;
  display_order: number | null;
  slot_id: number | null;
  is_active: boolean | null;
}

export const PackagePricingManager = () => {
  const { toast } = useToast();
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});
  const [editedDurations, setEditedDurations] = useState<Record<string, string>>({});
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const [editedDescriptions, setEditedDescriptions] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pricing_packages')
      .select('*')
      .order('slot_id', { ascending: true })
      .order('display_order', { ascending: true });

    if (data) {
      // Exclude free slot packages
      const paid = data.filter((p: any) => p.slot_id !== 6) as PricingPackage[];
      setPackages(paid);
    }
    if (error) console.error(error);
    setLoading(false);
  };

  const getSlotName = (slotId: number | null) => {
    if (!slotId) return 'General';
    return SLOT_CONFIG[slotId as keyof typeof SLOT_CONFIG]?.name || `Slot ${slotId}`;
  };

  const handleSave = async (pkg: PricingPackage) => {
    setSaving(pkg.id);
    const newPrice = editedPrices[pkg.id];
    const newDuration = editedDurations[pkg.id];
    const newName = editedNames[pkg.id];
    const newDesc = editedDescriptions[pkg.id];

    const updates: Record<string, any> = {};
    if (newPrice !== undefined) updates.price_cents = Math.round(parseFloat(newPrice) * 100);
    if (newDuration !== undefined) updates.duration_days = parseInt(newDuration);
    if (newName !== undefined) updates.name = newName;
    if (newDesc !== undefined) updates.description = newDesc;

    if (Object.keys(updates).length === 0) {
      setSaving(null);
      return;
    }

    const { error } = await supabase
      .from('pricing_packages')
      .update(updates)
      .eq('id', pkg.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: `${pkg.name} updated successfully.` });
      // Clear edited state for this package
      setEditedPrices(prev => { const n = { ...prev }; delete n[pkg.id]; return n; });
      setEditedDurations(prev => { const n = { ...prev }; delete n[pkg.id]; return n; });
      setEditedNames(prev => { const n = { ...prev }; delete n[pkg.id]; return n; });
      setEditedDescriptions(prev => { const n = { ...prev }; delete n[pkg.id]; return n; });
      fetchPackages();
    }
    setSaving(null);
  };

  const handleToggleActive = async (pkg: PricingPackage) => {
    const { error } = await supabase
      .from('pricing_packages')
      .update({ is_active: !pkg.is_active })
      .eq('id', pkg.id);

    if (!error) {
      toast({ title: pkg.is_active ? 'Deactivated' : 'Activated', description: `${pkg.name} is now ${pkg.is_active ? 'hidden' : 'visible'}.` });
      fetchPackages();
    }
  };

  const hasChanges = (id: string) =>
    editedPrices[id] !== undefined ||
    editedDurations[id] !== undefined ||
    editedNames[id] !== undefined ||
    editedDescriptions[id] !== undefined;

  // Group by slot_id
  const grouped = packages.reduce((acc, pkg) => {
    const key = pkg.slot_id || 0;
    if (!acc[key]) acc[key] = [];
    acc[key].push(pkg);
    return acc;
  }, {} as Record<number, PricingPackage[]>);

  const slotIds = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5" />
          Package Pricing Manager
        </h3>
        <p className="text-sm text-muted-foreground">
          Edit prices, durations, and toggle visibility for all paid packages on the /pricing page.
        </p>
      </div>

      {slotIds.map(slotId => (
        <Card key={slotId} className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              {getSlotName(slotId)}
              <Badge variant="secondary" className="text-xs">Slot {slotId}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {grouped[slotId].map(pkg => (
              <div key={pkg.id} className="p-4 rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={pkg.is_active ? 'default' : 'outline'} className="text-xs">
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="font-medium text-sm">{pkg.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={pkg.is_active ?? false}
                      onCheckedChange={() => handleToggleActive(pkg)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={editedNames[pkg.id] ?? pkg.name}
                      onChange={e => setEditedNames(prev => ({ ...prev, [pkg.id]: e.target.value }))}
                      className="bg-background h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Price (USD)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedPrices[pkg.id] ?? (pkg.price_cents / 100).toFixed(2)}
                      onChange={e => setEditedPrices(prev => ({ ...prev, [pkg.id]: e.target.value }))}
                      className="bg-background h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Duration (days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={editedDurations[pkg.id] ?? pkg.duration_days}
                      onChange={e => setEditedDurations(prev => ({ ...prev, [pkg.id]: e.target.value }))}
                      className="bg-background h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={editedDescriptions[pkg.id] ?? (pkg.description || '')}
                      onChange={e => setEditedDescriptions(prev => ({ ...prev, [pkg.id]: e.target.value }))}
                      className="bg-background h-8 text-sm"
                    />
                  </div>
                </div>

                {hasChanges(pkg.id) && (
                  <Button
                    size="sm"
                    onClick={() => handleSave(pkg)}
                    disabled={saving === pkg.id}
                    className="gap-2"
                  >
                    {saving === pkg.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save Changes
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {packages.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No paid packages found. Add packages via the database.
        </p>
      )}
    </div>
  );
};

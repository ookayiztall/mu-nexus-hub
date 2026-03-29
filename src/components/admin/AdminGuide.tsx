import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen, ShoppingBag, Wrench, Trophy, Type, Image, Calendar,
  Percent, Sparkles, DollarSign, Shield, Users, BarChart3, CreditCard,
  Megaphone, Server
} from 'lucide-react';

export const AdminGuide = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Admin Management Guide
        </h3>
        <p className="text-sm text-muted-foreground">
          Everything you need to manage MU Online Hub.
        </p>
      </div>

      {/* Slot System Overview */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            Homepage Slot System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>The homepage is divided into 8 slots. Each slot is a section that sellers can purchase to promote their listings.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { slot: 1, name: 'Marketplace Advertise', icon: ShoppingBag, desc: 'Sellers list products/services for sale. Paid slot with rotation.' },
              { slot: 2, name: 'Services Advertise', icon: Wrench, desc: 'Sellers advertise professional services. Paid slot with rotation.' },
              { slot: 3, name: 'Top 50 Servers', icon: Trophy, desc: 'Server listings with voting system. Paid slot.' },
              { slot: 4, name: 'Premium Text Servers', icon: Type, desc: 'Text-based server ads in a compact widget. Paid slot.' },
              { slot: 5, name: 'Main Banner', icon: Image, desc: 'Large image banners in the hero carousel. Paid slot.' },
              { slot: 6, name: 'Upcoming & Recent', icon: Calendar, desc: 'Free server listings sorted by opening date.' },
              { slot: 7, name: 'Partner Discounts', icon: Percent, desc: 'Ticker-style promotional offers. Must link to existing listing. Paid.' },
              { slot: 8, name: 'Server Events', icon: Sparkles, desc: 'Event announcements shown as rotating promos. Paid.' },
            ].map(s => (
              <div key={s.slot} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <s.icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    Slot {s.slot}: {s.name}
                    {s.slot === 6 && <Badge variant="secondary" className="ml-2 text-xs">FREE</Badge>}
                  </p>
                  <p className="text-xs">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Managing Listings */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            Managing Listings & Drafts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">Seller Flow:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Seller goes to <code className="text-xs bg-muted px-1 rounded">/pricing</code> and selects a package.</li>
              <li>They can <strong>Create Draft First</strong> (free) to fill in all details.</li>
              <li>When ready, they pay via Stripe or PayPal to publish.</li>
              <li>After payment, listing becomes active and visible on the homepage.</li>
              <li>Listing expires after the purchased duration (e.g., 7/14/30 days).</li>
            </ol>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Admin Actions (Slots tab):</p>
            <ul className="list-disc list-inside space-y-1">
              <li>View all listings across all slots.</li>
              <li>Toggle <strong>is_active</strong> to show/hide any listing.</li>
              <li>Delete unwanted or spam listings.</li>
              <li>Adjust <strong>rotation_order</strong> to control display priority.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Managing Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Go to the <strong>Pricing</strong> tab in this admin panel.</li>
            <li>Each paid slot has packages with configurable <strong>name, price, duration, and description</strong>.</li>
            <li>Toggle packages on/off to hide them from the <code className="text-xs bg-muted px-1 rounded">/pricing</code> page.</li>
            <li>Price changes take effect immediately for new purchases.</li>
            <li>Existing active listings are not affected by price changes.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Voting System */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Voting System (Top 50)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Each logged-in user can vote once per server per month.</li>
            <li>Rankings are based on total votes for the current month.</li>
            <li>Go to <strong>Voting</strong> tab to manage votes.</li>
            <li>You can <strong>adjust vote counts</strong>, <strong>disable voting</strong> for specific servers, and <strong>feature</strong> servers.</li>
            <li>Featured servers appear highlighted in the rankings.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Payments & Revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Stripe</strong>: Set up via the Payments tab. Requires a secret key configured as an environment secret.</li>
            <li><strong>PayPal</strong>: Configure Client ID, Secret, and Webhook ID in the Payments tab. Test the connection before enabling.</li>
            <li>Use <strong>Clear Pending PayPal</strong> button to remove stale verification entries.</li>
            <li>Revenue analytics show combined Stripe + PayPal data with charts.</li>
            <li>Platform fee percentage is configurable for future revenue splits.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Content Management */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Content Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">Banners (Hero Carousel):</p>
            <p>Add/remove premium banners that rotate in the homepage hero section. Each needs a title, website URL, and image URL.</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Partners:</p>
            <p>Manage partner logos shown in the Partners section. Toggle active/inactive to control visibility.</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Arcana Projects:</p>
            <p>Showcase related projects. Each needs a name, website, and optional image/info.</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Promos:</p>
            <p>Add rotating promotional messages. Types include "discount" and "event".</p>
          </div>
        </CardContent>
      </Card>

      {/* User Management */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            User Roles & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Roles are stored in the <strong>user_roles</strong> table: admin, moderator, user.</li>
            <li>To make someone admin, their email must be in the profiles table, then insert a role in user_roles.</li>
            <li>All admin-only actions are protected by RLS policies using the <code className="text-xs bg-muted px-1 rounded">is_admin()</code> database function.</li>
            <li>Users see only their own data; admins can see and manage everything.</li>
          </ul>
        </CardContent>
      </Card>

      {/* Quick Reference */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Quick Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-foreground mb-2">Key Pages:</p>
              <ul className="space-y-1 text-xs">
                <li><code className="bg-muted px-1 rounded">/pricing</code> — Public pricing page</li>
                <li><code className="bg-muted px-1 rounded">/marketplace</code> — All marketplace + services ads</li>
                <li><code className="bg-muted px-1 rounded">/servers</code> — Server browsing</li>
                <li><code className="bg-muted px-1 rounded">/top-50</code> — Voting rankings</li>
                <li><code className="bg-muted px-1 rounded">/upcoming-servers</code> — Free server listings</li>
                <li><code className="bg-muted px-1 rounded">/dashboard</code> — Seller dashboard</li>
                <li><code className="bg-muted px-1 rounded">/admin</code> — This admin panel</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground mb-2">Admin Tabs:</p>
              <ul className="space-y-1 text-xs">
                <li><strong>Slots</strong> — Manage all homepage slot listings</li>
                <li><strong>Voting</strong> — Server vote management</li>
                <li><strong>Pricing</strong> — Edit package prices & durations</li>
                <li><strong>Analytics</strong> — User & listing metrics</li>
                <li><strong>Payments</strong> — Revenue & payment config</li>
                <li><strong>Banners/Partners/Projects/Promos</strong> — Content</li>
                <li><strong>Guide</strong> — This reference page</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

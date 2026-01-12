import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  Globe, 
  FileCode, 
  Shield, 
  Rocket, 
  Code, 
  Package,
  DollarSign,
  Calendar,
  User,
  ShoppingCart,
  Loader2
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_usd: number | null;
  website: string | null;
  image_url: string | null;
  is_published: boolean;
  expires_at: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
  };
}

const categoryIcons: Record<string, any> = {
  websites: Globe,
  server_files: FileCode,
  antihack: Shield,
  launchers: Rocket,
  custom_scripts: Code,
};

const categoryLabels: Record<string, string> = {
  websites: 'Websites',
  server_files: 'Server Files',
  antihack: 'Antihack',
  launchers: 'Launchers',
  custom_scripts: 'Custom Scripts',
};

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        profiles!listings_user_id_fkey(display_name, email)
      `)
      .eq('id', id)
      .single();

    if (data && !error) {
      setListing(data as any);
    } else {
      toast({
        title: 'Error',
        description: 'Listing not found',
        variant: 'destructive',
      });
      navigate('/marketplace');
    }
    setIsLoading(false);
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to purchase this listing',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!listing?.price_usd) {
      // If no price, just open the website
      if (listing?.website) {
        window.open(listing.website, '_blank');
      }
      return;
    }

    setIsPurchasing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-listing-checkout', {
        body: {
          listingId: listing.id,
          successUrl: `${window.location.origin}/marketplace/${listing.id}?success=true`,
          cancelUrl: `${window.location.origin}/marketplace/${listing.id}?canceled=true`,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create checkout');
      }

      if (response.data?.needsConfiguration) {
        toast({
          title: 'Payment Not Available',
          description: 'Payment system is being configured. Please try again later.',
          variant: 'destructive',
        });
        return;
      }

      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate purchase',
        variant: 'destructive',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Listing not found</p>
          <Button asChild className="mt-4">
            <Link to="/marketplace">Back to Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  const Icon = categoryIcons[listing.category] || Package;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={`${listing.title} - MU Online Marketplace`}
        description={listing.description || `${categoryLabels[listing.category]} listing on MU Online Marketplace`}
        keywords={`MU Online, ${categoryLabels[listing.category]}, marketplace`}
      />
      <Header />
      
      <main className="container py-8">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6 gap-2">
          <Link to="/marketplace">
            <ArrowLeft size={18} />
            Back to Marketplace
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            {listing.image_url ? (
              <div className="glass-card overflow-hidden">
                <img 
                  src={listing.image_url} 
                  alt={listing.title}
                  className="w-full aspect-video object-cover"
                />
              </div>
            ) : (
              <div className="glass-card aspect-video flex items-center justify-center bg-muted/20">
                <Icon className="w-24 h-24 text-muted-foreground" />
              </div>
            )}

            {/* Details */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-primary/90">
                  <Icon className="w-3 h-3 mr-1" />
                  {categoryLabels[listing.category]}
                </Badge>
                {listing.expires_at && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    Expires {new Date(listing.expires_at).toLocaleDateString()}
                  </Badge>
                )}
              </div>

              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                {listing.title}
              </h1>

              {listing.description && (
                <div className="prose prose-invert max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {listing.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Price Card */}
            <div className="glass-card p-6 glow-border-gold">
              {listing.price_usd ? (
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Price</p>
                  <p className="font-display text-4xl font-bold text-primary">
                    ${listing.price_usd.toFixed(2)}
                  </p>
                </div>
              ) : (
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Price</p>
                  <p className="font-display text-2xl font-bold text-primary">
                    Contact Seller
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {listing.price_usd ? (
                  <Button 
                    className="w-full btn-fantasy-primary gap-2"
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                  >
                    {isPurchasing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )}
                    {isPurchasing ? 'Processing...' : 'Buy Now'}
                  </Button>
                ) : null}

                {listing.website && (
                  <Button 
                    variant="outline" 
                    className="w-full btn-fantasy-outline gap-2"
                    asChild
                  >
                    <a href={listing.website} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Visit Website
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Seller Info */}
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Seller Information
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  <span className="text-foreground font-medium">
                    {listing.profiles?.display_name || 'Anonymous Seller'}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Listed on {new Date(listing.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Safety Notice */}
            <div className="glass-card p-4 border-l-4 border-yellow-500/50">
              <p className="text-xs text-muted-foreground">
                <strong className="text-yellow-500">Safety Notice:</strong> Always verify the seller 
                and product before making a purchase. MU Online Hub does not guarantee third-party products.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ListingDetail;

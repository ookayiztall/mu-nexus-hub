import { Store, ArrowRight, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const MarketplaceIntro = () => {
  return (
    <div className="glass-card overflow-hidden">
      <div className="section-header">
        <div className="flex items-center gap-3">
          <Store className="w-5 h-5 text-primary" />
          <h2 className="font-display text-base md:text-lg font-semibold text-foreground">
            MU Online Marketplace
          </h2>
        </div>
      </div>
      
      <div className="p-4 md:p-6">
        <p className="text-sm text-muted-foreground mb-4">
          The ultimate marketplace for MU Online digital products. Find premium websites, 
          server files, antihack solutions, and more from verified sellers.
        </p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {['Websites', 'Server Files', 'Antihack', 'Custom Tools'].map((item) => (
            <div key={item} className="bg-muted/30 rounded px-2 py-1 text-center">
              <span className="text-xs text-foreground">{item}</span>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild className="btn-fantasy-primary flex-1">
            <Link to="/marketplace" className="flex items-center justify-center gap-2">
              <Store className="w-4 h-4" />
              Browse Marketplace
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="btn-fantasy-outline flex-1">
            <Link to="/pricing" className="flex items-center justify-center gap-2">
              <Megaphone className="w-4 h-4" />
              Advertise Your Product
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceIntro;

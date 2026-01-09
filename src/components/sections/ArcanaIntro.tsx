import { Sparkles, ArrowRight, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ArcanaIntro = () => {
  return (
    <div className="glass-card overflow-hidden glow-border-gold">
      <div className="section-header bg-gradient-to-r from-primary/20 to-transparent">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-display text-base md:text-lg font-semibold text-foreground">
            Arcana MU Online Partner Projects
          </h2>
        </div>
      </div>
      
      <div className="p-4 md:p-6">
        <p className="text-sm text-muted-foreground mb-4">
          Discover the Arcana ecosystem - a network of premium MU Online servers managed by 
          industry experts. Join as a player or apply to become a partner.
        </p>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Premium Servers', desc: 'Top quality' },
            { label: 'Active Community', desc: 'Thriving players' },
            { label: 'Revenue Share', desc: 'Partner benefits' },
          ].map((item) => (
            <div key={item.label} className="bg-primary/10 border border-primary/20 rounded p-2 text-center">
              <span className="text-xs font-semibold text-primary block">{item.label}</span>
              <span className="text-[10px] text-muted-foreground">{item.desc}</span>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild className="btn-fantasy-primary flex-1">
            <Link to="/arcana-projects" className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" />
              View Arcana Projects
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="btn-fantasy-outline flex-1">
            <Link to="/arcana-projects#apply" className="flex items-center justify-center gap-2">
              <UserPlus className="w-4 h-4" />
              Apply as Partner
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ArcanaIntro;

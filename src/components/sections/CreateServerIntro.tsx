import { Server, ArrowRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CreateServerIntro = () => {
  return (
    <div className="glass-card overflow-hidden glow-border-cyan">
      <div className="section-header bg-gradient-to-r from-secondary/20 to-transparent">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-secondary" />
          <h2 className="font-display text-base md:text-lg font-semibold text-foreground">
            Create Your MU Online Server With Us
          </h2>
        </div>
      </div>
      
      <div className="p-4 md:p-6">
        <p className="text-sm text-muted-foreground mb-4">
          Launch your dream MU Online server with Arcana's professional setup services. 
          Get a fully configured server with custom features, security, and ongoing support.
        </p>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Full Setup', desc: 'Complete configuration' },
            { label: 'Custom Features', desc: 'Unique gameplay' },
            { label: '24/7 Support', desc: 'Always available' },
          ].map((item) => (
            <div key={item.label} className="bg-secondary/10 border border-secondary/20 rounded p-2 text-center">
              <span className="text-xs font-semibold text-secondary block">{item.label}</span>
              <span className="text-[10px] text-muted-foreground">{item.desc}</span>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild className="btn-fantasy-primary flex-1 bg-gradient-to-b from-secondary/90 to-secondary text-secondary-foreground border-secondary/50 hover:from-secondary hover:to-secondary/80">
            <Link to="/create-server" className="flex items-center justify-center gap-2">
              <Server className="w-4 h-4" />
              Create Your Server
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="btn-fantasy-outline flex-1">
            <Link to="/create-server#packages" className="flex items-center justify-center gap-2">
              <Shield className="w-4 h-4" />
              View Packages
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateServerIntro;

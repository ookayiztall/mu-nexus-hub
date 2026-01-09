import Header from '@/components/layout/Header';
import RotatingHeadlines from '@/components/layout/RotatingHeadlines';
import PremiumBanner from '@/components/banners/PremiumBanner';
import PremiumTextServers from '@/components/widgets/PremiumTextServers';
import UpcomingServers from '@/components/widgets/UpcomingServers';
import RotatingPromos from '@/components/widgets/RotatingPromos';
import { SEOHead } from '@/components/SEOHead';

// Parent intro sections
import MarketplaceIntro from '@/components/sections/MarketplaceIntro';
import ServicesIntro from '@/components/sections/ServicesIntro';
import CreateServerIntro from '@/components/sections/CreateServerIntro';
import ArcanaIntro from '@/components/sections/ArcanaIntro';

// Child listing sections
import MarketplaceAdvertise from '@/components/sections/MarketplaceAdvertise';
import ServicesAdvertise from '@/components/sections/ServicesAdvertise';
import TopServers from '@/components/sections/TopServers';
import PartnersSection from '@/components/sections/PartnersSection';
import ArcanaProjects from '@/components/sections/ArcanaProjects';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead />
      <Header />
      <RotatingHeadlines />
      
      <main className="container py-6 space-y-8">
        {/* Top Row: Premium Text Servers + Banner + Upcoming Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Widget - Premium Text Servers */}
          <div className="lg:col-span-3">
            <PremiumTextServers />
          </div>
          
          {/* Center - Premium Banner */}
          <div className="lg:col-span-6">
            <PremiumBanner />
          </div>
          
          {/* Right Widget - Upcoming Servers */}
          <div className="lg:col-span-3">
            <UpcomingServers />
          </div>
        </div>

        {/* Rotating Promo Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RotatingPromos type="discount" />
          <RotatingPromos type="event" />
        </div>

        {/* Main Content: 3 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN - Marketplace & Services Groups */}
          <div className="lg:col-span-3 space-y-6">
            {/* GROUP 1: Marketplace (Parent → Child) */}
            <section id="marketplace" className="space-y-0">
              <MarketplaceIntro />
              <div className="border-l-2 border-primary/30 ml-4 pl-4 pt-4">
                <MarketplaceAdvertise />
              </div>
            </section>

            {/* GROUP 2: Services (Parent → Child) */}
            <section id="services" className="space-y-0">
              <ServicesIntro />
              <div className="border-l-2 border-secondary/30 ml-4 pl-4 pt-4">
                <ServicesAdvertise />
              </div>
            </section>
          </div>

          {/* CENTER COLUMN - Top Servers (Core Listing) */}
          <div className="lg:col-span-6">
            <section id="servers">
              <TopServers />
            </section>
          </div>

          {/* RIGHT COLUMN - Create Server & Arcana Groups */}
          <div className="lg:col-span-3 space-y-6">
            {/* GROUP 3: Create Server (Parent → Child) */}
            <section id="create" className="space-y-0">
              <CreateServerIntro />
              <div className="border-l-2 border-secondary/30 ml-4 pl-4 pt-4">
                <PartnersSection />
              </div>
            </section>

            {/* GROUP 4: Arcana Projects (Parent → Child) */}
            <section id="arcana" className="space-y-0">
              <ArcanaIntro />
              <div className="border-l-2 border-primary/30 ml-4 pl-4 pt-4">
                <ArcanaProjects />
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-border/30">
          <p className="font-display text-lg text-gradient-gold mb-2">MU Online Hub</p>
          <p className="text-xs text-muted-foreground">
            The ultimate marketplace for MU Online servers, services & partners
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;

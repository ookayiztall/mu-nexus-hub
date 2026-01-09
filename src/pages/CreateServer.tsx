import { useState } from 'react';
import { Server, Shield, Clock, Headphones, Check, ArrowRight, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const packages = [
  {
    name: 'Starter',
    price: '$299',
    description: 'Perfect for new server owners',
    features: [
      'Basic server setup',
      'Standard configurations',
      'Basic website template',
      '7 days support',
      'Up to 100 players',
    ],
    popular: false,
  },
  {
    name: 'Professional',
    price: '$599',
    description: 'Most popular choice',
    features: [
      'Advanced server setup',
      'Custom configurations',
      'Premium website design',
      '30 days support',
      'Up to 500 players',
      'Custom events system',
      'Anti-hack integration',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$1,299',
    description: 'For serious projects',
    features: [
      'Full custom development',
      'Advanced custom features',
      'Custom website & branding',
      '90 days priority support',
      'Unlimited players',
      'Custom events & systems',
      'Premium anti-hack',
      'Marketing package',
    ],
    popular: false,
  },
];

const CreateServer = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    discord: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Request Submitted!",
      description: "We'll get back to you within 24 hours.",
    });
    setFormData({ name: '', email: '', discord: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Create Your MU Online Server - Professional Setup Services"
        description="Launch your dream MU Online server with Arcana's professional setup services. Complete configuration, custom features, and ongoing support."
        keywords="MU Online server setup, create MU server, professional MU server, Arcana servers"
      />
      <Header />
      
      <main className="container py-8">
        {/* Hero Section */}
        <div className="glass-card p-6 md:p-10 mb-8 text-center glow-border-cyan">
          <Server className="w-16 h-16 text-secondary mx-auto mb-4" />
          <h1 className="font-display text-2xl md:text-4xl font-bold text-glow-cyan mb-4">
            Create Your MU Online Server With Us
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6 text-lg">
            From concept to launch, our expert team handles everything. Get a professionally 
            configured server with custom features, security, and dedicated support.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: Shield, text: 'Secure Setup' },
              { icon: Clock, text: 'Fast Delivery' },
              { icon: Headphones, text: '24/7 Support' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 bg-secondary/10 rounded-full px-4 py-2">
                <item.icon className="w-4 h-4 text-secondary" />
                <span className="text-sm text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Packages */}
        <section id="packages" className="mb-12">
          <h2 className="font-display text-xl md:text-2xl font-bold text-center mb-8">
            Choose Your Package
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div 
                key={pkg.name}
                className={`glass-card p-6 relative ${pkg.popular ? 'glow-border-gold' : ''}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="vip-badge vip-gold">Most Popular</span>
                  </div>
                )}
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{pkg.name}</h3>
                <p className="text-3xl font-bold text-primary mb-2">{pkg.price}</p>
                <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>
                <ul className="space-y-2 mb-6">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${pkg.popular ? 'btn-fantasy-primary' : 'btn-fantasy-outline'}`}
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Form */}
        <section id="contact" className="max-w-2xl mx-auto">
          <div className="glass-card p-6 md:p-8">
            <div className="text-center mb-6">
              <Mail className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="font-display text-xl font-bold">Get in Touch</h2>
              <p className="text-sm text-muted-foreground">Tell us about your project</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <Input
                placeholder="Discord Username (optional)"
                value={formData.discord}
                onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
              />
              <Textarea
                placeholder="Tell us about your server idea..."
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
              <Button type="submit" className="w-full btn-fantasy-primary">
                Submit Request
              </Button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CreateServer;

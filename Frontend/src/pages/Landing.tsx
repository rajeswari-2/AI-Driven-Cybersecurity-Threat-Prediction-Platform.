import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, Zap, Globe, Brain, Lock, Activity, 
  ArrowRight, Check, AlertTriangle, Eye, Cpu 
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: 'Advanced machine learning models predict threats before they materialize'
  },
  {
    icon: Globe,
    title: 'Global Threat Monitoring',
    description: 'Real-time visualization of cyber attacks across the world'
  },
  {
    icon: Zap,
    title: 'Instant Scanning',
    description: 'Analyze files, websites, APIs, and QR codes in seconds'
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description: 'Role-based access control with full audit logging'
  },
  {
    icon: Activity,
    title: 'Live Attack Feed',
    description: 'Monitor threats as they happen with real-time updates'
  },
  {
    icon: Eye,
    title: 'Threat Intelligence',
    description: 'Comprehensive IOC database with MITRE ATT&CK mapping'
  }
];

const stats = [
  { value: '10M+', label: 'Threats Analyzed' },
  { value: '99.9%', label: 'Detection Rate' },
  { value: '<100ms', label: 'Response Time' },
  { value: '24/7', label: 'Monitoring' }
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="absolute inset-0">
          <div className="cyber-grid opacity-20" />
        </div>
        
        <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold">ThreatPredict</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </nav>

        <div className="relative z-10 container mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 mb-8">
            <Cpu className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI-Powered Cybersecurity Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            Predict & Prevent
            <br />
            Cyber Threats
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Advanced threat detection powered by AI. Monitor, analyze, and respond to 
            security threats in real-time with our enterprise-grade platform.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              Watch Demo
              <Activity className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 container mx-auto px-6 pb-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-4xl font-bold text-primary mb-2">{stat.value}</p>
                <p className="text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Complete Security Suite
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to protect your organization from modern cyber threats
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="p-3 rounded-xl bg-primary/20 w-fit mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 overflow-hidden">
            <CardContent className="p-12 text-center relative">
              <div className="absolute inset-0 cyber-grid opacity-10" />
              <div className="relative z-10">
                <AlertTriangle className="h-12 w-12 text-primary mx-auto mb-6" />
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Your Security, Our Priority
                </h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
                  Join thousands of organizations using ThreatPredict to stay ahead of cyber threats
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                  {['SOC 2 Compliant', 'GDPR Ready', '24/7 Support', 'Enterprise SLA'].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-background/50 rounded-full px-4 py-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
                <Button size="lg" onClick={() => navigate('/auth')}>
                  Start Protecting Your Organization
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold">ThreatPredict</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 ThreatPredict. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

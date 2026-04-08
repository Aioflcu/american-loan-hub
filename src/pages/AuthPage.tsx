import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AuthPage = () => {
  const { user, signIn, signUp, signInWithGoogle, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = isSignUp
      ? await signUp(email, password, fullName)
      : await signIn(email, password);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if (isSignUp) {
      toast({ title: 'Account created', description: 'Welcome to LendFlow!' });
    }
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
  };

  return (
    <div className="flex min-h-screen">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-gold">
            <Building2 className="h-5 w-5 text-accent-foreground" />
          </div>
          <span className="font-heading text-xl text-primary-foreground">LendFlow</span>
        </div>

        <div className="max-w-md">
          <h1 className="font-heading text-4xl leading-tight text-primary-foreground">
            Smart Lending for <span className="text-gradient-gold">Americans</span>
          </h1>
          <p className="mt-4 text-base text-primary-foreground/70">
            Apply for personal, mortgage, auto, business, or student loans with competitive rates. 
            Fast approvals, transparent terms, and a seamless digital experience.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-6">
            {[
              { value: '$2.5B+', label: 'Loans Originated' },
              { value: '98%', label: 'Approval Rate' },
              { value: '4.2%', label: 'Avg. APR' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-2xl text-secondary">{stat.value}</p>
                <p className="mt-1 text-xs text-primary-foreground/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/30">
          © {new Date().getFullYear()} LendFlow. NMLS #123456. Equal Housing Lender.
        </p>
      </div>

      {/* Right - Auth Form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-gold">
              <Building2 className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="font-heading text-xl text-foreground">LendFlow</span>
          </div>

          <h2 className="font-heading text-2xl text-foreground">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp ? 'Start your loan application in minutes' : 'Sign in to manage your loans'}
          </p>

          {/* Google button */}
          <Button
            variant="outline"
            className="mt-6 w-full gap-2"
            onClick={handleGoogle}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="Prince Rogers Nelson"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="prince@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="gold" className="w-full" disabled={submitting}>
              {submitting ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-medium text-secondary hover:underline"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

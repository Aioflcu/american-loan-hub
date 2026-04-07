import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import StatCard from '@/components/StatCard';
import LoanStatusBadge from '@/components/LoanStatusBadge';
import { DollarSign, FileText, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface LoanApp {
  id: string;
  loan_type: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Loan {
  id: string;
  loan_type: string;
  remaining_balance: number;
  monthly_payment: number;
  next_payment_date: string;
  status: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<LoanApp[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [appsRes, loansRes] = await Promise.all([
        supabase.from('loan_applications').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('loans').select('*').order('created_at', { ascending: false }),
      ]);
      setApplications(appsRes.data || []);
      setLoans(loansRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalBalance = loans.reduce((sum, l) => sum + Number(l.remaining_balance), 0);
  const totalMonthly = loans.reduce((sum, l) => sum + Number(l.monthly_payment), 0);
  const activeLoans = loans.filter((l) => l.status === 'active').length;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const loanTypeLabel = (t: string) =>
    ({ personal: 'Personal', mortgage: 'Mortgage', auto: 'Auto', business: 'Business', student: 'Student', home_equity: 'Home Equity' })[t] || t;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl text-foreground">
              Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Here's your loan portfolio overview</p>
          </div>
          <Button variant="gold" onClick={() => navigate('/apply')}>
            Apply for Loan <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Balance" value={formatCurrency(totalBalance)} icon={DollarSign} change={activeLoans > 0 ? `${activeLoans} active loan${activeLoans > 1 ? 's' : ''}` : 'No active loans'} />
          <StatCard title="Monthly Payment" value={formatCurrency(totalMonthly)} icon={Clock} />
          <StatCard title="Applications" value={String(applications.length)} icon={FileText} />
          <StatCard title="Active Loans" value={String(activeLoans)} icon={TrendingUp} />
        </div>

        {/* Recent Applications */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="font-heading text-lg text-card-foreground">Recent Applications</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/loans')}>
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          {applications.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No applications yet</p>
              <Button variant="gold" size="sm" className="mt-3" onClick={() => navigate('/apply')}>
                Apply Now
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {applications.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{loanTypeLabel(app.loan_type)} Loan</p>
                    <p className="text-xs text-muted-foreground">{formatDate(app.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-semibold text-card-foreground">{formatCurrency(app.amount)}</p>
                    <LoanStatusBadge status={app.status as any} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Loans */}
        {loans.length > 0 && (
          <div className="rounded-xl border border-border bg-card shadow-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-heading text-lg text-card-foreground">Active Loans</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/payments')}>
                Payments <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="divide-y divide-border">
              {loans.map((loan) => (
                <div key={loan.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{loanTypeLabel(loan.loan_type)} Loan</p>
                    <p className="text-xs text-muted-foreground">
                      Next payment: {loan.next_payment_date ? formatDate(loan.next_payment_date) : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-card-foreground">{formatCurrency(Number(loan.remaining_balance))}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(Number(loan.monthly_payment))}/mo</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;

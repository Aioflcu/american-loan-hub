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
  const [depositState, setDepositState] = useState<{
    applicationId: string;
    dueAmount: number;
    deposited: boolean;
    createdAt: string;
    deadline: number;
    declined: boolean;
  } | null>(null);

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

  useEffect(() => {
    const stored = localStorage.getItem('loanDepositState');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.applicationId) {
          setDepositState(parsed);
          return;
        }
      } catch {
        localStorage.removeItem('loanDepositState');
      }
    }

    const pendingApp = applications.find((app) => app.status === 'submitted');
    if (pendingApp) {
      const deadline = new Date(pendingApp.created_at).getTime() + 30 * 60 * 1000;
      const initialState = {
        applicationId: pendingApp.id,
        dueAmount: 200,
        deposited: false,
        createdAt: pendingApp.created_at,
        deadline,
        declined: Date.now() >= deadline,
      };
      localStorage.setItem('loanDepositState', JSON.stringify(initialState));
      setDepositState(initialState);
    }
  }, [applications]);

  useEffect(() => {
    if (!depositState || depositState.declined) return;

    const interval = window.setInterval(() => {
      const now = Date.now();
      if (now >= depositState.deadline) {
        const updated = { ...depositState, declined: true };
        setDepositState(updated);
        localStorage.setItem('loanDepositState', JSON.stringify(updated));
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [depositState]);

  const totalBalance = loans.reduce((sum, l) => sum + Number(l.remaining_balance), 0);
  const totalMonthly = loans.reduce((sum, l) => sum + Number(l.monthly_payment), 0);
  const activeLoans = loans.filter((l) => l.status === 'active').length;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const loanTypeLabel = (t: string) =>
    ({ personal: 'Personal', mortgage: 'Mortgage', auto: 'Auto', business: 'Business', student: 'Student', home_equity: 'Home Equity' })[t] || t;

  const getCountdown = () => {
    if (!depositState) return 'N/A';
    if (depositState.declined) return 'Expired';
    const remaining = depositState.deadline - Date.now();
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const handleDeposit = () => {
    if (!depositState) return;
    const updated = { ...depositState, deposited: true };
    setDepositState(updated);
    localStorage.setItem('loanDepositState', JSON.stringify(updated));
  };

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl text-foreground">
              Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Here's your loan portfolio overview</p>
          </div>
          <Button variant="gold" size="sm" onClick={() => navigate('/apply')} className="w-full sm:w-auto">
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

        {depositState && (
          <div className="rounded-xl border border-border bg-card shadow-card">
            <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-lg text-card-foreground">Deposit Required</h2>
                <p className="text-sm text-muted-foreground">A $200 deposit is required after submitting your loan application.</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={`rounded-full px-3 py-1 ${depositState.declined ? 'bg-destructive/10 text-destructive' : depositState.deposited ? 'bg-success/10 text-success' : 'bg-secondary/10 text-secondary'}`}>
                  {depositState.declined ? 'Declined' : depositState.deposited ? 'Deposited' : 'Pending'}
                </span>
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Application</p>
                <p className="mt-2 text-base font-semibold text-card-foreground">{depositState.applicationId}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Deposit due</p>
                <p className="mt-2 text-base font-semibold text-card-foreground">{formatCurrency(depositState.dueAmount)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Time remaining</p>
                <p className="mt-2 text-base font-semibold text-card-foreground">{getCountdown()}</p>
              </div>
            </div>
            <div className="flex flex-col gap-4 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {depositState.declined
                    ? 'The 30-minute review window has expired and the loan will be declined.'
                    : depositState.deposited
                      ? 'Your deposit has been received. The loan will be declined when the review window ends.'
                      : 'Please deposit $200 to complete the application review process.'}
                </p>
              </div>
              <Button
                variant="gold"
                onClick={handleDeposit}
                disabled={depositState.declined || depositState.deposited}
              >
                {depositState.declined ? 'No action available' : depositState.deposited ? 'Deposit Received' : 'Deposit $200'}
              </Button>
            </div>
          </div>
        )}

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

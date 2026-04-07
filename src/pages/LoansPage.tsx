import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import LoanStatusBadge from '@/components/LoanStatusBadge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

interface LoanApp {
  id: string;
  loan_type: string;
  amount: number;
  term_months: number;
  interest_rate: number;
  monthly_payment: number;
  status: string;
  created_at: string;
  submitted_at: string;
}

const LoansPage = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<LoanApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('loan_applications').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setApplications(data || []);
      setLoading(false);
    });
  }, []);

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
  const loanTypeLabel = (t: string) => ({ personal: 'Personal', mortgage: 'Mortgage', auto: 'Auto', business: 'Business', student: 'Student', home_equity: 'Home Equity' })[t] || t;

  if (loading) {
    return <AppLayout><div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl text-foreground">My Loans</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track all your loan applications</p>
          </div>
          <Button variant="gold" onClick={() => navigate('/apply')}>
            <PlusCircle className="h-4 w-4" /> New Application
          </Button>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
            <p className="text-muted-foreground">No loan applications found</p>
            <Button variant="gold" className="mt-4" onClick={() => navigate('/apply')}>Apply for a Loan</Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Term</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Monthly</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-card-foreground">{loanTypeLabel(app.loan_type)}</td>
                    <td className="px-4 py-3 text-sm text-card-foreground">{formatCurrency(app.amount)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{app.term_months} mo</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{app.interest_rate ? `${Number(app.interest_rate).toFixed(2)}%` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-card-foreground">{app.monthly_payment ? formatCurrency(app.monthly_payment) : '—'}</td>
                    <td className="px-4 py-3"><LoanStatusBadge status={app.status as any} /></td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(app.submitted_at || app.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LoansPage;

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { DollarSign, Calendar, CheckCircle, Clock } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  payment_date: string;
  status: string;
  loan_id: string;
}

const PaymentsPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('payments').select('*').order('payment_date', { ascending: false }).then(({ data }) => {
      setPayments(data || []);
      setLoading(false);
    });
  }, []);

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const statusIcon = (s: string) => {
    switch (s) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'scheduled': return <Calendar className="h-4 w-4 text-info" />;
      case 'pending': return <Clock className="h-4 w-4 text-warning" />;
      default: return <DollarSign className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const totalPaid = payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0);
  const upcoming = payments.filter((p) => p.status === 'scheduled');

  if (loading) {
    return <AppLayout><div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track your loan payments</p>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="mt-1 font-heading text-2xl text-card-foreground">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">Upcoming Payments</p>
            <p className="mt-1 font-heading text-2xl text-card-foreground">{upcoming.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">Next Payment</p>
            <p className="mt-1 font-heading text-2xl text-card-foreground">
              {upcoming[0] ? formatCurrency(Number(upcoming[0].amount)) : '—'}
            </p>
            {upcoming[0] && <p className="text-xs text-muted-foreground">{formatDate(upcoming[0].payment_date)}</p>}
          </div>
        </div>

        {/* Payment list */}
        {payments.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
            <p className="text-muted-foreground">No payments yet. Payments will appear here once you have an active loan.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Principal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Interest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 flex items-center gap-2 text-sm capitalize text-card-foreground">
                      {statusIcon(p.status)} {p.status}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-card-foreground">{formatCurrency(Number(p.amount))}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.principal_amount ? formatCurrency(Number(p.principal_amount)) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.interest_amount ? formatCurrency(Number(p.interest_amount)) : '—'}</td>
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

export default PaymentsPage;

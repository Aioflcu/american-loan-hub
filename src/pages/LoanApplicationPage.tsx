import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

const LOAN_TYPES = [
  { value: 'personal', label: 'Personal Loan', minRate: 5.99, maxRate: 24.99 },
  { value: 'mortgage', label: 'Mortgage', minRate: 3.5, maxRate: 7.5 },
  { value: 'auto', label: 'Auto Loan', minRate: 3.99, maxRate: 12.99 },
  { value: 'business', label: 'Business Loan', minRate: 6.0, maxRate: 30.0 },
  { value: 'student', label: 'Student Loan', minRate: 3.5, maxRate: 12.99 },
  { value: 'home_equity', label: 'Home Equity', minRate: 4.0, maxRate: 10.0 },
];

const TERM_OPTIONS = [12, 24, 36, 48, 60, 72, 84, 120, 180, 240, 360];

const LoanApplicationPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    loan_type: '',
    amount: '',
    term_months: '',
    purpose: '',
    employment_status: '',
    annual_income: '',
    employer_name: '',
  });

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const calculateMonthly = () => {
    const loanType = LOAN_TYPES.find((t) => t.value === form.loan_type);
    if (!loanType || !form.amount || !form.term_months) return null;
    const rate = (loanType.minRate + loanType.maxRate) / 2 / 100 / 12;
    const n = Number(form.term_months);
    const p = Number(form.amount);
    if (rate === 0) return p / n;
    return (p * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
  };

  const monthly = calculateMonthly();

  const handleSubmit = async () => {
    setSubmitting(true);
    const loanType = LOAN_TYPES.find((t) => t.value === form.loan_type);
    const estimatedRate = loanType ? (loanType.minRate + loanType.maxRate) / 2 : 0;

    const { data, error } = await supabase.from('loan_applications').insert({
      user_id: user!.id,
      loan_type: form.loan_type,
      amount: Number(form.amount),
      term_months: Number(form.term_months),
      purpose: form.purpose,
      interest_rate: estimatedRate,
      monthly_payment: monthly,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }).select().single();

    // Also update profile with employment info
    await supabase.from('profiles').update({
      employment_status: form.employment_status,
      annual_income: Number(form.annual_income),
      employer_name: form.employer_name,
    }).eq('user_id', user!.id);

    if (!error && data) {
      const deadline = new Date(data.submitted_at).getTime() + 30 * 60 * 1000;
      const depositState = {
        applicationId: data.id,
        dueAmount: 200,
        deposited: false,
        createdAt: data.submitted_at,
        deadline,
        declined: false,
      };
      localStorage.setItem('loanDepositState', JSON.stringify(depositState));
    }

    setSubmitting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSubmitted(true);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (submitted) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="mt-4 font-heading text-2xl text-foreground">Application Submitted!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your {LOAN_TYPES.find((t) => t.value === form.loan_type)?.label} application for{' '}
              {formatCurrency(Number(form.amount))} has been submitted for review.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Please visit your dashboard to deposit the required $200 review fee.
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
              <Button variant="gold" onClick={() => navigate('/documents')}>Upload Documents</Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Apply for a Loan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Complete the form below to submit your application</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                step >= s ? 'bg-gradient-gold text-accent-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`h-0.5 w-12 ${step > s ? 'bg-secondary' : 'bg-muted'}`} />}
            </div>
          ))}
          <span className="ml-3 text-sm text-muted-foreground">
            {step === 1 ? 'Loan Details' : step === 2 ? 'Employment' : 'Review'}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Loan Type</Label>
                <Select value={form.loan_type} onValueChange={(v) => update('loan_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select loan type" /></SelectTrigger>
                  <SelectContent>
                    {LOAN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label} ({t.minRate}% – {t.maxRate}% APR)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loan Amount ($)</Label>
                <Input type="number" placeholder="25000" value={form.amount} onChange={(e) => update('amount', e.target.value)} min={1000} max={5000000} />
              </div>
              <div className="space-y-2">
                <Label>Loan Term</Label>
                <Select value={form.term_months} onValueChange={(v) => update('term_months', v)}>
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>
                    {TERM_OPTIONS.map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {m} months ({(m / 12).toFixed(m % 12 === 0 ? 0 : 1)} years)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Textarea placeholder="Describe the purpose of this loan..." value={form.purpose} onChange={(e) => update('purpose', e.target.value)} />
              </div>
              {monthly && (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Estimated Monthly Payment</p>
                  <p className="font-heading text-2xl text-foreground">{formatCurrency(monthly)}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="gold" onClick={() => setStep(2)} disabled={!form.loan_type || !form.amount || !form.term_months}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Employment Status</Label>
                <Select value={form.employment_status} onValueChange={(v) => update('employment_status', v)}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employed">Employed Full-Time</SelectItem>
                    <SelectItem value="part_time">Employed Part-Time</SelectItem>
                    <SelectItem value="self_employed">Self-Employed</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                    <SelectItem value="unemployed">Unemployed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Annual Income ($)</Label>
                <Input type="number" placeholder="75000" value={form.annual_income} onChange={(e) => update('annual_income', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Employer Name</Label>
                <Input placeholder="Acme Corp" value={form.employer_name} onChange={(e) => update('employer_name', e.target.value)} />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button variant="gold" onClick={() => setStep(3)} disabled={!form.employment_status || !form.annual_income}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h3 className="font-heading text-lg text-foreground">Review Your Application</h3>
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Loan Type</p>
                  <p className="font-medium text-foreground">{LOAN_TYPES.find((t) => t.value === form.loan_type)?.label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium text-foreground">{formatCurrency(Number(form.amount))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Term</p>
                  <p className="font-medium text-foreground">{form.term_months} months</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Est. Monthly</p>
                  <p className="font-medium text-foreground">{monthly ? formatCurrency(monthly) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Employment</p>
                  <p className="font-medium text-foreground">{form.employment_status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Annual Income</p>
                  <p className="font-medium text-foreground">{formatCurrency(Number(form.annual_income))}</p>
                </div>
              </div>
              {form.purpose && (
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p className="text-muted-foreground">Purpose</p>
                  <p className="text-foreground">{form.purpose}</p>
                </div>
              )}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button variant="gold" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default LoanApplicationPage;

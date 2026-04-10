import { useState, useRef } from 'react';
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
import { ArrowLeft, ArrowRight, CheckCircle, Upload, FileText, Trash2 } from 'lucide-react';

const LOAN_TYPES = [
  { value: 'personal', label: 'Personal Loan', minRate: 5.99, maxRate: 24.99 },
  { value: 'mortgage', label: 'Mortgage', minRate: 3.5, maxRate: 7.5 },
  { value: 'auto', label: 'Auto Loan', minRate: 3.99, maxRate: 12.99 },
  { value: 'business', label: 'Business Loan', minRate: 6.0, maxRate: 30.0 },
  { value: 'student', label: 'Student Loan', minRate: 3.5, maxRate: 12.99 },
  { value: 'home_equity', label: 'Home Equity', minRate: 4.0, maxRate: 10.0 },
];

const TERM_OPTIONS = [12, 24, 36, 48, 60, 72, 84, 120, 180, 240, 360];

const REQUIRED_DOCS = [
  { value: 'id_verification', label: 'ID Verification (Passport/License)' },
  { value: 'income_proof', label: 'Proof of Income' },
  { value: 'bank_statement', label: 'Bank Statement' },
];

const LoanApplicationPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    loan_type: '',
    amount: '',
    term_months: '',
    purpose: '',
    employment_status: '',
    annual_income: '',
    employer_name: '',
  });

  const [documents, setDocuments] = useState<Array<{
    type: string;
    file: File;
    uploaded: boolean;
  }>>([]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const docType = REQUIRED_DOCS.find(d => !documents.some(doc => doc.type === d.value));
    if (!docType) return;

    setDocuments(prev => [...prev, { type: docType.value, file, uploaded: false }]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    if (!user?.id) return false;

    for (const doc of documents) {
      if (doc.uploaded) continue;

      const filePath = `${user.id}/${Date.now()}_${doc.file.name}`;
      const { error: uploadError } = await supabase.storage.from('loan-documents').upload(filePath, doc.file);
      if (uploadError) {
        toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
        return false;
      }

      const { data: { publicUrl } } = supabase.storage.from('loan-documents').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('documents').insert({
        user_id: user.id,
        document_type: doc.type,
        file_name: doc.file.name,
        file_url: publicUrl,
        file_size: doc.file.size,
      });

      if (insertError) {
        toast({ title: 'Error saving document', description: insertError.message, variant: 'destructive' });
        return false;
      }

      doc.uploaded = true;
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    if (!user?.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      toast({
        title: 'Session error',
        description: 'Your account session is invalid. Please sign out and sign in again.',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    // Upload documents first
    const docsUploaded = await uploadDocuments();
    if (!docsUploaded) {
      setSubmitting(false);
      return;
    }

    const loanType = LOAN_TYPES.find((t) => t.value === form.loan_type);
    const estimatedRate = loanType ? (loanType.minRate + loanType.maxRate) / 2 : 0;

    const { data, error } = await supabase.from('loan_applications').insert({
      user_id: user.id,
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
    }).eq('user_id', user.id);

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

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

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
          <h1 className="font-heading text-2xl lg:text-3xl text-foreground">Apply for a Loan</h1>
          <p className="mt-1 text-sm text-muted-foreground">Complete the form below to submit your application</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-shrink-0">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                step >= s ? 'bg-gradient-gold text-accent-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {s}
              </div>
              {s < 4 && <div className={`h-0.5 w-8 sm:w-12 ${step > s ? 'bg-secondary' : 'bg-muted'}`} />}
            </div>
          ))}
          <span className="ml-3 text-sm text-muted-foreground flex-shrink-0">
            {step === 1 ? 'Loan Details' : step === 2 ? 'Employment' : step === 3 ? 'Documents' : 'Review'}
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
              <div>
                <h3 className="font-heading text-lg text-foreground">Required Documents</h3>
                <p className="text-sm text-muted-foreground">Please upload the following documents to complete your application.</p>
              </div>

              <div className="space-y-3">
                {REQUIRED_DOCS.map((doc) => {
                  const uploaded = documents.find(d => d.type === doc.value);
                  return (
                    <div key={doc.value} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{doc.label}</p>
                          {uploaded && (
                            <p className="text-xs text-muted-foreground">
                              {uploaded.file.name} ({formatSize(uploaded.file.size)})
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploaded ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-success" />
                            <Button variant="ghost" size="sm" onClick={() => removeDocument(documents.indexOf(uploaded))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                            <Upload className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button variant="gold" onClick={() => setStep(4)} disabled={documents.length < REQUIRED_DOCS.length}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
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
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground mb-2">Uploaded Documents</p>
                <div className="space-y-2">
                  {documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>{REQUIRED_DOCS.find(d => d.value === doc.type)?.label}</span>
                      <span className="text-muted-foreground">({doc.file.name})</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4" /> Back</Button>
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

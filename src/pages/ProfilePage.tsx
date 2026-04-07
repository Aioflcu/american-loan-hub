import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const ProfilePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    ssn_last_four: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    employment_status: '',
    annual_income: '',
    employer_name: '',
  });

  useEffect(() => {
    supabase.from('profiles').select('*').eq('user_id', user!.uid).single().then(({ data }) => {
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          date_of_birth: data.date_of_birth || '',
          ssn_last_four: data.ssn_last_four || '',
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          employment_status: data.employment_status || '',
          annual_income: data.annual_income ? String(data.annual_income) : '',
          employer_name: data.employer_name || '',
        });
      }
      setLoading(false);
    });
  }, [user]);

  const update = (field: string, value: string) => setProfile((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      ...profile,
      annual_income: profile.annual_income ? Number(profile.annual_income) : null,
    }).eq('user_id', user!.uid);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated successfully' });
    }
    setSaving(false);
  };

  if (loading) {
    return <AppLayout><div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your personal information</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6">
          <h3 className="font-heading text-lg text-card-foreground">Personal Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={profile.full_name} onChange={(e) => update('full_name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" placeholder="(555) 123-4567" value={profile.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={profile.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>SSN (Last 4)</Label>
              <Input maxLength={4} placeholder="••••" value={profile.ssn_last_four} onChange={(e) => update('ssn_last_four', e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6">
          <h3 className="font-heading text-lg text-card-foreground">Address</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Address Line 1</Label>
              <Input value={profile.address_line1} onChange={(e) => update('address_line1', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address Line 2</Label>
              <Input value={profile.address_line2} onChange={(e) => update('address_line2', e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={profile.city} onChange={(e) => update('city', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={profile.state} onValueChange={(v) => update('state', v)}>
                  <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input maxLength={5} value={profile.zip_code} onChange={(e) => update('zip_code', e.target.value.replace(/\D/g, '').slice(0, 5))} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-6">
          <h3 className="font-heading text-lg text-card-foreground">Employment</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Employment Status</Label>
              <Select value={profile.employment_status} onValueChange={(v) => update('employment_status', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed Full-Time</SelectItem>
                  <SelectItem value="part_time">Part-Time</SelectItem>
                  <SelectItem value="self_employed">Self-Employed</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Annual Income ($)</Label>
              <Input type="number" value={profile.annual_income} onChange={(e) => update('annual_income', e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Employer Name</Label>
              <Input value={profile.employer_name} onChange={(e) => update('employer_name', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="gold" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;

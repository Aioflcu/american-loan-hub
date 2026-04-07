import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2 } from 'lucide-react';

interface Doc {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  status: string;
  created_at: string;
}

const DOC_TYPES = [
  { value: 'id_verification', label: 'ID Verification (Passport/License)' },
  { value: 'income_proof', label: 'Proof of Income' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'tax_return', label: 'Tax Return' },
  { value: 'employment_letter', label: 'Employment Letter' },
  { value: 'other', label: 'Other' },
];

const DocumentsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('');

  const fetchDocs = async () => {
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    setDocuments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !docType || !user) return;

    setUploading(true);
    const filePath = `${user.uid}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage.from('loan-documents').upload(filePath, file);
    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('loan-documents').getPublicUrl(filePath);

    const { error: insertError } = await supabase.from('documents').insert({
      user_id: user.uid,
      document_type: docType,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
    });

    if (insertError) {
      toast({ title: 'Error', description: insertError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Document uploaded successfully' });
      fetchDocs();
    }
    setUploading(false);
    setDocType('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (doc: Doc) => {
    await supabase.from('documents').delete().eq('id', doc.id);
    toast({ title: 'Document deleted' });
    fetchDocs();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return <AppLayout><div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-primary" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl text-foreground">Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload and manage your loan documents</p>
        </div>

        {/* Upload section */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-heading text-lg text-card-foreground mb-4">Upload Document</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
              <Button variant="gold" disabled={!docType || uploading} onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Choose File'}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Accepted: PDF, JPG, PNG, DOC, DOCX (max 10MB)</p>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
            <p className="text-muted-foreground">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOC_TYPES.find((t) => t.value === doc.document_type)?.label} · {formatSize(doc.file_size)} · {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default DocumentsPage;

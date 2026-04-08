-- Create user_mappings table for Firebase-Supabase user mapping
CREATE TABLE IF NOT EXISTS public.user_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT NOT NULL UNIQUE,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own mapping" ON public.user_mappings FOR SELECT USING (
  supabase_user_id = auth.uid() OR
  firebase_uid = current_setting('request.jwt.claims', true)::json->>'firebase_uid'
);
CREATE POLICY "System can manage mappings" ON public.user_mappings FOR ALL USING (true);

CREATE TRIGGER update_user_mappings_updated_at BEFORE UPDATE ON public.user_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create documents table for storing uploaded loan application documents
CREATE TYPE public.document_type AS ENUM ('id_verification', 'income_proof', 'bank_statement', 'other');

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for loan documents
INSERT INTO storage.buckets (id, name, public) VALUES ('loan-documents', 'loan-documents', false);

-- Set up storage policies
CREATE POLICY "Users can view own document files" ON storage.objects FOR SELECT USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own document files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own document files" ON storage.objects FOR UPDATE USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own document files" ON storage.objects FOR DELETE USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
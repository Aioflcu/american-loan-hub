-- SQL to run in Supabase SQL Editor to set up documents functionality

-- Create document_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.document_type AS ENUM ('id_verification', 'income_proof', 'bank_statement', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.documents (
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

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can upload own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

-- Create policies
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('loan-documents', 'loan-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can view own document files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own document files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own document files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own document files" ON storage.objects;

CREATE POLICY "Users can view own document files" ON storage.objects FOR SELECT USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own document files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own document files" ON storage.objects FOR UPDATE USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own document files" ON storage.objects FOR DELETE USING (bucket_id = 'loan-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
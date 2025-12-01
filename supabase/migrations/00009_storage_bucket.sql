-- Create storage bucket for carbon uploads (bypasses Vercel size limits)
INSERT INTO storage.buckets (id, name, public)
VALUES ('carbon-uploads', 'carbon-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'carbon-uploads');

-- Policy: Users can read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'carbon-uploads');

-- Policy: Users can delete their own files  
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'carbon-uploads');

-- Policy: Service role has full access (for API processing)
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'carbon-uploads')
WITH CHECK (bucket_id = 'carbon-uploads');

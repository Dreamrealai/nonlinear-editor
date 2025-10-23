-- Create keyframes table for storing user-uploaded images and extracted scene frames
CREATE TABLE IF NOT EXISTS public.keyframes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_url text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_keyframes_project_id ON public.keyframes(project_id);
CREATE INDEX IF NOT EXISTS idx_keyframes_user_id ON public.keyframes(user_id);
CREATE INDEX IF NOT EXISTS idx_keyframes_created_at ON public.keyframes(created_at DESC);

-- Enable RLS
ALTER TABLE public.keyframes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own keyframes"
  ON public.keyframes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own keyframes"
  ON public.keyframes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keyframes"
  ON public.keyframes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keyframes"
  ON public.keyframes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_keyframes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_keyframes_updated_at
  BEFORE UPDATE ON public.keyframes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_keyframes_updated_at();

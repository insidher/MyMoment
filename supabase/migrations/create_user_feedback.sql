-- Create User Feedback Table
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 2000),
    category TEXT, -- Tagging element (e.g. 'Player Timeline', 'Design', etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: User Feedback
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedback is viewable by everyone" 
ON public.user_feedback FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert feedback" 
ON public.user_feedback FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback" 
ON public.user_feedback FOR DELETE 
USING (auth.uid() = user_id);

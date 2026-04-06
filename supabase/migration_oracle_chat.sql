-- ==========================================
-- ORACLE CHAT PERSISTENCE (100% PRIVATE)
-- ==========================================

-- 1. Create threads table
CREATE TABLE public.oracle_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create messages table
CREATE TABLE public.oracle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.oracle_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_invocations JSONB, -- For storing Vercel AI SDK tool calls
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.oracle_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oracle_messages ENABLE ROW LEVEL SECURITY;

-- 4. Strict Privacy Policies (Only the OWNER can see or touch their chat logs. Admins CANNOT bypass this unless they use the postgres bypass role)
CREATE POLICY "Users can only select their own threads"
  ON public.oracle_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own threads"
  ON public.oracle_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads"
  ON public.oracle_threads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads"
  ON public.oracle_threads FOR DELETE
  USING (auth.uid() = user_id);

-- Messages Policies
CREATE POLICY "Users can only select messages in their own threads"
  ON public.oracle_messages FOR SELECT
  USING (
    thread_id IN (SELECT id FROM public.oracle_threads WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert messages in their own threads"
  ON public.oracle_messages FOR INSERT
  WITH CHECK (
    thread_id IN (SELECT id FROM public.oracle_threads WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete messages in their own threads"
  ON public.oracle_messages FOR DELETE
  USING (
    thread_id IN (SELECT id FROM public.oracle_threads WHERE user_id = auth.uid())
  );

-- 5. Indexes for fast chat loading
CREATE INDEX idx_oracle_threads_user ON public.oracle_threads(user_id, updated_at DESC);
CREATE INDEX idx_oracle_messages_thread ON public.oracle_messages(thread_id, created_at ASC);

-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- to create the logging table used by the CX Reply Assistant.

create table if not exists public.reply_interactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  conversation_id text not null,
  brand_id text not null,

  customer_message text not null,
  retrieved_context jsonb not null,       -- the KB entries used as context
  guardrail_flags jsonb not null default '[]'::jsonb,

  ai_response text not null,              -- what the model generated
  edited_response text,                   -- what the agent edited it to (nullable)
  final_response text not null,           -- what was actually approved/sent
  needs_review boolean not null default false,

  model text,                             -- which LLM model generated the reply
  agent_action text not null default 'generated' -- generated | edited | regenerated | approved
);

-- Helpful indexes for the volumes described in Part 2 (millions of messages)
create index if not exists idx_reply_interactions_brand on public.reply_interactions (brand_id);
create index if not exists idx_reply_interactions_conversation on public.reply_interactions (conversation_id);
create index if not exists idx_reply_interactions_created_at on public.reply_interactions (created_at desc);

-- Row Level Security: enabled so that, once Supabase Auth + brand claims are
-- added (see architecture doc), a brand's rows are only ever visible to
-- that brand's own agents. For this assessment we use the service-role key
-- from the server only, so RLS doesn't block the demo, but it's on by
-- default as the correct posture for multi-brand data.
alter table public.reply_interactions enable row level security;

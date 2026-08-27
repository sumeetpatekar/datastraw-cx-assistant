# CX Reply Assistant

An AI-assisted reply tool for customer support agents, built for the Datastraw
Technologies Tech Lead assessment.

An agent opens a conversation, sees the customer, brand, order, and message
history, clicks **Generate Reply**, and gets an AI-drafted response that is
grounded in that brand's knowledge base -- with guardrails so it doesn't
confidently make promises the policy doesn't support. The agent can edit,
regenerate, or approve the reply. Every step is logged.

This README assumes you've never used any of these tools before. Follow it
top to bottom.

---

## 1. What you're going to do (overview)

1. Create three free accounts: **GitHub**, **Supabase**, **OpenRouter**.
2. Create a database table in Supabase (one copy/paste of SQL).
3. Get an API key from OpenRouter (for the AI).
4. Put this code on GitHub.
5. Deploy it with **Vercel** (connects to GitHub, auto-builds, gives you a
   public URL).
6. Add your keys as "environment variables" in Vercel.
7. Done -- you have a public URL to submit.

Total time if you've never done this before: roughly 30-45 minutes.

---

## 2. Create your accounts

- **GitHub** (to hold your code): https://github.com/signup
- **Supabase** (free database): https://supabase.com -> "Start your project"
  -> sign in with GitHub -> "New project" -> pick any name/password/region
  (the DB password doesn't matter for this app, just save it somewhere).
- **OpenRouter** (AI access): https://openrouter.ai -> sign up -> go to
  https://openrouter.ai/keys -> "Create Key". Add a small amount of credit
  (a few dollars) at https://openrouter.ai/settings/credits -- `gpt-4o-mini`
  costs fractions of a cent per reply, this project will cost you cents.
- **Vercel** (hosting/deployment): https://vercel.com/signup -> sign in with
  GitHub.

## 3. Set up the database (Supabase)

1. Open your Supabase project.
2. In the left sidebar, click **SQL Editor** -> **New query**.
3. Open the file `supabase/schema.sql` in this project, copy all of it,
   paste it into the SQL editor, and click **Run**.
4. That's it -- you now have a `reply_interactions` table that will store
   every AI reply, what the agent edited, and the final approved response.
5. Go to **Project Settings -> API**. You'll need two values from this page
   later: **Project URL** and the **service_role** key (under "Project API
   keys" -- click "Reveal" next to `service_role`). Keep this tab open.

## 4. Put the code on GitHub

If you're using this project folder as-is:

```bash
cd datastraw-cx-assistant
git init
git add .
git commit -m "Initial commit: CX Reply Assistant"
```

Then create a new empty repository on GitHub (https://github.com/new, do
**not** initialize it with a README), and run the two commands GitHub shows
you under "...or push an existing repository from the command line", e.g.:

```bash
git remote add origin https://github.com/YOUR_USERNAME/cx-reply-assistant.git
git branch -M main
git push -u origin main
```

## 5. Deploy on Vercel

1. Go to https://vercel.com/new.
2. Click **Import** next to the GitHub repo you just pushed.
3. Vercel will auto-detect this as a Next.js project. Don't click Deploy
   yet -- first expand **Environment Variables** and add these four:

   | Name | Value |
   |---|---|
   | `OPENROUTER_API_KEY` | the key from openrouter.ai/keys |
   | `OPENROUTER_MODEL` | `openai/gpt-4o-mini` (or leave unset) |
   | `SUPABASE_URL` | the Project URL from Supabase Settings -> API |
   | `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` key from the same page |

4. Click **Deploy**. Wait ~1-2 minutes.
5. Vercel gives you a public URL like `https://cx-reply-assistant.vercel.app`.
   **This is the URL you submit.**

## 6. Try it

- Open the deployed URL.
- Click the first conversation (**Priya Sharma**) -- her bottle arrived
  broken 3 days ago, which is inside every policy window. Click
  **Generate Reply**. You should get a confident, helpful reply, and
  "Confident" badge.
- Click the second conversation (**Ramesh Iyer**) -- he's asking for a
  refund 20 days after delivery, but the refund policy only covers 7 days.
  Click **Generate Reply**. This is the guardrail test case: the reply
  should hedge rather than promise a refund, and you'll see a **"Needs
  review"** badge with the flagged reason shown underneath.
- Try editing the reply text, then **Regenerate**, then **Approve**. Each
  action gets logged to the `reply_interactions` table in Supabase -- you
  can check this under Supabase -> Table Editor.

## 7. Running it locally (optional, e.g. to make changes)

Requires [Node.js](https://nodejs.org) (LTS version) installed.

```bash
npm install
cp .env.example .env.local
# edit .env.local and fill in your real keys
npm run dev
```

Open http://localhost:3000.

---

## How it works

1. **Conversation view** (`app/page.js`) shows mock customers, brand,
   order info, and message history (`lib/mockData.js`).
2. Agent clicks **Generate Reply** -> frontend calls
   `POST /api/generate-reply`.
3. That API route (`app/api/generate-reply/route.js`):
   - looks up the conversation and brand,
   - retrieves relevant knowledge base entries for the brand
     (`lib/retrieval.js` -- keyword matching over `lib/knowledgeBase.js`),
   - runs deterministic guardrail checks (`lib/guardrails.js`) that compare
     the order's delivery date against the policy's stated day-window,
   - builds a system prompt that hands the model only that context plus
     any guardrail flags, and instructs it not to promise outcomes the
     context doesn't support,
   - calls OpenRouter to generate the reply,
   - logs the interaction to Supabase,
   - returns the reply + confidence + retrieved context to the frontend.
4. Agent can edit the text, **Regenerate** (calls the same endpoint again),
   or **Approve** (logs the final action via `/api/log-action`).

See `ARCHITECTURE.md` (or the submitted architecture PDF/Word doc) for how
this would be redesigned at Datastraw's target scale (500 brands, 5,000
agents, millions of messages).

## Folder structure

```
app/
  page.js                       - main UI (conversation list + reply panel)
  layout.js, globals.css        - app shell / styling
  api/
    generate-reply/route.js     - identifies brand, retrieves KB, calls LLM, logs
    log-action/route.js         - logs agent edit/approve actions
lib/
  mockData.js                   - mock customers, brands, orders, conversations
  knowledgeBase.js               - mock brand policies (return/refund/shipping/cancellation)
  retrieval.js                  - keyword-based retrieval over the knowledge base
  guardrails.js                 - deterministic policy-window checks
  supabaseClient.js             - server-side Supabase client for logging
supabase/
  schema.sql                    - the `reply_interactions` logging table
.env.example                    - required environment variables
```

## Known limitations (by design, for a 10-12 hour scope)

- No Supabase Auth / login -- single shared agent view. A real version would
  gate this behind Supabase Auth with a brand claim, enforced by Row Level
  Security (see architecture doc).
- Retrieval is keyword matching, not vector search -- fine for ~4 policies
  per brand, not for hundreds of brands with long KBs (see architecture doc
  for the Qdrant-based plan).
- Data is mocked in a JS file rather than pulled from a real CRM/order
  system.

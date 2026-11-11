# Environment Variable Setup Guide - Dudex Smart Academy

## Step 1: Create your Supabase Project
1. Go to [Supabase Dashboard](https://app.supabase.com) and create a project (e.g. `dudex-smart-academy`).
2. Navigate to **Project Settings** -> **API**.

---

## Step 2: Configure Client Environment Variables
Create a file named `.env` in the root of the project:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> [!WARNING]
> **DO NOT** place `SUPABASE_SERVICE_ROLE_KEY` or the database password in `.env` or client-side code. The browser application must only possess the publishable anonymous key.

---

## Step 3: Run Database Migrations
Execute the migrations in sequential order using the Supabase CLI or SQL Editor:

```bash
# Using Supabase CLI:
supabase db push

# Or run files 001 through 040 in the Supabase SQL Editor:
# 1. 001_extensions.sql
# ...
# 40. 040_seed_data.sql
```

---

## Step 4: Storage Bucket Setup
Migration `038_storage.sql` automatically registers the `academy-notes` private bucket and configures storage policies.
Verify under **Storage** in the Supabase dashboard that the `academy-notes` bucket is set to **Private**.

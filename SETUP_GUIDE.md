# Thinkify Quiz Platform - Setup Guide

## Database Setup Issues Troubleshooting

If you're seeing errors related to missing database tables or authentication issues, follow this guide to properly set up your application.

### Step 1: Check Your Environment Variables

Make sure your `.env.local` file contains the correct Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://elephumnrmexytddgtrb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZXBodW1ucm1leHl0ZGRndHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MTgyNTIsImV4cCI6MjA2MzM5NDI1Mn0.pCAlQvCQ0nTqFgNCv06GVopEPw4OxV-ejk-6qppQffA
```

Common issues:
- Extra characters (like `%` at the end of the key)
- Line breaks in the key
- Missing or incorrect URL

### Step 2: Initialize the Database

Run the database initialization script:

```bash
npm run init-db
```

This script will:
1. Attempt to create all required tables
2. Add sample data for testing
3. Create test users

### Step 3: Manual Database Setup (if automatic initialization fails)

If the automatic setup fails, you'll need to manually create the database tables:

1. Stop the development server if it's running
2. Log in to the [Supabase Dashboard](https://app.supabase.io/)
3. Select your project
4. Go to the SQL Editor
5. Copy the contents of `scripts/supabase-sql.sql`
6. Paste into the SQL editor and run the commands
7. After the tables are created, run `npm run init-db` again to add sample data

### Step 4: Setting Up Test Users

After database initialization, you should have two test users:

- Admin: `admin@example.com` (ID: 00000000-0000-0000-0000-000000000000)
- User: `user@example.com` (ID: 11111111-1111-1111-1111-111111111111)

To set passwords for these users:
1. Go to the Authentication section in your Supabase dashboard
2. Find these users in the "Users" section
3. Use the "Reset password" feature to set a password for testing

Alternatively, you can sign up with new email addresses and use the application normally.

### Step 5: Database Table Schema

If you need to manually recreate any tables, here's the schema:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user'))
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('multiple_choice', 'text')),
  options JSONB,
  correct_answer TEXT NOT NULL
);

-- Assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, quiz_id)
);

-- Results table
CREATE TABLE IF NOT EXISTS public.results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score NUMERIC NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  paid_at TIMESTAMP WITH TIME ZONE
);
```

### Common Errors and Solutions

1. **"Invalid API key" or 401 Unauthorized**
   - Check your Supabase anon key in .env.local
   - Ensure your Supabase project hasn't expired
   
2. **"relation 'users' does not exist" or similar 404 errors**
   - Follow the database setup steps above
   - Check if the tables actually exist in your Supabase dashboard
   
3. **Rate limit exceeded (429 error)**
   - Wait a few minutes before trying again
   - Supabase has rate limits especially on free tier
   
4. **400 Bad Request on sign-up/login**
   - Ensure Authentication is enabled in your Supabase project
   - Check if email confirmations are disabled for testing purposes

### Need More Help?

If you're still experiencing issues, check:
1. Supabase documentation: https://supabase.io/docs
2. Next.js App Router documentation: https://nextjs.org/docs/app 
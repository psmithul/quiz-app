-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if needed (uncomment if you want to reset everything)
-- DROP TABLE IF EXISTS public.payments CASCADE;
-- DROP TABLE IF EXISTS public.results CASCADE;
-- DROP TABLE IF EXISTS public.assignments CASCADE;
-- DROP TABLE IF EXISTS public.questions CASCADE;
-- DROP TABLE IF EXISTS public.quizzes CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user'))
);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('multiple_choice', 'text')),
  options JSONB,
  correct_answer TEXT NOT NULL
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, quiz_id)
);

-- Create results table
CREATE TABLE IF NOT EXISTS public.results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score NUMERIC NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Insert sample admin user
INSERT INTO public.users (id, email, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin@example.com', 'admin')
ON CONFLICT (id) DO NOTHING;

-- Insert sample regular user
INSERT INTO public.users (id, email, role)
VALUES ('11111111-1111-1111-1111-111111111111', 'user@example.com', 'user')
ON CONFLICT (id) DO NOTHING;

-- Insert sample quizzes
INSERT INTO public.quizzes (title, description)
VALUES 
  ('JavaScript Basics', 'Test your knowledge of JavaScript fundamentals'),
  ('React Components', 'Quiz about React component patterns and best practices')
ON CONFLICT DO NOTHING
RETURNING id; 
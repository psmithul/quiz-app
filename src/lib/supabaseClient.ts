import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export type User = {
  id: string;
  email: string;
  role: 'admin' | 'user';
};

export type Quiz = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

export type Question = {
  id: string;
  quiz_id: string;
  prompt: string;
  type: 'multiple_choice' | 'text';
  options: string[] | null;
  correct_answer: string;
};

export type Assignment = {
  id: string;
  user_id: string;
  quiz_id: string;
  assigned_at: string;
};

export type Result = {
  id: string;
  user_id: string;
  quiz_id: string;
  answers: Record<string, string>;
  score: number;
  completed_at: string;
};

export type Payment = {
  id: string;
  user_id: string;
  quiz_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  paid_at: string | null;
}; 
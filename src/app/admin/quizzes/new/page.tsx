'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { formatErrorMessage } from '@/utils/errorHandler';

export default function CreateQuizPage() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not admin
  if (!authLoading && (!user || !isAdmin)) {
    router.push(user ? '/user/dashboard' : '/auth/login');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Create new quiz
      const { data, error: quizError } = await supabase
        .from('quizzes')
        .insert([
          { 
            title: title.trim(),
            description: description.trim() 
          }
        ])
        .select()
        .single();

      if (quizError) throw quizError;
      
      // Redirect to add questions page
      router.push(`/admin/quizzes/${data.id}/questions`);
    } catch (err) {
      setError(formatErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Quiz</h1>
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/dashboard')}
          >
            Cancel
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 p-4 rounded-md mb-6">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 border border-gray-200 space-y-6">
          <Input
            id="title"
            label="Quiz Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., JavaScript Fundamentals"
          />

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              placeholder="Describe what this quiz is about..."
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={!title.trim()}
            >
              Create Quiz
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
} 
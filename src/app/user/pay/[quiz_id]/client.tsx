'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/authContext';
import { supabase, Quiz } from '@/lib/supabaseClient';
import { formatErrorMessage } from '@/utils/errorHandler';

export default function PaymentClient({
  quizId
}: {
  quizId: string;
}) { 
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function fetchQuiz() {
      if (!user) return;

      try {
        // Check if user already has access to this quiz
        const { data: assignments, error: assignmentError } = await supabase
          .from('assignments')
          .select('*')
          .eq('user_id', user.id)
          .eq('quiz_id', quizId);

        if (assignmentError) throw assignmentError;

        // If user already has this quiz assigned, redirect to quiz page
        if (assignments && assignments.length > 0) {
          router.push(`/user/quiz/${quizId}`);
          return;
        }

        // Get quiz details
        const { data, error } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();

        if (error) throw error;
        setQuiz(data);
      } catch (err) {
        setError(formatErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchQuiz();
    }
  }, [user, quizId, router]);

  async function handlePayment() {
    if (!user || !quiz) return;

    setIsProcessing(true);
    setError(null);

    try {
      // This would typically integrate with a payment processor
      // For now, simulate a payment process
      
      // Record the payment
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            user_id: user.id,
            quiz_id: quiz.id,
            amount: 9.99, // Example price
            status: 'completed',
            paid_at: new Date().toISOString()
          }
        ])
        .select()
        .single();
        
      if (paymentError) throw paymentError;

      // No longer automatically creating the assignment
      // Instead, the admin will need to assign the quiz

      setSuccess('Payment successful! Please wait for an admin to assign this quiz to you.');
      
      // Redirect after a short delay to dashboard instead of quiz
      setTimeout(() => {
        router.push(`/user/dashboard`);
      }, 3000);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  }

  if (authLoading || isLoading) {
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
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Unlock Quiz</h1>
        
        {error && (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 p-4 rounded-md">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}
        
        {quiz && (
          <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-medium text-gray-900">{quiz.title}</h2>
            <p className="mt-2 text-gray-600">{quiz.description}</p>
            
            <div className="mt-6 p-4 bg-purple-50 rounded-md">
              <p className="text-purple-700 font-medium">This quiz requires payment to unlock:</p>
              <p className="text-3xl font-bold text-purple-700 mt-2">$9.99</p>
            </div>
            
            <div className="mt-6">
              <Button
                fullWidth
                isLoading={isProcessing}
                onClick={handlePayment}
                disabled={!!success}
              >
                {success ? 'Quiz Unlocked!' : 'Pay Now & Unlock Quiz'}
              </Button>
              <p className="mt-2 text-xs text-gray-500 text-center">
                * This is a simulation. No actual payment will be processed.
              </p>
            </div>
          </div>
        )}
        
        <div className="text-center">
          <Button variant="outline" onClick={() => router.push('/user/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </Layout>
  );
} 
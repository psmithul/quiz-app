'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/authContext';
import { supabase, Quiz, Assignment } from '@/lib/supabaseClient';
import { formatErrorMessage } from '@/utils/errorHandler';

type AssignedQuiz = Quiz & { assignment_id: string };

export default function UserDashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [assignedQuizzes, setAssignedQuizzes] = useState<AssignedQuiz[]>([]);
  const [unassignedQuizzes, setUnassignedQuizzes] = useState<Quiz[]>([]);
  const [paidQuizzes, setPaidQuizzes] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function fetchQuizzes() {
      if (!user) return;
      
      try {
        // Get assigned quizzes
        const { data: assignments, error: assignmentError } = await supabase
          .from('assignments')
          .select('*, quizzes(*)')
          .eq('user_id', user.id);

        if (assignmentError) throw assignmentError;

        const assignedQuizIds = assignments.map(a => a.quiz_id);
        const assignedQuizzesData = assignments.map(a => ({
          ...a.quizzes,
          assignment_id: a.id
        }));
        setAssignedQuizzes(assignedQuizzesData);

        // Get unassigned quizzes
        const { data: allQuizzes, error: quizError } = await supabase
          .from('quizzes')
          .select('*');

        if (quizError) throw quizError;

        const unassigned = allQuizzes.filter(
          quiz => !assignedQuizIds.includes(quiz.id)
        );
        setUnassignedQuizzes(unassigned);
        
        // Get payment status
        const { data: payments, error: paymentError } = await supabase
          .from('payments')
          .select('quiz_id, status')
          .eq('user_id', user.id)
          .eq('status', 'completed');
        
        if (paymentError) throw paymentError;
        
        const paidQuizzesMap: { [key: string]: boolean } = {};
        payments?.forEach(payment => {
          paidQuizzesMap[payment.quiz_id] = true;
        });
        
        setPaidQuizzes(paidQuizzesMap);
      } catch (err) {
        setError(formatErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchQuizzes();
    }
  }, [user]);

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
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My Quizzes</h1>
          <Button 
            variant="outline"
            onClick={() => router.push('/user/results')}
          >
            View My Results
          </Button>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h2 className="text-lg font-medium text-blue-800 mb-2">How Quizzes Work</h2>
          <p className="text-blue-700">
            Quizzes must be assigned to you by an admin before you can take them, even after payment. 
            If you've paid for a quiz but don't see it in your Assigned Quizzes section, please contact an administrator.
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <div>
          <h2 className="text-xl font-medium text-gray-900 mb-4">Assigned Quizzes</h2>
          {assignedQuizzes.length === 0 ? (
            <p className="text-gray-500">You don't have any assigned quizzes yet. Contact an administrator to get your quizzes assigned.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white shadow rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">{quiz.title}</h3>
                  <p className="mt-1 text-gray-500">{quiz.description}</p>
                  <div className="mt-4">
                    <Button 
                      onClick={() => router.push(`/user/quiz/${quiz.id}`)}
                    >
                      Take Quiz
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {unassignedQuizzes.length > 0 && (
          <div>
            <h2 className="text-xl font-medium text-gray-900 mb-4">Available Quizzes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unassignedQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white shadow rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">{quiz.title}</h3>
                  <p className="mt-1 text-gray-500">{quiz.description}</p>
                  <div className="mt-4 space-y-2">
                    {paidQuizzes[quiz.id] ? (
                      <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800">
                        ⚠️ Paid but waiting for admin assignment
                      </div>
                    ) : (
                      <Button 
                        variant="outline"
                        onClick={() => router.push(`/user/pay/${quiz.id}`)}
                      >
                        Unlock Quiz
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 
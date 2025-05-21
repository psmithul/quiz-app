'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/authContext';
import { supabase, Quiz, User } from '@/lib/supabaseClient';
import { formatErrorMessage } from '@/utils/errorHandler';
import React from 'react';

export default function AssignQuizPage({
  params,
}: {
  params: { quiz_id: string };
}) {
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params as unknown as Promise<{ quiz_id: string }>);
  const quizId = unwrappedParams.quiz_id;

  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (!isAdmin) {
        router.push('/user/dashboard');
      }
    }
  }, [authLoading, user, isAdmin, router]);

  useEffect(() => {
    async function fetchData() {
      if (!user || !isAdmin) return;
      
      try {
        // Fetch quiz details
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();

        if (quizError) throw quizError;
        setQuiz(quizData);

        // Fetch all users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'user');

        if (usersError) throw usersError;
        setUsers(usersData);

        // Fetch existing assignments for this quiz
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('user_id')
          .eq('quiz_id', quizId);

        if (assignmentsError) throw assignmentsError;
        
        const assignedIds = assignmentsData.map(a => a.user_id);
        setAssignedUserIds(assignedIds);
      } catch (err) {
        setError(formatErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin, quizId]);

  async function handleAssignQuiz() {
    if (!quiz || selectedUserIds.length === 0) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const assignments = selectedUserIds.map(userId => ({
        user_id: userId,
        quiz_id: quiz.id,
        assigned_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('assignments')
        .insert(assignments);

      if (error) throw error;

      setSuccess(`Successfully assigned quiz to ${selectedUserIds.length} users.`);
      setAssignedUserIds([...assignedUserIds, ...selectedUserIds]);
      setSelectedUserIds([]);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Assign Quiz: {quiz?.title}
          </h1>
          <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
            Back to Dashboard
          </Button>
        </div>

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

        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Select Users to Assign</h2>

          {users.length === 0 ? (
            <p className="text-gray-500">No users available to assign this quiz to.</p>
          ) : (
            <>
              <div className="mb-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const unassignedUserIds = users
                      .filter(u => !assignedUserIds.includes(u.id))
                      .map(u => u.id);
                    setSelectedUserIds(unassignedUserIds);
                  }}
                >
                  Select All Unassigned
                </Button>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="w-12 px-4 py-3"></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((userData) => {
                      const isAssigned = assignedUserIds.includes(userData.id);
                      const isSelected = selectedUserIds.includes(userData.id);
                      return (
                        <tr 
                          key={userData.id} 
                          className={`${isSelected ? 'bg-purple-50' : ''} ${isAssigned ? 'opacity-50' : ''}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isAssigned}
                              onChange={() => !isAssigned && toggleUserSelection(userData.id)}
                              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {userData.email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            {isAssigned ? (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                Assigned
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                                Not Assigned
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {selectedUserIds.length} users selected for assignment
                </p>
                <Button
                  onClick={handleAssignQuiz}
                  disabled={selectedUserIds.length === 0}
                  isLoading={isSubmitting}
                >
                  Assign Quiz
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
} 
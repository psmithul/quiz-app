'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { formatErrorMessage } from '@/utils/errorHandler';

type User = {
  id: string;
  email: string;
  role: string;
};

type Quiz = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

type Assignment = {
  id: string;
  user_id: string;
  quiz_id: string;
  assigned_at: string;
  quiz: Quiz;
};

type Result = {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  completed_at: string;
  quiz: Quiz;
};

export default function UserClient({
  userId
}: {
  userId: string;
}) {
  const router = useRouter();
  const { user: currentUser, isAdmin, isLoading: authLoading } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push('/auth/login');
      } else if (!isAdmin) {
        router.push('/user/dashboard');
      }
    }
  }, [authLoading, currentUser, isAdmin, router]);

  useEffect(() => {
    async function fetchData() {
      if (!currentUser || !isAdmin) return;
      
      try {
        // Fetch user details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError) throw userError;
        setUserData(userData);

        // Fetch user's assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*, quiz:quizzes(*)')
          .eq('user_id', userId);

        if (assignmentsError) throw assignmentsError;
        setAssignments(assignmentsData || []);

        // Fetch user's results
        const { data: resultsData, error: resultsError } = await supabase
          .from('results')
          .select('*, quiz:quizzes(*)')
          .eq('user_id', userId);

        if (resultsError) throw resultsError;
        setResults(resultsData || []);

        // Fetch all quizzes
        const { data: quizzesData, error: quizzesError } = await supabase
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false });

        if (quizzesError) throw quizzesError;
        
        // Filter out already assigned quizzes
        const assignedQuizIds = assignmentsData?.map(a => a.quiz_id) || [];
        const unassignedQuizzes = quizzesData.filter(quiz => !assignedQuizIds.includes(quiz.id));
        
        setAvailableQuizzes(unassignedQuizzes);
      } catch (err) {
        setError(formatErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    if (currentUser && isAdmin) {
      fetchData();
    }
  }, [currentUser, isAdmin, userId]);

  async function handleAssignQuizzes() {
    if (!userData || selectedQuizIds.length === 0) return;

    setIsAssigning(true);
    setError(null);
    setSuccess(null);

    try {
      const newAssignments = selectedQuizIds.map(quizId => ({
        user_id: userData.id,
        quiz_id: quizId,
        assigned_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('assignments')
        .insert(newAssignments)
        .select('*, quiz:quizzes(*)');

      if (error) throw error;

      // Update state
      setAssignments(prev => [...prev, ...(data || [])]);
      
      // Remove assigned quizzes from available quizzes
      setAvailableQuizzes(prev => prev.filter(quiz => !selectedQuizIds.includes(quiz.id)));
      
      // Clear selection
      setSelectedQuizIds([]);
      
      setSuccess(`Successfully assigned ${selectedQuizIds.length} quizzes to ${userData.email}.`);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string, quizId: string, quizTitle: string) {
    if (!userData) return;

    setIsRemoving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      // Update assignments list
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      
      // Add quiz back to available quizzes
      const removedQuiz = assignments.find(a => a.id === assignmentId)?.quiz;
      if (removedQuiz) {
        setAvailableQuizzes(prev => [...prev, removedQuiz]);
      }
      
      setSuccess(`Successfully removed quiz "${quizTitle}" from ${userData.email}.`);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsRemoving(false);
    }
  }

  function toggleQuizSelection(quizId: string) {
    setSelectedQuizIds(prev => {
      if (prev.includes(quizId)) {
        return prev.filter(id => id !== quizId);
      } else {
        return [...prev, quizId];
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
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Manage User</h1>
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/dashboard')}
          >
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

        {userData && (
          <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-medium text-gray-900 mb-4">User Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">ID</p>
                <p className="font-medium">{userData.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{userData.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium capitalize">{userData.role}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-medium text-gray-900 mb-4">Assigned Quizzes</h2>
          
          {assignments.length === 0 ? (
            <p className="text-gray-500">No quizzes assigned to this user yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quiz Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned On</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map((assignment) => {
                    const result = results.find(r => r.quiz_id === assignment.quiz_id);
                    return (
                      <tr key={assignment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {assignment.quiz?.title || "Unknown quiz"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(assignment.assigned_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {result ? (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                              Completed ({result.score.toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                              Not started
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-red-600 hover:text-red-900"
                            onClick={() => handleRemoveAssignment(assignment.id, assignment.quiz_id, assignment.quiz?.title || "Unknown quiz")}
                            disabled={isRemoving}
                          >
                            {isRemoving ? 'Removing...' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {availableQuizzes.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-medium text-gray-900 mb-4">Assign New Quizzes</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Select quizzes to assign to this user:
              </p>
              
              <div className="space-y-2 max-h-64 overflow-y-auto p-2 border rounded-md">
                {availableQuizzes.map((quiz) => (
                  <label key={quiz.id} className="flex items-start p-2 hover:bg-gray-50 rounded-md cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedQuizIds.includes(quiz.id)}
                      onChange={() => toggleQuizSelection(quiz.id)}
                      className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <div className="ml-3">
                      <span className="block font-medium text-gray-900">{quiz.title}</span>
                      <span className="block text-sm text-gray-500">{quiz.description}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {selectedQuizIds.length} quizzes selected
              </p>
              
              <Button
                onClick={handleAssignQuizzes}
                disabled={selectedQuizIds.length === 0 || isAssigning}
                isLoading={isAssigning}
              >
                Assign Selected Quizzes
              </Button>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-medium text-gray-900 mb-4">Quiz Results</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quiz</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed On</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result) => (
                    <tr key={result.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.quiz?.title || "Unknown quiz"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.score.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(result.completed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 
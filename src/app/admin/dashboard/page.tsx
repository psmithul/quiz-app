'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/authContext';
import { supabase, Quiz, User } from '@/lib/supabaseClient';
import { formatErrorMessage } from '@/utils/errorHandler';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignmentCounts, setAssignmentCounts] = useState<Record<string, number>>({});
  const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

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
        // Fetch all quizzes
        const { data: quizzesData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .order('created_at', { ascending: false });

        if (quizError) throw quizError;
        setQuizzes(quizzesData);

        // Fetch all regular users (non-admins)
        const { data: usersData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'user');

        if (userError) throw userError;
        setUsers(usersData);

        // Fetch all assignments
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('quiz_id');

        if (assignmentsError) throw assignmentsError;
        
        // Count assignments per quiz
        const countMap: Record<string, number> = {};
        if (assignmentsData) {
          for (const item of assignmentsData) {
            if (item.quiz_id) {
              countMap[item.quiz_id] = (countMap[item.quiz_id] || 0) + 1;
            }
          }
        }
        
        setAssignmentCounts(countMap);
        
        // Fetch payments that don't have corresponding assignments
        const { data: pendingPayments, error: pendingError } = await supabase
          .from('payments')
          .select(`
            id,
            user_id,
            quiz_id,
            paid_at,
            users:user_id (email),
            quizzes:quiz_id (title)
          `)
          .eq('status', 'completed');
          
        if (pendingError) throw pendingError;
        
        if (pendingPayments) {
          // Filter out payments that already have assignments
          const { data: existingAssignments, error: existingError } = await supabase
            .from('assignments')
            .select('user_id, quiz_id');
            
          if (existingError) throw existingError;
          
          const assignmentMap: Record<string, boolean> = {};
          if (existingAssignments) {
            for (const assignment of existingAssignments) {
              const key = `${assignment.user_id}_${assignment.quiz_id}`;
              assignmentMap[key] = true;
            }
          }
          
          const pending = pendingPayments.filter(payment => {
            const key = `${payment.user_id}_${payment.quiz_id}`;
            return !assignmentMap[key];
          });
          
          setPendingAssignments(pending);
        }
      } catch (err) {
        setError(formatErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  function handleCreateQuiz() {
    router.push('/admin/quizzes/new');
  }

  function handleEditQuiz(quizId: string) {
    router.push(`/admin/quizzes/${quizId}/questions`);
  }

  function handleAssignQuiz(quizId: string) {
    router.push(`/admin/assign/${quizId}`);
  }

  function handleViewResults(quizId: string) {
    router.push(`/admin/results/${quizId}`);
  }
  
  function confirmDeleteQuiz(quiz: Quiz) {
    setQuizToDelete(quiz);
  }
  
  async function handleDeleteQuiz() {
    if (!quizToDelete) return;
    
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // First delete all associated records
      // This assumes we have cascading deletes set up in the database
      // If not, we need to delete related records manually
      
      // Delete questions
      const { error: questionsError } = await supabase
        .from('questions')
        .delete()
        .eq('quiz_id', quizToDelete.id);
        
      if (questionsError) throw questionsError;
      
      // Delete assignments
      const { error: assignmentsError } = await supabase
        .from('assignments')
        .delete()
        .eq('quiz_id', quizToDelete.id);
        
      if (assignmentsError) throw assignmentsError;
      
      // Delete results
      const { error: resultsError } = await supabase
        .from('results')
        .delete()
        .eq('quiz_id', quizToDelete.id);
        
      if (resultsError) throw resultsError;
      
      // Delete payments
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('quiz_id', quizToDelete.id);
        
      if (paymentsError) throw paymentsError;
      
      // Finally, delete the quiz
      const { error: quizError } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizToDelete.id);
        
      if (quizError) throw quizError;
      
      // Update local state
      setQuizzes(prevQuizzes => prevQuizzes.filter(q => q.id !== quizToDelete.id));
      
      // Clear assignment counts for this quiz
      const newAssignmentCounts = { ...assignmentCounts };
      delete newAssignmentCounts[quizToDelete.id];
      setAssignmentCounts(newAssignmentCounts);
      
      setSuccess(`Quiz "${quizToDelete.title}" deleted successfully.`);
      setQuizToDelete(null);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  }
  
  function cancelDelete() {
    setQuizToDelete(null);
  }

  async function handleAssignPendingQuiz(userId: string, quizId: string, paymentId: string) {
    setIsAssigning(true);
    setError(null);
    
    try {
      // Create assignment
      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert([
          {
            user_id: userId,
            quiz_id: quizId,
            assigned_at: new Date().toISOString()
          }
        ]);
        
      if (assignmentError) throw assignmentError;
      
      // Update local state
      setPendingAssignments(prev => prev.filter(item => item.id !== paymentId));
      
      setSuccess('Quiz assigned successfully!');
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsAssigning(false);
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
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <Button onClick={handleCreateQuiz}>Create New Quiz</Button>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h2 className="text-lg font-medium text-purple-800 mb-2">Admin Actions</h2>
          <p className="text-purple-700">
            As an admin, you can create quizzes, add questions, and assign quizzes to users. 
            <strong> Remember: Users can only take quizzes that have been assigned to them, even after payment.</strong>
          </p>
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

        {pendingAssignments.length > 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h2 className="text-lg font-medium text-yellow-800 mb-2">
              Pending Assignments ({pendingAssignments.length})
            </h2>
            <p className="text-yellow-700 mb-4">
              The following users have paid for quizzes but are waiting for you to assign them.
            </p>
            
            <div className="bg-white shadow overflow-hidden rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quiz</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid At</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingAssignments.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.users?.email || 'Unknown user'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quizzes?.title || 'Unknown quiz'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.paid_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-green-600 hover:text-green-900"
                          onClick={() => handleAssignPendingQuiz(item.user_id, item.quiz_id, item.id)}
                          disabled={isAssigning}
                        >
                          {isAssigning ? 'Assigning...' : 'Assign Now'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Quiz Confirmation Modal */}
        {quizToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Quiz</h3>
              <p className="mb-6">
                Are you sure you want to delete the quiz "<span className="font-medium">{quizToDelete.title}</span>"? 
                This will also delete all questions, assignments, and results associated with this quiz.
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={cancelDelete}
                >
                  Cancel
                </Button>
                <Button 
                  variant="danger"
                  isLoading={isDeleting}
                  onClick={handleDeleteQuiz}
                >
                  Delete Quiz
                </Button>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-medium text-gray-900 mb-4">Quizzes</h2>
          {quizzes.length === 0 ? (
            <p className="text-gray-500">No quizzes yet. Create your first quiz!</p>
          ) : (
            <div className="bg-white shadow overflow-hidden rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quizzes.map((quiz) => (
                    <tr key={quiz.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {quiz.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {quiz.description && quiz.description.length > 50 
                          ? `${quiz.description.substring(0, 50)}...` 
                          : quiz.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(quiz.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {assignmentCounts[quiz.id] ? (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            {assignmentCounts[quiz.id]} users
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                            Not assigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button 
                          className="text-purple-600 hover:text-purple-900"
                          onClick={() => handleEditQuiz(quiz.id)}
                        >
                          Edit
                        </button>
                        <button 
                          className="text-green-600 hover:text-green-900"
                          onClick={() => handleAssignQuiz(quiz.id)}
                        >
                          Assign
                        </button>
                        <button 
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => handleViewResults(quiz.id)}
                        >
                          Results
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900"
                          onClick={() => confirmDeleteQuiz(quiz)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-medium text-gray-900 mb-4">Users</h2>
          {users.length === 0 ? (
            <p className="text-gray-500">No users registered yet.</p>
          ) : (
            <div className="bg-white shadow overflow-hidden rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-purple-600 hover:text-purple-900"
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
} 
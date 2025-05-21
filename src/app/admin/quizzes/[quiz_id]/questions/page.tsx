'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/authContext';
import { supabase, Quiz } from '@/lib/supabaseClient';
import { formatErrorMessage } from '@/utils/errorHandler';
import React from 'react';

type QuestionType = 'multiple_choice' | 'text';

interface QuestionFormData {
  prompt: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
}

export default function AddQuestionsPage({
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
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionFormData>({
    prompt: '',
    type: 'multiple_choice',
    options: ['', '', '', ''],
    correctAnswer: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

        // Fetch existing questions for this quiz
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('id');

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);
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

  function handleQuestionTypeChange(type: QuestionType) {
    setCurrentQuestion(prev => ({
      ...prev,
      type,
      options: type === 'multiple_choice' ? ['', '', '', ''] : [],
      correctAnswer: '',
    }));
  }

  function handleOptionChange(index: number, value: string) {
    setCurrentQuestion(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  }

  function addOption() {
    setCurrentQuestion(prev => ({
      ...prev,
      options: [...prev.options, ''],
    }));
  }

  function removeOption(index: number) {
    setCurrentQuestion(prev => {
      const newOptions = prev.options.filter((_, i) => i !== index);
      
      // Clear correctAnswer if it was set to the removed option
      let correctAnswer = prev.correctAnswer;
      if (correctAnswer === String(index)) {
        correctAnswer = '';
      } else if (parseInt(correctAnswer) > index) {
        // Adjust correctAnswer index if it's after the removed option
        correctAnswer = String(parseInt(correctAnswer) - 1);
      }
      
      return { ...prev, options: newOptions, correctAnswer };
    });
  }

  async function handleAddQuestion() {
    if (!quiz || !currentQuestion.prompt.trim()) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare question data
      const questionData = {
        quiz_id: quiz.id,
        prompt: currentQuestion.prompt.trim(),
        type: currentQuestion.type,
        options: currentQuestion.type === 'multiple_choice' 
          ? currentQuestion.options.filter(o => o.trim()) 
          : null,
        correct_answer: currentQuestion.type === 'multiple_choice'
          ? currentQuestion.options[parseInt(currentQuestion.correctAnswer)]
          : currentQuestion.correctAnswer
      };

      // Save question to database
      const { data, error: questionError } = await supabase
        .from('questions')
        .insert([questionData])
        .select()
        .single();

      if (questionError) throw questionError;

      // Add to local state
      setQuestions(prev => [...prev, data]);
      
      // Reset form
      setCurrentQuestion({
        prompt: '',
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correctAnswer: '',
      });

      setSuccess('Question added successfully!');
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFinish() {
    router.push('/admin/dashboard');
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
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Add Questions: {quiz?.title}
          </h1>
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 p-4 rounded-md mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 p-4 rounded-md mb-4">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6 border border-gray-200 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Question</h2>
          
          <div className="space-y-6">
            <Input
              id="prompt"
              label="Question Prompt"
              required
              value={currentQuestion.prompt}
              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="e.g., What is JavaScript used for?"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={currentQuestion.type === 'multiple_choice'}
                    onChange={() => handleQuestionTypeChange('multiple_choice')}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Multiple Choice</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={currentQuestion.type === 'text'}
                    onChange={() => handleQuestionTypeChange('text')}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Text Answer</span>
                </label>
              </div>
            </div>

            {currentQuestion.type === 'multiple_choice' ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Options
                </label>
                
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={currentQuestion.correctAnswer === String(index)}
                      onChange={() => setCurrentQuestion(prev => ({ ...prev, correctAnswer: String(index) }))}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    />
                    {currentQuestion.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addOption}
                  className="mt-2 text-sm text-purple-600 hover:text-purple-900"
                >
                  + Add Another Option
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correct Answer
                </label>
                <input
                  type="text"
                  value={currentQuestion.correctAnswer}
                  onChange={(e) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                  placeholder="Enter the correct answer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={handleAddQuestion}
                isLoading={isSaving}
                disabled={
                  !currentQuestion.prompt.trim() || 
                  (currentQuestion.type === 'multiple_choice' && (
                    currentQuestion.options.filter(o => o.trim()).length < 2 ||
                    currentQuestion.correctAnswer === ''
                  )) ||
                  (currentQuestion.type === 'text' && !currentQuestion.correctAnswer.trim())
                }
              >
                Add Question
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Current Questions ({questions.length})
          </h2>

          {questions.length === 0 ? (
            <p className="text-gray-500">No questions added yet. Add your first question above.</p>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.id} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="font-medium">
                    {index + 1}. {q.prompt}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Type: {q.type === 'multiple_choice' ? 'Multiple Choice' : 'Text Answer'}
                  </p>
                  {q.type === 'multiple_choice' && q.options && (
                    <div className="mt-2 ml-4">
                      {q.options.map((option: string, i: number) => (
                        <div key={i} className="flex items-center space-x-2">
                          <span className={option === q.correct_answer ? 'text-green-600 font-semibold' : ''}>
                            {String.fromCharCode(65 + i)}. {option}
                            {option === q.correct_answer && ' ✓'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'text' && (
                    <p className="mt-2 ml-4 text-green-600">
                      Correct answer: {q.correct_answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleFinish}
            disabled={questions.length === 0}
          >
            Finish
          </Button>
        </div>
      </div>
    </Layout>
  );
} 
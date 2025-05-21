'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';
import { formatErrorMessage } from '@/utils/errorHandler';
import React from 'react';

type Question = {
  id: string;
  prompt: string;
  type: 'multiple_choice' | 'text';
  options: string[] | null;
  correct_answer: string;
};

type Quiz = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

export default function QuizPage({
  params,
}: {
  params: { quiz_id: string };
}) {
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params as unknown as Promise<{ quiz_id: string }>);
  const quizId = unwrappedParams.quiz_id;

  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    async function fetchQuizData() {
      if (!user) return;

      try {
        // Check if user has access to this quiz
        const { data: assignments, error: assignmentError } = await supabase
          .from('assignments')
          .select('*')
          .eq('user_id', user.id)
          .eq('quiz_id', quizId);

        if (assignmentError) throw assignmentError;

        if (!assignments || assignments.length === 0) {
          router.push('/user/dashboard');
          return;
        }

        // Fetch quiz details
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .single();

        if (quizError) throw quizError;
        setQuiz(quizData);

        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('id');

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);

        // Check if user has already completed this quiz
        const { data: resultsData, error: resultsError } = await supabase
          .from('results')
          .select('*')
          .eq('user_id', user.id)
          .eq('quiz_id', quizId)
          .maybeSingle();

        if (!resultsError && resultsData) {
          // User has already completed this quiz
          setScore(resultsData.score);
          setSuccess('You have already completed this quiz!');
        }
      } catch (err) {
        setError(formatErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchQuizData();
    }
  }, [user, quizId, router]);

  function handleAnswerChange(questionId: string, answer: string) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  }

  function handleNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }

  function handlePreviousQuestion() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }

  async function handleSubmitQuiz() {
    if (!user || !quiz || questions.length === 0) return;

    // Check if all questions are answered
    const unansweredQuestions = questions.filter(q => !answers[q.id]);
    if (unansweredQuestions.length > 0) {
      setError(`Please answer all questions before submitting. You have ${unansweredQuestions.length} unanswered questions.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Calculate score
      let correctAnswers = 0;
      for (const question of questions) {
        const userAnswer = answers[question.id];
        if (userAnswer === question.correct_answer) {
          correctAnswers++;
        }
      }

      const scorePercentage = (correctAnswers / questions.length) * 100;

      // Save result to database
      const { error: resultError } = await supabase
        .from('results')
        .insert([
          {
            user_id: user.id,
            quiz_id: quiz.id,
            answers: answers,
            score: scorePercentage,
            completed_at: new Date().toISOString()
          }
        ]);

      if (resultError) throw resultError;

      setScore(scorePercentage);
      setSuccess(`Quiz completed! Your score: ${scorePercentage.toFixed(2)}%`);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setIsSubmitting(false);
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

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        {quiz && (
          <>
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
              <Button 
                variant="outline" 
                onClick={() => router.push('/user/dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
            
            <p className="text-gray-600">{quiz.description}</p>
          </>
        )}

        {error && (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 p-4 rounded-md">
            <p className="text-sm text-green-600">{success}</p>
            {score !== null && (
              <p className="mt-2 text-xl font-bold text-green-700">Your Score: {score.toFixed(2)}%</p>
            )}
          </div>
        )}

        {!success && questions.length > 0 && currentQuestion && (
          <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
              <span className="text-sm text-gray-500">
                {questions.filter(q => answers[q.id]).length} of {questions.length} answered
              </span>
            </div>

            <div className="mb-6">
              <p className="text-xl font-medium mb-4">{currentQuestion.prompt}</p>

              {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                <div className="space-y-2">
                  {currentQuestion.options.map((option, index) => (
                    <label key={index} className="flex items-start p-3 border rounded-md hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option}
                        checked={answers[currentQuestion.id] === option}
                        onChange={() => handleAnswerChange(currentQuestion.id, option)}
                        className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                      />
                      <span className="ml-3">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'text' && (
                <div>
                  <textarea
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter your answer..."
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>

              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  onClick={handleNextQuestion}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitQuiz}
                  isLoading={isSubmitting}
                >
                  Submit Quiz
                </Button>
              )}
            </div>
          </div>
        )}

        {!success && questions.length > 0 && (
          <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
            <div className="flex flex-wrap gap-2">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-10 h-10 flex items-center justify-center rounded-md text-sm font-medium
                    ${currentQuestionIndex === index
                      ? 'bg-purple-600 text-white'
                      : answers[q.id]
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-gray-100 text-gray-800 border border-gray-300'
                    }
                  `}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {questions.length === 0 && !isLoading && (
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <p className="text-yellow-700">
              No questions found for this quiz. Please contact an administrator.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
} 
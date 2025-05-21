import { Suspense } from 'react';
import { Layout } from '@/components/Layout';
import QuizClient from './client';

export default function Page({
  params,
}: {
  params: Promise<{ quiz_id: string }>;
}) {
  return (
    <Suspense fallback={
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </Layout>
    }>
      <QuizClientWrapper params={params} />
    </Suspense>
  );
}

async function QuizClientWrapper({
  params
}: {
  params: Promise<{ quiz_id: string }>;
}) {
  const resolvedParams = await params;
  
  return (
    <QuizClient quizId={resolvedParams.quiz_id} />
  );
} 
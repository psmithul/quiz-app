import { Suspense } from 'react';
import { Layout } from '@/components/Layout';
import UserClient from './client';

export default function Page({
  params,
}: {
  params: Promise<{ user_id: string }>;
}) {
  return (
    <Suspense fallback={
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </Layout>
    }>
      <UserClientWrapper params={params} />
    </Suspense>
  );
}

async function UserClientWrapper({
  params
}: {
  params: Promise<{ user_id: string }>;
}) {
  const resolvedParams = await params;
  
  return (
    <UserClient userId={resolvedParams.user_id} />
  );
} 
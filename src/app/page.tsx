'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/authContext';

export default function Home() {
  const router = useRouter();
  const { user, isAdmin, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push(isAdmin ? '/admin/dashboard' : '/user/dashboard');
    }
  }, [user, isAdmin, isLoading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-3xl text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
          <span className="text-purple-600">Thinkify</span> Quiz Platform
        </h1>
        <p className="mt-4 text-xl text-gray-500">
          A secure, scalable quiz platform that supports multiple user roles, integrated with Supabase for authentication and data storage.
        </p>
        <div className="mt-10 flex justify-center gap-x-6">
          <Button
            size="lg"
            onClick={() => router.push('/auth/login')}
          >
            Sign in
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push('/auth/signup')}
          >
            Create an account
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  // Check if it's our known database error
  const isDatabaseError = 
    error.message?.includes('Users table does not exist') || 
    error.message?.includes('database') ||
    error.message?.includes('relation') ||
    error.message?.includes('table');
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Something went wrong!</h1>
          
          {isDatabaseError ? (
            <div className="mt-4 p-4 bg-yellow-50 rounded-md text-left">
              <h2 className="text-lg font-medium text-yellow-800">Database Setup Required</h2>
              <p className="mt-2 text-sm text-yellow-700">
                It looks like the database tables needed for this application don't exist yet.
                Please follow these steps to set up the database:
              </p>
              <ol className="mt-2 text-sm text-yellow-700 list-decimal list-inside space-y-1">
                <li>Stop the application</li>
                <li>Run <code className="bg-yellow-100 px-1 py-0.5 rounded">npm run init-db</code> to initialize the database</li>
                <li>If that doesn't work, go to your Supabase dashboard and run the SQL from<br/><code className="bg-yellow-100 px-1 py-0.5 rounded">scripts/supabase-sql.sql</code></li>
                <li>Restart the application</li>
              </ol>
            </div>
          ) : (
            <p className="mt-2 text-gray-600">
              An unexpected error occurred. We've been notified and will fix this as soon as possible.
            </p>
          )}
        </div>
        
        <div className="flex flex-col space-y-4">
          <Button onClick={reset} variant="primary">
            Try again
          </Button>
          <Link href="/">
            <Button variant="outline" fullWidth>
              Go home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 
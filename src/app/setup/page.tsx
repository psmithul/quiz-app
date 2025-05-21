'use client';

import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/authContext';
import { supabase } from '@/lib/supabaseClient';

export default function SetupPage() {
  const { user, userData, isAdmin, isLoading } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  async function setupDatabase() {
    if (!user) return;
    
    setIsProcessing(true);
    setMessage("Setting up database and making you an admin...");
    
    try {
      const response = await fetch(`/api/setup-db?userId=${user.id}&email=${user.email}`);
      const data = await response.json();
      
      setMessage(data.message || "Setup completed, check console for details");
      console.log("Setup response:", data);
      
      // Reload after 3 seconds to refresh auth state
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }
  
  async function createTables() {
    setIsProcessing(true);
    setMessage("Creating database tables...");
    
    try {
      // Use the Supabase SQL feature directly (requires enough permissions)
      const sqlResponse = await fetch('/scripts/create-tables.sql');
      const sql = await sqlResponse.text();
      
      // Display the SQL for manual execution in Supabase dashboard
      setMessage(`
        To set up the database manually, go to the Supabase dashboard (https://app.supabase.com),
        open the SQL Editor, and run the following SQL:
        
        ${sql}
        
        After running the SQL, come back to this page and click "Make Me Admin" to set your account as an admin.
      `);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }
  
  async function makeAdmin() {
    if (!user) return;
    
    setIsProcessing(true);
    setMessage("Making you an admin...");
    
    try {
      const { error } = await supabase
        .from('users')
        .upsert([
          {
            id: user.id,
            email: user.email,
            role: 'admin'
          }
        ]);
      
      if (error) throw error;
      
      setMessage("Successfully made you an admin! Refreshing in 3 seconds...");
      
      // Reload after 3 seconds to refresh auth state
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  }

  if (isLoading) {
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
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Thinkify Quiz Setup</h1>
        
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h2 className="text-xl font-medium text-blue-800 mb-4">User Information</h2>
          
          {user ? (
            <div className="space-y-2">
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {isAdmin ? 'Admin' : 'Regular User'}</p>
              <p><strong>Database Status:</strong> {userData ? 'User record exists in database' : 'No user record in database'}</p>
            </div>
          ) : (
            <p className="text-red-600">You need to be logged in to set up the admin account.</p>
          )}
        </div>
        
        {message && (
          <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 whitespace-pre-wrap">
            <h2 className="text-lg font-medium text-purple-800 mb-2">Message:</h2>
            <p className="text-purple-700">{message}</p>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h2 className="text-xl font-medium text-gray-900">Setup Actions</h2>
          
          <p className="text-gray-600">
            Click the buttons below to set up your database and make your account an admin.
            Try the "One-Click Setup" first - if that doesn't work, try the other options.
          </p>
          
          <div className="space-y-2">
            <Button 
              onClick={setupDatabase} 
              isLoading={isProcessing}
              disabled={!user}
              fullWidth
            >
              One-Click Setup (Database + Admin)
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={createTables} 
                isLoading={isProcessing}
                variant="outline"
              >
                Setup Database Only
              </Button>
              
              <Button 
                onClick={makeAdmin} 
                isLoading={isProcessing}
                disabled={!user}
                variant="outline"
              >
                Make Me Admin Only
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 mt-4">
            <p><strong>Note:</strong> If you encounter permission errors, you may need to manually create tables through the Supabase dashboard.</p>
          </div>
        </div>
        
        {isAdmin && (
          <div className="text-center">
            <Button onClick={() => window.location.href = '/admin/dashboard'}>
              Go to Admin Dashboard
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
} 
"use client";

import { useEffect, useState } from 'react';
import { useClerk } from '@clerk/nextjs';

export default function ResetPage() {
  const { signOut } = useClerk();
  const [status, setStatus] = useState('Resetting...');

  useEffect(() => {
    const performReset = async () => {
      try {
        setStatus('Deleting user data...');
        
        // Call the reset API
        const response = await fetch('/api/user/reset', {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to reset user data');
        }

        setStatus('Clearing session...');
        
        // Force sign out from Clerk and redirect to home
        await signOut({ redirectUrl: '/' });
        
      } catch (error) {
        console.error('Reset error:', error);
        setStatus('Error occurred. Clearing session...');
        
        // Even if there's an error, try to sign out and redirect
        setTimeout(() => {
          signOut({ redirectUrl: '/' });
        }, 2000);
      }
    };

    performReset();
  }, [signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <h1 className="text-xl font-semibold text-foreground">Resetting Account</h1>
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
} 
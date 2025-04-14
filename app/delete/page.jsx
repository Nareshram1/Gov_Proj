"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; 

function ErrorPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.removeItem('selfDestructDetails');
    router.replace('/'); 
  }, []);

  return (
    <div className="flex h-screen justify-center items-center bg-gray-900">
      <div className="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-red-500 mb-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.375 1.943 3.375h14.71c1.726 0 2.813-1.875 1.943-3.375a5.53 5.53 0 0 1-4.304-1.468l-4.878-.976c-.841-.168-1.62-.536-2.328-1.05M12 9V5.25M15 12h3m-6 3H9m12 3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <h1 className="text-2xl font-extrabold text-red-500 mb-2">No Data Found</h1>
        <p className="text-gray-400 text-lg">A server error occurred while fetching data.</p>
        <p className="text-gray-500 text-sm mt-4">You will be redirected to the home page.</p>
      </div>
    </div>
  );
}

export default ErrorPage;
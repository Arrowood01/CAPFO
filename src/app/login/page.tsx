'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSignUp = async () => {
    setIsSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) {
      setError(error.message);
    } else {
      // Inform the user to check their email for confirmation
      // (assuming email confirmation is enabled on Supabase)
      alert('Sign up successful! Please check your email to confirm your account before logging in.');
      // Optionally, clear form or redirect to a page saying "check your email"
      setEmail('');
      setPassword('');
      // Do not attempt to log in immediately if email confirmation is likely required.
    }
    setIsSubmitting(false);
  }

  const handleLogin = async () => {
    setIsSubmitting(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
      router.refresh() // Ensure layout re-renders to reflect auth state
    }
    setIsSubmitting(false)
  }

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white border border-[var(--border-blue)] rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center text-black mb-6">Login / Sign Up</h2>
      {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-black mb-1">Email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)] sm:text-sm"
        />
      </div>
      <div className="mb-6">
        <label htmlFor="password" className="block text-sm font-medium text-black mb-1">Password:</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--primary-blue)] focus:border-[var(--primary-blue)] sm:text-sm"
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0">
        <button
          onClick={handleLogin}
          disabled={isSubmitting || !email || !password}
          className="w-full sm:w-auto flex-grow sm:mr-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary-blue)] rounded-md hover:bg-[var(--primary-blue-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-blue)] disabled:bg-gray-400"
        >
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
        <button
          onClick={handleSignUp}
          disabled={isSubmitting || !email || !password}
          className="w-full sm:w-auto flex-grow sm:ml-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400" /* Keeping sign up green for distinction, can be changed to blue */
        >
          {isSubmitting ? 'Signing up...' : 'Sign Up'}
        </button>
      </div>
    </div>
  )
}
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/store';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

// Validation schema using Zod
const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z.string()
    .min(1, 'Password is required'),
});


/**
 * Login Form Component (Inner component that uses useSearchParams)
 * - Email and password validation
 * - Show/hide password toggle
 * - Error handling
 */
function LoginFormInner() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for error query parameter from middleware redirect
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'access_denied') {
      setError('Access denied. This account does not have permission to access the CRM dashboard.');
      // Clean up the URL by removing the error parameter
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, router]);

  // Setup form with validation
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    watch,
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Watch form values to debug
  const formValues = watch();

  // Handle form submission
  const onSubmit = async (data) => {
    console.log("Form submitted with data:", data); // Debug log
    setError(null);

    try {
      await login(data.email, data.password);
      router.push('/dispatch-orders');
    } catch (err) {
      console.error("Login error:", err); // Debug log
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  // Debug info in development
  if (process.env.NODE_ENV === 'development') {
    console.log("Form values:", formValues);
    console.log("Form errors:", errors);
    console.log("Is submitting:", isSubmitting);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-[4px] border border-border bg-card shadow-sm px-8 pt-8 pb-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-card-foreground">Welcome Back</h2>
            <p className="text-sm text-muted-foreground mt-2">Sign in to your CRM account</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-[4px] flex items-start">
              <AlertCircle className="w-5 h-5 text-destructive mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-foreground mb-2"
              >
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                className={`
                  w-full px-3 py-2 rounded-[4px] border bg-background text-foreground
                  ${errors.email ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'}
                  focus:ring-2 focus:outline-none transition text-sm
                  placeholder:text-muted-foreground
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                disabled={isSubmitting}
                autoComplete="email"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-foreground mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className={`
                    w-full px-3 py-2 rounded-[4px] border pr-10 bg-background text-foreground
                    ${errors.password ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'}
                    focus:ring-2 focus:outline-none transition text-sm
                    placeholder:text-muted-foreground
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded-[4px] border-input text-primary focus:ring-ring focus:ring-2 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-muted-foreground">Remember me</span>
              </label>
              <a href="/forgot-password" className="text-sm text-primary hover:text-primary/80 transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium 
                py-2.5 px-4 rounded-[4px] transition duration-200 text-sm
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center
              "
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Login Form Component (Wrapper with Suspense)
 */
export default function LoginForm() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-[4px] border border-border bg-card shadow-sm px-8 pt-8 pb-8">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-card-foreground">Welcome Back</h2>
              <p className="text-sm text-muted-foreground mt-2">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginFormInner />
    </Suspense>
  );
}
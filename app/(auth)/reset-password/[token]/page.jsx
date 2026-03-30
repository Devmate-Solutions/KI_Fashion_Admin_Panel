'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/lib/api/endpoints/auth';
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock, Check } from 'lucide-react';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const token = params.token;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
  });

  const onSubmit = async (values) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      await authService.resetPassword(token, values.password);
      
      setSuccess(true);
      // Wait a few seconds then redirect to login
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err.message || "Invalid or expired reset link. Please request a new one.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-[4px] border border-border bg-card shadow-sm px-8 pt-8 pb-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-card-foreground">Reset Password</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Please enter your new password below.
            </p>
          </div>

          {/* Success Alert */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-[4px] flex items-start">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-green-800 font-medium">Password Reset Successfully</p>
                <p className="text-sm text-green-700 mt-1">
                  Your password has been updated. Redirecting you to the sign-in page...
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-[4px] flex items-start">
              <AlertCircle className="w-5 h-5 text-destructive mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* New Password */}
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    className={`
                      w-full pl-10 pr-10 py-2 rounded-[4px] border bg-background text-foreground
                      ${errors.password ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'}
                      focus:ring-2 focus:outline-none transition text-sm
                      placeholder:text-muted-foreground
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label 
                  htmlFor="confirmPassword" 
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <Check className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    {...register('confirmPassword')}
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    className={`
                      w-full pl-10 pr-3 py-2 rounded-[4px] border bg-background text-foreground
                      ${errors.confirmPassword ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'}
                      focus:ring-2 focus:outline-none transition text-sm
                      placeholder:text-muted-foreground
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

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
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </form>
          )}

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link 
              href="/login" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

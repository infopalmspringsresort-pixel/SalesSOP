import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import logoUrl from "@assets/Palm Springs Logo resort_1756665272163.png";
import { Link, useLocation } from "wouter";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();
  const [location] = useLocation();

  useEffect(() => {
    // Get token from localStorage (set by token verification)
    const storedToken = localStorage.getItem('resetToken');
    if (storedToken) {
      setToken(storedToken);
    } else {
      // If no stored token, try to get from URL (fallback)
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setToken(urlToken);
      }
    }
  }, [location]);

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        title: "Invalid reset link",
        description: "This reset link is invalid or has expired",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter a new password",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword: password });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 py-10 text-center">
              <div className="flex justify-center mb-8">
                <img 
                  src={logoUrl} 
                  alt="Palm Springs Resort" 
                  className="h-20 w-auto object-contain"
                />
              </div>

              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Password Reset Successful
              </h1>

              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>

              <Link href="/login">
                <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-base">
                  Continue to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 py-10 text-center">
              <div className="flex justify-center mb-8">
                <img 
                  src={logoUrl} 
                  alt="Palm Springs Resort" 
                  className="h-20 w-auto object-contain"
                />
              </div>

              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Invalid Reset Link
              </h1>

              <p className="text-gray-600 dark:text-gray-400 mb-8">
                This password reset link is invalid or has expired. Please request a new one.
              </p>

              <div className="space-y-4">
                <Link href="/forgot-password">
                  <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-base">
                    Request New Reset Link
                  </Button>
                </Link>
                
                <Link href="/login">
                  <button className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
                    Back to Sign In
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-8 py-10">
            <div className="flex justify-center mb-8">
              <img 
                src={logoUrl} 
                alt="Palm Springs Resort" 
                className="h-20 w-auto object-contain"
              />
            </div>

            <h1 className="text-2xl font-semibold text-center text-gray-900 dark:text-white mb-4">
              Set New Password
            </h1>

            <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
              Please enter your new password below.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-base placeholder:text-gray-500 pr-12"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                    data-testid="toggle-password-visibility"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-base placeholder:text-gray-500 pr-12"
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                    data-testid="toggle-confirm-password-visibility"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={resetPasswordMutation.isPending}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-base transition-colors"
                data-testid="button-submit"
              >
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </form>

            <div className="text-center mt-6">
              <Link href="/login">
                <button className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
                  Back to Sign In
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
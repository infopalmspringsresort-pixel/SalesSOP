import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import logoUrl from "@assets/Palm Springs Logo resort_1756665272163.png";
import { Link, useLocation } from "wouter";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      // Redirect to token verification page after 2 seconds
      setTimeout(() => {
        setLocation('/verify-token');
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    forgotPasswordMutation.mutate(email);
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
                Check Your Email
              </h1>

              <p className="text-gray-600 dark:text-gray-400 mb-8">
                If an account with that email exists, we've sent you a password reset OTP.
              </p>

              <div className="space-y-4">
                <Link href="/login">
                  <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-base">
                    Back to Sign In
                  </Button>
                </Link>
                
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail("");
                  }}
                  className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
                >
                  Try a different email
                </button>
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
              Reset Password
            </h1>

            <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
              Enter your email address and we'll send you an OTP to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-gray-50 dark:bg-gray-700 border-0 rounded-xl text-base placeholder:text-gray-500"
                  data-testid="input-email"
                />
              </div>

              <Button
                type="submit"
                disabled={forgotPasswordMutation.isPending}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-base transition-colors"
                data-testid="button-submit"
              >
                {forgotPasswordMutation.isPending ? "Sending..." : "Send OTP"}
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
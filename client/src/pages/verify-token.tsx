import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ArrowLeft, Mail, Shield } from 'lucide-react';

export default function VerifyToken() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || token.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Store the reset token and redirect to reset password page
        localStorage.setItem('resetToken', data.resetToken);
        localStorage.setItem('resetUserId', data.userId);
        
        setTimeout(() => {
          setLocation('/reset-password');
        }, 2000);
      } else {
        setError(data.message || 'Invalid verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setToken(value);
    setError('');
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Verification Successful!
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Redirecting you to the password reset page...
              </p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter the 6-digit verification code sent to your email
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enter Verification Code</CardTitle>
            <CardDescription>
              Check your email for a 6-digit code and enter it below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={handleTokenChange}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest"
                  autoComplete="off"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the 6-digit code from your email
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || token.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>

              <div className="text-center">
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
                  <ArrowLeft className="inline h-4 w-4 mr-1" />
                  Back to forgot password
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Didn't receive the code? Check your spam folder or{' '}
            <Link href="/forgot-password" className="text-blue-600 hover:text-blue-500">
              request a new one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}


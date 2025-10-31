import PublicEnquiryForm from "@/components/public-enquiry-form";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function PublicEnquiryPage() {
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = () => {
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <PublicEnquiryForm onSuccess={handleSuccess} onError={handleError} />
        
        <div className="text-center text-sm text-muted-foreground">
          <p>
            By submitting this form, you agree to be contacted by our team regarding your event enquiry.
          </p>
        </div>
      </div>
    </div>
  );
}





import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Phone, Search } from "lucide-react";

interface PhoneLookupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhoneFound: (data: { clientName: string; email: string; city: string; contactNumber: string }) => void;
}

export default function PhoneLookupDialog({ open, onOpenChange, onPhoneFound }: PhoneLookupDialogProps) {
  const [contactNumber, setContactNumber] = useState("+91 ");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const isValidPhone = (phone: string) => {
    if (!phone || phone === "+91 ") return false;
    const parts = phone.split(' ');
    if (parts.length !== 2) return false;
    const [countryCode, number] = parts;
    const digitsOnly = number.replace(/\D/g, '');
    if (countryCode === '+91') {
      return digitsOnly.length === 10;
    }
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  };

  const handleSearch = async () => {
    if (!isValidPhone(contactNumber)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number (10 digits for India, 7-15 digits for other countries).",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiRequest("GET", `/api/enquiries/search-by-phone?phone=${encodeURIComponent(contactNumber)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.found) {
          // Pass the found data to parent
          onPhoneFound({
            clientName: data.clientName || "",
            email: data.email || "",
            city: data.city || "",
            contactNumber: data.contactNumber || contactNumber,
          });
          onOpenChange(false);
          setContactNumber("+91 ");
          toast({
            title: "Previous enquiry found",
            description: "Client information will be prefilled.",
          });
        } else {
          // No match found, proceed with empty form
          onPhoneFound({
            clientName: "",
            email: "",
            city: "",
            contactNumber: contactNumber,
          });
          onOpenChange(false);
          setContactNumber("+91 ");
        }
      }
    } catch (error) {
      console.error("Error searching by phone:", error);
      toast({
        title: "Search Error",
        description: "Failed to search for previous enquiries. You can continue with a new enquiry.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setContactNumber("+91 ");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">New Enquiry</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Enter contact number to check for previous enquiries
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone-lookup">Contact Number</Label>
            <PhoneInput
              id="phone-lookup"
              value={contactNumber}
              onChange={setContactNumber}
              placeholder="Enter phone number"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              We'll check if this number exists in previous enquiries
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleSearch}
              disabled={isSearching || !isValidPhone(contactNumber)}
              className="w-full"
            >
              {isSearching ? (
                <>
                  <Search className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


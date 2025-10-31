import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  "data-testid"?: string;
}

const countryCodes = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+1", country: "Canada", flag: "🇨🇦" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+98", country: "Iran", flag: "🇮🇷" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+975", country: "Bhutan", flag: "🇧🇹" },
  { code: "+93", country: "Afghanistan", flag: "🇦🇫" },
  { code: "+998", country: "Uzbekistan", flag: "🇺🇿" },
  { code: "+7", country: "Kazakhstan", flag: "🇰🇿" },
  { code: "+996", country: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "+992", country: "Tajikistan", flag: "🇹🇯" },
  { code: "+993", country: "Turkmenistan", flag: "🇹🇲" },
  { code: "+998", country: "Uzbekistan", flag: "🇺🇿" },
];

export function PhoneInput({ 
  value = "", 
  onChange, 
  placeholder = "Enter phone number", 
  className,
  disabled = false,
  readOnly = false,
  "data-testid": dataTestId
}: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Parse the initial value
  useEffect(() => {
    if (value) {
      // Check if value already has a country code
      const foundCountry = countryCodes.find(country => value.startsWith(country.code));
      if (foundCountry) {
        setCountryCode(foundCountry.code);
        setPhoneNumber(value.replace(foundCountry.code, "").trim());
      } else {
        // Default to India if no country code found
        setCountryCode("+91");
        setPhoneNumber(value);
      }
    }
  }, [value]);

  // Update parent when values change
  useEffect(() => {
    if (onChange) {
      const fullNumber = phoneNumber ? `${countryCode} ${phoneNumber}` : "";
      onChange(fullNumber);
    }
  }, [countryCode, phoneNumber, onChange]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Only allow digits
    const digitsOnly = input.replace(/\D/g, '');
    
    // Limit to 10 digits for most countries, 15 for international
    const maxDigits = countryCode === "+91" ? 10 : 15;
    const limitedDigits = digitsOnly.slice(0, maxDigits);
    
    setPhoneNumber(limitedDigits);
  };

  const handleCountryCodeChange = (code: string) => {
    setCountryCode(code);
    // Reset phone number when country changes
    setPhoneNumber("");
  };

  const getValidationMessage = () => {
    if (!phoneNumber) return "";
    
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    if (countryCode === "+91") {
      if (digitsOnly.length < 10) {
        return "Phone number must be 10 digits";
      }
      if (digitsOnly.length > 10) {
        return "Phone number cannot exceed 10 digits";
      }
    } else {
      if (digitsOnly.length < 7) {
        return "Phone number must be at least 7 digits";
      }
      if (digitsOnly.length > 15) {
        return "Phone number cannot exceed 15 digits";
      }
    }
    
    return "";
  };

  const validationMessage = getValidationMessage();
  const isValid = !validationMessage && phoneNumber.length > 0;

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Country Code Dropdown */}
      <Select 
        value={countryCode} 
        onValueChange={handleCountryCodeChange}
        disabled={disabled || readOnly}
      >
        <SelectTrigger className="w-32" data-testid={`${dataTestId}-country-code`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {countryCodes.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <span className="flex items-center gap-2">
                <span>{country.flag}</span>
                <span>{country.code}</span>
                <span className="text-muted-foreground text-xs">{country.country}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Phone Number Input */}
      <div className="flex-1">
        <Input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            "w-full",
            !isValid && phoneNumber.length > 0 && "border-red-500 focus:border-red-500",
            isValid && "border-green-500 focus:border-green-500"
          )}
          data-testid={dataTestId}
        />
        {validationMessage && (
          <p className="text-xs text-red-500 mt-1">{validationMessage}</p>
        )}
      </div>
    </div>
  );
}


import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// City list with Nashik, Mumbai, Pune at the top as requested
const CITIES = [
  "Nashik",
  "Mumbai",
  "Pune",
  // Additional Indian cities
  "Ahmedabad",
  "Bangalore",
  "Chennai",
  "Delhi",
  "Hyderabad",
  "Kolkata",
  "Jaipur",
  "Lucknow",
  "Nagpur",
  "Surat",
  "Patna",
  "Indore",
  "Thane",
  "Bhopal",
  "Visakhapatnam",
  "Vadodara",
  "Firozabad",
  "Ludhiana",
  "Rajkot",
  "Agra",
  "Siliguri",
  "Nashik",
  "Faridabad",
  "Meerut",
  "Rajpur Sonarpur",
  "Kalyan-Dombivli",
  "Vasai-Virar",
  "Varanasi",
  "Srinagar",
  "Amritsar",
  "Navi Mumbai",
  "Allahabad",
  "Howrah",
  "Gwalior",
  "Jabalpur",
  "Coimbatore",
  "Vijayawada",
  "Jodhpur",
  "Madurai",
  "Raipur",
  "Kota",
  "Guwahati",
  "Chandigarh",
  "Solapur",
  "Hubli-Dharwad",
  "Mysore",
  "Tiruchirappalli",
  "Bareilly",
  "Aligarh",
  "Moradabad",
  "Gurgaon",
  "Noida",
  "Ghaziabad",
];

// Remove duplicates and keep order with priority cities first
const PRIORITY_CITIES = ["Nashik", "Mumbai", "Pune"];
export const uniqueCities = Array.from(
  new Set([
    ...PRIORITY_CITIES,
    ...CITIES.filter((city) => !PRIORITY_CITIES.includes(city)),
  ])
);

interface CityAutocompleteProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CityAutocomplete({
  value = "",
  onChange,
  placeholder = "Select or type city...",
  className,
  disabled = false,
}: CityAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Filter cities based on search query
  const filteredCities = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return uniqueCities;
    }
    const query = searchQuery.toLowerCase().trim();
    return uniqueCities.filter((city) =>
      city.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Handle city selection
  const handleSelect = (selectedCity: string) => {
    onChange(selectedCity === value ? "" : selectedCity);
    setOpen(false);
    setSearchQuery("");
  };

  // Allow free text input if user wants to type a city not in the list
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);
    setSearchQuery(inputValue);
  };

  // Get display value - show selected city or user input
  const displayValue = value || "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between min-h-[44px]",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {displayValue || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search city..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No city found. You can type to enter a custom city.</CommandEmpty>
            <CommandGroup>
              {filteredCities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => handleSelect(city)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === city ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Component that allows both selection from dropdown and free text input
export function CityInputAutocomplete({
  value = "",
  onChange,
  placeholder = "Select or type city...",
  className,
  disabled = false,
}: CityAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Filter cities based on input value
  const filteredCities = React.useMemo(() => {
    if (!value || !value.trim()) {
      return uniqueCities;
    }
    const query = value.toLowerCase().trim();
    // Filter cities that match, but exclude exact matches (city already selected)
    return uniqueCities.filter((city) => {
      const cityLower = city.toLowerCase();
      const isExactMatch = cityLower === query;
      // Don't show exact matches - if user has already selected this city, don't show it again
      if (isExactMatch) return false;
      return cityLower.includes(query);
    });
  }, [value]);

  // Handle city selection from dropdown
  const handleSelect = (selectedCity: string) => {
    onChange(selectedCity);
    // Immediately close the dropdown
    setOpen(false);
    // Blur the input to remove focus and prevent immediate reopening
    setTimeout(() => {
      inputRef.current?.blur();
    }, 0);
  };

  // Handle manual input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    // Show dropdown when typing
    if (newValue.trim()) {
      // Check if the new value is an exact match with any city
      const query = newValue.toLowerCase().trim();
      const isExactMatch = uniqueCities.some(city => city.toLowerCase() === query);
      // Only show dropdown if it's not an exact match and there are filtered results
      if (!isExactMatch) {
        setOpen(true);
      } else {
        // Close dropdown if exact match - user has selected a valid city
        setOpen(false);
      }
    } else {
      // Empty input - show all cities
      setOpen(true);
    }
  };

  // Handle focus to show dropdown only if there are relevant options
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentValue = e.target.value.trim().toLowerCase();
    // Only show dropdown if input is empty or if there are cities that don't exactly match
    if (!currentValue || filteredCities.length > 0) {
      setOpen(true);
    }
  };

  // Handle blur - close dropdown with slight delay to allow selection
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Check if the related target (where focus is going) is part of the dropdown
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('[cmdk-list]')) {
      // User is clicking on dropdown item, don't close yet
      return;
    }
    // Small delay to allow click events on dropdown items
    setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
            <input
              ref={inputRef}
              type="text"
              value={value || ""}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
              )}
            />
        </PopoverTrigger>
        {open && filteredCities.length > 0 && (
          <PopoverContent 
            className="w-[var(--radix-popover-trigger-width)] p-0" 
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              // Allow closing when clicking outside, but not when clicking inside dropdown
              const target = e.target as HTMLElement;
              if (target.closest('[cmdk-list]') || target.closest('[cmdk-item]')) {
                e.preventDefault();
              }
            }}
          >
            <Command shouldFilter={false}>
              <CommandList>
                <CommandGroup>
                  {filteredCities.slice(0, 10).map((city) => (
                    <CommandItem
                      key={city}
                      value={city}
                      onSelect={(e) => {
                        e.preventDefault();
                        handleSelect(city);
                      }}
                      onMouseDown={(e) => {
                        // Prevent input blur when clicking on dropdown item
                        e.preventDefault();
                        handleSelect(city);
                      }}
                    >
                      {city}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}


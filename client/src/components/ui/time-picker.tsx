import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value: string; // Format: "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45]; // Only show these minute options

export function TimePicker({
  value,
  onChange,
  disabled = false,
  className,
  id,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedHour, setSelectedHour] = React.useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = React.useState<number | null>(null);

  // Parse current value
  React.useEffect(() => {
    if (value) {
      const [hour, minute] = value.split(':').map(Number);
      setSelectedHour(hour);
      // Round minute to nearest valid option (0, 15, 30, 45)
      const roundedMinute = MINUTES.reduce((prev, curr) =>
        Math.abs(curr - minute) < Math.abs(prev - minute) ? curr : prev
      );
      setSelectedMinute(roundedMinute);
    } else {
      setSelectedHour(null);
      setSelectedMinute(null);
    }
  }, [value]);

  // Format time as HH:mm
  const formatTime = (hour: number | null, minute: number | null): string => {
    if (hour === null || minute === null) return "";
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  // Handle hour selection
  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    const minute = selectedMinute ?? 0;
    onChange(formatTime(hour, minute));
  };

  // Handle minute selection
  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    const hour = selectedHour ?? 0;
    onChange(formatTime(hour, minute));
    // Close popover after selection
    setOpen(false);
  };

  // Display value
  const displayValue = formatTime(selectedHour, selectedMinute) || "--:--";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-center text-center font-normal relative",
            !value && "text-muted-foreground",
            className
          )}
          id={id}
        >
          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex border rounded-md">
          {/* Hours Column */}
          <ScrollArea className="h-[200px] w-16">
            <div className="p-1">
              {HOURS.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => handleHourSelect(hour)}
                  className={cn(
                    "w-full px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground text-center transition-colors",
                    selectedHour === hour && "bg-primary text-primary-foreground font-semibold"
                  )}
                >
                  {String(hour).padStart(2, "0")}
                </button>
              ))}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>

          {/* Minutes Column */}
          <ScrollArea className="h-[200px] w-16 border-l">
            <div className="p-1">
              {MINUTES.map((minute) => (
                <button
                  key={minute}
                  type="button"
                  onClick={() => handleMinuteSelect(minute)}
                  className={cn(
                    "w-full px-2 py-1.5 text-sm rounded hover:bg-accent hover:text-accent-foreground text-center transition-colors",
                    selectedMinute === minute && "bg-primary text-primary-foreground font-semibold"
                  )}
                >
                  {String(minute).padStart(2, "0")}
                </button>
              ))}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}


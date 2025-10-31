import { Badge } from "@/components/ui/badge";
import { ListTooltip } from "@/components/ui/info-tooltip";
import { MapPin } from "lucide-react";

interface VenueDisplayProps {
  venues: string[];
  className?: string;
}

export function VenueDisplay({ venues, className = "" }: VenueDisplayProps) {
  if (!venues || venues.length === 0) {
    return (
      <span className={`text-gray-400 italic ${className}`}>
        Not assigned
      </span>
    );
  }

  if (venues.length === 1) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <MapPin className="w-3 h-3 text-gray-500" />
        <span className="text-gray-900">{venues[0]}</span>
      </div>
    );
  }

  return (
    <ListTooltip
      title="Venues"
      items={venues}
      className={className}
    >
      <div className="flex items-center gap-1">
        <MapPin className="w-3 h-3 text-gray-500" />
        <Badge variant="secondary" className="text-xs">
          {venues.length} venues
        </Badge>
      </div>
    </ListTooltip>
  );
}

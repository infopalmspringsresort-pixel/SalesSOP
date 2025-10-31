import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function InfoTooltip({ 
  content, 
  children, 
  side = "top", 
  className = "" 
}: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`cursor-help ${className}`}>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

interface ListTooltipProps {
  title: string;
  items: string[];
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function ListTooltip({ 
  title, 
  items, 
  children, 
  side = "top", 
  className = "" 
}: ListTooltipProps) {
  if (!items || items.length === 0) {
    return <>{children}</>;
  }

  if (items.length === 1) {
    return <>{children}</>;
  }

  return (
    <InfoTooltip
      content={
        <div className="space-y-1">
          <div className="font-medium text-sm mb-2">{title} ({items.length})</div>
          <div className="space-y-1">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      }
      side={side}
      className={className}
    >
      {children}
    </InfoTooltip>
  );
}


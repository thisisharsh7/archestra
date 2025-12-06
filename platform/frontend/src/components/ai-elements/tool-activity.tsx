"use client";

import type { ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  XCircleIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ToolActivityProps {
  tools: Array<{
    name: string;
    state: ToolUIPart["state"] | "output-available" | "output-error";
  }>;
}

const getStatusIcon = (
  state: ToolUIPart["state"] | "output-available" | "output-error",
) => {
  switch (state) {
    case "input-streaming":
      return (
        <CircleIcon
          className="size-4 text-muted-foreground"
          aria-label="Pending"
        />
      );
    case "input-available":
      return (
        <ClockIcon
          className="size-4 text-muted-foreground animate-pulse"
          aria-label="Running"
        />
      );
    case "output-available":
      return (
        <CheckCircleIcon
          className="size-4 text-green-600"
          aria-label="Completed"
        />
      );
    case "output-error":
      return (
        <XCircleIcon className="size-4 text-destructive" aria-label="Error" />
      );
    default:
      return (
        <CircleIcon
          className="size-4 text-muted-foreground"
          aria-label="Unknown"
        />
      );
  }
};

const getStatusLabel = (
  state: ToolUIPart["state"] | "output-available" | "output-error",
) => {
  switch (state) {
    case "input-streaming":
      return "Pending";
    case "input-available":
      return "Running";
    case "output-available":
      return "Completed";
    case "output-error":
      return "Error";
    default:
      return "Unknown";
  }
};

export const ToolActivity = ({ tools }: ToolActivityProps) => {
  if (tools.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="mt-4 pt-3 border-t border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Tool Activity:
          </span>
          <div className="flex items-center gap-2">
            {tools.map((tool, index) => (
              <Tooltip key={`${tool.name}-${index}`}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-default">
                    {getStatusIcon(tool.state)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {tool.name} - {getStatusLabel(tool.state)}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

ToolActivity.displayName = "ToolActivity";

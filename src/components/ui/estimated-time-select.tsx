"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const ESTIMATED_TIME_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "5分", value: 5 },
  { label: "15分", value: 15 },
  { label: "30分", value: 30 },
  { label: "45分", value: 45 },
  { label: "1時間", value: 60 },
  { label: "120分", value: 120 },
];

export function formatEstimatedTime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0分";
  if (minutes < 60) return `${minutes}分`;

  const hours = minutes / 60;
  // integer hours => no decimals
  if (Number.isInteger(hours)) return `${hours}時間`;

  // one decimal hour display (e.g., 1.3時間)
  const oneDecimal = Math.round(hours * 10) / 10;
  return `${oneDecimal.toFixed(1)}時間`;
}

export function EstimatedTimeBadge({
  minutes,
  className,
  title,
}: {
  minutes: number;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap",
        className
      )}
      title={title}
    >
      {formatEstimatedTime(minutes)}
    </span>
  );
}

export function EstimatedTimePopover({
  valueMinutes,
  onChangeMinutes,
  trigger,
  isOverridden = false,
  autoMinutes,
  onResetAuto,
  align = "start",
}: {
  valueMinutes: number;
  onChangeMinutes: (minutes: number) => void;
  trigger: React.ReactNode;
  /** true when user manually overrides auto-calculated estimate */
  isOverridden?: boolean;
  /** auto-calculated minutes to show as reference in manual mode */
  autoMinutes?: number;
  /** reset to auto-calculated mode */
  onResetAuto?: () => void;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-44 p-2" align={align}>
        {isOverridden && autoMinutes != null && autoMinutes > 0 && (
          <div className="text-[11px] text-muted-foreground mb-2 px-2">
            自動集計: {formatEstimatedTime(autoMinutes)}
          </div>
        )}

        <div className="grid gap-1">
          {ESTIMATED_TIME_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              className={cn(
                "justify-start text-xs h-8",
                valueMinutes === option.value && "bg-blue-500/10 text-blue-400"
              )}
              onClick={() => {
                onChangeMinutes(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {isOverridden && onResetAuto && (
          <div className="mt-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-8 text-muted-foreground"
              onClick={() => {
                onResetAuto();
                setOpen(false);
              }}
            >
              自動集計に戻す
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}


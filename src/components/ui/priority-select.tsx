"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export type Priority = 1 | 2 | 3 | 4

export interface PriorityOption {
    value: Priority
    label: string
    color: string
    bgColor: string
    hoverColor: string
    ringColor: string
    icon: string
}

export const PRIORITY_OPTIONS: Record<Priority, PriorityOption> = {
    1: {
        value: 1,
        label: "緊急",
        color: "text-red-500",
        bgColor: "bg-red-500/15",
        hoverColor: "hover:bg-red-500/25",
        ringColor: "ring-red-500/30",
        icon: "🔴",
    },
    2: {
        value: 2,
        label: "高い",
        color: "text-orange-500",
        bgColor: "bg-orange-500/15",
        hoverColor: "hover:bg-orange-500/25",
        ringColor: "ring-orange-500/30",
        icon: "🟠",
    },
    3: {
        value: 3,
        label: "中",
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/15",
        hoverColor: "hover:bg-yellow-500/25",
        ringColor: "ring-yellow-500/30",
        icon: "🟡",
    },
    4: {
        value: 4,
        label: "低い",
        color: "text-blue-500",
        bgColor: "bg-blue-500/15",
        hoverColor: "hover:bg-blue-500/25",
        ringColor: "ring-blue-500/30",
        icon: "🔵",
    },
}

// ----------------------------------------------------------------------
// PriorityBadge: Compact display (for list views)
// ----------------------------------------------------------------------
export function PriorityBadge({
    value,
    onClick,
    className,
}: {
    value: Priority
    onClick?: () => void
    className?: string
}) {
    const option = PRIORITY_OPTIONS[value]

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                option.color,
                option.bgColor,
                option.hoverColor,
                className
            )}
        >
            <span className="text-xs">{option.icon}</span>
            <span>{option.label}</span>
        </button>
    )
}

// ----------------------------------------------------------------------
// PrioritySelect: Full select dropdown (for forms)
// ----------------------------------------------------------------------
export function PrioritySelect({
    value,
    onChange,
    className,
}: {
    value: Priority
    onChange: (value: Priority) => void
    className?: string
}) {
    const option = PRIORITY_OPTIONS[value]

    return (
        <Select
            value={value.toString()}
            onValueChange={(v) => onChange(Number(v) as Priority)}
        >
            <SelectTrigger
                className={cn(
                    "w-[90px] h-7 text-xs border-zinc-700 bg-zinc-900/50",
                    option.bgColor,
                    className
                )}
            >
                <SelectValue>
                    <div className="flex items-center gap-1">
                        <span className="text-xs">{option.icon}</span>
                        <span className={option.color}>{option.label}</span>
                    </div>
                </SelectValue>
            </SelectTrigger>
            <SelectContent className="border-zinc-800 bg-zinc-900">
                {Object.values(PRIORITY_OPTIONS).map((opt) => (
                    <SelectItem
                        key={opt.value}
                        value={opt.value.toString()}
                        className="text-xs hover:bg-zinc-800 focus:bg-zinc-800"
                    >
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs">{opt.icon}</span>
                            <span className={opt.color}>{opt.label}</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

// ----------------------------------------------------------------------
// PriorityPopover: Popover menu for mind map nodes (compact)
// ----------------------------------------------------------------------
export function PriorityPopover({
    value,
    onChange,
    className,
}: {
    value: Priority
    onChange: (value: Priority) => void
    className?: string
}) {
    const [open, setOpen] = React.useState(false)
    const option = PRIORITY_OPTIONS[value]

    const handleSelect = (newValue: Priority) => {
        onChange(newValue)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                        option.color,
                        option.bgColor,
                        option.hoverColor,
                        "ring-1",
                        option.ringColor,
                        className
                    )}
                >
                    <span className="text-xs">{option.icon}</span>
                    <span>{option.label}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-28 p-1 border border-zinc-800 bg-zinc-900 shadow-xl"
                align="start"
            >
                <div className="flex flex-col gap-0.5">
                    {Object.values(PRIORITY_OPTIONS).map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleSelect(opt.value)}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors text-left",
                                opt.hoverColor,
                                value === opt.value && opt.bgColor
                            )}
                        >
                            <span className="text-xs">{opt.icon}</span>
                            <span className={opt.color}>{opt.label}</span>
                            {value === opt.value && (
                                <span className="ml-auto text-zinc-400">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}

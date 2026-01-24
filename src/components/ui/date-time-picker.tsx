"use client"

import * as React from "react"
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DateTimePickerProps {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    trigger?: React.ReactNode
}

// ----------------------------------------------------------------------
// Time Wheel Component (Improved & Simplified)
// ----------------------------------------------------------------------
function TimeWheel({
    selectedDate,
    onTimeChange
}: {
    selectedDate: Date | undefined,
    onTimeChange: (type: "hour" | "minute", value: number) => void
}) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10...

    return (
        <div className="flex flex-col h-[280px] w-[90px] shrink-0 border-l border-zinc-800 ml-2 pl-2">
            {/* Header */}
            <div className="flex items-center justify-center gap-1 py-2 mb-1 text-[11px] font-medium text-muted-foreground border-b border-zinc-800 select-none">
                <Clock className="w-3 h-3" />
                <span>TIME</span>
            </div>

            {/* Scrollable Area */}
            <div className="flex flex-1 relative h-full overflow-hidden">
                {/* Hours */}
                <ScrollArea className="h-full flex-1">
                    <div className="flex flex-col items-center py-20 space-y-1">
                        {hours.map((h) => (
                            <button
                                key={h}
                                type="button"
                                className={cn(
                                    "w-7 h-7 rounded-full text-xs flex items-center justify-center transition-all shrink-0 font-medium",
                                    selectedDate?.getHours() === h
                                        ? "bg-white text-black font-bold shadow-sm scale-110"
                                        : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                                )}
                                onClick={() => onTimeChange("hour", h)}
                            >
                                {h.toString().padStart(2, '0')}
                            </button>
                        ))}
                    </div>
                </ScrollArea>

                <div className="flex items-center justify-center pt-20 h-full px-0.5">
                    <span className="text-zinc-600 font-light pb-1">:</span>
                </div>

                {/* Minutes */}
                <ScrollArea className="h-full flex-1">
                    <div className="flex flex-col items-center py-20 space-y-1">
                        {minutes.map((m) => (
                            <button
                                key={m}
                                type="button"
                                className={cn(
                                    "w-7 h-7 rounded-full text-xs flex items-center justify-center transition-all shrink-0 font-medium",
                                    selectedDate?.getMinutes() === m
                                        ? "bg-white text-black font-bold shadow-sm scale-110"
                                        : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                                )}
                                onClick={() => onTimeChange("minute", m)}
                            >
                                {m.toString().padStart(2, '0')}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Main DateTimePicker Component
// ----------------------------------------------------------------------
export function DateTimePicker({ date, setDate, trigger }: DateTimePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)

    // Internal state for calendar navigation (Month view)
    const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())

    // Sync external date to internal state when opening/changing
    React.useEffect(() => {
        if (date) {
            setCurrentMonth(date)
        }
    }, [date])

    // Handlers
    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) {
            setDate(undefined)
            return
        }
        // Preserve current time
        const current = date || new Date()
        newDate.setHours(current.getHours())
        newDate.setMinutes(current.getMinutes())
        setDate(newDate)
    }

    const handleTimeChange = (type: "hour" | "minute", value: number) => {
        const newDate = date ? new Date(date) : new Date()
        if (type === "hour") {
            newDate.setHours(value)
        } else {
            newDate.setMinutes(value)
        }
        setDate(newDate)
        // Ensure month view follows selection if it changes drastically (optional)
        // setCurrentMonth(newDate) 
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {trigger || (
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-[240px] justify-start text-left font-normal border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "yyyy年 M月 d日 HH:mm", { locale: ja }) : <span>日時を選択</span>}
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent
                className="w-auto p-0 border border-zinc-800 bg-[#18181b] shadow-2xl rounded-xl overflow-hidden"
                align="start"
            >
                <div className="flex p-4">
                    {/* 
                      LEFT SIDE: CALENDAR 
                      Clean implementation using react-day-picker standard styling override.
                    */}
                    <div className="flex flex-col">
                        <Calendar
                            mode="single"
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            selected={date}
                            onSelect={handleDateSelect}
                            locale={ja}
                            weekStartsOn={1} // Monday start (if desired) or 0 (Sunday). Defaulting to Sunday as per last viable "Ideal" image which had "日" at left. Note: User feedback varied, sticking to standard "Ideal" image (Sunday) for now unless otherwise specified.
                            // Actually, let's stick to Sunday Start (0) to match standard calendars unless explicitly asked for Monday again. 
                            // Re-reading user request: "謎の文字...消して" (Remove mysterious chars). Keep it simple.
                            showOutsideDays={false} // Clean. No numbers from prev/next month.
                            fixedWeeks // Stable height
                            className="p-0"
                            classNames={{
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                month: "space-y-4",
                                caption: "flex justify-center pt-1 relative items-center mb-2", // Header (Month Year)
                                caption_label: "text-base font-bold text-zinc-100",
                                nav: "space-x-1 flex items-center",
                                nav_button: cn(
                                    buttonVariants({ variant: "ghost" }),
                                    "h-7 w-7 bg-transparent p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                ),
                                nav_button_previous: "absolute left-1",
                                nav_button_next: "absolute right-1",
                                table: "w-full border-collapse space-y-1",
                                head_row: "flex mb-2", // Row for Weekdays
                                head_cell: "text-zinc-500 rounded-md w-9 font-normal text-[0.8rem] text-center", // Weekday text (日 月...)
                                row: "flex w-full mt-2", // Date Rows
                                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                day: cn(
                                    buttonVariants({ variant: "ghost" }),
                                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                ),
                                day_range_end: "day-range-end",
                                day_selected: "bg-zinc-100 text-zinc-900 hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900 font-bold rounded-md",
                                day_today: "bg-zinc-800 text-zinc-50 accent-zinc-500",
                                day_outside: "text-zinc-800 opacity-50",
                                day_disabled: "text-zinc-800 opacity-50",
                                day_hidden: "invisible",
                            }}
                        />
                    </div>

                    {/* RIGHT SIDE: TIME WHEEL */}
                    <TimeWheel selectedDate={date} onTimeChange={handleTimeChange} />
                </div>
            </PopoverContent>
        </Popover>
    )
}

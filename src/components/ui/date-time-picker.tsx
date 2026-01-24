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
// Time Wheel Component (Split Hours / Minutes)
// ----------------------------------------------------------------------
function TimeWheel({
    selectedDate,
    onTimeChange
}: {
    selectedDate: Date | undefined,
    onTimeChange: (type: "hour" | "minute", value: number) => void
}) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    // 5-minute increments
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

    // Helper to scroll to selected element (simplified approach: padding ensures center)
    // For a robust implementation, we might need refs, but for now CSS centering suffices.

    return (
        <div className="flex flex-col h-[280px] w-[90px] shrink-0 border-l border-zinc-800 ml-2 pl-2">
            {/* Header */}
            <div className="flex items-center justify-around py-2 mb-1 text-[10px] font-medium text-muted-foreground border-b border-zinc-800 select-none">
                <span>時</span>
                <span>分</span>
            </div>

            {/* Scrollable Area */}
            <div className="flex flex-1 relative h-full overflow-hidden">
                {/* Hours Column */}
                <ScrollArea className="h-full flex-1">
                    <div className="flex flex-col items-center py-24 space-y-1">
                        {hours.map((h) => {
                            const isSelected = selectedDate?.getHours() === h;
                            return (
                                <button
                                    key={h}
                                    type="button"
                                    className={cn(
                                        "w-8 h-7 rounded-md text-xs flex items-center justify-center transition-all shrink-0 font-medium",
                                        isSelected
                                            ? "bg-zinc-800 text-white font-bold shadow-sm"
                                            : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
                                    )}
                                    onClick={() => onTimeChange("hour", h)}
                                >
                                    {h.toString().padStart(2, '0')}
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>

                {/* Separator Line (Visual) */}
                <div className="w-[1px] h-full bg-zinc-800/50 mx-0.5" />

                {/* Minutes Column */}
                <ScrollArea className="h-full flex-1">
                    <div className="flex flex-col items-center py-24 space-y-1">
                        {minutes.map((m) => {
                            const currentMin = selectedDate?.getMinutes() || 0;
                            // Check if selected minute matches (handling exact match for 5-min steps)
                            const isSelected = currentMin === m;

                            return (
                                <button
                                    key={m}
                                    type="button"
                                    className={cn(
                                        "w-8 h-7 rounded-md text-xs flex items-center justify-center transition-all shrink-0 font-medium",
                                        isSelected
                                            ? "bg-zinc-800 text-white font-bold shadow-sm"
                                            : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
                                    )}
                                    // Handle minute change
                                    onClick={() => onTimeChange("minute", m)}
                                >
                                    {m.toString().padStart(2, '0')}
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>

                {/* Center Highlight Overlay (Optional visual cue) */}
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-7 bg-zinc-800/10 pointer-events-none rounded sm:hidden" />
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

    // Internal temporary state for "Set" / "Cancel" logic
    // We only commit to `setDate` (parent) when "Set" is clicked.
    const [tempDate, setTempDate] = React.useState<Date | undefined>(date)

    // Sync external date to internal state when opening
    React.useEffect(() => {
        if (isOpen) {
            setTempDate(date || new Date())
            setCurrentMonth(date || new Date())
        }
    }, [isOpen, date])

    // Handlers
    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) return

        // Preserve current time from tempDate
        const current = tempDate || new Date()
        newDate.setHours(current.getHours())
        newDate.setMinutes(current.getMinutes())
        setTempDate(newDate)
    }

    const handleTimeChange = (type: "hour" | "minute", value: number) => {
        const newDate = tempDate ? new Date(tempDate) : new Date()
        if (type === "hour") {
            newDate.setHours(value)
        } else {
            newDate.setMinutes(value)
        }
        setTempDate(newDate)
    }

    // Commit changes
    const onConfirm = () => {
        setDate(tempDate)
        setIsOpen(false)
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
                <div className="flex p-4 pb-2">
                    {/* LEFT: CALENDAR */}
                    <div className="flex flex-col">
                        <Calendar
                            mode="single"
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            selected={tempDate}
                            onSelect={handleDateSelect}
                            locale={ja}
                            weekStartsOn={1} // Monday start (if desired, usually 0/1 depending on preference. Keeping 1 for consistency with '月' start request)
                            showOutsideDays={false}
                            fixedWeeks
                            className="p-0"
                            classNames={{
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                month: "space-y-4",
                                caption: "flex justify-center pt-1 relative items-center mb-2",
                                caption_label: "text-base font-bold text-zinc-100",
                                nav: "space-x-1 flex items-center",
                                nav_button: cn(
                                    buttonVariants({ variant: "ghost" }),
                                    "h-7 w-7 bg-transparent p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                ),
                                nav_button_previous: "absolute left-1",
                                nav_button_next: "absolute right-1",
                                // Table Layout: FIXED for perfect alignment
                                table: "w-full border-collapse space-y-1 table-fixed",
                                head_row: "table-row mb-2",
                                head_cell: "text-zinc-500 rounded-md w-9 font-normal text-[0.8rem] text-center align-middle h-8",
                                row: "table-row w-full mt-2",
                                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 align-middle",
                                // Removed fixed width from 'day' to let table-fixed handle distribution
                                day: cn(
                                    buttonVariants({ variant: "ghost" }),
                                    "h-9 w-full p-0 font-normal aria-selected:opacity-100 text-zinc-300 hover:bg-zinc-800 hover:text-white mx-auto aspect-square"
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

                    {/* RIGHT: TIME WHEEL */}
                    <TimeWheel selectedDate={tempDate} onTimeChange={handleTimeChange} />
                </div>

                {/* FOOTER: Action Buttons */}
                <div className="flex items-center justify-between border-t border-zinc-800 bg-[#18181b] p-2">
                    <Button
                        variant="ghost"
                        className="text-xs text-zinc-400 hover:text-white h-8 px-4"
                        onClick={() => setIsOpen(false)}
                    >
                        キャンセル
                    </Button>
                    <Button
                        className="text-xs h-8 px-4 bg-zinc-100 text-black hover:bg-white"
                        onClick={onConfirm}
                    >
                        設定
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

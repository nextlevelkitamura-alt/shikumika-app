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

// Wheel-style Time Picker Component
function TimeWheel({
    selectedDate,
    onTimeChange
}: {
    selectedDate: Date | undefined,
    onTimeChange: (type: "hour" | "minute", value: number) => void
}) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5); // 5分刻み

    return (
        <div className="flex flex-col h-[300px] border-l border-zinc-700/50 pl-2 ml-2 w-[120px] shrink-0">
            <div className="flex items-center justify-center gap-1.5 py-3 mb-1 text-xs font-medium text-muted-foreground border-b border-zinc-700/50 select-none">
                <Clock className="w-3.5 h-3.5" />
                <span>時間</span>
            </div>
            <div className="flex flex-1 relative h-full">
                {/* Hours */}
                <ScrollArea className="h-full flex-1">
                    <div className="flex flex-col items-center py-24 space-y-3">
                        {hours.map((h) => (
                            <button
                                key={h}
                                className={cn(
                                    "w-8 h-8 rounded-full text-sm flex items-center justify-center transition-all shrink-0 font-medium",
                                    selectedDate?.getHours() === h
                                        ? "bg-white text-black font-bold shadow-md scale-110"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => onTimeChange("hour", h)}
                            >
                                {h.toString().padStart(2, '0')}
                            </button>
                        ))}
                    </div>
                </ScrollArea>

                <div className="flex items-center justify-center pt-24 h-full px-1">
                    <span className="text-muted-foreground/30 font-light">:</span>
                </div>

                {/* Minutes */}
                <ScrollArea className="h-full flex-1">
                    <div className="flex flex-col items-center py-24 space-y-3">
                        {minutes.map((m) => (
                            <button
                                key={m}
                                className={cn(
                                    "w-8 h-8 rounded-full text-sm flex items-center justify-center transition-all shrink-0 font-medium",
                                    selectedDate?.getMinutes() === m
                                        ? "bg-white text-black font-bold shadow-md scale-110"
                                        : "text-muted-foreground hover:text-foreground"
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

export function DateTimePicker({ date, setDate, trigger }: DateTimePickerProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
    const [currentMonth, setCurrentMonth] = React.useState<Date>(date || new Date())
    const [isOpen, setIsOpen] = React.useState(false)

    // Sync external state
    React.useEffect(() => {
        setSelectedDate(date)
        if (date) setCurrentMonth(date)
    }, [date])

    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) {
            setSelectedDate(undefined)
            setDate(undefined)
            return
        }
        // Preserve time from current selection
        const currentDate = selectedDate || new Date()
        newDate.setHours(currentDate.getHours())
        newDate.setMinutes(currentDate.getMinutes())
        setSelectedDate(newDate)
        setDate(newDate)
    }

    const handleTimeChange = (type: "hour" | "minute", value: number) => {
        const newDate = selectedDate ? new Date(selectedDate) : new Date()
        if (type === "hour") {
            newDate.setHours(value)
        } else {
            newDate.setMinutes(value)
        }
        setSelectedDate(newDate)
        setDate(newDate)
    }

    const handleMonthChange = (offset: number) => {
        const newMonth = new Date(currentMonth)
        newMonth.setMonth(newMonth.getMonth() + offset)
        setCurrentMonth(newMonth)
    }

    // Manual Weekday Header (Sunday Start to match Ideal Image)
    // "日 月 火 水 木 金 土"
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                {trigger || (
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "yyyy年 M月 d日 HH:mm", { locale: ja }) : <span>日時を選択</span>}
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none shadow-2xl bg-[#18181b] text-white" align="start">
                <div className="flex p-4 rounded-xl border border-zinc-800">
                    {/* Left Side: Calendar */}
                    <div className="flex flex-col w-[280px] mr-2">
                        {/* 1. Custom Header */}
                        <div className="flex items-center justify-between px-2 mb-4">
                            <div className="font-bold text-base pl-1">
                                {format(currentMonth, "yyyy年 M月", { locale: ja })}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white" onClick={() => handleMonthChange(-1)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white" onClick={() => handleMonthChange(1)}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* 2. Manual Weekday Header */}
                        <div className="grid grid-cols-7 mb-0 text-center border-b border-zinc-800">
                            {weekdays.map((day) => (
                                <div key={day} className="text-sm font-medium text-zinc-400 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* 3. Calendar with Standard Table Layout (Robust Grid Lines) */}
                        <Calendar
                            mode="single"
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            locale={ja}
                            showOutsideDays={false} // Match ideal image (empty black cells)
                            fixedWeeks
                            className="p-0 border-l border-zinc-800"
                            classNames={{
                                caption: "hidden",
                                nav: "hidden",
                                month: "space-y-0",
                                // Use standard table layout for perfect borders
                                table: "w-full border-collapse",
                                head_row: "hidden", // We observe the manual header above
                                row: "flex w-full mt-0", // react-day-picker v8 uses flex rows by default, we force display:table-row equivalent via parent?
                                // Actually, react-day-picker renders a table. If we remove 'flex' from 'row', it behaves like a TR.
                                // Let's clear the 'row' class to let it be a natural TR.
                                // BUT, shadcn/ui calendar usually forces 'flex'.
                                // We will force TABLE styling here.
                                tbody: "block w-full", // Wait, for border-collapse to work on cells, we need TABLE display.
                                // Let's try STRICT TABLE override.
                            }}
                            // Overriding shadcn styles requires deep class targeting or structural reset.
                            // Better approach for "Grid Lines": Treat rows as Grid or Flex with borders.
                            // Let's use the Grid approach which allows borders on cells easily.
                            // We use the "force block" fix but apply borders to cells.
                            classNames={{
                                caption: "hidden",
                                nav: "hidden",
                                month: "space-y-0",
                                table: "w-full border-collapse block", // Block table to allow grid row
                                tbody: "w-full block",
                                head_row: "hidden",
                                row: "grid grid-cols-7 w-full border-b border-zinc-800", // Row border
                                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 aspect-square border-r border-zinc-800 flex items-center justify-center", // Cell border
                                day: cn(
                                    buttonVariants({ variant: "ghost" }),
                                    "h-full w-full p-0 font-normal aria-selected:opacity-100 rounded-none hover:bg-zinc-800 text-zinc-300"
                                ),
                                day_range_end: "day-range-end",
                                day_selected: "bg-transparent text-white font-bold relative after:content-[''] after:absolute after:inset-1 after:bg-zinc-700 after:rounded-full after:-z-10",
                                day_today: "text-white font-bold",
                                day_outside: "invisible",
                                day_disabled: "text-zinc-600 opacity-50",
                                day_hidden: "invisible",
                            }}
                            formatters={{
                                formatCaption: () => ""
                            }}
                        />
                    </div>

                    {/* Right Side: Wheel Time Picker */}
                    <TimeWheel selectedDate={selectedDate} onTimeChange={handleTimeChange} />
                </div>
            </PopoverContent>
        </Popover>
    )
}

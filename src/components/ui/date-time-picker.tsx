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
        <div className="flex flex-col h-[220px] border-l border-zinc-700/50 pl-2 ml-2 w-[90px] shrink-0">
            <div className="flex items-center justify-center gap-1 py-2 mb-1 text-[11px] font-medium text-muted-foreground border-b border-zinc-700/50 select-none">
                <Clock className="w-3 h-3" />
                <span>時間</span>
            </div>
            <div className="flex flex-1 relative h-full">
                {/* Hours */}
                <ScrollArea className="h-full flex-1">
                    <div className="flex flex-col items-center py-16 space-y-2">
                        {hours.map((h) => (
                            <button
                                key={h}
                                className={cn(
                                    "w-7 h-7 rounded-full text-xs flex items-center justify-center transition-all shrink-0 font-medium",
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

                <div className="flex items-center justify-center pt-16 h-full px-1">
                    <span className="text-muted-foreground/30 font-light">:</span>
                </div>

                {/* Minutes */}
                <ScrollArea className="h-full flex-1">
                    <div className="flex flex-col items-center py-16 space-y-2">
                        {minutes.map((m) => (
                            <button
                                key={m}
                                className={cn(
                                    "w-7 h-7 rounded-full text-xs flex items-center justify-center transition-all shrink-0 font-medium",
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
            <PopoverContent className="w-auto p-0 border border-zinc-800 shadow-xl bg-[#18181b] text-white rounded-lg" align="start">
                <div className="flex p-3 rounded-lg">
                    {/* Left Side: Calendar */}
                    <div className="flex flex-col w-[220px] mr-2">
                        {/* 1. Custom Header */}
                        <div className="flex items-center justify-between px-1 mb-2">
                            <div className="font-semibold text-sm pl-1">
                                {format(currentMonth, "yyyy年 M月", { locale: ja })}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-400 hover:text-white" onClick={() => handleMonthChange(-1)}>
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-400 hover:text-white" onClick={() => handleMonthChange(1)}>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* 2. Calendar Grid */}
                        <Calendar
                            mode="single"
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            locale={ja}
                            showOutsideDays={false}
                            className="p-0"
                            classNames={{
                                caption: "hidden",
                                nav: "hidden",
                                month: "space-y-0",
                                table: "w-full border-collapse",
                                head_row: "table-row",
                                head_cell: "table-cell text-center text-[11px] text-zinc-400 pb-1",
                                tbody: "w-full",
                                row: "table-row w-full",
                                cell: "table-cell p-0 text-center text-xs focus-within:relative focus-within:z-20 align-middle",
                                day: cn(
                                    buttonVariants({ variant: "ghost" }),
                                    "h-8 w-8 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-zinc-800 text-zinc-300 mx-auto"
                                ),
                                day_range_end: "day-range-end",
                                day_selected: "bg-zinc-700 text-white font-semibold",
                                day_today: "text-white font-semibold",
                                day_outside: "text-zinc-600/50 opacity-60 pointer-events-none select-none",
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

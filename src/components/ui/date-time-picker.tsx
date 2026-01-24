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

// Wheel-style Time Picker Component (Maintained)
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
        <div className="flex flex-col h-full border-l pl-3 ml-3 w-[100px] shrink-0">
            <div className="flex items-center justify-center gap-2 mb-2 text-xs font-semibold text-muted-foreground pb-2 border-b">
                <Clock className="w-3.5 h-3.5" />
                <span>時間</span>
            </div>
            <div className="flex gap-1 h-[240px]">
                {/* Hours */}
                <ScrollArea className="h-full w-12 rounded-md border bg-background/50">
                    <div className="flex flex-col items-center py-24 space-y-1">
                        {hours.map((h) => (
                            <button
                                key={h}
                                className={cn(
                                    "w-8 h-8 rounded-full text-xs flex items-center justify-center transition-all shrink-0 font-medium",
                                    selectedDate?.getHours() === h
                                        ? "bg-primary text-primary-foreground font-bold shadow-md scale-105"
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                                onClick={() => onTimeChange("hour", h)}
                            >
                                {h.toString().padStart(2, '0')}
                            </button>
                        ))}
                    </div>
                </ScrollArea>

                <div className="flex items-center justify-center h-full pb-4">
                    <span className="text-muted-foreground font-bold">:</span>
                </div>

                {/* Minutes */}
                <ScrollArea className="h-full w-12 rounded-md border bg-background/50">
                    <div className="flex flex-col items-center py-24 space-y-1">
                        {minutes.map((m) => (
                            <button
                                key={m}
                                className={cn(
                                    "w-8 h-8 rounded-full text-xs flex items-center justify-center transition-all shrink-0 font-medium",
                                    selectedDate?.getMinutes() === m
                                        ? "bg-primary text-primary-foreground font-bold shadow-md scale-105"
                                        : "text-muted-foreground hover:bg-muted"
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
            <PopoverContent className="w-auto p-0 border-none shadow-xl bg-popover" align="start">
                <div className="flex p-3 rounded-md border min-w-[380px]">
                    {/* Left Side: Calendar */}
                    <div className="flex flex-col w-[260px] mr-2">
                        {/* 1. Custom Header */}
                        <div className="flex items-center justify-between px-1 mb-2">
                            <div className="font-semibold text-sm pl-1">
                                {format(currentMonth, "yyyy年 M月", { locale: ja })}
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => handleMonthChange(-1)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => handleMonthChange(1)}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* 2. Calendar with GRID LAYOUT */}
                        <Calendar
                            mode="single"
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            locale={ja}
                            showOutsideDays={true} // Enable to ensure grid structure (offset), hidden via CSS
                            fixedWeeks
                            className="p-0 border rounded-md p-1"
                            classNames={{
                                caption: "hidden",
                                nav: "hidden",
                                month: "space-y-0",
                                table: "w-full border-collapse",
                                // LAYOUT FIX: Enforce strict 7-column grid
                                head_row: "grid grid-cols-7 mb-1",
                                head_cell: "text-muted-foreground w-full font-normal text-[0.8rem] text-center py-1",
                                row: "grid grid-cols-7 mt-0 w-full",
                                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 aspect-square flex items-center justify-center",
                                day: cn(
                                    buttonVariants({ variant: "ghost" }),
                                    "h-8 w-8 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-primary/20 hover:text-primary transition-colors"
                                ),
                                day_range_end: "day-range-end",
                                day_selected: "!bg-primary !text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                day_today: "bg-accent/50 text-accent-foreground font-bold",
                                day_outside: "invisible", // Hidden but occupies space for correct offset
                                day_disabled: "text-muted-foreground opacity-50",
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

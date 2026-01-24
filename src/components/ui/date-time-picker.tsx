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

    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5) // 5分刻み

    // Time Picker - positioned where "Mo Tu We..." header used to be
    const TimePickerSection = () => (
        <div className="flex items-center justify-center gap-2 py-2 border-b border-t bg-muted/10">
            <Clock className="w-3.5 h-3.5 text-muted-foreground mr-1" />
            <div className="flex items-center gap-1">
                {/* Hours Scroll */}
                <ScrollArea className="h-8 w-14 border rounded bg-background shadow-sm">
                    <div className="flex flex-col items-center">
                        {hours.map((h) => (
                            <div
                                key={h}
                                className={cn(
                                    "w-full text-center text-xs py-1 cursor-pointer hover:bg-accent transition-colors",
                                    selectedDate?.getHours() === h && "bg-primary text-primary-foreground font-bold"
                                )}
                                onClick={() => handleTimeChange("hour", h)}
                            >
                                {h.toString().padStart(2, '0')}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <span className="text-sm font-bold text-muted-foreground">:</span>
                {/* Minutes Scroll */}
                <ScrollArea className="h-8 w-14 border rounded bg-background shadow-sm">
                    <div className="flex flex-col items-center">
                        {minutes.map((m) => (
                            <div
                                key={m}
                                className={cn(
                                    "w-full text-center text-xs py-1 cursor-pointer hover:bg-accent transition-colors",
                                    selectedDate?.getMinutes() === m && "bg-primary text-primary-foreground font-bold"
                                )}
                                onClick={() => handleTimeChange("minute", m)}
                            >
                                {m.toString().padStart(2, '0')}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )

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
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 w-[280px]"> {/* Fixed width container */}
                    {/* 1. Custom Month Navigation (Fixed Position) */}
                    <div className="flex items-center justify-between mb-2 px-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMonthChange(-1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="font-semibold text-sm">
                            {format(currentMonth, "yyyy年 M月", { locale: ja })}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMonthChange(1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* 4. Time Picker in Header Area */}
                    <TimePickerSection />

                    {/* Calendar Grid */}
                    <Calendar
                        mode="single"
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        locale={ja}
                        showOutsideDays={false} // 5. Hide outside days
                        fixedWeeks // 3. Prevent jumping
                        className="p-0 mt-2"
                        classNames={{
                            // Hide default navigation and headers
                            caption: "hidden",
                            nav: "hidden",
                            head_row: "hidden", // 2. Remove day headers
                            month: "space-y-0", // Compact spacing
                            table: "w-full border-collapse",
                            row: "flex w-full mt-1",
                            cell: "h-8 w-8 text-center text-sm p-0 flex items-center justify-center relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: cn(
                                buttonVariants({ variant: "ghost" }),
                                "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
                            ),
                        }}
                    />
                </div>
            </PopoverContent>
        </Popover>
    )
}

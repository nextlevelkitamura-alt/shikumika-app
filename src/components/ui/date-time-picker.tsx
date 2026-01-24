"use client"

import * as React from "react"
import { Calendar as CalendarIcon, ChevronDown, ChevronUp } from "lucide-react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SimpleCalendar } from "@/components/ui/simple-calendar"

interface DateTimePickerProps {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    trigger?: React.ReactNode
}

// ----------------------------------------------------------------------
// Time Wheel Component (Split Hours / Minutes)
// - Visual goal: iOS-like wheel with center highlight band + chevrons
// ----------------------------------------------------------------------
function TimeWheel({
    selectedDate,
    onTimeChange,
}: {
    selectedDate: Date | undefined
    onTimeChange: (type: "hour" | "minute", value: number) => void
}) {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const minutes = Array.from({ length: 12 }, (_, i) => i * 5)

    return (
        <div className="flex flex-col w-[90px] shrink-0 border-l border-zinc-800/80 pl-2 ml-3">
            <div className="flex items-center justify-around py-2 text-[10px] font-medium text-zinc-400 border-b border-zinc-800/80 select-none">
                <span>時</span>
                <span>分</span>
            </div>

            <div className="relative h-[240px] overflow-hidden">
                {/* Top chevrons */}
                <div className="absolute top-2 left-0 right-0 flex justify-around pointer-events-none text-zinc-500/70">
                    <ChevronUp className="h-4 w-4" />
                    <ChevronUp className="h-4 w-4" />
                </div>

                {/* Bottom chevrons */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-around pointer-events-none text-zinc-500/70">
                    <ChevronDown className="h-4 w-4" />
                    <ChevronDown className="h-4 w-4" />
                </div>

                {/* Center highlight band (across both columns) */}
                <div
                    className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-9 rounded-lg pointer-events-none bg-sky-500/15 ring-1 ring-sky-400/25 shadow-[0_0_18px_rgba(56,189,248,0.22)]"
                />

                {/* Top/Bottom fade (wheel feel) */}
                <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#18181b] to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#18181b] to-transparent pointer-events-none" />

                <div className="flex h-full">
                    {/* Hours */}
                    <ScrollArea className="h-full flex-1">
                        <div className="flex flex-col items-center py-14 space-y-1">
                            {hours.map((h) => {
                                const isSelected = selectedDate?.getHours() === h
                                return (
                                    <button
                                        key={h}
                                        type="button"
                                        className={cn(
                                            "w-8 h-8 rounded-md text-xs flex items-center justify-center transition-colors font-medium",
                                            isSelected
                                                ? "text-white"
                                                : "text-zinc-500 hover:text-zinc-200"
                                        )}
                                        onClick={() => onTimeChange("hour", h)}
                                    >
                                        {h.toString().padStart(2, "0")}
                                    </button>
                                )
                            })}
                        </div>
                    </ScrollArea>

                    <div className="w-px bg-zinc-800/60 mx-1" />

                    {/* Minutes */}
                    <ScrollArea className="h-full flex-1">
                        <div className="flex flex-col items-center py-14 space-y-1">
                            {minutes.map((m) => {
                                const currentMin = selectedDate?.getMinutes() ?? 0
                                const isSelected = currentMin === m
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        className={cn(
                                            "w-8 h-8 rounded-md text-xs flex items-center justify-center transition-colors font-medium",
                                            isSelected
                                                ? "text-white"
                                                : "text-zinc-500 hover:text-zinc-200"
                                        )}
                                        onClick={() => onTimeChange("minute", m)}
                                    >
                                        {m.toString().padStart(2, "0")}
                                    </button>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    )
}

// ----------------------------------------------------------------------
// Main DateTimePicker Component
// ----------------------------------------------------------------------
export function DateTimePicker({ date, setDate, trigger }: DateTimePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())
    const [tempDate, setTempDate] = React.useState<Date | undefined>(date)
    const [isMounted, setIsMounted] = React.useState(false)

    // クライアントでマウントされたことを検知（SSR/Hydration Error 回避）
    React.useEffect(() => {
        setIsMounted(true)
    }, [])

    React.useEffect(() => {
        if (isOpen) {
            setTempDate(date || new Date())
            setCurrentMonth(date || new Date())
        }
    }, [isOpen, date])

    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) return
        const current = tempDate || new Date()
        newDate.setHours(current.getHours())
        newDate.setMinutes(current.getMinutes())
        setTempDate(newDate)
    }

    const handleTimeChange = (type: "hour" | "minute", value: number) => {
        const newDate = tempDate ? new Date(tempDate) : new Date()
        if (type === "hour") newDate.setHours(value)
        else newDate.setMinutes(value)
        setTempDate(newDate)
    }

    const onConfirm = () => {
        setDate(tempDate)
        setIsOpen(false)
    }

    // SSR時は何も表示しない（Hydration Error 回避）
    if (!isMounted) {
        return trigger || (
            <Button
                variant={"outline"}
                className={cn(
                    "w-[240px] justify-start text-left font-normal border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:text-white",
                    !date && "text-muted-foreground"
                )}
            >
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>読み込み中...</span>
            </Button>
        )
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
                        {date ? (
                            format(date, "yyyy年 M月 d日 HH:mm", { locale: ja })
                        ) : (
                            <span>日時を選択</span>
                        )}
                    </Button>
                )}
            </PopoverTrigger>

            <PopoverContent
                    className="w-auto p-0 border border-zinc-800 bg-[#18181b] shadow-2xl rounded-xl overflow-hidden"
                    align="start"
                >
                    <div className="flex p-4 pb-2">
                        {/* LEFT: SIMPLE CALENDAR (react-day-picker 不使用) */}
                        <SimpleCalendar
                            selected={tempDate}
                            onSelect={handleDateSelect}
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                        />

                    {/* RIGHT: TIME WHEEL */}
                    <TimeWheel selectedDate={tempDate} onTimeChange={handleTimeChange} />
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-between border-t border-zinc-800 bg-[#18181b] px-3 py-2">
                    <Button
                        variant="ghost"
                        className="text-xs text-zinc-400 hover:text-white h-8 px-3"
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

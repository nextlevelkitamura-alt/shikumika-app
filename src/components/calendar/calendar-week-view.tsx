"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"

interface CalendarWeekViewProps {
  onTaskDrop?: (taskId: string, dateTime: Date) => void
}

export function CalendarWeekView({ onTaskDrop }: CalendarWeekViewProps) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)

  // 今週の日付を取得（月曜始まり）
  const getWeekDates = () => {
    const today = new Date()
    const day = today.getDay()
    const diff = today.getDate() - day + (day === 0 ? -6 : 1) // 月曜を週の始まりに
    const monday = new Date(today.setDate(diff))

    return Array.from({ length: 5 }, (_, i) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      return date
    })
  }

  const weekDates = getWeekDates()
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

  // ドラッグオーバー処理
  const handleDragOver = useCallback((e: React.DragEvent, cellId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOverCell(cellId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverCell(null)
  }, [])

  // ドロップ処理
  const handleDrop = useCallback((e: React.DragEvent, dateIndex: number, hour: number) => {
    e.preventDefault()
    setDragOverCell(null)

    // ドラッグされたタスクIDを取得
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    // ドロップされた日時を計算
    const targetDate = new Date(weekDates[dateIndex])
    targetDate.setHours(hour, 0, 0, 0)

    console.log('[CalendarWeekView] Task dropped:', { taskId, dateTime: targetDate })

    // コールバック実行
    onTaskDrop?.(taskId, targetDate)
  }, [weekDates, onTaskDrop])

  const formatDate = (date: Date) => {
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return {
      day: days[date.getDay()],
      date: date.getDate()
    }
  }

  return (
    <div className="w-full h-full grid grid-cols-5 grid-rows-[auto_1fr] bg-background border rounded overflow-hidden">
      {/* Days Header */}
      <div className="col-span-5 grid grid-cols-5 border-b py-2 text-center text-xs text-muted-foreground">
        {weekDates.map((date, i) => {
          const { day, date: dateNum } = formatDate(date)
          const isToday = new Date().toDateString() === date.toDateString()
          return (
            <span key={i} className={cn(isToday && "text-primary font-bold")}>
              {day}<br />
              <span className={cn(
                "text-lg font-bold",
                isToday ? "text-primary" : "text-foreground"
              )}>
                {dateNum}
              </span>
            </span>
          )
        })}
      </div>

      {/* Time Grid */}
      <div className="col-span-5 relative grid grid-rows-10 divide-y">
        {hours.map((hour, hourIndex) => (
          <div key={hour} className="relative h-full border-l ml-8 group">
            <span className="absolute -left-8 -top-2 text-[10px] text-muted-foreground w-6 text-right block group-first:hidden">
              {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
            </span>

            {/* ドロップゾーン（各日の各時間） */}
            <div className="absolute inset-0 grid grid-cols-5">
              {weekDates.map((_, dayIndex) => {
                const cellId = `${dayIndex}-${hourIndex}`
                const isHighlighted = dragOverCell === cellId

                return (
                  <div
                    key={cellId}
                    className={cn(
                      "border-r transition-colors",
                      isHighlighted && "bg-primary/10 border-primary"
                    )}
                    onDragOver={(e) => handleDragOver(e, cellId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dayIndex, hour)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

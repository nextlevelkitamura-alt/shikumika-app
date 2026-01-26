"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Settings, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export interface Calendar {
  id: string
  name: string
  description?: string | null
  color: string
  accessRole: string
  primary: boolean
  selected: boolean
  timeZone: string
}

interface CalendarSelectorProps {
  onSelectionChange?: (selectedIds: string[]) => void
  compact?: boolean
}

export function CalendarSelector({ onSelectionChange, compact = false }: CalendarSelectorProps) {
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // カレンダーリストを取得
  const fetchCalendars = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/calendar/list')

      if (!response.ok) {
        throw new Error('Failed to fetch calendars')
      }

      const data = await response.json()
      setCalendars(data.calendars || [])
    } catch (err: any) {
      console.error('Failed to fetch calendars:', err)
      setError(err.message || 'カレンダーリストの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCalendars()
  }, [])

  // カレンダーの選択状態をトグル
  const toggleCalendar = (id: string) => {
    const updated = calendars.map(cal =>
      cal.id === id ? { ...cal, selected: !cal.selected } : cal
    )
    setCalendars(updated)

    // 選択されたカレンダーIDを親に通知
    const selectedIds = updated.filter(cal => cal.selected).map(cal => cal.id)
    onSelectionChange?.(selectedIds)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">読み込み中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-2 space-y-2">
        <p className="text-xs text-red-500">{error}</p>
        <Button
          onClick={fetchCalendars}
          size="sm"
          variant="outline"
          className="w-full h-7 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          再試行
        </Button>
      </div>
    )
  }

  if (calendars.length === 0) {
    return compact ? null : (
      <div className="p-2 text-xs text-muted-foreground text-center">
        カレンダーが見つかりません
      </div>
    )
  }

  const selectedCount = calendars.filter(cal => cal.selected).length

  // Compact mode (dropdown)
  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            {selectedCount}個
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {calendars.map((calendar) => (
            <DropdownMenuCheckboxItem
              key={calendar.id}
              checked={calendar.selected}
              onCheckedChange={() => toggleCalendar(calendar.id)}
              className="flex items-center gap-2"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: calendar.color }}
              />
              <span className="flex-1 truncate">
                {calendar.name}
                {calendar.primary && (
                  <span className="ml-1 text-[10px] text-muted-foreground">(メイン)</span>
                )}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <Button
            onClick={fetchCalendars}
            size="sm"
            variant="ghost"
            className="w-full h-7 text-xs justify-start"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            更新
          </Button>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Full mode (original)
  return (
    <div className="p-2 space-y-2">
      {/* カレンダーリスト */}
      <div className="space-y-1">
        {calendars.map((calendar) => (
          <label
            key={calendar.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={calendar.selected}
              onChange={() => toggleCalendar(calendar.id)}
              className="w-3 h-3 rounded border-gray-300"
            />
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: calendar.color }}
            />
            <span className="text-xs flex-1 truncate">
              {calendar.name}
              {calendar.primary && (
                <span className="ml-1 text-[10px] text-muted-foreground">(メイン)</span>
              )}
            </span>
          </label>
        ))}
      </div>

      {/* 更新ボタン */}
      <Button
        onClick={fetchCalendars}
        size="sm"
        variant="ghost"
        className="w-full h-7 text-xs"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        更新
      </Button>
    </div>
  )
}

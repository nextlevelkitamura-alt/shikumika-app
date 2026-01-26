"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, MessageSquare, Send, Sparkles } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CalendarSettings } from "./calendar-settings"
import { CalendarSelector } from "@/components/calendar/calendar-selector"
import { CalendarWeekView } from "@/components/calendar/calendar-week-view"

export function RightSidebar() {
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(true)
    const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([])

    // タスクがカレンダーにドロップされた時の処理
    const handleTaskDrop = useCallback(async (taskId: string, dateTime: Date) => {
        console.log('[RightSidebar] Task dropped on calendar:', { taskId, dateTime })

        try {
            // カレンダーに同期
            const response = await fetch('/api/calendar/sync-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId,
                    scheduledAt: dateTime.toISOString()
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to sync task to calendar')
            }

            const data = await response.json()

            // 成功フィードバック
            const timeStr = dateTime.toLocaleString('ja-JP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            alert(`✅ カレンダーに追加しました\n${timeStr} に予定を追加しました`)

            // ページをリロードして最新のタスク状態を反映
            window.location.reload()

        } catch (error) {
            console.error('Failed to sync task:', error)
            alert(`❌ エラー\nカレンダーへの追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
        }
    }, [])

    return (
        <div className="h-full flex flex-col bg-card border-l relative">
            {/* 1. Google Calendar Section */}
            <div className={`flex flex-col border-b transition-all duration-300 ${isAiPanelOpen ? 'h-[60%]' : 'h-full'}`}>
                <div className="flex flex-col border-b bg-muted/5">
                    <div className="h-14 flex items-center justify-between px-4">
                        <div className="flex items-center gap-2">
                            <img src="https://www.gstatic.com/calendar/images/dynamiclogo_2020q4/daily_30.ico" alt="Calendar" className="w-5 h-5" />
                            <span className="font-semibold text-sm">Googleカレンダー</span>
                        </div>
                    </div>
                    <CalendarSettings />
                    <div className="border-t">
                        <CalendarSelector
                            onSelectionChange={setSelectedCalendarIds}
                        />
                    </div>
                </div>
                <div className="flex-1 p-2 bg-muted/5 relative overflow-hidden">
                    {/* Calendar Grid with Drag & Drop */}
                    <CalendarWeekView onTaskDrop={handleTaskDrop} />
                </div>
            </div>

            {/* 2. AI Feedback (Advisor) Panel */}
            <div className={`flex flex-col bg-sidebar transition-all duration-300 ${isAiPanelOpen ? 'h-[40%]' : 'h-10'} border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10`}>
                {/* Header (Toggle) */}
                <div
                    className="h-10 flex items-center justify-between px-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <MessageSquare className="w-4 h-4" />
                        AIフィードバック (Advisor)
                    </div>
                    {isAiPanelOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
                </div>

                {/* Content */}
                {isAiPanelOpen && (
                    <div className="flex-1 flex flex-col p-3 gap-3 bg-muted/10">
                        <ScrollArea className="flex-1">
                            <div className="space-y-4 pr-3">
                                {/* AI Message Bubble */}
                                <div className="flex gap-3">
                                    <Avatar className="w-8 h-8 border shadow-sm">
                                        <div className="w-full h-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white">
                                            <Sparkles className="w-4 h-4" />
                                        </div>
                                    </Avatar>
                                    <div className="flex-1 space-y-2">
                                        <div className="bg-card border rounded-lg p-3 text-sm shadow-sm relative">
                                            <div className="font-semibold text-xs text-purple-600 mb-1">火曜午後の予定調整案</div>
                                            <p className="leading-relaxed text-muted-foreground text-xs">
                                                今回は未来な大枠を調整しようとしています。生活のご提案が調整につけて、火曜予定を既読で部下もご視聴いたします。
                                            </p>
                                        </div>
                                        {/* Action Buttons */}
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" className="h-7 text-xs border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700">許可</Button>
                                            <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700">調整</Button>
                                            <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">却下</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="relative">
                            <Input placeholder="Message AI..." className="pr-10 h-9 text-xs" />
                            <Button size="icon" variant="ghost" className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-primary">
                                <Send className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

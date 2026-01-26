"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, MessageSquare, Send, Sparkles } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { CalendarSettings } from "./calendar-settings"
import { CalendarSelector } from "@/components/calendar/calendar-selector"

export function RightSidebar() {
    const [isAiPanelOpen, setIsAiPanelOpen] = useState(true)
    const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([])

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
                    {/* Calendar Grid Mockup */}
                    <div className="w-full h-full grid grid-cols-5 grid-rows-[auto_1fr] bg-background border rounded overflow-hidden">
                        {/* Days Header */}
                        <div className="col-span-5 grid grid-cols-5 border-b py-2 text-center text-xs text-muted-foreground">
                            <span>月<br /><span className="text-lg font-bold text-foreground">25</span></span>
                            <span>火<br /><span className="text-lg font-bold text-foreground">26</span></span>
                            <span>水<br /><span className="text-lg font-bold text-foreground">27</span></span>
                            <span>木<br /><span className="text-lg font-bold text-foreground">28</span></span>
                            <span>金<br /><span className="text-lg font-bold text-foreground">29</span></span>
                        </div>

                        {/* Time Grid */}
                        <div className="col-span-5 relative grid grid-rows-10 divide-y">
                            {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(hour => (
                                <div key={hour} className="relative h-full border-l ml-8 group">
                                    <span className="absolute -left-8 -top-2 text-[10px] text-muted-foreground w-6 text-right block group-first:hidden">
                                        {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
                                    </span>
                                </div>
                            ))}

                            {/* Events */}
                            <div className="absolute top-[30%] left-[20%] w-[18%] h-[15%] rounded bg-purple-500/20 border-l-2 border-purple-500 p-1 text-[9px] text-purple-700 font-medium">
                                火曜MTG
                            </div>
                            <div className="absolute top-[45%] left-[20%] w-[18%] h-[20%] rounded bg-blue-500/20 border-l-2 border-blue-500 p-1 text-[9px] text-blue-700 font-medium">
                                資料作成
                            </div>
                            <div className="absolute top-[35%] left-[40%] w-[18%] h-[10%] rounded bg-purple-500/20 border-l-2 border-purple-500 p-1 text-[9px] text-purple-700 font-medium">
                                火曜午後
                            </div>
                        </div>
                    </div>
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

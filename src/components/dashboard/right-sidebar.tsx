export function RightSidebar() {
    return (
        <div className="h-full flex flex-col bg-card border-l">
            <div className="h-14 flex items-center justify-between px-4 border-b">
                <span className="font-semibold text-sm">Google Calendar</span>
            </div>
            <div className="flex-1 p-2 bg-muted/5">
                {/* Calendar Grid Placeholder */}
                <div className="w-full h-full grid grid-cols-1 grid-rows-[repeat(24,1fr)] bg-background border rounded overflow-hidden relative">
                    {/* Time labels */}
                    <div className="absolute left-0 top-0 bottom-0 w-10 border-r bg-muted/30 text-[10px] text-muted-foreground flex flex-col justify-between py-2 items-center">
                        <span>9 AM</span>
                        <span>12 PM</span>
                        <span>3 PM</span>
                        <span>6 PM</span>
                    </div>

                    {/* Events Stubs */}
                    <div className="ml-10 relative h-full">
                        <div className="absolute top-[20%] left-2 right-2 h-[10%] bg-blue-500/20 border border-blue-500 rounded p-1 text-[10px] text-blue-500">
                            Meeting
                        </div>
                        <div className="absolute top-[40%] left-2 right-2 h-[15%] bg-red-500/20 border border-red-500 rounded p-1 text-[10px] text-red-500">
                            Focus Time
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

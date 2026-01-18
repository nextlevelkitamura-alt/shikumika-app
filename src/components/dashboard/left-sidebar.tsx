import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database } from "@/types/database"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Goal = Database['public']['Tables']['goals']['Row']
type Project = Database['public']['Tables']['projects']['Row']

interface LeftSidebarProps {
    goals: Goal[]
    selectedGoalId: string | null
    onSelectGoal: (id: string) => void
    projects: Project[]
    selectedProjectId: string | null
    onSelectProject: (id: string) => void
}

export function LeftSidebar({
    goals,
    selectedGoalId,
    onSelectGoal,
    projects,
    selectedProjectId,
    onSelectProject
}: LeftSidebarProps) {

    const getPriorityColor = (priority: number) => {
        switch (priority) {
            case 5: return "bg-red-500"
            case 4: return "bg-orange-500"
            case 3: return "bg-yellow-500"
            case 2: return "bg-blue-500"
            default: return "bg-gray-300"
        }
    }

    return (
        <div className="flex flex-col h-full bg-muted/10 border-r">
            {/* Goal Switcher */}
            <div className="p-4 border-b">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Goal (大目標)</label>
                <Select value={selectedGoalId || undefined} onValueChange={onSelectGoal}>
                    <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select a Goal" />
                    </SelectTrigger>
                    <SelectContent>
                        {goals.map(goal => (
                            <SelectItem key={goal.id} value={goal.id}>{goal.title}</SelectItem>
                        ))}
                        {goals.length === 0 && <div className="p-2 text-xs text-muted-foreground">No goals found</div>}
                    </SelectContent>
                </Select>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">Projects ({projects.length})</h3>

                    {projects.map((project) => (
                        <Card
                            key={project.id}
                            className={`cursor-pointer hover:border-primary transition-all duration-200 ${selectedProjectId === project.id ? 'border-primary ring-1 ring-primary' : ''}`}
                            onClick={() => onSelectProject(project.id)}
                        >
                            {/* Keep-style: Purpose at top if exists */}
                            {project.purpose && (
                                <div className="bg-primary/5 text-primary text-[10px] px-3 py-1 border-b rounded-t-lg truncate font-medium">
                                    {project.purpose}
                                </div>
                            )}
                            <CardHeader className="p-3 pb-2 space-y-0">
                                <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="text-sm font-bold leading-tight">{project.title}</CardTitle>
                                    {/* Priority Dot */}
                                    <div
                                        className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(project.priority)}`}
                                        title={`Priority: ${project.priority}`}
                                    />
                                </div>
                            </CardHeader>

                            <div className="px-3 pb-3 pt-1 flex flex-wrap gap-1">
                                {project.category_tag && (
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                        {project.category_tag}
                                    </Badge>
                                )}
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground font-normal">
                                    {project.status.replace('_', ' ')}
                                </Badge>
                            </div>
                        </Card>
                    ))}

                    {projects.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground text-sm">
                            No projects in this goal.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

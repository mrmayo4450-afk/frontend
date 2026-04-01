import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { Target as TargetType } from "@shared/schema";
import { useWS } from "@/lib/websocket";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const statusConfig = {
  active: { label: "Active", icon: TrendingUp, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  missed: { label: "Missed", icon: XCircle, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export default function Targets() {
  const { data: targets, isLoading } = useQuery<TargetType[]>({ queryKey: ["/api/targets/my"] });
  const { lastMessage } = useWS();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (lastMessage?.type === "target_assigned") {
      queryClient.invalidateQueries({ queryKey: ["/api/targets/my"] });
    }
  }, [lastMessage]);

  const activeTargets = targets?.filter(t => t.status === "active") ?? [];
  const completedTargets = targets?.filter(t => t.status === "completed") ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Targets</h1>
        <p className="text-muted-foreground">Track your assigned buying goals and achievements</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary" data-testid="stat-total-targets">{targets?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Targets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400" data-testid="stat-active-targets">{activeTargets.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="stat-completed-targets">{completedTargets.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : targets?.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-lg">
          <Target className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No targets assigned</h3>
          <p className="text-muted-foreground">The admin will assign buying targets to you. Check back later!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {targets?.map(target => {
            const current = parseFloat(target.currentAmount);
            const total = parseFloat(target.targetAmount);
            const percent = Math.min(100, Math.round((current / total) * 100));
            const status = statusConfig[target.status];
            const StatusIcon = status.icon;
            const daysLeft = Math.ceil((new Date(target.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            return (
              <Card key={target.id} data-testid={`card-target-${target.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base" data-testid={`text-target-title-${target.id}`}>{target.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{target.description}</p>
                      </div>
                    </div>
                    <Badge className={`${status.color} flex items-center gap-1 shrink-0`} variant="secondary">
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold" data-testid={`text-target-progress-${target.id}`}>
                        ${current.toFixed(2)} / ${total.toFixed(2)}
                      </span>
                    </div>
                    <Progress value={percent} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{percent}% complete</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {target.status === "active" ? (
                      daysLeft > 0 ? `${daysLeft} days remaining` : "Deadline passed"
                    ) : (
                      `Deadline: ${new Date(target.deadline).toLocaleDateString()}`
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

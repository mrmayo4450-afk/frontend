import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Info, AlertTriangle, Megaphone, Settings } from "lucide-react";
import type { MerchantNotice } from "@shared/schema";

const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
  system: { icon: Settings, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "System" },
  promotion: { icon: Megaphone, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Promotion" },
  warning: { icon: AlertTriangle, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "Warning" },
  info: { icon: Info, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Info" },
};

export default function NoticesPage() {
  const queryClient = useQueryClient();
  const { data: notices, isLoading } = useQuery<MerchantNotice[]>({ queryKey: ["/api/notices/my"] });

  const markSeenMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notices/${id}/seen`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notices/my"] });
    },
  });

  const unreadCount = notices?.filter(n => !n.isSeen).length ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notices</h1>
        <p className="text-muted-foreground">
          {unreadCount > 0 ? `You have ${unreadCount} unread notice${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : notices?.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-lg">
          <Bell className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No notices</h3>
          <p className="text-muted-foreground">You'll see notifications from the platform here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices?.map(notice => {
            const config = typeConfig[notice.type] ?? typeConfig.info;
            const Icon = config.icon;
            return (
              <Card
                key={notice.id}
                className={!notice.isSeen ? "border-primary/30 bg-primary/5" : ""}
                data-testid={`card-notice-${notice.id}`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm" data-testid={`text-notice-title-${notice.id}`}>{notice.title}</p>
                      <Badge className={`text-xs ${config.color}`} variant="secondary">{config.label}</Badge>
                      {!notice.isSeen && <Badge variant="default" className="text-xs">New</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{notice.content}</p>
                    <p className="text-xs text-muted-foreground">{new Date(notice.createdAt).toLocaleString()}</p>
                  </div>
                  {!notice.isSeen && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markSeenMutation.mutate(notice.id)}
                      disabled={markSeenMutation.isPending}
                      data-testid={`button-mark-seen-${notice.id}`}
                    >
                      Mark Read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

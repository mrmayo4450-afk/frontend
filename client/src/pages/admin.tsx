import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, Users, ShoppingBag, Target, Snowflake, Plus, TrendingUp,
  Package, Store, Eye, Truck, BookOpen, Wallet, Bell, Pencil,
  Star, CreditCard, ThumbsUp, Phone, DollarSign, Trash2, Crown, KeyRound, Check, X,
  UserPlus, Users2, ChevronDown, ChevronUp, BarChart3, BoxIcon, Key, ClipboardList, ChevronRight, Settings,
  Download, Upload, Clock,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import type { User, Order, Target as TargetType, Store as StoreType, Product, Withdrawal, MerchantNotice, PasswordResetRequest, RechargeHistory, SiteSettings } from "@shared/schema";

const targetSchema = z.object({
  userId: z.string().min(1, "Select a user"),
  title: z.string().min(2, "Title required"),
  description: z.string().min(5, "Description required"),
  targetAmount: z.coerce.number().min(1, "Amount must be greater than 0"),
  deadline: z.string().min(1, "Deadline required"),
});

type TargetForm = z.infer<typeof targetSchema>;

const adminProductSchema = z.object({
  name: z.string().min(2, "Product name required"),
  details: z.string().optional(),
  description: z.string().min(5, "Description required"),
  detailedDescription: z.string().optional(),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  costPrice: z.coerce.number().min(0, "Cost price cannot be negative"),
  category: z.string().min(1, "Category required"),
  stock: z.coerce.number().min(0, "Stock cannot be negative"),
  imageUrl: z.string().optional(),
  imageWidth: z.preprocess(val => (!val || val === "") ? undefined : Number(val), z.number().min(50).max(2000).optional()),
  imageHeight: z.preprocess(val => (!val || val === "") ? undefined : Number(val), z.number().min(50).max(2000).optional()),
});

type AdminProductForm = z.infer<typeof adminProductSchema>;

type NewBulkItem = {
  productId: string;
  quantity: number;
  profitAmount: number;
};

type BulkOrderItemData = {
  id: string;
  bulkOrderId: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: string;
  profitAmount: string;
  sellingPrice: string;
};

type BulkOrderWithItems = {
  id: string;
  batchSn: string;
  adminId: string;
  storeId: string;
  storeName?: string;
  adminUsername?: string;
  shippingAddress: string;
  status: string;
  note: string;
  totalCost: string;
  totalProfit: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  items: BulkOrderItemData[];
};

function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">{title}</p>
            <p className="text-xl sm:text-3xl font-bold" data-testid={`admin-stat-${title.toLowerCase().replace(/ /g, "-")}`}>{value}</p>
          </div>
          <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type UserActivity = {
  user: any;
  orders: { total: number; pending: number; completed: number };
  withdrawals: { total: number; pending: number; approved: number };
  stores: { total: number; approved: number; pending: number };
  targets: { total: number; active: number; completed: number };
};

function UserActivitySection({ userId }: { userId: string }) {
  const { data: activity, isLoading } = useQuery<UserActivity>({
    queryKey: ["/api/users", userId, "activity"],
  });

  if (isLoading) return <div className="mt-3 border-t pt-3"><Skeleton className="h-20 w-full" /></div>;
  if (!activity) return null;

  return (
    <div className="mt-3 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">Activity Dashboard</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Orders</p>
          <p className="text-sm font-bold" data-testid={`text-activity-orders-${userId}`}>{activity.orders.total}</p>
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span>Pending: {activity.orders.pending}</span>
            <span>Done: {activity.orders.completed}</span>
          </div>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Withdrawals</p>
          <p className="text-sm font-bold" data-testid={`text-activity-withdrawals-${userId}`}>{activity.withdrawals.total}</p>
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span>Pending: {activity.withdrawals.pending}</span>
            <span>Approved: {activity.withdrawals.approved}</span>
          </div>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Stores</p>
          <p className="text-sm font-bold" data-testid={`text-activity-stores-${userId}`}>{activity.stores.total}</p>
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span>Approved: {activity.stores.approved}</span>
            <span>Pending: {activity.stores.pending}</span>
          </div>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Targets</p>
          <p className="text-sm font-bold" data-testid={`text-activity-targets-${userId}`}>{activity.targets.total}</p>
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            <span>Active: {activity.targets.active}</span>
            <span>Done: {activity.targets.completed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [addMerchantOpen, setAddMerchantOpen] = useState(false);
  const [merchantForm, setMerchantForm] = useState({ email: "", username: "", password: "", phone: "", age: "", profession: "" });
  const [changePasswordUserId, setChangePasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [dailyStatsUserId, setDailyStatsUserId] = useState<string | null>(null);
  const [dailyStatsDate, setDailyStatsDate] = useState(new Date().toISOString().split("T")[0]);
  const [dailyStatsPurchases, setDailyStatsPurchases] = useState("");
  const [dailyStatsSales, setDailyStatsSales] = useState("");
  const [dailyStatsProfit, setDailyStatsProfit] = useState("");

  const freezeMutation = useMutation({
    mutationFn: ({ id, isFrozen }: { id: string; isFrozen: boolean }) =>
      apiRequest("PATCH", `/api/users/${id}/freeze`, { isFrozen }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: vars.isFrozen ? "Account frozen" : "Account unfrozen" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Merchant updated" });
      setEditingUser(null);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const addMerchantMutation = useMutation({
    mutationFn: (data: { email: string; username: string; password: string; phone: string; age: number; profession: string }) =>
      apiRequest("POST", "/api/merchants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Merchant added successfully" });
      setAddMerchantOpen(false);
      setMerchantForm({ email: "", username: "", password: "", phone: "", age: "", profession: "" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const removeMerchantMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/merchants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Merchant removed from platform" });
    },
    onError: (err: any) => toast({ title: "Failed to remove merchant", description: err.message, variant: "destructive" }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      apiRequest("PATCH", `/api/users/${userId}/password`, { newPassword }),
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setChangePasswordUserId(null);
      setNewPassword("");
    },
    onError: (err: any) => toast({ title: "Failed to change password", description: err.message, variant: "destructive" }),
  });

  const setDailyStatsMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) =>
      apiRequest("POST", `/api/users/${userId}/daily-stats`, data),
    onSuccess: () => {
      toast({ title: "Daily stats updated" });
      setDailyStatsUserId(null);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  const clients = users?.filter(u => u.role === "client") ?? [];

  return (
    <div className="space-y-3">
      <div className="flex justify-end mb-2">
        <Dialog open={addMerchantOpen} onOpenChange={setAddMerchantOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-merchant">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Merchant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Merchant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input
                  value={merchantForm.email}
                  onChange={e => setMerchantForm({ ...merchantForm, email: e.target.value })}
                  placeholder="merchant@example.com"
                  data-testid="input-merchant-email"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Username</label>
                <Input
                  value={merchantForm.username}
                  onChange={e => setMerchantForm({ ...merchantForm, username: e.target.value })}
                  placeholder="merchant_username"
                  data-testid="input-merchant-username"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Password</label>
                <Input
                  type="password"
                  value={merchantForm.password}
                  onChange={e => setMerchantForm({ ...merchantForm, password: e.target.value })}
                  placeholder="Enter password"
                  data-testid="input-merchant-password"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone (Optional)</label>
                <Input
                  value={merchantForm.phone}
                  onChange={e => setMerchantForm({ ...merchantForm, phone: e.target.value })}
                  placeholder="+1234567890"
                  data-testid="input-merchant-phone"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Age</label>
                  <Input
                    type="number"
                    value={merchantForm.age}
                    onChange={e => setMerchantForm({ ...merchantForm, age: e.target.value })}
                    placeholder="25"
                    data-testid="input-merchant-age"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Profession</label>
                  <Input
                    value={merchantForm.profession}
                    onChange={e => setMerchantForm({ ...merchantForm, profession: e.target.value })}
                    placeholder="Business owner"
                    data-testid="input-merchant-profession"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddMerchantOpen(false)}>Cancel</Button>
              <Button
                onClick={() => addMerchantMutation.mutate({
                  email: merchantForm.email,
                  username: merchantForm.username,
                  password: merchantForm.password,
                  phone: merchantForm.phone,
                  age: parseInt(merchantForm.age) || 0,
                  profession: merchantForm.profession,
                })}
                disabled={addMerchantMutation.isPending || !merchantForm.email || !merchantForm.username || !merchantForm.password}
                data-testid="button-submit-merchant"
              >
                {addMerchantMutation.isPending ? "Adding..." : "Add Merchant"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {clients.map(user => (
        <Card key={user.id} data-testid={`card-user-${user.id}`}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <Avatar className="flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm" data-testid={`text-user-name-${user.id}`}>{user.username}</p>
                    {user.isFrozen && <Badge variant="destructive" className="text-xs">Frozen</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email} • Age {user.age} • {user.profession}</p>
                  <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{user.phone || "N/A"}</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${parseFloat(user.balance ?? "0").toFixed(2)}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />{parseFloat(user.grade ?? "5").toFixed(1)}</span>
                    <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />{user.credit}</span>
                    <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{parseFloat(user.goodRate ?? "100").toFixed(0)}%</span>
                    <span className="flex items-center gap-1"><Crown className="w-3 h-3" />VIP {user.vipLevel || 1}</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />Rating: {parseFloat(user.rating ?? "5").toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExpandedActivity(expandedActivity === user.id ? null : user.id)}
                  data-testid={`button-activity-${user.id}`}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Activity
                  {expandedActivity === user.id ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingUser(user.id);
                    setEditValues({
                      phone: user.phone || "",
                      balance: user.balance || "0",
                      grade: user.grade || "5.0",
                      credit: user.credit || 100,
                      goodRate: user.goodRate || "100.00",
                      vipLevel: user.vipLevel || 1,
                      rating: user.rating || "5.0",
                    });
                  }}
                  data-testid={`button-edit-user-${user.id}`}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setChangePasswordUserId(user.id); setNewPassword(""); }}
                  data-testid={`button-change-password-${user.id}`}
                >
                  <Key className="w-4 h-4 mr-1" />
                  Password
                </Button>
                <Button
                  size="sm"
                  variant={user.isFrozen ? "outline" : "destructive"}
                  onClick={() => freezeMutation.mutate({ id: user.id, isFrozen: !user.isFrozen })}
                  disabled={freezeMutation.isPending}
                  data-testid={`button-freeze-${user.id}`}
                >
                  <Snowflake className="w-4 h-4 mr-1" />
                  {user.isFrozen ? "Unfreeze" : "Freeze"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Remove ${user.username} from the platform?`)) {
                      removeMerchantMutation.mutate(user.id);
                    }
                  }}
                  disabled={removeMerchantMutation.isPending}
                  data-testid={`button-remove-merchant-${user.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDailyStatsUserId(user.id);
                    setDailyStatsDate(new Date().toISOString().split("T")[0]);
                    setDailyStatsPurchases("");
                    setDailyStatsSales("");
                    setDailyStatsProfit("");
                  }}
                  data-testid={`button-set-daily-stats-${user.id}`}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Daily Stats
                </Button>
              </div>
            </div>

            {expandedActivity === user.id && <UserActivitySection userId={user.id} />}

            {editingUser === user.id && (
              <div className="mt-4 border-t pt-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Phone</label>
                    <Input
                      value={editValues.phone}
                      onChange={e => setEditValues({ ...editValues, phone: e.target.value })}
                      className="h-8 text-xs"
                      data-testid={`input-user-phone-${user.id}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Balance ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editValues.balance}
                      onChange={e => setEditValues({ ...editValues, balance: e.target.value })}
                      className="h-8 text-xs"
                      data-testid={`input-user-balance-${user.id}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Grade</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={editValues.grade}
                      onChange={e => setEditValues({ ...editValues, grade: e.target.value })}
                      className="h-8 text-xs"
                      data-testid={`input-user-grade-${user.id}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Credit</label>
                    <Input
                      type="number"
                      value={editValues.credit}
                      onChange={e => setEditValues({ ...editValues, credit: parseInt(e.target.value) || 0 })}
                      className="h-8 text-xs"
                      data-testid={`input-user-credit-${user.id}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Good Rate (%)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={editValues.goodRate}
                      onChange={e => setEditValues({ ...editValues, goodRate: e.target.value })}
                      className="h-8 text-xs"
                      data-testid={`input-user-goodrate-${user.id}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">VIP Level</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={editValues.vipLevel}
                      onChange={e => setEditValues({ ...editValues, vipLevel: parseInt(e.target.value) || 1 })}
                      className="h-8 text-xs"
                      data-testid={`input-user-viplevel-${user.id}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Rating</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={editValues.rating}
                      onChange={e => setEditValues({ ...editValues, rating: e.target.value })}
                      className="h-8 text-xs"
                      data-testid={`input-user-rating-${user.id}`}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: user.id, data: editValues })}
                    disabled={updateMutation.isPending}
                    data-testid={`button-save-user-${user.id}`}
                  >
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {clients.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No clients registered yet</p>
        </div>
      )}

      <Dialog open={!!changePasswordUserId} onOpenChange={(open) => { if (!open) { setChangePasswordUserId(null); setNewPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                data-testid="input-new-password"
              />
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-xs text-destructive mt-1">Password must be at least 6 characters</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setChangePasswordUserId(null); setNewPassword(""); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (changePasswordUserId && newPassword.length >= 6) {
                  changePasswordMutation.mutate({ userId: changePasswordUserId, newPassword });
                }
              }}
              disabled={changePasswordMutation.isPending || newPassword.length < 6}
              data-testid="button-confirm-change-password"
            >
              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dailyStatsUserId} onOpenChange={(open) => { if (!open) setDailyStatsUserId(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Daily Stats</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Date</label>
              <Input type="date" value={dailyStatsDate} onChange={e => setDailyStatsDate(e.target.value)} data-testid="input-daily-stats-date" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Purchases</label>
                <Input type="number" min="0" value={dailyStatsPurchases} onChange={e => setDailyStatsPurchases(e.target.value)} data-testid="input-daily-stats-purchases" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Sales ($)</label>
                <Input type="number" min="0" step="0.01" value={dailyStatsSales} onChange={e => setDailyStatsSales(e.target.value)} data-testid="input-daily-stats-sales" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Profit ($)</label>
                <Input type="number" min="0" step="0.01" value={dailyStatsProfit} onChange={e => setDailyStatsProfit(e.target.value)} data-testid="input-daily-stats-profit" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDailyStatsUserId(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (dailyStatsUserId) {
                  setDailyStatsMutation.mutate({
                    userId: dailyStatsUserId,
                    data: { date: dailyStatsDate, purchases: parseInt(dailyStatsPurchases) || 0, sales: dailyStatsSales, profit: dailyStatsProfit },
                  });
                }
              }}
              disabled={setDailyStatsMutation.isPending}
              data-testid="button-confirm-daily-stats"
            >
              {setDailyStatsMutation.isPending ? "Saving..." : "Save Stats"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrdersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "superadmin";
  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: users } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });
  const [showReadyForDelivery, setShowReadyForDelivery] = useState(false);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/orders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order status updated" });
    },
  });

  const completeDeliveryMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("PATCH", `/api/orders/${id}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Order delivery completed" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const productMap = new Map(products?.map(p => [p.id, p]));
  const userMap = new Map(users?.map(u => [u.id, u]));

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const statusLabels: Record<string, string> = {
    pending: "Awaiting Pickup",
    processing: "In Delivery",
    completed: "Delivered",
    cancelled: "Cancelled",
  };

  const linkedUserIds = new Set(
    users?.filter(u => u.role === "client" && u.referredBy === currentUser?.id).map(u => u.id) ?? []
  );

  const allFilteredOrders = isSuperAdmin
    ? orders
    : orders?.filter(o => linkedUserIds.has(o.buyerId));

  const filteredOrders = showReadyForDelivery
    ? allFilteredOrders?.filter(o => o.status === "processing")
    : allFilteredOrders;

  const processingCount = allFilteredOrders?.filter(o => o.status === "processing").length ?? 0;

  if (isLoading) return <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={showReadyForDelivery ? "default" : "outline"}
          onClick={() => setShowReadyForDelivery(!showReadyForDelivery)}
          data-testid="button-filter-ready-delivery"
        >
          <Truck className="w-4 h-4 mr-1" />
          Ready for Delivery
          {processingCount > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">{processingCount}</Badge>
          )}
        </Button>
        {showReadyForDelivery && (
          <Button size="sm" variant="ghost" onClick={() => setShowReadyForDelivery(false)} data-testid="button-show-all-orders">
            Show All Orders
          </Button>
        )}
      </div>

      {filteredOrders?.map(order => (
        <Card key={order.id} data-testid={`card-admin-order-${order.id}`} className={order.status === "processing" ? "border-blue-300 dark:border-blue-700" : ""}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-medium text-sm truncate">{productMap.get(order.productId)?.name ?? "Product"}</p>
                    {order.orderSn && <span className="text-xs text-muted-foreground font-mono">{order.orderSn}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    By: {userMap.get(order.buyerId)?.username ?? "User"} • ${parseFloat(order.totalPrice).toFixed(2)} • {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                  {order.profit && parseFloat(order.profit) > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400">Profit: ${parseFloat(order.profit).toFixed(2)}</p>
                  )}
                  {order.remark && <p className="text-xs text-muted-foreground italic">Remark: {order.remark}</p>}
                  {order.orderedBy && order.orderedBy !== order.buyerId && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">Admin-ordered • Deliver to: {userMap.get(order.deliverToUserId ?? "")?.username ?? "N/A"}</p>
                  )}
                  {order.deliveryAddress && (
                    <p className="text-xs text-muted-foreground truncate">Address: {order.deliveryAddress}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <Badge className={`text-xs ${statusColors[order.status] ?? ""}`} variant="secondary" data-testid={`badge-order-status-${order.id}`}>{statusLabels[order.status] ?? order.status}</Badge>
                <Select value={order.status} onValueChange={status => statusMutation.mutate({ id: order.id, status })}>
                  <SelectTrigger className="w-28 sm:w-32 h-8 text-xs" data-testid={`select-order-status-${order.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["pending", "processing", "completed", "cancelled"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
                {order.status === "processing" && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => completeDeliveryMutation.mutate(order.id)}
                    disabled={completeDeliveryMutation.isPending}
                    data-testid={`button-complete-delivery-${order.id}`}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Complete Delivery
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {(filteredOrders?.length ?? 0) === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>{showReadyForDelivery ? "No orders ready for delivery" : "No orders yet"}</p>
        </div>
      )}
    </div>
  );
}

function TargetsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: targets, isLoading } = useQuery<TargetType[]>({ queryKey: ["/api/targets"] });
  const { data: users } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });

  const form = useForm<TargetForm>({
    resolver: zodResolver(targetSchema),
    defaultValues: { userId: "", title: "", description: "", targetAmount: "" as any, deadline: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/targets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/targets"] });
      toast({ title: "Target assigned!", description: "The client has been notified." });
      setOpen(false);
      form.reset();
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const clients = users?.filter(u => u.role === "client") ?? [];
  const userMap = new Map(users?.map(u => [u.id, u]));

  const statusConfig = {
    active: { label: "Active", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    missed: { label: "Missed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-assign-target">
              <Plus className="w-4 h-4 mr-2" />
              Assign Target
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Buying Target</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => createMutation.mutate({ ...d, targetAmount: d.targetAmount.toString(), deadline: new Date(d.deadline) }))} className="space-y-4">
                <FormField control={form.control} name="userId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-target-user"><SelectValue placeholder="Select a client" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map(u => <SelectItem key={u.id} value={u.id}>{u.username} ({u.email})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Title</FormLabel>
                    <FormControl><Input placeholder="e.g. Monthly Sales Goal" data-testid="input-target-title" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Describe the target..." data-testid="input-target-desc" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="targetAmount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Amount ($)</FormLabel>
                      <FormControl><Input type="number" step="0.01" placeholder="500.00" data-testid="input-target-amount" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="deadline" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline</FormLabel>
                      <FormControl><Input type="date" data-testid="input-target-deadline" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-target">
                  {createMutation.isPending ? "Assigning..." : "Assign Target"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {targets?.map(target => {
            const current = parseFloat(target.currentAmount);
            const total = parseFloat(target.targetAmount);
            const percent = Math.min(100, Math.round((current / total) * 100));
            const status = statusConfig[target.status];
            const user = userMap.get(target.userId);

            return (
              <Card key={target.id} data-testid={`card-admin-target-${target.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{target.title}</p>
                      <p className="text-xs text-muted-foreground">Assigned to: {user?.username ?? "User"}</p>
                    </div>
                    <Badge className={`${status.color} text-xs shrink-0`} variant="secondary">{status.label}</Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">${current.toFixed(2)} / ${total.toFixed(2)}</span>
                    </div>
                    <Progress value={percent} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {(targets?.length ?? 0) === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No targets assigned yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StoresTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "superadmin";
  const { data: allStores, isLoading } = useQuery<StoreType[]>({ queryKey: ["/api/stores"] });
  const { data: users } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });
  const { data: adminCatalog } = useQuery<Product[]>({ queryKey: ["/api/products/admin-catalog"] });
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [visitorValue, setVisitorValue] = useState("");
  const [ratingValue, setRatingValue] = useState("");
  const [gradeValue, setGradeValue] = useState("");
  const [creditValue, setCreditValue] = useState("");
  const [goodRateValue, setGoodRateValue] = useState("");
  const [vipLevelValue, setVipLevelValue] = useState("");
  const [notesValue, setNotesValue] = useState("");
  const [stockDialogStoreId, setStockDialogStoreId] = useState<string | null>(null);
  const [stockProductId, setStockProductId] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockPrice, setStockPrice] = useState("");

  const stockMutation = useMutation({
    mutationFn: ({ storeId, data }: { storeId: string; data: { productId: string; quantity: number; resellPrice: number } }) =>
      apiRequest("POST", `/api/stores/${storeId}/stock`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin-catalog"] });
      toast({ title: "Store stocked successfully" });
      setStockDialogStoreId(null);
      setStockProductId("");
      setStockQuantity("");
      setStockPrice("");
    },
    onError: (err: any) => toast({ title: "Failed to stock", description: err.message, variant: "destructive" }),
  });

  const userMap = new Map(users?.map(u => [u.id, u]));

  const visitorMutation = useMutation({
    mutationFn: ({ id, visitors, rating, grade, credit, goodRate, vipLevel }: { id: string; visitors: number; rating: string; grade: string; credit: string; goodRate: string; vipLevel: string }) =>
      apiRequest("PATCH", `/api/stores/${id}/visitors`, { visitors, rating, grade, credit, goodRate, vipLevel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Store updated" });
      setEditingStore(null);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const notesMutation = useMutation({
    mutationFn: ({ id, adminNotes }: { id: string; adminNotes: string }) =>
      apiRequest("PATCH", `/api/stores/${id}/notes`, { adminNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      toast({ title: "Notes updated" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", "/api/stores/" + id + "/approve"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      toast({ title: "Store approved" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", "/api/stores/" + id + "/reject"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      toast({ title: "Store rejected" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  const allClientStores = allStores?.filter(s => {
    const owner = userMap.get(s.ownerId);
    return owner?.role === "client";
  }) ?? [];

  const clientStores = isSuperAdmin
    ? allClientStores
    : allClientStores.filter(s => {
        const owner = userMap.get(s.ownerId);
        return owner?.referredBy === currentUser?.id;
      });

  const pendingStores = clientStores.filter(s => !s.isApproved);
  const approvedStores = clientStores.filter(s => s.isApproved);

  return (
    <div className="space-y-3">
      {pendingStores.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold">Pending Approval</h3>
            <Badge variant="secondary" className="text-xs">{pendingStores.length}</Badge>
          </div>
          {pendingStores.map(store => {
            const owner = userMap.get(store.ownerId);
            return (
              <Card key={store.id} data-testid={`card-pending-store-${store.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                        <Store className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" data-testid={`text-pending-store-name-${store.id}`}>{store.name}</p>
                        <p className="text-xs text-muted-foreground">Owner: {owner?.username ?? "Unknown"}</p>
                        {store.nicImageUrl && <img src={store.nicImageUrl} alt="NIC" className="w-full h-32 object-cover rounded-md border mt-2" data-testid={"img-nic-" + store.id} />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => approveMutation.mutate(store.id)}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-store-${store.id}`}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(store.id)}
                        disabled={rejectMutation.isPending}
                        data-testid={`button-reject-store-${store.id}`}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <div className="border-b my-4" />
        </>
      )}
      {approvedStores.map(store => {
        const owner = userMap.get(store.ownerId);
        return (
          <Card key={store.id} data-testid={`card-admin-store-${store.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" data-testid={`text-admin-store-name-${store.id}`}>{store.name}</p>
                  <p className="text-xs text-muted-foreground">Owner: {owner?.username ?? "Unknown"} • {store.category}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid={`text-store-vip-${store.id}`}>VIP {owner?.vipLevel ?? 1}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted" data-testid={`text-store-grade-${store.id}`}>Grade: {parseFloat(owner?.grade ?? "5").toFixed(1)}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted" data-testid={`text-store-credit-${store.id}`}>Credit: {owner?.credit ?? 100}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted" data-testid={`text-store-goodrate-${store.id}`}>Good Rate: {parseFloat(owner?.goodRate ?? "100").toFixed(1)}%</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted" data-testid={`text-store-rating-display-${store.id}`}>Rating: {parseFloat(owner?.rating ?? "5").toFixed(1)}</span>
                  </div>
                  {store.adminNotes && <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Notes: {store.adminNotes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    <span data-testid={`text-visitors-${store.id}`}>{store.visitors}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setStockDialogStoreId(store.id); setStockProductId(""); setStockQuantity(""); setStockPrice(""); }}
                    data-testid={`button-stock-store-${store.id}`}
                  >
                    <BoxIcon className="w-4 h-4 mr-1" />
                    Stock Products
                  </Button>
                  {editingStore !== store.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => { setEditingStore(store.id); setVisitorValue(store.visitors.toString()); setRatingValue(owner?.rating || "5.0"); setGradeValue(owner?.grade || "5.0"); setCreditValue(String(owner?.credit ?? 100)); setGoodRateValue(owner?.goodRate || "100.00"); setVipLevelValue(String(owner?.vipLevel ?? 1)); setNotesValue(store.adminNotes || ""); }}
                      data-testid={`button-edit-visitors-${store.id}`}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
              {editingStore === store.id && (
                <div className="mt-3 border-t pt-3 space-y-3">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground">Visitors</span>
                      <Input type="number" value={visitorValue} onChange={e => setVisitorValue(e.target.value)} className="h-8 text-xs" data-testid={`input-visitors-${store.id}`} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground">Grade</span>
                      <Input type="number" step="0.1" min="0" max="10" value={gradeValue} onChange={e => setGradeValue(e.target.value)} className="h-8 text-xs" data-testid={`input-store-grade-${store.id}`} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground">Credit</span>
                      <Input type="number" min="0" value={creditValue} onChange={e => setCreditValue(e.target.value)} className="h-8 text-xs" data-testid={`input-store-credit-${store.id}`} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground">Good Rate %</span>
                      <Input type="number" step="0.1" min="0" max="100" value={goodRateValue} onChange={e => setGoodRateValue(e.target.value)} className="h-8 text-xs" data-testid={`input-store-goodrate-${store.id}`} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground">VIP Level</span>
                      <Input type="number" min="1" max="10" value={vipLevelValue} onChange={e => setVipLevelValue(e.target.value)} className="h-8 text-xs" data-testid={`input-store-viplevel-${store.id}`} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-muted-foreground">Rating</span>
                      <Input type="number" step="0.1" min="0" max="5" value={ratingValue} onChange={e => setRatingValue(e.target.value)} className="h-8 text-xs" data-testid={`input-store-rating-${store.id}`} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => visitorMutation.mutate({ id: store.id, visitors: parseInt(visitorValue) || 0, rating: ratingValue, grade: gradeValue, credit: creditValue, goodRate: goodRateValue, vipLevel: vipLevelValue })} disabled={visitorMutation.isPending} data-testid={`button-save-visitors-${store.id}`}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingStore(null)}>Cancel</Button>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Admin Notes</label>
                    <div className="flex gap-2">
                      <Textarea
                        value={notesValue}
                        onChange={e => setNotesValue(e.target.value)}
                        className="text-xs h-16"
                        placeholder="Add notes about this store..."
                        data-testid={`input-store-notes-${store.id}`}
                      />
                      <Button
                        size="sm"
                        onClick={() => notesMutation.mutate({ id: store.id, adminNotes: notesValue })}
                        disabled={notesMutation.isPending}
                        data-testid={`button-save-notes-${store.id}`}
                      >
                        Save Notes
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      {approvedStores.length === 0 && pendingStores.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Store className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No client stores yet</p>
        </div>
      )}

      <Dialog open={!!stockDialogStoreId} onOpenChange={(open) => { if (!open) setStockDialogStoreId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Products</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Select Product</label>
              <Select value={stockProductId} onValueChange={setStockProductId}>
                <SelectTrigger data-testid="select-stock-product">
                  <SelectValue placeholder="Choose a product from catalog" />
                </SelectTrigger>
                <SelectContent>
                  {adminCatalog?.filter(p => p.stock > 0).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (${parseFloat(p.price).toFixed(2)} - {p.stock} available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Quantity</label>
              <Input
                type="number"
                min="1"
                value={stockQuantity}
                onChange={e => setStockQuantity(e.target.value)}
                placeholder="Enter quantity"
                data-testid="input-stock-quantity"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Resell Price ($)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={stockPrice}
                onChange={e => setStockPrice(e.target.value)}
                placeholder="Set resell price"
                data-testid="input-stock-price"
              />
            </div>
            {stockProductId && (
              <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                <p className="font-medium">{adminCatalog?.find(p => p.id === stockProductId)?.name}</p>
                <p className="text-muted-foreground">
                  Catalog Price: ${parseFloat(adminCatalog?.find(p => p.id === stockProductId)?.price ?? "0").toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialogStoreId(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!stockDialogStoreId || !stockProductId) return;
                stockMutation.mutate({
                  storeId: stockDialogStoreId,
                  data: {
                    productId: stockProductId,
                    quantity: parseInt(stockQuantity) || 1,
                    resellPrice: parseFloat(stockPrice) || 0,
                  },
                });
              }}
              disabled={stockMutation.isPending || !stockProductId || !stockQuantity || !stockPrice}
              data-testid="button-submit-stock"
            >
              {stockMutation.isPending ? "Stocking..." : "Stock Products"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CatalogTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [createImageUrl, setCreateImageUrl] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [createImages, setCreateImages] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; errors: string[]; imagesAttached?: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [editingRatingValue, setEditingRatingValue] = useState("5.0");
  const { data: adminProducts, isLoading } = useQuery<Product[]>({ queryKey: ["/api/products/admin-catalog"] });
  const { data: adminStore } = useQuery<StoreType>({ queryKey: ["/api/admin/catalog-store"] });

  const form = useForm<AdminProductForm>({
    resolver: zodResolver(adminProductSchema),
    defaultValues: { name: "", details: "", description: "", detailedDescription: "", price: "" as any, costPrice: "" as any, category: "", stock: "" as any, imageUrl: "", imageWidth: undefined, imageHeight: undefined },
  });

  const editForm = useForm<AdminProductForm>({
    resolver: zodResolver(adminProductSchema),
    defaultValues: { name: "", details: "", description: "", detailedDescription: "", price: "" as any, costPrice: "" as any, category: "", stock: "" as any, imageUrl: "", imageWidth: undefined, imageHeight: undefined },
  });

  const handleImageUpload = async (file: File, target: "create" | "edit") => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      if (target === "create") {
        setCreateImageUrl(data.imageUrl);
        form.setValue("imageUrl", data.imageUrl);
      } else {
        setEditImageUrl(data.imageUrl);
        editForm.setValue("imageUrl", data.imageUrl);
      }
      toast({ title: "Image uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGalleryUpload = async (file: File, target: "create" | "edit") => {
    const currentImages = target === "create" ? createImages : editImages;
    if (currentImages.length >= 4) {
      toast({ title: "Maximum 4 gallery images allowed", variant: "destructive" });
      return;
    }
    setUploadingGallery(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      if (target === "create") {
        setCreateImages(prev => [...prev, data.imageUrl]);
      } else {
        setEditImages(prev => [...prev, data.imageUrl]);
      }
      toast({ title: "Gallery image uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingGallery(false);
    }
  };

  const removeGalleryImage = (index: number, target: "create" | "edit") => {
    if (target === "create") {
      setCreateImages(prev => prev.filter((_, i) => i !== index));
    } else {
      setEditImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product added to marketplace!" });
      setOpen(false);
      form.reset();
      setCreateImageUrl("");
      setCreateImages([]);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product updated!" });
      setEditProduct(null);
      setEditImageUrl("");
      setEditImages([]);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/products/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product removed from marketplace" });
    },
    onError: (err: any) => {
      toast({ title: "Cannot delete product", description: err.message, variant: "destructive" });
    },
  });

  const ratingMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: string }) =>
      apiRequest("PATCH", `/api/products/${id}`, { rating }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product rating updated!" });
      setEditingRatingId(null);
    },
    onError: (err: any) => toast({ title: "Failed to update rating", description: err.message, variant: "destructive" }),
  });

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setEditImageUrl(p.imageUrl || "");
    setEditImages(p.images || []);
    editForm.reset({
      name: p.name,
      details: (p as any).details || "",
      description: p.description,
      detailedDescription: p.detailedDescription || "",
      price: parseFloat(p.price),
      costPrice: parseFloat(p.costPrice || "0"),
      category: p.category,
      stock: p.stock,
      imageUrl: p.imageUrl || "",
      imageWidth: p.imageWidth ?? undefined,
      imageHeight: p.imageHeight ?? undefined,
    });
  };

  const categories = ["Electronics", "Audio", "Accessories", "Fashion", "Books", "Home & Garden", "Beauty", "Sports", "Toys", "Other"];

  const ImageUpload = ({ currentUrl, target, testPrefix }: { currentUrl: string; target: "create" | "edit"; testPrefix: string }) => (
    <div>
      <label className="text-sm font-medium mb-1.5 block">Main Product Image</label>
      {currentUrl && (
        <div className="w-full h-32 rounded-lg bg-muted overflow-hidden mb-2">
          <img src={currentUrl} alt="Product" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex gap-2">
        <label className="flex-1">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file, target);
            }}
            data-testid={`input-${testPrefix}-image-file`}
          />
          <Button type="button" variant="outline" className="w-full" disabled={uploadingImage} asChild>
            <span data-testid={`button-${testPrefix}-upload`}>
              {uploadingImage ? "Uploading..." : currentUrl ? "Change Image" : "Upload from Gallery"}
            </span>
          </Button>
        </label>
        {currentUrl && (
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => {
            if (target === "create") { setCreateImageUrl(""); form.setValue("imageUrl", ""); }
            else { setEditImageUrl(""); editForm.setValue("imageUrl", ""); }
          }}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );

  const MultiImageUpload = ({ target: galleryTarget }: { target: "create" | "edit" }) => {
    const imgs = galleryTarget === "create" ? createImages : editImages;
    return (
      <div>
        <label className="text-sm font-medium mb-1.5 block">Gallery Images <span className="text-muted-foreground font-normal">({imgs.length}/4)</span></label>
        {imgs.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-2">
            {imgs.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-md bg-muted overflow-hidden group">
                <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeGalleryImage(i, galleryTarget)}
                  className="absolute top-0.5 right-0.5 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  data-testid={`button-remove-gallery-${galleryTarget}-${i}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {imgs.length < 4 && (
          <label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleGalleryUpload(file, galleryTarget);
                e.target.value = "";
              }}
              data-testid={`input-${galleryTarget}-gallery-file`}
            />
            <Button type="button" variant="outline" size="sm" className="w-full" disabled={uploadingGallery} asChild>
              <span data-testid={`button-${galleryTarget}-add-gallery`}>
                {uploadingGallery ? "Uploading..." : `+ Add Gallery Photo`}
              </span>
            </Button>
          </label>
        )}
      </div>
    );
  };


  const ProductFormFields = ({ formInstance, testPrefix }: { formInstance: any; testPrefix: string }) => (
    <>
      <FormField control={formInstance.control} name="name" render={({ field }: any) => (
        <FormItem>
          <FormLabel>Product Name</FormLabel>
          <FormControl><Input placeholder="e.g. Premium Headset" data-testid={`input-${testPrefix}-name`} {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={formInstance.control} name="details" render={({ field }: any) => (
        <FormItem>
          <FormLabel>Details <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
          <FormControl><Textarea placeholder="Key highlights, bullet points, short specs..." data-testid={`input-${testPrefix}-details`} {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={formInstance.control} name="description" render={({ field }: any) => (
        <FormItem>
          <FormLabel>Description</FormLabel>
          <FormControl><Textarea placeholder="Brief product description..." data-testid={`input-${testPrefix}-desc`} {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={formInstance.control} name="detailedDescription" render={({ field }: any) => (
        <FormItem>
          <FormLabel>Detailed Description <span className="text-muted-foreground font-normal text-xs">(optional)</span></FormLabel>
          <FormControl><Textarea placeholder="Full product details, specifications, features..." rows={5} data-testid={`input-${testPrefix}-detailed-desc`} {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={formInstance.control} name="price" render={({ field }: any) => (
          <FormItem>
            <FormLabel>Selling Price ($)</FormLabel>
            <FormControl><Input type="number" step="0.01" placeholder="29.99" data-testid={`input-${testPrefix}-price`} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={formInstance.control} name="costPrice" render={({ field }: any) => (
          <FormItem>
            <FormLabel>Cost Price ($)</FormLabel>
            <FormControl><Input type="number" step="0.01" placeholder="15.00" data-testid={`input-${testPrefix}-cost`} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField control={formInstance.control} name="stock" render={({ field }: any) => (
          <FormItem>
            <FormLabel>Stock</FormLabel>
            <FormControl><Input type="number" placeholder="100" data-testid={`input-${testPrefix}-stock`} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={formInstance.control} name="category" render={({ field }: any) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid={`select-${testPrefix}-category`}><SelectValue placeholder="Select" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>
    </>
  );

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/admin/products/export", { credentials: "include" });
      if (!res.ok) {
        let msg = "Export failed";
        try { const j = await res.json(); msg = j.message || msg; } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marketnest_export_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCSVImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const response = await fetch("/api/admin/products/import", { method: "POST", body: formData, credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Import failed");
      setImportResult({ created: data.created, errors: data.errors || [], imagesAttached: data.imagesAttached ?? 0 });
      if (data.created > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/products/admin-catalog"] });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
        const imgNote = data.imagesAttached > 0 ? ` • ${data.imagesAttached} image${data.imagesAttached !== 1 ? "s" : ""} attached` : "";
        toast({ title: `${data.created} product${data.created !== 1 ? "s" : ""} imported!${imgNote}`, description: data.errors?.length ? `${data.errors.length} row(s) had issues.` : undefined });
      }
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  if (isLoading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <p className="text-xs sm:text-sm text-muted-foreground">Manage all products on the marketplace. These are visible to all store owners.</p>
        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/products/template" download data-testid="button-download-csv-template">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1.5" />
              CSV Template
            </Button>
          </a>
          <a href="/api/admin/products/template-zip" download data-testid="button-download-zip-template">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1.5" />
              ZIP Template
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            className="border-primary/40 text-primary hover:bg-primary/5"
            onClick={handleExportAll}
            disabled={isExporting}
            data-testid="button-export-all-products"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {isExporting ? "Preparing ZIP…" : "Export All"}
          </Button>
          <Dialog open={importOpen} onOpenChange={o => { setImportOpen(o); if (!o) { setImportFile(null); setImportResult(null); } }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-open-import-csv">
                <Upload className="w-4 h-4 mr-1.5" />
                Import CSV / ZIP
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Import Products</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a <strong>CSV file</strong> for products without images, or a <strong>ZIP file</strong> containing both your CSV and product images. <a href="/api/admin/products/template" download className="text-primary underline">Download the template</a> to get started.
                </p>
                <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">ZIP file format (with images):</p>
                  <p>• Include a <code className="bg-muted px-1 rounded">products.csv</code> with an <code className="bg-muted px-1 rounded">image</code> column</p>
                  <p>• Put all product images in the same ZIP (e.g. <code className="bg-muted px-1 rounded">headphones.jpg</code>)</p>
                  <p>• The <code className="bg-muted px-1 rounded">image</code> column should contain just the filename</p>
                </div>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {importFile ? (
                    <div className="space-y-2">
                      <p className="font-medium text-sm">{importFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                      <Button variant="ghost" size="sm" onClick={() => setImportFile(null)}>Remove</Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input type="file" accept=".csv,.zip,text/csv,application/zip" className="hidden" data-testid="input-import-csv-file"
                        onChange={e => { const f = e.target.files?.[0]; if (f) { setImportFile(f); setImportResult(null); } }} />
                      <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm font-medium">Click to choose a file</p>
                      <p className="text-xs text-muted-foreground mt-1">Supports .csv or .zip (with images)</p>
                    </label>
                  )}
                </div>
                {importResult && (
                  <div className={`rounded-lg p-3 text-sm ${importResult.created > 0 ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : "bg-muted"}`}>
                    <p className="font-medium">{importResult.created} product{importResult.created !== 1 ? "s" : ""} imported successfully</p>
                    {(importResult.imagesAttached ?? 0) > 0 && (
                      <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">{importResult.imagesAttached} image{importResult.imagesAttached !== 1 ? "s" : ""} attached</p>
                    )}
                    {importResult.errors.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{importResult.errors.length} issue(s):</p>
                        {importResult.errors.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
                      </div>
                    )}
                  </div>
                )}
                <Button className="w-full" onClick={handleCSVImport} disabled={!importFile || importing} data-testid="button-submit-import-csv">
                  {importing ? "Importing..." : "Import Products"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-catalog-product" disabled={!adminStore}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Product to Marketplace</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => createMutation.mutate({
                ...d,
                price: d.price.toString(),
                costPrice: d.costPrice.toString(),
                imageUrl: createImageUrl || null,
                images: createImages.length > 0 ? createImages : null,
                imageWidth: d.imageWidth || null,
                imageHeight: d.imageHeight || null,
                storeId: adminStore?.id,
                isAdminProduct: true,
              }))} className="space-y-4">
                <ImageUpload currentUrl={createImageUrl} target="create" testPrefix="catalog" />
                <MultiImageUpload target="create" />
                <ProductFormFields formInstance={form} testPrefix="catalog" />
                <Button type="submit" className="w-full" disabled={createMutation.isPending || uploadingImage || uploadingGallery} data-testid="button-submit-catalog">
                  {createMutation.isPending ? "Adding..." : "Add to Marketplace"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="space-y-3">
        {adminProducts?.map(p => (
          <Card key={p.id} data-testid={`card-catalog-product-${p.id}`}>
            <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-6 h-6 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  Price: ${parseFloat(p.price).toFixed(2)} • Cost: ${parseFloat(p.costPrice ?? "0").toFixed(2)} • Stock: {p.stock} • {p.category}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sales: {p.salesCount} • Clicks: {p.clickCount} • {p.isActive ? "Active" : "Inactive"}
                </p>
                <div className="flex items-center gap-2 mt-1" data-testid={`rating-product-${p.id}`}>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(star => {
                      const rating = parseFloat(p.rating ?? "5");
                      const filled = star <= Math.floor(rating);
                      const half = !filled && star === Math.ceil(rating) && rating % 1 >= 0.25;
                      return (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${filled ? "fill-amber-400 text-amber-400" : half ? "fill-amber-400/50 text-amber-400" : "text-muted-foreground/30"}`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs text-muted-foreground">{parseFloat(p.rating ?? "5").toFixed(1)}</span>
                  {editingRatingId === p.id ? (
                    <Select
                      value={editingRatingValue}
                      onValueChange={(val) => {
                        setEditingRatingValue(val);
                        ratingMutation.mutate({ id: p.id, rating: val });
                      }}
                    >
                      <SelectTrigger className="w-20 h-7 text-xs" data-testid={`select-rating-${p.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 11 }, (_, i) => (i * 0.5).toFixed(1)).map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs px-2"
                      onClick={() => { setEditingRatingId(p.id); setEditingRatingValue(parseFloat(p.rating ?? "5").toFixed(1)); }}
                      data-testid={`button-edit-rating-${p.id}`}
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Rating
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(p)}
                  data-testid={`button-edit-catalog-${p.id}`}
                >
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(p.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-catalog-${p.id}`}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(adminProducts?.length ?? 0) === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No products on the marketplace yet. Add products for store owners to buy.</p>
          </div>
        )}
      </div>

      <Dialog open={!!editProduct} onOpenChange={(open) => { if (!open) setEditProduct(null); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(d => updateMutation.mutate({
                  id: editProduct.id,
                  data: {
                    name: d.name,
                    details: (d as any).details || null,
                    description: d.description,
                    detailedDescription: d.detailedDescription || null,
                    price: d.price.toString(),
                    costPrice: d.costPrice.toString(),
                    stock: d.stock,
                    category: d.category,
                    imageUrl: editImageUrl || null,
                    images: editImages.length > 0 ? editImages : null,
                    imageWidth: d.imageWidth || null,
                    imageHeight: d.imageHeight || null,
                  },
                }))} className="space-y-4">
                  <ImageUpload currentUrl={editImageUrl} target="edit" testPrefix="edit-catalog" />
                  <MultiImageUpload target="edit" />
                  <ProductFormFields formInstance={editForm} testPrefix="edit-catalog" />
                  <Button type="submit" className="w-full" disabled={updateMutation.isPending || uploadingImage || uploadingGallery} data-testid="button-submit-edit-catalog">
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminOrderTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "superadmin";

  // Create form state
  const [open, setOpen] = useState(false);
  const [storeId, setStoreId] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<NewBulkItem[]>([{ productId: "", quantity: 1, profitAmount: 0 }]);

  // List state
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [editProfit, setEditProfit] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editShipping, setEditShipping] = useState("");
  const [extendOrderId, setExtendOrderId] = useState<string | null>(null);
  const [extendHours, setExtendHours] = useState("24");

  const { data: allProducts } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: allStores } = useQuery<StoreType[]>({ queryKey: ["/api/stores"] });
  const { data: users } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });
  const { data: bulkOrdersData, isLoading } = useQuery<BulkOrderWithItems[]>({ queryKey: ["/api/admin/bulk-orders"] });

  const clientStores = allStores?.filter(s => {
    const owner = users?.find(u => u.id === s.ownerId);
    return owner?.role === "client";
  }) ?? [];

  // Products in selected store
  const storeProducts = storeId ? allProducts?.filter(p => p.storeId === storeId) ?? [] : [];

  // Item management
  const addItem = () => setItems([...items, { productId: "", quantity: 1, profitAmount: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof NewBulkItem, value: any) => {
    const updated = [...items]; updated[i] = { ...updated[i], [field]: value }; setItems(updated);
  };

  const totalFormCost = items.reduce((sum, item) => {
    const p = allProducts?.find(p => p.id === item.productId);
    return sum + (p ? parseFloat(p.price) * item.quantity : 0);
  }, 0);
  const totalFormProfit = items.reduce((sum, item) => sum + item.profitAmount * item.quantity, 0);

  // Filtering
  const allStatuses = ["all", "pending", "accepted", "declined", "expired", "completed"];
  const filtered = statusFilter === "all" ? bulkOrdersData : bulkOrdersData?.filter(o => o.status === statusFilter);
  const statusCounts: Record<string, number> = { all: bulkOrdersData?.length ?? 0 };
  for (const s of ["pending", "accepted", "declined", "expired", "completed"]) {
    statusCounts[s] = bulkOrdersData?.filter(o => o.status === s).length ?? 0;
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    accepted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    declined: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/bulk-orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bulk-orders"] });
      toast({ title: "Bulk order created!" });
      setOpen(false);
      setStoreId(""); setShippingAddress(""); setNote("");
      setItems([{ productId: "", quantity: 1, profitAmount: 0 }]);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/bulk-orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bulk-orders"] });
      toast({ title: "Bulk order updated" });
      setEditOrderId(null);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!storeId) return toast({ title: "Select a target store", variant: "destructive" });
    if (!shippingAddress || shippingAddress.length < 5) return toast({ title: "Enter a shipping address", variant: "destructive" });
    const validItems = items.filter(i => i.productId && i.quantity > 0);
    if (validItems.length === 0) return toast({ title: "Add at least one item", variant: "destructive" });
    createMutation.mutate({ storeId, shippingAddress, note, items: validItems });
  };

  const openEdit = (bo: BulkOrderWithItems) => {
    setEditOrderId(bo.id);
    setEditProfit(bo.totalProfit);
    setEditStatus(bo.status);
    setEditNote(bo.note ?? "");
    setEditShipping(bo.shippingAddress ?? "");
  };

  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const getCountdown = (expiresAt: string) => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m left`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">Create and manage bulk orders for merchant stores. Merchants have 24 hours to accept.</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-admin-order">
              <Truck className="w-4 h-4 mr-2" /> Create Bulk Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Bulk Order</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Target Store *</label>
                <Select value={storeId} onValueChange={v => { setStoreId(v); setItems([{ productId: "", quantity: 1, profitAmount: 0 }]); }}>
                  <SelectTrigger className="mt-1" data-testid="select-admin-order-store">
                    <SelectValue placeholder="Select merchant store" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientStores.map(s => {
                      const owner = users?.find(u => u.id === s.ownerId);
                      return <SelectItem key={s.id} value={s.id}>{s.name} ({owner?.username})</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                {storeId && <p className="text-xs text-muted-foreground mt-1">{storeProducts.length} products available in this store</p>}
              </div>

              <div>
                <label className="text-sm font-medium">Shipping Address *</label>
                <Textarea placeholder="Enter shipping address..." value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} className="mt-1" data-testid="input-admin-order-address" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Items ({items.length})</label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={!storeId} data-testid="button-add-item">
                    <Plus className="w-4 h-4 mr-1" /> Add Item
                  </Button>
                </div>
                {!storeId && <p className="text-xs text-muted-foreground mb-2">Select a store first to add items</p>}
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const selectedProduct = allProducts?.find(p => p.id === item.productId);
                    const costPrice = selectedProduct ? parseFloat(selectedProduct.price) : 0;
                    return (
                      <div key={index} className="border rounded-lg p-3 space-y-2" data-testid={`bulk-item-${index}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
                          {items.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(index)} data-testid={`button-remove-item-${index}`}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <Select value={item.productId} onValueChange={v => updateItem(index, "productId", v)}>
                          <SelectTrigger data-testid={`select-bulk-product-${index}`}>
                            <SelectValue placeholder="Select product from store" />
                          </SelectTrigger>
                          <SelectContent>
                            {storeProducts.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} — Price: ${parseFloat(p.price).toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground">Cost Price</label>
                            <Input value={selectedProduct ? `$${costPrice.toFixed(2)}` : "—"} readOnly className="bg-muted/50 text-muted-foreground" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Quantity</label>
                            <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, "quantity", parseInt(e.target.value) || 1)} data-testid={`input-bulk-qty-${index}`} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Profit / unit</label>
                            <Input type="number" step="0.01" min="0" value={item.profitAmount || ""} onChange={e => updateItem(index, "profitAmount", parseFloat(e.target.value) || 0)} data-testid={`input-bulk-profit-${index}`} />
                          </div>
                        </div>
                        {selectedProduct && (
                          <div className="flex justify-between text-xs bg-muted/50 rounded p-2">
                            <span className="text-muted-foreground">Total cost: ${(costPrice * item.quantity).toFixed(2)}</span>
                            <span className="text-green-500 font-medium">Profit: +${(item.profitAmount * item.quantity).toFixed(2)}</span>
                            <span className="font-medium">Sell: ${((costPrice + item.profitAmount) * item.quantity).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total Cost (merchant pays)</span><span className="font-medium">${totalFormCost.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Profit</span><span className="font-medium text-green-500">+${totalFormProfit.toFixed(2)}</span></div>
                <div className="flex justify-between border-t pt-1"><span className="text-muted-foreground">Total Selling Price</span><span className="font-bold">${(totalFormCost + totalFormProfit).toFixed(2)}</span></div>
              </div>

              <div>
                <label className="text-sm font-medium">Note (optional)</label>
                <Input placeholder="Add a note for the merchant..." value={note} onChange={e => setNote(e.target.value)} className="mt-1" data-testid="input-admin-order-remark" />
              </div>

              <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-submit-admin-order">
                {createMutation.isPending ? "Creating..." : `Create Bulk Order (${items.filter(i => i.productId).length} items)`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        {allStatuses.map(s => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)} data-testid={`button-delivery-filter-${s}`}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s] ?? 0})
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : !filtered?.length ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No bulk orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(bo => {
            const isExpanded = expandedOrders.has(bo.id);
            const isEditing = editOrderId === bo.id;
            const totalCostNum = parseFloat(bo.totalCost);
            const totalProfitNum = parseFloat(bo.totalProfit);
            return (
              <Card key={bo.id} className={bo.status === "pending" ? "border-amber-300 dark:border-amber-700" : bo.status === "accepted" ? "border-blue-300 dark:border-blue-700" : ""} data-testid={`card-bulk-order-${bo.id}`}>
                <CardContent className="p-0">
                  <button className="w-full p-3 sm:p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(bo.id)} data-testid={`button-expand-bulk-${bo.id}`}>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BoxIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" data-testid={`text-bulk-sn-${bo.id}`}>{bo.batchSn}</span>
                        <Badge variant="secondary" className={`text-xs ${statusColors[bo.status] ?? ""}`} data-testid={`badge-bulk-status-${bo.id}`}>
                          {bo.status.charAt(0).toUpperCase() + bo.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Store: <span className="font-medium text-foreground">{bo.storeName}</span>
                        {" • "}{bo.items.length} item{bo.items.length !== 1 ? "s" : ""}
                        {" • "}{new Date(bo.createdAt).toLocaleDateString()}
                        {bo.status === "pending" && <span className="ml-1 text-amber-600">• {getCountdown(bo.expiresAt)}</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-sm font-bold" data-testid={`text-bulk-cost-${bo.id}`}>${totalCostNum.toFixed(2)}</p>
                      <p className="text-xs text-green-500">+${totalProfitNum.toFixed(2)}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <div className="border-t px-3 sm:px-4 pb-4">
                      <div className="mt-3 space-y-2">
                        {bo.items.map(item => (
                          <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border" data-testid={`row-bulk-item-${item.id}`}>
                            <div className="w-8 h-8 rounded bg-background flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-muted-foreground/50" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                Qty: {item.quantity} • Cost: ${parseFloat(item.costPrice).toFixed(2)} • Profit: +${parseFloat(item.profitAmount).toFixed(2)} • Sell: ${parseFloat(item.sellingPrice).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div><p className="text-muted-foreground">Total Cost</p><p className="font-medium">${totalCostNum.toFixed(2)}</p></div>
                          <div><p className="text-muted-foreground">Total Profit</p><p className="font-bold text-green-500">+${totalProfitNum.toFixed(2)}</p></div>
                          <div><p className="text-muted-foreground">Total Selling</p><p className="font-medium">${(totalCostNum + totalProfitNum).toFixed(2)}</p></div>
                        </div>
                        {bo.shippingAddress && <p className="text-xs text-muted-foreground"><span className="font-medium">Ship to:</span> {bo.shippingAddress}</p>}
                        {bo.note && <p className="text-xs text-muted-foreground italic"><span className="font-medium">Note:</span> {bo.note}</p>}
                        {bo.acceptedAt && <p className="text-xs text-muted-foreground"><span className="font-medium">Accepted:</span> {new Date(bo.acceptedAt).toLocaleString()}</p>}

                        {isEditing ? (
                          <div className="pt-2 space-y-3 border-t mt-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Edit Bulk Order</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-muted-foreground">Total Profit ($)</label>
                                <Input type="number" step="0.01" min="0" value={editProfit} onChange={e => setEditProfit(e.target.value)} className="h-8 text-sm mt-0.5" data-testid={`input-edit-profit-${bo.id}`} />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Status</label>
                                <Select value={editStatus} onValueChange={setEditStatus}>
                                  <SelectTrigger className="h-8 text-sm mt-0.5" data-testid={`select-edit-status-${bo.id}`}><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {["pending", "accepted", "declined", "expired", "completed"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Shipping Address</label>
                              <Input value={editShipping} onChange={e => setEditShipping(e.target.value)} className="h-8 text-sm mt-0.5" placeholder="Shipping address..." data-testid={`input-edit-shipping-${bo.id}`} />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Note (for merchant)</label>
                              <Input value={editNote} onChange={e => setEditNote(e.target.value)} className="h-8 text-sm mt-0.5" placeholder="Optional note..." data-testid={`input-edit-note-${bo.id}`} />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="h-8" onClick={() => updateMutation.mutate({ id: bo.id, data: { totalProfit: editProfit, status: editStatus, shippingAddress: editShipping, note: editNote } })} disabled={updateMutation.isPending} data-testid={`button-save-bulk-${bo.id}`}>
                                <Check className="w-3 h-3 mr-1" /> Save Changes
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditOrderId(null)} data-testid={`button-cancel-edit-${bo.id}`}>
                                <X className="w-3 h-3 mr-1" /> Cancel
                              </Button>
                            </div>
                          </div>
                        ) : extendOrderId === bo.id ? (
                          <div className="pt-2 space-y-2">
                            <label className="text-xs text-muted-foreground font-medium">Extend deadline by (hours)</label>
                            <div className="flex items-center gap-2 flex-wrap">
                              {["24", "48", "72"].map(h => (
                                <Button key={h} size="sm" variant={extendHours === h ? "default" : "outline"} className="h-7 text-xs" onClick={() => setExtendHours(h)} data-testid={`button-extend-preset-${h}-${bo.id}`}>+{h}h</Button>
                              ))}
                              <Input type="number" min="1" step="1" value={extendHours} onChange={e => setExtendHours(e.target.value)} className="h-7 text-xs w-20" placeholder="Hours" data-testid={`input-extend-hours-${bo.id}`} />
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 text-xs" onClick={() => { updateMutation.mutate({ id: bo.id, data: { extendHours: parseFloat(extendHours) } }); setExtendOrderId(null); }} disabled={updateMutation.isPending || !extendHours || parseFloat(extendHours) <= 0} data-testid={`button-save-extend-${bo.id}`}>
                                <Check className="w-3 h-3 mr-1" /> Extend
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExtendOrderId(null)} data-testid={`button-cancel-extend-${bo.id}`}><X className="w-3 h-3" /></Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 pt-1 flex-wrap">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(bo)} data-testid={`button-edit-bulk-${bo.id}`}>
                              <Pencil className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            {(bo.status === "pending" || bo.status === "expired") && (
                              <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20" onClick={() => { setExtendOrderId(bo.id); setExtendHours("24"); }} data-testid={`button-extend-bulk-${bo.id}`}>
                                <Clock className="w-3 h-3 mr-1" /> Extend Timeline
                              </Button>
                            )}
                            {bo.status === "accepted" && (
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => updateMutation.mutate({ id: bo.id, data: { status: "completed" } })} disabled={updateMutation.isPending} data-testid={`button-complete-bulk-${bo.id}`}>
                                <Check className="w-3 h-3 mr-1" /> Mark Completed
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
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

function WithdrawalsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allWithdrawals, isLoading } = useQuery<Withdrawal[]>({ queryKey: ["/api/withdrawals"] });
  const { data: users } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });

  const userMap = new Map(users?.map(u => [u.id, u]));

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/withdrawals/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Withdrawal status updated" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  if (isLoading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-3">
      {allWithdrawals?.map(w => {
        const user = userMap.get(w.userId);
        return (
          <Card key={w.id} data-testid={`card-admin-withdrawal-${w.id}`}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{user?.username ?? "User"}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{w.extractSn}</p>
                    <p className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString()}</p>
                    <p className="text-xs text-blue-500 mt-0.5 truncate">
                      {(w as any).paymentMethod === "trc20" ? "TRC20" : "Bank Transfer"}
                      {(w as any).paymentMethod === "trc20" && (w as any).trc20Address && (
                        <span className="ml-1 font-mono text-foreground">{(w as any).trc20Address}</span>
                      )}
                      {(w as any).paymentMethod === "bank" && (w as any).bankDetails && (
                        <span className="ml-1 text-foreground">{(w as any).bankDetails}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 flex-wrap">
                <p className="font-bold text-lg" data-testid={`text-admin-withdrawal-amount-${w.id}`}>${parseFloat(w.amount).toFixed(2)}</p>
                <Badge className={`text-xs ${statusColors[w.status] ?? ""}`} variant="secondary">{w.status}</Badge>
                {w.status === "pending" && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-green-600 border-green-300"
                      onClick={() => statusMutation.mutate({ id: w.id, status: "approved" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-approve-withdrawal-${w.id}`}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-red-600 border-red-300"
                      onClick={() => statusMutation.mutate({ id: w.id, status: "rejected" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-reject-withdrawal-${w.id}`}
                    >
                      Reject
                    </Button>
                  </div>
                )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {(allWithdrawals?.length ?? 0) === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No withdrawal requests yet</p>
        </div>
      )}
    </div>
  );
}

function NoticesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: allNotices, isLoading } = useQuery<MerchantNotice[]>({ queryKey: ["/api/notices"] });
  const { data: users } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });

  const clients = users?.filter(u => u.role === "client") ?? [];
  const userMap = new Map(users?.map(u => [u.id, u]));

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [noticeType, setNoticeType] = useState("system");
  const [targetUserId, setTargetUserId] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/notices", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notices"] });
      toast({ title: "Notice sent" });
      setOpen(false);
      setTitle("");
      setContent("");
      setNoticeType("system");
      setTargetUserId("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-send-notice">
              <Plus className="w-4 h-4 mr-2" />
              Send Notice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Send Notice to Merchant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Recipient</label>
                <Select value={targetUserId} onValueChange={setTargetUserId}>
                  <SelectTrigger data-testid="select-notice-user">
                    <SelectValue placeholder="Select merchant" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(u => <SelectItem key={u.id} value={u.id}>{u.username} ({u.email})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Type</label>
                <Select value={noticeType} onValueChange={setNoticeType}>
                  <SelectTrigger data-testid="select-notice-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Notice title"
                  data-testid="input-notice-title"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Content</label>
                <Textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Notice content..."
                  data-testid="input-notice-content"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({ userId: targetUserId || null, type: noticeType, title, content })}
                disabled={createMutation.isPending || !title}
                data-testid="button-submit-notice"
              >
                {createMutation.isPending ? "Sending..." : "Send Notice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {allNotices?.map(n => {
          const user = userMap.get(n.userId ?? "");
          return (
            <Card key={n.id} data-testid={`card-admin-notice-${n.id}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-sm">{n.title}</p>
                    <Badge variant="secondary" className="text-xs">{n.type}</Badge>
                    {n.isSeen && <Badge variant="outline" className="text-xs text-green-600">Seen</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    To: {user?.username ?? "All"} • {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(allNotices?.length ?? 0) === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No notices sent yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResetsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: resets, isLoading } = useQuery<PasswordResetRequest[]>({ queryKey: ["/api/password-resets"] });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/password-resets/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/password-resets"] });
      toast({ title: "Password reset approved" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/password-resets/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/password-resets"] });
      toast({ title: "Password reset rejected" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="space-y-3">
      {resets?.map(request => (
        <Card key={request.id} data-testid={`card-reset-${request.id}`}>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="font-medium text-sm" data-testid={`text-reset-email-${request.id}`}>{request.email}</p>
                    <Badge className={`text-xs ${statusColors[request.status] ?? ""}`} variant="secondary" data-testid={`badge-reset-status-${request.id}`}>{request.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3 inline" />{request.phone}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(request.createdAt).toLocaleString()}</p>
                  {request.nicImageUrl && (
                    <img src={request.nicImageUrl} alt="NIC" className="w-full h-32 object-cover rounded-md border mt-2" data-testid={`img-reset-nic-${request.id}`} />
                  )}
                </div>
              </div>
              {request.status === "pending" && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => approveMutation.mutate(request.id)}
                    disabled={approveMutation.isPending}
                    data-testid={`button-approve-reset-${request.id}`}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(request.id)}
                    disabled={rejectMutation.isPending}
                    data-testid={`button-reject-reset-${request.id}`}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      {(resets?.length ?? 0) === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <KeyRound className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No password reset requests</p>
        </div>
      )}
    </div>
  );
}

function AdminsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addSuperOpen, setAddSuperOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [superEmail, setSuperEmail] = useState("");
  const [superUsername, setSuperUsername] = useState("");
  const [superPassword, setSuperPassword] = useState("");
  const [superPhone, setSuperPhone] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);

  const { data: admins, isLoading } = useQuery<(Omit<User, "password"> & { customerCount: number })[]>({ queryKey: ["/api/admins"] });
  const { data: allUsers } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });
  const superAdmins = allUsers?.filter(u => u.role === "superadmin") ?? [];
  const { data: customers, isLoading: customersLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/admins", selectedAdmin, "customers"],
    enabled: !!selectedAdmin,
  });

  const addMutation = useMutation({
    mutationFn: (data: { email: string; username: string; password: string; phone: string }) =>
      apiRequest("POST", "/api/admins", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
      toast({ title: "Admin added successfully" });
      setAddOpen(false);
      setEmail(""); setUsername(""); setPassword(""); setPhone("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const addSuperMutation = useMutation({
    mutationFn: (data: { email: string; username: string; password: string; phone: string }) =>
      apiRequest("POST", "/api/superadmins", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Super Admin added successfully" });
      setAddSuperOpen(false);
      setSuperEmail(""); setSuperUsername(""); setSuperPassword(""); setSuperPhone("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admins/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admins"] });
      toast({ title: "Admin removed" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-8">
      {/* Super Admins Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" />Super Admins</h3>
            <p className="text-xs text-muted-foreground">Full platform control</p>
          </div>
          <Dialog open={addSuperOpen} onOpenChange={setAddSuperOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" data-testid="button-add-superadmin">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Super Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Super Admin</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <Input value={superEmail} onChange={e => setSuperEmail(e.target.value)} placeholder="superadmin@example.com" data-testid="input-superadmin-email" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Username</label>
                  <Input value={superUsername} onChange={e => setSuperUsername(e.target.value)} placeholder="superadmin_username" data-testid="input-superadmin-username" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Password</label>
                  <Input type="password" value={superPassword} onChange={e => setSuperPassword(e.target.value)} placeholder="Enter password" data-testid="input-superadmin-password" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Phone</label>
                  <Input value={superPhone} onChange={e => setSuperPhone(e.target.value)} placeholder="+1234567890" data-testid="input-superadmin-phone" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddSuperOpen(false)}>Cancel</Button>
                <Button onClick={() => addSuperMutation.mutate({ email: superEmail, username: superUsername, password: superPassword, phone: superPhone })} disabled={addSuperMutation.isPending || !superEmail || !superUsername || !superPassword} data-testid="button-submit-superadmin">
                  {addSuperMutation.isPending ? "Adding..." : "Add Super Admin"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-3">
          {superAdmins.map(sa => (
            <Card key={sa.id} data-testid={`card-superadmin-${sa.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="flex-shrink-0">
                    <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold">
                      {sa.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{sa.username}</p>
                      <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100"><Crown className="w-2.5 h-2.5 mr-1" />Super Admin</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{sa.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Local Admins Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Local Admins</h3>
            <p className="text-xs text-muted-foreground">Manage their assigned customers</p>
          </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-admin">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  data-testid="input-admin-email"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Username</label>
                <Input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin_username"
                  data-testid="input-admin-username"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  data-testid="input-admin-password"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Phone</label>
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  data-testid="input-admin-phone"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                onClick={() => addMutation.mutate({ email, username, password, phone })}
                disabled={addMutation.isPending || !email || !username || !password}
                data-testid="button-submit-admin"
              >
                {addMutation.isPending ? "Adding..." : "Add Admin"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {admins?.map(admin => (
          <Card key={admin.id} data-testid={`card-admin-${admin.id}`}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="flex-shrink-0">
                    <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold">
                      {admin.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{admin.username}</p>
                      <Badge variant="secondary" className="text-xs">{admin.customerCount} customers</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                    {admin.referenceCode && (
                      <p className="text-xs mt-0.5">
                        Ref: <span className="font-mono text-amber-600 dark:text-amber-400 font-medium" data-testid={`text-ref-code-${admin.id}`}>{admin.referenceCode}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedAdmin(admin.id)}
                    data-testid={`button-view-customers-${admin.id}`}
                  >
                    <Users2 className="w-4 h-4 mr-1" />
                    View Customers
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeMutation.mutate(admin.id)}
                    disabled={removeMutation.isPending}
                    data-testid={`button-remove-admin-${admin.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {(admins?.length ?? 0) === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No admins registered yet</p>
          </div>
        )}
      </div>

      {selectedAdmin && (
        <div className="mt-6">
          <div className="flex items-center gap-3 mb-4">
            <Button size="sm" variant="outline" onClick={() => setSelectedAdmin(null)}>
              Back
            </Button>
            <h3 className="text-sm font-semibold">Customers for {admins?.find(a => a.id === selectedAdmin)?.username}</h3>
          </div>
          {customersLoading ? (
            <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <div className="space-y-3">
              {customers?.map(customer => (
                <Card key={customer.id} data-testid={`card-customer-${customer.id}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {customer.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{customer.username}</p>
                      <p className="text-xs text-muted-foreground">{customer.email}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-medium">${parseFloat(customer.balance ?? "0").toFixed(2)}</span>
                      <Badge variant="secondary" className="text-xs">VIP {customer.vipLevel || 1}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(customers?.length ?? 0) === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No customers linked to this admin</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
}

function BackupTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isTriggeringSupabase, setIsTriggeringSupabase] = useState(false);

  const { data: backupInfo, isLoading, refetch: refetchInfo } = useQuery<any>({
    queryKey: ["/api/admin/backup-info"],
  });

  const { data: supabaseBackupInfo, isLoading: isLoadingSupabase, refetch: refetchSupabase } = useQuery<any>({
    queryKey: ["/api/admin/supabase-backup/info"],
    refetchInterval: 30000,
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleTriggerSupabaseBackup = async () => {
    setIsTriggeringSupabase(true);
    try {
      const res = await fetch("/api/admin/supabase-backup/trigger", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Trigger failed");
      toast({ title: "Supabase Backup Scheduled", description: "Metadata snapshot + image snapshot are being saved to Supabase. This may take up to 20 seconds." });
      setTimeout(() => { refetchSupabase(); setIsTriggeringSupabase(false); }, 20000);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
      setIsTriggeringSupabase(false);
    }
  };

  const handleDownloadSupabaseBackup = async (label: "current" | "previous" | "images") => {
    try {
      const res = await fetch(`/api/admin/supabase-backup/download/${label}`, { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marketnest_supabase_${label}_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Download Started", description: `Supabase ${label} backup ZIP downloaded.` });
    } catch (err: any) {
      toast({ title: "Download Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch("/api/admin/backup/download", { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marketnest_backup_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup Downloaded", description: "Your backup ZIP has been saved. Keep it somewhere safe." });
      refetchInfo();
    } catch (err: any) {
      toast({ title: "Download Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRestoreFromFile = async () => {
    if (!restoreFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("backup", restoreFile);
      const res = await fetch("/api/admin/backup/restore-file", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Restore failed");
      setConfirmRestoreOpen(false);
      setRestoreFile(null);
      toast({ title: "Restore Successful", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/backup-info"] });
    } catch (err: any) {
      toast({ title: "Restore Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BoxIcon className="w-5 h-5 text-primary" />
          Backup & Restore
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Download a full backup of all your data anytime. If something goes wrong, upload that file to restore everything instantly.
        </p>
      </div>

      {/* Download Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            Download Data Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Downloads a fast snapshot of all records — users, stores, products, orders, messages, and more — as a <code className="bg-muted px-1 rounded text-xs">.zip</code> file containing <code className="bg-muted px-1 rounded text-xs">backup.json</code>. <strong>Product images are not included here</strong> to keep the file small and the download instant. Download the <em>Supabase images backup</em> below for images.
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : backupInfo?.exists ? (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              Last backup: <strong>{new Date(backupInfo.timestamp).toLocaleString()}</strong> &mdash; {formatSize(backupInfo.fileSize)}
              {backupInfo.hasImages && <span className="ml-1 text-green-600 dark:text-green-400 font-medium">· includes {backupInfo.counts?.productImages} images</span>}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              No backup on file yet — click below to create your first one.
            </div>
          )}
          <Button onClick={handleDownloadBackup} disabled={isDownloading} data-testid="button-download-backup">
            <Download className="w-4 h-4 mr-2" />
            {isDownloading ? "Creating Backup…" : "Download Data Backup"}
          </Button>
        </CardContent>
      </Card>

      {/* Restore from File */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <BoxIcon className="w-4 h-4" />
            Restore from Backup File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a <code className="bg-muted px-1 rounded text-xs">.zip</code> backup file you downloaded previously. All records will be merged back in — missing data is added, existing data is kept. Safe to run after a fresh deployment.
          </p>
          <div className="flex items-center gap-3">
            <label className="flex-1 cursor-pointer border-2 border-dashed border-muted-foreground/30 rounded-lg px-4 py-3 text-sm text-center hover:border-primary/50 transition-colors" data-testid="label-restore-file">
              <input
                type="file"
                accept=".zip,application/zip,.json,application/json"
                className="sr-only"
                data-testid="input-restore-file"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setRestoreFile(f);
                  if (f) setConfirmRestoreOpen(true);
                }}
              />
              {restoreFile ? (
                <span className="text-foreground font-medium">{restoreFile.name} ({formatSize(restoreFile.size)})</span>
              ) : (
                <span className="text-muted-foreground">Click to select backup .zip file</span>
              )}
            </label>
          </div>

          <Dialog open={confirmRestoreOpen} onOpenChange={(o) => { setConfirmRestoreOpen(o); if (!o) setRestoreFile(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Restore</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                You are about to restore from <strong>{restoreFile?.name}</strong>. All records in the backup will be merged into the database. Existing records are kept; missing ones are re-added. This cannot be undone.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setConfirmRestoreOpen(false); setRestoreFile(null); }}>Cancel</Button>
                <Button
                  onClick={handleRestoreFromFile}
                  disabled={isUploading}
                  data-testid="button-confirm-restore"
                >
                  {isUploading ? "Restoring…" : "Yes, Restore Now"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Supabase Cloud Backup */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Check className="w-4 h-4" />
            Supabase Cloud Backups (Auto)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Three slots kept in Supabase: <strong>current</strong> and <strong>previous</strong> metadata snapshots (updated after every change), and a separate <strong>images</strong> snapshot (updated only when product images are added or removed). Together they make a full, restorable copy of all store data.
          </p>
          {isLoadingSupabase ? (
            <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : !supabaseBackupInfo?.backups?.length ? (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              No Supabase backup yet — click <em>Take Full Snapshot Now</em> to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {(supabaseBackupInfo?.backups || []).map((b: any) => {
                const isImages = b.label === "images";
                const badgeVariant = b.label === "current" ? "default" : "secondary";
                const summaryText = isImages
                  ? `${b.counts?.productImages ?? 0} images`
                  : `${b.counts?.products ?? 0} products · ${b.counts?.orders ?? 0} orders`;
                return (
                  <div key={b.label} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm gap-3 ${isImages ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" : "bg-muted/50"}`} data-testid={`supabase-backup-${b.label}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant={badgeVariant} className={`capitalize text-xs shrink-0 ${isImages ? "bg-green-600 text-white" : ""}`}>{b.label}</Badge>
                      <span className="text-muted-foreground text-xs truncate">{new Date(b.createdAt).toLocaleString()}</span>
                      <span className="text-muted-foreground text-xs shrink-0">{formatSize(b.byteSize)}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                      <span>{summaryText}</span>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleDownloadSupabaseBackup(b.label as "current" | "previous" | "images")} data-testid={`button-download-supabase-${b.label}`}>
                        <Download className="w-3 h-3 mr-1" />Download
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="pt-1 text-xs text-muted-foreground bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 flex items-start gap-2">
            <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
            <span>Product images are protected in <strong>3 places</strong>: Supabase <code className="bg-muted px-0.5 rounded text-xs">product_images</code> table (live), Supabase <em>images</em> backup slot (cloud copy), and the downloadable local backup file (includes all images).</span>
          </div>
          <Button variant="outline" onClick={handleTriggerSupabaseBackup} disabled={isTriggeringSupabase} data-testid="button-trigger-supabase-backup">
            {isTriggeringSupabase ? "Taking Snapshot…" : "Take Full Snapshot Now"}
          </Button>
        </CardContent>
      </Card>

      {/* Latest backup record counts */}
      {!isLoading && backupInfo?.exists && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What's in the Latest Backup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(backupInfo.counts || {}).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between bg-muted/50 rounded px-2 py-1">
                  <span className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <Badge variant="secondary" className="text-xs ml-1" data-testid={`backup-count-${key}`}>{count as number}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info / uptime */}
      <Card>
        <CardContent className="pt-5 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span><strong>Products + Images:</strong> use the <em>Catalog → Export All</em> button to download a ZIP that includes product photos as well.</span>
          </div>
          <div className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span><strong>New domain support</strong> — connect any custom domain in Replit deployment settings. The database and all data remain the same.</span>
          </div>
          <div className="border-t pt-3 mt-3">
            <p className="text-xs font-semibold text-foreground mb-1">Uptime Monitor URL</p>
            <p className="text-xs mb-1">Ping this URL with UptimeRobot to get alerted if the app goes down:</p>
            <code className="block bg-muted rounded px-2 py-1 text-xs break-all" data-testid="health-check-url">{window.location.origin}/api/health</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BulkRecordsSection() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: bulkOrders, isLoading } = useQuery<Order[]>({ queryKey: ["/api/admin/bulk-records"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: allUsers } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });
  const { data: stores } = useQuery<StoreType[]>({ queryKey: ["/api/stores"] });

  const productMap = new Map(products?.map(p => [p.id, p]));
  const userMap = new Map(allUsers?.map(u => [u.id, u]));
  const storeMap = new Map(stores?.map(s => [s.id, s]));

  const filteredOrders = statusFilter === "all" ? bulkOrders : bulkOrders?.filter(o => {
    if (statusFilter === "picked_up") return o.status === "processing" || o.status === "completed";
    if (statusFilter === "refused") return o.status === "cancelled";
    if (statusFilter === "pending") return o.status === "pending";
    return true;
  });

  const statusCounts = {
    all: bulkOrders?.length ?? 0,
    pending: bulkOrders?.filter(o => o.status === "pending").length ?? 0,
    picked_up: bulkOrders?.filter(o => o.status === "processing" || o.status === "completed").length ?? 0,
    refused: bulkOrders?.filter(o => o.status === "cancelled").length ?? 0,
  };

  const pickupStatusLabel = (order: Order) => {
    if (order.status === "cancelled") return "Refused";
    if (order.status === "processing") return "Picked Up";
    if (order.status === "completed") return "Delivered";
    return "Pending";
  };

  const pickupStatusColors: Record<string, string> = {
    "Refused": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    "Picked Up": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Delivered": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    "Pending": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(statusCounts).map(([key, count]) => (
          <Button
            key={key}
            size="sm"
            variant={statusFilter === key ? "default" : "outline"}
            onClick={() => setStatusFilter(key)}
            data-testid={`button-bulk-filter-${key}`}
            className="toggle-elevate"
          >
            {key === "all" ? "All" : key === "picked_up" ? "Picked Up" : key === "refused" ? "Refused" : "Pending"} ({count})
          </Button>
        ))}
      </div>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Assigned By</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pickup Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders?.map(o => {
              const product = productMap.get(o.productId);
              const buyer = userMap.get(o.buyerId);
              const orderedByUser = o.orderedBy ? userMap.get(o.orderedBy) : null;
              const store = storeMap.get(o.storeId);
              const label = pickupStatusLabel(o);
              return (
                <TableRow key={o.id} data-testid={`record-bulk-${o.id}`}>
                  <TableCell className="text-xs font-mono" data-testid={`text-bulk-ordersn-${o.id}`}>{o.orderSn}</TableCell>
                  <TableCell data-testid={`text-bulk-buyer-${o.id}`}>{buyer?.username ?? o.buyerId}</TableCell>
                  <TableCell data-testid={`text-bulk-orderedby-${o.id}`}>{orderedByUser?.username ?? o.orderedBy ?? "-"}</TableCell>
                  <TableCell data-testid={`text-bulk-product-${o.id}`}>{product?.name ?? o.productId}</TableCell>
                  <TableCell className="text-xs" data-testid={`text-bulk-store-${o.id}`}>{store?.name ?? o.storeId}</TableCell>
                  <TableCell data-testid={`text-bulk-qty-${o.id}`}>{o.quantity}</TableCell>
                  <TableCell data-testid={`text-bulk-total-${o.id}`}>${parseFloat(o.totalPrice).toFixed(2)}</TableCell>
                  <TableCell data-testid={`badge-bulk-status-${o.id}`}>
                    <Badge variant="secondary" className={`text-xs ${pickupStatusColors[label] ?? ""}`}>{label}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground" data-testid={`text-bulk-date-${o.id}`}>{new Date(o.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
            {(filteredOrders?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No bulk order records found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RecordsTab() {
  const [recordsSubTab, setRecordsSubTab] = useState("orders");
  return (
    <div>
      <Tabs value={recordsSubTab} onValueChange={setRecordsSubTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="orders" data-testid="tab-records-orders">Orders History</TabsTrigger>
          <TabsTrigger value="bulk" data-testid="tab-records-bulk">Bulk Records</TabsTrigger>
          <TabsTrigger value="recharges" data-testid="tab-records-recharges">Recharge History</TabsTrigger>
          <TabsTrigger value="notices" data-testid="tab-records-notices">Notices History</TabsTrigger>
        </TabsList>
        <TabsContent value="orders"><RecordsOrdersSection /></TabsContent>
        <TabsContent value="bulk"><BulkRecordsSection /></TabsContent>
        <TabsContent value="recharges"><RecordsRechargesSection /></TabsContent>
        <TabsContent value="notices"><RecordsNoticesSection /></TabsContent>
      </Tabs>
    </div>
  );
}

function RecordsOrdersSection() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: users } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });
  const { data: stores } = useQuery<StoreType[]>({ queryKey: ["/api/stores"] });

  const productMap = new Map(products?.map(p => [p.id, p]));
  const userMap = new Map(users?.map(u => [u.id, u]));
  const storeMap = new Map(stores?.map(s => [s.id, s]));

  const filteredOrders = statusFilter === "all" ? orders : orders?.filter(o => o.status === statusFilter);

  const statusCounts = {
    all: orders?.length ?? 0,
    pending: orders?.filter(o => o.status === "pending").length ?? 0,
    processing: orders?.filter(o => o.status === "processing").length ?? 0,
    completed: orders?.filter(o => o.status === "completed").length ?? 0,
    cancelled: orders?.filter(o => o.status === "cancelled").length ?? 0,
  };

  const orderStatusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "pending", "processing", "completed", "cancelled"] as const).map(s => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            onClick={() => setStatusFilter(s)}
            data-testid={`button-filter-records-${s}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <Badge variant="secondary" className="ml-1 text-xs">{statusCounts[s]}</Badge>
          </Button>
        ))}
      </div>
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order SN</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Store</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Ordered By</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders?.map(order => {
              const product = productMap.get(order.productId);
              const store = storeMap.get(order.storeId);
              const orderedByUser = order.orderedBy && order.orderedBy !== order.buyerId ? userMap.get(order.orderedBy) : null;
              return (
              <TableRow key={order.id} data-testid={`record-order-${order.id}`}>
                <TableCell className="font-mono text-xs" data-testid={`text-record-order-sn-${order.id}`}>{order.orderSn}</TableCell>
                <TableCell data-testid={`text-record-order-buyer-${order.id}`}>{userMap.get(order.buyerId)?.username ?? "Unknown"}</TableCell>
                <TableCell className="text-xs" data-testid={`text-record-order-store-${order.id}`}>{store?.name ?? "-"}</TableCell>
                <TableCell data-testid={`text-record-order-product-${order.id}`}>
                  <div className="flex items-center gap-2">
                    {product?.imageUrl && (
                      <img src={product.imageUrl} alt={product.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    )}
                    <span className="text-xs">{product?.name ?? "Product"}</span>
                  </div>
                </TableCell>
                <TableCell data-testid={`text-record-order-amount-${order.id}`}>${parseFloat(order.totalPrice).toFixed(2)}</TableCell>
                <TableCell data-testid={`text-record-order-profit-${order.id}`}>
                  {order.profit && parseFloat(order.profit) !== 0 ? (
                    <span className={parseFloat(order.profit) > 0 ? "text-green-600" : "text-red-600"}>
                      ${parseFloat(order.profit).toFixed(2)}
                    </span>
                  ) : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`text-xs ${orderStatusColors[order.status] ?? ""}`} data-testid={`badge-record-order-status-${order.id}`}>{order.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" data-testid={`text-record-order-address-${order.id}`}>
                  {order.deliveryAddress || "-"}
                </TableCell>
                <TableCell className="text-xs" data-testid={`text-record-order-orderedby-${order.id}`}>
                  {orderedByUser ? <span className="text-blue-600 dark:text-blue-400">{orderedByUser.username} (admin)</span> : "-"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground" data-testid={`text-record-order-date-${order.id}`}>{new Date(order.createdAt).toLocaleString()}</TableCell>
              </TableRow>
              );
            })}
            {(filteredOrders?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No orders found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RecordsRechargesSection() {
  const { data: recharges, isLoading } = useQuery<RechargeHistory[]>({ queryKey: ["/api/admin/recharge-history"] });
  const { data: users } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });
  const userMap = new Map(users?.map(u => [u.id, u]));

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Previous Balance</TableHead>
            <TableHead>New Balance</TableHead>
            <TableHead>Recharged By</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recharges?.map(r => {
            const user = userMap.get(r.userId);
            return (
            <TableRow key={r.id} data-testid={`record-recharge-${r.id}`}>
              <TableCell data-testid={`text-record-recharge-user-${r.id}`}>{user?.username ?? r.userId}</TableCell>
              <TableCell className="text-xs text-muted-foreground" data-testid={`text-record-recharge-email-${r.id}`}>{user?.email ?? "-"}</TableCell>
              <TableCell data-testid={`text-record-recharge-role-${r.id}`}>
                <Badge variant="secondary" className="text-xs">{user?.role ?? "-"}</Badge>
              </TableCell>
              <TableCell data-testid={`text-record-recharge-amount-${r.id}`}>
                <span className={`font-medium ${parseFloat(r.amount) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {parseFloat(r.amount) >= 0 ? "+" : ""}${Math.abs(parseFloat(r.amount)).toFixed(2)}
                </span>
              </TableCell>
              <TableCell data-testid={`text-record-recharge-prev-${r.id}`}>${parseFloat(r.previousBalance).toFixed(2)}</TableCell>
              <TableCell data-testid={`text-record-recharge-new-${r.id}`}>${parseFloat(r.newBalance).toFixed(2)}</TableCell>
              <TableCell data-testid={`text-record-recharge-by-${r.id}`}>{userMap.get(r.rechargedBy)?.username ?? r.rechargedBy}</TableCell>
              <TableCell className="text-xs text-muted-foreground" data-testid={`text-record-recharge-note-${r.id}`}>{r.note || "-"}</TableCell>
              <TableCell className="text-xs text-muted-foreground" data-testid={`text-record-recharge-date-${r.id}`}>{new Date(r.createdAt).toLocaleString()}</TableCell>
            </TableRow>
            );
          })}
          {(recharges?.length ?? 0) === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No recharge history</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function RecordsNoticesSection() {
  const { data: notices, isLoading } = useQuery<MerchantNotice[]>({ queryKey: ["/api/admin/records/notices"] });
  const { data: users } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });
  const { data: stores } = useQuery<StoreType[]>({ queryKey: ["/api/stores"] });
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null);
  const userMap = new Map(users?.map(u => [u.id, u]));
  const storeMap = new Map(stores?.map(s => [s.id, s]));

  const noticeTypeColors: Record<string, string> = {
    system: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    warning: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    info: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    promotion: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recipient</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Store</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Content</TableHead>
            <TableHead>Seen</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notices?.map(n => {
            const recipient = userMap.get(n.userId ?? "");
            const store = n.storeId ? storeMap.get(n.storeId) : null;
            const isExpanded = expandedNotice === n.id;
            return (
            <TableRow key={n.id} data-testid={`record-notice-${n.id}`} className="cursor-pointer" onClick={() => setExpandedNotice(isExpanded ? null : n.id)}>
              <TableCell data-testid={`text-record-notice-recipient-${n.id}`}>{recipient?.username ?? "All"}</TableCell>
              <TableCell className="text-xs text-muted-foreground" data-testid={`text-record-notice-email-${n.id}`}>{recipient?.email ?? "-"}</TableCell>
              <TableCell className="text-xs" data-testid={`text-record-notice-store-${n.id}`}>{store?.name ?? "-"}</TableCell>
              <TableCell>
                <Badge variant="secondary" className={`text-xs ${noticeTypeColors[n.type] ?? ""}`} data-testid={`badge-record-notice-type-${n.id}`}>{n.type}</Badge>
              </TableCell>
              <TableCell data-testid={`text-record-notice-title-${n.id}`}>{n.title}</TableCell>
              <TableCell className={`text-xs text-muted-foreground ${isExpanded ? "" : "max-w-[200px] truncate"}`} data-testid={`text-record-notice-content-${n.id}`}>
                <div className="flex items-center gap-1">
                  <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  <span className={isExpanded ? "" : "truncate"}>{n.content}</span>
                </div>
              </TableCell>
              <TableCell data-testid={`text-record-notice-seen-${n.id}`}>
                {n.isSeen ? <Badge variant="outline" className="text-xs text-green-600">Seen</Badge> : <Badge variant="outline" className="text-xs text-muted-foreground">Unseen</Badge>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground" data-testid={`text-record-notice-date-${n.id}`}>{new Date(n.createdAt).toLocaleString()}</TableCell>
            </TableRow>
            );
          })}
          {(notices?.length ?? 0) === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No notices found</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AdminPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === "superadmin";
  const { data: users } = useQuery<Omit<User, "password">[]>({ queryKey: ["/api/users"] });
  const { data: orders } = useQuery<Order[]>({ queryKey: ["/api/orders"] });
  const { data: stores } = useQuery<StoreType[]>({ queryKey: ["/api/stores"] });
  const { data: targets } = useQuery<TargetType[]>({ queryKey: ["/api/targets"] });
  const { data: allWithdrawals } = useQuery<Withdrawal[]>({ queryKey: ["/api/withdrawals"] });

  const [profileOpen, setProfileOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiRequest("POST", "/api/admin/change-password", data),
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setProfileOpen(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const handleChangePassword = () => {
    if (!currentPw || !newPw) { toast({ title: "All fields required", variant: "destructive" }); return; }
    if (newPw.length < 6) { toast({ title: "New password must be at least 6 characters", variant: "destructive" }); return; }
    if (newPw !== confirmPw) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    changePasswordMutation.mutate({ currentPassword: currentPw, newPassword: newPw });
  };

  const clients = users?.filter(u => u.role === "client") ?? [];
  const totalRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.totalPrice), 0) ?? 0;
  const pendingWithdrawals = allWithdrawals?.filter(w => w.status === "pending").length ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm">Manage merchants, orders, withdrawals, and more</p>
          </div>
        </div>
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-admin-profile">
              <Key className="w-4 h-4 mr-2" />
              Change Password
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Current Password</label>
                <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Current password" data-testid="input-current-password" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">New Password</label>
                <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password (min 6 chars)" data-testid="input-new-password" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Confirm New Password</label>
                <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm new password" data-testid="input-confirm-password" />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setProfileOpen(false)}>Cancel</Button>
              <Button onClick={handleChangePassword} disabled={changePasswordMutation.isPending} data-testid="button-save-password">
                {changePasswordMutation.isPending ? "Saving..." : "Save Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard title="Total Clients" value={clients.length} icon={Users} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard title="Total Orders" value={orders?.length ?? 0} icon={ShoppingBag} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
        <StatCard title="Total Stores" value={stores?.length ?? 0} icon={Store} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" />
        <StatCard title="Total Revenue" value={`$${totalRevenue.toFixed(0)}`} icon={TrendingUp} color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" />
        <StatCard title="Pending W/D" value={pendingWithdrawals} icon={Wallet} color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" />
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-4 sm:mb-6 w-full overflow-x-auto flex flex-nowrap justify-start scrollbar-none">
          <TabsTrigger value="users" data-testid="tab-admin-users">
            <Users className="w-4 h-4 mr-2" />
            Merchants
          </TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-admin-orders">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="targets" data-testid="tab-admin-targets">
            <Target className="w-4 h-4 mr-2" />
            Targets
          </TabsTrigger>
          <TabsTrigger value="stores" data-testid="tab-admin-stores">
            <Store className="w-4 h-4 mr-2" />
            Stores
          </TabsTrigger>
          <TabsTrigger value="catalog" data-testid="tab-admin-catalog">
            <BookOpen className="w-4 h-4 mr-2" />
            Catalog
          </TabsTrigger>
          <TabsTrigger value="delivery" data-testid="tab-admin-delivery">
            <Truck className="w-4 h-4 mr-2" />
            Delivery
          </TabsTrigger>
          <TabsTrigger value="withdrawals" data-testid="tab-admin-withdrawals">
            <Wallet className="w-4 h-4 mr-2" />
            Withdrawals
          </TabsTrigger>
          <TabsTrigger value="notices" data-testid="tab-admin-notices">
            <Bell className="w-4 h-4 mr-2" />
            Notices
          </TabsTrigger>
          <TabsTrigger value="resets" data-testid="tab-admin-resets">
            <KeyRound className="w-4 h-4 mr-2" />
            Resets
          </TabsTrigger>
          <TabsTrigger value="records" data-testid="tab-admin-records">
            <ClipboardList className="w-4 h-4 mr-2" />
            Records
          </TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="admins" data-testid="tab-admin-admins"><Shield className="w-4 h-4 mr-1" />Admins</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="backup" data-testid="tab-admin-backup"><BoxIcon className="w-4 h-4 mr-1" />Backup</TabsTrigger>}
          <TabsTrigger value="settings" data-testid="tab-admin-settings"><Settings className="w-4 h-4 mr-1" />Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="targets"><TargetsTab /></TabsContent>
        <TabsContent value="stores"><StoresTab /></TabsContent>
        <TabsContent value="catalog"><CatalogTab /></TabsContent>
        <TabsContent value="delivery"><AdminOrderTab /></TabsContent>
        <TabsContent value="withdrawals"><WithdrawalsTab /></TabsContent>
        <TabsContent value="notices"><NoticesTab /></TabsContent>
        <TabsContent value="resets"><ResetsTab /></TabsContent>
        <TabsContent value="records"><RecordsTab /></TabsContent>
        {isSuperAdmin && <TabsContent value="admins"><AdminsTab /></TabsContent>}
        {isSuperAdmin && <TabsContent value="backup"><BackupTab /></TabsContent>}
        <TabsContent value="settings"><SiteSettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function SiteSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  const schema = z.object({
    siteName: z.string().min(1, "Site name is required"),
    contactEmail: z.string().email("Enter a valid email"),
    contactPhone: z.string().min(1, "Phone is required"),
    contactAddress: z.string().min(1, "Address is required"),
    contactWhatsapp: z.string().min(1, "WhatsApp is required"),
    contactTelegram: z.string().min(1, "Telegram is required"),
    contactHours: z.string().min(1, "Business hours are required"),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: settings
      ? {
          siteName: settings.siteName,
          contactEmail: settings.contactEmail,
          contactPhone: settings.contactPhone,
          contactAddress: settings.contactAddress,
          contactWhatsapp: settings.contactWhatsapp,
          contactTelegram: settings.contactTelegram,
          contactHours: settings.contactHours,
        }
      : {
          siteName: "",
          contactEmail: "",
          contactPhone: "",
          contactAddress: "",
          contactWhatsapp: "",
          contactTelegram: "",
          contactHours: "",
        },
  });

  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof schema>) =>
      apiRequest("PATCH", "/api/site-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Settings saved", description: "Contact information has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const fields: { name: keyof z.infer<typeof schema>; label: string; placeholder: string }[] = [
    { name: "siteName", label: "Site Name", placeholder: "MarketNest" },
    { name: "contactEmail", label: "Contact Email", placeholder: "support@yourdomain.com" },
    { name: "contactPhone", label: "Contact Phone", placeholder: "+1 (800) 123-4567" },
    { name: "contactAddress", label: "Office Address", placeholder: "123 Commerce Street..." },
    { name: "contactWhatsapp", label: "WhatsApp Number", placeholder: "+1 (800) 123-4567" },
    { name: "contactTelegram", label: "Telegram Handle", placeholder: "@marketnest_support" },
    { name: "contactHours", label: "Business Hours", placeholder: "Monday–Friday, 9:00 AM – 6:00 PM" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Site Settings &amp; Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(({ name, label, placeholder }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={placeholder}
                          data-testid={`input-settings-${name}`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <Button
              type="submit"
              disabled={mutation.isPending}
              data-testid="button-save-settings"
              className="w-full sm:w-auto"
            >
              {mutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  User, ChevronRight, Wallet, Volume2, RotateCcw,
  FileText, BarChart3, Users, LogOut, Crown, Star,
} from "lucide-react";
import type { Order, Withdrawal, Store as StoreType, MerchantNotice } from "@shared/schema";

export default function MyAccount() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [storeId, setStoreId] = useState("");

  const [profileUsername, setProfileUsername] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileProfession, setProfileProfession] = useState("");
  const [profileAge, setProfileAge] = useState<number | string>("");

  const { data: orders } = useQuery<Order[]>({ queryKey: ["/api/orders/my"] });
  const { data: withdrawals } = useQuery<Withdrawal[]>({ queryKey: ["/api/withdrawals/my"] });
  const { data: stores } = useQuery<StoreType[]>({ queryKey: ["/api/stores/my"] });
  const { data: notices } = useQuery<MerchantNotice[]>({ queryKey: ["/api/notices/my"] });
  const { data: bulkOrders } = useQuery<any[]>({ queryKey: ["/api/bulk-orders/my-store"] });

  const withdrawMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/withdrawals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Withdrawal requested", description: "Your withdrawal is pending admin approval." });
      setWithdrawOpen(false);
      setAmount("");
      setStoreId("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const profileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/users/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated", description: "Your personal information has been saved." });
      setPersonalInfoOpen(false);
      setProfilePassword("");
      setProfileConfirmPassword("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const openPersonalInfo = () => {
    setProfileUsername(user?.username ?? "");
    setProfilePhone(user?.phone ?? "");
    setProfileProfession(user?.profession ?? "");
    setProfileAge(user?.age ?? "");
    setProfilePassword("");
    setProfileConfirmPassword("");
    setPersonalInfoOpen(true);
  };

  const handleProfileSave = () => {
    if (profilePassword && profilePassword.length < 6) {
      toast({ title: "Validation Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (profilePassword && profilePassword !== profileConfirmPassword) {
      toast({ title: "Validation Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    const payload: any = {
      username: profileUsername,
      phone: profilePhone,
      profession: profileProfession,
      age: typeof profileAge === "string" ? parseInt(profileAge) : profileAge,
    };
    if (profilePassword) {
      payload.password = profilePassword;
      payload.confirmPassword = profileConfirmPassword;
    }
    profileMutation.mutate(payload);
  };

  const balance = parseFloat(user?.balance ?? "0");
  const pendingAmount = withdrawals?.filter(w => w.status === "pending").reduce((s, w) => s + parseFloat(w.amount), 0) ?? 0;
  const totalIncome = orders?.filter(o => o.status === "completed").reduce((s, o) => s + parseFloat(o.profit || "0"), 0) ?? 0;
  const latestNotice = notices?.find(n => !n.isSeen) ?? notices?.[0];
  const completedBulkOrders = bulkOrders?.filter(bo => bo.status === "completed") ?? [];
  const bulkOrdersProfit = completedBulkOrders.reduce((s, bo) => s + parseFloat(bo.totalProfit || "0"), 0);
  const pendingBulkCount = bulkOrders?.filter(bo => bo.status === "pending").length ?? 0;

  const vipLevel = user?.vipLevel ?? 1;
  const rating = parseFloat(user?.rating ?? "5.0");
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;

  const menuItems = [
    { icon: User, label: "Personal Information", onClick: openPersonalInfo, testId: "menu-personal-info" },
    { icon: RotateCcw, label: "Apply for Refund", onClick: () => setLocation("/withdrawals"), testId: "menu-refund" },
  ];

  const menuItems2 = [
    { icon: FileText, label: "Financial Records", onClick: () => setLocation("/withdrawals"), testId: "menu-financial-records" },
    { icon: BarChart3, label: "Financial Reports", onClick: () => setLocation("/orders"), testId: "menu-financial-reports" },
    { icon: Users, label: "Entrepreneur Alliance", onClick: () => {}, testId: "menu-entrepreneur" },
  ];

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md mx-auto pb-20 md:pb-8">
        <div className="px-4 sm:px-5 pt-4 sm:pt-6 pb-4">
          <div className="flex items-center gap-3 sm:gap-4" data-testid="section-profile-header">
            <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-gray-200 dark:border-gray-700">
              <AvatarFallback className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-bold text-lg sm:text-xl">
                {user?.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base truncate" data-testid="text-profile-email">{user?.email}</p>
              <p className="text-xs sm:text-sm text-muted-foreground" data-testid="text-profile-id">ID: {user?.id?.slice(0, 5)?.toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-5 mb-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-5">
                <p className="font-semibold text-base" data-testid="text-pending-label">Pending Amount:</p>
                <p className="text-2xl font-bold text-rose-500" data-testid="text-pending-amount">${pendingAmount.toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="border rounded-xl p-4" data-testid="section-balance">
                  <p className="text-xs text-muted-foreground mb-1">Balance</p>
                  <p className="text-2xl font-bold" data-testid="text-balance">{balance.toFixed(2)}</p>
                </div>
                <div className="border rounded-xl p-4" data-testid="section-total-income">
                  <p className="text-xs text-muted-foreground mb-1">Total Income</p>
                  <p className="text-2xl font-bold" data-testid="text-total-income">{totalIncome.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="border rounded-xl p-4 relative" data-testid="section-completed-bulk">
                  <p className="text-xs text-muted-foreground mb-1">Completed Bulk Orders</p>
                  <p className="text-2xl font-bold" data-testid="text-completed-bulk-count">{completedBulkOrders.length}</p>
                  {pendingBulkCount > 0 && (
                    <span className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center" data-testid="badge-pending-bulk-account">{pendingBulkCount}</span>
                  )}
                </div>
                <div className="border rounded-xl p-4" data-testid="section-bulk-profit">
                  <p className="text-xs text-muted-foreground mb-1">Bulk Order Profit</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="text-bulk-profit">{bulkOrdersProfit.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-11 rounded-full font-semibold text-sm"
                  onClick={() => setDepositOpen(true)}
                  data-testid="button-deposit"
                >
                  Deposit
                </Button>
                <Button
                  className="h-11 rounded-full font-semibold text-sm bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white border-0"
                  onClick={() => setWithdrawOpen(true)}
                  disabled={balance <= 0}
                  data-testid="button-withdraw"
                >
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="px-4 sm:px-5 mb-4" data-testid="section-vip-rating">
          <Card className="border-0 shadow-sm overflow-visible">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3" data-testid="section-vip-level">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">VIP Level</p>
                    <p className="font-bold text-amber-600 dark:text-amber-400" data-testid="text-vip-level">VIP {vipLevel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3" data-testid="section-star-rating">
                  <div>
                    <p className="text-xs text-muted-foreground text-right">Rating</p>
                    <div className="flex items-center gap-0.5" data-testid="display-star-rating">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < fullStars
                              ? "text-amber-400 fill-amber-400"
                              : i === fullStars && hasHalfStar
                                ? "text-amber-400 fill-amber-400/50"
                                : "text-gray-300 dark:text-gray-600"
                          }`}
                          data-testid={`star-${i}`}
                        />
                      ))}
                      <span className="ml-1 text-sm font-semibold text-muted-foreground" data-testid="text-rating-value">{rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {latestNotice && (
          <div className="px-4 sm:px-5 mb-4">
            <div
              className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg px-3 sm:px-4 py-3 border cursor-pointer min-h-[44px]"
              onClick={() => setLocation("/notices")}
              data-testid="section-announcement"
            >
              <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground truncate" data-testid="text-announcement">
                {latestNotice.title}: {latestNotice.content || "Tap to view details"}
              </p>
            </div>
          </div>
        )}

        <div className="px-4 sm:px-5 mb-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {menuItems.map((item, i) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 min-h-[44px] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${i < menuItems.length - 1 ? "border-b" : ""}`}
                  onClick={item.onClick}
                  data-testid={item.testId}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="px-4 sm:px-5 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {menuItems2.map((item, i) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 min-h-[44px] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${i < menuItems2.length - 1 ? "border-b" : ""}`}
                  onClick={item.onClick}
                  data-testid={item.testId}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="px-4 sm:px-5">
          <Button
            variant="outline"
            className="w-full h-12 rounded-full font-semibold text-sm"
            onClick={logout}
            data-testid="button-account-logout"
          >
            Logout
          </Button>
        </div>
      </div>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>Enter the amount you'd like to withdraw from your balance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold">${balance.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Amount</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                max={balance}
                data-testid="input-withdraw-amount"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">From Store (optional)</label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger data-testid="select-withdraw-store">
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific store</SelectItem>
                  {stores?.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setWithdrawOpen(false)} data-testid="button-cancel-withdraw">Cancel</Button>
            <Button
              onClick={() => withdrawMutation.mutate({ amount: parseFloat(amount), storeId: storeId === "none" ? null : storeId || null })}
              disabled={withdrawMutation.isPending || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
              data-testid="button-submit-withdraw"
            >
              {withdrawMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Deposit</DialogTitle>
            <DialogDescription>Add funds to your account balance.</DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">Please contact admin via live chat to process a deposit to your account.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepositOpen(false)} className="w-full" data-testid="button-close-deposit">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={personalInfoOpen} onOpenChange={setPersonalInfoOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Personal Information</DialogTitle>
            <DialogDescription>Update your profile details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-username">Username</Label>
              <Input
                id="profile-username"
                value={profileUsername}
                onChange={e => setProfileUsername(e.target.value)}
                data-testid="input-profile-username"
              />
            </div>
            <div>
              <Label htmlFor="profile-password">New Password (optional)</Label>
              <Input
                id="profile-password"
                type="password"
                placeholder="Leave blank to keep current"
                value={profilePassword}
                onChange={e => setProfilePassword(e.target.value)}
                data-testid="input-profile-password"
              />
            </div>
            <div>
              <Label htmlFor="profile-confirm-password">Confirm Password</Label>
              <Input
                id="profile-confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={profileConfirmPassword}
                onChange={e => setProfileConfirmPassword(e.target.value)}
                data-testid="input-profile-confirm-password"
              />
            </div>
            <div>
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                value={profilePhone}
                onChange={e => setProfilePhone(e.target.value)}
                data-testid="input-profile-phone"
              />
            </div>
            <div>
              <Label htmlFor="profile-profession">Profession</Label>
              <Input
                id="profile-profession"
                value={profileProfession}
                onChange={e => setProfileProfession(e.target.value)}
                data-testid="input-profile-profession"
              />
            </div>
            <div>
              <Label htmlFor="profile-age">Age</Label>
              <Input
                id="profile-age"
                type="number"
                value={profileAge}
                onChange={e => setProfileAge(e.target.value)}
                data-testid="input-profile-age"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setPersonalInfoOpen(false)} data-testid="button-cancel-profile">Cancel</Button>
            <Button
              onClick={handleProfileSave}
              disabled={profileMutation.isPending}
              data-testid="button-save-profile"
            >
              {profileMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

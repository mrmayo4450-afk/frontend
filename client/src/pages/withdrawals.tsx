import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Wallet, Plus, ArrowDownCircle, Building, Bitcoin } from "lucide-react";
import type { Withdrawal, Store } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function WithdrawalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [storeId, setStoreId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [bankDetails, setBankDetails] = useState("");
  const [trc20Address, setTrc20Address] = useState("");

  const { data: withdrawals, isLoading } = useQuery<Withdrawal[]>({ queryKey: ["/api/withdrawals/my"] });
  const { data: stores } = useQuery<Store[]>({ queryKey: ["/api/stores/my"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/withdrawals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Withdrawal requested", description: "Your withdrawal is pending admin approval." });
      setOpen(false);
      setAmount("");
      setStoreId("");
      setPaymentMethod("bank");
      setBankDetails("");
      setTrc20Address("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const balance = parseFloat(user?.balance ?? "0");
  const totalWithdrawn = withdrawals?.filter(w => w.status === "approved").reduce((s, w) => s + parseFloat(w.amount), 0) ?? 0;
  const pendingAmount = withdrawals?.filter(w => w.status === "pending").reduce((s, w) => s + parseFloat(w.amount), 0) ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Withdrawals</h1>
          <p className="text-muted-foreground">Manage your earnings and withdrawals</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-request-withdrawal" disabled={balance <= 0}>
              <Plus className="w-4 h-4 mr-2" />
              Request Withdrawal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Withdrawal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted rounded-md p-4">
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold" data-testid="text-available-balance">${balance.toFixed(2)}</p>
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
                  data-testid="input-withdrawal-amount"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">From Store (optional)</label>
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger data-testid="select-withdrawal-store">
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
              <div>
                <label className="text-sm font-medium mb-1.5 block">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === "bank" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setPaymentMethod("bank")}
                    data-testid="button-payment-bank"
                  >
                    <Building className="w-4 h-4 mr-2" /> Bank Transfer
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "trc20" ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setPaymentMethod("trc20")}
                    data-testid="button-payment-trc20"
                  >
                    <Bitcoin className="w-4 h-4 mr-2" /> TRC20
                  </Button>
                </div>
              </div>
              {paymentMethod === "bank" && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Bank Details</label>
                  <Textarea
                    placeholder="Enter your bank name, account number, routing number, account holder name..."
                    value={bankDetails}
                    onChange={e => setBankDetails(e.target.value)}
                    rows={3}
                    data-testid="input-bank-details"
                  />
                </div>
              )}
              {paymentMethod === "trc20" && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">TRC20 Wallet Address</label>
                  <Input
                    placeholder="Enter your TRC20 USDT address (e.g. T...)"
                    value={trc20Address}
                    onChange={e => setTrc20Address(e.target.value)}
                    data-testid="input-trc20-address"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate({
                  amount: parseFloat(amount),
                  storeId: storeId === "none" ? null : storeId || null,
                  paymentMethod,
                  bankDetails: paymentMethod === "bank" ? bankDetails : null,
                  trc20Address: paymentMethod === "trc20" ? trc20Address : null,
                })}
                disabled={
                  createMutation.isPending ||
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  parseFloat(amount) > balance ||
                  (paymentMethod === "bank" && !bankDetails.trim()) ||
                  (paymentMethod === "trc20" && !trc20Address.trim())
                }
                data-testid="button-submit-withdrawal"
              >
                {createMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs mb-1">Balance</p>
            <p className="text-2xl font-bold" data-testid="stat-balance">${balance.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs mb-1">Total Withdrawn</p>
            <p className="text-2xl font-bold" data-testid="stat-withdrawn">${totalWithdrawn.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs mb-1">Pending</p>
            <p className="text-2xl font-bold" data-testid="stat-pending">${pendingAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : withdrawals?.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-lg">
          <Wallet className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No withdrawals yet</h3>
          <p className="text-muted-foreground">Request a withdrawal when you have earnings to collect</p>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals?.map(w => (
            <Card key={w.id} data-testid={`card-withdrawal-${w.id}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <ArrowDownCircle className="w-5 h-5 text-muted-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" data-testid={`text-withdrawal-sn-${w.id}`}>{w.extractSn}</p>
                  <p className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(w as any).paymentMethod === "trc20" ? "TRC20" : "Bank Transfer"}
                    {(w as any).paymentMethod === "trc20" && (w as any).trc20Address && (
                      <span className="ml-1 font-mono">{(w as any).trc20Address.slice(0, 10)}...</span>
                    )}
                    {(w as any).paymentMethod === "bank" && (w as any).bankDetails && (
                      <span className="ml-1">{(w as any).bankDetails.slice(0, 30)}...</span>
                    )}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold" data-testid={`text-withdrawal-amount-${w.id}`}>${parseFloat(w.amount).toFixed(2)}</p>
                  <Badge className={`text-xs mt-1 ${statusColors[w.status] ?? ""}`} variant="secondary">
                    {w.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

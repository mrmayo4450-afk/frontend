import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Package, MoreHorizontal, CheckCircle, Wallet, AlertTriangle, X, MessageCircle, Info, ShoppingCart, Truck, CircleDot, ChevronDown, ChevronUp, BoxIcon, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Order, Product, Store, User } from "@shared/schema";

type BulkOrderItemData = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: string;
  profitAmount: string;
  sellingPrice: string;
};

type BulkOrderData = {
  id: string;
  batchSn: string;
  storeId: string;
  storeName?: string;
  shippingAddress: string;
  status: string;
  note: string;
  totalCost: string;
  totalProfit: string;
  expiresAt: string;
  createdAt: string;
  items: BulkOrderItemData[];
};

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Shipment", color: "text-rose-500" },
  processing: { label: "Awaiting Pickup", color: "text-amber-600" },
  completed: { label: "Completed", color: "text-green-600" },
  cancelled: { label: "Cancelled", color: "text-gray-500" },
};

const tabFilters = [
  { value: "all", label: "All orders" },
  { value: "pending", label: "Pending Shipment" },
  { value: "processing", label: "Awaiting Pickup" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function OrderFlowBadges({ status }: { status: string }) {
  const steps = [
    { key: "pending", label: "Pick up & Pay", icon: CircleDot },
    { key: "processing", label: "Awaiting Delivery", icon: Truck },
    { key: "completed", label: "Delivered", icon: CheckCircle },
  ];

  const currentIndex = steps.findIndex(s => s.key === status);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((step, i) => {
        const isActive = step.key === status;
        const isPast = i < currentIndex;
        const StepIcon = step.icon;
        return (
          <Badge
            key={step.key}
            variant={isActive ? "default" : "secondary"}
            className={`text-[10px] px-1.5 py-0 gap-1 ${isPast ? "opacity-50" : ""}`}
            data-testid={`badge-flow-${step.key}`}
          >
            <StepIcon className="w-3 h-3" />
            {step.label}
          </Badge>
        );
      })}
    </div>
  );
}

export default function MyOrders() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [expandedBulk, setExpandedBulk] = useState<Set<string>>(new Set());

  const { data: orders, isLoading } = useQuery<Order[]>({ queryKey: ["/api/orders/my"] });
  const { data: products } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: stores } = useQuery<Store[]>({ queryKey: ["/api/stores"] });
  const { data: currentUser } = useQuery<User>({ queryKey: ["/api/auth/me"] });
  const { data: bulkOrders, isLoading: bulkLoading } = useQuery<BulkOrderData[]>({ queryKey: ["/api/bulk-orders/my-store"] });

  const productMap = new Map(products?.map(p => [p.id, p]));
  const storeMap = new Map(stores?.map(s => [s.id, s]));
  const balance = parseFloat(currentUser?.balance || "0");

  const acceptBulkMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/bulk-orders/${id}/accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-orders/my-store"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Bulk order accepted!", description: "Payment deducted from your balance." });
    },
    onError: (err: any) => toast({ title: "Failed to accept", description: err.message, variant: "destructive" }),
  });

  const declineBulkMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/bulk-orders/${id}/decline`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-orders/my-store"] });
      toast({ title: "Bulk order declined" });
    },
    onError: (err: any) => toast({ title: "Failed to decline", description: err.message, variant: "destructive" }),
  });

  const toggleBulkExpand = (id: string) => {
    setExpandedBulk(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const getCountdown = (expiresAt: string) => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return "Expired";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m remaining`;
  };

  const pendingBulkOrders = bulkOrders?.filter(o => o.status === "pending") ?? [];
  const otherBulkOrders = bulkOrders?.filter(o => o.status !== "pending") ?? [];

  const pickupMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest("PATCH", `/api/orders/${orderId}/pickup`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Order picked up successfully!" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const pickupAllMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/orders/pickup-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "All pending orders picked up!" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (orderId: string) => apiRequest("PATCH", `/api/orders/${orderId}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin-catalog"] });
      toast({ title: "Order removed", description: "The order has been cancelled and stock restored." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const openChat = () => {
    const chatBtn = document.querySelector('[data-testid="button-chat-toggle"]') as HTMLElement;
    if (chatBtn) chatBtn.click();
  };

  const filteredOrders = orders?.filter(o => activeTab === "all" || o.status === activeTab) ?? [];
  const hasPendingOrders = orders?.some(o => o.status === "pending") ?? false;
  const pendingTotalCost = orders?.filter(o => o.status === "pending").reduce((s, o) => s + parseFloat(o.totalPrice || "0"), 0) ?? 0;
  const canPickupAll = balance >= pendingTotalCost && hasPendingOrders;

  return (
    <div className="p-3 sm:p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">My Orders</h1>
        <div className="flex items-center gap-1.5 text-xs sm:text-sm bg-primary/5 dark:bg-primary/10 rounded-full px-3 py-1.5 border border-primary/10">
          <Wallet className="w-3.5 h-3.5 text-primary" />
          <span className="font-bold text-primary" data-testid="text-orders-balance">${balance.toFixed(2)}</span>
          {hasPendingOrders && (
            <span className={`text-[10px] ${pendingTotalCost > balance ? "text-destructive" : "text-muted-foreground"}`}>
              (-${pendingTotalCost.toFixed(2)})
            </span>
          )}
        </div>
      </div>

      {/* Pending Bulk Orders Section */}
      {(bulkLoading || (bulkOrders && bulkOrders.length > 0)) && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <BoxIcon className="w-4 h-4 text-primary" />
            Bulk Orders from Admin
            {pendingBulkOrders.length > 0 && (
              <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 ml-1" data-testid="badge-pending-bulk-count">{pendingBulkOrders.length} pending</Badge>
            )}
          </h2>
          {bulkLoading ? (
            <div className="space-y-2">{Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <div className="space-y-2">
              {pendingBulkOrders.map(bo => {
                const totalCostNum = parseFloat(bo.totalCost);
                const totalProfitNum = parseFloat(bo.totalProfit);
                const canAfford = balance >= totalCostNum;
                const isExpanded = expandedBulk.has(bo.id);
                return (
                  <Card key={bo.id} className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/10" data-testid={`card-pending-bulk-${bo.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                          <Truck className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm" data-testid={`text-pending-bulk-sn-${bo.id}`}>{bo.batchSn}</span>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5 py-0">Awaiting Your Response</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {bo.items.length} item{bo.items.length !== 1 ? "s" : ""} • Total: <span className="font-medium text-foreground">${totalCostNum.toFixed(2)}</span> • Profit: <span className="text-green-600 font-medium">+${totalProfitNum.toFixed(2)}</span>
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                            <Clock className="w-3 h-3" />
                            <span data-testid={`text-bulk-countdown-${bo.id}`}>{getCountdown(bo.expiresAt)}</span>
                          </div>
                          {!canAfford && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Insufficient balance (need ${totalCostNum.toFixed(2)}, have ${balance.toFixed(2)})</span>
                            </div>
                          )}
                        </div>
                        <button className="text-muted-foreground" onClick={() => toggleBulkExpand(bo.id)} data-testid={`button-expand-pending-bulk-${bo.id}`}>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-1.5 border-t pt-2">
                          {bo.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-xs p-2 bg-background rounded border" data-testid={`row-pending-bulk-item-${item.id}`}>
                              <span className="font-medium">{item.productName}</span>
                              <span className="text-muted-foreground">×{item.quantity} • Cost ${parseFloat(item.costPrice).toFixed(2)} • Sell ${parseFloat(item.sellingPrice).toFixed(2)}</span>
                            </div>
                          ))}
                          {bo.shippingAddress && <p className="text-xs text-muted-foreground pt-1"><span className="font-medium">Ship to:</span> {bo.shippingAddress}</p>}
                          {bo.note && <p className="text-xs text-muted-foreground italic"><span className="font-medium">Note:</span> {bo.note}</p>}
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                          disabled={!canAfford || acceptBulkMutation.isPending}
                          onClick={() => acceptBulkMutation.mutate(bo.id)}
                          data-testid={`button-accept-bulk-${bo.id}`}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Accept & Pay ${totalCostNum.toFixed(2)}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {otherBulkOrders.map(bo => {
                const totalCostNum = parseFloat(bo.totalCost);
                const totalProfitNum = parseFloat(bo.totalProfit);
                const statusStyle: Record<string, string> = {
                  accepted: "text-blue-600",
                  declined: "text-red-500",
                  expired: "text-gray-500",
                  completed: "text-green-600",
                };
                return (
                  <Card key={bo.id} className="opacity-80" data-testid={`card-bulk-history-${bo.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <BoxIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{bo.batchSn}</span>
                            <span className={`text-xs font-medium ${statusStyle[bo.status] ?? "text-muted-foreground"}`} data-testid={`text-bulk-history-status-${bo.id}`}>
                              {bo.status.charAt(0).toUpperCase() + bo.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{bo.items.length} items • ${totalCostNum.toFixed(2)} • +${totalProfitNum.toFixed(2)} profit</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{new Date(bo.createdAt).toLocaleDateString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full overflow-x-auto flex flex-nowrap justify-start gap-0 bg-transparent border-b rounded-none h-auto p-0 scrollbar-none" data-testid="tabs-order-status">
          {tabFilters.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 py-2 text-xs whitespace-nowrap"
              data-testid={`tab-orders-${tab.value}`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabFilters.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20 border border-dashed rounded-lg">
                <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2" data-testid="text-no-orders">No orders</h3>
                <p className="text-muted-foreground text-sm">No orders in this category</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => {
                  const product = productMap.get(order.productId);
                  const store = storeMap.get(order.storeId);
                  const status = statusMap[order.status] ?? { label: order.status, color: "text-gray-500" };
                  const totalCost = parseFloat(order.totalPrice || "0");
                  const sellingPrice = parseFloat(order.payPrice || "0");
                  const earnings = parseFloat(order.profit || "0");

                  return (
                    <div key={order.id} className="space-y-2">
                      <Card className="overflow-visible" data-testid={`card-order-${order.id}`}>
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start justify-between mb-3">
                            <button className="text-muted-foreground" data-testid={`button-order-menu-${order.id}`}>
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${status.color}`} data-testid={`text-order-status-${order.id}`}>
                                {status.label}
                              </span>
                              {order.status === "completed" && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              {order.status === "processing" && (
                                <input type="checkbox" className="w-4 h-4 rounded" readOnly />
                              )}
                            </div>
                          </div>

                          <div className="mb-3">
                            <OrderFlowBadges status={order.status} />
                          </div>

                          <div className="flex gap-3">
                            <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" data-testid={`img-order-product-${order.id}`} />
                              ) : (
                                <Package className="w-8 h-8 text-muted-foreground/40" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm leading-tight mb-1 line-clamp-2" data-testid={`text-order-product-${order.id}`}>
                                {product?.name ?? "Product"}
                              </p>
                              <div className="space-y-0.5 text-xs text-muted-foreground">
                                <p>
                                  Order Number: <span className="text-foreground font-mono text-xs" data-testid={`text-order-sn-${order.id}`}>{order.orderSn}</span>
                                </p>
                                <p data-testid={`text-order-date-${order.id}`}>
                                  {new Date(order.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-sm">
                            <p className="text-muted-foreground">
                              Quantity <span className="text-foreground font-medium" data-testid={`text-order-qty-${order.id}`}>{order.quantity}</span>
                            </p>
                            <p className="text-muted-foreground">
                              Total Cost <span className="text-foreground font-medium" data-testid={`text-order-cost-${order.id}`}>{totalCost.toFixed(2)}</span>
                            </p>
                            <p className="text-muted-foreground">
                              Selling Price <span className="text-foreground font-medium" data-testid={`text-order-selling-${order.id}`}>{sellingPrice.toFixed(2)}</span>
                            </p>
                            <p className="text-muted-foreground">
                              Earnings <span className="text-green-500 font-bold" data-testid={`text-order-earnings-${order.id}`}>{earnings.toFixed(2)}</span>
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-3 pt-3 border-t">
                            <button
                              className="text-primary text-sm font-medium min-h-[44px] flex items-center"
                              onClick={() => setDetailOrder(order)}
                              data-testid={`button-order-details-${order.id}`}
                            >
                              Details
                            </button>
                            {order.status === "pending" && (() => {
                              const orderCost = parseFloat(order.totalPrice || "0");
                              const canAfford = balance >= orderCost;
                              return (
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                                  <div className="flex flex-col items-end gap-1">
                                    {!canAfford && (
                                      <button
                                        className="text-xs text-primary flex items-center gap-1 hover:underline"
                                        onClick={openChat}
                                        data-testid={`button-contact-support-${order.id}`}
                                      >
                                        <MessageCircle className="w-3 h-3" /> Recharge via Support
                                      </button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => pickupMutation.mutate(order.id)}
                                      disabled={pickupMutation.isPending || !canAfford}
                                      data-testid={`button-pickup-${order.id}`}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      {canAfford ? "Click to Pickup" : `Need $${orderCost.toFixed(2)}`}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </CardContent>
                      </Card>

                      {order.status === "processing" && (
                        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 overflow-visible" data-testid={`text-order-flow-info-${order.id}`}>
                          <CardContent className="p-3 sm:p-4 space-y-3">
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-foreground">
                                Please buy the required items from the marketplace to fulfill this order. Contact admin via live chat for payment details.
                              </p>
                            </div>

                            <div className="bg-muted/60 rounded-md p-3 space-y-1.5">
                              <p className="text-xs text-muted-foreground">Amount paid for pickup</p>
                              <p className="text-sm font-semibold">${totalCost.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground mt-2">Payment proof: Send via live chat using the image attachment feature</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={openChat}
                                data-testid="button-contact-admin"
                              >
                                <MessageCircle className="w-4 h-4 mr-1" />
                                Contact Admin
                              </Button>
                              <Link href="/">
                                <Button
                                  variant="default"
                                  size="sm"
                                  data-testid="button-buy-marketplace"
                                >
                                  <ShoppingCart className="w-4 h-4 mr-1" />
                                  Buy from Marketplace
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {hasPendingOrders && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4 space-y-2">
          {!canPickupAll && (
            <div className="flex items-center justify-between gap-2 text-xs bg-destructive/10 rounded-lg px-3 py-2 mx-auto" data-testid="text-pickup-insufficient">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>Insufficient balance (${balance.toFixed(2)}). Need ${pendingTotalCost.toFixed(2)}.</span>
              </div>
              <button
                className="text-primary font-medium flex items-center gap-1 hover:underline whitespace-nowrap"
                onClick={openChat}
                data-testid="button-contact-support-recharge"
              >
                <MessageCircle className="w-3 h-3" /> Contact Support
              </button>
            </div>
          )}
          <Button
            className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg"
            onClick={() => pickupAllMutation.mutate()}
            disabled={pickupAllMutation.isPending || !canPickupAll}
            data-testid="button-pickup-all"
          >
            {pickupAllMutation.isPending ? "Processing..." : `Pickup All ($${pendingTotalCost.toFixed(2)})`}
          </Button>
        </div>
      )}

      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {detailOrder && (() => {
            const product = productMap.get(detailOrder.productId);
            const store = storeMap.get(detailOrder.storeId);
            const status = statusMap[detailOrder.status] ?? { label: detailOrder.status, color: "text-gray-500" };
            const totalCost = parseFloat(detailOrder.totalPrice || "0");
            const sellingPrice = parseFloat(detailOrder.payPrice || "0");
            const earnings = parseFloat(detailOrder.profit || "0");

            return (
              <div className="space-y-4" data-testid="section-order-details">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={status.color}>{status.label}</Badge>
                </div>
                <div>
                  <h3 className="font-semibold" data-testid="text-detail-product">{product?.name ?? "Product"}</h3>
                  <p className="text-sm text-muted-foreground">Store: {store?.name ?? "Unknown"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Order Number</p>
                    <p className="font-mono text-xs mt-1" data-testid="text-detail-sn">{detailOrder.orderSn}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="text-xs mt-1">{new Date(detailOrder.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Quantity</p>
                    <p className="font-medium mt-1">{detailOrder.quantity}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Total Cost</p>
                    <p className="font-medium mt-1">${totalCost.toFixed(2)}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Selling Price</p>
                    <p className="font-medium mt-1">${sellingPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Earnings</p>
                    <p className="font-bold text-green-500 mt-1">${earnings.toFixed(2)}</p>
                  </div>
                </div>
                {detailOrder.deliveryAddress && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Delivery Address</p>
                    <p className="text-sm mt-1">{detailOrder.deliveryAddress}</p>
                  </div>
                )}
                {detailOrder.remark && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-muted-foreground text-xs">Remark</p>
                    <p className="text-sm mt-1">{detailOrder.remark}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

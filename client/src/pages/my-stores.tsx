import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, resolveUrl, getStoredToken } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Store, Package, Trash2, ShoppingBag, Eye, Search, Filter, BookOpen, Star, Crown, ArrowUp, ArrowDown, LayoutGrid, List, X, BarChart3, TrendingUp, DollarSign, ShoppingCart, Pencil } from "lucide-react";
import type { Store as StoreType, Product, UserDailyStat } from "@shared/schema";

const storeSchema = z.object({
  name: z.string().min(2, "Store name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Select a category"),
  referenceCode: z.string().min(1, "Reference code is required"),
});

type StoreForm = z.infer<typeof storeSchema>;

const storeCategories = ["Electronics", "Fashion", "Books", "Food & Beverage", "Sports", "Home & Garden", "Beauty", "Toys", "Automotive", "Other"];

const categoryColors: Record<string, string> = {
  Electronics: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Fashion: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Books: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Audio: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Accessories: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  default: "bg-secondary text-secondary-foreground",
};

function AddFromCatalogDialog({ storeId, storeName, onClose }: { storeId: string; storeName: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [resellPrice, setResellPrice] = useState("");
  const [quantity, setQuantity] = useState(1);

  const { data: catalogProducts, isLoading } = useQuery<Product[]>({ queryKey: ["/api/products/admin-catalog"] });

  const categories = ["all", ...Array.from(new Set(catalogProducts?.filter(p => p.isActive && p.stock > 0).map(p => p.category) || []))];

  const filtered = catalogProducts?.filter(p => {
    if (!p.isActive || p.stock <= 0) return false;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || p.category === category;
    return matchSearch && matchCat;
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products/resell", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stores", storeId, "products"] });
      setSelectedProduct(null);
      setQuantity(1);
      toast({ title: "Product added to your store!", description: `${storeName} now has this product in stock.` });
      onClose();
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  if (selectedProduct) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedProduct(null); setQuantity(1); }} data-testid="button-back-to-catalog">
          ← Back to catalog
        </Button>

        <div className="bg-muted rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded-md bg-background flex items-center justify-center overflow-hidden flex-shrink-0">
              {selectedProduct.imageUrl ? (
                <img src={resolveUrl(selectedProduct.imageUrl)} alt={selectedProduct.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-8 h-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold" data-testid="text-selected-product-name">{selectedProduct.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{selectedProduct.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-lg">${parseFloat(selectedProduct.price).toFixed(2)}</span>
                <Badge variant="secondary" className="text-xs">{selectedProduct.category}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{selectedProduct.stock} available</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Quantity to Stock</label>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQuantity(Math.max(1, quantity - 1))} data-testid="button-store-qty-minus">-</Button>
              <span className="w-8 text-center font-medium" data-testid="text-store-quantity">{quantity}</span>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))} data-testid="button-store-qty-plus">+</Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Price (set by admin)</label>
            <Input
              value={`$${parseFloat(selectedProduct.price).toFixed(2)}`}
              readOnly
              className="mt-1 bg-muted/50 text-muted-foreground cursor-not-allowed"
              data-testid="text-store-admin-price"
            />
            <p className="text-xs text-muted-foreground mt-1">Product price is fixed by the admin and cannot be changed</p>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-400">
          Adding products to your store is free! No balance is deducted. You earn when customers buy from your store.
        </div>

        <Button
          className="w-full"
          onClick={() => addMutation.mutate({
            adminProductId: selectedProduct.id,
            storeId,
            price: selectedProduct.price,
            quantity,
          })}
          disabled={addMutation.isPending}
          data-testid="button-confirm-store-add"
        >
          {addMutation.isPending ? "Adding..." : `Add to ${storeName}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 text-green-700 dark:text-green-400">
        <Package className="w-4 h-4 flex-shrink-0" />
        <span>Browse and add products to your store for free!</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 min-h-[44px]"
            data-testid="input-store-catalog-search"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-40 min-h-[44px]" data-testid="select-store-catalog-category">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c === "all" ? "All" : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-3"><Skeleton className="aspect-square w-full rounded-md mb-2" /><Skeleton className="h-3 w-3/4" /></CardContent></Card>
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-8">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No products found. Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {filtered?.map(product => {
            const price = parseFloat(product.price);
            return (
              <Card
                key={product.id}
                className="cursor-pointer transition-all hover:shadow-md"
                onClick={() => {
                  setSelectedProduct(product);
                  setResellPrice(product.price);
                  setQuantity(1);
                }}
                data-testid={`card-store-catalog-${product.id}`}
              >
                <CardContent className="p-3">
                  <div className="aspect-square w-full bg-muted rounded-md flex items-center justify-center mb-2 overflow-hidden">
                    {product.imageUrl ? (
                      <img src={resolveUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-8 h-8 text-muted-foreground/20" />
                    )}
                  </div>
                  <h4 className="text-sm font-medium leading-tight truncate" data-testid={`text-store-catalog-name-${product.id}`}>{product.name}</h4>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-sm">${price.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">{product.stock} left</span>
                  </div>
                  <Badge className={`text-xs mt-1 ${categoryColors[product.category] || categoryColors.default}`} variant="secondary">
                    {product.category}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductRatingStars({ product }: { product: Product }) {
  const rating = parseFloat(product.rating);
  return (
    <div className="flex items-center gap-1" data-testid={`rating-display-${product.id}`}>
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

function StorePreviewDialog({ store, products, open, onOpenChange }: { store: StoreType; products: Product[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const sorted = [...products].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-store-preview">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">{store.name}</DialogTitle>
                <DialogDescription>{store.description}</DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant={viewMode === "grid" ? "default" : "outline"}
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {sorted.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">This store has no products yet.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {sorted.map(p => (
              <Card key={p.id} data-testid={`preview-product-${p.id}`}>
                <CardContent className="p-3">
                  <div className="aspect-square w-full bg-muted rounded-md flex items-center justify-center mb-3 overflow-hidden">
                    {p.imageUrl ? (
                      <img src={resolveUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-10 h-10 text-muted-foreground/20" />
                    )}
                  </div>
                  <h4 className="text-sm font-semibold leading-tight truncate">{p.name}</h4>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-bold text-base">${parseFloat(p.price).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">{p.stock} in stock</span>
                  </div>
                  <ProductRatingStars product={p} />
                  <Badge className={`text-xs mt-2 ${categoryColors[p.category] || categoryColors.default}`} variant="secondary">
                    {p.category}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {sorted.map(p => (
              <Card key={p.id} data-testid={`preview-product-${p.id}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {p.imageUrl ? (
                        <img src={resolveUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground/20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold truncate">{p.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="font-bold">${parseFloat(p.price).toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">{p.stock} in stock</span>
                        <Badge className={`text-xs ${categoryColors[p.category] || categoryColors.default}`} variant="secondary">
                          {p.category}
                        </Badge>
                      </div>
                      <ProductRatingStars product={p} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StoreCard({ store }: { store: StoreType }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addingProduct, setAddingProduct] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [editDescOpen, setEditDescOpen] = useState(false);
  const [editDesc, setEditDesc] = useState(store.description ?? "");

  const updateStoreMutation = useMutation({
    mutationFn: (description: string) => apiRequest("PATCH", `/api/stores/${store.id}`, { description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores/my"] });
      setEditDescOpen(false);
      toast({ title: "Description updated!" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/stores", store.id, "products"],
    queryFn: () => {
      const token = getStoredToken();
      return fetch(resolveUrl(`/api/stores/${store.id}/products`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      }).then(r => r.json());
    },
  });

  const { data: dailyStats } = useQuery<UserDailyStat[]>({
    queryKey: ["/api/users", user?.id, "daily-stats"],
    enabled: !!user?.id,
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const sortedDailyStats = [...(dailyStats ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const todayStat = sortedDailyStats.find(s => s.date.toString().startsWith(todayStr));
  const recentStats = sortedDailyStats.slice(0, 3);

  const sortedProducts = products ? [...products].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) : [];

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/stores/${store.id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores/my"] });
      toast({ title: "Store deleted" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => apiRequest("DELETE", `/api/products/${productId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store.id, "products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (productIds: string[]) => apiRequest("PATCH", "/api/products/reorder", { productIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", store.id, "products"] });
    },
    onError: (err: any) => toast({ title: "Reorder failed", description: err.message, variant: "destructive" }),
  });

  const handleMove = (index: number, direction: "up" | "down") => {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sortedProducts.length) return;
    const newOrder = [...sortedProducts];
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    reorderMutation.mutate(newOrder.map(p => p.id));
  };

  return (
    <>
      <Card data-testid={`card-store-${store.id}`}>
        <CardHeader>
          {!store.isApproved && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-3" data-testid="banner-pending-approval">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Pending Admin Approval</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">Your store is under review. You'll be notified once approved.</p>
            </div>
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-sm sm:text-base truncate" data-testid={`text-store-name-${store.id}`}>{store.name}</CardTitle>
                <Badge variant="secondary" className="text-[10px] sm:text-xs mt-0.5">{store.category}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 px-2 sm:px-3"
                onClick={() => setPreviewOpen(true)}
                data-testid={`button-visit-store-${store.id}`}
              >
                <Eye className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Visit Store</span>
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="w-8 h-8"
                onClick={() => { setEditDesc(store.description ?? ""); setEditDescOpen(true); }}
                data-testid={`button-edit-store-desc-${store.id}`}
                title="Edit description"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8"
                onClick={() => deleteMutation.mutate()}
                data-testid={`button-delete-store-${store.id}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2" data-testid={`text-store-description-${store.id}`}>{store.description}</p>

          <Dialog open={editDescOpen} onOpenChange={setEditDescOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Store Description</DialogTitle>
                <DialogDescription>Update the description shown to customers on your store page.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    className="mt-1 min-h-[120px]"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    placeholder="Describe your store..."
                    data-testid="input-edit-store-description"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{editDesc.length} characters (min 10)</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDescOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => updateStoreMutation.mutate(editDesc)}
                  disabled={editDesc.length < 10 || updateStoreMutation.isPending}
                  data-testid="button-save-store-description"
                >
                  {updateStoreMutation.isPending ? "Saving..." : "Save Description"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Eye className="w-3.5 h-3.5" />
            <span data-testid={`text-store-visitors-${store.id}`}>{store.visitors} visitors</span>
          </div>
          {user && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid={`badge-vip-level-${store.id}`}>
                <Crown className="w-3 h-3 mr-1" />
                VIP {user.vipLevel}
              </Badge>
              <Badge variant="outline" className="text-xs" data-testid={`badge-grade-${store.id}`}>
                Grade: {parseFloat(user.grade).toFixed(1)}
              </Badge>
              <Badge variant="outline" className="text-xs" data-testid={`badge-credit-${store.id}`}>
                Credit: {user.credit}
              </Badge>
              <Badge variant="outline" className="text-xs" data-testid={`badge-good-rate-${store.id}`}>
                Good Rate: {parseFloat(user.goodRate).toFixed(1)}%
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-store-rating-${store.id}`}>
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium">{parseFloat(user.rating).toFixed(1)}</span>
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t" data-testid={`section-daily-analytics-${store.id}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                Daily Analytics
              </h4>
              {todayStat && (
                <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">Today</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center" data-testid={`stat-today-buying-${store.id}`}>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center gap-0.5 mb-0.5">
                  <ShoppingCart className="w-2.5 h-2.5" /> Buying
                </p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">${parseFloat(todayStat?.purchases ?? "0").toFixed(2)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center" data-testid={`stat-today-selling-${store.id}`}>
                <p className="text-[10px] text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-0.5 mb-0.5">
                  <TrendingUp className="w-2.5 h-2.5" /> Selling
                </p>
                <p className="text-sm font-bold text-green-700 dark:text-green-300">${parseFloat(todayStat?.sales ?? "0").toFixed(2)}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center" data-testid={`stat-today-profit-${store.id}`}>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center gap-0.5 mb-0.5">
                  <DollarSign className="w-2.5 h-2.5" /> Profit
                </p>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-300">${parseFloat(todayStat?.profit ?? "0").toFixed(2)}</p>
              </div>
            </div>

            {recentStats.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Last 3 Profit Updates</p>
                <div className="rounded-md border overflow-hidden">
                  {recentStats.map((stat, idx) => (
                    <div
                      key={stat.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 text-xs ${idx < recentStats.length - 1 ? "border-b" : ""} ${idx % 2 === 0 ? "bg-background" : "bg-muted/30"}`}
                      data-testid={`stat-recent-${stat.id}`}
                    >
                      <span className="text-muted-foreground">
                        {new Date(stat.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-blue-600 dark:text-blue-400">${parseFloat(stat.purchases ?? "0").toFixed(2)}</span>
                        <span className="text-green-600 dark:text-green-400">${parseFloat(stat.sales ?? "0").toFixed(2)}</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">+${parseFloat(stat.profit ?? "0").toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(dailyStats?.length === 0 || !dailyStats) && (
              <p className="text-xs text-muted-foreground text-center py-1">No analytics data yet.</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" />
              Products ({products?.length ?? 0})
            </h4>
            <div className="flex items-center gap-2">
              <Dialog open={addingProduct} onOpenChange={setAddingProduct}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={!store.isApproved} data-testid={`button-add-product-store-${store.id}`}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Product to {store.name}</DialogTitle>
                    <DialogDescription>Browse the official catalog and purchase products to stock in your store</DialogDescription>
                  </DialogHeader>
                  <AddFromCatalogDialog storeId={store.id} storeName={store.name} onClose={() => setAddingProduct(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {productsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sortedProducts.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-md">
              <ShoppingBag className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No products yet. Browse the catalog to add products!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedProducts.map((p, index) => (
                <div key={p.id} className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2" data-testid={`item-product-${p.id}`}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {p.imageUrl && (
                      <div className="w-8 h-8 rounded bg-background overflow-hidden flex-shrink-0">
                        <img src={resolveUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">${parseFloat(p.price).toFixed(2)} • {p.stock} in stock</p>
                      <ProductRatingStars product={p} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0 || reorderMutation.isPending}
                      data-testid={`button-move-up-${p.id}`}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleMove(index, "down")}
                      disabled={index === sortedProducts.length - 1 || reorderMutation.isPending}
                      data-testid={`button-move-down-${p.id}`}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteProductMutation.mutate(p.id)}
                      data-testid={`button-delete-product-${p.id}`}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <StorePreviewDialog store={store} products={sortedProducts} open={previewOpen} onOpenChange={setPreviewOpen} />
    </>
  );
}

export default function MyStores() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [nicFile, setNicFile] = useState<File | null>(null);
  const [nicPreview, setNicPreview] = useState<string>("");

  const { data: stores, isLoading } = useQuery<StoreType[]>({ queryKey: ["/api/stores/my"] });

  const form = useForm<StoreForm>({
    resolver: zodResolver(storeSchema),
    defaultValues: { name: "", description: "", category: "", referenceCode: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: StoreForm) => {
      if (!nicFile) throw new Error("NIC image is required");
      const formData = new FormData();
      formData.append("image", nicFile);
      const nicUploadToken = getStoredToken();
      const uploadRes = await fetch(resolveUrl("/api/upload/nic"), { method: "POST", body: formData, headers: nicUploadToken ? { Authorization: `Bearer ${nicUploadToken}` } : {} });
      if (!uploadRes.ok) throw new Error("Failed to upload NIC image");
      const { imageUrl } = await uploadRes.json();
      return apiRequest("POST", "/api/stores", { ...data, ownerId: user?.id, nicImageUrl: imageUrl, referenceCode: data.referenceCode });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stores"] });
      toast({ title: "Store registration submitted!", description: "Please wait for admin approval." });
      setCreateOpen(false);
      form.reset();
      setNicFile(null);
      setNicPreview("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  if (user?.isFrozen) {
    return (
      <div className="p-3 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 sm:p-8 text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">Account Frozen</h2>
          <p className="text-muted-foreground">Your account has been frozen by an administrator. Please contact support via live chat.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">My Stores</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your stores and products</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          {(!stores || stores.length === 0) && (
            <DialogTrigger asChild>
              <Button data-testid="button-create-store">
                <Plus className="w-4 h-4 mr-2" />
                Create Store
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create a New Store</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl><Input placeholder="e.g. TechGadgets Store" data-testid="input-store-name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-store-category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {storeCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Input placeholder="Describe your store..." data-testid="input-store-desc" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="referenceCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Reference Code</FormLabel>
                    <FormControl><Input placeholder="e.g. REF-XXXXXXXX" data-testid="input-reference-code" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="space-y-2">
                  <label className="text-sm font-medium">NIC / National ID Card Image</label>
                  <Input
                    type="file"
                    accept="image/*"
                    data-testid="input-nic-image"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setNicFile(file);
                      setNicPreview(file ? URL.createObjectURL(file) : "");
                    }}
                  />
                  {nicPreview && (
                    <img src={nicPreview} alt="NIC Preview" className="w-full max-h-40 object-contain rounded-md border" data-testid="img-nic-preview" />
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={createMutation.isPending || !nicFile} data-testid="button-submit-store">
                  {createMutation.isPending ? "Creating..." : "Create Store"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {Array(2).fill(0).map((_, i) => <Card key={i}><CardContent className="p-4 sm:p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>)}
        </div>
      ) : stores?.length === 0 ? (
        <div className="text-center py-12 sm:py-20 border border-dashed rounded-lg">
          <Store className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No stores yet</h3>
          <p className="text-muted-foreground mb-6">Create your first store and start selling on MarketNest</p>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-store">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Store
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {stores?.map(store => <StoreCard key={store.id} store={store} />)}
        </div>
      )}
    </div>
  );
}

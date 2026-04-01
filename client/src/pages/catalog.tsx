import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BookOpen, Package, Store, Wallet, AlertTriangle, Truck, ChevronLeft, ChevronRight, X } from "lucide-react";
import { ExpandableText } from "@/components/expandable-text";
import type { Product, Store as StoreType, User } from "@shared/schema";

function ImageLightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const prev = useCallback(() => setIndex(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIndex(i => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) next(); else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid="lightbox-overlay"
    >
      <div className="flex items-center justify-between px-4 py-3 z-10">
        <span className="text-white/80 text-sm font-medium">{index + 1} / {images.length}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
          data-testid="button-lightbox-close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <img
          key={index}
          src={images[index]}
          alt={`Image ${index + 1}`}
          className="max-h-full max-w-full object-contain"
          style={{ userSelect: "none", WebkitUserSelect: "none" }}
          draggable={false}
          data-testid="img-lightbox"
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2.5 transition-colors"
              data-testid="button-lightbox-prev"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2.5 transition-colors"
              data-testid="button-lightbox-next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 py-4">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${i === index ? "bg-white w-5 h-2" : "bg-white/40 w-2 h-2"}`}
              data-testid={`button-lightbox-dot-${i}`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

export default function CatalogPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [buyProduct, setBuyProduct] = useState<Product | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [addToStore, setAddToStore] = useState(false);
  const [addStoreId, setAddStoreId] = useState("");
  const [addResellPrice, setAddResellPrice] = useState("");
  const [addQuantity, setAddQuantity] = useState(1);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const galleryTouchStartX = useRef<number | null>(null);

  const { data: adminProducts, isLoading } = useQuery<Product[]>({ queryKey: ["/api/products/admin-catalog"] });
  const { data: myStores } = useQuery<StoreType[]>({ queryKey: ["/api/stores/my"] });
  const { data: currentUser } = useQuery<User>({ queryKey: ["/api/auth/me"] });

  const balance = parseFloat(currentUser?.balance || "0");

  const orderMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/targets/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setBuyProduct(null);
      setSelectedProduct(null);
      setBuyQuantity(1);
      toast({ title: "Purchase successful!", description: "Your order has been placed." });
    },
    onError: (err: any) => toast({ title: "Order failed", description: err.message, variant: "destructive" }),
  });

  const addToStoreMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products/resell", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin-catalog"] });
      setAddToStore(false);
      setSelectedProduct(null);
      setAddStoreId("");
      setAddResellPrice("");
      setAddQuantity(1);
      toast({ title: "Product added to your store!", description: "You can now sell this product." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  if (user?.isFrozen) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-8 text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">Account Frozen</h2>
          <p className="text-muted-foreground">Your account has been frozen. Contact support for help.</p>
        </div>
      </div>
    );
  }

  const totalCost = buyProduct ? parseFloat(buyProduct.price) * buyQuantity : 0;
  const insufficientBalance = totalCost > balance;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-3 sm:mb-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold">Official Catalog</h1>
              <p className="text-muted-foreground text-xs sm:text-base hidden sm:block">Click on products to see details, buy or add to your store for free</p>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm bg-primary/5 dark:bg-primary/10 rounded-full px-3 py-1.5 border border-primary/10">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-primary" data-testid="text-catalog-balance">${balance.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden"><Skeleton className="aspect-[4/3] w-full" /><div className="p-2.5 space-y-2"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></Card>
          ))}
        </div>
      ) : adminProducts?.length === 0 ? (
        <div className="text-center py-12 sm:py-20 border border-dashed rounded-lg">
          <BookOpen className="w-12 sm:w-16 h-12 sm:h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No catalog products yet</h3>
          <p className="text-muted-foreground text-sm">The admin hasn't added any official products to the catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {adminProducts?.map(product => (
            <Card
              key={product.id}
              className="flex flex-col cursor-pointer hover:shadow-md active:scale-[0.98] transition-all duration-200 overflow-hidden"
              onClick={() => setSelectedProduct(product)}
              data-testid={`card-catalog-${product.id}`}
            >
              <div className="aspect-[4/3] w-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" data-testid={`img-catalog-${product.id}`} />
                ) : (
                  <BookOpen className="w-10 h-10 text-green-300 dark:text-green-700" />
                )}
              </div>
              <div className="p-2.5 sm:p-3 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2" data-testid={`text-catalog-name-${product.id}`}>{product.name}</h3>
                  <Badge className="text-[10px] shrink-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0" variant="secondary">Official</Badge>
                </div>
                <div className="mt-auto pt-1.5 flex items-end justify-between gap-1">
                  <p className="font-bold text-sm sm:text-base text-primary" data-testid={`text-catalog-price-${product.id}`}>${parseFloat(product.price).toFixed(2)}</p>
                  <span className="text-[10px] text-muted-foreground">{product.stock} left</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedProduct && !buyProduct} onOpenChange={(open) => { if (!open) { setSelectedProduct(null); setGalleryIndex(0); } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-0" data-testid="dialog-catalog-detail">
          <VisuallyHidden><DialogTitle>Product Details</DialogTitle></VisuallyHidden>
          {selectedProduct && (() => {
            const allImages = [
              ...(selectedProduct.imageUrl ? [selectedProduct.imageUrl] : []),
              ...(selectedProduct.images || []),
            ];
            const openLightbox = (i: number) => { setLightboxIndex(i); setLightboxOpen(true); };
            const onGalleryTouchStart = (e: React.TouchEvent) => { galleryTouchStartX.current = e.touches[0].clientX; };
            const onGalleryTouchEnd = (e: React.TouchEvent) => {
              if (galleryTouchStartX.current === null) return;
              const dx = e.changedTouches[0].clientX - galleryTouchStartX.current;
              if (Math.abs(dx) > 40) {
                if (dx < 0) setGalleryIndex(i => (i + 1) % allImages.length);
                else setGalleryIndex(i => (i - 1 + allImages.length) % allImages.length);
              }
              galleryTouchStartX.current = null;
            };
            return (
              <div>
                {allImages.length > 0 ? (
                  <div className="relative bg-gray-50 dark:bg-gray-900 overflow-hidden" style={{ aspectRatio: "4/3" }}
                    onTouchStart={onGalleryTouchStart}
                    onTouchEnd={onGalleryTouchEnd}
                  >
                    <img
                      src={allImages[galleryIndex]}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain cursor-zoom-in"
                      onClick={() => openLightbox(galleryIndex)}
                      data-testid="img-catalog-detail"
                    />
                    {allImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setGalleryIndex(i => (i - 1 + allImages.length) % allImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-colors"
                          data-testid="button-catalog-gallery-prev"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setGalleryIndex(i => (i + 1) % allImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-colors"
                          data-testid="button-catalog-gallery-next"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {allImages.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setGalleryIndex(i)}
                              className={`rounded-full transition-all ${i === galleryIndex ? "bg-white w-4 h-1.5" : "bg-white/60 w-1.5 h-1.5"}`}
                              data-testid={`button-catalog-thumb-${i}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
                      Tap to zoom
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center bg-green-50 dark:bg-green-900/20" style={{ aspectRatio: "4/3" }}>
                    <BookOpen className="w-16 h-16 text-green-300 dark:text-green-700" />
                  </div>
                )}
                {allImages.length > 1 && (
                  <div className="flex gap-2 px-4 pt-3 overflow-x-auto pb-1">
                    {allImages.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setGalleryIndex(i)}
                        className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${i === galleryIndex ? "border-primary" : "border-transparent opacity-50 hover:opacity-80"}`}
                        data-testid={`button-catalog-thumb-img-${i}`}
                      >
                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="p-4 space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold leading-tight" data-testid="text-catalog-detail-name">{selectedProduct.name}</h3>
                      <Badge className="bg-green-100 text-green-700 shrink-0" variant="secondary">Official</Badge>
                    </div>
                    <div className="mt-1">
                      <ExpandableText
                        text={selectedProduct.description}
                        className="text-sm text-muted-foreground"
                        lines={2}
                        data-testid="text-catalog-detail-desc"
                      />
                    </div>
                  </div>
                  {selectedProduct.detailedDescription && (
                    <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Item Details</p>
                      <ExpandableText
                        text={selectedProduct.detailedDescription}
                        className="text-sm"
                        lines={2}
                        data-testid="text-catalog-item-details"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">${parseFloat(selectedProduct.price).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{selectedProduct.stock} in stock</p>
                    </div>
                    <Badge variant="secondary">{selectedProduct.category}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
                        setBuyProduct(selectedProduct);
                      }}
                      disabled={selectedProduct.stock === 0 || !user}
                      data-testid="button-catalog-detail-buy"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      Buy / Ship Home
                    </Button>
                    {user && (myStores?.length ?? 0) > 0 && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setAddResellPrice(selectedProduct.price);
                          setAddToStore(true);
                        }}
                        disabled={selectedProduct.stock === 0}
                        data-testid="button-catalog-detail-add-to-store"
                      >
                        <Store className="w-4 h-4 mr-2" />
                        Add to My Store
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {lightboxOpen && selectedProduct && (
        <ImageLightbox
          images={[
            ...(selectedProduct.imageUrl ? [selectedProduct.imageUrl] : []),
            ...(selectedProduct.images || []),
          ]}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <Dialog open={!!buyProduct} onOpenChange={() => { setBuyProduct(null); setBuyQuantity(1); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg" data-testid="dialog-buy-catalog">
          <DialogHeader>
            <DialogTitle>Buy from Catalog</DialogTitle>
            <DialogDescription>Purchase {buyProduct?.name} from the official catalog</DialogDescription>
          </DialogHeader>
          {buyProduct && (
            <div className="space-y-4">
              <div className="bg-muted rounded-md p-4 space-y-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-16 h-16 rounded-md bg-background flex items-center justify-center overflow-hidden">
                    {buyProduct.imageUrl ? (
                      <img src={buyProduct.imageUrl} alt={buyProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{buyProduct.name}</p>
                    <p className="text-xs text-muted-foreground">${parseFloat(buyProduct.price).toFixed(2)} each</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quantity</span>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={() => setBuyQuantity(Math.max(1, buyQuantity - 1))} data-testid="button-catalog-qty-minus">-</Button>
                    <span className="w-8 text-center font-medium" data-testid="text-catalog-quantity">{buyQuantity}</span>
                    <Button size="icon" variant="outline" onClick={() => setBuyQuantity(Math.min(buyProduct.stock, buyQuantity + 1))} data-testid="button-catalog-qty-plus">+</Button>
                  </div>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span data-testid="text-catalog-total">${totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Balance</span>
                  <span className={insufficientBalance ? "text-destructive font-medium" : "text-green-500 font-medium"} data-testid="text-catalog-buy-balance">
                    ${balance.toFixed(2)}
                  </span>
                </div>
              </div>
              {insufficientBalance && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3" data-testid="text-catalog-insufficient-balance">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Insufficient balance. Please recharge your account before purchasing.</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyProduct(null)}>Cancel</Button>
            <Button
              onClick={() => orderMutation.mutate({
                productId: buyProduct?.id,
                quantity: buyQuantity,
              })}
              disabled={orderMutation.isPending || insufficientBalance}
              data-testid="button-confirm-catalog-purchase"
            >
              {orderMutation.isPending ? "Processing..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addToStore} onOpenChange={() => { setAddToStore(false); setAddStoreId(""); setAddResellPrice(""); setAddQuantity(1); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg flex flex-col max-h-[90svh] p-0 gap-0" data-testid="dialog-catalog-add-to-store">
          <DialogHeader className="px-5 pt-5 pb-3 flex-shrink-0">
            <DialogTitle>Add to Your Store</DialogTitle>
            <DialogDescription>Add {selectedProduct?.name} to your store for free — no payment required</DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-400">
                Adding products to your store is free! You earn when customers buy from your store.
              </div>
              <div className="bg-muted rounded-md p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-md bg-background flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedProduct.imageUrl ? (
                    <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-6 h-6 text-muted-foreground/40" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedProduct.name}</p>
                  <p className="text-xs text-muted-foreground">${parseFloat(selectedProduct.price).toFixed(2)} original price</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Select Store</label>
                  <Select value={addStoreId} onValueChange={setAddStoreId}>
                    <SelectTrigger className="mt-1" data-testid="select-catalog-add-store">
                      <SelectValue placeholder="Choose your store" />
                    </SelectTrigger>
                    <SelectContent>
                      {myStores?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Quantity</label>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))} data-testid="button-catalog-add-qty-minus">-</Button>
                    <span className="w-8 text-center font-medium" data-testid="text-catalog-add-quantity">{addQuantity}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setAddQuantity(Math.min(selectedProduct.stock, addQuantity + 1))} data-testid="button-catalog-add-qty-plus">+</Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Price (set by admin)</label>
                  <Input value={`$${parseFloat(selectedProduct.price).toFixed(2)}`} readOnly className="mt-1 bg-muted/50 text-muted-foreground cursor-not-allowed" data-testid="text-catalog-admin-price" />
                  <p className="text-xs text-muted-foreground mt-1">Product price is fixed by the admin and cannot be changed</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="px-5 py-4 border-t flex-shrink-0 flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => { setAddToStore(false); setAddStoreId(""); setAddResellPrice(""); setAddQuantity(1); }}>Cancel</Button>
            <Button
              onClick={() => addToStoreMutation.mutate({
                adminProductId: selectedProduct?.id,
                storeId: addStoreId,
                price: selectedProduct?.price,
                quantity: addQuantity,
              })}
              disabled={addToStoreMutation.isPending || !addStoreId}
              data-testid="button-confirm-catalog-add-to-store"
            >
              {addToStoreMutation.isPending ? "Adding..." : "Add to Store (Free)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

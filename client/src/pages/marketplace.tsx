import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, resolveUrl } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Search, Store, Package, Filter, AlertTriangle, Wallet, Truck, Star, MapPin, MessageCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
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
      style={{ touchAction: "none" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid="lightbox-overlay"
    >
      <div className="flex items-center justify-between px-4 py-3">
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
          src={resolveUrl(images[index])}
          alt={`Image ${index + 1}`}
          className="max-h-full max-w-full object-contain"
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

const categoryColors: Record<string, string> = {
  Electronics: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Fashion: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Books: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Audio: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Accessories: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  default: "bg-secondary text-secondary-foreground",
};

function StarRating({ rating, productId }: { rating: number; productId: string }) {
  return (
    <div className="flex items-center gap-1" data-testid={`rating-display-${productId}`}>
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < Math.floor(rating);
          const half = !filled && i < rating;
          return (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${filled || half ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`}
            />
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground font-medium">{rating.toFixed(1)}</span>
    </div>
  );
}

function ProductCard({ product, store, onClick }: { product: Product; store?: StoreType; onClick: (product: Product) => void }) {
  const colorClass = categoryColors[product.category] || categoryColors.default;

  return (
    <Card className="flex flex-col cursor-pointer hover:shadow-md active:scale-[0.98] transition-all duration-200 overflow-hidden" onClick={() => onClick(product)} data-testid={`card-product-${product.id}`}>
      <div className="relative">
        <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img src={resolveUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" data-testid={`img-product-${product.id}`} />
          ) : (
            <Package className="w-10 h-10 text-muted-foreground/30" />
          )}
        </div>
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <Badge variant="secondary" className="text-xs">Sold Out</Badge>
          </div>
        )}
      </div>
      <div className="p-2.5 sm:p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2 mb-1" data-testid={`text-product-name-${product.id}`}>{product.name}</h3>
        <StarRating rating={parseFloat(product.rating)} productId={product.id} />
        <div className="mt-auto pt-1.5 flex items-end justify-between gap-1">
          <p className="font-bold text-sm sm:text-base text-primary" data-testid={`text-price-${product.id}`}>${parseFloat(product.price).toFixed(2)}</p>
          <span className="text-[10px] text-muted-foreground">{product.stock} left</span>
        </div>
      </div>
    </Card>
  );
}

export default function Marketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [buyingProduct, setBuyingProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({ queryKey: ["/api/products/admin-catalog"] });
  const { data: stores } = useQuery<StoreType[]>({ queryKey: ["/api/stores"] });
  const { data: myStores } = useQuery<StoreType[]>({ queryKey: ["/api/stores/my"] });
  const { data: currentUser } = useQuery<User>({ queryKey: ["/api/auth/me"] });

  const storeMap = new Map(stores?.map(s => [s.id, s]));
  const balance = parseFloat(currentUser?.balance || "0");

  const orderMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/admin-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/targets/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setBuyingProduct(null);
      setSelectedProduct(null);
      setQuantity(1);
      toast({ title: "Order placed!", description: "Your purchase was successful." });
    },
    onError: (err: any) => {
      toast({ title: "Order failed", description: err.message, variant: "destructive" });
    },
  });

  const [addToStore, setAddToStore] = useState(false);
  const [addStoreId, setAddStoreId] = useState("");
  const [addResellPrice, setAddResellPrice] = useState("");
  const [addQuantity, setAddQuantity] = useState(1);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const galleryTouchStartX = useRef<number | null>(null);

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
      toast({ title: "Product added to your store!", description: "You can now sell this product in your store." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const categories = ["all", ...Array.from(new Set(products?.map(p => p.category) || []))];

  const filtered = products?.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || p.category === category;
    return matchSearch && matchCat;
  });

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setGalleryIndex(0);
    setLightboxOpen(false);
  };

  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [shipPhase, setShipPhase] = useState<"form" | "result">("form");
  const [shipAddr, setShipAddr] = useState({ name: "", address: "", city: "", state: "", country: "", phone: "" });

  const handleBuyFromDetail = () => {
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    if (user.isFrozen) { toast({ title: "Account frozen", variant: "destructive" }); return; }
    setSelectedProduct(null);
    setShipPhase("form");
    setShipAddr({ name: "", address: "", city: "", state: "", country: "", phone: "" });
    setShowLocationPopup(true);
  };

  const handleShipSubmit = () => {
    const { name, address, city, state, country, phone } = shipAddr;
    if (!name || !address || !city || !state || !country || !phone) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setShipPhase("result");
  };

  const openChat = () => {
    setShowLocationPopup(false);
    setSelectedProduct(null);
    setTimeout(() => {
      const chatBtn = document.querySelector('[data-testid="button-chat-toggle"]') as HTMLElement;
      if (chatBtn) chatBtn.click();
    }, 300);
  };

  const totalCost = buyingProduct ? parseFloat(buyingProduct.price) * quantity : 0;
  const insufficientBalance = totalCost > balance;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-3 sm:mb-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Marketplace</h1>
            <p className="text-muted-foreground text-xs sm:text-base mt-0.5 hidden sm:block">Discover products from all our sellers</p>
          </div>
          {user && (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm bg-primary/5 dark:bg-primary/10 rounded-full px-3 py-1.5 border border-primary/10">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-primary" data-testid="text-marketplace-balance">${balance.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-3 sm:mb-6">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10 sm:h-11 rounded-full text-sm" data-testid="input-search" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-auto sm:w-48 h-10 sm:h-11 rounded-full text-sm" data-testid="select-category">
            <Filter className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline"><SelectValue placeholder="All Categories" /></span>
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {productsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden"><Skeleton className="aspect-[4/3] w-full" /><div className="p-2.5 space-y-2"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></Card>
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-12 sm:py-20">
          <Package className="w-12 sm:w-16 h-12 sm:h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-base sm:text-lg mb-2">No products found</h3>
          <p className="text-muted-foreground text-sm">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
          {filtered?.map(product => (
            <ProductCard key={product.id} product={product} store={storeMap.get(product.storeId)} onClick={handleProductClick} />
          ))}
        </div>
      )}

      <Dialog open={!!selectedProduct && !buyingProduct} onOpenChange={(open) => { if (!open) { setSelectedProduct(null); setGalleryIndex(0); } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-0" data-testid="dialog-product-detail">
          <VisuallyHidden><DialogTitle>Product Details</DialogTitle></VisuallyHidden>
          {selectedProduct && (() => {
            const store = storeMap.get(selectedProduct.storeId);
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
                  <div
                    className="relative bg-gray-50 dark:bg-gray-900 overflow-hidden"
                    style={{ aspectRatio: "4/3", touchAction: "none" }}
                    onTouchStart={onGalleryTouchStart}
                    onTouchEnd={onGalleryTouchEnd}
                  >
                    <img
                      src={resolveUrl(allImages[galleryIndex])}
                      alt={selectedProduct.name}
                      className="w-full h-full object-contain cursor-zoom-in"
                      onClick={() => openLightbox(galleryIndex)}
                      data-testid="img-detail-product"
                    />
                    {allImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setGalleryIndex(i => (i - 1 + allImages.length) % allImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-colors"
                          data-testid="button-gallery-prev"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setGalleryIndex(i => (i + 1) % allImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-1.5 transition-colors"
                          data-testid="button-gallery-next"
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
                              data-testid={`button-gallery-dot-${i}`}
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
                  <div className="flex items-center justify-center bg-muted" style={{ aspectRatio: "4/3" }}>
                    <Package className="w-16 h-16 text-muted-foreground/30" />
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
                        data-testid={`button-gallery-thumb-${i}`}
                      >
                        <img src={resolveUrl(url)} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold leading-tight" data-testid="text-detail-name">{selectedProduct.name}</h3>
                    <div className="mt-1">
                      <ExpandableText
                        text={selectedProduct.description}
                        className="text-sm text-muted-foreground"
                        lines={2}
                        data-testid="text-detail-description"
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
                        data-testid="text-detail-item-details"
                      />
                    </div>
                  )}
                  <StarRating rating={parseFloat(selectedProduct.rating)} productId={selectedProduct.id} />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-detail-price">${parseFloat(selectedProduct.price).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{selectedProduct.stock} in stock</p>
                    </div>
                    <Badge className={categoryColors[selectedProduct.category] || categoryColors.default} variant="secondary">
                      {selectedProduct.category}
                    </Badge>
                  </div>
                  {store && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                      <Store className="w-4 h-4" />
                      <span>Sold by: <span className="font-medium text-foreground">{store.name}</span></span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      className="flex-1 min-h-[44px]"
                      onClick={handleBuyFromDetail}
                      disabled={selectedProduct.stock === 0 || !user || user.isFrozen}
                      data-testid="button-detail-buy"
                    >
                      <Truck className="w-4 h-4 mr-2" />
                      {selectedProduct.stock === 0 ? "Out of Stock" : "Buy / Ship Home"}
                    </Button>
                    {user && (myStores?.length ?? 0) > 0 && selectedProduct.isAdminProduct && (
                      <Button
                        variant="outline"
                        className="flex-1 min-h-[44px]"
                        onClick={() => {
                          setAddResellPrice(selectedProduct.price);
                          setAddToStore(true);
                        }}
                        disabled={selectedProduct.stock === 0 || user.isFrozen}
                        data-testid="button-detail-add-to-store"
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

      <Dialog open={showLocationPopup} onOpenChange={(open) => { if (!open) { setShowLocationPopup(false); setShipPhase("form"); setShipAddr({ name: "", address: "", city: "", state: "", country: "", phone: "" }); } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-md" data-testid="dialog-location-unavailable">
          {shipPhase === "form" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Ship to Home
                </DialogTitle>
                <DialogDescription>Enter your delivery address to check availability in your area</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="mship-name">Full Name</Label>
                  <Input id="mship-name" placeholder="Your full name" value={shipAddr.name} onChange={e => setShipAddr(p => ({ ...p, name: e.target.value }))} data-testid="input-mship-name" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="mship-address">Address</Label>
                  <Input id="mship-address" placeholder="Street address" value={shipAddr.address} onChange={e => setShipAddr(p => ({ ...p, address: e.target.value }))} data-testid="input-mship-address" className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="mship-city">City</Label>
                    <Input id="mship-city" placeholder="City" value={shipAddr.city} onChange={e => setShipAddr(p => ({ ...p, city: e.target.value }))} data-testid="input-mship-city" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="mship-state">State / Province</Label>
                    <Input id="mship-state" placeholder="State" value={shipAddr.state} onChange={e => setShipAddr(p => ({ ...p, state: e.target.value }))} data-testid="input-mship-state" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="mship-country">Country</Label>
                  <Input id="mship-country" placeholder="Country" value={shipAddr.country} onChange={e => setShipAddr(p => ({ ...p, country: e.target.value }))} data-testid="input-mship-country" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="mship-phone">Phone Number</Label>
                  <Input id="mship-phone" placeholder="+1 (555) 000-0000" value={shipAddr.phone} onChange={e => setShipAddr(p => ({ ...p, phone: e.target.value }))} data-testid="input-mship-phone" className="mt-1" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowLocationPopup(false)} data-testid="button-location-cancel">Cancel</Button>
                <Button onClick={handleShipSubmit} data-testid="button-mship-submit">Check Availability</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" />
                  Service Unavailable
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400" data-testid="text-location-message">
                  This service is not available in your area. Please contact chat support to change your shipment location. Thanks.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowLocationPopup(false); setShipPhase("form"); }} data-testid="button-location-cancel">Close</Button>
                <Button onClick={openChat} data-testid="button-change-location">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addToStore} onOpenChange={() => { setAddToStore(false); setAddStoreId(""); setAddResellPrice(""); setAddQuantity(1); }}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg flex flex-col max-h-[90svh] p-0 gap-0" data-testid="dialog-add-to-store">
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
                    <img src={resolveUrl(selectedProduct.imageUrl)} alt={selectedProduct.name} className="w-full h-full object-cover" />
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
                    <SelectTrigger className="mt-1" data-testid="select-add-store">
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
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))} data-testid="button-add-qty-minus">-</Button>
                    <span className="w-8 text-center font-medium" data-testid="text-add-quantity">{addQuantity}</span>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setAddQuantity(Math.min(selectedProduct.stock, addQuantity + 1))} data-testid="button-add-qty-plus">+</Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Price (set by admin)</label>
                  <Input value={`$${parseFloat(selectedProduct.price).toFixed(2)}`} readOnly className="mt-1 bg-muted/50 text-muted-foreground cursor-not-allowed" data-testid="text-marketplace-admin-price" />
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
              data-testid="button-confirm-add-to-store"
            >
              {addToStoreMutation.isPending ? "Adding..." : "Add to Store (Free)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

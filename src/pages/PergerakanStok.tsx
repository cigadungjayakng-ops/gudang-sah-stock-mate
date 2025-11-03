import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  variants: any;
}

interface StockMovement {
  product_id: string;
  product_name: string;
  variant: string | null;
  stok_awal: number;
  masuk: number;
  keluar: number;
  sisa_stok: number;
  masuk_details: any[];
  keluar_details: any[];
}

interface StockDetail {
  id: string;
  created_at: string;
  qty: number;
  products: { name: string };
  variant: string | null;
  jenis_stok_masuk?: { name: string };
  jenis_stok_keluar?: { name: string };
  cabang?: { name: string };
  plat_nomor: string | null;
  supir: string | null;
  no_surat_jalan: string | null;
  keterangan: string | null;
  tujuan_category?: string;
}

function PergerakanStokContent() {
  const { user, userRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedVariant, setSelectedVariant] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setHours(0, 0, 0, 0)),
    to: new Date(new Date().setHours(23, 59, 59, 999)),
  });
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailDialog, setDetailDialog] = useState<{ type: "in" | "out"; details: StockDetail[] } | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [user]);

  useEffect(() => {
    if (selectedProduct && selectedProduct !== "all") {
      fetchMovements();
    } else if (selectedProduct === "all") {
      fetchAllMovements();
    }
  }, [selectedProduct, selectedVariant, dateRange]);

  const fetchProducts = async () => {
    if (!user) return;

    const query = userRole === "user"
      ? supabase.from("products").select("*").eq("user_id", user.id)
      : supabase.from("products").select("*");

    const { data, error } = await query;

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProducts(data || []);
      if (data && data.length > 0) {
        setSelectedProduct("all");
      }
    }
  };

  const fetchAllMovements = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const movementsData: StockMovement[] = [];

      for (const product of products) {
        const productVariants = Array.isArray(product.variants) && product.variants.length > 0 
          ? product.variants 
          : [null];
        
        const variants = selectedVariant === "all"
          ? productVariants
          : [selectedVariant];

        for (const variant of variants) {
          const [stockInBefore, stockOutBefore] = await Promise.all([
            supabase
              .from("stock_in")
              .select("qty, variant")
              .eq("product_id", product.id)
              .lt("created_at", dateRange.from.toISOString())
              .then((res) => {
                if (variant === null) {
                  return res.data?.filter((item: any) => !item.variant);
                }
                return res.data?.filter((item: any) => item.variant === variant);
              }),
            supabase
              .from("stock_out")
              .select("qty, variant")
              .eq("product_id", product.id)
              .lt("created_at", dateRange.from.toISOString())
              .then((res) => {
                if (variant === null) {
                  return res.data?.filter((item: any) => !item.variant);
                }
                return res.data?.filter((item: any) => item.variant === variant);
              }),
          ]);

          const stok_awal = (stockInBefore?.reduce((sum, item) => sum + item.qty, 0) || 0) -
                            (stockOutBefore?.reduce((sum, item) => sum + item.qty, 0) || 0);

          const [stockInData, stockOutData] = await Promise.all([
            supabase
              .from("stock_in")
              .select("*, products(name), jenis_stok_masuk(name), cabang(name)")
              .eq("product_id", product.id)
              .gte("created_at", dateRange.from.toISOString())
              .lte("created_at", dateRange.to.toISOString())
              .then((res) => {
                if (variant === null) {
                  return { data: res.data?.filter((item) => !item.variant) || [] };
                }
                return { data: res.data?.filter((item) => item.variant === variant) || [] };
              }),
            supabase
              .from("stock_out")
              .select("*, products(name), jenis_stok_keluar(name), cabang(name)")
              .eq("product_id", product.id)
              .gte("created_at", dateRange.from.toISOString())
              .lte("created_at", dateRange.to.toISOString())
              .then((res) => {
                if (variant === null) {
                  return { data: res.data?.filter((item) => !item.variant) || [] };
                }
                return { data: res.data?.filter((item) => item.variant === variant) || [] };
              }),
          ]);

          const masuk = stockInData.data.reduce((sum, item) => sum + item.qty, 0);
          const keluar = stockOutData.data.reduce((sum, item) => sum + item.qty, 0);

          movementsData.push({
            product_id: product.id,
            product_name: product.name,
            variant: variant,
            stok_awal,
            masuk,
            keluar,
            sisa_stok: stok_awal + masuk - keluar,
            masuk_details: stockInData.data,
            keluar_details: stockOutData.data,
          });
        }
      }

      setMovements(movementsData);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    if (!selectedProduct || !user) return;

    setLoading(true);

    try {
      const product = products.find((p) => p.id === selectedProduct);
      if (!product) return;

      // Handle products without variants
      const productVariants = Array.isArray(product.variants) && product.variants.length > 0 
        ? product.variants 
        : [null];
      
      const variants = selectedVariant === "all"
        ? productVariants
        : [selectedVariant];

      const movementsData: StockMovement[] = [];

      for (const variant of variants) {
        // Fetch stock before date range
        const [stockInBefore, stockOutBefore] = await Promise.all([
          supabase
            .from("stock_in")
            .select("qty, variant")
            .eq("product_id", selectedProduct)
            .lt("created_at", dateRange.from.toISOString())
            .then((res) => {
              if (variant === null) {
                return res.data?.filter((item: any) => !item.variant);
              }
              return res.data?.filter((item: any) => item.variant === variant);
            }),
          supabase
            .from("stock_out")
            .select("qty, variant")
            .eq("product_id", selectedProduct)
            .lt("created_at", dateRange.from.toISOString())
            .then((res) => {
              if (variant === null) {
                return res.data?.filter((item: any) => !item.variant);
              }
              return res.data?.filter((item: any) => item.variant === variant);
            }),
        ]);

        const stok_awal = (stockInBefore?.reduce((sum, item) => sum + item.qty, 0) || 0) -
                          (stockOutBefore?.reduce((sum, item) => sum + item.qty, 0) || 0);

        // Fetch movements in date range
        const [stockInData, stockOutData] = await Promise.all([
          supabase
            .from("stock_in")
            .select("*, products(name), jenis_stok_masuk(name), cabang(name)")
            .eq("product_id", selectedProduct)
            .gte("created_at", dateRange.from.toISOString())
            .lte("created_at", dateRange.to.toISOString())
            .then((res) => {
              if (variant === null) {
                return { data: res.data?.filter((item) => !item.variant) || [] };
              }
              return { data: res.data?.filter((item) => item.variant === variant) || [] };
            }),
          supabase
            .from("stock_out")
            .select("*, products(name), jenis_stok_keluar(name), cabang(name)")
            .eq("product_id", selectedProduct)
            .gte("created_at", dateRange.from.toISOString())
            .lte("created_at", dateRange.to.toISOString())
            .then((res) => {
              if (variant === null) {
                return { data: res.data?.filter((item) => !item.variant) || [] };
              }
              return { data: res.data?.filter((item) => item.variant === variant) || [] };
            }),
        ]);

        const masuk = stockInData.data.reduce((sum, item) => sum + item.qty, 0);
        const keluar = stockOutData.data.reduce((sum, item) => sum + item.qty, 0);

        movementsData.push({
          product_id: selectedProduct,
          product_name: product.name,
          variant: variant,
          stok_awal,
          masuk,
          keluar,
          sisa_stok: stok_awal + masuk - keluar,
          masuk_details: stockInData.data,
          keluar_details: stockOutData.data,
        });
      }

      setMovements(movementsData);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedProductData = products.find((p) => p.id === selectedProduct);
  const hasVariants = selectedProduct !== "all" && selectedProductData?.variants && selectedProductData.variants.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Pergerakan Stok</h1>
        <p className="text-muted-foreground">Lacak pergerakan stok produk Anda</p>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Produk</Label>
            <Combobox
              options={[
                { value: "all", label: "Semua Produk" },
                ...products.map((p) => ({ value: p.id, label: p.name }))
              ]}
              value={selectedProduct}
              onValueChange={setSelectedProduct}
              placeholder="Pilih produk"
              searchPlaceholder="Cari produk..."
              emptyText="Produk tidak ditemukan"
            />
          </div>

          {hasVariants && (
            <div className="space-y-2">
              <Label>Varian</Label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Varian</SelectItem>
                  {selectedProductData.variants.map((variant) => (
                    <SelectItem key={variant} value={variant}>
                      {variant}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Periode</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from && dateRange.to
                    ? `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                    : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from) {
                      setDateRange({
                        from: new Date(range.from.setHours(0, 0, 0, 0)),
                        to: range.to ? new Date(range.to.setHours(23, 59, 59, 999)) : new Date(range.from.setHours(23, 59, 59, 999)),
                      });
                    }
                  }}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      <Card className="shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              {hasVariants && selectedVariant === "all" && <TableHead>Varian</TableHead>}
              <TableHead className="text-right">Stok Awal</TableHead>
              <TableHead className="text-right">Masuk</TableHead>
              <TableHead className="text-right">Keluar</TableHead>
              <TableHead className="text-right">Sisa Stok</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Belum ada data
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{movement.product_name}</TableCell>
                  {hasVariants && selectedVariant === "all" && (
                    <TableCell>
                      {movement.variant ? (
                        <Badge variant="secondary">{movement.variant}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-medium">{movement.stok_awal}</TableCell>
                  <TableCell className="text-right">
                    {movement.masuk > 0 ? (
                      <Button
                        variant="link"
                        className="text-primary p-0 h-auto"
                        onClick={() => setDetailDialog({ type: "in", details: movement.masuk_details })}
                      >
                        {movement.masuk} <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {movement.keluar > 0 ? (
                      <Button
                        variant="link"
                        className="text-destructive p-0 h-auto"
                        onClick={() => setDetailDialog({ type: "out", details: movement.keluar_details })}
                      >
                        {movement.keluar} <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg">{movement.sisa_stok}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={cn(
              "text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
              detailDialog?.type === "in" ? "from-primary to-primary/60" : "from-destructive to-destructive/60"
            )}>
              Detail {detailDialog?.type === "in" ? "Stok Masuk" : "Stok Keluar"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {detailDialog?.details.map((detail) => (
              <Card key={detail.id} className={cn(
                "shadow-lg",
                detailDialog.type === "in" ? "border-primary/20" : "border-destructive/20"
              )}>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-[140px,1fr] gap-x-4 gap-y-3">
                    <div className="text-sm font-semibold text-muted-foreground">Tanggal</div>
                    <div className="text-sm font-medium">{new Date(detail.created_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    
                    {detail.variant && (
                      <>
                        <div className="text-sm font-semibold text-muted-foreground">Varian</div>
                        <Badge variant="secondary" className="w-fit">{detail.variant}</Badge>
                      </>
                    )}
                    
                    <div className="text-sm font-semibold text-muted-foreground">Jenis</div>
                    <Badge className={cn(
                      "w-fit",
                      detailDialog.type === "in" 
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    )}>
                      {detail.jenis_stok_masuk?.name || detail.jenis_stok_keluar?.name}
                    </Badge>
                    
                    {detail.tujuan_category && (
                      <>
                        <div className="text-sm font-semibold text-muted-foreground">Tujuan</div>
                        <Badge className="w-fit bg-destructive/10 text-destructive hover:bg-destructive/20">{detail.tujuan_category}</Badge>
                      </>
                    )}
                    
                    {detail.cabang && (
                      <>
                        <div className="text-sm font-semibold text-muted-foreground">Cabang</div>
                        <div className="text-sm font-medium">{detail.cabang.name}</div>
                      </>
                    )}
                    
                    <div className="text-sm font-semibold text-muted-foreground">Jumlah</div>
                    <div className={cn(
                      "text-2xl font-bold",
                      detailDialog.type === "in" ? "text-primary" : "text-destructive"
                    )}>{detail.qty}</div>
                    
                    {detail.plat_nomor && (
                      <>
                        <div className="text-sm font-semibold text-muted-foreground">Plat Nomor</div>
                        <div className="text-sm font-medium font-mono">{detail.plat_nomor}</div>
                      </>
                    )}
                    
                    {detail.supir && (
                      <>
                        <div className="text-sm font-semibold text-muted-foreground">Supir</div>
                        <div className="text-sm font-medium">{detail.supir}</div>
                      </>
                    )}
                    
                    {detail.no_surat_jalan && (
                      <>
                        <div className="text-sm font-semibold text-muted-foreground">No. Surat Jalan</div>
                        <div className="text-sm font-medium font-mono">{detail.no_surat_jalan}</div>
                      </>
                    )}
                    
                    {detail.keterangan && (
                      <>
                        <div className="text-sm font-semibold text-muted-foreground">Keterangan</div>
                        <div className="text-sm">{detail.keterangan}</div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PergerakanStok() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <PergerakanStokContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

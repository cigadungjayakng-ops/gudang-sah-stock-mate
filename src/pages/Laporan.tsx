import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Package } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  variants: any;
  user_id: string;
}

interface User {
  id: string;
  name: string;
}

function LaporanContent() {
  const { user, userRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState("stok-produk");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Filters for Laporan Stok Produk
  const [productFilter, setProductFilter] = useState("");
  const [variantFilter, setVariantFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // Preview data
  const [stockPreview, setStockPreview] = useState<any[]>([]);
  const [stockInPreview, setStockInPreview] = useState<any[]>([]);
  const [stockOutPreview, setStockOutPreview] = useState<any[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [user, userRole]);

  useEffect(() => {
    if (activeTab === "stok-produk") fetchStockPreview();
    if (activeTab === "stok-masuk") fetchStockInPreview();
    if (activeTab === "stok-keluar") fetchStockOutPreview();
  }, [activeTab, productFilter, variantFilter, dateRange, user]);

  const fetchProducts = async () => {
    if (!user) return;
    const query = userRole === "user"
      ? supabase.from("products").select("*").eq("user_id", user.id)
      : supabase.from("products").select("*");
    const { data } = await query;
    setProducts(data || []);
  };

  const fetchStockPreview = async () => {
    if (!user) return;
    
    let stockInQuery = supabase
      .from("stock_in")
      .select("product_id, variant, qty, products(name, user_id), profiles!stock_in_user_id_fkey(name)")
      .gte("created_at", dateRange.from.toISOString())
      .lte("created_at", dateRange.to.toISOString());

    let stockOutQuery = supabase
      .from("stock_out")
      .select("product_id, variant, qty")
      .gte("created_at", dateRange.from.toISOString())
      .lte("created_at", dateRange.to.toISOString());

    if (userRole === "user") {
      stockInQuery = stockInQuery.eq("user_id", user.id);
      stockOutQuery = stockOutQuery.eq("user_id", user.id);
    }

    if (productFilter) {
      stockInQuery = stockInQuery.eq("product_id", productFilter);
      stockOutQuery = stockOutQuery.eq("product_id", productFilter);
    }

    const [{ data: stockIn }, { data: stockOut }] = await Promise.all([
      stockInQuery,
      stockOutQuery,
    ]);

    const stockMap = new Map<string, any>();

    stockIn?.forEach((item: any) => {
      const key = `${item.product_id}-${item.variant || "null"}`;
      const current = stockMap.get(key) || { 
        product_name: item.products?.name || "", 
        variant: item.variant,
        stock_in: 0,
        stock_out: 0,
        owner: userRole === "superadmin" ? item.profiles?.name : null,
      };
      stockMap.set(key, { ...current, stock_in: current.stock_in + item.qty });
    });

    stockOut?.forEach((item: any) => {
      const key = `${item.product_id}-${item.variant || "null"}`;
      const current = stockMap.get(key);
      if (current) {
        stockMap.set(key, { ...current, stock_out: current.stock_out + item.qty });
      }
    });

    const preview = Array.from(stockMap.entries())
      .map(([, value]) => ({
        ...value,
        stock: value.stock_in - value.stock_out,
      }))
      .filter(item => !variantFilter || item.variant === variantFilter)
      .slice(0, 10);

    setStockPreview(preview);
  };

  const fetchStockInPreview = async () => {
    if (!user) return;

    let query = supabase
      .from("stock_in")
      .select("*, products(name, user_id), jenis_stok_masuk(name), profiles!stock_in_user_id_fkey(name)")
      .gte("created_at", dateRange.from.toISOString())
      .lte("created_at", dateRange.to.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    if (userRole === "user") {
      query = query.eq("user_id", user.id);
    }

    if (productFilter) {
      query = query.eq("product_id", productFilter);
    }

    const { data } = await query;
    
    const filtered = data?.filter(item => !variantFilter || item.variant === variantFilter) || [];
    setStockInPreview(filtered);
  };

  const fetchStockOutPreview = async () => {
    if (!user) return;

    let query = supabase
      .from("stock_out")
      .select("*, products(name, user_id), jenis_stok_keluar(name), profiles!stock_out_user_id_fkey(name)")
      .gte("created_at", dateRange.from.toISOString())
      .lte("created_at", dateRange.to.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    if (userRole === "user") {
      query = query.eq("user_id", user.id);
    }

    if (productFilter) {
      query = query.eq("product_id", productFilter);
    }

    const { data } = await query;
    
    const filtered = data?.filter(item => !variantFilter || item.variant === variantFilter) || [];
    setStockOutPreview(filtered);
  };

  const selectedProduct = products.find(p => p.id === productFilter);
  const hasVariants = selectedProduct?.variants && selectedProduct.variants.length > 0;

  const generatePDF = async (type: 'stock' | 'stock-in' | 'stock-out') => {
    setIsGenerating(true);
    try {
      let query;
      let filename;
      let title;

      if (type === 'stock') {
        let stockInQuery = supabase
          .from("stock_in")
          .select("product_id, variant, qty, products(name, user_id), profiles!stock_in_user_id_fkey(name)")
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());

        let stockOutQuery = supabase
          .from("stock_out")
          .select("product_id, variant, qty")
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());

        if (userRole === "user" && user) {
          stockInQuery = stockInQuery.eq("user_id", user.id);
          stockOutQuery = stockOutQuery.eq("user_id", user.id);
        }

        if (productFilter) {
          stockInQuery = stockInQuery.eq("product_id", productFilter);
          stockOutQuery = stockOutQuery.eq("product_id", productFilter);
        }

        const [{ data: stockIn }, { data: stockOut }] = await Promise.all([stockInQuery, stockOutQuery]);

        const stockMap = new Map<string, any>();

        stockIn?.forEach((item: any) => {
          const key = `${item.product_id}-${item.variant || "null"}`;
          const current = stockMap.get(key) || {
            product_name: item.products?.name || "",
            variant: item.variant,
            stock_in: 0,
            stock_out: 0,
            owner: userRole === "superadmin" ? item.profiles?.name : null,
          };
          stockMap.set(key, { ...current, stock_in: current.stock_in + item.qty });
        });

        stockOut?.forEach((item: any) => {
          const key = `${item.product_id}-${item.variant || "null"}`;
          const current = stockMap.get(key);
          if (current) {
            stockMap.set(key, { ...current, stock_out: current.stock_out + item.qty });
          }
        });

        const data = Array.from(stockMap.entries())
          .map(([, value]) => ({
            ...value,
            stock: value.stock_in - value.stock_out,
          }))
          .filter(item => !variantFilter || item.variant === variantFilter);

        downloadCSV(data, 'laporan-stok-produk', ['product_name', 'variant', 'owner', 'stock_in', 'stock_out', 'stock']);
      } else if (type === 'stock-in') {
        query = supabase
          .from("stock_in")
          .select("*, products(name, user_id), jenis_stok_masuk(name), profiles!stock_in_user_id_fkey(name)")
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString())
          .order("created_at", { ascending: false });

        if (userRole === "user" && user) {
          query = query.eq("user_id", user.id);
        }

        if (productFilter) {
          query = query.eq("product_id", productFilter);
        }

        const { data } = await query;
        const filtered = data?.filter(item => !variantFilter || item.variant === variantFilter)
          .map((item: any) => ({
            tanggal: format(new Date(item.created_at), "dd/MM/yyyy"),
            produk: item.products?.name,
            variant: item.variant || '-',
            owner: userRole === "superadmin" ? item.profiles?.name : undefined,
            jenis: item.jenis_stok_masuk?.name,
            qty: item.qty
          })) || [];

        downloadCSV(filtered, 'laporan-stok-masuk', ['tanggal', 'produk', 'variant', 'owner', 'jenis', 'qty']);
      } else {
        query = supabase
          .from("stock_out")
          .select("*, products(name, user_id), jenis_stok_keluar(name), profiles!stock_out_user_id_fkey(name)")
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString())
          .order("created_at", { ascending: false });

        if (userRole === "user" && user) {
          query = query.eq("user_id", user.id);
        }

        if (productFilter) {
          query = query.eq("product_id", productFilter);
        }

        const { data } = await query;
        const filtered = data?.filter(item => !variantFilter || item.variant === variantFilter)
          .map((item: any) => ({
            tanggal: format(new Date(item.created_at), "dd/MM/yyyy"),
            produk: item.products?.name,
            variant: item.variant || '-',
            owner: userRole === "superadmin" ? item.profiles?.name : undefined,
            jenis: item.jenis_stok_keluar?.name,
            qty: item.qty
          })) || [];

        downloadCSV(filtered, 'laporan-stok-keluar', ['tanggal', 'produk', 'variant', 'owner', 'jenis', 'qty']);
      }

      toast({
        title: "Berhasil",
        description: "Laporan berhasil diunduh",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengunduh laporan",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCSV = (data: any[], filename: string, headers: string[]) => {
    const filteredHeaders = userRole === "superadmin" ? headers : headers.filter(h => h !== 'owner');
    const csvHeaders = filteredHeaders.join(',');
    const csvRows = data.map(row =>
      filteredHeaders.map(header => {
        const value = row[header];
        return value !== undefined && value !== null ? `"${value}"` : '""';
      }).join(',')
    );
    const csv = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Laporan</h1>
        <p className="text-muted-foreground">Cetak dan unduh laporan stok gudang</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stok-produk">Laporan Stok Produk</TabsTrigger>
          <TabsTrigger value="stok-masuk">Riwayat Stok Masuk</TabsTrigger>
          <TabsTrigger value="stok-keluar">Riwayat Stok Keluar</TabsTrigger>
        </TabsList>

        {/* Filters */}
        <Card className="mt-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Produk</Label>
              <Combobox
                options={[
                  { value: "", label: "Semua Produk" },
                  ...products.map(p => ({ value: p.id, label: p.name }))
                ]}
                value={productFilter}
                onValueChange={(value) => {
                  setProductFilter(value);
                  setVariantFilter("");
                }}
                placeholder="Semua Produk"
                searchPlaceholder="Cari produk..."
                emptyText="Produk tidak ditemukan"
              />
            </div>

            {hasVariants && (
              <div className="space-y-2">
                <Label>Varian</Label>
                <Select value={variantFilter} onValueChange={setVariantFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Varian" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Semua Varian</SelectItem>
                    {selectedProduct.variants.map((variant: string) => (
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
                      ? `${format(dateRange.from, "dd/MM/yy")} - ${format(dateRange.to, "dd/MM/yy")}`
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range?.from) {
                        const fromDate = new Date(range.from);
                        fromDate.setHours(0, 0, 0, 0);

                        const toDate = range.to ? new Date(range.to) : new Date(range.from);
                        toDate.setHours(23, 59, 59, 999);

                        setDateRange({
                          from: fromDate,
                          to: toDate,
                        });
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </Card>

        <TabsContent value="stok-produk">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Preview Laporan Stok Produk</CardTitle>
                <CardDescription>Menampilkan 10 item pertama</CardDescription>
              </div>
              <Button onClick={() => generatePDF('stock')} disabled={isGenerating}>
                <Download className="mr-2 h-4 w-4" />
                {isGenerating ? "Mengunduh..." : "Unduh CSV"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Varian</TableHead>
                    {userRole === "superadmin" && <TableHead>Pemilik</TableHead>}
                    <TableHead className="text-right">Masuk</TableHead>
                    <TableHead className="text-right">Keluar</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockPreview.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={userRole === "superadmin" ? 6 : 5} className="text-center text-muted-foreground">
                        Tidak ada data
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockPreview.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>
                          {item.variant ? <Badge variant="secondary">{item.variant}</Badge> : "-"}
                        </TableCell>
                        {userRole === "superadmin" && <TableCell className="text-sm text-muted-foreground">{item.owner || "-"}</TableCell>}
                        <TableCell className="text-right">{item.stock_in}</TableCell>
                        <TableCell className="text-right">{item.stock_out}</TableCell>
                        <TableCell className="text-right font-bold">{item.stock}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stok-masuk">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Preview Riwayat Stok Masuk</CardTitle>
                <CardDescription>Menampilkan 10 transaksi terakhir</CardDescription>
              </div>
              <Button onClick={() => generatePDF('stock-in')} disabled={isGenerating}>
                <Download className="mr-2 h-4 w-4" />
                {isGenerating ? "Mengunduh..." : "Unduh CSV"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Varian</TableHead>
                    {userRole === "superadmin" && <TableHead>Pemilik</TableHead>}
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockInPreview.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={userRole === "superadmin" ? 6 : 5} className="text-center text-muted-foreground">
                        Tidak ada data
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockInPreview.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{format(new Date(item.created_at), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">{item.products?.name}</TableCell>
                        <TableCell>
                          {item.variant ? <Badge variant="secondary">{item.variant}</Badge> : "-"}
                        </TableCell>
                        {userRole === "superadmin" && <TableCell className="text-sm text-muted-foreground">{item.profiles?.name || "-"}</TableCell>}
                        <TableCell>{item.jenis_stok_masuk?.name}</TableCell>
                        <TableCell className="text-right font-medium">{item.qty}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stok-keluar">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Preview Riwayat Stok Keluar</CardTitle>
                <CardDescription>Menampilkan 10 transaksi terakhir</CardDescription>
              </div>
              <Button onClick={() => generatePDF('stock-out')} disabled={isGenerating}>
                <Download className="mr-2 h-4 w-4" />
                {isGenerating ? "Mengunduh..." : "Unduh CSV"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Varian</TableHead>
                    {userRole === "superadmin" && <TableHead>Pemilik</TableHead>}
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockOutPreview.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={userRole === "superadmin" ? 6 : 5} className="text-center text-muted-foreground">
                        Tidak ada data
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockOutPreview.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{format(new Date(item.created_at), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="font-medium">{item.products?.name}</TableCell>
                        <TableCell>
                          {item.variant ? <Badge variant="secondary">{item.variant}</Badge> : "-"}
                        </TableCell>
                        {userRole === "superadmin" && <TableCell className="text-sm text-muted-foreground">{item.profiles?.name || "-"}</TableCell>}
                        <TableCell>{item.jenis_stok_keluar?.name}</TableCell>
                        <TableCell className="text-right font-medium">{item.qty}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Laporan() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <LaporanContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  }, [activeTab, productFilter, variantFilter, dateRange]);

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
  const hasVariants = productFilter && selectedProduct?.variants && Array.isArray(selectedProduct.variants) && selectedProduct.variants.length > 0;

  const downloadStockPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("Laporan Stok Produk", 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`, 14, 22);
    
    const tableData = stockPreview.map(item => [
      item.products?.name || "-",
      item.variant || "-",
      item.stock?.toString() || "0",
    ]);

    autoTable(doc, {
      head: [["Produk", "Varian", "Stok"]],
      body: tableData,
      startY: 28,
    });

    doc.save(`Laporan-Stok-${format(new Date(), "ddMMyyyy-HHmmss")}.pdf`);
    toast({ title: "Sukses", description: "PDF berhasil diunduh" });
  };

  const downloadStockInPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("Riwayat Stok Masuk", 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`, 14, 22);
    
    const tableData = stockInPreview.map(item => [
      format(new Date(item.created_at), "dd/MM/yyyy"),
      item.products?.name || "-",
      item.variant || "-",
      item.qty?.toString() || "0",
      item.jenis_stok_masuk?.name || "-",
      item.cabang?.name || "-",
    ]);

    autoTable(doc, {
      head: [["Tanggal", "Produk", "Varian", "Qty", "Jenis", "Cabang"]],
      body: tableData,
      startY: 28,
    });

    doc.save(`Riwayat-Stok-Masuk-${format(new Date(), "ddMMyyyy-HHmmss")}.pdf`);
    toast({ title: "Sukses", description: "PDF berhasil diunduh" });
  };

  const downloadStockOutPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text("Riwayat Stok Keluar", 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`, 14, 22);
    
    const tableData = stockOutPreview.map(item => [
      format(new Date(item.created_at), "dd/MM/yyyy"),
      item.products?.name || "-",
      item.variant || "-",
      item.qty?.toString() || "0",
      item.jenis_stok_keluar?.name || "-",
      item.tujuan_category || "-",
    ]);

    autoTable(doc, {
      head: [["Tanggal", "Produk", "Varian", "Qty", "Jenis", "Tujuan"]],
      body: tableData,
      startY: 28,
    });

    doc.save(`Riwayat-Stok-Keluar-${format(new Date(), "ddMMyyyy-HHmmss")}.pdf`);
    toast({ title: "Sukses", description: "PDF berhasil diunduh" });
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
                options={products.map(p => ({ value: p.id, label: p.name }))}
                value={productFilter}
                onValueChange={setProductFilter}
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

        <TabsContent value="stok-produk">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Preview Laporan Stok Produk</CardTitle>
                <CardDescription>Menampilkan 10 item pertama</CardDescription>
              </div>
              <Button onClick={downloadStockPDF}>
                <Download className="mr-2 h-4 w-4" />
                Unduh PDF
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
              <Button variant="secondary" onClick={downloadStockInPDF}>
                <Download className="mr-2 h-4 w-4" />
                Unduh PDF
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
              <Button variant="outline" onClick={downloadStockOutPDF}>
                <Download className="mr-2 h-4 w-4" />
                Unduh PDF
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

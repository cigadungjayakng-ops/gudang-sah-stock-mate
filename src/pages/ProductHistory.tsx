import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface HistoryItem {
  id: string;
  created_at: string;
  type: "IN" | "OUT";
  variant: string | null;
  stok_awal: number;
  qty: number;
  sisa_stok: number;
  jenis: string;
  keterangan: string | null;
}

function ProductHistoryContent() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date>(new Date());
  const [dateTo, setDateTo] = useState<Date>(new Date());

  useEffect(() => {
    if (productId) {
      fetchProductAndHistory();
    }
  }, [productId, selectedVariant, dateFrom, dateTo]);

  const fetchProductAndHistory = async () => {
    if (!productId || !user) return;

    // Fetch product details
    const { data: productData } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productData) {
      setProduct(productData);
    }

    // Fetch stock in history
    let stockInQuery = supabase
      .from("stock_in")
      .select("id, created_at, variant, qty, jenis_stok_masuk(name), keterangan")
      .eq("product_id", productId)
      .gte("created_at", format(dateFrom, "yyyy-MM-dd"))
      .lte("created_at", format(dateTo, "yyyy-MM-dd") + "T23:59:59");

    if (userRole === "user") {
      stockInQuery = stockInQuery.eq("user_id", user.id);
    }

    if (selectedVariant !== "all") {
      stockInQuery = stockInQuery.eq("variant", selectedVariant);
    }

    const { data: stockInData } = await stockInQuery;

    // Fetch stock out history
    let stockOutQuery = supabase
      .from("stock_out")
      .select("id, created_at, variant, qty, jenis_stok_keluar(name), keterangan")
      .eq("product_id", productId)
      .gte("created_at", format(dateFrom, "yyyy-MM-dd"))
      .lte("created_at", format(dateTo, "yyyy-MM-dd") + "T23:59:59");

    if (userRole === "user") {
      stockOutQuery = stockOutQuery.eq("user_id", user.id);
    }

    if (selectedVariant !== "all") {
      stockOutQuery = stockOutQuery.eq("variant", selectedVariant);
    }

    const { data: stockOutData } = await stockOutQuery;

    // Get stock before date range
    const { data: stockBeforeIn } = await supabase
      .from("stock_in")
      .select("qty, variant")
      .eq("product_id", productId)
      .lt("created_at", format(dateFrom, "yyyy-MM-dd"));
    
    const { data: stockBeforeOut } = await supabase
      .from("stock_out")
      .select("qty, variant")
      .eq("product_id", productId)
      .lt("created_at", format(dateFrom, "yyyy-MM-dd"));

    // Combine and calculate running stock
    const allItems = [
      ...(stockInData || []).map((item: any) => ({ ...item, type: "IN" as const })),
      ...(stockOutData || []).map((item: any) => ({ ...item, type: "OUT" as const })),
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    let runningStock = (stockBeforeIn?.reduce((sum, i: any) => sum + i.qty, 0) || 0) - 
                       (stockBeforeOut?.reduce((sum, i: any) => sum + i.qty, 0) || 0);

    const combined: HistoryItem[] = allItems.map((item: any) => {
      const stok_awal = runningStock;
      runningStock += item.type === "IN" ? item.qty : -item.qty;
      return {
        id: item.id,
        created_at: item.created_at,
        type: item.type,
        variant: item.variant,
        stok_awal,
        qty: item.qty,
        sisa_stok: runningStock,
        jenis: item.type === "IN" ? item.jenis_stok_masuk?.name || "-" : item.jenis_stok_keluar?.name || "-",
        keterangan: item.keterangan,
      };
    });

    combined.reverse();
    setHistory(combined);
    setLoading(false);
  };

  const variants = product?.variants || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/produk")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">History Produk: {product?.name}</h1>
          <p className="text-muted-foreground">Riwayat stok masuk dan keluar</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Varian</Label>
            <Select value={selectedVariant} onValueChange={setSelectedVariant}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Varian</SelectItem>
                {variants.map((variant: string, idx: number) => (
                  <SelectItem key={idx} value={variant}>
                    {variant}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Dari Tanggal</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  {format(dateFrom, "PPP", { locale: localeId })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateFrom} onSelect={(date) => date && setDateFrom(date)} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Sampai Tanggal</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  {format(dateTo, "PPP", { locale: localeId })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={dateTo} onSelect={(date) => date && setDateTo(date)} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>

      <Card className="shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Varian</TableHead>
              <TableHead className="text-right">Stok Awal</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Sisa Stok</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Belum ada riwayat
                </TableCell>
              </TableRow>
            ) : (
              history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{format(new Date(item.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}</TableCell>
                  <TableCell>
                    <Badge variant={item.type === "IN" ? "default" : "destructive"}>
                      {item.type === "IN" ? "Masuk" : "Keluar"}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.jenis}</TableCell>
                  <TableCell>{item.variant || "-"}</TableCell>
                  <TableCell className="text-right">{item.stok_awal}</TableCell>
                  <TableCell className="text-right font-medium">{item.qty}</TableCell>
                  <TableCell className="text-right font-bold">{item.sisa_stok}</TableCell>
                  <TableCell className="text-muted-foreground">{item.keterangan || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default function ProductHistory() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ProductHistoryContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

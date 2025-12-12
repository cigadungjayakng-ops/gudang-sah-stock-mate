import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useProductStockOptimized } from "@/hooks/useProductStockOptimized";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  variants: any;
}

interface OpnameFormData {
  product_id: string;
  variant: string;
  qty_after: number;
  reason: string;
}

interface OpnameRecord {
  id: string;
  created_at: string;
  product_id: string;
  variant: string | null;
  qty_before: number;
  qty_after: number;
  qty_difference: number;
  reason: string;
  products: { name: string };
}

function OpnameStokContent() {
  const { user, userRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [opnameRecords, setOpnameRecords] = useState<OpnameRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [filterProductId, setFilterProductId] = useState<string>("all");
  const [formData, setFormData] = useState<OpnameFormData>({
    product_id: "",
    variant: "",
    qty_after: 0,
    reason: "",
  });

  const itemsPerPage = 20;
  const selectedProduct = products.find(p => p.id === formData.product_id);
  const hasVariants = selectedProduct?.variants && Array.isArray(selectedProduct.variants) && selectedProduct.variants.length > 0;
  
  const { stockInfo } = useProductStockOptimized(formData.product_id || "");
  
  const currentStock = formData.product_id 
    ? stockInfo.find(s => s.variant === (hasVariants && formData.variant ? formData.variant : null))?.stock || 0
    : 0;

  useEffect(() => {
    fetchProducts();
    fetchOpnameRecords();
  }, [user, currentPage, dateFrom, dateTo, filterProductId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, filterProductId]);

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
    }
  };

  const fetchOpnameRecords = async () => {
    if (!user) return;

    setLoading(true);
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = userRole === "user"
      ? supabase
          .from("stock_opname")
          .select("*, products(name)", { count: "exact" })
          .eq("user_id", user.id)
      : supabase
          .from("stock_opname")
          .select("*, products(name)", { count: "exact" });

    // Apply date filters
    if (dateFrom) {
      query = query.gte("created_at", format(dateFrom, "yyyy-MM-dd"));
    }
    if (dateTo) {
      query = query.lte("created_at", format(dateTo, "yyyy-MM-dd") + "T23:59:59");
    }
    // Apply product filter
    if (filterProductId && filterProductId !== "all") {
      query = query.eq("product_id", filterProductId);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setOpnameRecords(data || []);
      setTotalCount(count || 0);
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !formData.product_id || !formData.reason.trim()) {
      toast({
        title: "Error",
        description: "Harap isi semua field yang diperlukan",
        variant: "destructive",
      });
      return;
    }

    if (hasVariants && !formData.variant) {
      toast({
        title: "Error",
        description: "Harap pilih varian produk",
        variant: "destructive",
      });
      return;
    }

    const qty_before = currentStock;
    const qty_difference = formData.qty_after - qty_before;

    // Insert opname record
    const { error: opnameError } = await supabase.from("stock_opname").insert({
      product_id: formData.product_id,
      variant: hasVariants ? formData.variant : null,
      qty_before,
      qty_after: formData.qty_after,
      qty_difference,
      reason: formData.reason,
      user_id: user.id,
    });

    if (opnameError) {
      toast({ title: "Error", description: opnameError.message, variant: "destructive" });
      return;
    }

    // Update actual stock by creating stock_in or stock_out entry
    if (qty_difference !== 0) {
      if (qty_difference > 0) {
        // Stock increased - create stock_in entry with "Opname Stok" type
        const { data: opnameType } = await supabase
          .from("jenis_stok_masuk")
          .select("id")
          .eq("name", "Opname Stok")
          .maybeSingle();

        if (!opnameType) {
          toast({ title: "Warning", description: "Jenis 'Opname Stok' tidak ditemukan di jenis stok masuk", variant: "destructive" });
          return;
        }

        const { error: stockInError } = await supabase.from("stock_in").insert({
          user_id: user.id,
          product_id: formData.product_id,
          variant: hasVariants ? formData.variant : null,
          qty: Math.abs(qty_difference),
          jenis_stok_masuk_id: opnameType.id,
          keterangan: `Penyesuaian stok dari opname: ${formData.reason}`,
        });

        if (stockInError) {
          toast({ title: "Warning", description: "Opname recorded but stock adjustment failed: " + stockInError.message, variant: "destructive" });
        }
      } else {
        // Stock decreased - create stock_out entry with "Opname Stok" type
        const { data: opnameType } = await supabase
          .from("jenis_stok_keluar")
          .select("id")
          .eq("name", "Opname Stok")
          .maybeSingle();

        if (!opnameType) {
          toast({ title: "Warning", description: "Jenis 'Opname Stok' tidak ditemukan di jenis stok keluar", variant: "destructive" });
          return;
        }

        const { error: stockOutError } = await supabase.from("stock_out").insert({
          user_id: user.id,
          product_id: formData.product_id,
          variant: hasVariants ? formData.variant : null,
          qty: Math.abs(qty_difference),
          jenis_stok_keluar_id: opnameType.id,
          tujuan_category: "SAJ_PUSAT",
          keterangan: `Penyesuaian stok dari opname: ${formData.reason}`,
        });

        if (stockOutError) {
          toast({ title: "Warning", description: "Opname recorded but stock adjustment failed: " + stockOutError.message, variant: "destructive" });
        }
      }
    }

    toast({ title: "Sukses", description: "Opname stok berhasil ditambahkan dan stok disesuaikan" });
    setShowDialog(false);
    setFormData({ product_id: "", variant: "", qty_after: 0, reason: "" });
    fetchOpnameRecords();
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Opname Stok</h1>
          <p className="text-muted-foreground">Kelola penyesuaian stok produk</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Opname
        </Button>
      </div>

      {/* Filter Card */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Produk</Label>
            <Combobox
              options={[
                { value: "all", label: "Semua Produk" },
                ...products.map((p) => ({ value: p.id, label: p.name }))
              ]}
              value={filterProductId}
              onValueChange={setFilterProductId}
              placeholder="Pilih produk"
              searchPlaceholder="Cari produk..."
              emptyText="Produk tidak ditemukan"
            />
          </div>

          <div className="space-y-2">
            <Label>Dari Tanggal</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP", { locale: localeId }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Sampai Tanggal</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP", { locale: localeId }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {(dateFrom || dateTo || filterProductId !== "all") && (
          <div className="mt-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
                setFilterProductId("all");
              }}
            >
              Reset Filter
            </Button>
          </div>
        )}
      </Card>

      <Card className="shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Varian</TableHead>
              <TableHead className="text-right">Stok Sebelum</TableHead>
              <TableHead className="text-right">Stok Sesudah</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead>Alasan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : opnameRecords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Belum ada data opname
                </TableCell>
              </TableRow>
            ) : (
              opnameRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {new Date(record.created_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{record.products.name}</TableCell>
                  <TableCell>
                    {record.variant ? (
                      <Badge variant="secondary">{record.variant}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{record.qty_before}</TableCell>
                  <TableCell className="text-right">{record.qty_after}</TableCell>
                  <TableCell className="text-right">
                    <span className={record.qty_difference >= 0 ? "text-primary" : "text-destructive"}>
                      {record.qty_difference > 0 ? "+" : ""}
                      {record.qty_difference}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{record.reason}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Total {totalCount} data - Halaman {currentPage} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Berikutnya
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Opname Stok</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produk *</Label>
              <Combobox
                options={products.map((p) => ({ value: p.id, label: p.name }))}
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value, variant: "" })}
                placeholder="Pilih produk"
                searchPlaceholder="Cari produk..."
                emptyText="Produk tidak ditemukan"
              />
            </div>

            {hasVariants && (
              <div className="space-y-2">
                <Label>Varian *</Label>
                <Select
                  value={formData.variant}
                  onValueChange={(value) => setFormData({ ...formData, variant: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih varian" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProduct.variants.map((variant) => (
                      <SelectItem key={variant} value={variant}>
                        {variant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.product_id && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Stok Saat Ini:</p>
                <p className="text-2xl font-bold">{currentStock}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Stok Sesudah Opname *</Label>
              <Input
                type="number"
                value={formData.qty_after}
                onChange={(e) => setFormData({ ...formData, qty_after: parseInt(e.target.value) || 0 })}
                placeholder="Masukkan jumlah stok"
              />
            </div>

            <div className="space-y-2">
              <Label>Alasan Penyesuaian *</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Jelaskan alasan penyesuaian stok"
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmit}>Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OpnameStok() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <OpnameStokContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

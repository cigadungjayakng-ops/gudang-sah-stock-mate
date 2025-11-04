import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, AlertTriangle, Eye, Search, ChevronLeft, ChevronRight, X, CalendarIcon, List } from "lucide-react";
import { BulkStockOutForm } from "@/components/BulkStockOutForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";

interface StockOutFormData {
  product_id: string;
  variant: string;
  tujuan_category: string;
  jenis_stok_keluar_id: string;
  cabang_id: string;
  qty: string;
  plat_nomor: string;
  supir: string;
  mandor: string;
  no_surat_jalan: string;
  keterangan: string;
}

function StokKeluarContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [jenisStokKeluar, setJenisStokKeluar] = useState<any[]>([]);
  const [cabang, setCabang] = useState<any[]>([]);
  const [stockOutData, setStockOutData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [formData, setFormData] = useState<StockOutFormData>({
    product_id: "",
    variant: "",
    tujuan_category: "",
    jenis_stok_keluar_id: "",
    cabang_id: "",
    qty: "",
    plat_nomor: "",
    supir: "",
    mandor: "",
    no_surat_jalan: "",
    keterangan: "",
  });
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  // Filter state
  const [filterProduct, setFilterProduct] = useState("");
  const [filterVariant, setFilterVariant] = useState("");
  const [filterJenis, setFilterJenis] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  // Date range filter
  const [dateFrom, setDateFrom] = useState<Date>(startOfDay(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfDay(new Date()));
  const { user, userRole } = useAuth();

  useEffect(() => {
    fetchInitialData();
  }, [user]);

  useEffect(() => {
    fetchStockOutData();
  }, [user, currentPage, itemsPerPage, filterProduct, filterVariant, filterJenis, searchQuery, dateFrom, dateTo]);

  // Get variants for selected product
  const [productVariants, setProductVariants] = useState<string[]>([]);
  
  useEffect(() => {
    if (filterProduct && filterProduct !== "all") {
      // Cari produk yang dipilih
      const selectedProduct = products.find(p => p.id === filterProduct);
      
      // Jika produk memiliki varian yang sudah didefinisikan, gunakan itu
      if (selectedProduct && selectedProduct.variants && selectedProduct.variants.length > 0) {
        setProductVariants(selectedProduct.variants);
      } else {
        // Jika tidak, ambil dari data stok yang ada
        const variants = stockOutData
          .filter(item => item.product_id === filterProduct && item.variant)
          .map(item => item.variant)
          .filter((variant, index, self) => variant && self.indexOf(variant) === index);
        
        setProductVariants(variants);
      }
      
      // Reset variant filter when changing product
      setFilterVariant("all");
    } else {
      setProductVariants([]);
      setFilterVariant("all");
    }
  }, [filterProduct, stockOutData, products]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const fetchInitialData = async () => {
    if (!user) return;

    const [productsRes, jenisRes, cabangRes] = await Promise.all([
      supabase.from("products").select("*").eq("user_id", user.id),
      supabase.from("jenis_stok_keluar").select("*"),
      supabase.from("cabang").select("*"),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (jenisRes.data) setJenisStokKeluar(jenisRes.data);
    if (cabangRes.data) setCabang(cabangRes.data);
  };

  const fetchStockOutData = async () => {
    if (!user) return;

    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
      .from("stock_out")
      .select("*, products(name), jenis_stok_keluar(name), cabang(name)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (userRole === "user") {
      query = query.eq("user_id", user.id);
    }

    // Apply filters
    if (filterProduct && filterProduct !== "all") {
      query = query.eq("product_id", filterProduct);
    }

    if (filterVariant && filterVariant !== "all") {
      query = query.eq("variant", filterVariant);
    }

    if (filterJenis && filterJenis !== "all") {
      query = query.eq("jenis_stok_keluar_id", filterJenis);
    }

    if (searchQuery) {
      query = query.or(`plat_nomor.ilike.%${searchQuery}%,supir.ilike.%${searchQuery}%,mandor.ilike.%${searchQuery}%`);
    }

    // Apply date range filter
    if (dateFrom) {
      query = query.gte("created_at", dateFrom.toISOString());
    }
    if (dateTo) {
      query = query.lte("created_at", dateTo.toISOString());
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setStockOutData(data || []);
      setTotalCount(count || 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from("stock_out").insert({
      user_id: user.id,
      product_id: formData.product_id,
      variant: formData.variant || null,
      tujuan_category: formData.tujuan_category as any,
      jenis_stok_keluar_id: formData.jenis_stok_keluar_id,
      cabang_id: formData.cabang_id || null,
      qty: parseInt(formData.qty),
      plat_nomor: formData.plat_nomor || null,
      supir: formData.supir || null,
      mandor: formData.mandor || null,
      no_surat_jalan: formData.no_surat_jalan || null,
      keterangan: formData.keterangan || null,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Berhasil",
        description: "Data stok keluar berhasil ditambahkan",
      });
      setDialogOpen(false);
      setFormData({
        product_id: "",
        variant: "",
        tujuan_category: "",
        jenis_stok_keluar_id: "",
        cabang_id: "",
        qty: "",
        plat_nomor: "",
        supir: "",
        mandor: "",
        no_surat_jalan: "",
        keterangan: "",
      });
      fetchInitialData();
      fetchStockOutData();
    }
  };

  const selectedProduct = products.find((p) => p.id === formData.product_id);
  const filteredJenis = jenisStokKeluar.filter(
    (j) => j.tujuan_category === formData.tujuan_category
  );
  const selectedJenis = jenisStokKeluar.find((j) => j.id === formData.jenis_stok_keluar_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stok Keluar</h1>
          <p className="text-muted-foreground">Kelola data stok keluar gudang</p>
        </div>
        {userRole === "user" && (
          <div className="flex gap-2">
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <List className="mr-2 h-4 w-4" />
                  Input Banyak Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Tambah Stok Keluar (Banyak Item)</DialogTitle>
                </DialogHeader>
                <BulkStockOutForm
                  products={products}
                  jenisStokKeluar={jenisStokKeluar}
                  cabang={cabang}
                  userId={user?.id || ""}
                  onSuccess={() => {
                    setBulkDialogOpen(false);
                    fetchStockOutData();
                  }}
                  onCancel={() => setBulkDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Stok Keluar
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Stok Keluar</DialogTitle>
            </DialogHeader>

            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>⚠️ Setelah data diposting, tidak bisa dibatalkan.</AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Produk</Label>
                  <Combobox
                    options={products.map(p => ({ value: p.id, label: p.name }))}
                    value={formData.product_id}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                    placeholder="Cari produk..."
                    emptyText="Produk tidak ditemukan"
                  />
                </div>

                {selectedProduct && selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="variant">Varian</Label>
                    <Select
                      value={formData.variant}
                      onValueChange={(value) => setFormData({ ...formData, variant: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih varian" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProduct.variants.map((variant: string, idx: number) => (
                          <SelectItem key={idx} value={variant}>
                            {variant}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="tujuan">Tujuan</Label>
                  <Select
                    value={formData.tujuan_category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tujuan_category: value, jenis_stok_keluar_id: "" })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAJ_PUSAT">SAJ (PUSAT)</SelectItem>
                      <SelectItem value="CABANG">CABANG</SelectItem>
                      <SelectItem value="SUPPLIER">SUPPLIER</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.tujuan_category && (
                  <div className="space-y-2">
                    <Label htmlFor="jenis">Jenis Stok Keluar</Label>
                    <Select
                      value={formData.jenis_stok_keluar_id}
                      onValueChange={(value) => setFormData({ ...formData, jenis_stok_keluar_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih jenis" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredJenis.map((jenis) => (
                          <SelectItem key={jenis.id} value={jenis.id}>
                            {jenis.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.tujuan_category === "CABANG" && (
                  <div className="space-y-2">
                    <Label htmlFor="cabang">Cabang</Label>
                    <Select
                      value={formData.cabang_id}
                      onValueChange={(value) => setFormData({ ...formData, cabang_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih cabang" />
                      </SelectTrigger>
                      <SelectContent>
                        {cabang.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="qty">Jumlah</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="1"
                    value={formData.qty}
                    onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plat_nomor">Plat Nomor Mobil</Label>
                  <Input
                    id="plat_nomor"
                    value={formData.plat_nomor}
                    onChange={(e) => setFormData({ ...formData, plat_nomor: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supir">Supir</Label>
                  <Input
                    id="supir"
                    value={formData.supir}
                    onChange={(e) => setFormData({ ...formData, supir: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mandor">Mandor</Label>
                  <Input
                    id="mandor"
                    value={formData.mandor}
                    onChange={(e) => setFormData({ ...formData, mandor: e.target.value })}
                  />
                </div>

                {selectedJenis?.name === "Retur Supplier" && (
                  <div className="space-y-2">
                    <Label htmlFor="no_surat_jalan">No. Surat Jalan</Label>
                    <Input
                      id="no_surat_jalan"
                      value={formData.no_surat_jalan}
                      onChange={(e) => setFormData({ ...formData, no_surat_jalan: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="keterangan">Keterangan (Opsional)</Label>
                <Textarea
                  id="keterangan"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full">
                Simpan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
          </div>
        )}
      </div>

      {/* Filter and Search Section */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div>
            <Label>Tanggal Dari</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : <span>Pilih tanggal</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(date) => date && setDateFrom(startOfDay(date))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Tanggal Sampai</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : <span>Pilih tanggal</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(date) => date && setDateTo(endOfDay(date))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="search">Cari</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Cari plat nomor, supir, mandor..."
                className="pl-8 pr-8"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="filterProduct">Filter Produk</Label>
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Produk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Produk</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {productVariants.length > 0 && (
            <div>
              <Label htmlFor="filterVariant">Filter Varian</Label>
              <Select value={filterVariant} onValueChange={setFilterVariant}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Varian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Varian</SelectItem>
                  {productVariants.map((variant, index) => (
                    <SelectItem key={`variant-${index}`} value={variant || `variant-${index}`}>
                      {variant || "-"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <Label htmlFor="filterJenis">Filter Jenis</Label>
            <Select value={filterJenis} onValueChange={setFilterJenis}>
              <SelectTrigger>
                <SelectValue placeholder="Semua Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                {jenisStokKeluar.map((jenis) => (
                  <SelectItem key={jenis.id} value={jenis.id}>
                    {jenis.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Varian</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockOutData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Belum ada data stok keluar
                </TableCell>
              </TableRow>
            ) : (
              stockOutData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{new Date(item.created_at).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell>{item.products?.name}</TableCell>
                  <TableCell>{item.variant || "-"}</TableCell>
                  <TableCell>{item.jenis_stok_keluar?.name}</TableCell>
                  <TableCell className="text-right font-medium">{item.qty}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setDetailDialog(item)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Total {totalCount} data | Halaman {currentPage} dari {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Button>
              <div className="text-sm text-muted-foreground">
                Halaman {currentPage}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-destructive to-destructive/60 bg-clip-text text-transparent">
              Detail Stok Keluar
            </DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <Card className="border-destructive/20 shadow-lg">
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-[140px,1fr] gap-x-4 gap-y-3">
                  <div className="text-sm font-semibold text-muted-foreground">Tanggal</div>
                  <div className="text-sm font-medium">{new Date(detailDialog.created_at).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  
                  <div className="text-sm font-semibold text-muted-foreground">Produk</div>
                  <div className="text-sm font-medium">{detailDialog.products?.name}</div>
                  
                  {detailDialog.variant && (
                    <>
                      <div className="text-sm font-semibold text-muted-foreground">Varian</div>
                      <Badge variant="secondary" className="w-fit">{detailDialog.variant}</Badge>
                    </>
                  )}
                  
                  <div className="text-sm font-semibold text-muted-foreground">Tujuan</div>
                  <Badge className="w-fit bg-destructive/10 text-destructive hover:bg-destructive/20">{detailDialog.tujuan_category}</Badge>
                  
                  <div className="text-sm font-semibold text-muted-foreground">Jenis</div>
                  <Badge className="w-fit bg-destructive/10 text-destructive hover:bg-destructive/20">{detailDialog.jenis_stok_keluar?.name}</Badge>
                  
                  {detailDialog.cabang && (
                    <>
                      <div className="text-sm font-semibold text-muted-foreground">Cabang</div>
                      <div className="text-sm font-medium">{detailDialog.cabang.name}</div>
                    </>
                  )}
                  
                  <div className="text-sm font-semibold text-muted-foreground">Jumlah</div>
                  <div className="text-2xl font-bold text-destructive">{detailDialog.qty}</div>
                  
                  {detailDialog.plat_nomor && (
                    <>
                      <div className="text-sm font-semibold text-muted-foreground">Plat Nomor</div>
                      <div className="text-sm font-medium font-mono">{detailDialog.plat_nomor}</div>
                    </>
                  )}
                  
                  {detailDialog.supir && (
                    <>
                      <div className="text-sm font-semibold text-muted-foreground">Supir</div>
                      <div className="text-sm font-medium">{detailDialog.supir}</div>
                    </>
                  )}
                  
                  {detailDialog.no_surat_jalan && (
                    <>
                      <div className="text-sm font-semibold text-muted-foreground">No. Surat Jalan</div>
                      <div className="text-sm font-medium font-mono">{detailDialog.no_surat_jalan}</div>
                    </>
                  )}
                  
                  {detailDialog.keterangan && (
                    <>
                      <div className="text-sm font-semibold text-muted-foreground">Keterangan</div>
                      <div className="text-sm">{detailDialog.keterangan}</div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StokKeluar() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <StokKeluarContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

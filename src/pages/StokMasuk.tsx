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
import { BulkStockInForm } from "@/components/BulkStockInForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Combobox } from "@/components/ui/combobox";

interface StockInFormData {
  product_id: string;
  variant: string;
  jenis_stok_masuk_id: string;
  cabang_id: string;
  qty: string;
  plat_nomor: string;
  supir: string;
  mandor: string;
  no_surat_jalan: string;
  keterangan: string;
}

function StokMasukContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [jenisStokMasuk, setJenisStokMasuk] = useState<any[]>([]);
  const [cabang, setCabang] = useState<any[]>([]);
  const [stockInData, setStockInData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [selectedJenis, setSelectedJenis] = useState("");
  const [formData, setFormData] = useState<StockInFormData>({
    product_id: "",
    variant: "",
    jenis_stok_masuk_id: "",
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
    fetchStockInData();
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
        const variants = stockInData
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
  }, [filterProduct, stockInData, products]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  
  const fetchInitialData = async () => {
    if (!user) return;

    const [productsRes, jenisRes, cabangRes] = await Promise.all([
      supabase.from("products").select("*").eq("user_id", user.id),
      supabase.from("jenis_stok_masuk").select("*"),
      supabase.from("cabang").select("*"),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (jenisRes.data) setJenisStokMasuk(jenisRes.data);
    if (cabangRes.data) setCabang(cabangRes.data);
  };

  const fetchStockInData = async () => {
    if (!user) return;

    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
      .from("stock_in")
      .select("*, products(name), jenis_stok_masuk(name), cabang(name)", { count: "exact" })
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
      query = query.eq("jenis_stok_masuk_id", filterJenis);
    }

    if (searchQuery) {
      // For global search, we need to use or filter
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
      setStockInData(data || []);
      setFilteredData(data || []);
      setTotalCount(count || 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from("stock_in").insert({
      user_id: user.id,
      product_id: formData.product_id,
      variant: formData.variant || null,
      jenis_stok_masuk_id: formData.jenis_stok_masuk_id,
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
        description: "Data stok masuk berhasil ditambahkan",
      });
      setDialogOpen(false);
      setFormData({
        product_id: "",
        variant: "",
        jenis_stok_masuk_id: "",
        cabang_id: "",
        qty: "",
        plat_nomor: "",
        supir: "",
        mandor: "",
        no_surat_jalan: "",
        keterangan: "",
      });
      setSelectedJenis("");
      fetchInitialData();
      fetchStockInData();
    }
  };

  const getJenisName = (jenisId: string) => {
    const jenis = jenisStokMasuk.find((j) => j.id === jenisId);
    return jenis?.name || "";
  };

  const selectedProduct = products.find((p) => p.id === formData.product_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Stok Masuk</h1>
          <p className="text-muted-foreground">Kelola data stok masuk gudang</p>
        </div>
        {userRole === "user" && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Stok Masuk
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Stok Masuk</DialogTitle>
            </DialogHeader>
            <BulkStockInForm
              products={products}
              jenisStokMasuk={jenisStokMasuk}
              cabang={cabang}
              userId={user?.id || ""}
              onSuccess={() => {
                setDialogOpen(false);
                fetchStockInData();
              }}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
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
                {jenisStokMasuk.map((jenis) => (
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
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Belum ada data stok masuk
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{new Date(item.created_at).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell>{item.products?.name}</TableCell>
                  <TableCell>{item.variant || "-"}</TableCell>
                  <TableCell>{item.jenis_stok_masuk?.name}</TableCell>
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Menampilkan {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} dari {totalCount} data
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Baris per halaman:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Detail Stok Masuk
            </DialogTitle>
          </DialogHeader>
          {detailDialog && (
            <Card className="border-primary/20 shadow-lg">
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
                  
                  <div className="text-sm font-semibold text-muted-foreground">Jenis</div>
                  <Badge className="w-fit bg-primary/10 text-primary hover:bg-primary/20">{detailDialog.jenis_stok_masuk?.name}</Badge>
                  
                  {detailDialog.cabang && (
                    <>
                      <div className="text-sm font-semibold text-muted-foreground">Cabang</div>
                      <div className="text-sm font-medium">{detailDialog.cabang.name}</div>
                    </>
                  )}
                  
                  <div className="text-sm font-semibold text-muted-foreground">Jumlah</div>
                  <div className="text-2xl font-bold text-primary">{detailDialog.qty}</div>
                  
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
                  
                  {detailDialog.mandor && (
                    <>
                      <div className="text-sm font-semibold text-muted-foreground">Mandor</div>
                      <div className="text-sm font-medium">{detailDialog.mandor}</div>
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

export default function StokMasuk() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <StokMasukContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

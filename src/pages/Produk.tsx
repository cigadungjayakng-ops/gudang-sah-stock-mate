import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, History, Edit, Trash2, Package2, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useProductStock } from "@/hooks/useProductStock";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

interface Product {
  id: string;
  name: string;
  variants: any;
  user_id: string;
  profiles?: { name: string };
}

function ProdukContent() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<Product | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", variants: [""] });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { user, userRole } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setProducts(data || []);
      setLoading(false);
      return;
    }

    // For superadmin, fetch user names separately
    if (userRole === "superadmin" && data && data.length > 0) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", userIds);
      
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const productsWithProfiles = data.map(product => ({
        ...product,
        profiles: profilesMap.get(product.user_id)
      }));
      setProducts(productsWithProfiles);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const variants = formData.variants.filter((v) => v.trim());

    const { error } = await supabase.from("products").insert({
      name: formData.name,
      variants: variants.length > 0 ? variants : [],
      user_id: user.id,
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
        description: "Produk berhasil ditambahkan",
      });
      setDialogOpen(false);
      setFormData({ name: "", variants: [""] });
      fetchProducts();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDialog) return;

    const variants = formData.variants.filter((v) => v.trim());

    const { error } = await supabase
      .from("products")
      .update({ name: formData.name, variants: variants.length > 0 ? variants : [] })
      .eq("id", editDialog.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Produk berhasil diperbarui" });
      setEditDialog(null);
      setFormData({ name: "", variants: [""] });
      fetchProducts();
    }
  };

  const handleDelete = async (id: string) => {
    // Check if product has history
    const [stockInCheck, stockOutCheck] = await Promise.all([
      supabase.from("stock_in").select("id").eq("product_id", id).limit(1),
      supabase.from("stock_out").select("id").eq("product_id", id).limit(1),
    ]);

    if ((stockInCheck.data && stockInCheck.data.length > 0) || 
        (stockOutCheck.data && stockOutCheck.data.length > 0)) {
      toast({
        title: "Tidak dapat menghapus",
        description: "Produk ini tidak dapat dihapus karena memiliki riwayat transaksi",
        variant: "destructive",
      });
      setDeleteDialog(null);
      return;
    }

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Berhasil",
        description: "Produk berhasil dihapus",
      });
      fetchProducts();
    }
    setDeleteDialog(null);
  };

  const canEdit = userRole === "user";

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produk</h1>
          <p className="text-muted-foreground">Kelola data produk Anda</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Produk
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Produk Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Produk</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Varian</Label>
                  {formData.variants.map((variant, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Varian ${index + 1}`}
                        value={variant}
                        onChange={(e) => {
                          const newVariants = [...formData.variants];
                          newVariants[index] = e.target.value;
                          setFormData({ ...formData, variants: newVariants });
                        }}
                      />
                      {formData.variants.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newVariants = formData.variants.filter((_, i) => i !== index);
                            setFormData({ ...formData, variants: newVariants });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, variants: [...formData.variants, ""] })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Varian
                  </Button>
                </div>
                <Button type="submit" className="w-full">
                  Simpan
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label>Baris per halaman:</Label>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => {
            setItemsPerPage(Number(value));
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Produk</TableHead>
              <TableHead>Varian</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  {searchQuery ? "Produk tidak ditemukan" : "Belum ada produk"}
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.flatMap((product) => {
                const ProductRows = () => {
                  const { stockInfo } = useProductStock(product.id);
                  const variantColors = ["bg-primary/20 text-primary border-primary", "bg-secondary/20 text-secondary border-secondary", "bg-accent/20 text-accent border-accent", "bg-chart-4/20 text-chart-4 border-chart-4", "bg-chart-2/20 text-chart-2 border-chart-2"];

                  if (product.variants && product.variants.length > 0) {
                    return product.variants.map((variant: string, idx: number) => {
                      const stock = stockInfo.find(s => s.variant === variant)?.stock || 0;
                      return (
                        <TableRow key={`${product.id}-${variant}`} className="border-0">
                          {idx === 0 && (
                            <TableCell rowSpan={product.variants.length} className="font-medium align-top border-b">
                              <div className="flex flex-col gap-1">
                                <span>{product.name}</span>
                                {!canEdit && product.profiles?.name && (
                                  <span className="text-xs text-muted-foreground">
                                    Pemilik: {product.profiles.name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          )}
                           <TableCell className={`py-1 ${idx !== product.variants.length - 1 ? 'border-b border-dashed border-gray-200' : 'border-b'} border-r border-gray-200`}>
                             <Badge variant="outline" className={`${variantColors[idx % variantColors.length]} border`}>
                               {variant}
                             </Badge>
                           </TableCell>
                           <TableCell className={`py-1 ${idx !== product.variants.length - 1 ? 'border-b border-dashed border-gray-200' : 'border-b'} border-r border-gray-200`}>
                             <div className="flex items-center gap-1">
                               <Package2 className="h-4 w-4 text-muted-foreground" />
                               <span className="font-medium">{stock}</span>
                             </div>
                           </TableCell>
                          {idx === 0 && (
                            <TableCell rowSpan={product.variants.length} className="text-right align-top border-b">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => navigate(`/produk/${product.id}/history`)}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                {canEdit && (
                                  <>
                                     <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => {
                                        setEditDialog(product);
                                        setFormData({
                                          name: product.name,
                                          variants: product.variants && product.variants.length > 0 ? product.variants : [""]
                                        });
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setDeleteDialog(product.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    });
                  }

                  const stock = stockInfo.find(s => s.variant === null)?.stock || 0;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{product.name}</span>
                          {!canEdit && product.profiles?.name && (
                            <span className="text-xs text-muted-foreground">
                              Pemilik: {product.profiles.name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">-</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{stock}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(`/produk/${product.id}/history`)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setEditDialog(product);
                                  setFormData({
                                    name: product.name,
                                    variants: product.variants && product.variants.length > 0 ? product.variants : [""]
                                  });
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteDialog(product.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                };

                return <ProductRows />;
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <Dialog open={!!editDialog} onOpenChange={() => { setEditDialog(null); setFormData({ name: "", variants: [""] }); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Produk</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama Produk</Label>
              <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Varian</Label>
              {formData.variants.map((variant, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Varian ${index + 1}`}
                    value={variant}
                    onChange={(e) => {
                      const newVariants = [...formData.variants];
                      newVariants[index] = e.target.value;
                      setFormData({ ...formData, variants: newVariants });
                    }}
                  />
                  {formData.variants.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newVariants = formData.variants.filter((_, i) => i !== index);
                        setFormData({ ...formData, variants: newVariants });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, variants: [...formData.variants, ""] })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Varian
              </Button>
            </div>
            <Button type="submit" className="w-full">Update</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDialog && handleDelete(deleteDialog)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Produk() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ProdukContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

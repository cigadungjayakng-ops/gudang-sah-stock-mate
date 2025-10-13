import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface JenisFormData {
  name: string;
  tujuan_category: "SAJ_PUSAT" | "CABANG" | "SUPPLIER" | "";
}

function JenisStokKeluarContent() {
  const [jenisStokKeluar, setJenisStokKeluar] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<any>(null);
  const [formData, setFormData] = useState<JenisFormData>({ name: "", tujuan_category: "" });

  useEffect(() => {
    fetchJenisStokKeluar();
  }, []);

  const fetchJenisStokKeluar = async () => {
    const { data } = await supabase.from("jenis_stok_keluar").select("*").order("created_at", { ascending: false });
    if (data) setJenisStokKeluar(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("jenis_stok_keluar").insert({
      name: formData.name,
      tujuan_category: formData.tujuan_category as "SAJ_PUSAT" | "CABANG" | "SUPPLIER"
    });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Jenis stok keluar berhasil ditambahkan" });
      setDialogOpen(false);
      setFormData({ name: "", tujuan_category: "" });
      fetchJenisStokKeluar();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDialog) return;

    const { error } = await supabase
      .from("jenis_stok_keluar")
      .update({
        name: formData.name,
        tujuan_category: formData.tujuan_category as "SAJ_PUSAT" | "CABANG" | "SUPPLIER"
      })
      .eq("id", editDialog.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Jenis stok keluar berhasil diperbarui" });
      setEditDialog(null);
      setFormData({ name: "", tujuan_category: "" });
      fetchJenisStokKeluar();
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    // Check if jenis is used in stock_out
    const { data: stockOutData } = await supabase
      .from("stock_out")
      .select("id")
      .eq("jenis_stok_keluar_id", deleteDialog.id)
      .limit(1);

    if (stockOutData && stockOutData.length > 0) {
      toast({
        title: "Tidak dapat menghapus",
        description: "Jenis stok keluar ini sedang digunakan dalam transaksi",
        variant: "destructive",
      });
      setDeleteDialog(null);
      return;
    }

    const { error } = await supabase.from("jenis_stok_keluar").delete().eq("id", deleteDialog.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Jenis stok keluar berhasil dihapus" });
      fetchJenisStokKeluar();
    }
    setDeleteDialog(null);
  };

  const getTujuanLabel = (category: string) => {
    const labels: Record<string, string> = {
      SAJ_PUSAT: "SAJ Pusat",
      CABANG: "Cabang",
      SUPPLIER: "Supplier",
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jenis Stok Keluar</h1>
          <p className="text-muted-foreground">Kelola jenis stok keluar</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tambah Jenis</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Jenis Stok Keluar</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Jenis</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tujuan">Tujuan Category</Label>
                <Select 
                  value={formData.tujuan_category} 
                  onValueChange={(value) => setFormData({ ...formData, tujuan_category: value as "SAJ_PUSAT" | "CABANG" | "SUPPLIER" })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAJ_PUSAT">SAJ Pusat</SelectItem>
                    <SelectItem value="CABANG">Cabang</SelectItem>
                    <SelectItem value="SUPPLIER">Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Simpan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Jenis</TableHead>
              <TableHead>Tujuan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jenisStokKeluar.map((jenis) => (
              <TableRow key={jenis.id}>
                <TableCell>{jenis.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{getTujuanLabel(jenis.tujuan_category)}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditDialog(jenis);
                        setFormData({ name: jenis.name, tujuan_category: jenis.tujuan_category as "SAJ_PUSAT" | "CABANG" | "SUPPLIER" });
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteDialog(jenis)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!editDialog} onOpenChange={() => { setEditDialog(null); setFormData({ name: "", tujuan_category: "" }); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Jenis Stok Keluar</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama Jenis</Label>
              <Input 
                id="edit-name" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tujuan">Tujuan Category</Label>
              <Select 
                value={formData.tujuan_category} 
                onValueChange={(value) => setFormData({ ...formData, tujuan_category: value as "SAJ_PUSAT" | "CABANG" | "SUPPLIER" })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAJ_PUSAT">SAJ Pusat</SelectItem>
                  <SelectItem value="CABANG">Cabang</SelectItem>
                  <SelectItem value="SUPPLIER">Supplier</SelectItem>
                </SelectContent>
              </Select>
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
              Apakah Anda yakin ingin menghapus jenis stok keluar "{deleteDialog?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function JenisStokKeluar() {
  return (
    <ProtectedRoute requireRole="superadmin">
      <DashboardLayout><JenisStokKeluarContent /></DashboardLayout>
    </ProtectedRoute>
  );
}

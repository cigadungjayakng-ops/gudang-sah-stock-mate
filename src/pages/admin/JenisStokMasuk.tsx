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
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function JenisStokMasukContent() {
  const [jenisStokMasuk, setJenisStokMasuk] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<any>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchJenisStokMasuk();
  }, []);

  const fetchJenisStokMasuk = async () => {
    const { data } = await supabase.from("jenis_stok_masuk").select("*").order("created_at", { ascending: false });
    if (data) setJenisStokMasuk(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("jenis_stok_masuk").insert({ name });
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Jenis stok masuk berhasil ditambahkan" });
      setDialogOpen(false);
      setName("");
      fetchJenisStokMasuk();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDialog) return;

    const { error } = await supabase
      .from("jenis_stok_masuk")
      .update({ name })
      .eq("id", editDialog.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Jenis stok masuk berhasil diperbarui" });
      setEditDialog(null);
      setName("");
      fetchJenisStokMasuk();
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;

    // Check if jenis is used in stock_in
    const { data: stockInData } = await supabase
      .from("stock_in")
      .select("id")
      .eq("jenis_stok_masuk_id", deleteDialog.id)
      .limit(1);

    if (stockInData && stockInData.length > 0) {
      toast({
        title: "Tidak dapat menghapus",
        description: "Jenis stok masuk ini sedang digunakan dalam transaksi",
        variant: "destructive",
      });
      setDeleteDialog(null);
      return;
    }

    const { error } = await supabase.from("jenis_stok_masuk").delete().eq("id", deleteDialog.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Jenis stok masuk berhasil dihapus" });
      fetchJenisStokMasuk();
    }
    setDeleteDialog(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jenis Stok Masuk</h1>
          <p className="text-muted-foreground">Kelola jenis stok masuk</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tambah Jenis</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Jenis Stok Masuk</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Jenis</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
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
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jenisStokMasuk.map((jenis) => (
              <TableRow key={jenis.id}>
                <TableCell>{jenis.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditDialog(jenis);
                        setName(jenis.name);
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

      <Dialog open={!!editDialog} onOpenChange={() => { setEditDialog(null); setName(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Jenis Stok Masuk</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nama Jenis</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} required />
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
              Apakah Anda yakin ingin menghapus jenis stok masuk "{deleteDialog?.name}"?
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

export default function JenisStokMasuk() {
  return (
    <ProtectedRoute requireRole="superadmin">
      <DashboardLayout><JenisStokMasukContent /></DashboardLayout>
    </ProtectedRoute>
  );
}

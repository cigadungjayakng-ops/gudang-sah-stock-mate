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
import { Plus } from "lucide-react";

function CabangContent() {
  const [cabang, setCabang] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchCabang();
  }, []);

  const fetchCabang = async () => {
    const { data } = await supabase.from("cabang").select("*").order("created_at", { ascending: false });
    if (data) setCabang(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("cabang").insert({ name });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Cabang berhasil ditambahkan" });
      setDialogOpen(false);
      setName("");
      fetchCabang();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kelola Cabang</h1>
          <p className="text-muted-foreground">Tambah dan kelola cabang</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Tambah Cabang</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Cabang Baru</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Cabang</Label>
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
            <TableRow><TableHead>Nama Cabang</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {cabang.map((c) => (<TableRow key={c.id}><TableCell>{c.name}</TableCell></TableRow>))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default function Cabang() {
  return (
    <ProtectedRoute requireRole="superadmin">
      <DashboardLayout><CabangContent /></DashboardLayout>
    </ProtectedRoute>
  );
}

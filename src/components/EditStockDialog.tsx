import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "@/hooks/use-toast";

interface EditStockDialogProps {
  type: "in" | "out";
  record: any | null;
  jenisList: any[];
  cabang: any[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditStockDialog({ type, record, jenisList, cabang, onClose, onSaved }: EditStockDialogProps) {
  const isIn = type === "in";
  const jenisField = isIn ? "jenis_stok_masuk_id" : "jenis_stok_keluar_id";
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (!record) return;
    supabase
      .from("products")
      .select("id, name, variants")
      .order("name")
      .then(({ data }) => setProducts(data || []));
  }, [record]);

  useEffect(() => {
    if (!record) return;
    setForm({
      product_id: record.product_id ?? "",
      variant: record.variant ?? "",
      qty: String(record.qty ?? ""),
      [jenisField]: record[jenisField] ?? "",
      cabang_id: record.cabang_id ?? "",
      plat_nomor: record.plat_nomor ?? "",
      supir: record.supir ?? "",
      mandor: record.mandor ?? "",
      no_surat_jalan: record.no_surat_jalan ?? "",
      nama_pembeli: record.nama_pembeli ?? "",
      alamat: record.alamat ?? "",
      keterangan: record.keterangan ?? "",
    });
  }, [record]);

  const set = (key: string, value: string) => setForm((prev: any) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!record) return;
    const qty = parseInt(form.qty);
    if (!qty || qty <= 0) {
      toast({ title: "Jumlah tidak valid", description: "Jumlah harus lebih dari 0", variant: "destructive" });
      return;
    }
    if (!form[jenisField]) {
      toast({ title: "Jenis wajib dipilih", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload: any = {
      variant: form.variant || null,
      qty,
      [jenisField]: form[jenisField],
      cabang_id: form.cabang_id || null,
      plat_nomor: form.plat_nomor || null,
      supir: form.supir || null,
      mandor: form.mandor || null,
      keterangan: form.keterangan || null,
    };
    if (isIn) {
      payload.no_surat_jalan = form.no_surat_jalan || null;
    } else {
      payload.nama_pembeli = form.nama_pembeli || null;
      payload.alamat = form.alamat || null;
    }

    const { error } = await supabase
      .from(isIn ? "stock_in" : "stock_out")
      .update(payload)
      .eq("id", record.id);
    setSaving(false);

    if (error) {
      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Berhasil", description: "Data berhasil diperbarui" });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!record} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {isIn ? "Stok Masuk" : "Stok Keluar"}</DialogTitle>
        </DialogHeader>

        {record && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Produk</Label>
              <Input value={record.products?.name || "-"} disabled />
            </div>

            <div>
              <Label>Varian</Label>
              <Input value={form.variant} onChange={(e) => set("variant", e.target.value)} placeholder="-" />
            </div>

            <div>
              <Label>Jumlah</Label>
              <Input type="number" min={1} value={form.qty} onChange={(e) => set("qty", e.target.value)} />
            </div>

            <div>
              <Label>Jenis {isIn ? "Stok Masuk" : "Stok Keluar"}</Label>
              <Select value={form[jenisField]} onValueChange={(v) => set(jenisField, v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  {jenisList.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cabang</Label>
              <Select value={form.cabang_id || "none"} onValueChange={(v) => set("cabang_id", v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tidak ada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada</SelectItem>
                  {cabang.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Plat Nomor</Label>
              <Input value={form.plat_nomor} onChange={(e) => set("plat_nomor", e.target.value)} />
            </div>

            <div>
              <Label>Supir</Label>
              <Input value={form.supir} onChange={(e) => set("supir", e.target.value)} />
            </div>

            <div>
              <Label>Mandor</Label>
              <Input value={form.mandor} onChange={(e) => set("mandor", e.target.value)} />
            </div>

            {isIn ? (
              <div>
                <Label>No. Surat Jalan</Label>
                <Input value={form.no_surat_jalan} onChange={(e) => set("no_surat_jalan", e.target.value)} />
              </div>
            ) : (
              <>
                <div>
                  <Label>Nama Pembeli</Label>
                  <Input value={form.nama_pembeli} onChange={(e) => set("nama_pembeli", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>Alamat</Label>
                  <Textarea value={form.alamat} onChange={(e) => set("alamat", e.target.value)} rows={2} />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <Label>Keterangan</Label>
              <Textarea value={form.keterangan} onChange={(e) => set("keterangan", e.target.value)} rows={2} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

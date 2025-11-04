import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BulkItem {
  id: string;
  product_id: string;
  product_name: string;
  variant: string;
  qty: string;
  plat_nomor: string;
  supir: string;
  mandor: string;
  no_surat_jalan: string;
  keterangan: string;
}

interface Props {
  products: any[];
  jenisStokMasuk: any[];
  cabang: any[];
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BulkStockInForm({ products, jenisStokMasuk, cabang, userId, onSuccess, onCancel }: Props) {
  const [items, setItems] = useState<BulkItem[]>([]);
  const [jenisStokMasukId, setJenisStokMasukId] = useState("");
  const [cabangId, setCabangId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      product_id: "",
      product_name: "",
      variant: "",
      qty: "",
      plat_nomor: "",
      supir: "",
      mandor: "",
      no_surat_jalan: "",
      keterangan: "",
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof BulkItem, value: string) => {
    setItems(items.map(item => {
      if (item.id === id) {
        if (field === "product_id") {
          const product = products.find(p => p.id === value);
          return { ...item, product_id: value, product_name: product?.name || "", variant: "" };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSubmit = async () => {
    if (!jenisStokMasukId) {
      toast({ title: "Error", description: "Pilih jenis stok masuk", variant: "destructive" });
      return;
    }

    if (items.length === 0) {
      toast({ title: "Error", description: "Tambahkan minimal 1 item", variant: "destructive" });
      return;
    }

    for (const item of items) {
      if (!item.product_id || !item.qty) {
        toast({ title: "Error", description: "Semua item harus memiliki produk dan jumlah", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const insertData = items.map(item => ({
        user_id: userId,
        product_id: item.product_id,
        variant: item.variant || null,
        jenis_stok_masuk_id: jenisStokMasukId,
        cabang_id: cabangId || null,
        qty: parseInt(item.qty),
        plat_nomor: item.plat_nomor || null,
        supir: item.supir || null,
        mandor: item.mandor || null,
        no_surat_jalan: item.no_surat_jalan || null,
        keterangan: item.keterangan || null,
      }));

      const { error } = await supabase.from("stock_in").insert(insertData);

      if (error) throw error;

      toast({ title: "Berhasil", description: `${items.length} item stok masuk berhasil ditambahkan` });
      onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (items.length === 0) {
      addItem();
    }
  }, []);

  const getProductVariants = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.variants || [];
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Jenis Stok Masuk *</Label>
          <Select value={jenisStokMasukId} onValueChange={setJenisStokMasukId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih jenis" />
            </SelectTrigger>
            <SelectContent>
              {jenisStokMasuk.map(jenis => (
                <SelectItem key={jenis.id} value={jenis.id}>
                  {jenis.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cabang (Opsional)</Label>
          <Select value={cabangId} onValueChange={setCabangId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih cabang (opsional)" />
            </SelectTrigger>
            <SelectContent>
              {cabang.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Daftar Item ({items.length})</Label>
          <Button onClick={addItem} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Item
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Produk *</TableHead>
                <TableHead className="w-[150px]">Varian</TableHead>
                <TableHead className="w-[100px]">Qty *</TableHead>
                <TableHead className="w-[120px]">Plat Nomor</TableHead>
                <TableHead className="w-[120px]">Supir</TableHead>
                <TableHead className="w-[120px]">Mandor</TableHead>
                <TableHead className="w-[150px]">No. Surat Jalan</TableHead>
                <TableHead className="w-[200px]">Keterangan</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const hasVariants = getProductVariants(item.product_id).length > 0;
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Combobox
                        options={products.map(p => ({ value: p.id, label: p.name }))}
                        value={item.product_id}
                        onValueChange={(value) => updateItem(item.id, "product_id", value)}
                        placeholder="Pilih produk"
                        searchPlaceholder="Cari produk..."
                        emptyText="Produk tidak ditemukan"
                      />
                    </TableCell>
                    <TableCell>
                      {hasVariants ? (
                        <Select value={item.variant} onValueChange={(value) => updateItem(item.id, "variant", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih varian" />
                          </SelectTrigger>
                          <SelectContent>
                            {getProductVariants(item.product_id).map((variant: string) => (
                              <SelectItem key={variant} value={variant}>
                                {variant}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.plat_nomor}
                        onChange={(e) => updateItem(item.id, "plat_nomor", e.target.value)}
                        placeholder="B 1234 XYZ"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.supir}
                        onChange={(e) => updateItem(item.id, "supir", e.target.value)}
                        placeholder="Nama supir"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.mandor}
                        onChange={(e) => updateItem(item.id, "mandor", e.target.value)}
                        placeholder="Nama mandor"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.no_surat_jalan}
                        onChange={(e) => updateItem(item.id, "no_surat_jalan", e.target.value)}
                        placeholder="SJ-001"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.keterangan}
                        onChange={(e) => updateItem(item.id, "keterangan", e.target.value)}
                        placeholder="Keterangan"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Menyimpan..." : `Simpan ${items.length} Item`}
        </Button>
      </div>
    </div>
  );
}

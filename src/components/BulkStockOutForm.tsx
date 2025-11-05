import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BulkItem {
  id: string;
  product_id: string;
  product_name: string;
  variant: string;
  qty: string;
}

interface Props {
  products: any[];
  jenisStokKeluar: any[];
  cabang: any[];
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function BulkStockOutForm({ products, jenisStokKeluar, cabang, userId, onSuccess, onCancel }: Props) {
  const [items, setItems] = useState<BulkItem[]>([]);
  // Common fields
  const [jenisStokKeluarId, setJenisStokKeluarId] = useState("");
  const [tujuanCategory, setTujuanCategory] = useState("");
  const [cabangId, setCabangId] = useState("");
  const [platNomor, setPlatNomor] = useState("");
  const [supir, setSupir] = useState("");
  const [mandor, setMandor] = useState("");
  const [noSuratJalan, setNoSuratJalan] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => {
    setItems([...items, {
      id: Date.now().toString(),
      product_id: "",
      product_name: "",
      variant: "",
      qty: "",
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

  const handleJenisChange = (value: string) => {
    setJenisStokKeluarId(value);
    const selectedJenis = jenisStokKeluar.find(j => j.id === value);
    if (selectedJenis) {
      setTujuanCategory(selectedJenis.tujuan_category);
      if (selectedJenis.tujuan_category !== "CABANG") {
        setCabangId("");
      }
    }
  };

  const handleSubmit = async () => {
    if (!jenisStokKeluarId) {
      toast({ title: "Error", description: "Pilih jenis stok keluar", variant: "destructive" });
      return;
    }

    if (tujuanCategory === "CABANG" && !cabangId) {
      toast({ title: "Error", description: "Pilih cabang tujuan", variant: "destructive" });
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
        tujuan_category: tujuanCategory as "CABANG" | "SAJ_PUSAT" | "SUPPLIER",
        jenis_stok_keluar_id: jenisStokKeluarId,
        cabang_id: tujuanCategory === "CABANG" ? cabangId : null,
        qty: parseInt(item.qty),
        plat_nomor: platNomor || null,
        supir: supir || null,
        mandor: mandor || null,
        no_surat_jalan: noSuratJalan || null,
        keterangan: keterangan || null,
      }));

      const { error } = await supabase.from("stock_out").insert(insertData);

      if (error) throw error;

      toast({ title: "Berhasil", description: `${items.length} item stok keluar berhasil ditambahkan` });
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
      {/* Common Information Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Informasi Umum</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Jenis Stok Keluar *</Label>
            <Select value={jenisStokKeluarId} onValueChange={handleJenisChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis" />
              </SelectTrigger>
              <SelectContent>
                {jenisStokKeluar.map(jenis => (
                  <SelectItem key={jenis.id} value={jenis.id}>
                    {jenis.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {tujuanCategory === "CABANG" && (
            <div className="space-y-2 col-span-2">
              <Label>Cabang Tujuan *</Label>
              <Select value={cabangId} onValueChange={setCabangId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih cabang" />
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
          )}
          <div className="space-y-2">
            <Label>Plat Nomor Mobil</Label>
            <Input
              value={platNomor}
              onChange={(e) => setPlatNomor(e.target.value)}
              placeholder="B 1234 XYZ"
            />
          </div>
          <div className="space-y-2">
            <Label>Supir</Label>
            <Input
              value={supir}
              onChange={(e) => setSupir(e.target.value)}
              placeholder="Nama supir"
            />
          </div>
          <div className="space-y-2">
            <Label>Mandor</Label>
            <Input
              value={mandor}
              onChange={(e) => setMandor(e.target.value)}
              placeholder="Nama mandor"
            />
          </div>
          <div className="space-y-2">
            <Label>No. Surat Jalan</Label>
            <Input
              value={noSuratJalan}
              onChange={(e) => setNoSuratJalan(e.target.value)}
              placeholder="SJ-001"
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Keterangan</Label>
            <Textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Keterangan tambahan"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Daftar Produk ({items.length})</h3>
          <Button onClick={addItem} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Tambah Produk
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Produk *</TableHead>
                <TableHead className="w-[200px]">Varian</TableHead>
                <TableHead className="w-[150px]">Qty *</TableHead>
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
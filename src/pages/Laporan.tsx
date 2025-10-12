import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

function LaporanContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Laporan</h1>
        <p className="text-muted-foreground">Cetak dan unduh laporan stok gudang</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <FileText className="h-8 w-8 text-primary" />
              <Download className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle>Laporan Stok Produk</CardTitle>
            <CardDescription>Ringkasan stok seluruh produk</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Unduh PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <FileText className="h-8 w-8 text-secondary" />
              <Download className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle>Riwayat Stok Masuk</CardTitle>
            <CardDescription>Semua transaksi stok masuk</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              Unduh PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <FileText className="h-8 w-8 text-accent" />
              <Download className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle>Riwayat Stok Keluar</CardTitle>
            <CardDescription>Semua transaksi stok keluar</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Unduh PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Informasi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Fitur laporan memungkinkan Anda untuk mengunduh ringkasan stok produk, riwayat stok masuk, dan riwayat
            stok keluar dalam format PDF. Gunakan tombol di atas untuk mengunduh laporan yang Anda butuhkan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Laporan() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <LaporanContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

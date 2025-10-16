import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingDown, TrendingUp, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Stats {
  totalProducts: number;
  totalStockIn: number;
  totalStockOut: number;
  totalStock: number;
}

interface RecentStock {
  id: string;
  created_at: string;
  qty: number;
  products: { name: string };
  variant: string | null;
  jenis_stok_masuk?: { name: string };
  jenis_stok_keluar?: { name: string };
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalStockIn: 0,
    totalStockOut: 0,
    totalStock: 0,
  });
  const [recentStockIn, setRecentStockIn] = useState<RecentStock[]>([]);
  const [recentStockOut, setRecentStockOut] = useState<RecentStock[]>([]);
  const { user, userRole } = useAuth();

  useEffect(() => {
    fetchStats();
    fetchRecentStockIn();
    fetchRecentStockOut();
  }, [user, userRole]);

  const fetchStats = async () => {
    if (!user) return;

    // Fetch total products
    const productsQuery = supabase.from("products").select("*", { count: "exact", head: true });
    
    if (userRole === "user") {
      productsQuery.eq("user_id", user.id);
    }

    const { count: productsCount } = await productsQuery;

    // Fetch total stock in
    const stockInQuery = supabase.from("stock_in").select("qty", { count: "exact" });
    
    if (userRole === "user") {
      stockInQuery.eq("user_id", user.id);
    }

    const { data: stockInData } = await stockInQuery;
    const totalStockIn = stockInData?.reduce((sum, item) => sum + item.qty, 0) || 0;

    // Fetch total stock out
    const stockOutQuery = supabase.from("stock_out").select("qty", { count: "exact" });
    
    if (userRole === "user") {
      stockOutQuery.eq("user_id", user.id);
    }

    const { data: stockOutData } = await stockOutQuery;
    const totalStockOut = stockOutData?.reduce((sum, item) => sum + item.qty, 0) || 0;

    setStats({
      totalProducts: productsCount || 0,
      totalStockIn,
      totalStockOut,
      totalStock: totalStockIn - totalStockOut,
    });
  };

  const fetchRecentStockIn = async () => {
    if (!user) return;

    let query = supabase
      .from("stock_in")
      .select("*, products(name), jenis_stok_masuk(name)")
      .order("created_at", { ascending: false })
      .limit(10);

    if (userRole === "user") {
      query = query.eq("user_id", user.id);
    }

    const { data } = await query;
    setRecentStockIn(data || []);
  };

  const fetchRecentStockOut = async () => {
    if (!user) return;

    let query = supabase
      .from("stock_out")
      .select("*, products(name), jenis_stok_keluar(name)")
      .order("created_at", { ascending: false })
      .limit(10);

    if (userRole === "user") {
      query = query.eq("user_id", user.id);
    }

    const { data } = await query;
    setRecentStockOut(data || []);
  };


  const statCards = [
    {
      title: "Total Produk",
      value: stats.totalProducts,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary-light",
    },
    {
      title: "Total Stok Masuk",
      value: stats.totalStockIn,
      icon: TrendingDown,
      color: "text-secondary",
      bgColor: "bg-secondary-light",
    },
    {
      title: "Total Stok Keluar",
      value: stats.totalStockOut,
      icon: TrendingUp,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Stok Tersedia",
      value: stats.totalStock,
      icon: BarChart3,
      color: "text-accent",
      bgColor: "bg-accent-light",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan manajemen stok gudang Anda</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>10 Stok Masuk Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Varian</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentStockIn.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Belum ada data
                    </TableCell>
                  </TableRow>
                ) : (
                  recentStockIn.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs">{format(new Date(item.created_at), "dd/MM/yy")}</TableCell>
                      <TableCell className="font-medium text-sm">{item.products.name}</TableCell>
                      <TableCell>
                        {item.variant ? <Badge variant="secondary" className="text-xs">{item.variant}</Badge> : "-"}
                      </TableCell>
                      <TableCell className="text-xs">{item.jenis_stok_masuk?.name}</TableCell>
                      <TableCell className="text-right font-medium">{item.qty}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>10 Stok Keluar Terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Varian</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentStockOut.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Belum ada data
                    </TableCell>
                  </TableRow>
                ) : (
                  recentStockOut.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs">{format(new Date(item.created_at), "dd/MM/yy")}</TableCell>
                      <TableCell className="font-medium text-sm">{item.products.name}</TableCell>
                      <TableCell>
                        {item.variant ? <Badge variant="secondary" className="text-xs">{item.variant}</Badge> : "-"}
                      </TableCell>
                      <TableCell className="text-xs">{item.jenis_stok_keluar?.name}</TableCell>
                      <TableCell className="text-right font-medium">{item.qty}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

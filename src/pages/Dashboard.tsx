import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, TrendingDown, TrendingUp, BarChart3, AlertTriangle, History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Stats {
  totalProducts: number;
  totalStockIn: number;
  totalStockOut: number;
  totalStock: number;
}

interface LowStockItem {
  product_name: string;
  variant: string | null;
  stock: number;
}

interface Transaction {
  id: string;
  type: 'in' | 'out';
  product_name: string;
  variant: string | null;
  qty: number;
  created_at: string;
}

interface TopStockItem {
  product_name: string;
  variant: string | null;
  stock: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalStockIn: 0,
    totalStockOut: 0,
    totalStock: 0,
  });
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [topStock, setTopStock] = useState<TopStockItem[]>([]);
  const { user, userRole } = useAuth();

  useEffect(() => {
    fetchStats();
    fetchLowStock();
    fetchRecentTransactions();
    fetchTopStock();
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

  const fetchLowStock = async () => {
    if (!user) return;

    const stockInQuery = supabase.from("stock_in").select("product_id, variant, qty, products(name)");
    const stockOutQuery = supabase.from("stock_out").select("product_id, variant, qty");

    if (userRole === "user") {
      stockInQuery.eq("user_id", user.id);
      stockOutQuery.eq("user_id", user.id);
    }

    const [{ data: stockInData }, { data: stockOutData }] = await Promise.all([
      stockInQuery,
      stockOutQuery,
    ]);

    const stockMap = new Map<string, { product_name: string; stock: number }>();

    stockInData?.forEach((item: any) => {
      const key = `${item.product_id}-${item.variant || "null"}`;
      const current = stockMap.get(key) || { product_name: item.products?.name || "", stock: 0 };
      stockMap.set(key, { ...current, stock: current.stock + item.qty });
    });

    stockOutData?.forEach((item: any) => {
      const key = `${item.product_id}-${item.variant || "null"}`;
      const current = stockMap.get(key);
      if (current) {
        stockMap.set(key, { ...current, stock: current.stock - item.qty });
      }
    });

    const lowStockItems = Array.from(stockMap.entries())
      .map(([key, value]) => {
        const [, variant] = key.split("-");
        return {
          product_name: value.product_name,
          variant: variant === "null" ? null : variant,
          stock: value.stock,
        };
      })
      .filter((item) => item.stock < 10 && item.stock >= 0)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    setLowStock(lowStockItems);
  };

  const fetchRecentTransactions = async () => {
    if (!user) return;

    const stockInQuery = supabase
      .from("stock_in")
      .select("id, qty, variant, created_at, products(name)")
      .order("created_at", { ascending: false })
      .limit(5);

    const stockOutQuery = supabase
      .from("stock_out")
      .select("id, qty, variant, created_at, products(name)")
      .order("created_at", { ascending: false })
      .limit(5);

    if (userRole === "user") {
      stockInQuery.eq("user_id", user.id);
      stockOutQuery.eq("user_id", user.id);
    }

    const [{ data: stockInData }, { data: stockOutData }] = await Promise.all([
      stockInQuery,
      stockOutQuery,
    ]);

    const transactions: Transaction[] = [
      ...(stockInData?.map((item: any) => ({
        id: item.id,
        type: "in" as const,
        product_name: item.products?.name || "",
        variant: item.variant,
        qty: item.qty,
        created_at: item.created_at,
      })) || []),
      ...(stockOutData?.map((item: any) => ({
        id: item.id,
        type: "out" as const,
        product_name: item.products?.name || "",
        variant: item.variant,
        qty: item.qty,
        created_at: item.created_at,
      })) || []),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);

    setRecentTransactions(transactions);
  };

  const fetchTopStock = async () => {
    if (!user) return;

    const stockInQuery = supabase.from("stock_in").select("product_id, variant, qty, products(name)");
    const stockOutQuery = supabase.from("stock_out").select("product_id, variant, qty");

    if (userRole === "user") {
      stockInQuery.eq("user_id", user.id);
      stockOutQuery.eq("user_id", user.id);
    }

    const [{ data: stockInData }, { data: stockOutData }] = await Promise.all([
      stockInQuery,
      stockOutQuery,
    ]);

    const stockMap = new Map<string, { product_name: string; stock: number }>();

    stockInData?.forEach((item: any) => {
      const key = `${item.product_id}-${item.variant || "null"}`;
      const current = stockMap.get(key) || { product_name: item.products?.name || "", stock: 0 };
      stockMap.set(key, { ...current, stock: current.stock + item.qty });
    });

    stockOutData?.forEach((item: any) => {
      const key = `${item.product_id}-${item.variant || "null"}`;
      const current = stockMap.get(key);
      if (current) {
        stockMap.set(key, { ...current, stock: current.stock - item.qty });
      }
    });

    const topStockItems = Array.from(stockMap.entries())
      .map(([key, value]) => {
        const [, variant] = key.split("-");
        return {
          product_name: value.product_name,
          variant: variant === "null" ? null : variant,
          stock: value.stock,
        };
      })
      .filter((item) => item.stock > 0)
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 5);

    setTopStock(topStockItems);
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

      <div className="grid gap-4 md:grid-cols-3">
        {/* Stok Menipis */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>Stok Menipis</CardTitle>
            </div>
            <CardDescription>Produk dengan stok kurang dari 10</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada stok menipis</p>
            ) : (
              <div className="space-y-3">
                {lowStock.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      {item.variant && <p className="text-xs text-muted-foreground">{item.variant}</p>}
                    </div>
                    <Badge variant={item.stock === 0 ? "destructive" : "secondary"}>
                      {item.stock}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 10 Transaksi Terakhir */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle>10 Transaksi Terakhir</CardTitle>
            </div>
            <CardDescription>Riwayat transaksi terbaru</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {item.type === "in" ? (
                          <TrendingDown className="h-3 w-3 text-accent" />
                        ) : (
                          <TrendingUp className="h-3 w-3 text-chart-4" />
                        )}
                        <p className="text-sm font-medium truncate">{item.product_name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.variant || "Default"} • {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                    <Badge variant={item.type === "in" ? "secondary" : "outline"}>
                      {item.type === "in" ? "+" : "-"}{item.qty}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stok Terbanyak */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-secondary" />
              <CardTitle>Stok Terbanyak</CardTitle>
            </div>
            <CardDescription>Top 5 produk dengan stok tertinggi</CardDescription>
          </CardHeader>
          <CardContent>
            {topStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada data stok</p>
            ) : (
              <div className="space-y-3">
                {topStock.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      {item.variant && <p className="text-xs text-muted-foreground">{item.variant}</p>}
                    </div>
                    <Badge variant="default">
                      {item.stock}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

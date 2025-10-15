import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingDown, TrendingUp, BarChart3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Stats {
  totalProducts: number;
  totalStockIn: number;
  totalStockOut: number;
  totalStock: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalStockIn: 0,
    totalStockOut: 0,
    totalStock: 0,
  });
  const { user, userRole } = useAuth();

  useEffect(() => {
    fetchStats();
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

    </div>
  );
}

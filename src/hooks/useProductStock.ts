import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StockInfo {
  variant: string | null;
  stock: number;
}

export function useProductStock(productId: string) {
  const [stockInfo, setStockInfo] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStock = async () => {
      const [{ data: stockIn }, { data: stockOut }] = await Promise.all([
        supabase.from("stock_in").select("variant, qty").eq("product_id", productId),
        supabase.from("stock_out").select("variant, qty").eq("product_id", productId),
      ]);

      const stockMap = new Map<string, number>();
      
      stockIn?.forEach((item: any) => {
        const key = item.variant || "null";
        stockMap.set(key, (stockMap.get(key) || 0) + item.qty);
      });

      stockOut?.forEach((item: any) => {
        const key = item.variant || "null";
        stockMap.set(key, (stockMap.get(key) || 0) - item.qty);
      });

      const result: StockInfo[] = Array.from(stockMap.entries()).map(([variant, stock]) => ({
        variant: variant === "null" ? null : variant,
        stock,
      }));

      setStockInfo(result);
      setLoading(false);
    };

    fetchStock();
  }, [productId]);

  return { stockInfo, loading };
}

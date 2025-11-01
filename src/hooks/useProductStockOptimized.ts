import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface StockInfo {
  variant: string | null;
  stock: number;
}

export function useProductStockOptimized(productId: string) {
  const [stockInfo, setStockInfo] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        // Use materialized view for faster stock lookup
        const { data, error } = await supabase
          .from("product_stock_summary")
          .select("variant, current_stock")
          .eq("product_id", productId);

        if (error) {
          console.error("Error fetching from materialized view:", error);
          // Fallback to old method if materialized view fails
          return fetchStockFallback();
        }

        const result: StockInfo[] = data.map((item) => ({
          variant: item.variant,
          stock: item.current_stock,
        }));

        setStockInfo(result);
      } catch (err) {
        console.error("Error:", err);
        await fetchStockFallback();
      } finally {
        setLoading(false);
      }
    };

    const fetchStockFallback = async () => {
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
    };

    fetchStock();
  }, [productId]);

  return { stockInfo, loading };
}

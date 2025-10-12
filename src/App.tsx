import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Produk from "./pages/Produk";
import StokMasuk from "./pages/StokMasuk";
import StokKeluar from "./pages/StokKeluar";
import Laporan from "./pages/Laporan";
import AdminUsers from "./pages/admin/Users";
import AdminCabang from "./pages/admin/Cabang";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/produk" element={<Produk />} />
            <Route path="/stok-masuk" element={<StokMasuk />} />
            <Route path="/stok-keluar" element={<StokKeluar />} />
            <Route path="/laporan" element={<Laporan />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/cabang" element={<AdminCabang />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

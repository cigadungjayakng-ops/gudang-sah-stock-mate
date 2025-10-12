import { 
  Package, 
  LayoutDashboard, 
  TrendingDown, 
  TrendingUp, 
  FileText,
  Users,
  Building2,
  FolderInput,
  FolderOutput,
  LogOut
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const userMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Produk", url: "/produk", icon: Package },
  { title: "Stok Masuk", url: "/stok-masuk", icon: TrendingDown },
  { title: "Stok Keluar", url: "/stok-keluar", icon: TrendingUp },
  { title: "Laporan", url: "/laporan", icon: FileText },
];

const superadminMenuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Produk", url: "/produk", icon: Package },
  { title: "Stok Masuk", url: "/stok-masuk", icon: TrendingDown },
  { title: "Stok Keluar", url: "/stok-keluar", icon: TrendingUp },
  { title: "Laporan", url: "/laporan", icon: FileText },
];

const adminMenuItems = [
  { title: "Kelola Pengguna", url: "/admin/users", icon: Users },
  { title: "Kelola Cabang", url: "/admin/cabang", icon: Building2 },
  { title: "Jenis Stok Masuk", url: "/admin/jenis-stok-masuk", icon: FolderInput },
  { title: "Jenis Stok Keluar", url: "/admin/jenis-stok-keluar", icon: FolderOutput },
];

export function AppSidebar() {
  const { userRole, user, signOut } = useAuth();
  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfileName(data.name);
        });
    }
  }, [user]);

  const menuItems = userRole === "superadmin" ? superadminMenuItems : userMenuItems;

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Package className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-sidebar-foreground">Gudang SAJ</h2>
            <p className="text-xs text-sidebar-foreground/70">Manajemen Stok Gudang</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* User Info */}
        <div className="border-b border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent">
              <span className="text-sm font-medium text-sidebar-accent-foreground">
                {profileName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profileName}</p>
              <p className="text-xs text-sidebar-foreground/70 capitalize">{userRole}</p>
            </div>
          </div>
        </div>

        {/* Main Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Menu (Superadmin only) */}
        {userRole === "superadmin" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70">Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin keluar dari aplikasi?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={signOut}>Keluar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarFooter>
    </Sidebar>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

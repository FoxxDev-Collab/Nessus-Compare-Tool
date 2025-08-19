"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, BarChart3, Settings, Shield, Upload, TrendingUp } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import SidebarScaleControl from "@/components/SidebarScaleControl";
import { useUiPreferences } from "@/components/UiPreferencesProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { scale } = useUiPreferences();

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-border" collapsible="icon">
        <SidebarHeader className="px-3 py-2">
          <div className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Nessus Compare
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/"}>
                <Link href="/">
                  <Home />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/uploads"}>
                <Link href="/uploads">
                  <Upload />
                  <span>Upload Manager</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/reports"}>
                <Link href="/reports">
                  <FileText />
                  <span>Individual Reports</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/compare"}>
                <Link href="/compare">
                  <BarChart3 />
                  <span>Compare Reports</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/trends"}>
                <Link href="/trends">
                  <TrendingUp />
                  <span>Scan Trends</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/settings"}>
                <Link href="/settings">
                  <Settings />
                  <span>App Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarFooter className="mt-auto">
            <div className="space-y-2">
              <ThemeToggle />
              <SidebarScaleControl />
            </div>
          </SidebarFooter>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="overflow-hidden">
        <div className="flex h-10 items-center gap-2 px-2">
          <SidebarTrigger />
        </div>
        <div
          className="flex-1 overflow-auto pr-0 origin-top-left"
          style={{ transform: `scale(${scale})`, width: `${100 / scale}%` }}
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}



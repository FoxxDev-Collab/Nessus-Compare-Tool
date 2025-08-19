"use client";

import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { 
  Settings, 
  Trash2, 
  Database, 
  Shield, 
  AlertTriangle, 
  Info,
  RefreshCcw,
  HardDrive,
  FileText,
  Server,
  Palette
} from "lucide-react";
import { useThemePalette, ThemePaletteId } from "@/components/ThemePaletteProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface DatabaseStats {
  totalReports: number;
  totalHosts: number;
  totalVulnerabilities: number;
  databaseSize: string;
}

export default function SettingsPage() {
  const { palette, setPalette } = useThemePalette();
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      setLoading(true);
      const databaseStats = await invoke<DatabaseStats>("get_database_stats");
      setStats(databaseStats);
    } catch (error) {
      toast.error("Failed to load database statistics: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirmText !== "DELETE ALL DATA") {
      toast.error("Please type 'DELETE ALL DATA' to confirm");
      return;
    }

    try {
      setLoading(true);
      await invoke("delete_all_data");
      toast.success("All data has been deleted successfully");
      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
      loadDatabaseStats();
    } catch (error) {
      toast.error("Failed to delete data: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeDatabase = async () => {
    try {
      setLoading(true);
      await invoke("optimize_database");
      toast.success("Database optimized successfully");
      loadDatabaseStats();
    } catch (error) {
      toast.error("Failed to optimize database: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your application settings and data
          </p>
        </div>
      </div>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Settings
          </CardTitle>
          <CardDescription>
            Choose your preferred color theme for the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              { id: "default" as ThemePaletteId, name: "Default", description: "Clean and minimal theme" },
              { id: "kodama" as ThemePaletteId, name: "Kodama", description: "Nature-inspired green theme" },
              { id: "starry-night" as ThemePaletteId, name: "Starry Night", description: "Deep blue cosmic theme" },
              { id: "bubblegum" as ThemePaletteId, name: "Bubblegum", description: "Playful pink theme" },
              { id: "doom" as ThemePaletteId, name: "Doom", description: "Dark industrial gaming theme" },
              { id: "soft-pop" as ThemePaletteId, name: "Soft Pop", description: "Vibrant modern design theme" },
              { id: "notebook" as ThemePaletteId, name: "Notebook", description: "Hand-written paper style theme" },
              { id: "cyberpunk" as ThemePaletteId, name: "Cyberpunk", description: "Neon-lit futuristic aesthetic" },
            ].map((theme) => (
              <div
                key={theme.id}
                className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                  palette === theme.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => setPalette(theme.id)}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{theme.name}</h3>
                    {palette === theme.id && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{theme.description}</p>
                  
                  {/* Theme preview */}
                  <div className={`flex space-x-1 mt-3 ${theme.id !== "default" ? `theme-${theme.id}` : ""}`}>
                    <div className="w-4 h-4 rounded-full bg-primary"></div>
                    <div className="w-4 h-4 rounded-full bg-secondary"></div>
                    <div className="w-4 h-4 rounded-full bg-accent"></div>
                    <div className="w-4 h-4 rounded-full bg-muted"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Statistics
          </CardTitle>
          <CardDescription>
            Current state of your Nessus scan data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !stats ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCcw className="h-6 w-6 animate-spin mr-2" />
              Loading statistics...
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Reports</p>
                  <p className="text-2xl font-bold">{stats.totalReports.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Server className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hosts</p>
                  <p className="text-2xl font-bold">{stats.totalHosts.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vulnerabilities</p>
                  <p className="text-2xl font-bold">{stats.totalVulnerabilities.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <HardDrive className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Database Size</p>
                  <p className="text-2xl font-bold">{stats.databaseSize}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load statistics
            </div>
          )}
          
          <Separator className="my-4" />
          
          <div className="flex gap-2">
            <Button 
              onClick={loadDatabaseStats} 
              variant="outline" 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Manage your stored scan data and database optimization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Optimize Database */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <RefreshCcw className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium">Optimize Database</h3>
                <p className="text-sm text-muted-foreground">
                  Rebuild indexes and optimize database performance
                </p>
              </div>
            </div>
            <Button 
              onClick={handleOptimizeDatabase}
              disabled={loading}
              variant="outline"
            >
              Optimize
            </Button>
          </div>

          {/* Delete All Data */}
          <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-900">Delete All Data</h3>
                <p className="text-sm text-red-700">
                  Permanently remove all reports, hosts, and vulnerability data
                </p>
              </div>
            </div>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Confirm Data Deletion
                  </DialogTitle>
                  <DialogDescription>
                    This action will permanently delete all your data including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All Nessus scan reports</li>
                      <li>All host information</li>
                      <li>All vulnerability data</li>
                      <li>All scan metadata</li>
                    </ul>
                    <p className="mt-4 font-medium text-red-600">
                      This action cannot be undone!
                    </p>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      Type <code className="bg-muted px-1 rounded">DELETE ALL DATA</code> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="DELETE ALL DATA"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      setDeleteConfirmText("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDeleteAllData}
                    disabled={loading || deleteConfirmText !== "DELETE ALL DATA"}
                  >
                    {loading ? (
                      <>
                        <RefreshCcw className="h-4 w-4 animate-spin mr-2" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All Data
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Application Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Application Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Application:</span>
              <span className="ml-2">Nessus Compare</span>
            </div>
            <div>
              <span className="font-medium">Version:</span>
              <span className="ml-2">1.0.2</span>
            </div>
            <div>
              <span className="font-medium">Database:</span>
              <span className="ml-2">SQLite</span>
            </div>
            <div>
              <span className="font-medium">Framework:</span>
              <span className="ml-2">Next.js + Tauri</span>
            </div>
            <div>
              <span className="font-medium">Author:</span>
              <span className="ml-2">Jeremiah Price</span>
            </div>
            <div>
              <span className="font-medium">Creation Date:</span>
              <span className="ml-2">08/18/2025</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Shield className="h-5 w-5" />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-amber-700">
            <p>• All data is stored locally on your device</p>
            <p>• No data is transmitted to external servers</p>
            <p>• Regular backups are recommended for important scan data</p>
            <p>• Keep your application updated for the latest security features</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

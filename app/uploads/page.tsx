"use client";

import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import {

  Trash2,
  FileText,
  Calendar,
  Monitor,
  Shield,
  AlertTriangle,
  Info,
  Plus,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface NessusReport {
  id: number;
  filename: string;
  scanName: string;
  scanDate: string;
  totalHosts: number;
  totalVulnerabilities: number;
  createdAt: string;
  scanMetadata?: string;
}

interface NessusHost {
  id: number;
  reportId: number;
  hostname: string;
  ipAddress: string;
  osInfo: string | null;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
}

export default function UploadManager() {
  const [reports, setReports] = useState<NessusReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<NessusReport | null>(null);
  const [hosts, setHosts] = useState<NessusHost[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const result = await invoke<NessusReport[]>("list_reports");
      setReports(result);
    } catch (error) {
      toast.error("Failed to load reports: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      setUploading(true);
      
      const selected = await open({
        filters: [
          {
            name: "Nessus Files",
            extensions: ["nessus"],
          },
        ],
      });

      if (selected) {
        const filePath = Array.isArray(selected) ? selected[0] : selected;
        const filename = filePath.split(/[\\/]/).pop() || "unknown.nessus";
        
        toast.promise(
          invoke<NessusReport>("import_nessus_file", {
            filePath,
            filename,
          }),
          {
            loading: "Importing Nessus file...",
            success: (result) => {
              loadReports();
              return `Successfully imported ${result.filename}`;
            },
            error: (error) => `Failed to import file: ${error}`,
          }
        );
      }
    } catch (error) {
      toast.error("Failed to open file dialog: " + String(error));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteReport = async (reportId: number, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      await invoke("delete_report", { reportId });
      toast.success("Report deleted successfully");
      loadReports();
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
        setHosts([]);
      }
    } catch (error) {
      toast.error("Failed to delete report: " + String(error));
    }
  };

  const handleViewReport = async (report: NessusReport) => {
    try {
      setLoading(true);
      setSelectedReport(report);
      const [, hostsData] = await invoke<[NessusReport, NessusHost[]]>("get_report_details", {
        reportId: report.id,
      });
      setHosts(hostsData);
    } catch (error) {
      toast.error("Failed to load report details: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string, count: number) => {
    if (count === 0) return "secondary";
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Upload Manager</h1>
          <p className="text-muted-foreground">
            Import and manage your Nessus scan files
          </p>
        </div>
        <Button onClick={handleFileUpload} disabled={uploading}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Nessus File
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{reports.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Monitor className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Hosts</p>
                <p className="text-2xl font-bold">
                  {reports.reduce((sum, report) => sum + report.totalHosts, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Vulnerabilities</p>
                <p className="text-2xl font-bold">
                  {reports.reduce((sum, report) => sum + report.totalVulnerabilities, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Latest Scan</p>
                <p className="text-2xl font-bold">
                  {reports.length > 0 ? formatDate(reports[0].createdAt) : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          {selectedReport && <TabsTrigger value="details">Report Details</TabsTrigger>}
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading reports...</div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No reports uploaded yet. Click &quot;Upload Nessus File&quot; to get started.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Scan Name</TableHead>
                      <TableHead>Scan Date</TableHead>
                      <TableHead>Hosts</TableHead>
                      <TableHead>Vulnerabilities</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.filename}</TableCell>
                        <TableCell>{report.scanName}</TableCell>
                        <TableCell>{formatDate(report.scanDate)}</TableCell>
                        <TableCell>{report.totalHosts}</TableCell>
                        <TableCell>{report.totalVulnerabilities}</TableCell>
                        <TableCell>{formatDate(report.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReport(report)}
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteReport(report.id, report.filename)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {selectedReport && (
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{selectedReport.filename} - Host Details</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading host details...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hostname</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>OS Info</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            Critical
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            High
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            Medium
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-blue-600" />
                            Low
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <Info className="h-4 w-4 text-gray-600" />
                            Info
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hosts.map((host) => (
                        <TableRow key={host.id}>
                          <TableCell className="font-medium">{host.hostname}</TableCell>
                          <TableCell>{host.ipAddress}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {host.osInfo || "Unknown"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getSeverityColor("critical", host.criticalCount)}>
                              {host.criticalCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getSeverityColor("high", host.highCount)}>
                              {host.highCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getSeverityColor("medium", host.mediumCount)}>
                              {host.mediumCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getSeverityColor("low", host.lowCount)}>
                              {host.lowCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getSeverityColor("info", host.infoCount)}>
                              {host.infoCount}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

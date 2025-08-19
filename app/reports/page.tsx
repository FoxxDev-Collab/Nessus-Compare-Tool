"use client";

import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import {
  FileText,
  Calendar,
  Monitor,
  Shield,
  AlertTriangle,
  Info,
  Settings,

  Server,
  Search,
  Filter,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScanMetadataModal } from "@/components/ScanMetadataModal";

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

interface ReportItem {
  id: number;
  reportId: number;
  hostId: number;
  hostname: string;
  ipAddress: string;
  macAddress?: string;
  pluginId: number;
  pluginName: string;
  pluginFamily: string;
  severity: number;
  port?: string;
  protocol?: string;
  service?: string;
  description?: string;
  solution?: string;
  synopsis?: string;
  cve?: string;
  cvssScore?: number;
  pluginOutput?: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<NessusReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<NessusReport | null>(null);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState<Record<string, unknown> | null>(null);
  const [selectedReportName, setSelectedReportName] = useState<string>("");
  const [showItemDetail, setShowItemDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReportItem | null>(null);

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

  const handleSelectReport = async (reportId: string) => {
    if (!reportId) {
      setSelectedReport(null);
      setReportItems([]);
      setFilteredItems([]);
      return;
    }

    const report = reports.find(r => r.id.toString() === reportId);
    if (!report) return;

    try {
      setLoading(true);
      setSelectedReport(report);
      setReportItems([]);
      setFilteredItems([]);
      setSearchTerm("");
      setSeverityFilter("all");
      
      const items = await invoke<ReportItem[]>("get_all_report_items", {
        reportId: report.id,
      });
      setReportItems(items);
    } catch (error) {
      toast.error("Failed to load report items: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  const filterItems = useCallback(() => {
    let filtered = [...reportItems];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.pluginName.toLowerCase().includes(search) ||
        item.pluginId.toString().includes(search) ||
        item.ipAddress.includes(search) ||
        item.hostname.toLowerCase().includes(search) ||
        item.pluginFamily.toLowerCase().includes(search) ||
        item.macAddress?.toLowerCase().includes(search)
      );
    }

    // Apply severity filter
    if (severityFilter !== "all") {
      const severity = parseInt(severityFilter);
      filtered = filtered.filter(item => item.severity === severity);
    }

    setFilteredItems(filtered);
  }, [reportItems, searchTerm, severityFilter]);

  useEffect(() => {
    filterItems();
  }, [filterItems]);

  const handleViewMetadata = async (report: NessusReport) => {
    try {
      const metadataJson = await invoke<string | null>("get_scan_metadata", {
        reportId: report.id,
      });
      
      if (metadataJson) {
        const metadata = JSON.parse(metadataJson);
        setSelectedMetadata(metadata);
        setSelectedReportName(report.scanName);
        setShowMetadataModal(true);
      } else {
        toast.info("No scan metadata available for this report");
      }
    } catch (error) {
      toast.error("Failed to load scan metadata: " + String(error));
    }
  };

  const getSeverityText = (severity: number) => {
    switch (severity) {
      case 4: return "Critical";
      case 3: return "High";
      case 2: return "Medium";
      case 1: return "Low";
      case 0: return "Info";
      default: return "Unknown";
    }
  };

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 4: return "destructive";
      case 3: return "destructive";
      case 2: return "default";
      case 1: return "secondary";
      case 0: return "outline";
      default: return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewItemDetail = (item: ReportItem) => {
    setSelectedItem(item);
    setShowItemDetail(true);
  };

  const getSeverityStats = () => {
    const stats = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    filteredItems.forEach(item => {
      switch (item.severity) {
        case 4: stats.critical++; break;
        case 3: stats.high++; break;
        case 2: stats.medium++; break;
        case 1: stats.low++; break;
        case 0: stats.info++; break;
      }
    });
    return stats;
  };

  if (loading && !selectedReport) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  const stats = getSeverityStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Vulnerability Analysis
        </h1>
      </div>

      {/* Report Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Select Report to Analyze
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedReport?.id.toString() || ""} onValueChange={handleSelectReport}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a report to analyze..." />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((report) => (
                    <SelectItem key={report.id} value={report.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium">{report.scanName}</div>
                          <div className="text-xs text-muted-foreground">
                            {report.filename} • {formatDate(report.scanDate)} • {report.totalHosts} hosts
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedReport && (
              <Button
                variant="outline"
                onClick={() => handleViewMetadata(selectedReport)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                View Scan Metadata
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Vulnerability Table */}
      {selectedReport && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Vulnerabilities - {selectedReport.scanName}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <Monitor className="h-4 w-4" />
                    {selectedReport.totalHosts} hosts
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    {filteredItems.length} findings
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(selectedReport.scanDate)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.critical} Critical
                </Badge>
                <Badge variant="destructive" className="bg-orange-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.high} High
                </Badge>
                <Badge variant="default" className="bg-yellow-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.medium} Medium
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {stats.low + stats.info} Low/Info
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by Plugin ID, Plugin Name, IP Address, Hostname..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="4">Critical</SelectItem>
                  <SelectItem value="3">High</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="1">Low</SelectItem>
                  <SelectItem value="0">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading vulnerabilities...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No vulnerabilities found matching your criteria</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Plugin ID</TableHead>
                      <TableHead>Plugin Name</TableHead>
                      <TableHead className="w-[120px]">Severity</TableHead>
                      <TableHead className="w-[140px]">IP Address</TableHead>
                      <TableHead className="w-[120px]">MAC Address</TableHead>
                      <TableHead className="w-[80px]">Port</TableHead>
                      <TableHead className="w-[80px]">Protocol</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={`${item.id}-${item.hostId}`}>
                        <TableCell className="font-mono">{item.pluginId}</TableCell>
                        <TableCell className="font-medium">{item.pluginName}</TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(item.severity)}>
                            {getSeverityText(item.severity)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{item.ipAddress}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.macAddress || "N/A"}
                        </TableCell>
                        <TableCell className="font-mono">{item.port || "N/A"}</TableCell>
                        <TableCell className="font-mono">{item.protocol || "N/A"}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewItemDetail(item)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedReport && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Select a Report to Get Started</h3>
            <p className="text-muted-foreground">
              Choose a report from the dropdown above to view detailed vulnerability information.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Item Detail Modal */}
      <Dialog open={showItemDetail} onOpenChange={setShowItemDetail}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Plugin {selectedItem?.pluginId}: {selectedItem?.pluginName}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.ipAddress} ({selectedItem?.hostname}) • {selectedItem?.pluginFamily}
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Vulnerability Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plugin ID:</span>
                      <span className="font-mono">{selectedItem.pluginId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Severity:</span>
                      <Badge variant={getSeverityColor(selectedItem.severity)}>
                        {getSeverityText(selectedItem.severity)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Family:</span>
                      <span>{selectedItem.pluginFamily}</span>
                    </div>
                    {selectedItem.cvssScore && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CVSS Score:</span>
                        <span className="font-mono">{selectedItem.cvssScore}</span>
                      </div>
                    )}
                    {selectedItem.cve && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CVE:</span>
                        <span className="font-mono">{selectedItem.cve}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Host Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IP Address:</span>
                      <span className="font-mono">{selectedItem.ipAddress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hostname:</span>
                      <span>{selectedItem.hostname}</span>
                    </div>
                    {selectedItem.macAddress && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MAC Address:</span>
                        <span className="font-mono">{selectedItem.macAddress}</span>
                      </div>
                    )}
                    {selectedItem.port && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Port:</span>
                        <span className="font-mono">{selectedItem.port}</span>
                      </div>
                    )}
                    {selectedItem.protocol && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Protocol:</span>
                        <span className="font-mono">{selectedItem.protocol}</span>
                      </div>
                    )}
                    {selectedItem.service && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span>{selectedItem.service}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <div className="bg-muted/30 p-3 rounded-md text-sm whitespace-pre-wrap">
                    {selectedItem.description}
                  </div>
                </div>
              )}

              {/* Synopsis */}
              {selectedItem.synopsis && (
                <div>
                  <h4 className="font-medium mb-2">Synopsis</h4>
                  <div className="bg-muted/30 p-3 rounded-md text-sm">
                    {selectedItem.synopsis}
                  </div>
                </div>
              )}

              {/* Solution */}
              {selectedItem.solution && (
                <div>
                  <h4 className="font-medium mb-2">Solution</h4>
                  <div className="bg-muted/30 p-3 rounded-md text-sm whitespace-pre-wrap">
                    {selectedItem.solution}
                  </div>
                </div>
              )}

              {/* Plugin Output */}
              {selectedItem.pluginOutput && (
                <div>
                  <h4 className="font-medium mb-2">Plugin Output</h4>
                  <div className="bg-black text-green-400 p-3 rounded-md text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {selectedItem.pluginOutput}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Scan Metadata Modal */}
      <ScanMetadataModal
        isOpen={showMetadataModal}
        onClose={() => setShowMetadataModal(false)}
        metadata={selectedMetadata || {}}
        reportName={selectedReportName}
      />
    </div>
  );
}
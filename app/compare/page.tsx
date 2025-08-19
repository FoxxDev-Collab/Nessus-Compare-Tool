"use client";

import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { FileText, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VulnerabilityTable } from "@/components/VulnerabilityTable";
import { HostTable } from "@/components/HostTable";

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
  macAddress: string | null;
  osInfo: string | null;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
}

interface NessusVulnerability {
  id: number;
  reportId: number;
  hostId: number;
  pluginId: number;
  pluginName: string;
  pluginFamily: string;
  severity: number;
  port: string | null;
  protocol: string | null;
  service: string | null;
  description: string | null;
  solution: string | null;
  cve: string | null;
  cvssScore: number | null;
}

interface ReportData {
  report: NessusReport;
  hosts: NessusHost[];
  vulnerabilities: NessusVulnerability[];
}

export default function ComparePage() {
  const [reports, setReports] = useState<NessusReport[]>([]);
  const [selectedReport1, setSelectedReport1] = useState<string>("");
  const [selectedReport2, setSelectedReport2] = useState<string>("");
  const [reportData1, setReportData1] = useState<ReportData | null>(null);
  const [reportData2, setReportData2] = useState<ReportData | null>(null);

  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const result = await invoke<NessusReport[]>("list_reports");
      setReports(result);
    } catch (error) {
      toast.error("Failed to load reports: " + String(error));
    }
  };

  const loadReportData = async (reportId: number): Promise<{ hosts: NessusHost[], vulnerabilities: NessusVulnerability[] }> => {
    try {
      // Get report details (hosts)
      const [, hosts] = await invoke<[NessusReport, NessusHost[]]>("get_report_details", { reportId });
      
      // Try to get all vulnerabilities directly first
      let vulnerabilities: NessusVulnerability[] = [];
      try {
        vulnerabilities = await invoke<NessusVulnerability[]>("get_report_vulnerabilities", { reportId });
      } catch {
        // If direct approach fails, use the host-based approach
        for (const host of hosts) {
          const hostVulns = await invoke<NessusVulnerability[]>("get_host_vulnerabilities", { hostId: host.id });
          vulnerabilities.push(...hostVulns);
        }
      }
      
      return { hosts, vulnerabilities };
    } catch (error) {
      console.error(`Failed to load data for report ${reportId}:`, error);
      throw error;
    }
  };

  const handleLoadReports = async () => {
    if (!selectedReport1 || !selectedReport2) {
      toast.error("Please select two reports to display");
      return;
    }

    try {
      setLoadingReports(true);
      
      // Load both reports in parallel
      const [data1, data2] = await Promise.all([
        loadReportData(parseInt(selectedReport1)),
        loadReportData(parseInt(selectedReport2))
      ]);

      // Get report details from the reports list
      const report1 = reports.find(r => r.id === parseInt(selectedReport1))!;
      const report2 = reports.find(r => r.id === parseInt(selectedReport2))!;

      setReportData1({ 
        report: report1, 
        hosts: data1.hosts,
        vulnerabilities: data1.vulnerabilities 
      });
      setReportData2({ 
        report: report2, 
        hosts: data2.hosts,
        vulnerabilities: data2.vulnerabilities 
      });
      
      toast.success(`Reports loaded successfully: ${data1.hosts.length}/${data2.hosts.length} hosts, ${data1.vulnerabilities.length}/${data2.vulnerabilities.length} vulnerabilities`);
    } catch (error) {
      console.error("Error loading reports:", error);
      toast.error("Failed to load reports: " + String(error));
    } finally {
      setLoadingReports(false);
    }
  };

  const handleClear = () => {
    setSelectedReport1("");
    setSelectedReport2("");
    setReportData1(null);
    setReportData2(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getVulnerabilityComparison = () => {
    if (!reportData1 || !reportData2) return null;

    const vulns1 = reportData1.vulnerabilities;
    const vulns2 = reportData2.vulnerabilities;

    // Create maps for comparison based on plugin ID
    const pluginMap1 = new Map(vulns1.map(v => [v.pluginId, v]));
    const pluginMap2 = new Map(vulns2.map(v => [v.pluginId, v]));

    const commonPluginIds = new Set([...pluginMap1.keys()].filter(id => pluginMap2.has(id)));
    const uniqueToReport1 = vulns1.filter(v => !pluginMap2.has(v.pluginId));
    const uniqueToReport2 = vulns2.filter(v => !pluginMap1.has(v.pluginId));
    const commonVulns = vulns1.filter(v => pluginMap2.has(v.pluginId));

    // Calculate severity counts
    const getSeverityCounts = (vulns: NessusVulnerability[]) => ({
      critical: vulns.filter(v => v.severity === 4).length,
      high: vulns.filter(v => v.severity === 3).length,
      medium: vulns.filter(v => v.severity === 2).length,
      low: vulns.filter(v => v.severity === 1).length,
      info: vulns.filter(v => v.severity === 0).length,
    });

    return {
      common: commonVulns,
      uniqueToReport1,
      uniqueToReport2,
      commonCounts: getSeverityCounts(commonVulns),
      unique1Counts: getSeverityCounts(uniqueToReport1),
      unique2Counts: getSeverityCounts(uniqueToReport2),
    };
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

  const getHostComparison = () => {
    if (!reportData1 || !reportData2) return null;

    const hosts1 = reportData1.hosts;
    const hosts2 = reportData2.hosts;
    const vulns1 = reportData1.vulnerabilities;
    const vulns2 = reportData2.vulnerabilities;

    // Create maps for comparison based on IP address
    const hostMap1 = new Map(hosts1.map(h => [h.ipAddress, h]));
    const hostMap2 = new Map(hosts2.map(h => [h.ipAddress, h]));

    const commonHostIPs = new Set([...hostMap1.keys()].filter(ip => hostMap2.has(ip)));
    const uniqueToReport1 = hosts1.filter(h => !hostMap2.has(h.ipAddress));
    const uniqueToReport2 = hosts2.filter(h => !hostMap1.has(h.ipAddress));
    const commonHosts = hosts1.filter(h => hostMap2.has(h.ipAddress));

    // Get vulnerabilities for common hosts
    const getVulnsForHosts = (hostIds: number[], vulns: NessusVulnerability[]) => {
      const hostIdSet = new Set(hostIds);
      return vulns.filter(v => hostIdSet.has(v.hostId));
    };

    const commonHostIds1 = commonHosts.map(h => h.id);
    const commonHostIds2 = commonHosts.map(h => hostMap2.get(h.ipAddress)?.id).filter(Boolean) as number[];

    const commonHostVulns1 = getVulnsForHosts(commonHostIds1, vulns1);
    const commonHostVulns2 = getVulnsForHosts(commonHostIds2, vulns2);

    // Find vulnerabilities that are common between the common hosts
    const commonHostsPluginMap1 = new Map(commonHostVulns1.map(v => [`${v.hostId}-${v.pluginId}`, v]));
    const commonHostsPluginMap2 = new Map(commonHostVulns2.map(v => {
      // Map host ID from report2 to corresponding host in report1
      const host2 = hosts2.find(h => h.id === v.hostId);
      const host1 = host2 ? hostMap1.get(host2.ipAddress) : null;
      const mappedKey = host1 ? `${host1.id}-${v.pluginId}` : `${v.hostId}-${v.pluginId}`;
      return [mappedKey, v];
    }));

    const sharedVulnKeys = new Set([...commonHostsPluginMap1.keys()].filter(key => commonHostsPluginMap2.has(key)));
    const vulnerabilitiesOnlyInReport1 = commonHostVulns1.filter(v => !commonHostsPluginMap2.has(`${v.hostId}-${v.pluginId}`));
    const vulnerabilitiesOnlyInReport2 = commonHostVulns2.filter(v => {
      const host2 = hosts2.find(h => h.id === v.hostId);
      const host1 = host2 ? hostMap1.get(host2.ipAddress) : null;
      const mappedKey = host1 ? `${host1.id}-${v.pluginId}` : `${v.hostId}-${v.pluginId}`;
      return !sharedVulnKeys.has(mappedKey);
    });
    const sharedVulnerabilities = commonHostVulns1.filter(v => sharedVulnKeys.has(`${v.hostId}-${v.pluginId}`));

    // Calculate severity counts
    const getSeverityCounts = (vulns: NessusVulnerability[]) => ({
      critical: vulns.filter(v => v.severity === 4).length,
      high: vulns.filter(v => v.severity === 3).length,
      medium: vulns.filter(v => v.severity === 2).length,
      low: vulns.filter(v => v.severity === 1).length,
      info: vulns.filter(v => v.severity === 0).length,
    });

    return {
      commonHosts,
      uniqueToReport1,
      uniqueToReport2,
      sharedVulnerabilities,
      vulnerabilitiesOnlyInReport1,
      vulnerabilitiesOnlyInReport2,
      sharedVulnCounts: getSeverityCounts(sharedVulnerabilities),
      uniqueVuln1Counts: getSeverityCounts(vulnerabilitiesOnlyInReport1),
      uniqueVuln2Counts: getSeverityCounts(vulnerabilitiesOnlyInReport2),
    };
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">View Reports Side by Side</h1>
          <p className="text-muted-foreground">
            Display two Nessus scan reports side by side for easy comparison
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Reports to Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report 1</label>
              <Select value={selectedReport1} onValueChange={setSelectedReport1}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first report" />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((report) => (
                    <SelectItem key={report.id} value={report.id.toString()}>
                      {report.filename} ({formatDate(report.scanDate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Report 2</label>
              <Select value={selectedReport2} onValueChange={setSelectedReport2}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second report" />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((report) => (
                    <SelectItem 
                      key={report.id} 
                      value={report.id.toString()}
                      disabled={report.id.toString() === selectedReport1}
                    >
                      {report.filename} ({formatDate(report.scanDate)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleLoadReports} 
              disabled={!selectedReport1 || !selectedReport2 || loadingReports}
              className="flex-1 md:flex-none"
            >
              <FileText className="mr-2 h-4 w-4" />
              {loadingReports ? "Loading..." : "Load Reports"}
            </Button>
            <Button 
              onClick={handleClear}
              variant="outline"
              disabled={loadingReports}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {(reportData1 && reportData2) && (
        <Tabs defaultValue="vulnerabilities" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vulnerabilities">Side-by-Side View</TabsTrigger>
            <TabsTrigger value="comparison">Vulnerability Analysis</TabsTrigger>
            <TabsTrigger value="hosts">Host Comparison</TabsTrigger>
          </TabsList>
          
          <TabsContent value="vulnerabilities">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VulnerabilityTable
                title={reportData1.report.filename}
                vulnerabilities={reportData1.vulnerabilities}
                loading={loadingReports}
              />
              <VulnerabilityTable
                title={reportData2.report.filename}
                vulnerabilities={reportData2.vulnerabilities}
                loading={loadingReports}
              />
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            {(() => {
              const comparison = getVulnerabilityComparison();
              if (!comparison) return null;

              return (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-green-800">
                          <Shield className="h-5 w-5" />
                          Common Vulnerabilities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-900 mb-2">
                          {comparison.common.length}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Critical:</span>
                            <Badge variant="destructive">{comparison.commonCounts.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>High:</span>
                            <Badge variant="destructive">{comparison.commonCounts.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Medium:</span>
                            <Badge variant="default">{comparison.commonCounts.medium}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-orange-200 bg-orange-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-orange-800">
                          <AlertTriangle className="h-5 w-5" />
                          Unique to {reportData1.report.filename}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-900 mb-2">
                          {comparison.uniqueToReport1.length}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Critical:</span>
                            <Badge variant="destructive">{comparison.unique1Counts.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>High:</span>
                            <Badge variant="destructive">{comparison.unique1Counts.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Medium:</span>
                            <Badge variant="default">{comparison.unique1Counts.medium}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-blue-800">
                          <AlertTriangle className="h-5 w-5" />
                          Unique to {reportData2.report.filename}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-900 mb-2">
                          {comparison.uniqueToReport2.length}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Critical:</span>
                            <Badge variant="destructive">{comparison.unique2Counts.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>High:</span>
                            <Badge variant="destructive">{comparison.unique2Counts.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Medium:</span>
                            <Badge variant="default">{comparison.unique2Counts.medium}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Tables */}
                  <div className="grid grid-cols-1 gap-6">
                    {/* Common Vulnerabilities */}
                    {comparison.common.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-green-600" />
                            Common Vulnerabilities ({comparison.common.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="max-h-96 overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Plugin ID</TableHead>
                                  <TableHead>Plugin Name</TableHead>
                                  <TableHead>Family</TableHead>
                                  <TableHead>Severity</TableHead>
                                  <TableHead>CVSS Score</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {comparison.common.map((vuln) => (
                                  <TableRow key={vuln.id}>
                                    <TableCell className="font-mono">{vuln.pluginId}</TableCell>
                                    <TableCell className="max-w-xs truncate" title={vuln.pluginName}>
                                      {vuln.pluginName}
                                    </TableCell>
                                    <TableCell>{vuln.pluginFamily}</TableCell>
                                    <TableCell>
                                      <Badge variant={getSeverityColor(vuln.severity) as "default" | "secondary" | "destructive" | "outline"}>
                                        {getSeverityText(vuln.severity)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{vuln.cvssScore?.toFixed(1) || "N/A"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Unique Vulnerabilities */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {comparison.uniqueToReport1.length > 0 && (
                        <Card className="border-orange-200">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-700">
                              <AlertTriangle className="h-5 w-5" />
                              Only in {reportData1.report.filename}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="max-h-96 overflow-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Plugin ID</TableHead>
                                    <TableHead>Plugin Name</TableHead>
                                    <TableHead>Severity</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {comparison.uniqueToReport1.slice(0, 20).map((vuln) => (
                                    <TableRow key={vuln.id}>
                                      <TableCell className="font-mono">{vuln.pluginId}</TableCell>
                                      <TableCell className="max-w-xs truncate" title={vuln.pluginName}>
                                        {vuln.pluginName}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={getSeverityColor(vuln.severity) as "default" | "secondary" | "destructive" | "outline"}>
                                          {getSeverityText(vuln.severity)}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {comparison.uniqueToReport1.length > 20 && (
                                <div className="text-center py-2 text-sm text-muted-foreground">
                                  Showing 20 of {comparison.uniqueToReport1.length} vulnerabilities
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {comparison.uniqueToReport2.length > 0 && (
                        <Card className="border-blue-200">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-700">
                              <AlertTriangle className="h-5 w-5" />
                              Only in {reportData2.report.filename}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="max-h-96 overflow-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Plugin ID</TableHead>
                                    <TableHead>Plugin Name</TableHead>
                                    <TableHead>Severity</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {comparison.uniqueToReport2.slice(0, 20).map((vuln) => (
                                    <TableRow key={vuln.id}>
                                      <TableCell className="font-mono">{vuln.pluginId}</TableCell>
                                      <TableCell className="max-w-xs truncate" title={vuln.pluginName}>
                                        {vuln.pluginName}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={getSeverityColor(vuln.severity) as "default" | "secondary" | "destructive" | "outline"}>
                                          {getSeverityText(vuln.severity)}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {comparison.uniqueToReport2.length > 20 && (
                                <div className="text-center py-2 text-sm text-muted-foreground">
                                  Showing 20 of {comparison.uniqueToReport2.length} vulnerabilities
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </TabsContent>
          
          <TabsContent value="hosts">
            {(() => {
              const hostComparison = getHostComparison();
              if (!hostComparison) return null;

              return (
                <div className="space-y-6">
                  {/* Host Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-green-800">
                          <Shield className="h-5 w-5" />
                          Common Hosts
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-900 mb-2">
                          {hostComparison.commonHosts.length}
                        </div>
                        <p className="text-sm text-green-700">
                          Hosts present in both scans
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-orange-200 bg-orange-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-orange-800">
                          <AlertTriangle className="h-5 w-5" />
                          Only in {reportData1.report.filename}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-900 mb-2">
                          {hostComparison.uniqueToReport1.length}
                        </div>
                        <p className="text-sm text-orange-700">
                          Hosts not found in second scan
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-blue-800">
                          <AlertTriangle className="h-5 w-5" />
                          Only in {reportData2.report.filename}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-900 mb-2">
                          {hostComparison.uniqueToReport2.length}
                        </div>
                        <p className="text-sm text-blue-700">
                          New hosts in second scan
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Vulnerability Comparison for Common Hosts */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-emerald-200 bg-emerald-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-emerald-800">
                          <Shield className="h-5 w-5" />
                          Persistent Vulnerabilities
                        </CardTitle>
                        <p className="text-xs text-emerald-600">Found on same hosts in both scans</p>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-emerald-900 mb-2">
                          {hostComparison.sharedVulnerabilities.length}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Critical:</span>
                            <Badge variant="destructive">{hostComparison.sharedVulnCounts.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>High:</span>
                            <Badge variant="destructive">{hostComparison.sharedVulnCounts.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Medium:</span>
                            <Badge variant="default">{hostComparison.sharedVulnCounts.medium}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-red-200 bg-red-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-red-800">
                          <AlertTriangle className="h-5 w-5" />
                          Resolved Vulnerabilities
                        </CardTitle>
                        <p className="text-xs text-red-600">Present in scan 1, absent in scan 2</p>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-900 mb-2">
                          {hostComparison.vulnerabilitiesOnlyInReport1.length}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Critical:</span>
                            <Badge variant="destructive">{hostComparison.uniqueVuln1Counts.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>High:</span>
                            <Badge variant="destructive">{hostComparison.uniqueVuln1Counts.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Medium:</span>
                            <Badge variant="default">{hostComparison.uniqueVuln1Counts.medium}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-amber-200 bg-amber-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-amber-800">
                          <AlertTriangle className="h-5 w-5" />
                          New Vulnerabilities
                        </CardTitle>
                        <p className="text-xs text-amber-600">Absent in scan 1, present in scan 2</p>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-amber-900 mb-2">
                          {hostComparison.vulnerabilitiesOnlyInReport2.length}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Critical:</span>
                            <Badge variant="destructive">{hostComparison.uniqueVuln2Counts.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>High:</span>
                            <Badge variant="destructive">{hostComparison.uniqueVuln2Counts.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Medium:</span>
                            <Badge variant="default">{hostComparison.uniqueVuln2Counts.medium}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Side-by-Side Host Tables */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <HostTable
                      title={reportData1.report.filename}
                      hosts={reportData1.hosts}
                      loading={loadingReports}
                    />
                    <HostTable
                      title={reportData2.report.filename}
                      hosts={reportData2.hosts}
                      loading={loadingReports}
                    />
                  </div>

                  {/* Detailed Vulnerability Comparison Tables */}
                  <div className="grid grid-cols-1 gap-6">
                    {/* Persistent Vulnerabilities */}
                    {hostComparison.sharedVulnerabilities.length > 0 && (
                      <Card className="border-emerald-200">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-emerald-700">
                            <Shield className="h-5 w-5" />
                            Persistent Vulnerabilities on Common Hosts ({hostComparison.sharedVulnerabilities.length})
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Vulnerabilities that remain on the same hosts across both scans
                          </p>
                        </CardHeader>
                        <CardContent>
                          <div className="max-h-96 overflow-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Plugin ID</TableHead>
                                  <TableHead>Plugin Name</TableHead>
                                  <TableHead>Host IP</TableHead>
                                  <TableHead>Severity</TableHead>
                                  <TableHead>CVSS Score</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {hostComparison.sharedVulnerabilities.slice(0, 20).map((vuln) => {
                                  const host = reportData1.hosts.find(h => h.id === vuln.hostId);
                                  return (
                                    <TableRow key={`${vuln.id}-shared`}>
                                      <TableCell className="font-mono">{vuln.pluginId}</TableCell>
                                      <TableCell className="max-w-xs truncate" title={vuln.pluginName}>
                                        {vuln.pluginName}
                                      </TableCell>
                                      <TableCell className="font-mono">{host?.ipAddress || "N/A"}</TableCell>
                                      <TableCell>
                                        <Badge variant={getSeverityColor(vuln.severity) as "default" | "secondary" | "destructive" | "outline"}>
                                          {getSeverityText(vuln.severity)}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{vuln.cvssScore?.toFixed(1) || "N/A"}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                            {hostComparison.sharedVulnerabilities.length > 20 && (
                              <div className="text-center py-2 text-sm text-muted-foreground">
                                Showing 20 of {hostComparison.sharedVulnerabilities.length} vulnerabilities
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Resolved and New Vulnerabilities Side by Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {hostComparison.vulnerabilitiesOnlyInReport1.length > 0 && (
                        <Card className="border-red-200">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-700">
                              <AlertTriangle className="h-5 w-5" />
                              Resolved Vulnerabilities ({hostComparison.vulnerabilitiesOnlyInReport1.length})
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              Vulnerabilities that were remediated between scans
                            </p>
                          </CardHeader>
                          <CardContent>
                            <div className="max-h-96 overflow-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Plugin ID</TableHead>
                                    <TableHead>Plugin Name</TableHead>
                                    <TableHead>Host IP</TableHead>
                                    <TableHead>Severity</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {hostComparison.vulnerabilitiesOnlyInReport1.slice(0, 15).map((vuln) => {
                                    const host = reportData1.hosts.find(h => h.id === vuln.hostId);
                                    return (
                                      <TableRow key={`${vuln.id}-resolved`}>
                                        <TableCell className="font-mono">{vuln.pluginId}</TableCell>
                                        <TableCell className="max-w-xs truncate" title={vuln.pluginName}>
                                          {vuln.pluginName}
                                        </TableCell>
                                        <TableCell className="font-mono">{host?.ipAddress || "N/A"}</TableCell>
                                        <TableCell>
                                          <Badge variant={getSeverityColor(vuln.severity) as "default" | "secondary" | "destructive" | "outline"}>
                                            {getSeverityText(vuln.severity)}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                              {hostComparison.vulnerabilitiesOnlyInReport1.length > 15 && (
                                <div className="text-center py-2 text-sm text-muted-foreground">
                                  Showing 15 of {hostComparison.vulnerabilitiesOnlyInReport1.length} vulnerabilities
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {hostComparison.vulnerabilitiesOnlyInReport2.length > 0 && (
                        <Card className="border-amber-200">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-700">
                              <AlertTriangle className="h-5 w-5" />
                              New Vulnerabilities ({hostComparison.vulnerabilitiesOnlyInReport2.length})
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              Vulnerabilities that appeared between scans
                            </p>
                          </CardHeader>
                          <CardContent>
                            <div className="max-h-96 overflow-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Plugin ID</TableHead>
                                    <TableHead>Plugin Name</TableHead>
                                    <TableHead>Host IP</TableHead>
                                    <TableHead>Severity</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {hostComparison.vulnerabilitiesOnlyInReport2.slice(0, 15).map((vuln) => {
                                    const host = reportData2.hosts.find(h => h.id === vuln.hostId);
                                    return (
                                      <TableRow key={`${vuln.id}-new`}>
                                        <TableCell className="font-mono">{vuln.pluginId}</TableCell>
                                        <TableCell className="max-w-xs truncate" title={vuln.pluginName}>
                                          {vuln.pluginName}
                                        </TableCell>
                                        <TableCell className="font-mono">{host?.ipAddress || "N/A"}</TableCell>
                                        <TableCell>
                                          <Badge variant={getSeverityColor(vuln.severity) as "default" | "secondary" | "destructive" | "outline"}>
                                            {getSeverityText(vuln.severity)}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                              {hostComparison.vulnerabilitiesOnlyInReport2.length > 15 && (
                                <div className="text-center py-2 text-sm text-muted-foreground">
                                  Showing 15 of {hostComparison.vulnerabilitiesOnlyInReport2.length} vulnerabilities
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

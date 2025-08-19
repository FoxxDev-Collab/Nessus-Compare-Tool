"use client";

import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { FileText, Shield, AlertTriangle, Printer } from "lucide-react";
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
  const comparisonContentRef = useRef<HTMLDivElement>(null);

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

  const handlePrint = async () => {
    if (!comparisonContentRef.current || !reportData1 || !reportData2) {
      toast.error("Cannot print report, content or data is missing.");
      return;
    }

    toast.info("Generating printable report...");

    try {
      // Use Tailwind CDN so Tailwind classes render in the exported HTML without relying on compiled CSS
      const cssContent = "";

      // Ensure all tab panels are mounted (Radix/shadcn often lazy-mounts inactive tabs)
      const rootEl = comparisonContentRef.current as HTMLElement;
      if (rootEl) {
        const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
        // Search the whole document in case tab headers live outside the captured container
        const tablists = document.querySelectorAll('[role="tablist"]');
        for (const tl of Array.from(tablists)) {
          const tabs = (tl as HTMLElement).querySelectorAll('[role="tab"]');
          const currentActive = (tl as HTMLElement).querySelector('[role="tab"][data-state="active"], [role="tab"][aria-selected="true"]') as HTMLElement | null;
          for (const tab of Array.from(tabs)) {
            (tab as HTMLElement).click();
            // Give React time to mount/render
            // Slight delay to allow effects/state updates
            // 120ms is usually enough; adjust if needed
            // eslint-disable-next-line no-await-in-loop
            await wait(120);
          }
          if (currentActive) {
            currentActive.click();
            // eslint-disable-next-line no-await-in-loop
            await wait(60);
          }
        }
      }

      const contentHtml = comparisonContentRef.current.innerHTML;
      const reportTitle = `Comparison: ${reportData1.report.filename} vs ${reportData2.report.filename}`;

      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en" class="light">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${reportTitle}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <script>
              tailwind.config = { darkMode: 'class' };
            </script>
            <style>
              ${cssContent}
              /* Print-specific adjustments */
              @page { size: auto; margin: 1in; }
              html, body { background: white; }
              .no-print { display: none !important; }
            </style>
          </head>
          <body class="bg-white text-black">
            <h1 class="text-3xl font-bold mb-4">${reportTitle}</h1>
            ${contentHtml}
            <script>
              (function() {
                function initTabs(root) {
                  var tablists = root.querySelectorAll('[role="tablist"]');
                  tablists.forEach(function(tl){
                    var tabs = tl.querySelectorAll('[role="tab"]');
                    tabs.forEach(function(tab){
                      tab.addEventListener('click', function(){
                        // current group containers
                        var group = tl;
                        var allTabs = group.querySelectorAll('[role="tab"]');
                        // find panels by aria-controls
                        var panelIds = Array.from(allTabs).map(function(t){ return t.getAttribute('aria-controls'); });
                        var panels = [];
                        panelIds.forEach(function(id){
                          if (!id) return;
                          var p = root.querySelector('#' + CSS.escape(id));
                          if (p) panels.push(p);
                        });

                        // deactivate all
                        allTabs.forEach(function(t){
                          t.setAttribute('aria-selected','false');
                          t.setAttribute('data-state','inactive');
                        });
                        panels.forEach(function(p){
                          p.setAttribute('data-state','inactive');
                          p.setAttribute('hidden','');
                          p.style.display = 'none';
                        });

                        // activate clicked
                        tab.setAttribute('aria-selected','true');
                        tab.setAttribute('data-state','active');
                        var targetId = tab.getAttribute('aria-controls');
                        if (targetId) {
                          var panel = root.querySelector('#' + CSS.escape(targetId));
                          if (panel) {
                            panel.removeAttribute('hidden');
                            panel.style.display = 'block';
                            panel.setAttribute('data-state','active');
                          }
                        }
                      });
                    });

                    // ensure initial state is consistent
                    var active = tl.querySelector('[role="tab"][data-state="active"], [role="tab"][aria-selected="true"]') || tabs[0];
                    if (active) active.click();
                  });
                }

                document.addEventListener('DOMContentLoaded', function(){
                  initTabs(document);
                });
              })();
            </script>
          </body>
        </html>
      `;

      const filePath = await save({
        title: "Save Report",
        defaultPath: `Nessus_Compare_${reportData1.report.id}_vs_${reportData2.report.id}.html`,
        filters: [{ name: 'HTML Document', extensions: ['html'] }],
      });

      if (filePath) {
        await writeTextFile(filePath, fullHtml);
        toast.success(`Report saved to ${filePath}`);
      } else {
        toast.info("Save operation cancelled.");
      }
    } catch (error) {
      console.error("Failed to generate or save report:", error);
      toast.error("Failed to generate report: " + String(error));
    }
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

  const getHostComparison = () => {
    if (!reportData1 || !reportData2) return null;

    const hosts1 = reportData1.hosts;
    const hosts2 = reportData2.hosts;
    const vulns1 = reportData1.vulnerabilities;
    const vulns2 = reportData2.vulnerabilities;

    const hostMap1 = new Map(hosts1.map(h => [h.ipAddress, h]));
    const hostMap2 = new Map(hosts2.map(h => [h.ipAddress, h]));

    const commonHostIPs = new Set([...hostMap1.keys()].filter(ip => hostMap2.has(ip)));
    const uniqueToReport1 = hosts1.filter(h => !hostMap2.has(h.ipAddress));
    const uniqueToReport2 = hosts2.filter(h => !hostMap1.has(h.ipAddress));
    const commonHosts = hosts1.filter(h => hostMap2.has(h.ipAddress));

    // Simplified vulnerability comparison for common hosts
    const getVulnsForHostIds = (ids: number[], vulns: NessusVulnerability[]) => {
      const idSet = new Set(ids);
      return vulns.filter(v => idSet.has(v.hostId));
    };

    const commonHostIds1 = commonHosts.map(h => h.id);
    const commonHostIds2 = [...commonHostIPs].map(ip => hostMap2.get(ip)!.id);

    const vulnsOnCommonHosts1 = getVulnsForHostIds(commonHostIds1, vulns1);
    const vulnsOnCommonHosts2 = getVulnsForHostIds(commonHostIds2, vulns2);

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
      vulnsOnCommonHosts1,
      vulnsOnCommonHosts2,
      counts1: getSeverityCounts(vulnsOnCommonHosts1),
      counts2: getSeverityCounts(vulnsOnCommonHosts2),
    };
  };

  const getDeltaComparison = () => {
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
    // A vulnerability is identified by its pluginId AND the host it's on.
    // Since hostIds are different across reports, we map them using the host's IP address.
    const keyForVuln = (vuln: NessusVulnerability, host: NessusHost) => `${host.ipAddress}-${vuln.pluginId}`;

    const vulnMap1 = new Map<string, NessusVulnerability>();
    for (const host of hosts1) {
      const hostVulns = vulns1.filter(v => v.hostId === host.id);
      for (const vuln of hostVulns) {
        vulnMap1.set(keyForVuln(vuln, host), vuln);
      }
    }

    const vulnMap2 = new Map<string, NessusVulnerability>();
    for (const host of hosts2) {
      const hostVulns = vulns2.filter(v => v.hostId === host.id);
      for (const vuln of hostVulns) {
        vulnMap2.set(keyForVuln(vuln, host), vuln);
      }
    }

    const resolvedVulns: NessusVulnerability[] = []; // In 1, not in 2
    const newVulns: NessusVulnerability[] = []; // In 2, not in 1
    const persistentVulns: NessusVulnerability[] = []; // In both

    for (const [key, vuln] of vulnMap1.entries()) {
      if (vulnMap2.has(key)) {
        persistentVulns.push(vuln);
      } else {
        resolvedVulns.push(vuln);
      }
    }

    for (const [key, vuln] of vulnMap2.entries()) {
      if (!vulnMap1.has(key)) {
        newVulns.push(vuln);
      }
    }
    
    // Calculate severity counts
    const getSeverityCounts = (vulns: NessusVulnerability[]) => ({
      critical: vulns.filter(v => v.severity === 4).length,
      high: vulns.filter(v => v.severity === 3).length,
      medium: vulns.filter(v => v.severity === 2).length,
      low: vulns.filter(v => v.severity === 1).length,
      info: vulns.filter(v => v.severity === 0).length,
    });

    return {
      new: newVulns,
      resolved: resolvedVulns,
      persistent: persistentVulns,
      newCounts: getSeverityCounts(newVulns),
      resolvedCounts: getSeverityCounts(resolvedVulns),
      persistentCounts: getSeverityCounts(persistentVulns),
      hostsOnlyIn1: uniqueToReport1,
      hostsOnlyIn2: uniqueToReport2,
      commonHosts,
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
            <Button 
              onClick={handlePrint}
              variant="outline"
              disabled={!reportData1 || !reportData2}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {(reportData1 && reportData2) && (
        <div ref={comparisonContentRef}>
          <Tabs defaultValue="delta" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="delta">Delta Report</TabsTrigger>
            <TabsTrigger value="hosts">Host Comparison</TabsTrigger>
            <TabsTrigger value="side-by-side">Side-by-Side</TabsTrigger>
            <TabsTrigger value="sets">Vulnerability Sets</TabsTrigger>
          </TabsList>

          <TabsContent value="delta">
            {(() => {
              const delta = getDeltaComparison();
              if (!delta) return null;

              return (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-blue-200 bg-blue-50 text-black dark:text-black card-light">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-black dark:text-black">
                          <AlertTriangle className="h-5 w-5" />
                          New Vulnerabilities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-black dark:text-black mb-2">
                          {delta.new.length}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Critical:</span>
                            <Badge variant="outline" className="bg-red-600 text-white border-transparent">{delta.newCounts.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>High:</span>
                            <Badge variant="outline" className="bg-orange-500 text-white border-transparent">{delta.newCounts.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Medium:</span>
                            <Badge variant="outline" className="bg-amber-400 text-black border-transparent">{delta.newCounts.medium}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-green-200 bg-green-50 text-black dark:text-black card-light">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-black dark:text-black">
                          <Shield className="h-5 w-5" />
                          Resolved Vulnerabilities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-black dark:text-black mb-2">
                          {delta.resolved.length}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Critical:</span>
                            <Badge variant="outline" className="bg-red-600 text-white border-transparent">{delta.resolvedCounts.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>High:</span>
                            <Badge variant="outline" className="bg-orange-500 text-white border-transparent">{delta.resolvedCounts.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Medium:</span>
                            <Badge variant="outline" className="bg-amber-400 text-black border-transparent">{delta.resolvedCounts.medium}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-gray-200 bg-gray-50 text-black dark:text-black card-light">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-black dark:text-black">
                          <FileText className="h-5 w-5" />
                          Persistent Vulnerabilities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-black dark:text-black mb-2">
                          {delta.persistent.length}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Critical:</span>
                            <Badge variant="outline" className="bg-red-600 text-white border-transparent">{delta.persistentCounts.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>High:</span>
                            <Badge variant="outline" className="bg-orange-500 text-white border-transparent">{delta.persistentCounts.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Medium:</span>
                            <Badge variant="outline" className="bg-amber-400 text-black border-transparent">{delta.persistentCounts.medium}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Tables */}
                  <div className="grid grid-cols-1 gap-6">
                    <VulnerabilityTable title="New Vulnerabilities" vulnerabilities={delta.new} />
                    <VulnerabilityTable title="Resolved Vulnerabilities" vulnerabilities={delta.resolved} />
                    <VulnerabilityTable title="Persistent Vulnerabilities" vulnerabilities={delta.persistent} />
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

                  {/* Detailed Host Tables */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <HostTable title={`Hosts only in ${reportData1.report.filename}`} hosts={hostComparison.uniqueToReport1} />
                    <HostTable title={`Hosts only in ${reportData2.report.filename}`} hosts={hostComparison.uniqueToReport2} />
                  </div>
                  <HostTable title="Common Hosts" hosts={hostComparison.commonHosts} />
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="side-by-side">
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

          <TabsContent value="sets">
            {(() => {
              const comparison = getVulnerabilityComparison();
              if (!comparison) return null;

              return (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-green-200 bg-green-50 text-black dark:text-black card-light">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-black dark:text-black">
                          <Shield className="h-5 w-5" />
                          Common Vulnerabilities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-black dark:text-black mb-2">
                          {comparison.common.length}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Critical:</span>
                            <Badge variant="outline" className="bg-red-600 text-white border-transparent">{comparison.commonCounts.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>High:</span>
                            <Badge variant="outline" className="bg-orange-500 text-white border-transparent">{comparison.commonCounts.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Medium:</span>
                            <Badge variant="outline" className="bg-amber-400 text-black border-transparent">{comparison.commonCounts.medium}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-orange-200 bg-orange-50 text-black dark:text-black card-light">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-black dark:text-black">
                          <AlertTriangle className="h-5 w-5" />
                          Unique to {reportData1.report.filename}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-black dark:text-black mb-2">
                          {comparison.uniqueToReport1.length}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Critical:</span>
                            <Badge variant="outline" className="bg-red-600 text-white border-transparent">{comparison.unique1Counts.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>High:</span>
                            <Badge variant="outline" className="bg-orange-500 text-white border-transparent">{comparison.unique1Counts.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Medium:</span>
                            <Badge variant="outline" className="bg-amber-400 text-black border-transparent">{comparison.unique1Counts.medium}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-50 text-black dark:text-black card-light">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-black dark:text-black">
                          <AlertTriangle className="h-5 w-5" />
                          Unique to {reportData2.report.filename}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-black dark:text-black mb-2">
                          {comparison.uniqueToReport2.length}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Critical:</span>
                            <Badge variant="outline" className="bg-red-600 text-white border-transparent">{comparison.unique2Counts.critical}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>High:</span>
                            <Badge variant="outline" className="bg-orange-500 text-white border-transparent">{comparison.unique2Counts.high}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Medium:</span>
                            <Badge variant="outline" className="bg-amber-400 text-black border-transparent">{comparison.unique2Counts.medium}</Badge>
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
          
          </Tabs>
        </div>
      )}
    </div>
  );
}

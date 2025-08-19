"use client";

import React, { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CheckSquare, Square, Calendar, Shield, BarChart3, RefreshCcw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";

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
  severity: number; // 0..4
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

export default function TrendsPage() {
  const [reports, setReports] = useState<NessusReport[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [dataByReport, setDataByReport] = useState<Record<number, ReportData>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const result = await invoke<NessusReport[]>("list_reports");
      // sort by scan date ascending for time charts
      result.sort((a, b) => new Date(a.scanDate).getTime() - new Date(b.scanDate).getTime());
      setReports(result);
    } catch (error) {
      toast.error("Failed to load reports: " + String(error));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectLatest = (count: number) => {
    const latest = [...reports]
      .sort((a, b) => new Date(b.scanDate).getTime() - new Date(a.scanDate).getTime())
      .slice(0, count)
      .map((r) => r.id);
    setSelectedIds(new Set(latest));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const loadSelected = async () => {
    if (selectedIds.size === 0) {
      toast.info("Select at least one report.");
      return;
    }
    setLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(ids.map(async (id) => {
        // hosts
        const [, hosts] = await invoke<[NessusReport, NessusHost[]]>("get_report_details", { reportId: id });
        // vulns
        let vulnerabilities: NessusVulnerability[] = [];
        try {
          vulnerabilities = await invoke<NessusVulnerability[]>("get_report_vulnerabilities", { reportId: id });
        } catch {
          // fallback: aggregate from hosts if needed
          const hostVulns: NessusVulnerability[] = [];
          for (const h of hosts) {
            const hv = await invoke<NessusVulnerability[]>("get_host_vulnerabilities", { hostId: h.id });
            hostVulns.push(...hv);
          }
          vulnerabilities = hostVulns;
        }
        const report = reports.find(r => r.id === id)!;
        return [id, { report, hosts, vulnerabilities }] as const;
      }));

      const map: Record<number, ReportData> = {};
      for (const [id, rd] of results) map[id] = rd;
      setDataByReport(map);
      toast.success(`Loaded ${results.length} report(s) for trends.`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load selected reports: " + String(error));
    } finally {
      setLoading(false);
    }
  };

  const severityByReport = useMemo(() => {
    const out: Array<{
      key: string; // label
      id: number;
      critical: number;
      high: number;
      medium: number;
      low: number;
      info: number;
      total: number;
      date: string;
    }> = [];
    const ids = Array.from(selectedIds).filter((id) => dataByReport[id]);
    for (const id of ids) {
      const rd = dataByReport[id];
      const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
      for (const v of rd.vulnerabilities) {
        if (v.severity === 4) counts.critical++;
        else if (v.severity === 3) counts.high++;
        else if (v.severity === 2) counts.medium++;
        else if (v.severity === 1) counts.low++;
        else counts.info++;
      }
      out.push({
        key: `${rd.report.scanName || rd.report.filename}`,
        id,
        ...counts,
        total: rd.vulnerabilities.length,
        date: rd.report.scanDate,
      });
    }
    // sort by date
    out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return out;
  }, [selectedIds, dataByReport]);

  const timeSeries = useMemo(() => {
    // For line chart: x = date, y = total vulns; also provide label
    return severityByReport.map((r) => ({
      dateLabel: new Date(r.date).toLocaleDateString(),
      total: r.total,
      label: r.key,
    }));
  }, [severityByReport]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const getBadgeVariant = (severity: "critical" | "high" | "medium" | "low" | "info") => {
    switch (severity) {
      case "critical":
      case "high":
        return "destructive" as const;
      case "medium":
        return "default" as const;
      case "low":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" /> Trends Across Scans
          </h1>
          <p className="text-muted-foreground">Compare severity and totals across multiple scans to see remediation progress over time.</p>
        </div>
      </div>

      {/* Selection Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Select Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => selectLatest(2)}>
              Latest 2
            </Button>
            <Button variant="outline" size="sm" onClick={() => selectLatest(3)}>
              Latest 3
            </Button>
            <Button variant="outline" size="sm" onClick={() => selectLatest(5)}>
              Latest 5
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>

          <div className="max-h-64 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]"></TableHead>
                  <TableHead>Scan Name</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Vulns</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => {
                  const checked = selectedIds.has(r.id);
                  return (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => toggleSelect(r.id)}>
                      <TableCell className="w-[60px]">
                        {checked ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{r.scanName}</TableCell>
                      <TableCell className="text-muted-foreground">{r.filename}</TableCell>
                      <TableCell className="font-mono text-sm">{formatDate(r.scanDate)}</TableCell>
                      <TableCell className="text-right">{r.totalVulnerabilities}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Button onClick={loadSelected} disabled={loading || selectedIds.size === 0}>
              <Shield className="mr-2 h-4 w-4" />
              {loading ? "Loading..." : "Load Selected"}
            </Button>
            <Button variant="outline" onClick={loadReports} disabled={loading}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh List
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* When data loaded */}
      {Object.keys(dataByReport).length > 0 && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Selected Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(dataByReport).length}</div>
                <div className="text-sm text-muted-foreground">Across {severityByReport.reduce((acc, r) => acc + (dataByReport[r.id]?.hosts.length || 0), 0)} hosts</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Date Range</CardTitle>
              </CardHeader>
              <CardContent>
                {severityByReport.length > 0 ? (
                  <div className="text-sm">
                    {formatDate(severityByReport[0].date)} → {formatDate(severityByReport[severityByReport.length - 1].date)}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">N/A</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Total Findings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{severityByReport.reduce((acc, r) => acc + r.total, 0)}</div>
                <div className="text-sm text-muted-foreground">Sum across selected scans</div>
              </CardContent>
            </Card>
          </div>

          {/* Grouped Bar: Severity by Report */}
          <Card>
            <CardHeader>
              <CardTitle>Severity Distribution by Scan</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  // Tailwind palette approximations for consistent theming
                  critical: {
                    label: "Critical",
                    theme: { light: "#ef4444", dark: "#f87171" }, // red-500/400
                  },
                  high: {
                    label: "High",
                    theme: { light: "#f59e0b", dark: "#fbbf24" }, // amber-500/400
                  },
                  medium: {
                    label: "Medium",
                    theme: { light: "#eab308", dark: "#facc15" }, // yellow-500/400
                  },
                  low: {
                    label: "Low",
                    theme: { light: "#38bdf8", dark: "#7dd3fc" }, // sky-400/300
                  },
                  info: {
                    label: "Info",
                    theme: { light: "#94a3b8", dark: "#cbd5e1" }, // slate-400/300
                  },
                }}
                className="h-[360px]"
              >
                <BarChart data={severityByReport} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="key" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="critical" stackId="a" fill="var(--color-critical)" />
                  <Bar dataKey="high" stackId="a" fill="var(--color-high)" />
                  <Bar dataKey="medium" stackId="a" fill="var(--color-medium)" />
                  <Bar dataKey="low" stackId="a" fill="var(--color-low)" />
                  <Bar dataKey="info" stackId="a" fill="var(--color-info)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Line: Total over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Total Findings Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  total: {
                    label: "Total Findings",
                    theme: { light: "#3b82f6", dark: "#60a5fa" }, // blue-500/400
                  },
                }}
                className="h-[320px]"
              >
                <LineChart data={timeSeries} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateLabel" />
                  <YAxis />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="var(--color-total)" dot />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>Comparison Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scan</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Critical</TableHead>
                      <TableHead>High</TableHead>
                      <TableHead>Medium</TableHead>
                      <TableHead>Low</TableHead>
                      <TableHead>Info</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {severityByReport.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.key}</TableCell>
                        <TableCell className="font-mono text-sm">{formatDate(r.date)}</TableCell>
                        <TableCell className="font-semibold">{r.total}</TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant("critical")}>{r.critical}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant("high")}>{r.high}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant("medium")}>{r.medium}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant("low")}>{r.low}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant("info")}>{r.info}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HostTable } from "@/components/HostTable";
import { Shield, Monitor, Bug } from "lucide-react";

interface AggregatedHost {
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
  port?: string | null;
  protocol?: string | null;
  service?: string | null;
  description?: string | null;
  solution?: string | null;
  cve?: string | null;
  cvssScore?: number | null;
}

export default function HostAnalysisPage() {
  const [hosts, setHosts] = useState<AggregatedHost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AggregatedHost | null>(null);
  const [vulns, setVulns] = useState<NessusVulnerability[]>([]);
  const [vulnsLoading, setVulnsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await invoke<AggregatedHost[]>("get_host_analysis");
        setHosts(data);
      } catch (e) {
        toast.error("Failed to load host analysis: " + String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadVulns = async () => {
      if (!selected) {
        setVulns([]);
        return;
      }
      try {
        setVulnsLoading(true);
        const ipIdentity = selected.ipAddress;
        const macIdentity = selected.macAddress ?? null;
        const data = await invoke<NessusVulnerability[]>("get_vulnerabilities_by_identity", {
          ipIdentity,
          macIdentity,
        });
        setVulns(data);
      } catch (e) {
        toast.error("Failed to load vulnerabilities: " + String(e));
        setVulns([]);
      } finally {
        setVulnsLoading(false);
      }
    };
    loadVulns();
  }, [selected]);

  const totals = hosts.reduce(
    (acc, h) => {
      acc.totalHosts += 1;
      acc.totalVulns += h.totalVulnerabilities;
      acc.critical += h.criticalCount;
      acc.high += h.highCount;
      acc.medium += h.mediumCount;
      acc.low += h.lowCount;
      acc.info += h.infoCount;
      return acc;
    },
    { totalHosts: 0, totalVulns: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 }
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Host Analysis</h1>
          <p className="text-muted-foreground">Aggregated host risk across all imported reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Monitor className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Hosts</p>
                <p className="text-2xl font-bold">{totals.totalHosts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Bug className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Vulnerabilities</p>
                <p className="text-2xl font-bold">{totals.totalVulns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Critical Findings</p>
                <p className="text-2xl font-bold">{totals.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <HostTable
          title="Aggregated Hosts"
          hosts={hosts}
          loading={loading}
          onHostClick={(h) => setSelected(h)}
        />

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Host Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              {selected
                ? `${selected.hostname} (${selected.ipAddress || "no IP"})${selected.macAddress ? ` • MAC: ${selected.macAddress}` : ""}`
                : "Select a host to view details"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <div className="text-muted-foreground">No host selected.</div>
            ) : (
              <>
                <div>
                  <div className="font-semibold mb-2">Aggregated Vulnerabilities (all scans)</div>
                  {vulnsLoading ? (
                    <div className="text-sm">Loading vulnerabilities…</div>
                  ) : vulns.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No vulnerabilities to display.</div>
                  ) : (
                    <div className="max-h-[420px] overflow-auto border rounded">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/50">
                          <tr>
                            <th className="text-left p-2">Severity</th>
                            <th className="text-left p-2">Plugin</th>
                            <th className="text-left p-2">CVSS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vulns.map((v) => (
                            <tr key={v.id} className="odd:bg-muted/30">
                              <td className="p-2">{v.severity}</td>
                              <td className="p-2 truncate" title={v.pluginName}>{v.pluginName}</td>
                              <td className="p-2">{v.cvssScore ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

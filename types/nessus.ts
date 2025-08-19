export interface NessusReport {
  id: number;
  filename: string;
  scanName: string;
  scanDate: string;
}

export interface NessusHost {
  id: number;
  reportId: number;
  hostname: string;
  ipAddress: string;
}

export interface NessusVulnerability {
  id: number;
  hostId: number;
  reportId: number;
  pluginId: number;
  pluginName: string;
  severity: number;
  pluginFamily: string;
  port: string | null;
  protocol: string | null;
  service: string | null;
  description: string | null;
  solution: string | null;
  cve: string | null;
  cvssScore: number | null;
}

export interface ReportData {
  report: NessusReport;
  hosts: NessusHost[];
  vulnerabilities: NessusVulnerability[];
}

export interface DeltaComparison {
  new: NessusVulnerability[];
  resolved: NessusVulnerability[];
  persistent: NessusVulnerability[];
  newCounts: Record<string, number>;
  resolvedCounts: Record<string, number>;
  persistentCounts: Record<string, number>;
}

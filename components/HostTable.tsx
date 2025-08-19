"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface HostTableProps {
  title: string;
  hosts: NessusHost[];
  loading?: boolean;
}



export function HostTable({ title, hosts, loading = false }: HostTableProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {hosts.length} hosts
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Hostname</TableHead>
                <TableHead>MAC Address</TableHead>
                <TableHead>Operating System</TableHead>
                <TableHead>Total Vulns</TableHead>
                <TableHead>Critical</TableHead>
                <TableHead>High</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead>Low</TableHead>
                <TableHead>Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading hosts...
                  </TableCell>
                </TableRow>
              ) : hosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No hosts found
                  </TableCell>
                </TableRow>
              ) : (
                hosts.map((host) => (
                  <TableRow key={host.id}>
                    <TableCell className="font-medium">{host.ipAddress}</TableCell>
                    <TableCell className="max-w-xs truncate" title={host.hostname}>
                      {host.hostname}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={host.macAddress || undefined}>
                      {host.macAddress || "N/A"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={host.osInfo || undefined}>
                      {host.osInfo || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {host.totalVulnerabilities}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={host.criticalCount > 0 ? "destructive" : "outline"}>
                        {host.criticalCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={host.highCount > 0 ? "destructive" : "outline"}>
                        {host.highCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={host.mediumCount > 0 ? "default" : "outline"}>
                        {host.mediumCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={host.lowCount > 0 ? "secondary" : "outline"}>
                        {host.lowCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={host.infoCount > 0 ? "outline" : "outline"}>
                        {host.infoCount}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

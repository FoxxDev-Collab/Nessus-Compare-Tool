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
          <Table className="">
            <TableHeader className="sticky top-0 z-10 bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/30">
              <TableRow>
                <TableHead className="text-foreground">IP Address</TableHead>
                <TableHead className="text-foreground">Hostname</TableHead>
                <TableHead className="text-foreground">MAC Address</TableHead>
                <TableHead className="text-foreground">Operating System</TableHead>
                <TableHead className="text-foreground">Total Vulns</TableHead>
                <TableHead className="text-foreground">Critical</TableHead>
                <TableHead className="text-foreground">High</TableHead>
                <TableHead className="text-foreground">Medium</TableHead>
                <TableHead className="text-foreground">Low</TableHead>
                <TableHead className="text-foreground">Info</TableHead>
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
                  <TableRow key={host.id} className="odd:bg-muted/30">
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
                      <Badge variant="outline" className="bg-slate-600 text-white border-transparent">
                        {host.totalVulnerabilities}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={host.criticalCount > 0 ? "bg-red-600 text-white border-transparent" : "bg-gray-300 text-black border-transparent"}
                        title="Critical"
                      >
                        {host.criticalCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={host.highCount > 0 ? "bg-orange-500 text-white border-transparent" : "bg-gray-300 text-black border-transparent"}
                        title="High"
                      >
                        {host.highCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={host.mediumCount > 0 ? "bg-amber-400 text-black border-transparent" : "bg-gray-300 text-black border-transparent"}
                        title="Medium"
                      >
                        {host.mediumCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={host.lowCount > 0 ? "bg-blue-500 text-white border-transparent" : "bg-gray-300 text-black border-transparent"}
                        title="Low"
                      >
                        {host.lowCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={host.infoCount > 0 ? "bg-gray-400 text-black border-transparent" : "bg-gray-300 text-black border-transparent"}
                        title="Info"
                      >
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

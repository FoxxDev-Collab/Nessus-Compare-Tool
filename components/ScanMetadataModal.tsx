"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Info,
  Shield,
  Server,

  Settings,
  AlertTriangle,
  Network,

} from "lucide-react";

interface ScanMetadata {
  nessusVersion?: string;
  nessusBuild?: string;
  pluginFeedVersion?: string;
  scannerEdition?: string;
  scannerOS?: string;
  scannerDistribution?: string;
  scanType?: string;
  scanName?: string;
  scanPolicy?: string;
  scannerIP?: string;
  portRange?: string;
  pingRTT?: string;
  thoroughTests?: string;
  experimentalTests?: string;
  paranoidLevel?: string;
  reportVerbosity?: string;
  safeChecks?: string;
  optimizeTest?: string;
  credentialedChecks?: string;
  maxHosts?: string;
  maxChecks?: string;
  recvTimeout?: string;
  scanStartDate?: string;
  scanDuration?: string;
  warnings?: string[];
}

interface ScanMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: ScanMetadata;
  reportName: string;
}

export function ScanMetadataModal({ isOpen, onClose, metadata, reportName }: ScanMetadataModalProps) {
  const formatDuration = (seconds: string) => {
    const sec = parseInt(seconds);
    if (isNaN(sec)) return seconds;
    
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const remainingSeconds = sec % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const getScanTypeIcon = (scanType?: string) => {
    if (scanType?.toLowerCase().includes('discovery')) {
      return <Network className="h-4 w-4" />;
    }
    return <Shield className="h-4 w-4" />;
  };

  const getScanTypeBadge = (scanType?: string) => {
    if (scanType?.toLowerCase().includes('discovery')) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Host Discovery</Badge>;
    }
    return <Badge variant="outline">{scanType || 'Unknown'}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getScanTypeIcon(metadata.scanType)}
            Scan Metadata - {reportName}
          </DialogTitle>
          <DialogDescription>
            Detailed information about the Nessus scan configuration and execution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warnings */}
          {metadata.warnings && metadata.warnings.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-4 w-4" />
                  Scan Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metadata.warnings.map((warning, index) => (
                    <div key={index} className="text-sm text-orange-700 bg-orange-100 p-2 rounded">
                      {warning}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scan Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Scan Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Scan Type</label>
                    <div className="mt-1">
                      {getScanTypeBadge(metadata.scanType)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Scan Name</label>
                    <p className="text-sm">{metadata.scanName || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Scan Policy</label>
                    <p className="text-sm font-mono text-xs break-all">{metadata.scanPolicy || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                    <p className="text-sm">{metadata.scanStartDate || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Duration</label>
                    <p className="text-sm">{metadata.scanDuration ? formatDuration(metadata.scanDuration) : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Ping RTT</label>
                    <p className="text-sm">{metadata.pingRTT || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scanner Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Scanner Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nessus Version</label>
                    <p className="text-sm">{metadata.nessusVersion || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Build</label>
                    <p className="text-sm">{metadata.nessusBuild || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Plugin Feed Version</label>
                    <p className="text-sm">{metadata.pluginFeedVersion || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Scanner Edition</label>
                    <p className="text-sm">{metadata.scannerEdition || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Scanner IP</label>
                    <p className="text-sm font-mono">{metadata.scannerIP || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Scanner OS</label>
                    <p className="text-sm">{metadata.scannerOS || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Distribution</label>
                    <p className="text-sm">{metadata.scannerDistribution || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Network Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                Network Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Port Range</label>
                  <p className="text-xs font-mono bg-muted p-2 rounded mt-1 break-all">
                    {metadata.portRange || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scan Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Scan Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Thorough Tests</label>
                    <Badge variant={metadata.thoroughTests === 'yes' ? 'default' : 'secondary'}>
                      {metadata.thoroughTests || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Experimental Tests</label>
                    <Badge variant={metadata.experimentalTests === 'yes' ? 'default' : 'secondary'}>
                      {metadata.experimentalTests || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Safe Checks</label>
                    <Badge variant={metadata.safeChecks === 'yes' ? 'default' : 'destructive'}>
                      {metadata.safeChecks || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Optimize Test</label>
                    <Badge variant={metadata.optimizeTest === 'yes' ? 'default' : 'secondary'}>
                      {metadata.optimizeTest || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-muted-foreground">Credentialed Checks</label>
                    <Badge variant={metadata.credentialedChecks === 'yes' ? 'default' : 'secondary'}>
                      {metadata.credentialedChecks || 'N/A'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Paranoia Level</label>
                    <p className="text-sm">{metadata.paranoidLevel || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Report Verbosity</label>
                    <p className="text-sm">{metadata.reportVerbosity || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Max Hosts</label>
                    <p className="text-sm">{metadata.maxHosts || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Max Checks</label>
                    <p className="text-sm">{metadata.maxChecks || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Receive Timeout</label>
                    <p className="text-sm">{metadata.recvTimeout ? `${metadata.recvTimeout}s` : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

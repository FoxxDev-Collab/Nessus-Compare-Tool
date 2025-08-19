"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { FileText, BarChart3, Shield, Server, AlertCircle } from "lucide-react";

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



export default function MainPage() {
  const [reports, setReports] = useState<NessusReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const result = await invoke<NessusReport[]>("list_reports");
      setReports(result);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoading(false);
    }
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Nessus Compare Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Overview of Nessus vulnerability scan reports
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
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
                    <Server className="h-8 w-8 text-green-600" />
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
                    <AlertCircle className="h-8 w-8 text-orange-600" />
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
                    <Shield className="h-8 w-8 text-purple-600" />
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

            {reports.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Reports</CardTitle>
                  <CardDescription>
                    Latest Nessus scan reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reports.slice(0, 5).map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-semibold">{report.scanName}</h3>
                          <p className="text-sm text-muted-foreground">{report.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            Scanned: {formatDate(report.scanDate)} | Uploaded: {formatDate(report.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-lg font-bold">{report.totalHosts}</div>
                              <div className="text-xs text-muted-foreground">Hosts</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold">{report.totalVulnerabilities}</div>
                              <div className="text-xs text-muted-foreground">Vulnerabilities</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  All Reports
                </CardTitle>
                <CardDescription>
                  Complete list of Nessus scan reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{report.scanName}</h3>
                          <p className="text-sm text-muted-foreground">{report.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            Scan Date: {formatDate(report.scanDate)} | Uploaded: {formatDate(report.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-lg font-bold">{report.totalHosts}</div>
                              <div className="text-xs text-muted-foreground">Hosts</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold">{report.totalVulnerabilities}</div>
                              <div className="text-xs text-muted-foreground">Vulnerabilities</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No reports available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}



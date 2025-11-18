'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Eye, Save, Calendar, FileDown, Settings } from 'lucide-react';

interface ReportField {
  id: string;
  name: string;
  type: string;
}

interface ReportFilter {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface SavedReport {
  id: string;
  name: string;
  format: string;
  schedule: string;
  lastRun: string;
  nextRun?: string;
}

export default function ReportBuilderPage() {
  const [reportName, setReportName] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [reportFormat, setReportFormat] = useState('pdf');
  const [scheduleFrequency, setScheduleFrequency] = useState('none');

  const availableFields: ReportField[] = [
    { id: 'fund_name', name: 'Fund Name', type: 'text' },
    { id: 'capital_call_number', name: 'Capital Call Number', type: 'number' },
    { id: 'investor_name', name: 'Investor Name', type: 'text' },
    { id: 'amount_called', name: 'Amount Called', type: 'currency' },
    { id: 'amount_paid', name: 'Amount Paid', type: 'currency' },
    { id: 'due_date', name: 'Due Date', type: 'date' },
    { id: 'payment_date', name: 'Payment Date', type: 'date' },
    { id: 'status', name: 'Status', type: 'text' },
    { id: 'fund_type', name: 'Fund Type', type: 'text' },
    { id: 'vintage_year', name: 'Vintage Year', type: 'number' },
    { id: 'commitment_amount', name: 'Commitment Amount', type: 'currency' },
    { id: 'called_percentage', name: 'Called Percentage', type: 'percentage' },
  ];

  const savedReports: SavedReport[] = [
    {
      id: '1',
      name: 'Monthly Capital Call Summary',
      format: 'PDF',
      schedule: 'Monthly',
      lastRun: '2025-11-01T10:00:00Z',
      nextRun: '2025-12-01T10:00:00Z',
    },
    {
      id: '2',
      name: 'Investor Payment Report',
      format: 'Excel',
      schedule: 'Weekly',
      lastRun: '2025-11-15T09:00:00Z',
      nextRun: '2025-11-22T09:00:00Z',
    },
    {
      id: '3',
      name: 'Fund Performance Dashboard',
      format: 'PDF',
      schedule: 'None',
      lastRun: '2025-11-10T14:30:00Z',
    },
  ];

  const handleAddField = (fieldId: string) => {
    if (!selectedFields.includes(fieldId)) {
      setSelectedFields([...selectedFields, fieldId]);
    }
  };

  const handleRemoveField = (fieldId: string) => {
    setSelectedFields(selectedFields.filter(f => f !== fieldId));
  };

  const handleAddFilter = () => {
    const newFilter: ReportFilter = {
      id: Math.random().toString(),
      field: '',
      operator: 'equals',
      value: '',
    };
    setFilters([...filters, newFilter]);
  };

  const handleRemoveFilter = (filterId: string) => {
    setFilters(filters.filter(f => f.id !== filterId));
  };

  const handlePreview = () => {
    console.log('Previewing report with:', { reportName, selectedFields, filters, reportFormat });
  };

  const handleSave = () => {
    console.log('Saving report template:', { reportName, selectedFields, filters, reportFormat, scheduleFrequency });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Custom Report Builder
        </h1>
        <p className="text-muted-foreground">
          Design custom reports with drag-and-drop field selection and advanced filters
        </p>
      </div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Field Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Available Fields</CardTitle>
                <CardDescription>
                  Click to add fields to your report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableFields.map((field) => (
                    <button
                      key={field.id}
                      onClick={() => handleAddField(field.id)}
                      disabled={selectedFields.includes(field.id)}
                      className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div>
                        <p className="font-medium text-sm">{field.name}</p>
                        <p className="text-xs text-muted-foreground">{field.type}</p>
                      </div>
                      <Plus className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Report Configuration */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Report Configuration</CardTitle>
                  <CardDescription>
                    Configure your custom report settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="report-name">Report Name</Label>
                    <Input
                      id="report-name"
                      placeholder="Enter report name"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Selected Fields</Label>
                    <div className="min-h-[100px] p-4 border rounded-lg">
                      {selectedFields.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No fields selected. Add fields from the left panel.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedFields.map((fieldId) => {
                            const field = availableFields.find(f => f.id === fieldId);
                            return (
                              <Badge key={fieldId} variant="outline" className="flex items-center gap-2">
                                {field?.name}
                                <button
                                  onClick={() => handleRemoveField(fieldId)}
                                  className="hover:text-destructive"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="format">Output Format</Label>
                      <Select value={reportFormat} onValueChange={setReportFormat}>
                        <SelectTrigger id="format">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="schedule">Schedule</Label>
                      <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                        <SelectTrigger id="schedule">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Filters</CardTitle>
                      <CardDescription>
                        Add conditions to filter your report data
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleAddFilter}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {filters.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No filters applied. Click "Add Filter" to add conditions.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {filters.map((filter) => (
                        <div key={filter.id} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Select defaultValue="">
                              <SelectTrigger>
                                <SelectValue placeholder="Select field" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFields.map((field) => (
                                  <SelectItem key={field.id} value={field.id}>
                                    {field.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Select defaultValue="equals">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">Equals</SelectItem>
                                <SelectItem value="not_equals">Not Equals</SelectItem>
                                <SelectItem value="contains">Contains</SelectItem>
                                <SelectItem value="greater_than">Greater Than</SelectItem>
                                <SelectItem value="less_than">Less Than</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Input placeholder="Value" />
                          </div>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleRemoveFilter(filter.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handlePreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Report
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle>Saved Report Templates</CardTitle>
              <CardDescription>
                Manage your saved report templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.format}</Badge>
                      </TableCell>
                      <TableCell>{report.schedule}</TableCell>
                      <TableCell>{formatDateTime(report.lastRun)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <FileDown className="w-3 h-3 mr-1" />
                            Run
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>
                Reports configured for automatic delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Name</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedReports.filter(r => r.nextRun).map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>{report.schedule}</TableCell>
                      <TableCell>{report.nextRun ? formatDateTime(report.nextRun) : '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">3 recipients</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-500">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

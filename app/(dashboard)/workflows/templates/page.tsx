// Clearway - Workflow Templates Page

'use client';

import React, { useEffect, useState } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WorkflowTemplatesPage() {
  const { organization } = useOrganization();
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [industry, setIndustry] = useState('all');

  useEffect(() => {
    loadTemplates();
  }, [category, industry]);

  const loadTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.append('category', category);
      if (industry !== 'all') params.append('industry', industry);

      const response = await fetch(`/api/workflow-templates?${params}`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (templateId: string, templateName: string) => {
    if (!organization) return;

    try {
      const response = await fetch(`/api/workflow-templates/${templateId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: organization.id,
          name: `${templateName} (Copy)`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/workflows/${data.workflow.id}`);
      } else {
        alert('Failed to use template');
      }
    } catch (error) {
      console.error('Failed to use template:', error);
      alert('Failed to use template');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Workflow Templates</h1>
        <p className="text-gray-600 mt-2">
          Pre-built workflows to get started quickly
        </p>
      </div>

      <div className="flex gap-4 mb-8">
        <div className="w-64">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="payments">Payments</SelectItem>
              <SelectItem value="distributions">Distributions</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
              <SelectItem value="notifications">Notifications</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-64">
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              <SelectItem value="PE">Private Equity</SelectItem>
              <SelectItem value="VC">Venture Capital</SelectItem>
              <SelectItem value="RI">Real Estate</SelectItem>
              <SelectItem value="Hedge">Hedge Funds</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.description && (
                    <CardDescription className="mt-1">
                      {template.description}
                    </CardDescription>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">{template.category}</Badge>
                {template.industry && (
                  <Badge variant="outline">{template.industry}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-sm text-gray-600">
                    {template.rating.toFixed(1)} rating
                  </span>
                  <span className="text-sm text-gray-400">
                    {template.usageCount} uses
                  </span>
                </div>

                <Button
                  className="w-full"
                  onClick={() => handleUseTemplate(template.id, template.name)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">No templates found</h3>
            <p className="text-gray-600">
              Try adjusting your filters or check back later
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActionType } from '@/lib/workflow/workflow-builder';

interface ActionConfiguratorProps {
  action: any;
  onSave: (action: any) => void;
}

export const ActionConfigurator: React.FC<ActionConfiguratorProps> = ({
  action: initialAction,
  onSave,
}) => {
  const [actionType, setActionType] = useState(initialAction.type || '');
  const [config, setConfig] = useState(initialAction.config || {});

  const handleUpdateConfig = (field: string, value: any) => {
    setConfig({ ...config, [field]: value });
  };

  const handleSave = () => {
    onSave({
      ...initialAction,
      type: actionType,
      config,
    });
  };

  const renderConfigFields = () => {
    switch (actionType) {
      case ActionType.SEND_EMAIL:
        return (
          <>
            <div>
              <Label>To (Email)</Label>
              <Input
                value={config.to || ''}
                onChange={(e) => handleUpdateConfig('to', e.target.value)}
                placeholder="{investorEmail} or specific email"
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={config.subject || ''}
                onChange={(e) => handleUpdateConfig('subject', e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label>Template</Label>
              <Textarea
                value={config.template || ''}
                onChange={(e) => handleUpdateConfig('template', e.target.value)}
                placeholder="Email body (use {fieldName} for variables)"
                rows={6}
              />
            </div>
          </>
        );

      case ActionType.CALL_WEBHOOK:
        return (
          <>
            <div>
              <Label>Webhook URL</Label>
              <Input
                value={config.url || ''}
                onChange={(e) => handleUpdateConfig('url', e.target.value)}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={config.method || 'POST'}
                onValueChange={(value) => handleUpdateConfig('method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case ActionType.TAG_ENTITY:
        return (
          <div>
            <Label>Tag Name</Label>
            <Input
              value={config.tag || ''}
              onChange={(e) => handleUpdateConfig('tag', e.target.value)}
              placeholder="e.g., urgent"
            />
          </div>
        );

      case ActionType.UPDATE_STATUS:
        return (
          <div>
            <Label>New Status</Label>
            <Select
              value={config.status || ''}
              onValueChange={(value) => handleUpdateConfig('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case ActionType.REQUIRE_APPROVAL:
        return (
          <div>
            <Label>Description</Label>
            <Textarea
              value={config.description || ''}
              onChange={(e) => handleUpdateConfig('description', e.target.value)}
              placeholder="What needs approval?"
              rows={3}
            />
          </div>
        );

      case ActionType.SLACK_NOTIFICATION:
        return (
          <>
            <div>
              <Label>Channel</Label>
              <Input
                value={config.channel || ''}
                onChange={(e) => handleUpdateConfig('channel', e.target.value)}
                placeholder="#finance"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={config.message || ''}
                onChange={(e) => handleUpdateConfig('message', e.target.value)}
                placeholder="Message (use {fieldName} for variables)"
                rows={4}
              />
            </div>
          </>
        );

      case ActionType.LOG_AUDIT:
        return (
          <div>
            <Label>Description</Label>
            <Textarea
              value={config.description || ''}
              onChange={(e) => handleUpdateConfig('description', e.target.value)}
              placeholder="Audit log description"
              rows={3}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Configure Action</h3>

      <div className="space-y-4">
        <div>
          <Label>Action Type</Label>
          <Select value={actionType} onValueChange={setActionType}>
            <SelectTrigger>
              <SelectValue placeholder="Select action type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ActionType.SEND_EMAIL}>Send Email</SelectItem>
              <SelectItem value={ActionType.CALL_WEBHOOK}>Call Webhook</SelectItem>
              <SelectItem value={ActionType.TAG_ENTITY}>Tag Entity</SelectItem>
              <SelectItem value={ActionType.UPDATE_STATUS}>Update Status</SelectItem>
              <SelectItem value={ActionType.REQUIRE_APPROVAL}>Require Approval</SelectItem>
              <SelectItem value={ActionType.SLACK_NOTIFICATION}>Slack Notification</SelectItem>
              <SelectItem value={ActionType.LOG_AUDIT}>Log Audit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {renderConfigFields()}

        <Button onClick={handleSave} className="w-full">
          Save Action
        </Button>
      </div>
    </div>
  );
};

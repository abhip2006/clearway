'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TriggerType } from '@/lib/workflow/workflow-builder';

interface WorkflowPanelProps {
  node: any;
  onSave: (data: any) => void;
}

export const WorkflowPanel: React.FC<WorkflowPanelProps> = ({ node, onSave }) => {
  const [triggerType, setTriggerType] = useState(
    node.data.trigger?.type || ''
  );

  const handleSave = () => {
    onSave({
      trigger: {
        id: 'trigger-1',
        type: triggerType,
        config: {},
      },
    });
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Configure Trigger</h3>

      <div className="space-y-4">
        <div>
          <Label htmlFor="trigger-type">Trigger Type</Label>
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger id="trigger-type">
              <SelectValue placeholder="Select trigger type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TriggerType.DOCUMENT_UPLOADED}>
                Document Uploaded
              </SelectItem>
              <SelectItem value={TriggerType.CAPITAL_CALL_CREATED}>
                Capital Call Created
              </SelectItem>
              <SelectItem value={TriggerType.CAPITAL_CALL_UPDATED}>
                Capital Call Updated
              </SelectItem>
              <SelectItem value={TriggerType.AMOUNT_THRESHOLD}>
                Amount Threshold
              </SelectItem>
              <SelectItem value={TriggerType.DUE_DATE_APPROACHING}>
                Due Date Approaching
              </SelectItem>
              <SelectItem value={TriggerType.PAYMENT_RECEIVED}>
                Payment Received
              </SelectItem>
              <SelectItem value={TriggerType.STATUS_CHANGED}>
                Status Changed
              </SelectItem>
              <SelectItem value={TriggerType.CUSTOM_FIELD_CHANGED}>
                Custom Field Changed
              </SelectItem>
              <SelectItem value={TriggerType.SCHEDULED}>
                Scheduled
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSave} className="w-full">
          Save Trigger
        </Button>
      </div>
    </div>
  );
};

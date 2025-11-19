'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConditionOperator } from '@/lib/workflow/workflow-builder';
import { Plus, X } from 'lucide-react';

interface ConditionBuilderProps {
  conditions: any[];
  branchName: string;
  onSave: (conditions: any[], branchName: string) => void;
  onAddAction: () => void;
}

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  conditions: initialConditions,
  branchName: initialBranchName,
  onSave,
  onAddAction,
}) => {
  const [conditions, setConditions] = useState(initialConditions);
  const [branchName, setBranchName] = useState(initialBranchName);

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      {
        id: crypto.randomUUID(),
        fieldId: '',
        fieldName: '',
        operator: ConditionOperator.EQUALS,
        value: '',
        combineWith: 'AND',
      },
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleUpdateCondition = (index: number, field: string, value: any) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  const handleSave = () => {
    onSave(conditions, branchName);
  };

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4">Configure Conditions</h3>

      <div className="space-y-4 mb-6">
        <div>
          <Label htmlFor="branch-name">Branch Name</Label>
          <Input
            id="branch-name"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            placeholder="e.g., High Priority"
          />
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <Label>Conditions</Label>
        {conditions.map((condition, index) => (
          <div key={condition.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Rule {index + 1}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveCondition(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div>
              <Label>Field</Label>
              <Input
                value={condition.fieldName}
                onChange={(e) =>
                  handleUpdateCondition(index, 'fieldName', e.target.value)
                }
                placeholder="e.g., amountDue"
              />
            </div>

            <div>
              <Label>Operator</Label>
              <Select
                value={condition.operator}
                onValueChange={(value) =>
                  handleUpdateCondition(index, 'operator', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ConditionOperator.EQUALS}>Equals</SelectItem>
                  <SelectItem value={ConditionOperator.NOT_EQUALS}>Not Equals</SelectItem>
                  <SelectItem value={ConditionOperator.GREATER_THAN}>Greater Than</SelectItem>
                  <SelectItem value={ConditionOperator.LESS_THAN}>Less Than</SelectItem>
                  <SelectItem value={ConditionOperator.CONTAINS}>Contains</SelectItem>
                  <SelectItem value={ConditionOperator.IS_EMPTY}>Is Empty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Value</Label>
              <Input
                value={condition.value}
                onChange={(e) =>
                  handleUpdateCondition(index, 'value', e.target.value)
                }
                placeholder="Enter value"
              />
            </div>

            {index < conditions.length - 1 && (
              <div>
                <Label>Combine with next</Label>
                <Select
                  value={condition.combineWith}
                  onValueChange={(value) =>
                    handleUpdateCondition(index, 'combineWith', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        ))}

        <Button
          variant="outline"
          onClick={handleAddCondition}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Condition
        </Button>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1">
          Save Conditions
        </Button>
        <Button onClick={onAddAction} variant="outline" className="flex-1">
          Add Action
        </Button>
      </div>
    </div>
  );
};

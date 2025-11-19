'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { Zap } from 'lucide-react';

export const TriggerNode = ({ data }: { data: any }) => {
  const getTriggerLabel = () => {
    if (!data.trigger) return 'Configure Trigger';
    return data.trigger.type.replace(/_/g, ' ');
  };

  return (
    <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-purple-500 bg-white min-w-[200px]">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-purple-500" />
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase">
            Trigger
          </div>
          <div className="text-sm font-medium">{getTriggerLabel()}</div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-purple-500"
      />
    </div>
  );
};

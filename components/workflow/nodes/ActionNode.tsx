'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

export const ActionNode = ({ data }: { data: any }) => {
  const getActionLabel = () => {
    if (!data.action?.type) return 'Configure Action';
    return data.action.type.replace(/_/g, ' ');
  };

  return (
    <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-green-500 bg-white min-w-[200px]">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-green-500"
      />
      <div className="flex items-center gap-2">
        <Play className="w-5 h-5 text-green-500" />
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase">
            Action
          </div>
          <div className="text-sm font-medium">{getActionLabel()}</div>
        </div>
      </div>
    </div>
  );
};

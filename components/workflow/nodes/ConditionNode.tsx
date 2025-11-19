'use client';

import React from 'react';
import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

export const ConditionNode = ({ data }: { data: any }) => {
  const conditionCount = data.conditions?.length || 0;

  return (
    <div className="px-4 py-3 shadow-lg rounded-lg border-2 border-blue-500 bg-white min-w-[200px]">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />
      <div className="flex items-center gap-2">
        <GitBranch className="w-5 h-5 text-blue-500" />
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase">
            Condition
          </div>
          <div className="text-sm font-medium">
            {data.branchName || 'Unnamed Branch'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {conditionCount} {conditionCount === 1 ? 'rule' : 'rules'}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
};

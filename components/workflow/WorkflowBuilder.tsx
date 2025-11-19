// Clearway - Visual Workflow Builder
// Workflow Automation Agent - Task WF-004

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  ReactFlowProvider,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TriggerNode } from './nodes/TriggerNode';
import { ConditionNode } from './nodes/ConditionNode';
import { ActionNode } from './nodes/ActionNode';
import { WorkflowPanel } from './panels/WorkflowPanel';
import { ConditionBuilder } from './panels/ConditionBuilder';
import { ActionConfigurator } from './panels/ActionConfigurator';
import { Button } from '@/components/ui/button';

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

export interface WorkflowBuilderProps {
  workflowId?: string;
  organizationId: string;
  onSave?: (workflow: any) => void;
}

function WorkflowBuilderInner({
  workflowId,
  organizationId,
  onSave,
}: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConditionBuilder, setShowConditionBuilder] = useState(false);
  const [showActionConfigurator, setShowActionConfigurator] = useState(false);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [workflowDescription, setWorkflowDescription] = useState('');

  // Load workflow if editing existing
  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    } else {
      // Initialize with trigger node
      setNodes([
        {
          id: 'trigger',
          type: 'trigger',
          data: { trigger: null },
          position: { x: 250, y: 25 },
        },
      ]);
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    try {
      const response = await fetch(`/api/workflows/${id}`);
      const workflow = await response.json();

      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || '');

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // Create trigger node
      newNodes.push({
        id: 'trigger',
        type: 'trigger',
        data: { trigger: workflow.trigger },
        position: { x: 250, y: 25 },
      });

      // Create branch nodes
      workflow.branches.forEach((branch: any, index: number) => {
        const branchNodeId = `branch-${index}`;
        newNodes.push({
          id: branchNodeId,
          type: 'condition',
          data: { conditions: branch.conditions, branchName: branch.name },
          position: { x: 250, y: 150 + index * 150 },
        });

        // Create action nodes for this branch
        branch.actions.forEach((action: any, actionIndex: number) => {
          const actionNodeId = `action-${index}-${actionIndex}`;
          newNodes.push({
            id: actionNodeId,
            type: 'action',
            data: { action },
            position: { x: 550, y: 150 + index * 150 + actionIndex * 80 },
          });

          // Connect condition to action
          newEdges.push({
            id: `edge-${branchNodeId}-${actionNodeId}`,
            source: branchNodeId,
            target: actionNodeId,
            label: 'then',
          });
        });

        // Connect trigger to branch
        newEdges.push({
          id: `edge-trigger-${branchNodeId}`,
          source: 'trigger',
          target: branchNodeId,
        });
      });

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (error) {
      console.error('Failed to load workflow:', error);
    }
  };

  const handleConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const handleAddBranch = () => {
    const branchCount = nodes.filter((n) => n.type === 'condition').length;
    const newBranchId = `branch-${branchCount}`;

    setNodes((nds) => [
      ...nds,
      {
        id: newBranchId,
        type: 'condition',
        data: { conditions: [], branchName: `Branch ${branchCount + 1}` },
        position: { x: 250, y: 150 + branchCount * 150 },
      },
    ]);

    // Connect trigger to new branch
    if (nodes.length > 0) {
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-trigger-${newBranchId}`,
          source: 'trigger',
          target: newBranchId,
        },
      ]);
    }
  };

  const handleAddAction = (sourceNodeId: string) => {
    const actionCount = nodes.filter((n) => n.type === 'action').length;
    const newActionId = `action-new-${actionCount}`;

    // Find source node position
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    const yPos = sourceNode?.position.y || 150;

    setNodes((nds) => [
      ...nds,
      {
        id: newActionId,
        type: 'action',
        data: { action: { id: newActionId, type: '', config: {} } },
        position: { x: 550, y: yPos },
      },
    ]);

    setEdges((eds) => [
      ...eds,
      {
        id: `edge-${sourceNodeId}-${newActionId}`,
        source: sourceNodeId,
        target: newActionId,
        label: 'then',
      },
    ]);
  };

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);

    if (node.type === 'condition') {
      setShowConditionBuilder(true);
      setShowActionConfigurator(false);
    } else if (node.type === 'action') {
      setShowActionConfigurator(true);
      setShowConditionBuilder(false);
    } else {
      setShowConditionBuilder(false);
      setShowActionConfigurator(false);
    }
  }, []);

  const handleSaveWorkflow = async () => {
    // Extract workflow data from nodes and edges
    const trigger = nodes.find((n) => n.type === 'trigger')?.data.trigger;
    const branches: any[] = [];

    // Build branches from condition nodes
    const conditionNodes = nodes.filter((n) => n.type === 'condition');
    for (const condNode of conditionNodes) {
      const branchActions: any[] = [];

      // Find actions connected to this condition
      const actionEdges = edges.filter((e) => e.source === condNode.id);
      for (const edge of actionEdges) {
        const actionNode = nodes.find((n) => n.id === edge.target);
        if (actionNode && actionNode.type === 'action') {
          branchActions.push(actionNode.data.action);
        }
      }

      branches.push({
        id: condNode.id,
        name: condNode.data.branchName,
        conditions: condNode.data.conditions,
        actions: branchActions,
      });
    }

    const workflowData = {
      name: workflowName,
      description: workflowDescription,
      trigger,
      branches,
    };

    if (onSave) {
      onSave(workflowData);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Main canvas */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-2xl font-bold border-none focus:outline-none focus:ring-0"
                placeholder="Workflow Name"
              />
              <input
                type="text"
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="mt-1 text-sm text-gray-600 border-none focus:outline-none focus:ring-0"
                placeholder="Add description..."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleAddBranch}>
                Add Branch
              </Button>
              <Button onClick={handleSaveWorkflow}>
                Save Workflow
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-96 border-l border-gray-200 bg-gray-50 overflow-y-auto">
        {selectedNode && (
          <>
            {selectedNode.type === 'trigger' && (
              <WorkflowPanel
                node={selectedNode}
                onSave={(updatedData) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id ? { ...n, data: updatedData } : n
                    )
                  );
                }}
              />
            )}

            {selectedNode.type === 'condition' && showConditionBuilder && (
              <ConditionBuilder
                conditions={selectedNode.data.conditions || []}
                branchName={selectedNode.data.branchName}
                onSave={(updatedConditions, branchName) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id
                        ? {
                          ...n,
                          data: { ...n.data, conditions: updatedConditions, branchName },
                        }
                        : n
                    )
                  );
                  setShowConditionBuilder(false);
                }}
                onAddAction={() => handleAddAction(selectedNode.id)}
              />
            )}

            {selectedNode.type === 'action' && showActionConfigurator && (
              <ActionConfigurator
                action={selectedNode.data.action}
                onSave={(updatedAction) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id
                        ? { ...n, data: { ...n.data, action: updatedAction } }
                        : n
                    )
                  );
                  setShowActionConfigurator(false);
                }}
              />
            )}
          </>
        )}

        {!selectedNode && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Workflow Builder</h3>
            <p className="text-sm text-gray-600 mb-4">
              Click on nodes to configure them, or add new branches and actions.
            </p>
            <Button onClick={handleAddBranch} className="w-full">
              Add Branch
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner {...props} />
    </ReactFlowProvider>
  );
};

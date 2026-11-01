import React from 'react';
import type { ToolItem } from '../../api/types';
import { BotanicalLeaf } from './BotanicalLeaf';

export interface LeafPerch {
  tool: ToolItem;
  position: [number, number, number];
  rotation: [number, number, number];
}

interface BotanicalLeafClusterProps {
  perches: LeafPerch[];
  branchColor: string;
  isSelectedBranch: boolean;
  onSelectTool: (tool: ToolItem) => void;
}

export const BotanicalLeafCluster: React.FC<BotanicalLeafClusterProps> = ({
  perches,
  branchColor,
  isSelectedBranch,
  onSelectTool,
}) => {
  return (
    <group>
      {perches.map((perch, index) => (
        <BotanicalLeaf
          key={perch.tool.id || perch.tool.slug}
          tool={perch.tool}
          position={perch.position}
          rotation={perch.rotation}
          accentColor={branchColor}
          delayIndex={index}
          isSelectedBranch={isSelectedBranch}
          onSelect={onSelectTool}
        />
      ))}
    </group>
  );
};

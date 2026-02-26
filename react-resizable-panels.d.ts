// react-resizable-panels.d.ts
declare module "react-resizable-panels" {
  import * as React from "react";
  
  export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
    id?: string;
    order?: number;
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    collapsible?: boolean;
    collapsedSize?: number;
    onCollapse?: () => void;
    onExpand?: () => void;
    onResize?: (size: number) => void;
  }

  export interface PanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    direction: "horizontal" | "vertical";
    id?: string;
    autoSaveId?: string;
    storage?: any;
    onLayout?: (sizes: number[]) => void;
  }

  export interface PanelResizeHandleProps extends React.HTMLAttributes<HTMLDivElement> {
    id?: string;
    disabled?: boolean;
    hitAreaMargins?: { coarse: number; fine: number };
    onDragging?: (isDragging: boolean) => void;
  }

  export const Panel: React.FC<PanelProps>;
  export const PanelGroup: React.FC<PanelGroupProps>;
  export const PanelResizeHandle: React.FC<PanelResizeHandleProps>;
}
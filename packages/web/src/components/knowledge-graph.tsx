'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { GraphData, GraphNode } from '@/lib/graph';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface Props {
  data: GraphData;
}

const TYPE_LABELS: Record<GraphNode['type'], string> = {
  narrative: 'Narrative',
  repo: 'Repository',
  token: 'Token',
  protocol: 'Protocol',
};

export function KnowledgeGraph({ data }: Props) {
  const [mounted, setMounted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(500, window.innerHeight - 200),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [mounted]);

  const handleNodeClick = useCallback((node: { id?: string | number; type?: string }) => {
    const id = String(node.id ?? '');
    if (id.startsWith('r:')) {
      const repo = id.slice(2);
      window.open(`https://github.com/${repo}`, '_blank');
    } else if (id.startsWith('n:')) {
      const slug = id.slice(2);
      window.location.href = `/narrative/${slug}/timeline`;
    }
  }, []);

  const nodeCanvasObject = useCallback(
    (node: { x?: number; y?: number; color?: string; size?: number; label?: string; type?: string }, ctx: CanvasRenderingContext2D) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const size = (node.size as number) ?? 3;
      const color = (node.color as string) ?? '#9945ff';
      const label = (node.label as string) ?? '';

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Glow for narratives
      if (node.type === 'narrative') {
        ctx.beginPath();
        ctx.arc(x, y, size + 2, 0, 2 * Math.PI);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.4;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Label
      ctx.font = `${node.type === 'narrative' ? '3.5px' : '2.5px'} Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(label, x, y + size + 2);
    },
    [],
  );

  if (!mounted) {
    return <div className="h-[500px] bg-sol-card rounded-lg animate-pulse" />;
  }

  return (
    <div ref={containerRef} className="relative w-full rounded-lg overflow-hidden bg-sol-darker border border-sol-border">
      {hoveredNode && (
        <div className="absolute top-4 left-4 z-10 bg-sol-card/90 backdrop-blur border border-sol-border rounded-lg p-3 text-sm max-w-64">
          <div className="font-semibold text-white">{hoveredNode.label}</div>
          <div className="text-sol-muted text-xs mt-1">{TYPE_LABELS[hoveredNode.type]}</div>
          {hoveredNode.stage && (
            <div className="text-xs mt-1">Stage: <span className="text-white">{hoveredNode.stage}</span></div>
          )}
          {hoveredNode.confidence !== undefined && (
            <div className="text-xs">Confidence: <span className="text-white">{hoveredNode.confidence}%</span></div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 flex gap-3 text-[11px] text-sol-muted bg-sol-card/80 backdrop-blur rounded-lg px-3 py-2 border border-sol-border">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sol-purple" />Narrative</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sol-blue" />Repo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sol-green" />Token</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sol-orange" />Protocol</span>
      </div>

      <ForceGraph2D
        graphData={data}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#050508"
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={(node: { x?: number; y?: number; size?: number }, color: string, ctx: CanvasRenderingContext2D) => {
          const x = node.x ?? 0;
          const y = node.y ?? 0;
          const size = (node.size as number) ?? 3;
          ctx.beginPath();
          ctx.arc(x, y, size + 3, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        linkColor={() => 'rgba(153, 69, 255, 0.15)'}
        linkWidth={0.5}
        onNodeHover={(node) => setHoveredNode((node as GraphNode) ?? null)}
        onNodeClick={handleNodeClick}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
  );
}

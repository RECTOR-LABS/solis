import type { FortnightlyReport, SignalStage } from '@solis/shared';

export interface GraphNode {
  id: string;
  label: string;
  type: 'narrative' | 'repo' | 'token' | 'protocol';
  stage?: SignalStage;
  confidence?: number;
  size: number;
  color: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const TYPE_COLORS: Record<GraphNode['type'], string> = {
  narrative: '#9945ff',
  repo: '#00d4ff',
  token: '#14f195',
  protocol: '#f7931a',
};

const STAGE_COLORS: Record<SignalStage, string> = {
  EARLY: '#00d4ff',
  EMERGING: '#facc15',
  GROWING: '#f7931a',
  MAINSTREAM: '#ef4444',
};

export function buildGraphData(report: FortnightlyReport): GraphData {
  const nodeMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  for (const narrative of report.narratives) {
    const narrativeId = `n:${narrative.slug}`;
    nodeMap.set(narrativeId, {
      id: narrativeId,
      label: narrative.name,
      type: 'narrative',
      stage: narrative.stage,
      confidence: narrative.confidence,
      size: 4 + (narrative.confidence / 10),
      color: STAGE_COLORS[narrative.stage],
    });

    for (const repo of narrative.relatedRepos.slice(0, 5)) {
      const repoId = `r:${repo}`;
      if (!nodeMap.has(repoId)) {
        nodeMap.set(repoId, {
          id: repoId,
          label: repo.split('/').pop() || repo,
          type: 'repo',
          size: 3,
          color: TYPE_COLORS.repo,
        });
      }
      links.push({ source: narrativeId, target: repoId });
    }

    for (const token of narrative.relatedTokens.slice(0, 3)) {
      const tokenId = `t:${token}`;
      if (!nodeMap.has(tokenId)) {
        nodeMap.set(tokenId, {
          id: tokenId,
          label: token,
          type: 'token',
          size: 3,
          color: TYPE_COLORS.token,
        });
      }
      links.push({ source: narrativeId, target: tokenId });
    }

    for (const protocol of narrative.relatedProtocols.slice(0, 3)) {
      const protocolId = `p:${protocol}`;
      if (!nodeMap.has(protocolId)) {
        nodeMap.set(protocolId, {
          id: protocolId,
          label: protocol,
          type: 'protocol',
          size: 3,
          color: TYPE_COLORS.protocol,
        });
      }
      links.push({ source: narrativeId, target: protocolId });
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    links,
  };
}

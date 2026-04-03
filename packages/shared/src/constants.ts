export const NODE_TYPES = {
  DEFAULT: 'default',
  SERVICE: 'service',
  DATABASE: 'database',
  QUEUE: 'queue',
  GATEWAY: 'gateway',
  LOAD_BALANCER: 'load-balancer',
  FRONTEND: 'frontend',
  ENVIRONMENT: 'environment',
  INFRASTRUCTURE: 'infrastructure',
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

export const EDGE_TYPES = {
  DEFAULT: 'default',
  DATA_FLOW: 'data-flow',
  DEPENDENCY: 'dependency',
  HTTP: 'http',
  EVENT: 'event',
} as const;

export type EdgeType = (typeof EDGE_TYPES)[keyof typeof EDGE_TYPES];

export const NODE_TYPE_GROUPS: Record<string, string[]> = {
  Application: ['frontend', 'service'],
  Data: ['database', 'queue'],
  Infrastructure: ['gateway', 'load-balancer', 'environment', 'infrastructure'],
  General: ['default'],
};

export const DEFAULT_NODE_METADATA = {
  customFields: [],
  links: [],
  tags: [],
};

export const API_BASE_URL = '/api';

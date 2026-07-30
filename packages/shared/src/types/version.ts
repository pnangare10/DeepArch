export interface ProjectVersion {
  id: string;
  projectId: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface CreateVersionDTO {
  name: string;
}

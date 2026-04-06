export type ProjectRole =
  | 'owner'
  | 'scrum-master'
  | 'dev-architect'
  | 'developer'
  | 'tester'
  | 'viewer';

export const PROJECT_ROLES: ProjectRole[] = [
  'owner',
  'scrum-master',
  'dev-architect',
  'developer',
  'tester',
  'viewer',
];

// Roles that can be assigned to invited members (owner is auto-assigned)
export const ASSIGNABLE_ROLES: Exclude<ProjectRole, 'owner'>[] = [
  'scrum-master',
  'dev-architect',
  'developer',
  'tester',
  'viewer',
];

export const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  owner: 6,
  'scrum-master': 5,
  'dev-architect': 4,
  developer: 3,
  tester: 2,
  viewer: 1,
};

export const ROLE_LABELS: Record<ProjectRole, string> = {
  owner: 'Owner',
  'scrum-master': 'Scrum Master',
  'dev-architect': 'Dev Architect',
  developer: 'Developer',
  tester: 'Tester',
  viewer: 'Viewer',
};

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  user: { name: string; email: string };
  createdAt: string;
}

export interface InviteMemberDTO {
  email: string;
  role: Exclude<ProjectRole, 'owner'>;
}

export interface UpdateMemberDTO {
  role: Exclude<ProjectRole, 'owner'>;
}

export interface Comment {
  id: string;
  nodeId: string;
  projectId: string;
  userId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string };
}

export interface CreateCommentDTO {
  text: string;
}

export interface UpdateCommentDTO {
  text: string;
}

export type CursorEvent = {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
  parentId: string | null;
};

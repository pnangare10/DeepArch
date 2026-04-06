import type { ProjectRole } from '@deeparch/shared';

export interface MemberRecord {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: Date;
  user: { name: string; email: string };
}

export interface IMemberRepository {
  findByProject(projectId: string): Promise<MemberRecord[]>;
  findByProjectAndUser(projectId: string, userId: string): Promise<MemberRecord | null>;
  upsert(projectId: string, userId: string, role: ProjectRole): Promise<MemberRecord>;
  updateRole(projectId: string, userId: string, role: ProjectRole): Promise<MemberRecord>;
  remove(projectId: string, userId: string): Promise<void>;
}

export interface CommentRecord {
  id: string;
  nodeId: string;
  projectId: string;
  userId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string };
}

export interface ICommentRepository {
  findByNode(nodeId: string): Promise<CommentRecord[]>;
  findById(id: string): Promise<CommentRecord | null>;
  create(nodeId: string, projectId: string, userId: string, text: string): Promise<CommentRecord>;
  update(id: string, text: string): Promise<CommentRecord>;
  delete(id: string): Promise<void>;
}

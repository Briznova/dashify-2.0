import { Request } from "express";
export interface RequestUser {
  id: string;
  email: string;
  sessionId?: string;
  activeSchoolId?: string;
  membershipId?: string;
  activeWorkspaceRole?: string;
  permissions?: string[];
}
export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}

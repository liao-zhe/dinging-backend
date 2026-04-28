export type UserRole = 'chef' | 'customer';

export interface AuthenticatedUser {
  userId: string;
  openid: string;
  role: UserRole;
}

export interface Website {
  id: string;
  url: string;
  thumbnailUrl: string;
  description?: string;
  createdBy: string;
  userId: string;
  userName: string;
  createdAt: number;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isAdmin?: boolean;
} 
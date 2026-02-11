import 'express-session';

declare module 'express-session' {
  interface SessionData {
    utilisateurId?: string;
    adminId?: string;
  }
}

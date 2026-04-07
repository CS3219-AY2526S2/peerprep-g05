declare global {
  namespace Express {
    interface User {
      id: string;
      role?: string;
      token: string;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};

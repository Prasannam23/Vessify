// Better Auth was removed due to unavailability on npm.
// This file is retained as a compatibility placeholder.

// If you previously relied on Better Auth, authentication is
// now handled by local Prisma + JWT logic in `src/routes/auth.ts`.

export const auth = null as unknown;

export type Session = {
  user: {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
    emailVerified?: boolean;
    createdAt?: Date;
  };
};

export type User = {
  id: string;
  name?: string | null;
  email: string;
  password: string;
  image?: string | null;
  emailVerified?: boolean;
  createdAt?: Date;
};

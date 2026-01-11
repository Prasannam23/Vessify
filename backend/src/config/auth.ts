

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

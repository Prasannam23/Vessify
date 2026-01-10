import prisma from "@db/prisma";
import bcrypt from "bcryptjs";

/**
 * User Business Logic Service
 * Centralizes user-related operations and validations
 */

/**
 * Check if email already exists in database
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  return user !== null;
}

/**
 * Validate that a user is a member of an organization
 * Throws error if access denied
 */
export async function validateUserOrgAccess(
  userId: string,
  organizationId: string
) {
  if (!userId || !organizationId) {
    throw new Error("User ID and Organization ID are required");
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
    },
  });

  if (!membership) {
    throw new Error("Access denied: user is not a member of this organization");
  }

  return membership;
}

/**
 * Create a new user with a default organization and membership
 */
export async function createUserWithOrg(
  email: string,
  name: string | undefined,
  hashedPassword: string
) {
  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  // Create default organization
  const org = await prisma.organization.create({
    data: {
      name: `${user.name || user.email}'s Organization`,
      slug: `org-${user.id.slice(0, 8)}`,
    },
  });

  // Add user as owner of organization
  await prisma.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role: "owner",
    },
  });

  return { user, organization: org };
}

/**
 * Verify user password
 */
export async function verifyUserPassword(
  hashedPassword: string,
  plainPassword: string
): Promise<boolean> {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Hash password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Get user by email with organization info
 */
export async function getUserWithOrg(email: string) {
  return await prisma.user.findUnique({
    where: { email },
    include: {
      organizations: {
        include: {
          organization: true,
        },
      },
    },
  });
}

/**
 * Get user's primary organization (owner or first membership)
 */
export async function getUserPrimaryOrg(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { role: "asc" }, // "owner" comes before "admin", "member"
    include: {
      organization: true,
    },
  });

  return membership?.organization || null;
}

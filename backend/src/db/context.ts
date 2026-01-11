import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  userId?: string;
  organizationId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * AsyncLocalStorage for request-scoped context
 * Allows Prisma extensions to access userId/organizationId without passing as parameters
 */
export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Set context for current request
 */
export function setRequestContext(context: RequestContext) {
  return requestContext.run(context, () => context);
}


// export const requestcontextswitch = new AsyncLocalStorage<RequestContext>();
/**
 * Get context from current request
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}


export async function withContext<T>(
  context: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    requestContext.run(context, async () => {
      try {
        resolve(await fn());
      } catch (error) {
        reject(error);
      }
    });
  });
}

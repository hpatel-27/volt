import type { Response, NextFunction } from "express";

// Shared stub of @clerk/express for integration controller tests. Each suite mocks
// the module with its own fixed clerk user id; the returned object exposes the three
// surfaces the auth path touches:
//   - clerkMiddleware: tags req.auth with the clerk user id, then next()
//   - getAuth: reports that request as authenticated, echoing req.auth as userId
//   - clerkClient.users.getUser: resolves a static profile so userMiddleware can
//     hydrate the DB user (it reads emailAddresses[0]?.emailAddress, firstName,
//     lastName) without a network call to Clerk.
//
// Consume it from a hoisted vi.mock factory via a dynamic import so the helper is
// resolved when the mock is applied rather than captured from out-of-scope:
//   vi.mock("@clerk/express", async () => {
//     const { makeClerkMock } = await import("../../helpers/clerkMock.js");
//     return makeClerkMock("integration_test_<suite>_user");
//   });
export function makeClerkMock(clerkUserId: string) {
  return {
    clerkMiddleware:
      () => (req: any, _res: Response, next: NextFunction) => {
        req.auth = clerkUserId;
        next();
      },
    getAuth: (req: any) => ({
      isAuthenticated: true,
      userId: req.auth,
    }),
    clerkClient: {
      users: {
        getUser: async () => ({
          emailAddresses: [{ emailAddress: "integration-test@example.com" }],
          firstName: "Test",
          lastName: "User",
        }),
      },
    },
  };
}

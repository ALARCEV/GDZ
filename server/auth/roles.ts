export const roles = ["guest", "user", "admin"] as const;

export type AppRole = (typeof roles)[number];

export function isAdminRole(role: AppRole): boolean {
  return role === "admin";
}

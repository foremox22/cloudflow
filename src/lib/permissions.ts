export type Role = "ADMIN" | "MANAGER" | "HEAD_CHEF" | "CHEF" | "SOUS_CHEF" | "WAITER" | "BARTENDER";

const ALL: Role[]     = ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF", "SOUS_CHEF", "WAITER", "BARTENDER"];
const KITCHEN: Role[] = ["ADMIN", "MANAGER", "HEAD_CHEF", "CHEF", "SOUS_CHEF"];
const MGMT: Role[]    = ["ADMIN", "MANAGER"];

// Route prefix → roles that may visit it
export const ROUTE_PERMISSIONS: { prefix: string; roles: Role[] }[] = [
  { prefix: "/dashboard",        roles: ALL },
  { prefix: "/master-recipes",   roles: ["ADMIN"] },
  { prefix: "/recipes",          roles: KITCHEN },
  { prefix: "/menu",             roles: [...MGMT, "HEAD_CHEF", "CHEF"] },
  { prefix: "/pos",              roles: [...MGMT, "WAITER", "BARTENDER"] },
  { prefix: "/kds",              roles: ALL },
  { prefix: "/prep",             roles: KITCHEN },
  { prefix: "/stock",            roles: KITCHEN },
  { prefix: "/suppliers",        roles: [...MGMT, "HEAD_CHEF", "CHEF"] },
  { prefix: "/lab",              roles: KITCHEN },
  { prefix: "/reservations",     roles: [...MGMT, "HEAD_CHEF", "WAITER"] },
  { prefix: "/finance",          roles: MGMT },
  { prefix: "/roster",           roles: ALL },
  { prefix: "/analytics",        roles: MGMT },
  { prefix: "/central-kitchen",  roles: MGMT },
  { prefix: "/team",             roles: MGMT },
  { prefix: "/settings",         roles: MGMT },
];

export function canAccess(role: string | undefined | null, pathname: string): boolean {
  if (!role) return false;
  const rule = ROUTE_PERMISSIONS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
  if (!rule) return false; // unknown path — deny by default
  return (rule.roles as string[]).includes(role);
}

// Kitchen mode: WAITER + BARTENDER are read-only
// Bar mode:     WAITER + CHEF + SOUS_CHEF are read-only (bartender can act; chefs cannot)
export function isKdsReadonlyForMode(
  role: string | undefined | null,
  mode: "kitchen" | "bar"
): boolean {
  if (!role) return true;
  if (mode === "kitchen") return ["WAITER", "BARTENDER"].includes(role);
  return ["WAITER", "CHEF", "SOUS_CHEF"].includes(role);
}

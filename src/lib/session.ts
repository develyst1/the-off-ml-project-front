import { cookies } from "next/headers";

export const SESSION_COOKIE = "off_ml_session";

export type Role = "tech_support" | "admin";

export type Session = {
  role: Role;
  displayName: string;
  msTeamsUserId: string;
};

const MOCK_AGENTS: Record<Role, Session> = {
  tech_support: {
    role: "tech_support",
    displayName: "tech-support",
    msTeamsUserId: "ms-teams-user-ts01",
  },
  admin: {
    role: "admin",
    displayName: "admin",
    msTeamsUserId: "ms-teams-user-ad01",
  },
};

// NOTE: this is a stand-in for real SSO (UC-015). There is no Azure AD app
// registration wired up yet, so sign-in just sets a cookie naming which
// mock tech_agent role to act as. Swap this for NextAuth + Entra ID once
// backend/API-016 exists.
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw === "tech_support" || raw === "admin") {
    return MOCK_AGENTS[raw];
  }
  return null;
}

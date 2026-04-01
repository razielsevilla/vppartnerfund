const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:4000/api");

export type TeamMemberRecord = {
  id: string;
  groupId: string;
  fullName: string;
  officerType: "liaison" | "compliance";
  designation: string | null;
  email: string | null;
  phone: string | null;
  status: "active" | "inactive";
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeamGroupRecord = {
  id: string;
  code: string;
  name: string;
  targetSector: string;
  liaisonMin: number;
  liaisonMax: number;
  complianceMin: number;
  complianceMax: number;
  isActive: boolean;
  sortOrder: number;
  members: TeamMemberRecord[];
};

export type CreateTeamMemberPayload = {
  fullName: string;
  officerType: "liaison" | "compliance";
  designation?: string;
  email?: string;
  phone?: string;
  status?: "active" | "inactive";
  notes?: string;
};

export type UpdateTeamMemberPayload = Partial<CreateTeamMemberPayload>;

export type UpdateTeamGroupPayload = {
  targetSector?: string;
  liaisonMin?: number;
  liaisonMax?: number;
  complianceMin?: number;
  complianceMax?: number;
  isActive?: boolean;
};

function extractApiMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return fallback;
  }

  const error = body.error as { message?: string };
  return error.message || fallback;
}

export const listTeamStructureRequest = async (): Promise<TeamGroupRecord[]> => {
  const response = await fetch(`${API_URL}/team/structure`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(extractApiMessage(body, "Failed to load team structure"));
  }

  const body = (await response.json()) as { groups: TeamGroupRecord[] };
  return body.groups;
};

export const createTeamMemberRequest = async (
  groupId: string,
  payload: CreateTeamMemberPayload,
): Promise<TeamMemberRecord> => {
  const response = await fetch(`${API_URL}/team/groups/${groupId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to create team member"));
  }

  return (body as { member: TeamMemberRecord }).member;
};

export const updateTeamMemberRequest = async (
  memberId: string,
  payload: UpdateTeamMemberPayload,
): Promise<TeamMemberRecord> => {
  const response = await fetch(`${API_URL}/team/members/${memberId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to update team member"));
  }

  return (body as { member: TeamMemberRecord }).member;
};

export const deleteTeamMemberRequest = async (memberId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/team/members/${memberId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(extractApiMessage(body, "Failed to delete team member"));
  }
};

export const updateTeamGroupRequest = async (
  groupId: string,
  payload: UpdateTeamGroupPayload,
): Promise<TeamGroupRecord> => {
  const response = await fetch(`${API_URL}/team/groups/${groupId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(extractApiMessage(body, "Failed to update team group"));
  }

  return (body as { group: TeamGroupRecord }).group;
};

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { listAuthAccountsRequest, type AuthAccountRecord } from "../../auth/services/auth-api";
import { Modal } from "../../../shared/components/Modal";
import { usePersistentState } from "../../../shared/hooks/usePersistentState";
import {
  createTeamMemberRequest,
  deleteTeamMemberRequest,
  listTeamStructureRequest,
  updateTeamGroupRequest,
  updateTeamMemberRequest,
  type TeamGroupRecord,
  type TeamMemberRecord,
} from "../services/team-api";

const OFFICER_ROLE_DESCRIPTIONS = {
  liaison: [
    "Prospecting and pitching potential partners in the designated sector.",
    "Leading relationship-building, external meetings, and initial negotiation.",
  ],
  compliance: [
    "Drafting and tracking MOUs based on negotiated commitments.",
    "Executing deliverables and preparing post-event partner reports.",
  ],
};

const emptyMemberForm = {
  fullName: "",
  officerType: "liaison" as "liaison" | "compliance",
  designation: "",
  email: "",
  phone: "",
  status: "active" as "active" | "inactive",
  notes: "",
};

export const TeamManagementPage = () => {
  const { user, logout } = useAuthSession();
  const [groups, setGroups] = useState<TeamGroupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberRecord | null>(null);
  const [memberForm, setMemberForm] = useState(emptyMemberForm);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = usePersistentState<string>("ui:team:selected-group", "group_a");
  const [authAccounts, setAuthAccounts] = useState<AuthAccountRecord[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) || groups[0] || null,
    [groups, selectedGroupId],
  );

  const [groupForm, setGroupForm] = useState({
    targetSector: "",
    liaisonMin: 1,
    liaisonMax: 2,
    complianceMin: 1,
    complianceMax: 2,
    isActive: true,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const structure = await listTeamStructureRequest();
        if (!cancelled) {
          setGroups(structure);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load team structure");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedGroup) {
      return;
    }

    setGroupForm({
      targetSector: selectedGroup.targetSector,
      liaisonMin: selectedGroup.liaisonMin,
      liaisonMax: selectedGroup.liaisonMax,
      complianceMin: selectedGroup.complianceMin,
      complianceMax: selectedGroup.complianceMax,
      isActive: selectedGroup.isActive,
    });
  }, [selectedGroup]);

  useEffect(() => {
    if (user?.role !== "vp_head") {
      return;
    }

    let cancelled = false;

    const loadAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        const accounts = await listAuthAccountsRequest();
        if (!cancelled) {
          setAuthAccounts(accounts);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAuthAccounts([]);
          setError(loadError instanceof Error ? loadError.message : "Failed to load credential ownership");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAccounts(false);
        }
      }
    };

    loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  const openCreateMemberModal = () => {
    setEditingMember(null);
    setMemberForm(emptyMemberForm);
    setIsMemberModalOpen(true);
  };

  const openEditMemberModal = (member: TeamMemberRecord) => {
    setEditingMember(member);
    setMemberForm({
      fullName: member.fullName,
      officerType: member.officerType,
      designation: member.designation || "",
      email: member.email || "",
      phone: member.phone || "",
      status: member.status,
      notes: member.notes || "",
    });
    setIsMemberModalOpen(true);
  };

  const reloadStructure = async () => {
    const structure = await listTeamStructureRequest();
    setGroups(structure);
  };

  const saveMember = async () => {
    if (!selectedGroup) {
      return;
    }

    setIsSavingMember(true);
    setError(null);
    setMessage(null);
    try {
      if (editingMember) {
        await updateTeamMemberRequest(editingMember.id, {
          fullName: memberForm.fullName,
          officerType: memberForm.officerType,
          designation: memberForm.designation,
          email: memberForm.email,
          phone: memberForm.phone,
          status: memberForm.status,
          notes: memberForm.notes,
        });
        setMessage("Team member updated.");
      } else {
        await createTeamMemberRequest(selectedGroup.id, {
          fullName: memberForm.fullName,
          officerType: memberForm.officerType,
          designation: memberForm.designation,
          email: memberForm.email,
          phone: memberForm.phone,
          status: memberForm.status,
          notes: memberForm.notes,
        });
        setMessage("Team member added.");
      }

      setIsMemberModalOpen(false);
      setEditingMember(null);
      setMemberForm(emptyMemberForm);
      await reloadStructure();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save team member");
    } finally {
      setIsSavingMember(false);
    }
  };

  const removeMember = async (memberId: string) => {
    setError(null);
    setMessage(null);
    try {
      await deleteTeamMemberRequest(memberId);
      setMessage("Team member removed.");
      await reloadStructure();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to remove member");
    }
  };

  const saveGroupConfig = async () => {
    if (!selectedGroup) {
      return;
    }

    setIsSavingGroup(true);
    setError(null);
    setMessage(null);
    try {
      await updateTeamGroupRequest(selectedGroup.id, {
        targetSector: groupForm.targetSector,
        liaisonMin: groupForm.liaisonMin,
        liaisonMax: groupForm.liaisonMax,
        complianceMin: groupForm.complianceMin,
        complianceMax: groupForm.complianceMax,
        isActive: groupForm.isActive,
      });

      setMessage("Group setup updated.");
      await reloadStructure();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update group setup");
    } finally {
      setIsSavingGroup(false);
    }
  };

  return (
    <main className="page-layout single-screen-page">
      <header className="page-header">
        <div>
          <h1>Team Management</h1>
          <p className="muted">Manage VP Partnerships and Fundraising division groups, officer assignments, and setup.</p>
        </div>
        <div className="user-actions">
          <nav className="page-nav-links" aria-label="Primary navigation">
            <Link to="/dashboard" className="link-button">
              Dashboard
            </Link>
            <Link to="/partners" className="link-button">
              Partners
            </Link>
            <Link to="/tasks" className="link-button">
              Tasks
            </Link>
            <Link to="/team" className="link-button link-button-active">
              Team
            </Link>
            <Link to="/settings" className="link-button">
              Settings
            </Link>
          </nav>
          <span>{user?.displayName}</span>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="muted">{message}</p>}

      <div className="page-view-switcher" role="tablist" aria-label="Team group switcher">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            className={`view-tab-btn ${selectedGroup?.id === group.id ? "is-active" : ""}`}
            onClick={() => setSelectedGroupId(group.id)}
          >
            {`Group ${group.code}: ${group.name}`}
          </button>
        ))}
      </div>

      <div className="single-screen-content">
        {isLoading && <p className="loading-state">Loading team structure...</p>}

        {!isLoading && selectedGroup && (
          <>
            <section className="registry-create-panel">
              <h2>{`Group ${selectedGroup.code}: ${selectedGroup.name}`}</h2>
              <p className="muted">{`Target sector: ${selectedGroup.targetSector}`}</p>

              <div className="artifact-upload-grid">
                <label>
                  Target Sector
                  <input
                    type="text"
                    value={groupForm.targetSector}
                    onChange={(event) =>
                      setGroupForm((prev) => ({ ...prev, targetSector: event.target.value }))
                    }
                  />
                </label>
                <label>
                  Liaison Min
                  <input
                    type="number"
                    min={1}
                    value={groupForm.liaisonMin}
                    onChange={(event) =>
                      setGroupForm((prev) => ({ ...prev, liaisonMin: Number(event.target.value || 1) }))
                    }
                  />
                </label>
                <label>
                  Liaison Max
                  <input
                    type="number"
                    min={1}
                    value={groupForm.liaisonMax}
                    onChange={(event) =>
                      setGroupForm((prev) => ({ ...prev, liaisonMax: Number(event.target.value || 1) }))
                    }
                  />
                </label>
                <label>
                  Compliance Min
                  <input
                    type="number"
                    min={1}
                    value={groupForm.complianceMin}
                    onChange={(event) =>
                      setGroupForm((prev) => ({ ...prev, complianceMin: Number(event.target.value || 1) }))
                    }
                  />
                </label>
                <label>
                  Compliance Max
                  <input
                    type="number"
                    min={1}
                    value={groupForm.complianceMax}
                    onChange={(event) =>
                      setGroupForm((prev) => ({ ...prev, complianceMax: Number(event.target.value || 1) }))
                    }
                  />
                </label>
                <label>
                  Group Status
                  <select
                    value={groupForm.isActive ? "active" : "inactive"}
                    onChange={(event) =>
                      setGroupForm((prev) => ({ ...prev, isActive: event.target.value === "active" }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <div className="qualification-actions">
                <button type="button" onClick={saveGroupConfig} disabled={isSavingGroup}>
                  {isSavingGroup ? "Saving..." : "Save Group Setup"}
                </button>
              </div>
            </section>

            <section className="value-prop-columns">
              <article className="timeline-panel">
                <h3>Liaison Officers (Acquisition and Outreach Arm)</h3>
                {OFFICER_ROLE_DESCRIPTIONS.liaison.map((item) => (
                  <p key={item} className="muted">{`- ${item}`}</p>
                ))}
              </article>

              <article className="timeline-panel">
                <h3>Compliance Officers (Success and Fulfillment Arm)</h3>
                {OFFICER_ROLE_DESCRIPTIONS.compliance.map((item) => (
                  <p key={item} className="muted">{`- ${item}`}</p>
                ))}
              </article>
            </section>

            <section className="registry-panel">
              <div className="dashboard-panel-head">
                <h2>Group Roster</h2>
                <button type="button" className="secondary-btn" onClick={openCreateMemberModal}>
                  Add Officer
                </button>
              </div>

              {selectedGroup.members.length === 0 && (
                <div className="status-card status-empty">
                  <h2>No team members yet</h2>
                  <p>Start by adding Liaison and Compliance officers for this group.</p>
                </div>
              )}

              {selectedGroup.members.length > 0 && (
                <div className="registry-table-wrap">
                  <table className="registry-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Designation</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGroup.members.map((member) => (
                        <tr key={member.id}>
                          <td>{member.fullName}</td>
                          <td>{member.officerType === "liaison" ? "Liaison Officer" : "Compliance Officer"}</td>
                          <td>{member.designation || "-"}</td>
                          <td>{member.email || member.phone || "-"}</td>
                          <td>{member.status}</td>
                          <td>
                            <div className="artifact-actions-row">
                              <button type="button" className="secondary-btn" onClick={() => openEditMemberModal(member)}>
                                Edit
                              </button>
                              <button type="button" onClick={() => removeMember(member.id)}>
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {user?.role === "vp_head" && (
              <section className="registry-panel">
                <div className="dashboard-panel-head">
                  <h2>Credential Ownership Tracker</h2>
                </div>
                {isLoadingAccounts && <p className="muted">Loading credential ownership...</p>}
                {!isLoadingAccounts && authAccounts.length === 0 && (
                  <p className="muted">No credential records available.</p>
                )}
                {!isLoadingAccounts && authAccounts.length > 0 && (
                  <div className="registry-table-wrap">
                    <table className="registry-table">
                      <thead>
                        <tr>
                          <th>Role</th>
                          <th>Officer</th>
                          <th>Shared Role Email</th>
                          <th>Last Login</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {authAccounts.map((account) => (
                          <tr key={account.id}>
                            <td>{account.roleName}</td>
                            <td>{account.displayName}</td>
                            <td>{account.email}</td>
                            <td>{account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : "Never"}</td>
                            <td>{account.isActive ? "Active" : "Inactive"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <Modal
        title={editingMember ? "Edit Team Member" : "Add Team Member"}
        open={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
      >
        <div className="artifact-upload-grid">
          <label>
            Full Name
            <input
              type="text"
              value={memberForm.fullName}
              onChange={(event) => setMemberForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />
          </label>
          <label>
            Officer Type
            <select
              value={memberForm.officerType}
              onChange={(event) =>
                setMemberForm((prev) => ({
                  ...prev,
                  officerType: event.target.value as "liaison" | "compliance",
                }))
              }
            >
              <option value="liaison">Liaison Officer</option>
              <option value="compliance">Compliance Officer</option>
            </select>
          </label>
          <label>
            Designation
            <input
              type="text"
              value={memberForm.designation}
              onChange={(event) =>
                setMemberForm((prev) => ({ ...prev, designation: event.target.value }))
              }
              placeholder="e.g. Corporate Liaison Officer"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={memberForm.email}
              onChange={(event) => setMemberForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label>
            Phone
            <input
              type="text"
              value={memberForm.phone}
              onChange={(event) => setMemberForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </label>
          <label>
            Status
            <select
              value={memberForm.status}
              onChange={(event) =>
                setMemberForm((prev) => ({ ...prev, status: event.target.value as "active" | "inactive" }))
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="registry-create-field-wide">
            Notes
            <textarea
              value={memberForm.notes}
              onChange={(event) => setMemberForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Assignment notes, capacity notes, or constraints"
            />
          </label>
        </div>
        <div className="qualification-actions">
          <button type="button" onClick={saveMember} disabled={isSavingMember}>
            {isSavingMember ? "Saving..." : "Save Member"}
          </button>
        </div>
      </Modal>
    </main>
  );
};

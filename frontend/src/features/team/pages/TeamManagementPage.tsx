import { useEffect, useMemo, useState } from "react";
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
  const { user } = useAuthSession();
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
    <main className="settings-page-container">
      <div className="settings-sidebar">
        <div className="sidebar-header">
          <h1>Team</h1>
          <p className="sidebar-status">
            {error ? "Error loading structure" : "Division Groups & Officers"}
          </p>
        </div>

        <nav className="sidebar-nav">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={`sidebar-link ${selectedGroup?.id === group.id ? "is-active" : ""}`}
              onClick={() => setSelectedGroupId(group.id)}
            >
              {`Group ${group.code}: ${group.name}`}
            </button>
          ))}
        </nav>

        <div className="sidebar-status" style={{ marginTop: "auto" }}>
          <button
            type="button"
            className="secondary-btn"
            style={{ width: "100%" }}
            onClick={openCreateMemberModal}
          >
            ➕ Add Officer
          </button>
          {message && <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>{message}</p>}
        </div>
      </div>

      <div className="settings-content">
        <div className="single-screen-content">
          {isLoading && <p className="loading-state">Syncing structure...</p>}

          {!isLoading && selectedGroup && (
            <>
              <div className="dashboard-kpi-grid">
                <article className="health-card">
                  <h3>Division Segment</h3>
                  <strong>{selectedGroup.name}</strong>
                  <p className="muted">{selectedGroup.targetSector}</p>
                </article>
                <article className="health-card">
                  <h3>Capacity</h3>
                  <strong>{selectedGroup.members.length}</strong>
                  <p className="muted">Total division officers</p>
                </article>
                <article className="health-card">
                  <h3>Liaison Count</h3>
                  <strong>{selectedGroup.members.filter(m => m.officerType === "liaison").length}</strong>
                  <p className="muted">{`Target: ${selectedGroup.liaisonMin}-${selectedGroup.liaisonMax}`}</p>
                </article>
              </div>

              <section className="registry-panel">
                <div className="registry-table-wrap">
                  <table className="registry-table">
                    <thead>
                      <tr>
                        <th>Officer Name</th>
                        <th>Division Arm</th>
                        <th>Designation</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGroup.members.map((member) => (
                        <tr key={member.id}>
                          <td>{member.fullName}</td>
                          <td>
                            {member.officerType === "liaison" ? "Liaison Unit" : "Compliance Unit"}
                          </td>
                          <td>{member.designation || "-"}</td>
                          <td>{member.status}</td>
                          <td>
                            <div className="artifact-actions-row">
                              <button
                                type="button"
                                className="secondary-btn"
                                onClick={() => openEditMemberModal(member)}
                              >
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
              </section>

              {user?.role === "vp_head" && authAccounts.length > 0 && (
                <section className="registry-panel">
                  <div className="sidebar-header" style={{ marginBottom: "1rem" }}>
                    <h2 style={{ fontSize: "1.1rem" }}>Role Email Ownership</h2>
                  </div>
                  <div className="registry-table-wrap">
                    <table className="registry-table">
                      <thead>
                        <tr>
                          <th>Division Role</th>
                          <th>Primary Email</th>
                          <th>Last Sync</th>
                          <th>Access</th>
                        </tr>
                      </thead>
                      <tbody>
                        {authAccounts.map((account) => (
                          <tr key={account.id}>
                            <td>{account.roleName}</td>
                            <td>{account.email}</td>
                            <td>
                              {account.lastLoginAt
                                ? new Date(account.lastLoginAt).toLocaleDateString()
                                : "Never"}
                            </td>
                            <td>{account.isActive ? "Granted" : "Revoked"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <section className="registry-create-panel" style={{ marginTop: "1rem" }}>
                <div className="sidebar-header" style={{ marginBottom: "1rem" }}>
                  <h2 style={{ fontSize: "1.1rem" }}>Unit Configuration</h2>
                </div>
                <div className="artifact-upload-grid">
                  <label>
                    Sector Reach
                    <input
                      type="text"
                      value={groupForm.targetSector}
                      onChange={(event) =>
                        setGroupForm((prev) => ({ ...prev, targetSector: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Liaison Span
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        type="number"
                        value={groupForm.liaisonMin}
                        onChange={(e) =>
                          setGroupForm((p) => ({ ...p, liaisonMin: Number(e.target.value) }))
                        }
                      />
                      <span>to</span>
                      <input
                        type="number"
                        value={groupForm.liaisonMax}
                        onChange={(e) =>
                          setGroupForm((p) => ({ ...p, liaisonMax: Number(e.target.value) }))
                        }
                      />
                    </div>
                  </label>
                  <label>
                    Unit State
                    <select
                      value={groupForm.isActive ? "active" : "inactive"}
                      onChange={(e) =>
                        setGroupForm((p) => ({ ...p, isActive: e.target.value === "active" }))
                      }
                    >
                      <option value="active">Active Division</option>
                      <option value="inactive">Paused/Dissolved</option>
                    </select>
                  </label>
                </div>
                <div className="settings-actions-footer">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={saveGroupConfig}
                    disabled={isSavingGroup}
                  >
                    {isSavingGroup ? "Updating..." : "Push Config Update"}
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      <Modal
        title={editingMember ? "Modify Division Officer" : "Deploy New Officer"}
        open={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
      >
        <div className="artifact-upload-grid">
          <label>
            Full Name
            <input
              type="text"
              value={memberForm.fullName}
              onChange={(e) => setMemberForm((p) => ({ ...p, fullName: e.target.value }))}
            />
          </label>
          <label>
            Division Arm
            <select
              value={memberForm.officerType}
              onChange={(e) =>
                setMemberForm((p) => ({
                  ...p,
                  officerType: e.target.value as "liaison" | "compliance",
                }))
              }
            >
              <option value="liaison">Liaison Unit</option>
              <option value="compliance">Compliance Unit</option>
            </select>
          </label>
          <label className="registry-create-field-wide">
            Designation
            <input
              type="text"
              value={memberForm.designation}
              placeholder="e.g. Senior Tech Liaison"
              onChange={(e) => setMemberForm((p) => ({ ...p, designation: e.target.value }))}
            />
          </label>
          <label>
            Contact Email
            <input
              type="email"
              value={memberForm.email}
              onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))}
            />
          </label>
          <label>
            Officer Status
            <select
              value={memberForm.status}
              onChange={(e) =>
                setMemberForm((p) => ({ ...p, status: e.target.value as "active" | "inactive" }))
              }
            >
              <option value="active">Active Duty</option>
              <option value="inactive">On Leave / Inactive</option>
            </select>
          </label>
        </div>
        <div className="settings-actions-footer">
          <button type="button" className="secondary-btn" onClick={saveMember} disabled={isSavingMember}>
            {isSavingMember ? "Syncing..." : "Commit Officer Record"}
          </button>
        </div>
      </Modal>
    </main>
  );
};

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import {
  createPartnerRequest,
  DuplicatePartnerError,
  listPartnersRequest,
  type DuplicateCandidate,
  type PartnerRecord,
} from "../services/partners-api";

type FilterState = {
  search: string;
  organizationType: string;
  industryNiche: string;
  status: "active" | "archived" | "all";
  impactTier: "" | "standard" | "major" | "lead";
};

export const PartnersPage = () => {
  const { user, logout } = useAuthSession();
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDuplicateCandidates, setPendingDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [pendingCreatePayload, setPendingCreatePayload] = useState<{
    organizationName: string;
    organizationType: string;
    industryNiche: string;
    currentPhaseId: string;
    impactTier: "" | "standard" | "major" | "lead";
    location: string;
  } | null>(null);
  const [createForm, setCreateForm] = useState({
    organizationName: "",
    organizationType: "",
    industryNiche: "",
    currentPhaseId: "phase_lead",
    impactTier: "" as "" | "standard" | "major" | "lead",
    location: "",
  });
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    organizationType: "",
    industryNiche: "",
    status: "active",
    impactTier: "",
  });

  useEffect(() => {
    let cancelled = false;

    const loadPartners = async () => {
      setIsLoadingPartners(true);
      setPartnersError(null);
      try {
        const data = await listPartnersRequest(filters);
        if (!cancelled) {
          setPartners(data);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load partners";
          setPartnersError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPartners(false);
        }
      }
    };

    loadPartners();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  const subtitle = useMemo(() => {
    if (isLoadingPartners) {
      return "Loading partner registry...";
    }
    if (partnersError) {
      return "Could not load partner data.";
    }
    return `${partners.length} partner${partners.length === 1 ? "" : "s"} found`;
  }, [isLoadingPartners, partners.length, partnersError]);

  const onFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const refreshPartners = async () => {
    setIsLoadingPartners(true);
    setPartnersError(null);
    try {
      const data = await listPartnersRequest(filters);
      setPartners(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load partners";
      setPartnersError(message);
    } finally {
      setIsLoadingPartners(false);
    }
  };

  const submitCreate = async (confirmDuplicate: boolean) => {
    const payloadSource = pendingCreatePayload || createForm;
    setCreateError(null);
    setIsCreating(true);

    try {
      await createPartnerRequest({
        organizationName: payloadSource.organizationName,
        organizationType: payloadSource.organizationType,
        industryNiche: payloadSource.industryNiche,
        currentPhaseId: payloadSource.currentPhaseId,
        impactTier: payloadSource.impactTier,
        location: payloadSource.location,
        confirmDuplicate,
      });

      setPendingCreatePayload(null);
      setPendingDuplicateCandidates([]);
      setCreateForm({
        organizationName: "",
        organizationType: "",
        industryNiche: "",
        currentPhaseId: "phase_lead",
        impactTier: "",
        location: "",
      });
      await refreshPartners();
    } catch (error) {
      if (error instanceof DuplicatePartnerError) {
        setPendingCreatePayload(payloadSource);
        setPendingDuplicateCandidates(error.candidates);
        setCreateError("Potential duplicate detected. Review matches and confirm to proceed.");
      } else {
        const message = error instanceof Error ? error.message : "Failed to create partner";
        setCreateError(message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const onCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPendingCreatePayload(null);
    setPendingDuplicateCandidates([]);
    await submitCreate(false);
  };

  return (
    <main className="page-layout">
      <header className="page-header">
        <div>
          <h1>Partner Registry</h1>
          <p className="muted">{subtitle}</p>
        </div>
        <div className="user-actions">
          <span>{user?.displayName}</span>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <section className="registry-controls" aria-label="Partner registry filters">
        <label>
          Search
          <input
            type="text"
            placeholder="Partner name or keyword"
            value={filters.search}
            onChange={(event) => onFilterChange("search", event.target.value)}
          />
        </label>
        <label>
          Type
          <input
            type="text"
            placeholder="e.g. Corporate"
            value={filters.organizationType}
            onChange={(event) => onFilterChange("organizationType", event.target.value)}
          />
        </label>
        <label>
          Industry
          <input
            type="text"
            placeholder="e.g. Technology"
            value={filters.industryNiche}
            onChange={(event) => onFilterChange("industryNiche", event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            value={filters.status}
            onChange={(event) => onFilterChange("status", event.target.value as FilterState["status"])}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </label>
        <label>
          Impact
          <select
            value={filters.impactTier}
            onChange={(event) =>
              onFilterChange("impactTier", event.target.value as FilterState["impactTier"])
            }
          >
            <option value="">Any</option>
            <option value="standard">Standard</option>
            <option value="major">Major</option>
            <option value="lead">Lead</option>
          </select>
        </label>
      </section>

      <section className="registry-create-panel" aria-label="Create partner">
        <h2>Add Partner</h2>
        <form className="registry-create-form" onSubmit={onCreateSubmit}>
          <input
            required
            type="text"
            placeholder="Organization name"
            value={createForm.organizationName}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, organizationName: event.target.value }))
            }
          />
          <input
            required
            type="text"
            placeholder="Type"
            value={createForm.organizationType}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, organizationType: event.target.value }))
            }
          />
          <input
            required
            type="text"
            placeholder="Industry"
            value={createForm.industryNiche}
            onChange={(event) =>
              setCreateForm((prev) => ({ ...prev, industryNiche: event.target.value }))
            }
          />
          <input
            type="text"
            placeholder="Location"
            value={createForm.location}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, location: event.target.value }))}
          />
          <select
            value={createForm.impactTier}
            onChange={(event) =>
              setCreateForm((prev) => ({
                ...prev,
                impactTier: event.target.value as "" | "standard" | "major" | "lead",
              }))
            }
          >
            <option value="">Impact (any)</option>
            <option value="standard">Standard</option>
            <option value="major">Major</option>
            <option value="lead">Lead</option>
          </select>
          <button type="submit" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Partner"}
          </button>
        </form>

        {createError && <p className="error-text">{createError}</p>}

        {pendingDuplicateCandidates.length > 0 && (
          <div className="duplicate-warning" role="alert">
            <h3>Possible duplicates found</h3>
            <ul>
              {pendingDuplicateCandidates.map((candidate) => (
                <li key={candidate.id}>
                  {candidate.organizationName} ({Math.round(candidate.similarity * 100)}% similar)
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => submitCreate(true)} disabled={isCreating}>
              Confirm Intentional Duplicate
            </button>
          </div>
        )}
      </section>

      <section className="registry-panel">
        {isLoadingPartners && <p className="loading-state">Loading partners...</p>}

        {!isLoadingPartners && partnersError && (
          <div className="status-card status-error" role="alert">
            <h2>Failed to load partner registry</h2>
            <p>{partnersError}</p>
          </div>
        )}

        {!isLoadingPartners && !partnersError && partners.length === 0 && (
          <div className="status-card status-empty">
            <h2>No partners found</h2>
            <p>Try adjusting search or filter values to broaden results.</p>
          </div>
        )}

        {!isLoadingPartners && !partnersError && partners.length > 0 && (
          <div className="registry-table-wrap">
            <table className="registry-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Industry</th>
                  <th>Impact</th>
                  <th>Status</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((partner) => (
                  <tr key={partner.id}>
                    <td>{partner.organizationName}</td>
                    <td>{partner.organizationType}</td>
                    <td>{partner.industryNiche}</td>
                    <td>{partner.impactTier || "-"}</td>
                    <td>{partner.archivedAt ? "Archived" : "Active"}</td>
                    <td>{partner.location || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
};

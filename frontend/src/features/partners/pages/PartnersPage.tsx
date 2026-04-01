import { useEffect, useMemo, useState } from "react";
import { useAuthSession } from "../../auth/hooks/use-auth-session";
import { listPartnersRequest, type PartnerRecord } from "../services/partners-api";

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

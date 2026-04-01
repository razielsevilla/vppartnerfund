import { useAuthSession } from "../../auth/hooks/use-auth-session";

export const PartnersPage = () => {
  const { user, logout } = useAuthSession();

  return (
    <main className="page-layout">
      <header className="page-header">
        <div>
          <h1>Partner Dashboard</h1>
          <p className="muted">Authenticated route for internal users only.</p>
        </div>
        <div className="user-actions">
          <span>{user?.displayName}</span>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <section className="placeholder-panel">
        <p>Phase 2 scaffolding complete: unauthorized users are redirected to login.</p>
      </section>
    </main>
  );
};

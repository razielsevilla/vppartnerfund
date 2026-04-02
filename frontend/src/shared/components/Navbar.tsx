import { Link, useLocation } from "react-router-dom";
import { useAuthSession } from "../../features/auth/hooks/use-auth-session";

export const Navbar = () => {
  const { user, logout } = useAuthSession();
  const location = useLocation();

  const navItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Partners", path: "/partners" },
    { label: "Tasks", path: "/tasks" },
    { label: "Team", path: "/team" },
    { label: "Settings", path: "/settings" },
  ];

  return (
    <nav className="global-navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-logo">
          Partners and Funds
        </Link>
        
        <div className="navbar-menu">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`navbar-link ${location.pathname.startsWith(item.path) ? "is-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="navbar-actions">
          <span className="navbar-user">{user?.displayName}</span>
          <button type="button" className="logout-btn-nav" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

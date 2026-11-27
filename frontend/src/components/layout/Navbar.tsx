import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";
import { getInitials } from "../../utils/avatar";

const navigation = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Community", path: "/community" },
  { label: "Rewards", path: "/rewards" },
];

export default function Navbar() {
  const { user, logout, isGuest } = useAuth();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;

    function handleOutsideClick(event: PointerEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [userMenuOpen]);

  function handleLogout() {
    setMobileOpen(false);
    setUserMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  const closeMenus = () => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  };

  return (
    <header className="site-navbar">
      <div className="navbar-container">
        <Link
          to="/dashboard"
          className="navbar-brand"
          onClick={closeMenus}
        >
          <span className="brand-icon" aria-hidden="true">
            N
          </span>
          <span>
            Neighborhood <strong>Rewards</strong>
          </span>
        </Link>

        <nav className="navbar-links" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `navbar-link ${isActive ? "active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
          <div className="navbar-user" ref={userMenuRef}>
            <button
              type="button"
              className="navbar-avatar-button"
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              aria-controls="navbar-user-menu"
              onClick={() => setUserMenuOpen((open) => !open)}
            >
              <span className="navbar-avatar">
                {getInitials(user?.username || "")}
              </span>
              <span className="navbar-username">
                 {isGuest ? "Guest" : user?.username}
              </span>
              <span aria-hidden="true">⌄</span>
            </button>

            {userMenuOpen && (
              <div
                id="navbar-user-menu"
                className="navbar-dropdown"
              >
                <NavLink to="/profile" onClick={closeMenus}>
                  My Profile
                </NavLink>
                {!isGuest && (
                  <NavLink
                    to="/change-password"
                    onClick={closeMenus}
                  >
                    Change Password
                  </NavLink>
                )}
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="navbar-mobile-toggle"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="navbar-mobile-menu"
            onClick={() => {
              setUserMenuOpen(false);
              setMobileOpen((open) => !open);
            }}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="navbar-mobile-menu"
          className="navbar-mobile-menu"
          aria-label="Mobile navigation"
        >
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMenus}
              className={({ isActive }) =>
                `navbar-mobile-link ${isActive ? "active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/profile"
            className="navbar-mobile-link"
            onClick={closeMenus}
          >
            Profile
          </NavLink>
          {!isGuest && (
            <NavLink
              to="/change-password"
              className="navbar-mobile-link"
              onClick={closeMenus}
            >
              Change Password
            </NavLink>
          )}
          <button
            type="button"
            className="navbar-mobile-link navbar-logout"
            onClick={handleLogout}
          >
            Logout
          </button>
        </nav>
      )}
    </header>
  );
}

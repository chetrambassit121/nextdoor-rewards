import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./AuthLayout.css";

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle: string;
};

export default function AuthLayout({
  children,
  title,
  subtitle,
}: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <section className="auth-layout__form-panel">
        <div className="auth-layout__container">
          <Link to="/login" className="auth-layout__brand">
            <span className="auth-layout__brand-icon">
              N
            </span>
            <span>Nextdoor Rewards</span>
          </Link>

          <div className="auth-layout__header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          <div className="auth-layout__content">
            {children}
          </div>

          <footer className="auth-layout__footer">
            © {new Date().getFullYear()} Nextdoor Rewards
          </footer>
        </div>
      </section>

      <aside className="auth-layout__promo">
        <div className="auth-layout__promo-content">
          <div className="auth-layout__promo-icon">
            ★
          </div>

          <h2>Your neighborhood. Your rewards.</h2>

          <p>
            Connect with neighbors, share community
            updates, and earn rewards for making
            your neighborhood better.
          </p>

          <div className="auth-layout__features">
            <span>Connect</span>
            <span>Contribute</span>
            <span>Earn rewards</span>
          </div>
        </div>
      </aside>
    </main>
  );
}

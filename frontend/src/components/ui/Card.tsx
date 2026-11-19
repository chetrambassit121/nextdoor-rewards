import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export default function Card({
  children,
  title,
  className = "",
}: CardProps) {
  return (
    <section className={`ui-card ${className}`.trim()}>
      {title && <h2 className="ui-card-title">{title}</h2>}

      <div className="ui-card-content">
        {children}
      </div>
    </section>
  );
}

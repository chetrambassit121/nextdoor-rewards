import type { ReactNode } from "react";

type StatusVariant =
  | "info"
  | "success"
  | "error"
  | "empty";

interface StatusMessageProps {
  variant?: StatusVariant;
  children: ReactNode;
}

export default function StatusMessage({
  variant = "info",
  children,
}: StatusMessageProps) {
  return (
    <div
      className={`status-message status-${variant}`}
      role={variant === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

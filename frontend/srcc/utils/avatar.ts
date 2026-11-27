export function getInitials(username: string): string {
  const name = username.trim();

  if (!name) return "U";

  const demoMatch = name.match(/^demo_(.+)_\d+$/i);

  if (demoMatch) {
    const parts = demoMatch[1].split("_").filter(Boolean);

    if (parts.length >= 2) {
      return (
        parts[0][0] + parts[parts.length - 1][0]
      ).toUpperCase();
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
  }

  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  { backgroundColor: "#f3e8ff", color: "#7e22ce" },
  { backgroundColor: "#fce7f3", color: "#be185d" },
  { backgroundColor: "#dcfce7", color: "#15803d" },
  { backgroundColor: "#ffedd5", color: "#c2410c" },
  { backgroundColor: "#ccfbf1", color: "#0f766e" },
  { backgroundColor: "#fef3c7", color: "#92400e" },
  { backgroundColor: "#e0e7ff", color: "#4338ca" },
  { backgroundColor: "#fee2e2", color: "#b91c1c" },
  { backgroundColor: "#cffafe", color: "#0e7490" },
  { backgroundColor: "#fae8ff", color: "#a21caf" },
  { backgroundColor: "#ecfccb", color: "#3f6212" },
];

export function getAvatarColor(username: string) {
  const name = username.trim().toLowerCase();

  let hash = 0;

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % AVATAR_COLORS.length;

  return AVATAR_COLORS[index];
}
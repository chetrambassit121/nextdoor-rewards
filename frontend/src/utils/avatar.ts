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
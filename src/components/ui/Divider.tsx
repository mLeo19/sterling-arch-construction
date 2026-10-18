export function Divider({
  tone = "dark",
  className = "",
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <div
      className={`h-px w-full ${tone === "light" ? "bg-white/20" : "bg-black/10"} ${className}`}
    />
  );
}

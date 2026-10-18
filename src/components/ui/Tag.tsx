export function Tag({
  children,
  tone = "dark",
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-mono text-[0.65rem] tracking-[0.08em] uppercase whitespace-nowrap ${
        tone === "light"
          ? "border-white/25 text-white/80"
          : "border-black/20 text-black/70"
      }`}
    >
      {children}
    </span>
  );
}

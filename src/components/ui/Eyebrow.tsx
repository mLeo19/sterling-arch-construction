export function Eyebrow({
  children,
  tone = "dark",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <p
      className={`flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.14em] uppercase ${
        tone === "light" ? "text-white/70" : "text-black/60"
      } ${className}`}
    >
      <span className={tone === "light" ? "text-white/40" : "text-black/30"}>
        ◆
      </span>
      {children}
    </p>
  );
}

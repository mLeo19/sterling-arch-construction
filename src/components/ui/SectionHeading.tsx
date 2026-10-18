export function SectionHeading({
  children,
  tone = "dark",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <h2
      className={`text-4xl leading-[1.1] font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl ${
        tone === "light" ? "text-white" : "text-black"
      } ${className}`}
    >
      {children}
    </h2>
  );
}

import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

type CommonProps = {
  children: React.ReactNode;
  className?: string;
};

type PrimaryProps = CommonProps & {
  variant?: "primary";
  href: string;
} & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className" | "children">;

type SecondaryProps = CommonProps & {
  variant: "secondary";
  href: string;
  tone?: "dark" | "light";
} & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className" | "children">;

export function Button(props: PrimaryProps | SecondaryProps) {
  if (props.variant === "secondary") {
    const { children, className = "", tone = "dark", href, variant: _variant, ...rest } = props;
    void _variant;
    return (
      <Link
        href={href}
        className={`group inline-flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.12em] uppercase transition-colors duration-300 ${
          tone === "light"
            ? "text-white/80 hover:text-white"
            : "text-black/70 hover:text-black"
        } ${className}`}
        {...rest}
      >
        <span className="transition-transform duration-300 ease-[var(--ease-out-quart)] group-hover:translate-x-0.5">
          ↳
        </span>
        {children}
      </Link>
    );
  }

  const { children, className = "", href, variant: _variant, ...rest } = props;
  void _variant;
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 font-mono text-[0.7rem] tracking-[0.12em] text-white uppercase transition-colors duration-300 hover:bg-black/80 ${className}`}
      {...rest}
    >
      <span aria-hidden>↳</span>
      {children}
    </Link>
  );
}

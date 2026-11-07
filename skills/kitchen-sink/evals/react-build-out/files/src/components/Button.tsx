import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "outline" };

export function Button({ variant = "solid", className = "", ...props }: Props) {
  const look = variant === "solid"
    ? "bg-brand text-white hover:bg-brand-dark"
    : "border border-line text-ink hover:bg-paper";
  return <button className={`rounded-control px-4 py-2 disabled:opacity-50 ${look} ${className}`} {...props} />;
}

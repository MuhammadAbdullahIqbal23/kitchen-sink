import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`rounded-control border border-line px-3 py-2 ${className}`} {...props} />;
}

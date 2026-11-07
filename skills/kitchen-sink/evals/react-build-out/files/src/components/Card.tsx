import type { ReactNode } from "react";

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-control border border-line bg-paper p-4">
      <h2 className="mb-2 font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

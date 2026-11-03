import type { ReactNode } from "react";
import { Badge, Container } from "@/components/ui/primitives";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Container className="max-w-3xl py-20">
      <Badge tone="violet">Pre-launch notice</Badge>
      <h1 className="mt-5 text-4xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm text-silver-500">Last updated 3 November 2026</p>
      <div className="mt-10 space-y-5 leading-relaxed text-silver-300 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </Container>
  );
}

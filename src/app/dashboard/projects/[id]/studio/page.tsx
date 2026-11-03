import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { Suspense } from "react";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { StudioForm } from "@/components/studio/studio-form";
import { getProject } from "@/lib/data";
import { getImageProvider } from "@/server/providers/image";
import { pollinationsServerMode } from "@/server/providers/image/pollinations";

export const metadata: Metadata = { title: "Character Studio" };

export default function StudioPage({ params }: PageProps<"/dashboard/projects/[id]/studio">) {
  return (
    <Suspense fallback={<PanelSkeleton rows={3} />}>
      <Studio params={params} />
    </Suspense>
  );
}

async function Studio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/dashboard/projects/${id}`} className="text-sm text-silver-400 hover:text-white">
          ← {project.title}
        </Link>
        <div className="mt-3">
          <PageHeader title="Character Studio" description="Describe a character, choose a look, and keep the one you love." />
        </div>
      </div>
      <StudioForm
        projectId={id}
        initialKey={randomUUID()}
        provider={{ isDemo: getImageProvider().isDemo, label: getImageProvider().label, serverMode: pollinationsServerMode() }}
      />
    </div>
  );
}

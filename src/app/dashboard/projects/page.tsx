import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateProjectForm, ProjectActions } from "@/components/dashboard/forms";
import { PageHeader, PanelSkeleton } from "@/components/dashboard/page-header";
import { formatDate, listProjects, type Project } from "@/lib/data";

export const metadata: Metadata = { title: "My Projects" };

export default function ProjectsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="My Projects" description="Each project holds one story: its characters, storyboard and animations." />
      <section aria-labelledby="create-title" className="panel p-6">
        <h2 id="create-title" className="text-lg font-semibold">New project</h2>
        <div className="mt-4 max-w-xl">
          <CreateProjectForm />
        </div>
      </section>
      <Suspense fallback={<PanelSkeleton rows={2} />}>
        <ProjectLists />
      </Suspense>
    </div>
  );
}

async function ProjectLists() {
  const projects = await listProjects();
  const active = projects.filter((p) => p.status === "active");
  const archived = projects.filter((p) => p.status === "archived");
  return (
    <>
      <ProjectSection title="Active" projects={active} empty="No active projects. Create one above to get started." />
      {archived.length ? <ProjectSection title="Archived" projects={archived} /> : null}
    </>
  );
}

function ProjectSection({ title, projects, empty }: { title: string; projects: Project[]; empty?: string }) {
  return (
    <section aria-label={`${title} projects`}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-silver-400">
        {title} <span className="text-silver-500">({projects.length})</span>
      </h2>
      {projects.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id} className="panel p-5">
              <h3 className="text-lg font-semibold break-words">{p.title}</h3>
              {p.description ? (
                <p className="mt-1.5 line-clamp-3 text-sm text-silver-400">{p.description}</p>
              ) : null}
              <p className="mt-3 text-xs text-silver-500">
                Created {formatDate(p.created_at)} · Updated {formatDate(p.updated_at)}
              </p>
              <ProjectActions id={p.id} title={p.title} status={p.status} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-silver-300/15 px-5 py-8 text-center text-sm text-silver-500">
          {empty}
        </p>
      )}
    </section>
  );
}

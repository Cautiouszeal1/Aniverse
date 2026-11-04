import type { Metadata } from "next";
import Link from "next/link";
import { ReportForm } from "@/components/dashboard/account-forms";
import { PageHeader } from "@/components/dashboard/page-header";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Help" };

const STEPS = [
  { title: "Create a project", body: "One project holds one story: its characters, storyboard and animations.", href: "/dashboard/projects" },
  { title: "Design your characters", body: "Describe a character, pick a style and mood, then keep the variation you like. Refine it into new versions any time.", href: "/dashboard/studio" },
  { title: "Plan the storyboard", body: "Break the story into short scenes: what happens, who is in it, what they say and how the camera sees it.", href: "/dashboard/storyboards" },
  { title: "Animate each scene", body: "Pick Standard or Premium, a length and a shape. Characters tagged in a scene keep their look in the clip.", href: "/dashboard/animations" },
  { title: "Watch and export", body: "Play your film scene by scene and download each clip as an MP4.", href: "/dashboard/library" },
];

const FAQ = [
  {
    q: "How do credits work?",
    a: "1 credit = $0.01. Character pictures are free during the beta. A Standard clip and a Premium clip each show their price before you start, and you only pay when you press Animate.",
  },
  {
    q: "What if an animation fails?",
    a: "Your credits come back automatically, every time. If AniVerse AI is briefly unavailable, it won't let you start, so you're never charged for nothing.",
  },
  {
    q: "Can I leave the page while a clip is being made?",
    a: "Yes. Clips are made on our servers, so you can close the page or lock your phone. Come back to the animation workspace to see it.",
  },
  {
    q: "Who owns what I create?",
    a: "You do. Don't upload or describe other people's copyrighted characters or real people without permission. See the Terms for details.",
  },
  {
    q: "How long are my files kept?",
    a: "Until you delete them, or delete your account. Download links expire after an hour for your privacy; just reopen the page for a fresh link.",
  },
  {
    q: "How do I get my data or delete my account?",
    a: "Both are in Settings: download all your data as a file, or request deletion (completed within 30 days).",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Help" description="How AniVerse works, answers to common questions, and how to report a problem." />

      <section className="panel p-6" aria-labelledby="how">
        <h2 id="how" className="text-lg font-semibold">From idea to animated film</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-silver-300/10 p-4">
              <p className="text-xs uppercase tracking-widest text-cyan-300">Step {i + 1}</p>
              <p className="mt-1 font-medium text-white">{s.title}</p>
              <p className="mt-1 text-sm text-silver-400">{s.body}</p>
              <Link href={s.href} className="mt-2 inline-block text-sm text-cyan-300">Go →</Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel p-6" aria-labelledby="faq">
        <h2 id="faq" className="text-lg font-semibold">Questions</h2>
        <div className="mt-3 divide-y divide-silver-300/10">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-3">
              <summary className="cursor-pointer list-none font-medium text-silver-100 group-open:text-white">{f.q}</summary>
              <p className="mt-2 text-sm text-silver-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6" aria-labelledby="report">
          <h2 id="report" className="text-lg font-semibold">Report copyright or harmful content</h2>
          <p className="mb-5 mt-1 text-sm text-silver-400">Every report is reviewed by the AniVerse team.</p>
          <ReportForm />
        </section>
        <section className="panel p-6" aria-labelledby="contact">
          <h2 id="contact" className="text-lg font-semibold">Contact</h2>
          {site.contactEmail ? (
            <p className="mt-2 text-sm text-silver-400">
              Email us at <a href={`mailto:${site.contactEmail}`} className="text-cyan-300">{site.contactEmail}</a>.
            </p>
          ) : (
            <p className="mt-2 text-sm text-silver-400">A support email will be listed here before the public launch. For now, use the report form.</p>
          )}
          <p className="mt-4 text-sm text-silver-500">
            Read the <Link href="/terms" className="text-cyan-300">Terms</Link> and <Link href="/privacy" className="text-cyan-300">Privacy notice</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}

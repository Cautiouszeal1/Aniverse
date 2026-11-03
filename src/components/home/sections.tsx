import type { ReactNode } from "react";
import {
  Badge,
  Card,
  Container,
  Section,
  SectionHeading,
} from "@/components/ui/primitives";
import { site } from "@/lib/site";

/* ------------------------------------------------------------------ */
/* Icons (simple original line icons)                                  */
/* ------------------------------------------------------------------ */

function Icon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/25 bg-gradient-to-br from-violet-600/25 to-cyan-400/10 text-cyan-200">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </span>
  );
}

const icons = {
  character: (
    <Icon>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.2-3.6 3.9-5.5 7-5.5s5.8 1.9 7 5.5" />
    </Icon>
  ),
  story: (
    <Icon>
      <path d="M5 4h10l4 4v12H5z" />
      <path d="M15 4v4h4M8 12h8M8 16h5" />
    </Icon>
  ),
  board: (
    <Icon>
      <rect x="3" y="5" width="7" height="6" rx="1.2" />
      <rect x="14" y="5" width="7" height="6" rx="1.2" />
      <rect x="3" y="14" width="7" height="6" rx="1.2" />
      <rect x="14" y="14" width="7" height="6" rx="1.2" />
    </Icon>
  ),
  animate: (
    <Icon>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M10 9.5v5l4.5-2.5z" />
    </Icon>
  ),
  export: (
    <Icon>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19h14" />
    </Icon>
  ),
  library: (
    <Icon>
      <path d="M4 6h16v13H4z" />
      <path d="m4 15 4.5-4 4 3.5 3-2.5L20 15" />
      <circle cx="15.5" cy="9" r="1.2" />
    </Icon>
  ),
};

/* ------------------------------------------------------------------ */
/* Workflow                                                            */
/* ------------------------------------------------------------------ */

const steps = [
  {
    n: "01",
    title: "Create a character",
    body: "Describe who they are. Generate variations, pick a direction and refine it.",
    icon: icons.character,
  },
  {
    n: "02",
    title: "Shape the story",
    body: "Draft an idea, outline beats and write dialogue — with optional AI suggestions you can accept or ignore.",
    icon: icons.story,
  },
  {
    n: "03",
    title: "Build the storyboard",
    body: "Lay out scenes with shot notes, dialogue and timing. Reorder until it flows.",
    icon: icons.board,
  },
  {
    n: "04",
    title: "Generate the animation",
    body: "Send selected scenes to a licensed video model and track every job from queued to done.",
    icon: icons.animate,
  },
  {
    n: "05",
    title: "Preview, save, export",
    body: "Review versions side by side, keep the best take and download it.",
    icon: icons.export,
  },
];

export function Workflow() {
  return (
    <Section id="workflow" labelledBy="workflow-title">
      <Container>
        <SectionHeading
          id="workflow-title"
          eyebrow="How it works"
          title="From first idea to finished clip"
          lead="Ani Studio keeps the whole creative chain in one project, so your character, story and scenes stay connected as you iterate."
        />

        <ol className="mt-14 grid gap-4 md:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.n} className="relative">
              <div className="panel flex h-full flex-col p-5">
                <div className="flex items-center justify-between">
                  {s.icon}
                  <span className="font-display text-sm font-semibold text-silver-500">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-silver-400">
                  {s.body}
                </p>
              </div>
              {i < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute -right-3 top-1/2 hidden h-px w-2 bg-gradient-to-r from-cyan-400/60 to-violet-500/60 md:block"
                />
              ) : null}
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Ani Studio overview                                                 */
/* ------------------------------------------------------------------ */

const modules = [
  {
    title: "Character Studio",
    body: "Prompt editor, style and mood options, a variation gallery and version history. Every version keeps its prompt and model details.",
    icon: icons.character,
  },
  {
    title: "Storyboard Studio",
    body: "Scenes with titles, descriptions, dialogue, camera notes and duration. Add, duplicate, reorder and save revisions.",
    icon: icons.board,
  },
  {
    title: "Animation workspace",
    body: "Video preview, scene timeline, live job status, version history and export settings.",
    icon: icons.animate,
  },
  {
    title: "Media library",
    body: "Characters, images and clips in private storage, filterable by project and type.",
    icon: icons.library,
  },
];

export function StudioOverview() {
  return (
    <Section
      id="studio"
      labelledBy="studio-title"
      className="border-y hairline bg-navy-900/60"
    >
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            id="studio-title"
            eyebrow={site.product}
            title="A real studio, in your browser"
            lead="Ani Studio is the first AniVerse product. These are the workspaces being built for the closed beta."
          />
          <Badge tone="violet" className="self-start md:self-auto">
            {site.accountsOpen ? "Beta" : "In development"}
          </Badge>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {modules.map((m) => (
            <Card key={m.title} className="flex gap-5">
              <div className="shrink-0">{m.icon}</div>
              <div>
                <h3 className="text-lg font-semibold">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-silver-400">
                  {m.body}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              t: "No wallet required",
              b: "Sign up with email. Crypto is never needed to create.",
            },
            {
              t: "Private by default",
              b: "Your projects and media are stored privately and shared only through expiring links.",
            },
            {
              t: "Honest about AI",
              b: "Everything is clearly AI-assisted, and we never claim generated work is automatically copyrighted or exclusive.",
            },
          ].map((p) => (
            <div
              key={p.t}
              className="rounded-2xl border hairline bg-white/[0.02] p-5"
            >
              <h3 className="text-sm font-semibold">{p.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-silver-400">
                {p.b}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Sample gallery (honest empty state until real work exists)          */
/* ------------------------------------------------------------------ */

export function Gallery() {
  return (
    <Section id="gallery" labelledBy="gallery-title">
      <Container>
        <SectionHeading
          id="gallery-title"
          eyebrow="Sample gallery"
          title="Original work, coming soon"
        />
        <div className="mt-10 panel relative overflow-hidden px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60 grid-backdrop"
          />
          <div className="relative mx-auto max-w-xl">
            <div className="mx-auto mb-5 w-fit">{icons.library}</div>
            <p className="text-lg text-white">
              Our first original characters and a short pilot animation are in
              production.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-silver-400">
              They will appear here once they are finished. We won&apos;t fill
              this space with stock images or borrowed work.
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Ecosystem roadmap                                                   */
/* ------------------------------------------------------------------ */

const ecosystem = [
  {
    name: "Ani Studio",
    stage: "Building now",
    tone: "cyan" as const,
    body: "Characters, stories, storyboards and AI-assisted short animation.",
  },
  {
    name: "Ani IP",
    stage: "Later",
    tone: "silver" as const,
    body: "Character records, licensing and commercial-use permissions for creators.",
  },
  {
    name: "Ani World",
    stage: "Later",
    tone: "silver" as const,
    body: "Creator profiles, public galleries, collaboration and interactive stories.",
  },
  {
    name: "Ani Network",
    stage: "Long-term",
    tone: "silver" as const,
    body: "Rendering infrastructure, developer tools and production compute.",
  },
];

export function Ecosystem() {
  return (
    <Section
      id="ecosystem"
      labelledBy="ecosystem-title"
      className="border-y hairline bg-navy-900/60"
    >
      <Container>
        <SectionHeading
          id="ecosystem-title"
          eyebrow="The AniVerse ecosystem"
          title="One studio first. A creator ecosystem over time."
          lead="We are building Ani Studio first and will only expand once creators use it repeatedly. Later products depend on real demand."
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-4">
          {ecosystem.map((e, i) => (
            <li
              key={e.name}
              className={
                i === 0
                  ? "panel border-cyan-400/30 p-6 shadow-[0_0_60px_-20px_rgba(46,230,246,0.45)]"
                  : "panel p-6"
              }
            >
              <Badge tone={e.tone}>{e.stage}</Badge>
              <h3 className="mt-4 text-lg font-semibold">{e.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-silver-400">
                {e.body}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Pricing explanation                                                 */
/* ------------------------------------------------------------------ */

export function Pricing() {
  return (
    <Section id="pricing" labelledBy="pricing-title">
      <Container>
        <SectionHeading
          id="pricing-title"
          eyebrow="Pricing"
          title="Simple plans plus usage credits"
          lead="Prices have not been set yet. Here is how billing will work when it launches."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Card>
            <h3 className="text-lg font-semibold">Creator plans</h3>
            <p className="mt-2 text-sm leading-relaxed text-silver-400">
              A monthly subscription unlocks the studio and includes a credit
              allowance.
            </p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold">Generation credits</h3>
            <p className="mt-2 text-sm leading-relaxed text-silver-400">
              Each image or video generation uses credits. You see the
              estimated cost before you generate and the actual cost after.
            </p>
          </Card>
          <Card>
            <h3 className="text-lg font-semibold">Fair retries</h3>
            <p className="mt-2 text-sm leading-relaxed text-silver-400">
              If a generation fails on our side, you are not charged. Every
              credit movement appears in your history.
            </p>
          </Card>
        </div>
        <p className="mt-6 text-sm text-silver-500">
          Team and studio plans will follow after the closed beta.
        </p>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

const faqs = [
  {
    q: "What is AniVerse?",
    a: "AniVerse is building a creator platform for animation. Its first product, Ani Studio, lets you create characters, shape stories, build storyboards and generate short animations in your browser.",
  },
  {
    q: "Can I use Ani Studio today?",
    a: site.accountsOpen
      ? "Yes — the free closed beta is open. Create an account to try Character Studio. Storyboards and animation are being added next."
      : "Not yet. Ani Studio is in development and a closed beta is planned. Sign-up will open on this site when the beta starts.",
  },
  {
    q: "Do I need a crypto wallet?",
    a: "No. You will sign up with an email address. Wallet connection may be offered later as an optional extra and will never be required to create.",
  },
  {
    q: "Is there an AniVerse token?",
    a: "No. There is no token and none is planned for launch. We will only consider blockchain features if they solve a real problem for creators, and only after legal review.",
  },
  {
    q: "Who owns what I create?",
    a: "Your projects belong to your account. Rights in AI-generated output depend on the model provider's terms and the law where you live, so we won't promise automatic copyright or exclusivity. We will publish clear terms before the beta.",
  },
  {
    q: "What powers Ani Studio?",
    a: "Ani Studio runs on AniVerse AI, our creative engine built on carefully selected generative models. We choose models for quality, speed and commercial-use terms, and we keep improving them over time.",
  },
];

export function Faq() {
  return (
    <Section
      id="faq"
      labelledBy="faq-title"
      className="border-y hairline bg-navy-900/60"
    >
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          id="faq-title"
          eyebrow="FAQ"
          title="Questions, answered plainly"
        />
        <div className="divide-y divide-silver-300/10 border-y hairline">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-base font-medium text-white [&::-webkit-details-marker]:hidden">
                {f.q}
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-silver-300/20 text-cyan-300 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 pr-10 text-sm leading-relaxed text-silver-400">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

export function Contact() {
  const email = site.contactEmail;
  return (
    <Section id="contact" labelledBy="contact-title">
      <Container>
        <div className="panel relative overflow-hidden px-6 py-14 sm:px-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-600/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-10 h-60 w-60 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 id="contact-title" className="text-3xl font-semibold sm:text-4xl">
              Building with animators, creators and small studios
            </h2>
            <p className="mt-4 text-silver-300">
              If you make animation or want to, we&apos;d like to hear what
              slows you down. Creator conversations shape what we build first.
            </p>
            <div className="mt-8">
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex h-12 items-center rounded-full bg-gradient-to-r from-violet-600 to-violet-500 px-6 font-medium text-white hover:from-violet-500 hover:to-violet-400"
                >
                  Email {email}
                </a>
              ) : (
                <p className="inline-flex items-center gap-2 rounded-full border border-silver-300/15 bg-white/[0.03] px-5 py-3 text-sm text-silver-400">
                  A public contact address will be published here shortly.
                </p>
              )}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

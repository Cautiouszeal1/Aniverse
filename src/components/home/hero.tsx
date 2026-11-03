import { ButtonLink } from "@/components/ui/button";
import { Badge, Container } from "@/components/ui/primitives";
import { site } from "@/lib/site";

/** Decorative dimensional portal. Pure CSS/SVG, hidden from assistive tech. */
function Portal() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-square w-full max-w-[460px]"
    >
      {/* glow */}
      <div className="absolute inset-[12%] rounded-full bg-violet-600/30 blur-3xl" />
      <div className="absolute inset-[30%] rounded-full bg-cyan-400/20 blur-2xl" />

      {/* rotating conic ring */}
      <div
        className="absolute inset-[6%] animate-portal-spin rounded-full p-[2px]"
        style={{
          background:
            "conic-gradient(from 0deg, #2ee6f6, transparent 30%, #7c5cff 55%, transparent 80%, #2ee6f6)",
        }}
      >
        <div className="h-full w-full rounded-full bg-navy-950" />
      </div>

      {/* static rings */}
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="hero-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a8f6ff" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#7c5cff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#050816" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hero-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2ee6f6" />
            <stop offset="100%" stopColor="#9a82ff" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="120" fill="url(#hero-core)" />
        <ellipse
          cx="200"
          cy="200"
          rx="150"
          ry="52"
          fill="none"
          stroke="url(#hero-stroke)"
          strokeWidth="1.5"
          opacity="0.8"
          transform="rotate(-18 200 200)"
        />
        <ellipse
          cx="200"
          cy="200"
          rx="110"
          ry="150"
          fill="none"
          stroke="#d9dee9"
          strokeOpacity="0.18"
          strokeWidth="1"
          transform="rotate(24 200 200)"
        />
        <circle cx="200" cy="200" r="168" fill="none" stroke="#d9dee9" strokeOpacity="0.08" />
      </svg>

      {/* floating stage chips — they name stages, they do not show data */}
      <div className="absolute left-[2%] top-[18%] animate-float rounded-2xl border border-cyan-400/25 bg-navy-850/80 px-4 py-3 backdrop-blur-md">
        <span className="block font-display text-[0.7rem] uppercase tracking-[0.18em] text-cyan-300">
          01
        </span>
        <span className="text-sm text-white">Character</span>
      </div>
      <div
        className="absolute right-[0%] top-[44%] animate-float rounded-2xl border border-violet-400/30 bg-navy-850/80 px-4 py-3 backdrop-blur-md"
        style={{ animationDelay: "-2.5s" }}
      >
        <span className="block font-display text-[0.7rem] uppercase tracking-[0.18em] text-violet-300">
          02
        </span>
        <span className="text-sm text-white">Storyboard</span>
      </div>
      <div
        className="absolute bottom-[10%] left-[16%] animate-float rounded-2xl border border-silver-300/20 bg-navy-850/80 px-4 py-3 backdrop-blur-md"
        style={{ animationDelay: "-5s" }}
      >
        <span className="block font-display text-[0.7rem] uppercase tracking-[0.18em] text-silver-300">
          03
        </span>
        <span className="text-sm text-white">Animation</span>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden"
    >
      <div className="grid-backdrop pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[120px]" />

      <Container className="relative grid items-center gap-12 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
        <div>
          <Badge tone="cyan">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            {site.status}
          </Badge>
          <h1
            id="hero-title"
            className="mt-6 text-[2.6rem] font-semibold leading-[1.05] sm:text-6xl lg:text-[4.1rem]"
          >
            Create Worlds.
            <br />
            <span className="text-gradient">Bring Stories to Life.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-silver-300">
            Ani Studio is a browser-based studio for creators. Design an
            original character, shape the story, lay out a storyboard and
            generate a short animation — then preview, save and export it, all
            in one place.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            {site.accountsOpen ? (
              <ButtonLink href="/signup" size="lg">
                Create free account
              </ButtonLink>
            ) : (
              <ButtonLink href="/#workflow" size="lg">
                See how it works
              </ButtonLink>
            )}
            <ButtonLink href="/#studio" size="lg" variant="secondary">
              Explore Ani Studio
            </ButtonLink>
          </div>
          <p className="mt-5 text-sm text-silver-400">
            No wallet or crypto needed.{" "}
            {site.accountsOpen
              ? "Closed beta is open — create a free account."
              : "Sign-up opens with the closed beta."}
          </p>
        </div>

        <Portal />
      </Container>
    </section>
  );
}

import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <main id="main" className="flex-1">
    <Container className="flex flex-col items-center py-32 text-center">
      <p className="font-display text-sm uppercase tracking-[0.22em] text-cyan-300">
        404
      </p>
      <h1 className="mt-4 text-4xl font-semibold">This world doesn&apos;t exist yet</h1>
      <p className="mt-4 max-w-md text-silver-400">
        The page you were looking for could not be found.
      </p>
      <ButtonLink href="/" className="mt-8">
        Back to home
      </ButtonLink>
    </Container>
    </main>
  );
}

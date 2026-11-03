import Link from "next/link";
import type { CharacterWithLatest } from "@/lib/data";
import { formatDate } from "@/lib/data";
import { CharacterVisual } from "./character-visual";

export function CharacterCard({ c }: { c: CharacterWithLatest }) {
  return (
    <Link
      href={`/dashboard/characters/${c.id}`}
      className="panel group block overflow-hidden transition-colors hover:border-cyan-400/40"
    >
      <div className="aspect-square overflow-hidden bg-navy-900">
        {c.latest ? (
          <CharacterVisual
            imagePath={c.latest.image_path}
            imageUrl={c.latest.image_url}
            seed={c.latest.seed}
            style={c.latest.style}
            mood={c.latest.mood}
            aspect="1:1"
            name={c.name}
            className="block h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <div className="p-4">
        <h3 className="truncate font-semibold">{c.name}</h3>
        <p className="mt-1 text-xs text-silver-500">
          {c.versionCount} version{c.versionCount === 1 ? "" : "s"} · Updated {formatDate(c.updated_at)}
        </p>
      </div>
    </Link>
  );
}

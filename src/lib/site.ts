/**
 * Single source of truth for site-wide facts.
 * Keep every statement here true: no invented users, partners or metrics.
 */
export const site = {
  name: "AniVerse",
  product: "Ani Studio",
  tagline: "Create Worlds. Bring Stories to Life.",
  description:
    "AniVerse is building Ani Studio, a browser-based studio for creating characters, shaping stories, building storyboards and generating short animations with AI.",
  status: "In development — closed beta planned",
  /** Set NEXT_PUBLIC_CONTACT_EMAIL to enable the contact link. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null,
  /** Sign-up and sign-in arrive in Milestone 2 (authentication). */
  accountsOpen: false,
} as const;

export const navLinks = [
  { href: "/#workflow", label: "How it works" },
  { href: "/#studio", label: "Ani Studio" },
  { href: "/#ecosystem", label: "Ecosystem" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

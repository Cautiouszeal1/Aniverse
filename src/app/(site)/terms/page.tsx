import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Beta Terms of Use">
      <p>
        AniVerse is in a free closed beta. These short beta terms apply while
        it is free. Full Terms of Service, an Acceptable Use Policy and a
        copyright complaint process will be published here before any paid
        features or the public launch.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Keep your login details safe; you are responsible for activity on your account.</li>
        <li>Features may change, break or be removed during the beta. Keep your own copies of anything important.</li>
      </ul>

      <h2>What you may create</h2>
      <ul>
        <li>Don&apos;t generate content that is illegal, sexual content involving minors, hateful, or that copies other people&apos;s characters, brands or artwork.</li>
        <li>Don&apos;t include other people&apos;s personal information in descriptions.</li>
        <li>We may remove content or suspend accounts that break these rules.</li>
      </ul>

      <h2>AI images during the beta</h2>
      <p>
        Beta character images are created with a free third-party service
        (Pollinations.ai, FLUX model). Images may occasionally carry a small
        watermark, the service may be slow or unavailable, and AI-generated
        images are not automatically protected by copyright or exclusive to
        you. Similar images may exist elsewhere.
      </p>

      <h2>Credits and payments</h2>
      <p>
        Generations are free during the beta. Paid credit packs are not yet
        available; we will publish prices and payment terms before they are.
      </p>
    </LegalPage>
  );
}

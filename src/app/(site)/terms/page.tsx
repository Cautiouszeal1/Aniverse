import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Beta Terms of Use">
      <p>
        AniVerse is in a closed beta. These short beta terms apply during the
        beta. Full Terms of Service, an Acceptable Use Policy and a copyright
        complaint process will be published here before the public launch.
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

      <h2>AI-generated content</h2>
      <p>
        Images and animations are created by AniVerse AI. Results can be
        unpredictable, generation may sometimes be slow or unavailable, and
        AI-generated content is not automatically protected by copyright or
        exclusive to you. Similar content may exist elsewhere.
      </p>

      <h2>Credits and payments</h2>
      <ul>
        <li>Some features use credits. The credit cost is shown before you generate.</li>
        <li>Credits are only deducted when a generation succeeds. If it fails, you are not charged.</li>
        <li>Prices, pack contents and refund terms will be shown before you buy.</li>
      </ul>
    </LegalPage>
  );
}

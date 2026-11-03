import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Beta Privacy Notice">
      <p>
        AniVerse is in a free closed beta. This notice explains what we handle
        during the beta. A full Privacy Policy will be published before the
        public launch.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>Your email address and password (stored securely by our login provider; we never see your password).</li>
        <li>Your optional display name and creator type, and when you accepted the beta terms.</li>
        <li>Your projects, character descriptions and saved character versions.</li>
      </ul>
      <p>
        This is stored with Supabase in the European Union (Frankfurt). The
        website is hosted by Vercel.
      </p>

      <h2>AI image generation</h2>
      <p>
        When you generate a character, your description and chosen style are
        sent to Pollinations.ai, a free third-party image service, which
        returns the image directly to your browser. Don&apos;t include personal
        or confidential information in descriptions.
      </p>

      <h2>Cookies and tracking</h2>
      <p>
        We use only the cookies needed to keep you signed in. There are no
        analytics, advertising or tracking cookies.
      </p>

      <h2>Your choices</h2>
      <p>
        You can edit or delete your projects and characters at any time.
        Account deletion requests will be available from Settings; until then,
        contact us using the details on the home page.
      </p>
    </LegalPage>
  );
}

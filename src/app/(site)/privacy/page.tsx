import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Beta Privacy Notice">
      <p>
        AniVerse is in a closed beta. This notice explains what we handle
        during the beta. A full Privacy Policy will be published before the
        public launch.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>Your email address and password (stored securely; we never see your password).</li>
        <li>Your optional display name and creator type, and when you accepted the beta terms.</li>
        <li>Your projects, character descriptions, storyboards and the images you save.</li>
      </ul>
      <p>
        Your data is stored with secure cloud infrastructure providers in the
        European Union. Saved images are kept private to your account.
      </p>

      <h2>AI generation</h2>
      <p>
        When you generate content, your description and chosen settings are
        processed by AniVerse AI, which uses carefully selected AI technology
        partners to create the result. They receive only what is needed to
        create your content. Please don&apos;t include personal or confidential
        information in descriptions.
      </p>

      <h2>Payments</h2>
      <p>
        When paid credit packs are available, payments will be handled by a
        licensed payment processor. AniVerse never sees or stores your full
        card details.
      </p>

      <h2>Cookies and tracking</h2>
      <p>
        We use only the cookies needed to keep you signed in. There are no
        analytics, advertising or tracking cookies.
      </p>

      <h2>Your choices</h2>
      <p>
        You can edit or delete your projects, characters and storyboards at any
        time. To request deletion of your account, contact us using the details
        on the home page.
      </p>
    </LegalPage>
  );
}

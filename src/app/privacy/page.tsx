import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <p>
        This website currently has no sign-up, forms, analytics or tracking
        cookies. Visiting it does not give us any personal data beyond the
        standard request logs kept by our hosting provider.
      </p>
      <h2>Before the closed beta</h2>
      <p>
        A full Privacy Policy will be published here before accounts open. It
        will explain what we collect, why, how long we keep it, which
        processors (such as AI model providers and hosting) receive it, and
        how to export or delete your data.
      </p>
      <h2>Contact</h2>
      <p>
        Privacy questions can be sent through the contact details on the home
        page once they are published.
      </p>
    </LegalPage>
  );
}

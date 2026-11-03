import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p>
        AniVerse has not launched. There are no accounts, subscriptions or
        paid services yet, so no service terms are in effect.
      </p>
      <h2>Before the closed beta</h2>
      <p>
        Full Terms of Service, an Acceptable Use Policy and a copyright
        complaint process will be published on this page before anyone can
        sign up. They will cover account use, credits and billing, content
        you create, AI-generated output and the rules of the provider models
        we use.
      </p>
      <h2>Using this website</h2>
      <p>
        This website is provided for information about a product in
        development. Descriptions of features may change before launch.
      </p>
    </LegalPage>
  );
}

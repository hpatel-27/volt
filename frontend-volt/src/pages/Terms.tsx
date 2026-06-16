import { LegalLayout, Section, List } from "../components/layout/LegalLayout";

const CONTACT_EMAIL = "harshpxv@gmail.com";
const JURISDICTION = "the State of North Carolina, United States";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Use" lastUpdated="June 16, 2026">
      <Section heading="Acceptance">
        <p>
          By creating an account or using Volt, you agree to these terms. If you
          do not agree, please do not use the app.
        </p>
      </Section>

      <Section heading="Eligibility">
        <p>
          Volt is intended for users aged 18 and over. By creating an account,
          you confirm that you are old enough to use the service.
        </p>
      </Section>

      <Section heading="Not medical advice">
        <p>
          Volt is a self-tracking tool, not a medical product. The information
          in the app, including any weights, calorie figures, macro totals, or
          trends, is for general informational purposes only and is{" "}
          <strong>not medical, nutritional, or fitness advice</strong>.
        </p>
        <p>
          Always consult a qualified healthcare professional before starting or
          changing any exercise or nutrition program. Never disregard
          professional advice because of something you saw in this app. If you
          think you have a medical emergency, contact your doctor or emergency
          services.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>You agree not to:</p>
        <List
          items={[
            "Use the app for any unlawful purpose or to upload unlawful content.",
            "Attempt to break, overload, probe, or gain unauthorized access to the service or other users' data.",
            "Share your account or create accounts on behalf of other people.",
            "Interfere with the normal operation of the app.",
          ]}
        />
        <p>
          We may suspend or remove accounts that violate these terms or abuse
          the service.
        </p>
      </Section>

      <Section heading="Your content">
        <p>
          The data you enter remains yours. You are responsible for what you
          record, and you grant us only the permission needed to store and
          display it back to you as part of running the app.
        </p>
      </Section>

      <Section heading="Availability and your data">
        <p>
          Volt is a personal project provided free of charge. It may change,
          break, or be discontinued at any time without notice, and we do not
          guarantee uptime or that your data will be preserved. Please keep your
          own copy of anything important.
        </p>
      </Section>

      <Section heading="No warranty">
        <p>
          The app is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;, without warranties of any kind, express or implied,
          including fitness for a particular purpose.
        </p>
      </Section>

      <Section heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, we are not liable for any
          loss, injury, or damages arising from your use of or inability to use
          the app, including any decisions you make based on the information it
          shows.
        </p>
      </Section>

      <Section heading="Termination">
        <p>
          You may delete your account at any time. We may suspend or terminate
          access if these terms are breached or if we discontinue the service.
        </p>
      </Section>

      <Section heading="Where Volt is offered">
        <p>
          Volt is operated from the United States and is intended for use by
          residents of the United States. We do not market or target the app to
          users in other countries, and we make no representation that it is
          appropriate or available for use elsewhere. If you choose to access it
          from outside the United States, you do so on your own initiative and
          are responsible for complying with your local laws.
        </p>
      </Section>

      <Section heading="Governing law">
        <p>
          These terms are governed by the laws of {JURISDICTION}, without regard
          to conflict-of-law rules.
        </p>
      </Section>

      <Section heading="Changes to these terms">
        <p>
          We may update these terms from time to time. Continued use after a
          change means you accept the updated terms.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about these terms? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-volt-500">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}

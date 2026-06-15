import { LegalLayout, Section, List } from "../components/layout/LegalLayout";

const CONTACT_EMAIL = "harshpxv@gmail.com";
const HOSTING_REGION = "the United States";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="June 14, 2026">
      <Section heading="Who runs Volt">
        <p>
          Volt is a personal, non-commercial fitness-tracking project operated
          by an individual (&ldquo;we&rdquo;, &ldquo;us&rdquo;). It is offered
          free of charge. There is no paid plan and we do not sell anything.
        </p>
      </Section>

      <Section heading="What we collect">
        <p>We only hold data that is needed to run the app:</p>
        <List
          items={[
            <>
              <strong>Account details</strong> - your name and email address,
              handled by our authentication provider (Clerk) when you sign up
              and sign in.
            </>,
            <>
              <strong>Body weight entries</strong> - the weights and optional
              notes you record.
            </>,
            <>
              <strong>Workout data</strong> - the plans, exercises, sets, reps,
              and weights you log.
            </>,
            <>
              <strong>Nutrition data</strong> - the meals and macro/calorie
              figures you enter.
            </>,
          ]}
        />
        <p>
          We do <strong>not</strong> use third-party advertising or analytics
          trackers, and we do not collect data about you from other sources.
        </p>
      </Section>

      <Section heading="A note on health data">
        <p>
          Body-weight and nutrition information can reveal details about your
          health. We treat it with care and process it only to provide the app
          to you, on the basis of your consent. You can withdraw that consent at
          any time by deleting the data or your account.
        </p>
      </Section>

      <Section heading="Why we use it and our legal basis">
        <p>
          We use your data solely to operate the features you interact with by
          storing your logs, showing your trends, and keeping you signed in. For
          users in the EU/UK, our legal bases are your <strong>consent</strong>{" "}
          (which you give by creating an account and entering data) and our{" "}
          <strong>legitimate interest</strong> in running and securing the
          service.
        </p>
      </Section>

      <Section heading="Who we share it with">
        <p>
          We do not sell or rent your data. We share it only with the service
          providers that make the app work:
        </p>
        <List
          items={[
            <>
              <strong>Clerk</strong> - authentication and account management.
            </>,
            <>
              <strong>Our hosting and database providers</strong> - to store
              your data in a PostgreSQL database, hosted in {HOSTING_REGION}.
            </>,
          ]}
        />
        <p>
          We may also disclose data if required by law. Each provider processes
          data under its own privacy terms.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          We keep your data for as long as your account exists. When you delete
          your account, your associated data is deleted. Backups, if any, are
          rotated and purged within a reasonable period.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>You can ask us to:</p>
        <List
          items={[
            "Access a copy of the data we hold about you.",
            "Correct anything that is wrong.",
            "Delete your account and associated data.",
            "Export your data in a portable format.",
          ]}
        />
        <p>
          To exercise any of these, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-volt-500">
            {CONTACT_EMAIL}
          </a>{" "}
          or delete your account from the app.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          We take reasonable measures to protect your data, including encrypted
          connections and access controls. No system is perfectly secure,
          though, and because this is a hobby project we cannot guarantee
          absolute security so please keep that in mind when deciding what to
          record.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          Volt is not intended for anyone under 18. We do not knowingly collect
          data from children.
        </p>
      </Section>

      <Section heading="Where your data is processed">
        <p>
          Volt is operated from the United States and is intended for users in
          the United States. Your data is stored and processed in{" "}
          {HOSTING_REGION}. If you access the app from outside the United States,
          understand that your data will be processed in the United States, which
          may have different data-protection rules than your location.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          We may update this policy from time to time. The &ldquo;last
          updated&rdquo; date above will change when we do.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about your privacy? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-volt-500">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}

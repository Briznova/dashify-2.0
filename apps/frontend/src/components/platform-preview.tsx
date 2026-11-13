import Link from "next/link";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { platformPages, type PlatformPage } from "@/lib/platform-pages";
import styles from "./platform-preview.module.css";

function PreviewLink({ page, children }: { page: PlatformPage; children: string }) {
  return <Link className={styles.link} href={`/dashboard/platform/${page}`}>{children} &rarr;</Link>;
}

function DisabledAction({ children }: { children: string }) {
  return <button className={styles.button} type="button" disabled>{children}</button>;
}

function Summary({ labels }: { labels: string[] }) {
  return (
    <div className={styles.metrics}>
      {labels.map((label) => (
        <div className={styles.metric} key={label}>
          <span>{label}</span>
          <strong>&mdash;</strong>
          <small>Not connected</small>
        </div>
      ))}
    </div>
  );
}

function PreviewTable({ title, description, columns, example }: {
  title: string;
  description: string;
  columns: string[];
  example: string[];
}) {
  return (
    <Panel title={title} description={description}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            <tr>{example.map((value, index) => <td key={columns[index]}>{value}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className={styles.example}>Illustrative row only; no live data is connected.</p>
    </Panel>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className={styles.steps}>
      {items.map((item) => <li key={item}><span>{item}</span><small>Not connected</small></li>)}
    </ol>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return <label className={styles.field}>{label}<input placeholder={placeholder} disabled /></label>;
}

function PreviewContent({ page }: { page: PlatformPage }) {
  switch (page) {
    case "create-school-admin":
      return (
        <div className={styles.columns}>
          <Panel title="School administrator details" description="The invitation flow is shown for design review only.">
            <div className={styles.form}>
              <Field label="Full name" placeholder="Administrator name" />
              <Field label="Work email" placeholder="name@example.test" />
              <Field label="Mobile number (optional)" placeholder="Mobile number" />
              <Field label="School name" placeholder="School name" />
              <Field label="Role" placeholder="School Admin" />
              <DisabledAction>Create &amp; send invitation</DisabledAction>
              <Link className={styles.link} href="/dashboard/schools">Cancel</Link>
            </div>
          </Panel>
          <Panel title="How it works" description="Proposed invitation flow">
            <Steps items={["Create an administrator invitation", "Send password setup instructions", "Complete first login and school onboarding"]} />
            <PreviewLink page="invitation-status">Preview invitation status</PreviewLink>
          </Panel>
        </div>
      );
    case "invitation-status":
      return (
        <div className={styles.columns}>
          <Panel title="Invitation overview" description="No invitation has been created or sent.">
            <p className={styles.empty}>Invitation details are not connected.</p>
            <PreviewLink page="create-school-admin">Create another admin preview</PreviewLink>
          </Panel>
          <Panel title="Invitation and onboarding">
            <Steps items={["Account created", "Password setup email sent", "Administrator sets password", "First login and school onboarding", "Onboarding complete"]} />
          </Panel>
        </div>
      );
    case "school-detail":
      return (
        <div className={styles.columns}>
          <Panel title="School account" description="Account and subscription information">
            <dl className={styles.details}>
              <dt>School</dt><dd>Example School</dd>
              <dt>Tenant ID</dt><dd>Not connected</dd>
              <dt>Subscription</dt><dd>Not connected</dd>
              <dt>Location and time zone</dt><dd>Not connected</dd>
            </dl>
            <DisabledAction>Edit account details</DisabledAction>
          </Panel>
          <Panel title="Onboarding progress">
            <Steps items={["Password setup and first login", "School profile and academic setup", "Team and access configuration"]} />
          </Panel>
          <Panel title="Recent account activity"><p className={styles.empty}>Activity is not connected.</p></Panel>
        </div>
      );
    case "subscriptions":
      return (
        <>
          <Summary labels={["Subscriptions", "Active", "Trials", "Renewals"]} />
          <PreviewTable title="School subscriptions" description="Subscription status and renewal dates" columns={["School", "Plan", "Status", "Renewal", "Actions"]} example={["Example School", "Example plan", "Preview", "—", "Unavailable"]} />
          <div className={styles.columns}>
            <Panel title="Renewal follow-up"><p className={styles.empty}>Reminders and trial extensions are not available.</p></Panel>
            <Panel title="Plans"><p className={styles.empty}>Review the proposed plan management layout.</p><PreviewLink page="plans">Manage plans preview</PreviewLink></Panel>
          </div>
        </>
      );
    case "plans":
      return (
        <>
          <p className={styles.note}>Plan changes and subscription migrations require separately approved rules.</p>
          <div className={styles.planGrid}>
            {["Starter", "Growth", "Enterprise"].map((plan) => (
              <Panel title={plan} key={plan}>
                <p className={styles.planPrice}>Pricing not configured</p>
                <p className={styles.empty}>Limits and features are not connected.</p>
                <DisabledAction>Edit plan</DisabledAction>
              </Panel>
            ))}
          </div>
          <PreviewLink page="subscriptions">Back to subscriptions</PreviewLink>
        </>
      );
    case "billing":
      return (
        <>
          <Summary labels={["Invoiced", "Paid", "Outstanding", "Overdue invoices"]} />
          <div className={styles.actions}><DisabledAction>Export billing</DisabledAction><DisabledAction>Create invoice</DisabledAction></div>
          <PreviewTable title="Invoices" description="Platform billing and payment status" columns={["Invoice", "School", "Amount", "Due date", "Status", "Actions"]} example={["Example invoice", "Example School", "—", "—", "Preview", "Unavailable"]} />
          <Panel title="Invoice summary"><p className={styles.empty}>Totals and tax are not connected; no tax rate is configured here.</p></Panel>
        </>
      );
    case "users":
      return (
        <>
          <Summary labels={["Platform users", "Active accounts", "Pending invitations"]} />
          <div className={styles.actions}><DisabledAction>Export users</DisabledAction><DisabledAction>Invite platform user</DisabledAction></div>
          <PreviewTable title="Platform team" description="Platform access and invitation status" columns={["User", "Role", "Access", "Status", "Actions"]} example={["Example user", "Platform user", "—", "Preview", "Unavailable"]} />
        </>
      );
    case "support":
      return (
        <>
          <Summary labels={["Open requests", "High priority", "Unassigned", "Resolved"]} />
          <PreviewTable title="Support requests" description="Ticket queue and assignment" columns={["Ticket", "School", "Priority", "Assignee", "Status", "Actions"]} example={["Example ticket", "Example School", "—", "—", "Preview", "Unavailable"]} />
          <Panel title="Ticket details"><p className={styles.empty}>Ticket actions and response targets are not connected.</p><PreviewLink page="support-detail">Open ticket detail preview</PreviewLink></Panel>
        </>
      );
    case "support-detail":
      return (
        <>
          <PreviewLink page="support">Back to support</PreviewLink>
          <div className={styles.columns}>
            <Panel title="Ticket conversation"><p className={styles.empty}>No ticket has been selected.</p></Panel>
            <Panel title="Ticket properties">
              <Steps items={["School", "Priority", "Assignee", "Status"]} />
              <DisabledAction>Mark resolved</DisabledAction>
            </Panel>
          </div>
        </>
      );
    case "audit-log":
      return (
        <>
          <Summary labels={["Events", "Failed or blocked", "Security events"]} />
          <div className={styles.actions}><DisabledAction>Export audit log</DisabledAction></div>
          <PreviewTable title="Platform events" description="Read-only activity and security events" columns={["Time", "Actor", "Category", "Event", "Result", "Actions"]} example={["—", "Example user", "Preview", "Example event", "—", "Unavailable"]} />
          <p className={styles.note}>Audit retention and event access are not configured in this preview.</p>
        </>
      );
    case "settings":
      return (
        <>
          <div className={styles.actions}><DisabledAction>Discard changes</DisabledAction><DisabledAction>Save changes</DisabledAction></div>
          <div className={styles.columns}>
            <Panel title="Security" description="Platform-team policies">
              <Steps items={["Password setup links", "Session timeout", "Multi-factor authentication", "Failed sign-in lockout"]} />
            </Panel>
            <Panel title="Billing and operations" description="Platform-wide configuration">
              <Steps items={["Tax configuration", "Trial period", "Maintenance mode", "Audit retention"]} />
            </Panel>
          </div>
          <p className={styles.note}>These settings do not configure school-scoped administrator policies.</p>
        </>
      );
    case "school-setup":
      return (
        <div className={styles.columns}>
          <Panel title="School setup" description="A proposed workflow for provisioning a school.">
            <Steps items={["Create or invite a School Admin", "Set up the school profile", "Configure academic years, classes and sections", "Review onboarding"]} />
            <PreviewLink page="create-school-admin">Preview administrator invitation</PreviewLink>
          </Panel>
          <Panel title="CSV bulk import" description="Templates, validation and import operations are not connected.">
            <Steps items={["Select a school and data type", "Download a template", "Upload and validate rows", "Review and confirm", "Review results and errors"]} />
            <div className={styles.actions}><DisabledAction>Download template</DisabledAction><DisabledAction>Upload CSV</DisabledAction></div>
          </Panel>
        </div>
      );
  }
}

export function PlatformPreview({ page }: { page: PlatformPage }) {
  const { title, description } = platformPages[page];
  return (
    <div className={styles.page}>
      <PageHeading eyebrow="PLATFORM ADMINISTRATION" title={title} description={description} />
      <div className={styles.warning} role="status">
        <strong>Dummy page — not connected.</strong> This is a design preview, not actual platform data. Actions are unavailable.
      </div>
      <PreviewContent page={page} />
    </div>
  );
}

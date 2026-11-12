import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { AuthFlow } from "@/components/auth-flow";

export const metadata: Metadata = { title: "Sign in" };

const seededAccountVariables = [
  {
    role: "School admin (seeded)",
    emailKey: "SEED_ADMIN_EMAIL",
    passwordKey: "SEED_ADMIN_PASSWORD",
  },
  {
    role: "Platform admin (seeded)",
    emailKey: "SEED_PLATFORM_ADMIN_EMAIL",
    passwordKey: "SEED_PLATFORM_ADMIN_PASSWORD",
  },
  {
    role: "Teacher (seeded)",
    emailKey: "SEED_TEACHER_EMAIL",
    passwordKey: "SEED_TEACHER_PASSWORD",
  },
] as const;

function parseEnvFile(contents: string): Map<string, string> {
  const values = new Map<string, string>();
  const requiredKeys = new Set<string>(
    seededAccountVariables.flatMap(({ emailKey, passwordKey }) => [
      emailKey,
      passwordKey,
    ]),
  );

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/,
    );
    if (!match || !requiredKeys.has(match[1])) continue;

    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    values.set(match[1], value);
  }

  return values;
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT";
}

async function getDevSeededAccounts() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_DASHIFY_API_MODE !== "api"
  ) {
    return [];
  }

  const envPaths = [
    path.resolve(process.cwd(), "..", "backend", ".env"),
    path.resolve(process.cwd(), "apps", "backend", ".env"),
  ];
  let contents: string | undefined;

  for (const envPath of envPaths) {
    try {
      contents = await readFile(envPath, "utf8");
      break;
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }
  }

  if (!contents) return [];

  const values = parseEnvFile(contents);
  return seededAccountVariables.flatMap(({ role, emailKey, passwordKey }) => {
    const email = values.get(emailKey);
    const password = values.get(passwordKey);
    return email && password ? [{ role, email, password }] : [];
  });
}

export default async function SignInPage() {
  const devSeededAccounts = await getDevSeededAccounts();
  return <AuthFlow mode="sign-in" devSeededAccounts={devSeededAccounts} />;
}

import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | undefined;

/** Tagged-template SQL client; rows come back as plain objects. */
export function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  client ??= neon(process.env.DATABASE_URL!);
  return client(strings, ...values) as Promise<T[]>;
}

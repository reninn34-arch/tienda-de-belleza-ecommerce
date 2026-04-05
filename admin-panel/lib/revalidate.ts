const STORE = process.env.STORE_URL ?? "http://localhost:3000";
const SECRET = process.env.REVALIDATE_SECRET ?? "";

export async function revalidateStore(tag: string): Promise<void> {
  try {
    await fetch(
      `${STORE}/api/revalidate?secret=${SECRET}&tag=${tag}`,
      { method: "POST" }
    );
  } catch {
    // Non-blocking — admin action still succeeds if store is unreachable
  }
}

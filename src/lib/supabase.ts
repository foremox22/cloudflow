import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase env vars are not configured");
    _client = createClient(url, key);
  }
  return _client;
}

export async function uploadToStorage(
  bucket: string,
  path: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const client = getClient();
  const { error } = await client.storage
    .from(bucket)
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (error) throw new Error(error.message);

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

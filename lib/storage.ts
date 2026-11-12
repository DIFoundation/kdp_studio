import { createServiceClient } from "@/lib/supabase/server";

export type AssetBucket = "illustrations" | "covers";

/** Convert a data URL (data:image/png;base64,...) to a Buffer + mime type. */
export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) throw new Error("Unsupported image data format (expected base64 data URL)");
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

/**
 * Upload a generated image to Supabase Storage.
 * Path scheme: {userId}/{projectId}/{kind}/{uuid}.{ext}
 * Returns the storage path.
 */
export async function uploadGeneratedImage(
  bucket: AssetBucket,
  userId: string,
  projectId: string,
  kind: string,
  dataUrl: string,
): Promise<string> {
  const { buffer, mimeType } = dataUrlToBuffer(dataUrl);
  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
  const path = `${userId}/${projectId}/${kind}/${crypto.randomUUID()}.${ext}`;

  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

/** Create a signed URL for displaying a private asset (1 hour). */
export async function signedAssetUrl(bucket: AssetBucket, path: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  if (error) {
    console.error("[storage] signed url failed:", error.message);
    return null;
  }
  return data.signedUrl;
}

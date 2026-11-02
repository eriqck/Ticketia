import { randomUUID } from "node:crypto";

const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "event-media";

function getStorageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase Storage is not configured.");
  }
  return { url, serviceRoleKey };
}

export async function uploadEventImage(file: File, organizerId: string) {
  const { url, serviceRoleKey } = getStorageConfig();
  const extension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `events/${organizerId}/${randomUUID()}.${extension}`;
  const response = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": file.type,
      "x-upsert": "false",
    },
    body: await file.arrayBuffer(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase Storage upload failed: ${message || response.statusText}`);
  }

  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

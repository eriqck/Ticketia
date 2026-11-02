import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { uploadEventImage } from "@/lib/storage";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.account_type !== "organizer") {
    return NextResponse.json({ error: "Organizer sign-in required." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type)) {
    return NextResponse.json({ error: "Upload a PNG, JPEG, or WebP image." }, { status: 400 });
  }
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "Images must be 5 MB or smaller." }, { status: 400 });
  }

  try {
    const imageUrl = await uploadEventImage(file, user.id);
    return NextResponse.json({ imageUrl }, { status: 201 });
  } catch (error) {
    console.error("Event image upload failed", error);
    return NextResponse.json({ error: "Unable to upload the event image. Check Supabase Storage configuration." }, { status: 503 });
  }
}

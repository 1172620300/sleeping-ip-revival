import { currentUser } from "@/server/auth";
import { errorResponse, json } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try { return json({ user: await currentUser() }); }
  catch (error) { return errorResponse(error); }
}

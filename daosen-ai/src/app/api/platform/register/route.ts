import { identity } from "@/modules/identity";
import { registrationSchema } from "@/modules/identity/validation";
import { body, errorResponse, json, verifyOrigin } from "@/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const input = await body(request, registrationSchema);
    const user = await identity.register(input);
    return json({ user }, 201);
  } catch (error) { return errorResponse(error); }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Generic message to avoid user enumeration.
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Password verification (plain comparison in M1; bcrypt in M2+).
    const passwordOk = password === user.passwordHash;
    if (!passwordOk) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

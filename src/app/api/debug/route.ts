import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany();
  const tokens = await prisma.gmailToken.findMany();
  return NextResponse.json({ users, tokens });
}

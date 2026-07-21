import { NextResponse } from "next/server";
import { apiError, requestId } from "@/lib/harvest/api";
import { getRegistrationCountries } from "@/lib/harvest/member";

export async function GET() {
  const id = requestId();
  try {
    const countries = await getRegistrationCountries();
    return NextResponse.json({ data: { countries }, meta: { requestId: id } }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (error) { return apiError(error, id); }
}

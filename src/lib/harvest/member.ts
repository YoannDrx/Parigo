import "server-only";

import type { MemberProfile } from "@/types";
import { HarvestMemberSchema, type HarvestMemberPayload } from "./contracts";
import {
  findHarvestToken,
  getHarvestTokenExpiry,
  memberRequest,
  serviceRequest,
} from "./client";
import { HarvestError, isRecord } from "./errors";
import { asIsoDate, asString, pick, recordArray } from "./values";
import { assetUrl, getDownloadFormats } from "./assets";
import { buildMemberRegistration, buildMemberSubscription, buildPersistentLogin } from "./member-contracts";

type HarvestRecord = Record<string, unknown>;

function objectByKey(payload: unknown, key: string): HarvestRecord | undefined {
  if (!isRecord(payload)) return undefined;
  for (const [candidate, value] of Object.entries(payload)) {
    if (candidate.toLowerCase() === key.toLowerCase() && isRecord(value)) return value;
    const nested = objectByKey(value, key);
    if (nested) return nested;
  }
  return undefined;
}

function tokenByKey(payload: unknown, key: string): { value: string; expiresAt: number } | undefined {
  const object = objectByKey(payload, key);
  if (object) {
    const value = asString(pick(object, "Value", "TokenValue", "Token"));
    if (value) return { value, expiresAt: getHarvestTokenExpiry(object) };
  }
  if (isRecord(payload) && typeof payload[key] === "string") {
    return { value: payload[key], expiresAt: Date.now() + 23 * 60 * 60_000 };
  }
  return undefined;
}

function findMemberObject(payload: unknown): HarvestMemberPayload | undefined {
  if (!isRecord(payload)) return undefined;
  const candidate = payload.MemberAccount ?? payload.Member ?? payload.Account ?? payload.MemberDetails ?? payload;
  const parsed = HarvestMemberSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

export function mapMemberProfile(payload: unknown): MemberProfile & { createdAt?: string; image?: string } {
  const member = findMemberObject(payload);
  if (!member) throw new HarvestError("Harvest member payload is invalid", "HARVEST_INVALID_RESPONSE");
  const firstName = member.FirstName;
  const lastName = member.LastName;
  const normalizedStatus = (member.Status || "").toLowerCase().replace(/\s+/g, "-");
  const profileImageTemplate = isRecord(member.ServiceInfoURLs)
    ? asString(member.ServiceInfoURLs.ProfileImageURL)
    : "";
  return {
    id: member.ID,
    email: member.Email || member.Username,
    firstName,
    lastName,
    username: member.Username || member.Email,
    company: member.Company || undefined,
    country: member.Country || undefined,
    production: member.Production || undefined,
    subProduction: member.SubProduction || undefined,
    position: member.Position || undefined,
    address1: member.Address1 || undefined,
    address2: member.Address2 || undefined,
    suburb: member.Suburb || undefined,
    state: member.State || undefined,
    postcode: member.Postcode || undefined,
    phone: member.Phone || undefined,
    status: normalizedStatus || undefined,
    regionId: member.RegionID || undefined,
    termsAccepted: member.TermsAccept || false,
    privacyAccepted: member.PrivacyAccept || false,
    verified: !["unverified", "pending", "pending-approval"].includes(normalizedStatus),
    subscribed: member.Subscribe || false,
    fileFormatId: member.FileFormat || undefined,
    fileFormats: member.FileFormats.filter(isRecord).map((format) => ({
      id: asString(format.ID),
      label: asString(format.Name || format.DisplayName || format.FileExtension),
      extension: asString(format.FileExtension) || undefined,
    })).filter((format) => format.id),
    downloadEnabled: member.DownloadEnabled || false,
    downloadEnabledType: member.DownloadEnabledType || undefined,
    downloadLimit: member.DownloadLimit ?? undefined,
    downloadsUsed: member.DownloadsUsed ?? undefined,
    downloadsRemaining: member.DownloadsRemaining ?? undefined,
    downloadStem: member.DownloadStem || false,
    sampleEnabled: member.SampleEnabled || false,
    hasProfileImage: member.HasProfileImage || false,
    website: member.Website || undefined,
    positionType: member.PositionType || undefined,
    freelancer: member.Freelancer || false,
    managedBy: member.ManagedBy?.Name ? {
      name: member.ManagedBy.Name,
      email: member.ManagedBy.Email || undefined,
      phone: member.ManagedBy.Phone || undefined,
    } : undefined,
    createdAt: asIsoDate((member as HarvestRecord).CreatedDate),
    image: member.HasProfileImage && profileImageTemplate
      ? assetUrl(profileImageTemplate, { id: member.ID, width: 320, height: 320 })
      : asString((member as HarvestRecord).ProfileImageUrl || (member as HarvestRecord).ImageUrl) || undefined,
  };
}

export interface HarvestLoginResult {
  memberToken: string;
  memberExpiresAt: number;
  persistentToken: string;
  persistentExpiresAt: number;
  profile: MemberProfile & { createdAt?: string; image?: string };
}

export async function loginMember(username: string, password: string): Promise<HarvestLoginResult> {
  const payload = await serviceRequest<HarvestRecord>(
    (token) => `/getmembertoken/${token}`,
    {
      method: "POST",
      body: JSON.stringify({
        UserName: username,
        Password: password,
        PersistentLogin: true,
        ReturnMemberDetails: true,
      }),
    },
  );
  const member = tokenByKey(payload, "Token") || tokenByKey(payload, "MemberToken");
  const persistent = tokenByKey(payload, "PersistentLoginToken");
  if (!member?.value || !persistent?.value) {
    throw new HarvestError("Harvest did not return a persistent member session", "HARVEST_INVALID_RESPONSE");
  }
  const profile = mapMemberProfile(payload);
  const status = profile.status?.toLowerCase();
  if (status && !["active", "approved"].includes(status)) {
    const message = status.includes("pending")
      ? "Your account is awaiting Harvest approval"
      : status.includes("unverified")
        ? "Please verify your email address before signing in"
        : "This Harvest account is not active";
    throw new HarvestError(message, "FORBIDDEN", 403, false, status);
  }
  return {
    memberToken: member.value,
    memberExpiresAt: member.expiresAt,
    persistentToken: persistent.value,
    persistentExpiresAt: persistent.expiresAt,
    profile,
  };
}

export async function refreshMember(persistentToken: string): Promise<HarvestLoginResult> {
  const payload = await serviceRequest<HarvestRecord>(
    (token) => `/validatepersistentlogintoken/${token}`,
    {
      method: "POST",
      body: JSON.stringify(buildPersistentLogin(persistentToken)),
    },
  );
  const member = tokenByKey(payload, "Token") || tokenByKey(payload, "MemberToken");
  const persistent = tokenByKey(payload, "PersistentLoginToken") || {
    value: persistentToken,
    expiresAt: Date.now() + 7 * 24 * 60 * 60_000,
  };
  const fallback = findHarvestToken(payload);
  if (!member?.value && !fallback) throw new HarvestError("Harvest session expired", "UNAUTHENTICATED", 401);
  return {
    memberToken: member?.value || fallback!,
    memberExpiresAt: member?.expiresAt || Date.now() + 23 * 60 * 60_000,
    persistentToken: persistent.value,
    persistentExpiresAt: persistent.expiresAt,
    profile: mapMemberProfile(payload),
  };
}

export async function registerMember(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
  subscribe?: boolean;
  country: string;
  production?: string;
  subProduction?: string;
  position?: string;
  address1?: string;
  address2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  phone?: string;
  fileFormatId?: string;
  privacyAccepted: boolean;
}): Promise<{ member: HarvestRecord; verificationEmailSent: boolean }> {
  await serviceRequest<HarvestRecord>((token) => `/validateusername/${token}`, {
    method: "POST",
    body: JSON.stringify({ Username: input.email, VerifyEmail: false }),
  });
  await serviceRequest<HarvestRecord>((token) => `/validatememberemail/${token}`, {
    method: "POST",
    body: JSON.stringify({ Email: input.email }),
  });
  const member = await serviceRequest<HarvestRecord>(
    (token) => `/registermember/${token}`,
    {
      method: "POST",
      body: JSON.stringify(buildMemberRegistration(input)),
    },
  );
  await serviceRequest<HarvestRecord>((token) => `/sendmemberverifylinkemail/${token}`, {
    method: "POST",
    body: JSON.stringify({ Email: input.email, ExternalVerifyToken: "" }),
  });
  return { member, verificationEmailSent: true };
}

export async function getRegistrationCountries(): Promise<Array<{ code: string; name: string }>> {
  const payload = await serviceRequest<HarvestRecord>((token) => `/getregions/${token}`);
  const countries = recordArray(payload, "Regions").flatMap((region) => recordArray(region, "Countries"));
  return [...new Map(countries.map((country) => [asString(country.TLD), { code: asString(country.TLD), name: asString(country.Name) }])).values()]
    .filter((country) => country.code && country.name)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function getMemberProfile(memberToken: string): Promise<MemberProfile & { createdAt?: string; image?: string }> {
  const [payload, formats] = await Promise.all([
    memberRequest<HarvestRecord>(memberToken, (token) => `/getmember/${token}`),
    getDownloadFormats(),
  ]);
  const profile = mapMemberProfile(payload);
  const allowedIds = new Set(profile.fileFormats?.map((format) => format.id) || []);
  profile.fileFormats = formats
    .filter((format) => allowedIds.size === 0 || allowedIds.has(format.id))
    .map((format) => ({ id: format.id, label: format.label, extension: format.extension }));
  return profile;
}

export async function updateMemberProfile(
  memberToken: string,
  input: Partial<Pick<MemberProfile,
    "firstName" | "lastName" | "company" | "country" | "production" | "subProduction" |
    "position" | "address1" | "address2" | "suburb" | "state" | "postcode" | "phone" |
    "fileFormatId" | "website"
  >>,
): Promise<MemberProfile & { createdAt?: string; image?: string }> {
  const current = await getMemberProfile(memberToken);
  const payload = await memberRequest<HarvestRecord>(
    memberToken,
    (token) => `/updatemember/${token}`,
    {
      method: "POST",
      body: JSON.stringify({
        MemberAccount: {
          ID: current.id,
          FirstName: input.firstName ?? current.firstName,
          LastName: input.lastName ?? current.lastName,
          Email: current.email,
          Username: current.username || current.email,
          Company: input.company ?? current.company ?? "",
          Country: input.country ?? current.country ?? "",
          Production: input.production ?? current.production ?? "",
          SubProduction: input.subProduction ?? current.subProduction ?? "",
          Position: input.position ?? current.position ?? "",
          Address1: input.address1 ?? current.address1 ?? "",
          Address2: input.address2 ?? current.address2 ?? "",
          Suburb: input.suburb ?? current.suburb ?? "",
          State: input.state ?? current.state ?? "",
          Postcode: input.postcode ?? current.postcode ?? "",
          Phone: input.phone ?? current.phone ?? "",
          FileFormat: input.fileFormatId ?? current.fileFormatId ?? "",
          Website: input.website ?? current.website ?? "",
          TermsAccept: Boolean(current.termsAccepted),
          PrivacyAccept: Boolean(current.privacyAccepted),
          Subscribe: Boolean(current.subscribed),
          SearchFormat: "Track",
          SearchSort: "New",
          Attributes: [],
          Status: current.status || "Active",
        },
      }),
    },
  );
  return mapMemberProfile(payload);
}

export async function subscribeMember(memberToken: string, subscribed: boolean): Promise<void> {
  const profile = await getMemberProfile(memberToken);
  await memberRequest(memberToken, (token) => `/membersubscribe/${token}`, {
    method: "POST",
    body: JSON.stringify(buildMemberSubscription(profile, subscribed)),
  });
}

export async function getMemberImageUpload(memberToken: string, fileName: string, contentType: string) {
  const payload = await memberRequest<HarvestRecord>(memberToken, (token) => `/getpresigneduploadurl/${token}`, {
    method: "POST",
    body: JSON.stringify({ AssetType: "MemberProfileImage", FileName: fileName, ContentType: contentType, ExpiresInSeconds: "120", ObjectId: "" }),
  });
  const uploadUrl = asString(payload.PresignedUploadUrl);
  const resourceUrl = asString(payload.ResourceUrl);
  if (!uploadUrl || !resourceUrl) throw new HarvestError("Harvest did not return an image upload URL", "HARVEST_INVALID_RESPONSE");
  return { uploadUrl, resourceUrl, fileName };
}

export async function confirmMemberImageUpload(memberToken: string, fileName: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/confirmpresignedupload/${token}`, {
    method: "POST",
    body: JSON.stringify({ AssetType: "MemberProfileImage", FileName: fileName, ObjectId: "" }),
  });
}

export async function removeMemberImage(memberToken: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/removeassignedupload/${token}`, {
    method: "POST",
    body: JSON.stringify({ AssetType: "MemberProfileImage" }),
  });
}

export async function expireMember(memberToken: string, persistentToken?: string): Promise<void> {
  await memberRequest(memberToken, (token) => `/expiretoken/${token}`).catch(() => undefined);
  if (persistentToken) {
    await serviceRequest(
      (token) => `/expirepersistentlogintoken/${token}`,
      { method: "POST", body: JSON.stringify({ Token: persistentToken }) },
    ).catch(() => undefined);
  }
}

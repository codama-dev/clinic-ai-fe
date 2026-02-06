import { base44 } from "@/api/base44Client";

const Core = base44.integrations?.Core ?? {};

export const UploadFile = Core.UploadFile?.bind?.(Core) ?? Core.UploadFile;
export const SendEmail = Core.SendEmail?.bind?.(Core) ?? Core.SendEmail;

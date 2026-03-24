import fs from "fs";
import path from "path";

let cachedDataUri: string | null = null;

export function getCounselorSignatureDataUri(): string {
  if (cachedDataUri) return cachedDataUri;

  const filePath = path.join(
    process.cwd(),
    "public",
    "images",
    "counselor-signature.png"
  );
  const buffer = fs.readFileSync(filePath);
  cachedDataUri = `data:image/png;base64,${buffer.toString("base64")}`;
  return cachedDataUri;
}

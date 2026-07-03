export async function sha256(text) {
  if (!window.crypto?.subtle) {
    throw new Error("Secure password hashing is not available in this browser.");
  }

  const data = new TextEncoder().encode(text);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

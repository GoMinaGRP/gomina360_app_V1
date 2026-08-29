/**
 * Copy text without throwing noisy NotAllowedError messages in embedded
 * previews. Arena's live preview is often inside an iframe whose inherited
 * Permissions Policy does not allow `clipboard-write`, even though
 * navigator.clipboard exists. Check that policy before touching the API and
 * fall back to the user-initiated selection command when possible.
 */
type Policy = {
  allowsFeature?: (feature: string) => boolean;
};

function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);

  let copied = false;
  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
  }
  return copied;
}

export async function copyText(text: string): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  const doc = document as Document & {
    permissionsPolicy?: Policy;
    featurePolicy?: Policy;
  };
  const policy = doc.permissionsPolicy || doc.featurePolicy;

  // Do not call navigator.clipboard.writeText when the containing frame has
  // explicitly blocked clipboard-write — Chromium reports a NotAllowedError
  // to the console even when the rejected promise is caught by the caller.
  if (policy?.allowsFeature) {
    try {
      if (!policy.allowsFeature("clipboard-write")) return legacyCopy(text);
    } catch {
      // Continue to the capability/permission checks below.
    }
  } else if (navigator.permissions?.query) {
    // Older browsers may not expose document.permissionsPolicy, but can still
    // tell us that clipboard-write is denied for this document.
    try {
      const permission = await navigator.permissions.query({
        name: "clipboard-write" as PermissionName,
      });
      if (permission.state === "denied") return legacyCopy(text);
    } catch {
      // Some browsers reject this permission query; capability detection below
      // remains safe because writeText is still wrapped and has a fallback.
    }
  }

  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // A browser can still reject clipboard access after the policy check
      // (for example, when the user has denied the permission). Try the
      // non-Clipboard-API fallback instead of surfacing the exception.
    }
  }

  return legacyCopy(text);
}

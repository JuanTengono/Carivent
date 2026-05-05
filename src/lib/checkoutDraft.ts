const KEY = "carivent_checkout_draft";

export type CheckoutDraft = {
  eventId: number;
  quantity: number;
  promotionCode?: string;
};

export function readCheckoutDraft(): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as CheckoutDraft;
    if (!v?.eventId || !v?.quantity) return null;
    return v;
  } catch {
    return null;
  }
}

export function writeCheckoutDraft(draft: CheckoutDraft) {
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function clearCheckoutDraft() {
  sessionStorage.removeItem(KEY);
}

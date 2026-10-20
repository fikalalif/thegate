export interface DonationConfig {
  saweriaUrl: string;
  paypalUrl: string;
  paypalName: string;
  paypalQrImage: string;
}

export const DEFAULT_DONATION_CONFIG: DonationConfig = {
  saweriaUrl: "https://saweria.co/fikalalif26",
  paypalUrl: "https://www.paypal.com/qrcodes/p2pqrc/KENY62A7ZZNJA",
  paypalName: "fikal alif",
  paypalQrImage: "/paypal_qr.png",
};

const STORAGE_KEY = "thegate-donation-config";

export function getDonationConfig(): DonationConfig {
  if (typeof window === "undefined") return DEFAULT_DONATION_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DONATION_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      saweriaUrl: parsed.saweriaUrl || DEFAULT_DONATION_CONFIG.saweriaUrl,
      paypalUrl: parsed.paypalUrl || DEFAULT_DONATION_CONFIG.paypalUrl,
      paypalName: parsed.paypalName || DEFAULT_DONATION_CONFIG.paypalName,
      paypalQrImage: parsed.paypalQrImage || DEFAULT_DONATION_CONFIG.paypalQrImage,
    };
  } catch {
    return DEFAULT_DONATION_CONFIG;
  }
}

export function saveDonationConfig(config: Partial<DonationConfig>): DonationConfig {
  if (typeof window === "undefined") return DEFAULT_DONATION_CONFIG;
  try {
    const current = getDonationConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("donationconfigchange", { detail: updated }));
    return updated;
  } catch {
    return DEFAULT_DONATION_CONFIG;
  }
}

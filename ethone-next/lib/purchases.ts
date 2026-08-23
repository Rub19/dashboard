"use client";

const REVENUECAT_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY || "";

export const PRODUCT_IDS = {
  monthly: "dev.ethone.app.pro.monthly",
  yearly: "dev.ethone.app.pro.yearly",
} as const;

export type SubscriptionPlan = keyof typeof PRODUCT_IDS;

export type CustomerInfo = {
  entitlements: { active: Record<string, { isActive: boolean; expirationDate?: string }> };
};

export type PurchasesPackage = {
  product: { identifier: string };
};

export type PurchasesOffering = {
  availablePackages: PurchasesPackage[];
  current: PurchasesOffering | null;
};

function isNative() {
  return false;
}

export async function configurePurchases(_appUserID?: string) {
  if (!isNative()) return;
  if (!REVENUECAT_API_KEY) {
    console.warn("RevenueCat API key not configured");
    return;
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!isNative()) return null;
  return null;
}

export function findProPackage(offering: PurchasesOffering | null, plan: SubscriptionPlan): PurchasesPackage | null {
  if (!offering) return null;
  const productId = PRODUCT_IDS[plan];
  return offering.availablePackages.find((pkg) => pkg.product.identifier === productId) ?? null;
}

export async function purchasePackage(_pkg: PurchasesPackage): Promise<{ ok: boolean; customerInfo?: CustomerInfo; error?: Error }> {
  if (!isNative()) return { ok: false, error: new Error("Achats in-app non disponibles.") };
  return { ok: false, error: new Error("Achats in-app non disponibles.") };
}

export async function restorePurchases(): Promise<{ ok: boolean; customerInfo?: CustomerInfo; error?: Error }> {
  if (!isNative()) return { ok: false, error: new Error("Achats in-app non disponibles.") };
  return { ok: false, error: new Error("Achats in-app non disponibles.") };
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isNative()) return null;
  return null;
}

export function isPro(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  return customerInfo.entitlements.active["pro"]?.isActive ?? false;
}

export function getProExpiration(customerInfo: CustomerInfo | null): Date | null {
  if (!customerInfo) return null;
  const expiration = customerInfo.entitlements.active["pro"]?.expirationDate;
  return expiration ? new Date(expiration) : null;
}

export function getProOfferingFeatures() {
  return {
    features: [
      "Stockage illimité",
      "Aura personnalisées",
      "IA avancée",
      "Sauvegardes Cloud",
      "Export illimité",
    ],
    products: Object.values(PRODUCT_IDS),
  };
}

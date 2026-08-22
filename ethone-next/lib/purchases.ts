"use client";

import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from "@revenuecat/purchases-capacitor";

const REVENUECAT_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY || "";

export const PRODUCT_IDS = {
  monthly: "dev.ethone.app.pro.monthly",
  yearly: "dev.ethone.app.pro.yearly",
} as const;

export type SubscriptionPlan = keyof typeof PRODUCT_IDS;

function isNative() {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

export async function configurePurchases(appUserID?: string) {
  if (!isNative()) return;
  if (!REVENUECAT_API_KEY) {
    console.warn("RevenueCat API key not configured");
    return;
  }
  try {
    await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID });
  } catch (err) {
    console.warn("Purchases configuration failed", err);
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!isNative()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (err) {
    console.warn("Get offerings failed", err);
    return null;
  }
}

export function findProPackage(offering: PurchasesOffering | null, plan: SubscriptionPlan): PurchasesPackage | null {
  if (!offering) return null;
  const productId = PRODUCT_IDS[plan];
  return offering.availablePackages.find((pkg) => pkg.product.identifier === productId) ?? null;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<{ ok: boolean; customerInfo?: CustomerInfo; error?: Error }> {
  if (!isNative()) return { ok: false, error: new Error("Achats in-app non disponibles.") };
  try {
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    return { ok: true, customerInfo: result.customerInfo };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function restorePurchases(): Promise<{ ok: boolean; customerInfo?: CustomerInfo; error?: Error }> {
  if (!isNative()) return { ok: false, error: new Error("Achats in-app non disponibles.") };
  try {
    const result = await Purchases.restorePurchases();
    return { ok: true, customerInfo: result.customerInfo };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isNative()) return null;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (err) {
    console.warn("Get customer info failed", err);
    return null;
  }
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

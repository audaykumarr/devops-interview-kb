import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./site";

interface BuildMetadataOptions {
  title: string;
  description: string;
  /** Site-relative path, e.g. "/aws" or "/questions/aws/iam/slug". */
  path: string;
  type?: "website" | "article";
  /** Set true for pages that exist for UX/filtering completeness but are too thin or too duplicative of another indexed page to be worth ranking on their own. */
  noindex?: boolean;
}

/**
 * Every page's metadata is built through this one function so canonical
 * URLs, OpenGraph, and Twitter Card fields stay consistent and no page
 * forgets one of them (see ARCHITECTURE.md, decision 11).
 */
export function buildMetadata({ title, description, path, type = "website", noindex = false }: BuildMetadataOptions): Metadata {
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

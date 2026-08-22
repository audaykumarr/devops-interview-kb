import { SITE_NAME, SITE_URL } from "./site";

export interface BreadcrumbItem {
  name: string;
  /** Site-relative path; omit for the current (non-linked) page. */
  path?: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.path ? { item: `${SITE_URL}${item.path}` } : {}),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function itemListJsonLd({
  name,
  items,
  startPosition = 1,
}: {
  name: string;
  items: { title: string; url: string }[];
  startPosition?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: startPosition + i,
      name: item.title,
      url: `${SITE_URL}${item.url}`,
    })),
  };
}

export function qaPageJsonLd({
  title,
  answerText,
  path,
  dateModified,
}: {
  title: string;
  answerText: string;
  path: string;
  dateModified: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: title,
      text: title,
      answerCount: 1,
      dateModified,
      acceptedAnswer: {
        "@type": "Answer",
        text: answerText,
        dateModified,
        url: `${SITE_URL}${path}`,
      },
    },
  };
}

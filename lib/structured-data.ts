import { SITE_URL } from "./site";

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

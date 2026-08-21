import Link from "next/link";
import { extractBulletList } from "@/scripts/lib/content";
import type { FollowUpLink } from "@/lib/questions";

export function FollowUpQuestions({ content, links }: { content: string; links: FollowUpLink[] }) {
  const bullets = extractBulletList(content);
  const linkByText = new Map(links.map((l) => [l.follow_up, l]));

  return (
    <ul className="list-disc space-y-1.5 pl-5 text-slate-700 dark:text-slate-300">
      {bullets.map((bullet, i) => {
        const match = linkByText.get(bullet);
        return (
          <li key={i}>
            {match ? (
              <Link href={match.matched_url} className="text-indigo-600 hover:underline dark:text-indigo-400">
                {bullet}
              </Link>
            ) : (
              bullet
            )}
          </li>
        );
      })}
    </ul>
  );
}

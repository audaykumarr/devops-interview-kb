import { expect, test } from "@playwright/test";

const SAMPLE_QUESTION_PATH = "/questions/aws/iam/migrating-ec2-admin-user-to-least-privilege-role";

test.describe("DevOps Interview Knowledge Base", () => {
  test("homepage loads", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    page.on("pageerror", (e) => consoleErrors.push(String(e)));

    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "DevOps Interview Questions" })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("category page loads and lists its questions", async ({ page }) => {
    const response = await page.goto("/aws");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /AWS Interview Questions/ })).toBeVisible();
    await expect(page.locator("a[href^='/questions/aws/']").first()).toBeVisible();
  });

  test("question page loads with full section content", async ({ page }) => {
    const response = await page.goto(SAMPLE_QUESTION_PATH);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("AdministratorAccess");
    await expect(page.getByRole("heading", { name: "Short Answer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Key Takeaways" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "References" })).toBeVisible();
  });

  test("search filters results as you type", async ({ page }) => {
    await page.goto("/search");
    await page.getByPlaceholder("Search by title, tag, or technology...").fill("kubernetes");
    await expect(page.getByText(/results for/i)).toBeVisible();
    // Exactly the 2 sample questions tagged/titled around Kubernetes should match.
    await expect(page.locator("main a.group")).toHaveCount(2);
  });

  test("difficulty filter narrows a category page via URL params", async ({ page }) => {
    // The one AWS sample question is "advanced" — filtering to beginner should empty the list.
    await page.goto("/aws?difficulty=beginner");
    await expect(page.getByText("No questions match these filters yet.")).toBeVisible();

    await page.goto("/aws?difficulty=advanced");
    await expect(page.locator("a[href^='/questions/aws/']").first()).toBeVisible();
  });

  test("technology filter narrows a category page via URL params", async ({ page }) => {
    await page.goto("/kubernetes?technology=containers");
    await expect(page.locator("a[href^='/questions/kubernetes/']")).toHaveCount(1);

    await page.goto("/kubernetes?technology=nonexistent-tech");
    await expect(page.getByText("No questions match these filters yet.")).toBeVisible();
  });

  test("question card links navigate to the question page", async ({ page }) => {
    await page.goto("/aws");
    const link = page.locator("a[href^='/questions/aws/']").first();
    const href = await link.getAttribute("href");
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("related questions section links to another question page", async ({ page }) => {
    await page.goto(SAMPLE_QUESTION_PATH);
    await expect(page.getByRole("heading", { name: "Related Questions" })).toBeVisible();

    const relatedLink = page.locator('section[aria-labelledby="related-questions-heading"] a').first();
    const targetHref = await relatedLink.getAttribute("href");
    await relatedLink.click();
    await expect(page).toHaveURL(new RegExp(`${targetHref!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
  });

  test("SEO metadata exists on a question page", async ({ page }) => {
    await page.goto(SAMPLE_QUESTION_PATH);

    await expect(page).toHaveTitle(/AdministratorAccess/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{20,}/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${SAMPLE_QUESTION_PATH}$`),
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);

    const jsonLdCount = await page.locator('script[type="application/ld+json"]').count();
    expect(jsonLdCount).toBeGreaterThanOrEqual(2); // BreadcrumbList + QAPage
  });

  test("sitemap.xml and robots.txt exist and are well-formed", async ({ request }) => {
    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);
    const sitemapBody = await sitemapRes.text();
    expect(sitemapBody).toContain("<urlset");
    expect(sitemapBody).toContain(SAMPLE_QUESTION_PATH);

    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);
    expect(await robotsRes.text()).toContain("Sitemap:");
  });

  test("no console errors across the key pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    for (const path of ["/", "/aws", SAMPLE_QUESTION_PATH, "/search", "/technologies/kubernetes", "/difficulty/advanced"]) {
      await page.goto(path, { waitUntil: "networkidle" });
    }
    expect(errors).toEqual([]);
  });

  test("layout has no horizontal overflow at the current viewport", async ({ page }) => {
    await page.goto("/");
    const [scrollWidth, viewportWidth] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      window.innerWidth,
    ]);
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});

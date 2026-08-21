import { expect, test } from "@playwright/test";

const SAMPLE_QUESTION_PATH = "/questions/aws/iam/migrating-ec2-admin-user-to-least-privilege-role";

test.describe("DevOps Interview Knowledge Base", () => {
  test("homepage loads", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    page.on("pageerror", (e) => consoleErrors.push(String(e)));

    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "DevOps Interview Knowledge Base" })).toBeVisible();
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
    const results = page.locator("main a.group");
    await expect(results.first()).toBeVisible();
    // A known Kubernetes question should always be among the matches, regardless of how many others exist.
    await expect(
      page.locator('a[href="/questions/kubernetes/troubleshooting/pod-stuck-crashloopbackoff-after-config-change"]'),
    ).toBeVisible();
  });

  test("difficulty filter narrows a category page via URL params", async ({ page }) => {
    await page.goto("/aws");
    const totalCount = await page.locator("a[href^='/questions/aws/']").count();
    expect(totalCount).toBeGreaterThan(0);

    await page.goto("/aws?difficulty=advanced");
    const filteredCount = await page.locator("a[href^='/questions/aws/']").count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(totalCount);
  });

  test("technology filter narrows a category page via URL params", async ({ page }) => {
    await page.goto("/kubernetes");
    const totalCount = await page.locator("a[href^='/questions/kubernetes/']").count();
    expect(totalCount).toBeGreaterThan(0);

    await page.goto("/kubernetes?technology=containers");
    const filteredCount = await page.locator("a[href^='/questions/kubernetes/']").count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(totalCount);

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

  test("practice mode reveals the answer, marks progress, and advances", async ({ page }) => {
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: "Practice" })).toBeVisible();

    const card = page.locator("p.text-lg.font-medium");
    await expect(card).toBeVisible();

    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await expect(page.getByRole("link", { name: "View full explanation →" })).toBeVisible();

    await page.getByRole("button", { name: "Got it" }).click();
    await expect(page.getByRole("button", { name: "Reveal Answer" })).toBeVisible();
    await expect(page.getByText(/1 known/)).toBeVisible();
  });

  test("practice mode category filter narrows the pool", async ({ page }) => {
    await page.goto("/practice");
    await page.getByRole("combobox").first().selectOption({ label: "AWS" });
    await expect(page.getByText(/Card 1 of \d+/)).toBeVisible();
  });

  test("practice mode shows a completion state instead of silently looping", async ({ page }) => {
    await page.goto("/practice");
    // Helm has exactly one question in the corpus, giving a deterministic single-card pool.
    await page.getByRole("combobox").first().selectOption({ label: "Helm" });
    await expect(page.getByText("Card 1 of 1")).toBeVisible();

    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await page.getByRole("button", { name: "Need Review" }).click();

    await expect(page.getByText("You've gone through this set.")).toBeVisible();
    await expect(page.getByText(/1 need review/)).toBeVisible();

    await page.getByRole("button", { name: "Practice Again" }).click();
    await expect(page.getByRole("button", { name: "Reveal Answer" })).toBeVisible();
  });

  test("progress persists across a reload via localStorage", async ({ page }) => {
    await page.goto("/practice");
    await page.getByRole("combobox").first().selectOption({ label: "Helm" });
    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await page.getByRole("button", { name: "Got it" }).click();

    await page.reload();
    await page.getByRole("combobox").first().selectOption({ label: "Helm" });
    await expect(page.getByText("Last marked: Got it")).toBeVisible();

    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Reset progress" }).click();
    await page.reload();
    await page.getByRole("combobox").first().selectOption({ label: "Helm" });
    await expect(page.getByText("Last marked:")).toHaveCount(0);
  });

  test("practice mode filters are reflected in the URL and shareable via direct navigation", async ({ page }) => {
    await page.goto("/practice");
    await page.getByRole("combobox").first().selectOption({ label: "AWS" });
    await expect(page).toHaveURL(/[?&]category=aws/);

    await page.goto("/practice?category=aws");
    await expect(page.getByRole("combobox").first()).toHaveValue("aws");
    await expect(page.getByText(/Card 1 of \d+/)).toBeVisible();
  });

  test("review only toggle narrows the pool to cards marked for review", async ({ page }) => {
    await page.goto("/practice");
    await page.getByRole("combobox").first().selectOption({ label: "Helm" });
    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await page.getByRole("button", { name: "Need Review" }).click();

    await page.getByRole("checkbox", { name: "Review only" }).click();
    await expect(page.getByRole("checkbox", { name: "Review only" })).toBeChecked();
    await expect(page).toHaveURL(/[?&]review=1/);
    await expect(page.getByText("Card 1 of 1")).toBeVisible();

    await page.getByRole("combobox").first().selectOption({ label: "AWS" });
    await expect(page.getByText("Nothing marked for review with these filters.")).toBeVisible();
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

    for (const path of ["/", "/aws", SAMPLE_QUESTION_PATH, "/search", "/technologies/kubernetes", "/difficulty/advanced", "/practice", "/contact"]) {
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

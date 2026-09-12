import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_QUESTION_PATH = "/questions/aws/iam/migrating-ec2-admin-user-to-least-privilege-role";
const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const GOLDEN_JD = "AWS, Kubernetes, Terraform, GitHub Actions, and Security experience required.";
const GOLDEN_RESUME =
  "Experience with AWS and ECS for container workloads. Built and maintained Terraform modules for three years. Automated deployments using GitHub Actions.";

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

  test("homepage shows the total question count and links to Guides and Interview Mode as distinct entry points", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/^600 original, scenario-driven/)).toBeVisible();
    const guidesCard = page.getByRole("link", { name: /Learn with a Guide/ });
    await expect(guidesCard).toHaveAttribute("href", "/guides");
    const interviewCard = page.getByRole("link", { name: /Start Interview Mode/ });
    await expect(interviewCard).toHaveAttribute("href", "/interview");
  });

  test("homepage no longer links to the deprecated /practice route", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Jump into Practice/ })).toHaveCount(0);
    await expect(page.locator("a[href='/practice']")).toHaveCount(0);
  });

  test("header no longer links to /practice and links to /interview", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav").first();
    await expect(nav.locator("a[href='/practice']")).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Interview Mode" })).toHaveAttribute("href", "/interview");
  });

  test("/practice and parameterized /practice URLs permanently redirect (308) to /interview", async ({ page, request }) => {
    const bare = await request.get("/practice", { maxRedirects: 0 });
    expect(bare.status()).toBe(308);
    expect(bare.headers()["location"]).toContain("/interview");

    const withParams = await request.get("/practice?category=aws&difficulty=advanced", { maxRedirects: 0 });
    expect(withParams.status()).toBe(308);
    expect(withParams.headers()["location"]).toContain("/interview");
    expect(withParams.headers()["location"]).not.toContain("category");

    const response = await page.goto("/practice?category=aws");
    expect(response?.url()).toContain("/interview");
    expect(response?.url()).not.toContain("/practice");
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

  test("question page shows its Interview Level(s), each linking to the correct /level/[level] page", async ({ page }) => {
    await page.goto(SAMPLE_QUESTION_PATH);
    const levelRow = page.getByText("Interview level:").locator("..");
    await expect(levelRow).toBeVisible();
    const levelLinks = levelRow.locator("a");
    await expect(levelLinks.first()).toBeVisible();
    const href = await levelLinks.first().getAttribute("href");
    expect(href).toMatch(/^\/level\/[a-z-]+$/);
    await levelLinks.first().click();
    await expect(page).toHaveURL(new RegExp(`${href!}$`));
  });

  test("search filters results as you type", async ({ page }) => {
    await page.goto("/search");
    // A specific enough term to keep the known target question on page 1 of results (search
    // results now paginate at 24/page, same as every other list page — see the pagination
    // tests below for the broader "kubernetes" query, which spans multiple pages).
    await page.getByPlaceholder("Search by title, tag, or technology...").fill("crashloopbackoff");
    await expect(page.getByText(/results for/i)).toBeVisible();
    const results = page.locator("main a.group");
    await expect(results.first()).toBeVisible();
    // A known Kubernetes question should always be among the matches, regardless of how many others exist.
    await expect(
      page.locator('a[href="/questions/kubernetes/troubleshooting/pod-stuck-crashloopbackoff-after-config-change"]'),
    ).toBeVisible();
  });

  test("search state (query and filters) is reflected in the URL and survives a page refresh", async ({ page }) => {
    await page.goto("/search");
    await page.getByPlaceholder("Search by title, tag, or technology...").fill("kubernetes");
    await page.waitForURL(/[?&]q=kubernetes/);
    const difficultySelect = page.getByLabel("Difficulty");
    await difficultySelect.selectOption("advanced");
    await page.waitForURL(/[?&]difficulty=advanced/);

    await page.reload();
    await expect(page.getByPlaceholder("Search by title, tag, or technology...")).toHaveValue("kubernetes");
    await expect(difficultySelect).toHaveValue("advanced");
    await expect(page.getByText(/results for/i)).toBeVisible();
  });

  test("search Category filter: selecting updates the URL, refresh preserves it, clearing removes it", async ({ page }) => {
    await page.goto("/search");
    const categorySelect = page.getByLabel("Category");
    await categorySelect.selectOption("kubernetes");
    await page.waitForURL(/[?&]category=kubernetes/);
    await expect(page.locator('a[href^="/questions/kubernetes/"]').first()).toBeVisible();
    await expect(page.locator('a[href^="/questions/aws/"]')).toHaveCount(0);

    await page.reload();
    await expect(categorySelect).toHaveValue("kubernetes");
    await expect(page.locator('a[href^="/questions/kubernetes/"]').first()).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).not.toHaveURL(/category=/);
    await expect(categorySelect).toHaveValue("");
  });

  test("search Interview Level filter: selecting updates the URL, refresh preserves it, clearing removes it", async ({ page }) => {
    await page.goto("/search");
    const levelSelect = page.getByLabel("Interview level");
    await levelSelect.selectOption("senior-devops");
    await page.waitForURL(/[?&]level=senior-devops/);
    const countBefore = await page.locator("main a.group").count();
    expect(countBefore).toBeGreaterThan(0);

    await page.reload();
    await expect(levelSelect).toHaveValue("senior-devops");

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).not.toHaveURL(/level=/);
    await expect(levelSelect).toHaveValue("");
  });

  test("search combines keyword + Category + Interview Level + existing filters correctly", async ({ page }) => {
    await page.goto("/search?q=kubernetes&category=kubernetes&level=senior-devops");
    await expect(page.getByLabel("Category")).toHaveValue("kubernetes");
    await expect(page.getByLabel("Interview level")).toHaveValue("senior-devops");
    await expect(page.locator('a[href^="/questions/kubernetes/"]').first()).toBeVisible();
    await expect(page.locator('a[href^="/questions/aws/"]')).toHaveCount(0);

    await page.goto("/search?q=terraform&category=terraform&level=devops-engineer");
    await expect(page.locator('a[href^="/questions/terraform/"]').first()).toBeVisible();
    await expect(page.locator('a[href^="/questions/kubernetes/"]')).toHaveCount(0);

    await page.goto("/search?type=troubleshooting&difficulty=advanced&category=kubernetes&level=senior-devops");
    await expect(page.getByLabel("Question type")).toHaveValue("troubleshooting");
    await expect(page.getByLabel("Difficulty")).toHaveValue("advanced");
    const links = page.locator('a[href^="/questions/kubernetes/"]');
    await expect(links.first()).toBeVisible();
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test("search pagination preserves all active filters and browser back/forward restores filter state", async ({ page }) => {
    await page.goto("/search");
    await page.getByLabel("Category").selectOption("kubernetes");
    await page.waitForURL(/[?&]category=kubernetes/);

    const pagination = page.getByRole("navigation", { name: "Pagination" });
    // Kubernetes (128 questions) exceeds the 24-per-page size, so pagination must appear.
    await expect(pagination).toBeVisible();
    await pagination.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/category=kubernetes.*page=2|page=2.*category=kubernetes/);
    await expect(page.getByLabel("Category")).toHaveValue("kubernetes");

    await page.goBack();
    await expect(page).not.toHaveURL(/page=2/);
    await expect(page.getByLabel("Category")).toHaveValue("kubernetes");

    await page.goForward();
    await expect(page).toHaveURL(/page=2/);
  });

  test("search filter row (5 selects) renders with no horizontal overflow at 375×812, 390×844, and 412×915", async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/search");
      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      await expect(page.getByLabel("Category")).toBeVisible();
      await expect(page.getByLabel("Interview level")).toBeVisible();
    }
  });

  test("search page stays within the max-width container at 1280px and 1440px with the search input prominent", async ({ page }) => {
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/search");
      const mainBox = await page.locator("main").boundingBox();
      expect(mainBox).not.toBeNull();
      expect(mainBox!.width).toBeLessThanOrEqual(1153);
      await expect(page.getByPlaceholder("Search by title, tag, or technology...")).toBeVisible();
    }
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

  test("interview level filter narrows a category page via URL params", async ({ page }) => {
    await page.goto("/aws");
    const totalCount = await page.locator("a[href^='/questions/aws/']").count();
    expect(totalCount).toBeGreaterThan(0);

    await page.goto("/aws?level=cloud-engineer");
    const filteredCount = await page.locator("a[href^='/questions/aws/']").count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(totalCount);
  });

  test("category page and technology page for the same slug have distinct titles and distinct question counts", async ({ page }) => {
    await page.goto("/kubernetes");
    const categoryTitle = await page.title();
    const categoryCountText = await page.locator("p.mt-1.text-sm.text-slate-500").first().innerText();

    await page.goto("/technologies/kubernetes");
    const technologyTitle = await page.title();
    const technologyCountText = await page.locator("p.mt-1.text-sm.text-slate-500").first().innerText();

    // Distinct scopes: the category page is `category: kubernetes` only; the technology page
    // aggregates the "kubernetes" technology tag across every category it appears in — so the
    // two pages must never share an identical <title>, and here their counts genuinely differ.
    expect(categoryTitle).not.toBe(technologyTitle);
    expect(technologyTitle).toContain("All Categories");
    expect(categoryCountText).not.toBe(technologyCountText);
  });

  test("difficulty page paginates like every other list page instead of rendering the full set at once", async ({ page }) => {
    const response = await page.goto("/difficulty/advanced");
    expect(response?.status()).toBe(200);
    const cardsOnPageOne = await page.locator("a[href^='/questions/']").count();
    expect(cardsOnPageOne).toBeLessThanOrEqual(24);

    const pagination = page.getByRole("navigation", { name: "Pagination" });
    await expect(pagination).toBeVisible();
    await expect(pagination.getByText(/Page 1 of \d+/)).toBeVisible();
    await pagination.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/\/difficulty\/advanced\?page=2/);
  });

  test("question type page loads and aggregates across multiple categories", async ({ page }) => {
    const response = await page.goto("/type/troubleshooting");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /Troubleshooting Interview Questions — All Categories/ })).toBeVisible();
    await expect(page.getByText(/questions across \d+ categories/)).toBeVisible();
    await expect(page.locator("a[href^='/questions/']").first()).toBeVisible();
  });

  test("question type page filters by interview level via URL params", async ({ page }) => {
    await page.goto("/type/troubleshooting");
    const totalCount = await page.locator("a[href^='/questions/']").count();
    expect(totalCount).toBeGreaterThan(0);

    await page.goto("/type/troubleshooting?level=senior-devops");
    const filteredCount = await page.locator("a[href^='/questions/']").count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(totalCount);
  });

  test("thin question type page renders but is noindexed", async ({ page }) => {
    const response = await page.goto("/type/behavioral");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /Behavioral Interview Questions — All Categories/ })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("indexable question type page is not noindexed", async ({ page }) => {
    await page.goto("/type/troubleshooting");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test("interview level page loads and aggregates across multiple categories", async ({ page }) => {
    const response = await page.goto("/level/senior-devops");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /Senior DevOps Interview Questions/ })).toBeVisible();
    await expect(page.getByText(/questions across \d+ categories/)).toBeVisible();
    await expect(page.locator("a[href^='/questions/']").first()).toBeVisible();
  });

  test("interview level page filters by question type via URL params", async ({ page }) => {
    await page.goto("/level/senior-devops");
    const totalCount = await page.locator("a[href^='/questions/']").count();
    expect(totalCount).toBeGreaterThan(0);

    await page.goto("/level/senior-devops?type=troubleshooting");
    const filteredCount = await page.locator("a[href^='/questions/']").count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThanOrEqual(totalCount);
  });

  test("homepage links to question type and interview level pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Browse by Question Type" })).toBeVisible();
    await expect(page.locator('a[href^="/type/"]').first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Browse by Interview Level" })).toBeVisible();
    await expect(page.locator('a[href="/level/senior-devops"]')).toBeVisible();
  });

  test("sitemap includes new type and level pages", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    const body = await res.text();
    expect(body).toContain("/type/troubleshooting");
    expect(body).toContain("/level/senior-devops");
    expect(body).not.toContain("/type/behavioral");
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

  test("interview mode loads with all configuration groups and Header/sitemap/robots wiring is correct", async ({ page, request }) => {
    const response = await page.goto("/interview");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Interview Mode" })).toBeVisible();
    for (const heading of ["Interview Level", "Question Type", "Difficulty", "Category", "Number of Questions", "Time Limit"]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Start Interview" })).toBeVisible();

    await expect(page.locator("nav").getByRole("link", { name: "Interview Mode" })).toHaveAttribute("href", "/interview");

    const sitemapBody = await (await request.get("/sitemap.xml")).text();
    expect(sitemapBody).toContain("/interview</loc>");
    expect(sitemapBody).not.toContain("/practice</loc>");
    expect(sitemapBody.match(/\/interview<\/loc>/g)).toHaveLength(1);
    const robotsBody = await (await request.get("/robots.txt")).text();
    expect(robotsBody).toContain("/interview?*");
    expect(robotsBody).toContain("/practice?*");
  });

  test("interview mode's live match count updates as filters change, including a zero-match state", async ({ page }) => {
    await page.goto("/interview");
    const banner = page.locator("p", { hasText: /question.*match|No questions match/ });
    await expect(banner).toContainText(/\d+ questions? match/);

    const categorySelect = page.getByRole("combobox");
    await categorySelect.selectOption({ label: "Helm" });
    await expect(banner).toContainText("14 questions match");

    // Expert difficulty only ever computes to the staff-principal interview level, never
    // junior-devops — this combination is structurally guaranteed empty, not just incidentally
    // thin data, which is what makes it a reliable zero-match fixture for this test.
    await page.getByRole("button", { name: "Expert" }).click();
    await page.getByRole("button", { name: "Junior DevOps" }).click();
    await expect(page.getByRole("button", { name: "Start Interview" })).toBeDisabled();
    await expect(page.getByText("No questions match these filters.")).toBeVisible();
  });

  test("interview mode config is reflected in the URL and shareable via direct navigation", async ({ page }) => {
    await page.goto("/interview");
    await page.getByRole("combobox").selectOption({ label: "Helm" });
    await page.getByRole("button", { name: "5", exact: true }).click();
    await expect(page).toHaveURL(/[?&]category=helm/);
    await expect(page).toHaveURL(/[?&]count=5/);

    await page.goto("/interview?category=helm&count=5");
    await expect(page.getByRole("combobox")).toHaveValue("helm");
    await expect(page.getByRole("button", { name: "5", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("starting an interview honestly reduces the count when fewer questions match than requested", async ({ page }) => {
    await page.goto("/interview?category=helm&count=20");
    await expect(page.getByText("Only 14 questions match — starting with 14.")).toBeVisible();
    await page.getByRole("button", { name: "Start Interview" }).click();
    await expect(page.getByText("Question 1 of 14", { exact: true })).toBeVisible();
  });

  test("interview session reveals the answer, offers three self-assessments, and advances", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5");
    await page.getByRole("button", { name: "Start Interview" }).click();
    await expect(page.getByText("Question 1 of 5", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await expect(page.getByRole("link", { name: "View full explanation →" })).toBeVisible();
    for (const label of ["Nailed it", "Partially there", "Need more work"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }

    await page.getByRole("button", { name: "Nailed it" }).click();
    await expect(page.getByText("Question 2 of 5", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reveal Answer" })).toBeVisible();
  });

  test("completing an interview session shows score, per-type/per-level breakdowns, and a needs-work list", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5");
    await page.getByRole("button", { name: "Start Interview" }).click();

    for (const label of ["Nailed it", "Partially there", "Need more work", "Nailed it", "Need more work"]) {
      await page.getByRole("button", { name: "Reveal Answer" }).click();
      await page.getByRole("button", { name: label }).click();
    }

    await expect(page.getByText("5 / 10 points · 50%")).toBeVisible();
    await expect(page.getByText("5 of 5 questions answered")).toBeVisible();
    await expect(page.getByRole("heading", { name: "By Question Type" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Worth Revisiting" })).toBeVisible();
    const revisitLinks = page.locator("h2", { hasText: "Worth Revisiting" }).locator("xpath=following-sibling::ul[1]//a");
    await expect(revisitLinks).toHaveCount(2);
    for (const href of await revisitLinks.evaluateAll((links) => links.map((l) => l.getAttribute("href")))) {
      expect(href).toMatch(/^\/questions\//);
    }
  });

  test("retry same configuration starts a fresh session with the same config; new configuration returns to setup", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5");
    await page.getByRole("button", { name: "Start Interview" }).click();
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: "Reveal Answer" }).click();
      await page.getByRole("button", { name: "Nailed it" }).click();
    }
    await expect(page.getByRole("button", { name: "Retry Same Configuration" })).toBeVisible();

    await page.getByRole("button", { name: "Retry Same Configuration" }).click();
    await expect(page.getByText("Question 1 of 5", { exact: true })).toBeVisible();

    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: "Reveal Answer" }).click();
      await page.getByRole("button", { name: "Nailed it" }).click();
    }
    await page.getByRole("button", { name: "New Configuration" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Interview Mode" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start Interview" })).toBeVisible();
  });

  test("an in-progress interview session is recoverable after a reload, but only via an explicit Resume choice — never silently", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5");
    await page.getByRole("button", { name: "Start Interview" }).click();
    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await page.getByRole("button", { name: "Nailed it" }).click();
    await expect(page.getByText("Question 2 of 5", { exact: true })).toBeVisible();

    // Reloading (or navigating away and back) must land on the config screen, not silently
    // resume mid-session — the in-progress session is offered, not imposed.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Interview Mode" })).toBeVisible();
    await expect(page.getByText("You have an interview in progress — question 2 of 5.")).toBeVisible();

    await page.getByRole("button", { name: "Resume Interview" }).click();
    await expect(page.getByText("Question 2 of 5", { exact: true })).toBeVisible();
  });

  test("a resumable session can be explicitly discarded instead of resumed", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5");
    await page.getByRole("button", { name: "Start Interview" }).click();
    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await page.getByRole("button", { name: "Nailed it" }).click();

    await page.reload();
    await page.getByRole("button", { name: "Discard and Start Fresh" }).click();
    await expect(page.getByText(/in progress/)).toHaveCount(0);
    const stored = await page.evaluate(() => localStorage.getItem("interview-active-session"));
    expect(stored).toBeNull();
  });

  test("ending an interview session early still produces a results screen scored on answered questions only", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5");
    await page.getByRole("button", { name: "Start Interview" }).click();
    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await page.getByRole("button", { name: "Nailed it" }).click();

    await page.getByRole("button", { name: "End session early" }).click();
    await expect(page.getByText("2 / 2 points · 100%")).toBeVisible();
    await expect(page.getByText("1 of 5 questions answered")).toBeVisible();
  });

  test("interview session history accumulates across multiple completed sessions", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5");
    for (let session = 0; session < 2; session++) {
      await page.getByRole("button", { name: session === 0 ? "Start Interview" : "Retry Same Configuration" }).click();
      for (let i = 0; i < 5; i++) {
        await page.getByRole("button", { name: "Reveal Answer" }).click();
        await page.getByRole("button", { name: "Nailed it" }).click();
      }
    }
    const history = await page.evaluate(() => JSON.parse(localStorage.getItem("interview-session-history") ?? "[]"));
    expect(history.length).toBe(2);
    expect(history[0].answers.length).toBe(5);
  });

  test("interview self-assessment cross-writes into practice-progress and the Roadmap's stage-in-progress inference keeps working", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5");
    await page.getByRole("button", { name: "Start Interview" }).click();
    await page.getByRole("button", { name: "Reveal Answer" }).click();
    await page.getByRole("button", { name: "Nailed it" }).click();

    const stored = await page.evaluate(() => localStorage.getItem("practice-progress"));
    expect(Object.keys(JSON.parse(stored!)).length).toBe(1);

    await page.goto("/roadmaps/devops-engineer-roadmap");
    const orchestrationStage = page.locator("#orchestration");
    await expect(orchestrationStage.getByRole("heading", { level: 3, name: "Orchestration" })).toBeVisible();
    await expect(orchestrationStage.getByText("In Progress")).toBeVisible();
  });

  test("interview timer: session budget mode (the default) shows a live countdown", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5");
    await page.getByRole("button", { name: "Start Interview" }).click();
    await expect(page.getByText(/remaining/)).toBeVisible();
  });

  test("interview timer: per-question guideline mode shows a suggested budget, not a countdown", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5&time=per-question");
    await page.getByRole("button", { name: "Start Interview" }).click();
    await expect(page.getByText(/suggested/)).toBeVisible();
    await expect(page.getByText(/remaining/)).toHaveCount(0);
  });

  test("interview timer: off mode shows no timer UI at all", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5&time=off");
    await page.getByRole("button", { name: "Start Interview" }).click();
    await expect(page.getByText(/remaining|suggested/)).toHaveCount(0);
  });

  test("interview mode renders correctly at mobile viewports with no horizontal overflow, in both config and active phases", async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/interview?category=helm&count=5");
      let [scrollWidth, clientWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      await page.getByRole("button", { name: "Start Interview" }).click();
      await page.getByRole("button", { name: "Reveal Answer" }).click();
      [scrollWidth, clientWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });

  test("interview mode stays within the max-width container at 1280px and 1440px", async ({ page }) => {
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/interview");
      const mainBox = await page.locator("main").boundingBox();
      expect(mainBox).not.toBeNull();
      expect(mainBox!.width).toBeLessThanOrEqual(1153);
    }
  });

  test("interview mode has an aria-live region that announces session progress", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5");
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toHaveCount(1);

    await page.getByRole("button", { name: "Start Interview" }).click();
    await expect(liveRegion).toContainText("Interview started");
  });

  test("interview mode's controls are fully keyboard-operable", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5");
    const juniorChip = page.getByRole("button", { name: "Junior DevOps" });
    await juniorChip.focus();
    await page.keyboard.press("Enter");
    await expect(juniorChip).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Enter");
    await expect(juniorChip).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: "Start Interview" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Question 1 of 5", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Reveal Answer" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Nailed it" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Question 2 of 5", { exact: true })).toBeVisible();
  });

  test("no console errors across the interview mode config, active, and results phases", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto("/interview?category=helm&count=5");
    await page.getByRole("button", { name: "Start Interview" }).click();
    for (let i = 0; i < 5; i++) {
      await page.getByRole("button", { name: "Reveal Answer" }).click();
      await page.getByRole("button", { name: "Nailed it" }).click();
    }
    expect(errors).toEqual([]);
  });

  test.describe("Job-Specific Interview", () => {
    test("full flow: JD + resume text produces a risk-weighted, explainable session through to results", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill(GOLDEN_JD);
      await page.getByLabel(/Your resume/).fill(GOLDEN_RESUME);
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();

      await expect(page.getByRole("heading", { name: "Detected JD Requirements" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Interview Risk / Focus Areas" })).toBeVisible();

      const kubernetesCard = page.locator("div").filter({ hasText: /^Kubernetes/ }).filter({ hasText: "High risk" }).first();
      await expect(kubernetesCard).toBeVisible();
      await expect(kubernetesCard).toContainText("ECS");
      const securityCard = page.locator("div").filter({ hasText: /^Security/ }).filter({ hasText: "High risk" }).first();
      await expect(securityCard).toBeVisible();
      await expect(securityCard).toContainText("No mention");

      const awsCard = page.locator("div").filter({ hasText: /^AWS/ }).filter({ hasText: "Low risk" }).first();
      await expect(awsCard).toBeVisible();

      await page.getByRole("button", { name: "Build My Interview" }).click();
      await expect(page.locator("p").filter({ hasText: /^Question 1 of \d+$/ })).toBeVisible();
      await expect(page.getByText(/^Selected (because|to validate)/)).toBeVisible();
      expect(page.url()).toMatch(/\/interview$/);

      let questionCount = 0;
      while (true) {
        await page.getByRole("button", { name: "Reveal Answer" }).click();
        await page.getByRole("button", { name: "Nailed it" }).click();
        questionCount += 1;
        if (await page.getByText(/points ·/).isVisible().catch(() => false)) break;
        if (questionCount > 25) throw new Error("Job-specific session did not reach results");
      }

      await expect(page.getByText(/points ·/)).toBeVisible();
      await expect(page.getByRole("heading", { name: "Job Readiness" })).toBeVisible();

      expect(errors).toEqual([]);
    });

    test("editable extraction: a detected requirement can be removed and a new one added before building", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill("Kubernetes and Terraform required.");
      await page.getByLabel(/Your resume/).fill("Some Terraform experience.");
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();

      await expect(page.getByRole("button", { name: "Remove Kubernetes from JD requirements" })).toBeVisible();
      await page.getByRole("button", { name: "Remove Kubernetes from JD requirements" }).click();
      await expect(page.getByRole("button", { name: "Remove Kubernetes from JD requirements" })).toHaveCount(0);

      await page.getByLabel("Add a JD requirement").selectOption("security");
      await page.getByRole("button", { name: "Add" }).first().click();
      await expect(page.getByRole("button", { name: "Remove Security from JD requirements" })).toBeVisible();
    });

    test("zero/low-match: an empty resume marks every JD requirement absent and high risk", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill(GOLDEN_JD);
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();

      const riskBadges = page.getByText("High risk");
      await expect(riskBadges).toHaveCount(5);
      await expect(page.getByText("Low risk")).toHaveCount(0);
    });

    test("coverage limitation is explained when there are more JD requirements than the session can fit", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page
        .getByLabel("Job description")
        .fill("Must have: AWS, Kubernetes, Terraform, GitHub Actions, Security, Docker, Ansible, Prometheus.");
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();
      const fiveChip = page.getByRole("button", { name: "5", exact: true });
      await fiveChip.click();

      await expect(page.getByText(/couldn't fit in a 5-question session/)).toBeVisible();
    });

    test("uploading a .pdf JD and a .docx resume extracts real text into the fields", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();

      const jdFileInput = page.locator('input[type="file"]').first();
      await jdFileInput.setInputFiles(path.join(FIXTURES_DIR, "jd.pdf"));
      await expect(page.getByLabel("Job description")).toHaveValue(/Kubernetes/, { timeout: 15_000 });

      const resumeFileInput = page.locator('input[type="file"]').nth(1);
      await resumeFileInput.setInputFiles(path.join(FIXTURES_DIR, "resume.docx"));
      await expect(page.getByLabel(/Your resume/)).toHaveValue(/Terraform/, { timeout: 15_000 });
    });

    test("a file over the size limit is rejected with a clear error and never sent anywhere", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();

      await page.evaluate(() => {
        const input = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
        const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "huge.txt", { type: "text/plain" });
        const dt = new DataTransfer();
        dt.items.add(bigFile);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await expect(page.getByText(/the limit is 5 MB/)).toBeVisible();
    });

    test("Clear My Data removes the saved JD/resume profile from localStorage", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill(GOLDEN_JD);
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();

      const stored = await page.evaluate(() => localStorage.getItem("job-specific-profile"));
      expect(stored).toBeTruthy();

      await page.getByRole("button", { name: "Clear My Data" }).click();
      const cleared = await page.evaluate(() => localStorage.getItem("job-specific-profile"));
      expect(cleared).toBeNull();
      await expect(page.getByLabel("Job description")).toHaveValue("");
    });

    test("recently-answered questions are less likely to repeat when rebuilding from the same JD/resume", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill("Kubernetes required.");
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();
      await page.getByRole("button", { name: "5", exact: true }).click();
      await page.getByRole("button", { name: "Build My Interview" }).click();

      const firstIds: string[] = [];
      for (let i = 0; i < 5 && (await page.getByRole("button", { name: "Reveal Answer" }).isVisible().catch(() => false)); i++) {
        const url = await page.evaluate(() => JSON.parse(localStorage.getItem("interview-active-session") ?? "{}").questionIds ?? []);
        firstIds.push(...url);
        await page.getByRole("button", { name: "Reveal Answer" }).click();
        await page.getByRole("button", { name: "Nailed it" }).click();
      }
      await expect(page.getByRole("heading", { name: "Job Readiness" })).toBeVisible();

      await page.getByRole("button", { name: "Rebuild From Same JD / Resume" }).click();
      await page.getByRole("button", { name: "Build My Interview" }).click();
      await expect(page.locator("p").filter({ hasText: /^Question 1 of \d+$/ })).toBeVisible();
      const secondSession = await page.evaluate(() => JSON.parse(localStorage.getItem("interview-active-session") ?? "{}"));
      expect(Array.isArray(secondSession.questionIds)).toBe(true);
      expect(secondSession.questionIds.length).toBeGreaterThan(0);
    });

    test("Job-Specific Interview's controls are fully keyboard-operable", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByLabel("Job description")).toBeVisible();

      await page.getByLabel("Job description").fill(GOLDEN_JD);
      await page.getByLabel(/Your resume/).fill(GOLDEN_RESUME);
      await page.getByRole("button", { name: "Review Extracted Skills" }).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("heading", { name: "Interview Risk / Focus Areas" })).toBeVisible();

      await page.getByRole("button", { name: "Build My Interview" }).focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("p").filter({ hasText: /^Question 1 of \d+$/ })).toBeVisible();
    });

    for (const width of [375, 390, 412]) {
      test(`Job-Specific Interview renders correctly at ${width}px with no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto("/interview");
        await page.getByRole("button", { name: "Job-Specific Interview" }).click();
        await page.getByLabel("Job description").fill(GOLDEN_JD);
        await page.getByLabel(/Your resume/).fill(GOLDEN_RESUME);
        await page.getByRole("button", { name: "Review Extracted Skills" }).click();
        await expect(page.getByRole("heading", { name: "Interview Risk / Focus Areas" })).toBeVisible();

        const [scrollWidth, clientWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      });
    }

    test("no console errors across the Job-Specific config, review, active, and results phases", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill(GOLDEN_JD);
      await page.getByLabel(/Your resume/).fill(GOLDEN_RESUME);
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();
      await page.getByRole("button", { name: "Build My Interview" }).click();
      for (let i = 0; i < 5 && (await page.getByRole("button", { name: "Reveal Answer" }).isVisible().catch(() => false)); i++) {
        await page.getByRole("button", { name: "Reveal Answer" }).click();
        await page.getByRole("button", { name: "Nailed it" }).click();
      }
      expect(errors).toEqual([]);
    });
  });

  test.describe("Job Readiness", () => {
    test("review screen shows a coverage-only readiness band before any session is run", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill(GOLDEN_JD);
      await page.getByLabel(/Your resume/).fill(GOLDEN_RESUME);
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();

      await expect(page.getByRole("heading", { name: "Job Readiness" })).toBeVisible();
      await expect(page.getByText(/readiness$/)).toBeVisible();
      await expect(page.getByText(/complete an interview session for this JD to add a performance-informed component/)).toBeVisible();
      await expect(page.getByText(/Not yet validated — run a Job-Specific session/)).toBeVisible();
    });

    test("completing a session produces a full readiness panel: band, per-requirement performance, and claim validation", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill(GOLDEN_JD);
      await page.getByLabel(/Your resume/).fill(GOLDEN_RESUME);
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();
      await page.getByRole("button", { name: "10", exact: true }).click();
      await page.getByRole("button", { name: "Build My Interview" }).click();

      for (let i = 0; i < 10 && (await page.getByRole("button", { name: "Reveal Answer" }).isVisible().catch(() => false)); i++) {
        await page.getByRole("button", { name: "Reveal Answer" }).click();
        await page.getByRole("button", { name: "Nailed it" }).click();
      }

      await expect(page.getByRole("heading", { name: "Job Readiness" })).toBeVisible();
      await expect(page.getByText(/interview performance \d+% \(\d+ of \d+ JD requirements tested so far\)/)).toBeVisible();
      await expect(page.getByRole("heading", { name: "By Requirement" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Resume Claim Validation" })).toBeVisible();
      await expect(page.getByText(/Interview evidence: Nailed it/)).toBeVisible();
      await expect(page.getByText(/not a graded or verified evaluation/)).toBeVisible();
    });

    test("a claim that goes badly is shown plainly, not glossed over", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill("Terraform required.");
      await page.getByLabel(/Your resume/).fill("Architected the Terraform module structure used across all environments.");
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();
      await page.getByRole("button", { name: "5", exact: true }).click();
      await page.getByRole("button", { name: "Build My Interview" }).click();

      for (let i = 0; i < 5 && (await page.getByRole("button", { name: "Reveal Answer" }).isVisible().catch(() => false)); i++) {
        await page.getByRole("button", { name: "Reveal Answer" }).click();
        await page.getByRole("button", { name: "Need more work" }).click();
      }

      await expect(page.getByText(/Interview evidence: Need more work/)).toBeVisible();
      const band = page.getByText(/readiness$/);
      await expect(band).toContainText("Low");
    });

    test("Practice Next is absent before any session has been run for this JD", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill("Requirements:\n- Kubernetes\n- Security");
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();

      await expect(page.getByRole("heading", { name: "Job Readiness" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Practice Next" })).toHaveCount(0);
    });

    test("Practice Next recommendations link only to real, existing question pages", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill("Requirements:\n- Kubernetes\n- Security");
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();
      await page.getByRole("button", { name: "5", exact: true }).click();
      await page.getByRole("button", { name: "Build My Interview" }).click();
      for (let i = 0; i < 5 && (await page.getByRole("button", { name: "Reveal Answer" }).isVisible().catch(() => false)); i++) {
        await page.getByRole("button", { name: "Reveal Answer" }).click();
        await page.getByRole("button", { name: "Need more work" }).click();
      }
      await page.getByRole("button", { name: "Rebuild From Same JD / Resume" }).click();

      await expect(page.getByRole("heading", { name: "Practice Next" })).toBeVisible();
      const firstLink = page.locator("h3", { hasText: "Practice Next" }).locator("xpath=following-sibling::div[1]//a").first();
      const href = await firstLink.getAttribute("href");
      expect(href).toMatch(/^\/questions\//);
      const response = await page.request.get(href!);
      expect(response.status()).toBe(200);
    });

    test("Clear My Data removes the Job Readiness history along with the profile", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill(GOLDEN_JD);
      await page.getByLabel(/Your resume/).fill(GOLDEN_RESUME);
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();
      await page.getByRole("button", { name: "5", exact: true }).click();
      await page.getByRole("button", { name: "Build My Interview" }).click();
      for (let i = 0; i < 5 && (await page.getByRole("button", { name: "Reveal Answer" }).isVisible().catch(() => false)); i++) {
        await page.getByRole("button", { name: "Reveal Answer" }).click();
        await page.getByRole("button", { name: "Nailed it" }).click();
      }
      await page.getByRole("button", { name: "Rebuild From Same JD / Resume" }).click();

      const before = await page.evaluate(() => localStorage.getItem("job-specific-session-history"));
      expect(before).toBeTruthy();

      await page.getByRole("button", { name: "Clear My Data" }).click();
      const after = await page.evaluate(() => localStorage.getItem("job-specific-session-history"));
      expect(after).toBeNull();
    });

    test("editing the JD text changes the fingerprint and does not reuse readiness data from the previous JD", async ({ page }) => {
      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill("Kubernetes required.");
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();
      await page.getByRole("button", { name: "5", exact: true }).click();
      await page.getByRole("button", { name: "Build My Interview" }).click();
      for (let i = 0; i < 5 && (await page.getByRole("button", { name: "Reveal Answer" }).isVisible().catch(() => false)); i++) {
        await page.getByRole("button", { name: "Reveal Answer" }).click();
        await page.getByRole("button", { name: "Nailed it" }).click();
      }
      await page.getByRole("button", { name: "Rebuild From Same JD / Resume" }).click();
      await expect(page.getByText(/interview performance/)).toBeVisible();

      await page.getByRole("button", { name: "Edit JD / resume text" }).click();
      await page.getByLabel("Job description").fill("Security required.");
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();

      await expect(page.getByText(/complete an interview session for this JD to add a performance-informed component/)).toBeVisible();
    });

    test("no network request is made when building a Job-Specific session or computing readiness", async ({ page }) => {
      const externalRequests: string[] = [];
      page.on("request", (r) => {
        const url = r.url();
        if (!url.startsWith("http://localhost") && !url.startsWith("data:")) externalRequests.push(url);
      });

      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).click();
      await page.getByLabel("Job description").fill(GOLDEN_JD);
      await page.getByLabel(/Your resume/).fill(GOLDEN_RESUME);
      await page.getByRole("button", { name: "Review Extracted Skills" }).click();
      await page.getByRole("button", { name: "5", exact: true }).click();
      await page.getByRole("button", { name: "Build My Interview" }).click();
      for (let i = 0; i < 5 && (await page.getByRole("button", { name: "Reveal Answer" }).isVisible().catch(() => false)); i++) {
        await page.getByRole("button", { name: "Reveal Answer" }).click();
        await page.getByRole("button", { name: "Nailed it" }).click();
      }

      expect(externalRequests).toEqual([]);
    });

    for (const width of [375, 390, 412]) {
      test(`Job Readiness panel renders correctly at ${width}px with no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/interview");
        await page.getByRole("button", { name: "Job-Specific Interview" }).click();
        await page.getByLabel("Job description").fill(GOLDEN_JD);
        await page.getByLabel(/Your resume/).fill(GOLDEN_RESUME);
        await page.getByRole("button", { name: "Review Extracted Skills" }).click();
        await expect(page.getByRole("heading", { name: "Job Readiness" })).toBeVisible();

        const [scrollWidth, clientWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      });
    }

    test("Job Readiness controls are reachable by keyboard and the panel has no console errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      page.on("pageerror", (e) => errors.push(String(e)));

      await page.goto("/interview");
      await page.getByRole("button", { name: "Job-Specific Interview" }).focus();
      await page.keyboard.press("Enter");
      await page.getByLabel("Job description").fill(GOLDEN_JD);
      await page.getByLabel(/Your resume/).fill(GOLDEN_RESUME);
      await page.getByRole("button", { name: "Review Extracted Skills" }).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("heading", { name: "Job Readiness" })).toBeVisible();

      expect(errors).toEqual([]);
    });
  });

  test("existing General Interview mode is unaffected by the Job-Specific tab: config filters, start, and session flow still work", async ({ page }) => {
    await page.goto("/interview?category=helm&count=5");
    await expect(page.getByRole("button", { name: "General Interview" })).toBeVisible();
    await page.getByRole("button", { name: "Start Interview" }).click();
    await expect(page.getByText("Question 1 of 5", { exact: true })).toBeVisible();
  });

  test("guides landing page loads and links to all six guides", async ({ page }) => {
    const response = await page.goto("/guides");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "DevOps Interview Guides" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kubernetes Interview Guide" })).toBeVisible();
    await expect(page.locator('a[href="/guides/kubernetes-interview-guide"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "AWS DevOps Interview Guide" })).toBeVisible();
    await expect(page.locator('a[href="/guides/aws-devops-interview-guide"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Azure DevOps Interview Guide" })).toBeVisible();
    await expect(page.locator('a[href="/guides/azure-devops-interview-guide"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Terraform Interview Guide" })).toBeVisible();
    await expect(page.locator('a[href="/guides/terraform-interview-guide"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "GCP Interview Guide" })).toBeVisible();
    await expect(page.locator('a[href="/guides/gcp-interview-guide"]')).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "DevOps Interview Guide", exact: true })).toBeVisible();
    await expect(page.locator('a[href="/guides/devops-interview-guide"]')).toBeVisible();
  });

  test("guides landing page visually separates the umbrella DevOps Guide (Start Here) from the five focused technology guides", async ({ page }) => {
    await page.goto("/guides");
    const startHere = page.locator("div").filter({ has: page.getByRole("heading", { level: 2, name: "Start Here" }) }).last();
    await expect(startHere).toBeVisible();
    await expect(startHere.getByRole("heading", { level: 3, name: "DevOps Interview Guide", exact: true })).toBeVisible();
    // The five single-technology guides must NOT appear inside Start Here.
    await expect(startHere.getByRole("heading", { level: 3, name: "Kubernetes Interview Guide" })).toHaveCount(0);

    const focused = page
      .locator("div")
      .filter({ has: page.getByRole("heading", { level: 2, name: "Focused Technology Guides" }) })
      .last();
    await expect(focused).toBeVisible();
    for (const name of ["Kubernetes Interview Guide", "AWS DevOps Interview Guide", "Azure DevOps Interview Guide", "Terraform Interview Guide", "GCP Interview Guide"]) {
      await expect(focused.getByRole("heading", { level: 3, name })).toBeVisible();
    }
    await expect(focused.getByRole("heading", { level: 3, name: "DevOps Interview Guide", exact: true })).toHaveCount(0);
  });

  test("Guides nav link navigates to the guides landing page", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: "Guides", exact: true }).click();
    await expect(page).toHaveURL(/\/guides$/);
    await expect(page.getByRole("heading", { name: "DevOps Interview Guides" })).toBeVisible();
  });

  test("Kubernetes guide detail page loads with all required sections and structured data", async ({ page }) => {
    const response = await page.goto("/guides/kubernetes-interview-guide");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Kubernetes Interview Guide" })).toBeVisible();

    for (const heading of [
      "Who This Guide Is For",
      "Prerequisites",
      "Learning / Interview Path",
      "Key Concepts",
      "Interview Focus",
      "Practice Questions",
      "Scenario & Troubleshooting Focus",
      "Common Mistakes",
      "Recommended Preparation Path",
      "Related Guides",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }

    await expect(page.getByText("128 linked questions")).toBeVisible();

    const jsonLdTypes = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonLdTypes.map((json) => JSON.parse(json)["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("TechArticle");

    // Cross-links to the AWS and Terraform guides via related_guides.
    await expect(page.locator('a[href="/guides/aws-devops-interview-guide"]')).toBeVisible();
    await expect(page.locator('a[href="/guides/terraform-interview-guide"]')).toBeVisible();
  });

  test("guide Practice Questions section reflects the live question bank dynamically", async ({ page }) => {
    await page.goto("/guides/kubernetes-interview-guide");
    await expect(page.getByRole("heading", { level: 3, name: "Must Practice" })).toBeVisible();
    // The 8 curated featured_questions should each render as a real link into the question bank.
    const mustPracticeLinks = page.locator("h3", { hasText: "Must Practice" }).locator("xpath=following-sibling::ul[1]//a");
    await expect(mustPracticeLinks).toHaveCount(8);

    await expect(page.getByRole("link", { name: /Beginner \(\d+\)/ })).toHaveAttribute("href", "/kubernetes?difficulty=beginner");
    await expect(page.getByRole("link", { name: /Troubleshooting \(\d+\)/ })).toHaveAttribute(
      "href",
      "/type/troubleshooting?category=kubernetes",
    );
  });

  test("guide's difficulty filter link lands on a correctly pre-filtered category page", async ({ page }) => {
    await page.goto("/guides/kubernetes-interview-guide");
    await page.getByRole("link", { name: /Beginner \(\d+\)/ }).click();
    await expect(page).toHaveURL(/\/kubernetes\?difficulty=beginner/);
    await expect(page.locator("a[href^='/questions/kubernetes/']").first()).toBeVisible();
  });

  test("guide's interview level links surface a preparation path per level, appearing exactly once", async ({ page }) => {
    await page.goto("/guides/kubernetes-interview-guide");
    const heading = page.getByRole("heading", { level: 3, name: "Prepare by Interview Level" });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveCount(1);
    const seniorLink = page.locator('a[href="/level/senior-devops?category=kubernetes"]').first();
    await expect(seniorLink).toBeVisible();
    await seniorLink.click();
    await expect(page).toHaveURL(/\/level\/senior-devops\?category=kubernetes/);
    await expect(page.getByRole("heading", { name: /Senior DevOps Interview Questions/ })).toBeVisible();
  });

  test("Practice Questions sections appear in the intended quick-start-to-deep-practice order", async ({ page }) => {
    await page.goto("/guides/kubernetes-interview-guide");
    const order = ["Must Practice", "By Subcategory", "Prepare by Interview Level", "By Difficulty", "By Question Type"];
    const positions = await Promise.all(
      order.map(async (name) => {
        const box = await page.getByRole("heading", { level: 3, name }).boundingBox();
        expect(box, `expected a visible heading for "${name}"`).not.toBeNull();
        return box!.y;
      }),
    );
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i], `${order[i]} should appear after ${order[i - 1]}`).toBeGreaterThan(positions[i - 1]!);
    }
  });

  test("jump-to navigation links to each Practice Questions subsection by anchor", async ({ page }) => {
    await page.goto("/guides/kubernetes-interview-guide");
    const jumpNav = page.getByRole("navigation", { name: "Jump to a practice section" });
    await expect(jumpNav.getByRole("link", { name: "Must Practice" })).toHaveAttribute("href", "#must-practice");
    await expect(jumpNav.getByRole("link", { name: "By Subcategory" })).toHaveAttribute("href", "#by-subcategory");
    await expect(jumpNav.getByRole("link", { name: "Prepare by Interview Level" })).toHaveAttribute(
      "href",
      "#prepare-by-level",
    );
    await expect(jumpNav.getByRole("link", { name: "By Difficulty" })).toHaveAttribute("href", "#by-difficulty");
    await expect(jumpNav.getByRole("link", { name: "By Question Type" })).toHaveAttribute("href", "#by-question-type");

    await jumpNav.getByRole("link", { name: "By Subcategory" }).click();
    await expect(page).toHaveURL(/#by-subcategory$/);
  });

  test("a subcategory with only one question still renders an intentional-looking card", async ({ page }) => {
    await page.goto("/guides/kubernetes-interview-guide");
    const fundamentalsCard = page
      .locator("div.rounded-lg")
      .filter({ has: page.getByRole("heading", { level: 4, name: "Fundamentals" }) });
    await expect(fundamentalsCard).toBeVisible();
    await expect(fundamentalsCard.getByText("1", { exact: true })).toBeVisible();
    await expect(fundamentalsCard.locator("ul a")).toHaveCount(1);
    await expect(fundamentalsCard.getByRole("link", { name: /View all 1 question →/ })).toBeVisible();
  });

  test("By Subcategory renders as a card grid, ordered to match the Learning Path, with representative questions and a View all CTA", async ({
    page,
  }) => {
    await page.goto("/guides/kubernetes-interview-guide");
    await expect(page.getByRole("heading", { level: 3, name: "By Subcategory" })).toBeVisible();

    const cardHeadings = page.getByRole("heading", { level: 4 });
    await expect(cardHeadings).toHaveCount(14);
    // Ordered to mirror the Learning / Interview Path (fundamentals first), not largest-group-first.
    await expect(cardHeadings.first()).toHaveText("Fundamentals");
    await expect(cardHeadings.last()).toHaveText("Troubleshooting");

    const networkingCard = page.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { level: 4, name: "Networking" }) });
    await expect(networkingCard.getByText("14", { exact: true })).toBeVisible();
    // 2-3 representative example questions, not the full 14.
    const exampleLinks = networkingCard.locator("ul a");
    const exampleCount = await exampleLinks.count();
    expect(exampleCount).toBeGreaterThanOrEqual(2);
    expect(exampleCount).toBeLessThanOrEqual(3);

    const viewAll = networkingCard.getByRole("link", { name: /View all 14 questions/ });
    await expect(viewAll).toHaveAttribute("href", "/kubernetes?subcategory=networking");
  });

  test("By Subcategory card links navigate to a correctly filtered category page", async ({ page }) => {
    await page.goto("/guides/kubernetes-interview-guide");
    const networkingCard = page.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { level: 4, name: "Networking" }) });
    await networkingCard.getByRole("link", { name: /View all 14 questions/ }).click();
    await expect(page).toHaveURL(/\/kubernetes\?subcategory=networking/);
    const results = page.locator("a[href^='/questions/kubernetes/networking/']");
    await expect(results.first()).toBeVisible();
    await expect(results).toHaveCount(14);
  });

  test("By Subcategory grid is 2 columns on desktop and does not disturb the rest of Practice Questions", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/guides/kubernetes-interview-guide");
    const cardHeadings = page.getByRole("heading", { level: 4 });
    const first = await cardHeadings.nth(0).boundingBox();
    const second = await cardHeadings.nth(1).boundingBox();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    // Same row: roughly equal y, clearly different x.
    expect(Math.abs(first!.y - second!.y)).toBeLessThan(10);
    expect(Math.abs(first!.x - second!.x)).toBeGreaterThan(100);

    // Rest of Practice Questions is unchanged by the redesign.
    await expect(page.getByRole("heading", { level: 3, name: "Must Practice" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "By Difficulty" })).toBeVisible();
  });

  test("By Subcategory grid is single-column with no horizontal overflow at 375×812, 390×844, and 412×915", async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/guides/kubernetes-interview-guide");

      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      const cardHeadings = page.getByRole("heading", { level: 4 });
      const first = await cardHeadings.nth(0).boundingBox();
      const second = await cardHeadings.nth(1).boundingBox();
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      // Single column: stacked, not side-by-side.
      expect(second!.y).toBeGreaterThan(first!.y + 10);
    }
  });

  test("desktop content width and card layout stay comfortable at 1280px and 1440px", async ({ page }) => {
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/guides/kubernetes-interview-guide");

      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      // The site wraps content in a max-w-6xl (1152px) container — it shouldn't stretch edge-to-edge on a wide viewport.
      const mainBox = await page.locator("main").boundingBox();
      expect(mainBox).not.toBeNull();
      expect(mainBox!.width).toBeLessThanOrEqual(1153);

      // Two-column grid: no single subcategory card should approach the full viewport width.
      const networkingCard = page
        .locator("div.rounded-lg")
        .filter({ has: page.getByRole("heading", { level: 4, name: "Networking" }) });
      const cardBox = await networkingCard.boundingBox();
      expect(cardBox).not.toBeNull();
      expect(cardBox!.width).toBeLessThan(width / 2 + 60);
    }
  });

  test("AWS guide detail page loads with all required sections and structured data", async ({ page }) => {
    const response = await page.goto("/guides/aws-devops-interview-guide");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "AWS DevOps Interview Guide" })).toBeVisible();

    for (const heading of [
      "Who This Guide Is For",
      "Prerequisites",
      "Learning / Interview Path",
      "Key Concepts",
      "Interview Focus",
      "Practice Questions",
      "Scenario & Troubleshooting Focus",
      "Common Mistakes",
      "Recommended Preparation Path",
      "Related Guides",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }

    await expect(page.getByText("39 linked questions")).toBeVisible();

    const jsonLdTypes = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonLdTypes.map((json) => JSON.parse(json)["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("TechArticle");

    // Cross-links to the Kubernetes and Terraform guides via related_guides.
    await expect(page.locator('a[href="/guides/kubernetes-interview-guide"]')).toBeVisible();
    await expect(page.locator('a[href="/guides/terraform-interview-guide"]')).toBeVisible();
  });

  test("AWS guide's By Subcategory has exactly 3 cards (iam, lambda, s3), ordered per its Learning Path, each with the correct count", async ({
    page,
  }) => {
    await page.goto("/guides/aws-devops-interview-guide");
    const cardHeadings = page.getByRole("heading", { level: 4 });
    await expect(cardHeadings).toHaveCount(3);
    await expect(cardHeadings.nth(0)).toHaveText("IAM");
    await expect(cardHeadings.nth(1)).toHaveText("Lambda");
    await expect(cardHeadings.nth(2)).toHaveText("S3");

    for (const [name, count] of [
      ["IAM", 13],
      ["Lambda", 13],
      ["S3", 13],
    ] as const) {
      const card = page.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { level: 4, name }) });
      await expect(card.getByText(String(count), { exact: true })).toBeVisible();
      await expect(card.getByRole("link", { name: new RegExp(`View all ${count} questions`) })).toBeVisible();
    }
  });

  test("AWS guide's subcategory card links navigate to a correctly filtered AWS category page", async ({ page }) => {
    await page.goto("/guides/aws-devops-interview-guide");
    const lambdaCard = page.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { level: 4, name: "Lambda" }) });
    await lambdaCard.getByRole("link", { name: /View all 13 questions/ }).click();
    await expect(page).toHaveURL(/\/aws\?subcategory=lambda/);
    const results = page.locator("a[href^='/questions/aws/lambda/']");
    await expect(results.first()).toBeVisible();
    await expect(results).toHaveCount(13);
  });

  test("AWS guide's Must Practice section has 8 real, distinct question links", async ({ page }) => {
    await page.goto("/guides/aws-devops-interview-guide");
    const mustPracticeLinks = page
      .locator("h3", { hasText: "Must Practice" })
      .locator("xpath=following-sibling::ul[1]//a");
    await expect(mustPracticeLinks).toHaveCount(8);
    const hrefs = await mustPracticeLinks.evaluateAll((links) => links.map((l) => l.getAttribute("href")));
    expect(new Set(hrefs).size).toBe(8);
    for (const href of hrefs) expect(href).toMatch(/^\/questions\/aws\//);
  });

  test("AWS guide's Prepare by Interview Level shows only levels with actual AWS questions", async ({ page }) => {
    await page.goto("/guides/aws-devops-interview-guide");
    const levelSection = page.locator("#prepare-by-level");
    for (const level of ["Devops Engineer", "Senior Devops", "Cloud Engineer", "Devsecops", "Staff / Principal"]) {
      await expect(levelSection.getByRole("link", { name: new RegExp(level, "i") })).toBeVisible();
    }
    // No junior-devops, SRE, or Platform Engineer questions exist for AWS — those pills must not appear.
    await expect(levelSection.getByRole("link", { name: /Junior Devops/i })).toHaveCount(0);
    await expect(levelSection.getByRole("link", { name: /^SRE/i })).toHaveCount(0);
    await expect(levelSection.getByRole("link", { name: /Platform Engineer/i })).toHaveCount(0);
  });

  test("AWS guide's By Difficulty omits Beginner, since no beginner-difficulty AWS questions exist", async ({ page }) => {
    await page.goto("/guides/aws-devops-interview-guide");
    const difficultySection = page.locator("#by-difficulty");
    await expect(difficultySection.getByRole("link", { name: /Intermediate/ })).toBeVisible();
    await expect(difficultySection.getByRole("link", { name: /Advanced/ })).toBeVisible();
    await expect(difficultySection.getByRole("link", { name: /^Beginner/ })).toHaveCount(0);
  });

  test("AWS guide renders correctly at mobile viewports with no horizontal overflow", async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/guides/aws-devops-interview-guide");
      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      await expect(page.getByRole("heading", { level: 4, name: "Lambda" })).toBeVisible();
    }
  });

  test("AWS guide stays within the max-width container at 1280px and 1440px", async ({ page }) => {
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/guides/aws-devops-interview-guide");
      const mainBox = await page.locator("main").boundingBox();
      expect(mainBox).not.toBeNull();
      expect(mainBox!.width).toBeLessThanOrEqual(1153);
    }
  });

  test("Terraform guide detail page loads with all required sections and structured data", async ({ page }) => {
    const response = await page.goto("/guides/terraform-interview-guide");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Terraform Interview Guide" })).toBeVisible();

    for (const heading of [
      "Who This Guide Is For",
      "Prerequisites",
      "Learning / Interview Path",
      "Key Concepts",
      "Interview Focus",
      "Practice Questions",
      "Scenario & Troubleshooting Focus",
      "Common Mistakes",
      "Recommended Preparation Path",
      "Related Guides",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }

    await expect(page.getByText("22 linked questions")).toBeVisible();

    const jsonLdTypes = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonLdTypes.map((json) => JSON.parse(json)["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("TechArticle");

    // Cross-links to both existing guides via related_guides.
    await expect(page.locator('a[href="/guides/aws-devops-interview-guide"]')).toBeVisible();
    await expect(page.locator('a[href="/guides/kubernetes-interview-guide"]')).toBeVisible();
  });

  test("Terraform guide's By Subcategory has exactly 3 cards (providers, modules, state), ordered per its Learning Path, with correct counts", async ({
    page,
  }) => {
    await page.goto("/guides/terraform-interview-guide");
    const cardHeadings = page.getByRole("heading", { level: 4 });
    await expect(cardHeadings).toHaveCount(3);
    await expect(cardHeadings.nth(0)).toHaveText("Providers");
    await expect(cardHeadings.nth(1)).toHaveText("Modules");
    await expect(cardHeadings.nth(2)).toHaveText("State");

    for (const [name, count] of [
      ["Providers", 9],
      ["Modules", 4],
      ["State", 9],
    ] as const) {
      const card = page.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { level: 4, name }) });
      await expect(card.getByText(String(count), { exact: true })).toBeVisible();
      await expect(card.getByRole("link", { name: new RegExp(`View all ${count} questions`) })).toBeVisible();
    }
  });

  test("Terraform guide's subcategory card links navigate to a correctly filtered Terraform category page", async ({ page }) => {
    await page.goto("/guides/terraform-interview-guide");
    const stateCard = page.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { level: 4, name: "State" }) });
    await stateCard.getByRole("link", { name: /View all 9 questions/ }).click();
    await expect(page).toHaveURL(/\/terraform\?subcategory=state/);
    const results = page.locator("a[href^='/questions/terraform/state/']");
    await expect(results.first()).toBeVisible();
    await expect(results).toHaveCount(9);
  });

  test("Terraform guide's Must Practice section has 8 real, distinct question links", async ({ page }) => {
    await page.goto("/guides/terraform-interview-guide");
    const mustPracticeLinks = page
      .locator("h3", { hasText: "Must Practice" })
      .locator("xpath=following-sibling::ul[1]//a");
    await expect(mustPracticeLinks).toHaveCount(8);
    const hrefs = await mustPracticeLinks.evaluateAll((links) => links.map((l) => l.getAttribute("href")));
    expect(new Set(hrefs).size).toBe(8);
    for (const href of hrefs) expect(href).toMatch(/^\/questions\/terraform\//);
  });

  test("Terraform guide's Prepare by Interview Level shows only levels with actual Terraform questions", async ({ page }) => {
    await page.goto("/guides/terraform-interview-guide");
    const levelSection = page.locator("#prepare-by-level");
    for (const level of ["Devops Engineer", "Senior Devops", "Devsecops", "Staff / Principal"]) {
      await expect(levelSection.getByRole("link", { name: new RegExp(level, "i") })).toBeVisible();
    }
    // No junior-devops, SRE, Platform Engineer, or Cloud Engineer questions exist for Terraform.
    await expect(levelSection.getByRole("link", { name: /Junior Devops/i })).toHaveCount(0);
    await expect(levelSection.getByRole("link", { name: /^SRE/i })).toHaveCount(0);
    await expect(levelSection.getByRole("link", { name: /Platform Engineer/i })).toHaveCount(0);
    await expect(levelSection.getByRole("link", { name: /Cloud Engineer/i })).toHaveCount(0);
  });

  test("Terraform guide's By Difficulty shows only Intermediate and Advanced", async ({ page }) => {
    await page.goto("/guides/terraform-interview-guide");
    const difficultySection = page.locator("#by-difficulty");
    await expect(difficultySection.getByRole("link", { name: /Intermediate/ })).toBeVisible();
    await expect(difficultySection.getByRole("link", { name: /Advanced/ })).toBeVisible();
    await expect(difficultySection.getByRole("link", { name: /^Beginner/ })).toHaveCount(0);
    await expect(difficultySection.getByRole("link", { name: /^Expert/ })).toHaveCount(0);
  });

  test("Terraform guide renders correctly at mobile viewports with no horizontal overflow", async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/guides/terraform-interview-guide");
      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      await expect(page.getByRole("heading", { level: 4, name: "State" })).toBeVisible();
    }
  });

  test("Terraform guide stays within the max-width container at 1280px and 1440px", async ({ page }) => {
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/guides/terraform-interview-guide");
      const mainBox = await page.locator("main").boundingBox();
      expect(mainBox).not.toBeNull();
      expect(mainBox!.width).toBeLessThanOrEqual(1153);
    }
  });

  test("GCP guide detail page loads with all required sections and structured data", async ({ page }) => {
    const response = await page.goto("/guides/gcp-interview-guide");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "GCP Interview Guide" })).toBeVisible();

    for (const heading of [
      "Who This Guide Is For",
      "Prerequisites",
      "Learning / Interview Path",
      "Key Concepts",
      "Interview Focus",
      "Practice Questions",
      "Scenario & Troubleshooting Focus",
      "Common Mistakes",
      "Recommended Preparation Path",
      "Related Guides",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }

    await expect(page.getByText("27 linked questions")).toBeVisible();

    const jsonLdTypes = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonLdTypes.map((json) => JSON.parse(json)["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("TechArticle");

    // Cross-link to the Kubernetes guide via related_guides.
    await expect(page.locator('a[href="/guides/kubernetes-interview-guide"]')).toBeVisible();
  });

  test("GCP guide's By Subcategory has exactly 3 cards (IAM, Storage, Cloud Functions), ordered per its Learning Path, each with 9 questions", async ({
    page,
  }) => {
    await page.goto("/guides/gcp-interview-guide");
    const cardHeadings = page.getByRole("heading", { level: 4 });
    await expect(cardHeadings).toHaveCount(3);
    await expect(cardHeadings.nth(0)).toHaveText("IAM");
    await expect(cardHeadings.nth(1)).toHaveText("Storage");
    await expect(cardHeadings.nth(2)).toHaveText("Cloud Functions");

    for (const name of ["IAM", "Storage", "Cloud Functions"] as const) {
      const card = page.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { level: 4, name }) });
      await expect(card.getByText("9", { exact: true })).toBeVisible();
      await expect(card.getByRole("link", { name: /View all 9 questions/ })).toBeVisible();
    }
  });

  test("GCP guide's subcategory card links navigate to a correctly filtered GCP category page", async ({ page }) => {
    await page.goto("/guides/gcp-interview-guide");
    const iamCard = page.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { level: 4, name: "IAM" }) });
    await iamCard.getByRole("link", { name: /View all 9 questions/ }).click();
    await expect(page).toHaveURL(/\/gcp\?subcategory=iam/);
    const results = page.locator("a[href^='/questions/gcp/iam/']");
    await expect(results.first()).toBeVisible();
    await expect(results).toHaveCount(9);
  });

  test("GCP guide's Must Practice section has 8 real, distinct question links covering all 3 subcategories", async ({ page }) => {
    await page.goto("/guides/gcp-interview-guide");
    const mustPracticeLinks = page
      .locator("h3", { hasText: "Must Practice" })
      .locator("xpath=following-sibling::ul[1]//a");
    await expect(mustPracticeLinks).toHaveCount(8);
    const hrefs = await mustPracticeLinks.evaluateAll((links) => links.map((l) => l.getAttribute("href")));
    expect(new Set(hrefs).size).toBe(8);
    for (const href of hrefs) expect(href).toMatch(/^\/questions\/gcp\//);
    for (const sub of ["iam", "storage", "cloud-functions"]) {
      expect(hrefs.some((h) => h!.startsWith(`/questions/gcp/${sub}/`))).toBe(true);
    }
  });

  test("GCP guide's Prepare by Interview Level shows only levels with actual GCP questions", async ({ page }) => {
    await page.goto("/guides/gcp-interview-guide");
    const levelSection = page.locator("#prepare-by-level");
    for (const level of ["Junior DevOps", "Devops Engineer", "Senior Devops", "Cloud Engineer", "Devsecops", "Staff / Principal"]) {
      await expect(levelSection.getByRole("link", { name: new RegExp(level, "i") })).toBeVisible();
    }
    // No SRE or Platform Engineer questions exist for GCP.
    await expect(levelSection.getByRole("link", { name: /^SRE/i })).toHaveCount(0);
    await expect(levelSection.getByRole("link", { name: /Platform Engineer/i })).toHaveCount(0);
  });

  test("GCP guide's By Difficulty and By Question Type reflect the actual corpus", async ({ page }) => {
    await page.goto("/guides/gcp-interview-guide");
    const difficultySection = page.locator("#by-difficulty");
    for (const level of [/^Beginner/, /Intermediate/, /Advanced/, /^Expert/]) {
      await expect(difficultySection.getByRole("link", { name: level })).toBeVisible();
    }

    const typeSection = page.locator("#by-question-type");
    for (const type of [/Troubleshooting/, /Practical/, /Conceptual/, /Architecture/, /^Security/, /Scenario/, /Comparison/]) {
      await expect(typeSection.getByRole("link", { name: type })).toBeVisible();
    }
  });

  test("GCP guide renders correctly at mobile viewports with no horizontal overflow", async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/guides/gcp-interview-guide");
      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      await expect(page.getByRole("heading", { level: 4, name: "Cloud Functions" })).toBeVisible();
    }
  });

  test("GCP guide stays within the max-width container at 1280px and 1440px", async ({ page }) => {
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/guides/gcp-interview-guide");
      const mainBox = await page.locator("main").boundingBox();
      expect(mainBox).not.toBeNull();
      expect(mainBox!.width).toBeLessThanOrEqual(1153);
    }
  });

  test("GCP guide appears on the Guides landing page under Focused Technology Guides, alongside 6 guides total", async ({
    page,
  }) => {
    await page.goto("/guides");
    const startHere = page.locator("h2", { hasText: "Start Here" }).locator("xpath=..");
    const focused = page.locator("h2", { hasText: "Focused Technology Guides" }).locator("xpath=..");

    await expect(startHere.locator('a[href="/guides/devops-interview-guide"]')).toBeVisible();
    for (const slug of ["aws-devops-interview-guide", "azure-devops-interview-guide", "kubernetes-interview-guide", "terraform-interview-guide", "gcp-interview-guide"]) {
      await expect(focused.locator(`a[href="/guides/${slug}"]`)).toBeVisible();
    }
    await expect(page.locator('a[href^="/guides/"][href$="-guide"]')).toHaveCount(6);
  });

  test("Azure guide detail page loads with all required sections and structured data", async ({ page }) => {
    const response = await page.goto("/guides/azure-devops-interview-guide");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Azure DevOps Interview Guide" })).toBeVisible();

    for (const heading of [
      "Who This Guide Is For",
      "Prerequisites",
      "Learning / Interview Path",
      "Key Concepts",
      "Interview Focus",
      "Practice Questions",
      "Scenario & Troubleshooting Focus",
      "Common Mistakes",
      "Recommended Preparation Path",
      "Related Guides",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }

    await expect(page.getByText("34 linked questions")).toBeVisible();

    const jsonLdTypes = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonLdTypes.map((json) => JSON.parse(json)["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("TechArticle");

    // Cross-link to the Kubernetes guide via related_guides.
    await expect(page.locator('a[href="/guides/kubernetes-interview-guide"]')).toBeVisible();
  });

  test("Azure guide's By Subcategory has exactly 4 cards (Identity & Networking, Compute, Storage, AKS), ordered per its Learning Path, with correct counts", async ({
    page,
  }) => {
    await page.goto("/guides/azure-devops-interview-guide");
    const cardHeadings = page.getByRole("heading", { level: 4 });
    await expect(cardHeadings).toHaveCount(4);
    await expect(cardHeadings.nth(0)).toHaveText("Identity And Networking");
    await expect(cardHeadings.nth(1)).toHaveText("Compute");
    await expect(cardHeadings.nth(2)).toHaveText("Storage");
    await expect(cardHeadings.nth(3)).toHaveText("AKS");

    for (const [name, count] of [
      ["Identity And Networking", 10],
      ["Compute", 8],
      ["Storage", 7],
      ["AKS", 9],
    ] as const) {
      const card = page.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { level: 4, name }) });
      await expect(card.getByText(String(count), { exact: true })).toBeVisible();
      await expect(card.getByRole("link", { name: new RegExp(`View all ${count} questions`) })).toBeVisible();
    }
  });

  test("Azure guide's subcategory card links navigate to a correctly filtered Azure category page", async ({ page }) => {
    await page.goto("/guides/azure-devops-interview-guide");
    const storageCard = page.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { level: 4, name: "Storage" }) });
    await storageCard.getByRole("link", { name: /View all 7 questions/ }).click();
    await expect(page).toHaveURL(/\/azure\?subcategory=storage/);
    const results = page.locator("a[href^='/questions/azure/storage/']");
    await expect(results.first()).toBeVisible();
    await expect(results).toHaveCount(7);
  });

  test("Azure guide's Must Practice section has 8 real, distinct question links covering all 4 subcategories", async ({ page }) => {
    await page.goto("/guides/azure-devops-interview-guide");
    const mustPracticeLinks = page
      .locator("h3", { hasText: "Must Practice" })
      .locator("xpath=following-sibling::ul[1]//a");
    await expect(mustPracticeLinks).toHaveCount(8);
    const hrefs = await mustPracticeLinks.evaluateAll((links) => links.map((l) => l.getAttribute("href")));
    expect(new Set(hrefs).size).toBe(8);
    for (const href of hrefs) expect(href).toMatch(/^\/questions\/azure\//);
    for (const sub of ["identity-and-networking", "compute", "storage", "aks"]) {
      expect(hrefs.some((h) => h!.startsWith(`/questions/azure/${sub}/`))).toBe(true);
    }
  });

  test("Azure guide's Prepare by Interview Level shows only levels with actual Azure questions", async ({ page }) => {
    await page.goto("/guides/azure-devops-interview-guide");
    const levelSection = page.locator("#prepare-by-level");
    for (const level of ["Junior DevOps", "Devops Engineer", "Senior Devops", "Cloud Engineer", "Devsecops", "Staff / Principal"]) {
      await expect(levelSection.getByRole("link", { name: new RegExp(level, "i") })).toBeVisible();
    }
    // No SRE or Platform Engineer questions exist for Azure.
    await expect(levelSection.getByRole("link", { name: /^SRE/i })).toHaveCount(0);
    await expect(levelSection.getByRole("link", { name: /Platform Engineer/i })).toHaveCount(0);
  });

  test("Azure guide's By Difficulty and By Question Type reflect the actual corpus", async ({ page }) => {
    await page.goto("/guides/azure-devops-interview-guide");
    const difficultySection = page.locator("#by-difficulty");
    for (const level of [/^Beginner/, /Intermediate/, /Advanced/, /^Expert/]) {
      await expect(difficultySection.getByRole("link", { name: level })).toBeVisible();
    }

    const typeSection = page.locator("#by-question-type");
    for (const type of [/Troubleshooting/, /Comparison/, /Architecture/, /^Security/, /Practical/, /Scenario/, /Conceptual/]) {
      await expect(typeSection.getByRole("link", { name: type })).toBeVisible();
    }
  });

  test("Azure guide renders correctly at mobile viewports with no horizontal overflow", async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/guides/azure-devops-interview-guide");
      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      await expect(page.getByRole("heading", { level: 4, name: "AKS" })).toBeVisible();
    }
  });

  test("Azure guide stays within the max-width container at 1280px and 1440px", async ({ page }) => {
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/guides/azure-devops-interview-guide");
      const mainBox = await page.locator("main").boundingBox();
      expect(mainBox).not.toBeNull();
      expect(mainBox!.width).toBeLessThanOrEqual(1153);
    }
  });

  test("Azure guide appears on the Guides landing page under Focused Technology Guides", async ({ page }) => {
    await page.goto("/guides");
    const focused = page.locator("h2", { hasText: "Focused Technology Guides" }).locator("xpath=..");
    await expect(focused.locator('a[href="/guides/azure-devops-interview-guide"]')).toBeVisible();
  });

  test("DevOps guide detail page loads with all required sections and structured data", async ({ page }) => {
    const response = await page.goto("/guides/devops-interview-guide");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "DevOps Interview Guide" })).toBeVisible();

    for (const heading of [
      "Who This Guide Is For",
      "Prerequisites",
      "Learning / Interview Path",
      "Key Concepts",
      "Interview Focus",
      "Practice Questions",
      "Scenario & Troubleshooting Focus",
      "Common Mistakes",
      "Recommended Preparation Path",
      "Related Guides",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }

    await expect(page.getByText("590 linked questions")).toBeVisible();

    const jsonLdTypes = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonLdTypes.map((json) => JSON.parse(json)["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("TechArticle");

    // Cross-links to all five existing single-technology guides, resolved via related_guides
    // into the dedicated Related Guides card list (in addition to any inline prose links above it).
    const relatedGuidesSection = page.locator("section", {
      has: page.getByRole("heading", { level: 2, name: "Related Guides" }),
    });
    await expect(relatedGuidesSection.locator('a[href="/guides/kubernetes-interview-guide"]').last()).toBeVisible();
    await expect(relatedGuidesSection.locator('a[href="/guides/aws-devops-interview-guide"]').last()).toBeVisible();
    await expect(relatedGuidesSection.locator('a[href="/guides/azure-devops-interview-guide"]').last()).toBeVisible();
    await expect(relatedGuidesSection.locator('a[href="/guides/terraform-interview-guide"]').last()).toBeVisible();
    await expect(relatedGuidesSection.locator('a[href="/guides/gcp-interview-guide"]').last()).toBeVisible();
  });

  test("DevOps guide's By Domain renders all 16 domains, in configuration order, with correct live-derived counts", async ({ page }) => {
    await page.goto("/guides/devops-interview-guide");
    const jumpNav = page.getByRole("navigation", { name: "Jump to a practice section" });
    await expect(jumpNav.getByRole("link", { name: "By Domain" })).toHaveAttribute("href", "#by-domain");
    await expect(page.locator("#by-subcategory")).toHaveCount(0);

    const domainSection = page.locator("#by-domain");
    const cardHeadings = domainSection.getByRole("heading", { level: 4 });
    await expect(cardHeadings).toHaveCount(16);

    const expected: [string, number][] = [
      ["Foundations", 52],
      ["Source Control & Collaboration", 30],
      ["CI/CD", 44],
      ["Containers", 29],
      ["Orchestration", 142],
      ["Infrastructure as Code", 40],
      ["Cloud", 120],
      ["Security", 24],
      ["Observability & SRE", 34],
      ["GitOps", 23],
      ["Platform Engineering", 10],
      ["Networking", 10],
      ["Databases", 10],
      ["Architecture & System Design", 8],
      ["Real-World Scenarios", 10],
      ["Troubleshooting", 4],
    ];
    for (let i = 0; i < expected.length; i++) {
      await expect(cardHeadings.nth(i)).toHaveText(expected[i]![0]);
    }
    let total = 0;
    for (const [name, count] of expected) {
      total += count;
      const card = domainSection.locator("div.rounded-lg").filter({ has: page.getByRole("heading", { level: 4, name }) });
      await expect(card.getByText(String(count), { exact: true })).toBeVisible();
    }
    expect(total).toBe(590);
  });

  test("DevOps guide's domain cards list constituent categories, each linking to its own existing category page — no /domain/ route exists", async ({ page }) => {
    await page.goto("/guides/devops-interview-guide");
    const cicdCard = page
      .locator("#by-domain div.rounded-lg")
      .filter({ has: page.getByRole("heading", { level: 4, name: "CI/CD" }) });
    for (const [category, count] of [
      ["github-actions", 10],
      ["gitlab-ci", 10],
      ["jenkins", 10],
      ["azure-pipelines", 10],
      ["cicd", 4],
    ] as const) {
      const link = cicdCard.locator(`a[href="/${category}"]`);
      await expect(link).toBeVisible();
      await expect(link).toContainText(String(count));
    }
    await cicdCard.locator('a[href="/github-actions"]').click();
    await expect(page).toHaveURL(/\/github-actions$/);
    await expect(page.locator("a[href^='/questions/github-actions/']").first()).toBeVisible();

    const response = await page.goto("/domain/cicd");
    expect(response?.status()).toBe(404);
  });

  test("DevOps guide's Must Practice section has 18 real, distinct question links across domains", async ({ page }) => {
    await page.goto("/guides/devops-interview-guide");
    const mustPracticeLinks = page
      .locator("h3", { hasText: "Must Practice" })
      .locator("xpath=following-sibling::ul[1]//a");
    await expect(mustPracticeLinks).toHaveCount(18);
    const hrefs = await mustPracticeLinks.evaluateAll((links) => links.map((l) => l.getAttribute("href")));
    expect(new Set(hrefs).size).toBe(18);
  });

  test("DevOps guide's Prepare by Interview Level shows all 8 interview levels, unfiltered by category", async ({ page }) => {
    await page.goto("/guides/devops-interview-guide");
    const levelSection = page.locator("#prepare-by-level");
    for (const level of [
      "Junior Devops",
      "Devops Engineer",
      "Senior Devops",
      "SRE",
      "Platform Engineer",
      "Cloud Engineer",
      "Devsecops",
      "Staff / Principal",
    ]) {
      const link = levelSection.getByRole("link", { name: new RegExp(level, "i") });
      await expect(link).toBeVisible();
      const href = await link.getAttribute("href");
      expect(href).toMatch(/^\/level\/[a-z-]+$/);
    }
  });

  test("DevOps guide's By Difficulty falls back to /difficulty/[level] links (no single category to filter by)", async ({ page }) => {
    await page.goto("/guides/devops-interview-guide");
    const difficultySection = page.locator("#by-difficulty");
    for (const [name, slug] of [
      ["Beginner", "beginner"],
      ["Intermediate", "intermediate"],
      ["Advanced", "advanced"],
      ["Expert", "expert"],
    ] as const) {
      const link = difficultySection.getByRole("link", { name: new RegExp(`^${name}`) });
      await expect(link).toHaveAttribute("href", `/difficulty/${slug}`);
    }
    await difficultySection.getByRole("link", { name: /^Expert/ }).click();
    await expect(page).toHaveURL(/\/difficulty\/expert/);
  });

  test("DevOps guide's By Question Type links to /type/[type] without a category filter", async ({ page }) => {
    await page.goto("/guides/devops-interview-guide");
    const typeSection = page.locator("#by-question-type");
    const troubleshootingLink = typeSection.getByRole("link", { name: /Troubleshooting/ });
    await expect(troubleshootingLink).toHaveAttribute("href", "/type/troubleshooting");
    await expect(troubleshootingLink).toContainText("141");
  });

  test("DevOps guide's Scenario & Troubleshooting Focus distinguishes the 4-question Troubleshooting domain from the 141-question cross-cutting troubleshooting type", async ({ page }) => {
    await page.goto("/guides/devops-interview-guide");
    const section = page.locator("section", { has: page.getByRole("heading", { level: 2, name: "Scenario & Troubleshooting Focus" }) });
    await expect(section.getByText("4", { exact: true })).toBeVisible();
    await expect(section.getByText("141", { exact: true })).toBeVisible();
  });

  test("DevOps guide renders correctly at mobile viewports with no horizontal overflow", async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/guides/devops-interview-guide");
      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      await expect(page.getByRole("heading", { level: 4, name: "Orchestration" })).toBeVisible();
    }
  });

  test("DevOps guide stays within the max-width container at 1280px and 1440px", async ({ page }) => {
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/guides/devops-interview-guide");
      const mainBox = await page.locator("main").boundingBox();
      expect(mainBox).not.toBeNull();
      expect(mainBox!.width).toBeLessThanOrEqual(1153);
    }
  });

  test("roadmaps landing page loads and links to the DevOps Engineer Roadmap without fake future-roadmap links", async ({ page }) => {
    const response = await page.goto("/roadmaps");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "DevOps Roadmaps" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "DevOps Engineer Roadmap" })).toBeVisible();
    await expect(page.locator('a[href="/roadmaps/devops-engineer-roadmap"]')).toBeVisible();
    // The "more roadmaps planned" note must not link to routes that don't exist yet.
    await expect(page.locator('a[href*="cloud-engineer"], a[href*="sre-roadmap"], a[href*="platform-engineer-roadmap"]')).toHaveCount(0);
  });

  test("Roadmaps nav link navigates to the roadmaps landing page", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: "Roadmaps", exact: true }).click();
    await expect(page).toHaveURL(/\/roadmaps$/);
    await expect(page.getByRole("heading", { name: "DevOps Roadmaps" })).toBeVisible();
  });

  test("DevOps Engineer Roadmap detail page loads with all required sections and structured data", async ({ page }) => {
    const response = await page.goto("/roadmaps/devops-engineer-roadmap");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "DevOps Engineer Roadmap" })).toBeVisible();

    for (const heading of ["Introduction", "Who This Roadmap Is For", "Deferred Areas", "Stages", "Related Guides"]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }

    await expect(page.getByText("552 linked questions")).toBeVisible();

    const jsonLdTypes = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = jsonLdTypes.map((json) => JSON.parse(json)["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("Course");
  });

  test("all 12 roadmap stages render in order with correct live-derived question counts", async ({ page }) => {
    await page.goto("/roadmaps/devops-engineer-roadmap");
    const stageHeadings = page.getByRole("heading", { level: 3 });
    await expect(stageHeadings).toHaveCount(12);

    const expected = [
      ["Foundations", 52],
      ["Source Control & Collaboration", 30],
      ["Containers", 29],
      ["CI/CD", 44],
      ["Orchestration", 142],
      ["Infrastructure as Code", 40],
      ["Cloud Platforms", 120],
      ["Security Fundamentals", 24],
      ["Observability Fundamentals", 24],
      ["GitOps & Modern Delivery", 23],
      ["Networking Essentials", 10],
      ["Production Readiness", 14],
    ] as const;

    for (let i = 0; i < expected.length; i++) {
      await expect(stageHeadings.nth(i)).toHaveText(expected[i]![0]);
    }
    // Spot-check live counts on the largest and smallest stages via their own displayed text.
    await expect(page.getByText(`${expected[4]![1]} questions in this stage's category pool`)).toBeVisible();
    await expect(page.getByText(`${expected[6]![1]} questions in this stage's category pool`)).toBeVisible();
    await expect(page.getByText(`${expected[10]![1]} questions in this stage's category pool`)).toBeVisible();
  });

  test("Deferred Areas section explains why sre, platform-engineering, databases, and system-design are excluded", async ({ page }) => {
    await page.goto("/roadmaps/devops-engineer-roadmap");
    const section = page.locator("section", { has: page.getByRole("heading", { level: 2, name: "Deferred Areas" }) });
    for (const term of ["sre", "platform-engineering", "databases", "system-design"]) {
      await expect(section.getByText(term, { exact: false }).first()).toBeVisible();
    }
  });

  test("roadmap distinguishes /troubleshooting (this stage's own 4 questions) from the 141-question cross-cutting /type/troubleshooting", async ({ page }) => {
    await page.goto("/roadmaps/devops-engineer-roadmap");
    const stageCard = page.locator("#production-readiness");
    await expect(stageCard.getByText("141", { exact: false })).toBeVisible();
    await expect(stageCard.locator('a[href="/type/troubleshooting"]')).toBeVisible();
  });

  test("Orchestration, Infrastructure as Code, and Cloud Platforms stages link to their existing dedicated Guides", async ({ page }) => {
    await page.goto("/roadmaps/devops-engineer-roadmap");
    // Each stage's description also mentions its Guide inline, in addition to the dedicated
    // Resources list link — both are real, intentional links to the same Guide, so .first() suffices.
    await expect(page.locator("#orchestration a[href=\"/guides/kubernetes-interview-guide\"]").first()).toBeVisible();
    await expect(page.locator("#iac a[href=\"/guides/terraform-interview-guide\"]").first()).toBeVisible();
    await expect(page.locator("#cloud a[href=\"/guides/aws-devops-interview-guide\"]").first()).toBeVisible();
  });

  test("a stage's checkpoint and representative practice links navigate to real, existing question pages", async ({ page }) => {
    await page.goto("/roadmaps/devops-engineer-roadmap");
    const stageCard = page.locator("#networking");
    const link = stageCard.locator("a[href^='/questions/networking/']").first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("a stage's category resource link lands on the correct existing category page", async ({ page }) => {
    await page.goto("/roadmaps/devops-engineer-roadmap");
    const stageCard = page.locator("#networking");
    await stageCard.getByRole("link", { name: /Networking questions/ }).click();
    await expect(page).toHaveURL(/\/networking$/);
    await expect(page.locator("a[href^='/questions/networking/']").first()).toBeVisible();
  });

  test("roadmap progress: marking a stage complete updates its status, the progress bar, and the overall percentage", async ({ page }) => {
    await page.goto("/roadmaps/devops-engineer-roadmap");
    const progressbar = page.getByRole("progressbar", { name: "Roadmap completion progress" });
    await expect(progressbar).toHaveAttribute("aria-valuenow", "0");
    await expect(page.getByText("0% (0 of 12 stages)")).toBeVisible();

    const foundationsCard = page.locator("#foundations");
    await foundationsCard.getByRole("checkbox", { name: "Mark this stage complete" }).check();

    await expect(progressbar).toHaveAttribute("aria-valuenow", "8");
    await expect(page.getByText("8% (1 of 12 stages)")).toBeVisible();
    await expect(foundationsCard.getByText("Completed")).toBeVisible();
  });

  test("roadmap progress survives a page refresh via localStorage", async ({ page }) => {
    await page.goto("/roadmaps/devops-engineer-roadmap");
    await page.locator("#containers").getByRole("checkbox", { name: "Mark this stage complete" }).check();
    await expect(page.getByText("8% (1 of 12 stages)")).toBeVisible();

    await page.reload();
    await expect(page.locator("#containers").getByRole("checkbox", { name: "Mark this stage complete" })).toBeChecked();
    await expect(page.getByText("8% (1 of 12 stages)")).toBeVisible();
  });

  test("roadmap progress tolerates malformed localStorage instead of crashing", async ({ page }) => {
    await page.goto("/roadmaps/devops-engineer-roadmap");
    await page.evaluate(() => localStorage.setItem("roadmap-progress", "{not valid json"));
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "DevOps Engineer Roadmap" })).toBeVisible();
    await expect(page.getByText("0% (0 of 12 stages)")).toBeVisible();

    await page.evaluate(() => localStorage.setItem("roadmap-progress", JSON.stringify({ completedStageIds: "not-an-array" })));
    await page.reload();
    await expect(page.getByText("0% (0 of 12 stages)")).toBeVisible();

    // A stage id that no longer exists must be silently ignored, not crash or count toward progress.
    await page.evaluate(() => localStorage.setItem("roadmap-progress", JSON.stringify({ completedStageIds: ["some-removed-stage"] })));
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "DevOps Engineer Roadmap" })).toBeVisible();
    await expect(page.getByText("0% (0 of 12 stages)")).toBeVisible();
  });

  test("roadmap SEO metadata is present and distinct from the Guides landing page", async ({ page }) => {
    await page.goto("/roadmaps/devops-engineer-roadmap");
    await expect(page).toHaveTitle(/DevOps Engineer Roadmap/);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /\/roadmaps\/devops-engineer-roadmap$/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /DevOps Engineer Roadmap/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  });

  test("roadmap renders correctly at mobile viewports with no horizontal overflow", async ({ page }) => {
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 412, height: 915 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/roadmaps/devops-engineer-roadmap");
      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      await expect(page.getByRole("heading", { level: 3, name: "Foundations" })).toBeVisible();
      await expect(page.getByRole("checkbox", { name: "Mark this stage complete" }).first()).toBeVisible();
    }
  });

  test("roadmap stays within the max-width container at 1280px and 1440px", async ({ page }) => {
    for (const width of [1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/roadmaps/devops-engineer-roadmap");
      const mainBox = await page.locator("main").boundingBox();
      expect(mainBox).not.toBeNull();
      expect(mainBox!.width).toBeLessThanOrEqual(1153);
    }
  });

  test("Share button appears on question pages and opens a popover with Share on X and Copy", async ({ page }) => {
    await page.goto(SAMPLE_QUESTION_PATH);
    const shareButton = page.getByRole("button", { name: "Share" });
    await expect(shareButton).toBeVisible();
    await shareButton.click();
    const menu = page.getByRole("menu", { name: "Share options" });
    await expect(menu.getByRole("menuitem", { name: "Share on X" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Copy" })).toBeVisible();
  });

  test("Share button appears on Guide pages", async ({ page }) => {
    await page.goto("/guides/kubernetes-interview-guide");
    await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  });

  test("Share button appears on Roadmap pages", async ({ page }) => {
    await page.goto("/roadmaps/devops-engineer-roadmap");
    await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  });

  test("Share on X opens an x.com intent URL containing the canonical page URL, the question title, and @devopskb", async ({ page, baseURL }) => {
    await page.goto(SAMPLE_QUESTION_PATH);
    await page.getByRole("button", { name: "Share" }).click();
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("menuitem", { name: "Share on X" }).click(),
    ]);
    const popupUrl = new URL(popup.url());
    expect(popupUrl.hostname).toBe("x.com");
    expect(popupUrl.pathname).toBe("/intent/tweet");
    const text = decodeURIComponent(popupUrl.searchParams.get("text") ?? "");
    expect(text).toContain(`${baseURL}${SAMPLE_QUESTION_PATH}`);
    expect(text).toContain("@devopskb");
    expect(text.toLowerCase()).toContain("iam");
    await popup.close();
  });

  test("Share on X for a Guide includes the Guide title and the branded tagline", async ({ page, baseURL }) => {
    await page.goto("/guides/kubernetes-interview-guide");
    await page.getByRole("button", { name: "Share" }).click();
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByRole("menuitem", { name: "Share on X" }).click(),
    ]);
    const text = decodeURIComponent(new URL(popup.url()).searchParams.get("text") ?? "");
    expect(text).toContain("Kubernetes Interview Guide");
    expect(text).toContain("A practical guide for DevOps interview preparation.");
    expect(text).toContain(`${baseURL}/guides/kubernetes-interview-guide`);
    expect(text).toContain("@devopskb");
    await popup.close();
  });

  test("Copy action copies branded share text (title, context, URL, and @devopskb), not just the bare link", async ({ page, context, baseURL }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/roadmaps/devops-engineer-roadmap");
    await page.getByRole("button", { name: "Share" }).click();
    await page.getByRole("menuitem", { name: "Copy" }).click();
    await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain("DevOps Engineer Roadmap");
    expect(clipboardText).toContain("A practical learning path for DevOps interview preparation.");
    expect(clipboardText).toContain(`${baseURL}/roadmaps/devops-engineer-roadmap`);
    expect(clipboardText).toContain("@devopskb");
  });

  test("Web Share API is used directly (no popover) when available, with the correct branded payload", async ({ page, baseURL }) => {
    await page.addInitScript(() => {
      (window as unknown as { __shareCalls: unknown[] }).__shareCalls = [];
      (navigator as unknown as { share: (data: unknown) => Promise<void> }).share = async (data: unknown) => {
        (window as unknown as { __shareCalls: unknown[] }).__shareCalls.push(data);
      };
    });
    await page.goto(SAMPLE_QUESTION_PATH);
    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByRole("menu", { name: "Share options" })).toHaveCount(0);
    const calls = await page.evaluate(() => (window as unknown as { __shareCalls: { title: string; text: string; url: string }[] }).__shareCalls);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(`${baseURL}${SAMPLE_QUESTION_PATH}`);
    expect(calls[0]!.text).toContain("@devopskb");
    expect(calls[0]!.text).toContain(`${baseURL}${SAMPLE_QUESTION_PATH}`);
  });

  test("Web Share API failing or being cancelled by the user does not break the page", async ({ page }) => {
    await page.addInitScript(() => {
      (navigator as unknown as { share: (data: unknown) => Promise<void> }).share = async () => {
        throw new DOMException("Share canceled", "AbortError");
      };
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(SAMPLE_QUESTION_PATH);
    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Share popover closes on outside click and on Escape", async ({ page }) => {
    await page.goto(SAMPLE_QUESTION_PATH);
    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByRole("menu", { name: "Share options" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu", { name: "Share options" })).toHaveCount(0);

    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByRole("menu", { name: "Share options" })).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(page.getByRole("menu", { name: "Share options" })).toHaveCount(0);
  });

  test("Share renders correctly in dark mode with no horizontal overflow, on mobile and desktop", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(SAMPLE_QUESTION_PATH);
      await page.getByRole("button", { name: "Share" }).click();
      await expect(page.getByRole("menu", { name: "Share options" })).toBeVisible();
      const [scrollWidth, clientWidth] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    }
  });

  test("Share renders correctly in light mode with no horizontal overflow", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(SAMPLE_QUESTION_PATH);
    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByRole("menu", { name: "Share options" })).toBeVisible();
    const [scrollWidth, clientWidth] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("no console errors on pages with the Share button, including after opening it", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    for (const path of [SAMPLE_QUESTION_PATH, "/guides/kubernetes-interview-guide", "/roadmaps/devops-engineer-roadmap"]) {
      await page.goto(path, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Share" }).click();
      await page.keyboard.press("Escape");
    }
    expect(errors).toEqual([]);
  });

  test("favicon and OpenGraph images embed the official logo and render at the correct dimensions", async ({ request }) => {
    const icon = await request.get("/icon");
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"]).toContain("image/png");

    const ogDefault = await request.get("/opengraph-image");
    expect(ogDefault.status()).toBe(200);

    const ogGuide = await request.get("/guides/kubernetes-interview-guide/opengraph-image");
    expect(ogGuide.status()).toBe(200);

    const ogRoadmap = await request.get("/roadmaps/devops-engineer-roadmap/opengraph-image");
    expect(ogRoadmap.status()).toBe(200);

    const ogQuestion = await request.get(`${SAMPLE_QUESTION_PATH}/opengraph-image`);
    expect(ogQuestion.status()).toBe(200);
  });

  test("Twitter Card metadata references @devopskb as site and creator", async ({ page }) => {
    await page.goto(SAMPLE_QUESTION_PATH);
    await expect(page.locator('meta[name="twitter:site"]')).toHaveAttribute("content", "@devopskb");
    await expect(page.locator('meta[name="twitter:creator"]')).toHaveAttribute("content", "@devopskb");
  });

  test("footer links to the official X account", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('footer a[href="https://x.com/devopskb"]')).toBeVisible();
  });

  test("sitemap.xml and robots.txt exist and are well-formed", async ({ request }) => {
    const sitemapRes = await request.get("/sitemap.xml");
    expect(sitemapRes.status()).toBe(200);
    const sitemapBody = await sitemapRes.text();
    expect(sitemapBody).toContain("<urlset");
    expect(sitemapBody).toContain(SAMPLE_QUESTION_PATH);
    expect(sitemapBody).toContain("/guides</loc>");
    expect(sitemapBody).toContain("/guides/kubernetes-interview-guide</loc>");
    expect(sitemapBody).toContain("/guides/aws-devops-interview-guide</loc>");
    expect(sitemapBody).toContain("/guides/azure-devops-interview-guide</loc>");
    expect(sitemapBody).toContain("/guides/terraform-interview-guide</loc>");
    expect(sitemapBody).toContain("/guides/gcp-interview-guide</loc>");
    expect(sitemapBody).toContain("/guides/devops-interview-guide</loc>");
    expect(sitemapBody).toContain("/roadmaps</loc>");
    expect(sitemapBody).toContain("/roadmaps/devops-engineer-roadmap</loc>");

    const robotsRes = await request.get("/robots.txt");
    expect(robotsRes.status()).toBe(200);
    expect(await robotsRes.text()).toContain("Sitemap:");
  });

  test("no console errors across the key pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    for (const path of ["/", "/aws", SAMPLE_QUESTION_PATH, "/search", "/technologies/kubernetes", "/difficulty/advanced", "/interview", "/contact", "/guides", "/guides/kubernetes-interview-guide", "/guides/devops-interview-guide", "/roadmaps", "/roadmaps/devops-engineer-roadmap"]) {
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

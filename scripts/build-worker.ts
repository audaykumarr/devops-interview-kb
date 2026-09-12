import * as esbuild from "esbuild";

async function main() {
  await esbuild.build({
    entryPoints: ["lib/workers/resume-extract.worker.ts"],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    outfile: "public/resume-extract-worker.js",
    sourcemap: true,
    logLevel: "info",
  });
  console.log("✔ Wrote public/resume-extract-worker.js");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

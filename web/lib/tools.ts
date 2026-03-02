import { execFile } from "child_process";
import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(process.cwd(), "..");
const TOOLS_DIR = path.join(PROJECT_ROOT, "tools");

interface ToolExecResult {
  status: "success" | "error";
  output: string;
  images?: string[];
}

function runPython(
  script: string,
  args: string[],
  timeoutMs = 120000
): Promise<ToolExecResult> {
  return new Promise((resolve) => {
    const scriptPath = path.join(TOOLS_DIR, script);

    execFile(
      "python",
      [scriptPath, ...args],
      {
        cwd: TOOLS_DIR,
        timeout: timeoutMs,
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
        maxBuffer: 1024 * 1024 * 10,
      },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            status: "error",
            output: `Error: ${error.message}\n${stderr || ""}`.trim(),
          });
        } else {
          resolve({
            status: "success",
            output: (stdout || "").trim() || "Completed successfully.",
          });
        }
      }
    );
  });
}

/** Extract image file paths from tool stdout and manifest files. */
function extractImages(output: string): string[] {
  const images: string[] = [];

  // Try to read compose manifest if referenced in output
  const manifestMatch = output.match(/Manifest:\s*(.+\.json)/);
  if (manifestMatch) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestMatch[1].trim(), "utf-8"));
      if (manifest.flyers) {
        for (const f of manifest.flyers) {
          if (f.file && fs.existsSync(f.file)) images.push(f.file);
        }
      }
      if (manifest.images) {
        for (const img of manifest.images) {
          if (img.file && fs.existsSync(img.file)) images.push(img.file);
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // Also check for "Composed in <dir>" pattern and read manifest from that dir
  const composedDirMatch = output.match(/Composed \d+ final flyers in (.+)/);
  if (composedDirMatch && images.length === 0) {
    try {
      const dir = composedDirMatch[1].trim();
      const files = fs.readdirSync(dir);
      const latestManifest = files
        .filter((f: string) => f.startsWith("compose_manifest_") && f.endsWith(".json"))
        .sort()
        .pop();
      if (latestManifest) {
        const manifest = JSON.parse(fs.readFileSync(path.join(dir, latestManifest), "utf-8"));
        for (const f of manifest.flyers || []) {
          if (f.file && fs.existsSync(f.file)) images.push(f.file);
        }
      }
    } catch { /* ignore */ }
  }

  return images;
}

type ToolArgs = Record<string, unknown>;

const toolMap: Record<
  string,
  (args: ToolArgs) => Promise<ToolExecResult>
> = {
  research_meta_ads: (args) =>
    runPython("scrape_meta_ads.py", [
      "--service",
      (args.service as string) || "recruitment",
    ]),

  research_web_ads: (args) => {
    const flags = ["--service", (args.service as string) || "recruitment"];
    if (args.download_images) flags.push("--download-images");
    return runPython("scrape_web_ads.py", flags);
  },

  analyze_ads: (args) =>
    runPython("analyze_ads.py", [
      "--service",
      (args.service as string) || "recruitment",
    ]),

  generate_copy: (args) => {
    const flags = [
      "--service",
      (args.service as string) || "recruitment",
      "--type",
      (args.ad_type as string) || "flyer",
    ];
    if (args.brief) flags.push("--brief", args.brief as string);
    if (args.variants) flags.push("--variants", String(args.variants));
    return runPython("generate_copy.py", flags);
  },

  generate_flyer_image: async (args) => {
    const flags = [
      "--service",
      (args.service as string) || "recruitment",
    ];
    if (args.copy_file) flags.push("--copy-file", args.copy_file as string);
    if (Array.isArray(args.sizes) && args.sizes.length > 0) {
      flags.push("--size", ...args.sizes);
    }
    const result = await runPython("generate_flyer.py", flags, 180000);
    if (result.status === "success") {
      result.images = extractImages(result.output);
    }
    return result;
  },

  compose_flyer: async (args) => {
    const flags = [
      "--manifest",
      args.manifest as string,
      "--copy-file",
      args.copy_file as string,
    ];
    if (args.variant) flags.push("--variant", String(args.variant));
    const result = await runPython("compose_flyer.py", flags);
    if (result.status === "success") {
      result.images = extractImages(result.output);
    }
    return result;
  },

  score_ad: (args) => {
    const flags: string[] = [];
    if (args.image_path) flags.push("--image", args.image_path as string);
    else if (args.manifest_path)
      flags.push("--manifest", args.manifest_path as string);
    return runPython("score_ad.py", flags);
  },

  run_full_pipeline: async (args) => {
    const service = (args.service as string) || "recruitment";
    const adType = (args.ad_type as string) || "flyer";
    const results: string[] = [];

    // Helper to extract a file path from stdout (looks for paths like .tmp/output/... or C:\...)
    function extractPath(output: string, pattern: RegExp): string | null {
      const match = output.match(pattern);
      return match ? match[1].trim() : null;
    }

    // Step 1: Research (non-blocking — failures here don't stop the pipeline)
    const meta = await runPython("scrape_meta_ads.py", ["--service", service]);
    results.push(`[Research Meta] ${meta.output.split("\n").pop()}`);

    const web = await runPython("scrape_web_ads.py", ["--service", service]);
    results.push(`[Research Web] ${web.output.split("\n").pop()}`);

    // Step 2: Analyze (only if research produced data)
    const analysis = await runPython("analyze_ads.py", ["--service", service]);
    results.push(`[Analysis] ${analysis.output.split("\n").pop()}`);

    // Step 3: Generate copy
    const copy = await runPython("generate_copy.py", [
      "--service", service,
      "--type", adType,
    ]);
    results.push(`[Copy] ${copy.output.split("\n").pop()}`);

    // Extract copy file path from output: "Saved 3 variants to <path>"
    const copyFilePath = extractPath(copy.output, /Saved \d+ variants to (.+\.json)/);
    if (!copyFilePath) {
      results.push("[Error] Could not determine copy file path. Stopping pipeline.");
      return { status: "error", output: results.join("\n") };
    }

    // Step 4: Generate DALL-E background images
    const flyer = await runPython("generate_flyer.py", [
      "--service", service,
      "--copy-file", copyFilePath,
    ], 180000);
    results.push(`[DALL-E] ${flyer.output.split("\n").pop()}`);

    // Extract manifest path from output: "Manifest: <path>"
    const manifestPath = extractPath(flyer.output, /Manifest:\s*(.+\.json)/);
    if (!manifestPath || flyer.status === "error") {
      results.push("[Error] Image generation failed or manifest not found. Stopping pipeline.");
      return { status: "error", output: results.join("\n") };
    }

    // Step 5: Compose final flyers (overlay copy onto backgrounds)
    const compose = await runPython("compose_flyer.py", [
      "--manifest", manifestPath,
      "--copy-file", copyFilePath,
    ]);
    results.push(`[Compose] ${compose.output.split("\n").pop()}`);

    if (compose.status === "error") {
      results.push("[Error] Flyer composition failed.");
      return { status: "error", output: results.join("\n") };
    }

    results.push("[Done] Full pipeline complete. Final flyers saved to .tmp/output/final/");

    const images = extractImages(compose.output);

    return {
      status: "success",
      output: results.join("\n"),
      images: images.length > 0 ? images : undefined,
    };
  },
};

export async function executeTool(
  name: string,
  args: ToolArgs
): Promise<ToolExecResult> {
  const handler = toolMap[name];
  if (!handler) {
    return { status: "error", output: `Unknown tool: ${name}` };
  }
  return handler(args);
}

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

interface ToolExecResult {
  status: "success" | "error";
  output: string;
  images?: string[];
}

type ToolArgs = Record<string, unknown>;

async function callBackend(
  endpoint: string,
  body: Record<string, unknown>,
  timeoutMs = 120000
): Promise<ToolExecResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${BACKEND_URL}/tools/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const data = await res.json();

    // Convert base64 images to data URLs if present
    const images: string[] = [];
    if (data.images && Array.isArray(data.images)) {
      for (const img of data.images) {
        if (img.data_url) {
          images.push(img.data_url);
        }
      }
    }

    return {
      status: data.status || "success",
      output: data.output || "Completed.",
      ...(images.length > 0 ? { images } : {}),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return { status: "error", output: `Backend error: ${message}` };
  }
}

const toolMap: Record<string, (args: ToolArgs) => Promise<ToolExecResult>> = {
  research_meta_ads: (args) =>
    callBackend("research_meta_ads", {
      service: (args.service as string) || "recruitment",
    }),

  research_web_ads: (args) =>
    callBackend("research_web_ads", {
      service: (args.service as string) || "recruitment",
      download_images: !!args.download_images,
    }),

  analyze_ads: (args) =>
    callBackend("analyze_ads", {
      service: (args.service as string) || "recruitment",
    }),

  generate_copy: (args) =>
    callBackend("generate_copy", {
      service: (args.service as string) || "recruitment",
      ad_type: (args.ad_type as string) || "flyer",
      ...(args.brief ? { brief: args.brief } : {}),
      ...(args.variants ? { variants: args.variants } : {}),
    }),

  generate_flyer_image: (args) =>
    callBackend(
      "generate_flyer_image",
      {
        service: (args.service as string) || "recruitment",
        ...(args.copy_file ? { copy_file: args.copy_file } : {}),
        ...(Array.isArray(args.sizes) && args.sizes.length > 0
          ? { sizes: args.sizes }
          : {}),
      },
      180000
    ),

  compose_flyer: (args) =>
    callBackend("compose_flyer", {
      manifest: args.manifest as string,
      copy_file: args.copy_file as string,
      ...(args.variant ? { variant: args.variant } : {}),
    }),

  score_ad: (args) =>
    callBackend("score_ad", {
      ...(args.image_path ? { image_path: args.image_path } : {}),
      ...(args.manifest_path ? { manifest_path: args.manifest_path } : {}),
    }),

  run_full_pipeline: (args) =>
    callBackend(
      "run_full_pipeline",
      {
        service: (args.service as string) || "recruitment",
        ad_type: (args.ad_type as string) || "flyer",
      },
      300000
    ),
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

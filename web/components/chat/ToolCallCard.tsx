"use client";

import type { ToolCallResult } from "@/lib/types";

const toolLabels: Record<string, string> = {
  research_meta_ads: "Research Meta Ads",
  research_web_ads: "Research Web Ads",
  analyze_ads: "Analyze Ads",
  generate_copy: "Generate Copy",
  generate_flyer_image: "Generate Image",
  compose_flyer: "Compose Flyer",
  score_ad: "Score Ad",
  run_full_pipeline: "Full Pipeline",
};

function imageUrl(imgSrc: string) {
  // If it's already a data URL or http URL, use it directly
  if (imgSrc.startsWith("data:") || imgSrc.startsWith("http")) {
    return imgSrc;
  }
  return `/api/images?path=${encodeURIComponent(imgSrc)}`;
}

function downloadImage(imgSrc: string) {
  const url = imageUrl(imgSrc);
  const filename = imgSrc.startsWith("data:")
    ? "image.png"
    : imgSrc.split(/[/\\]/).pop() || "image.png";
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function ToolCallCard({
  toolCall,
}: {
  toolCall: ToolCallResult;
}) {
  const label = toolLabels[toolCall.tool] || toolCall.tool;
  const isError = toolCall.status === "error";
  const isRunning = toolCall.status === "running";
  const hasImages = toolCall.images && toolCall.images.length > 0;

  return (
    <div
      className={`rounded-xl border text-xs font-mono overflow-hidden ${
        isError
          ? "border-red-500/30 bg-red-500/5"
          : isRunning
            ? "border-yellow-500/30 bg-yellow-500/5"
            : "border-emerald-500/30 bg-emerald-500/5"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        <span
          className={`w-2 h-2 rounded-full ${
            isError
              ? "bg-red-400"
              : isRunning
                ? "bg-yellow-400 animate-pulse"
                : "bg-emerald-400"
          }`}
        />
        <span className="text-white/70 font-semibold">{label}</span>
        <span className="text-white/30 ml-auto">
          {isRunning ? "Running..." : isError ? "Failed" : "Done"}
        </span>
      </div>
      {toolCall.result && (
        <div className="px-3 py-2 text-white/50 max-h-32 overflow-y-auto">
          <pre className="whitespace-pre-wrap">{toolCall.result}</pre>
        </div>
      )}
      {hasImages && (
        <div className="px-3 py-3 border-t border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {toolCall.images!.map((imgPath, i) => {
              const filename = imgPath.startsWith("data:")
                ? `image-${i + 1}.png`
                : imgPath.split(/[/\\]/).pop() || `image-${i}.png`;
              return (
                <div key={i} className="group relative rounded-lg overflow-hidden bg-black/30">
                  <img
                    src={imageUrl(imgPath)}
                    alt={filename}
                    className="w-full h-auto object-contain"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <button
                      onClick={() => downloadImage(imgPath)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-black px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-white cursor-pointer"
                    >
                      Download
                    </button>
                  </div>
                  <div className="px-2 py-1 text-[10px] text-white/40 truncate">
                    {filename}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

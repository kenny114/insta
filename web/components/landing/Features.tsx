"use client";

const features = [
  {
    title: "Research",
    description:
      "Scrape competitor ads from Meta Ad Library and Google to identify what works.",
    icon: "&#128269;",
  },
  {
    title: "Generate",
    description:
      "Create ad copy variants and DALL-E backgrounds tailored to your service line.",
    icon: "&#9997;",
  },
  {
    title: "Compose",
    description:
      "Overlay copy onto backgrounds with professional typography and branding.",
    icon: "&#127912;",
  },
  {
    title: "Score & Iterate",
    description:
      "AI-powered scoring on 6 criteria with automatic improvement suggestions.",
    icon: "&#9733;",
  },
];

export default function Features() {
  return (
    <section className="py-16 px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-colors"
          >
            <div
              className="text-2xl mb-3"
              dangerouslySetInnerHTML={{ __html: f.icon }}
            />
            <h3 className="text-white font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-white/40 leading-relaxed">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

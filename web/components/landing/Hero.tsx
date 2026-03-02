"use client";

export default function Hero() {
  return (
    <section className="text-center py-20 px-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60 mb-8">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        Powered by GPT-4 + DALL-E 3
      </div>
      <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight mb-6">
        AI Ad Generator
      </h1>
      <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
        Research competitors, generate copy, create visuals, and score your ads
        — all through a single conversation. Built for recruitment and HR
        services.
      </p>
      <a
        href="#chat"
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3 text-white font-medium transition-colors"
      >
        Start Creating
        <span className="text-lg">&darr;</span>
      </a>
    </section>
  );
}

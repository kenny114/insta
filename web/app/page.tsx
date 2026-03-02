import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import ChatContainer from "@/components/chat/ChatContainer";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto">
        <Hero />
        <Features />
        <section id="chat" className="px-4 py-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Talk to your ad generator
          </h2>
          <ChatContainer />
        </section>
        <Footer />
      </div>
    </main>
  );
}

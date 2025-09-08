import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Registration from "@/components/Registration";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <About />
      <Registration />
      <Contact />
      <Footer />
    </div>
  );
}

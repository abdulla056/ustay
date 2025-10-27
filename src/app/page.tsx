import FeaturedProperties from "../components/home/featured-properties";
import Header from "../components/home/header-section";
import Testimonials from "../components/home/testimonials";
import WhyChooseUsContent from "../components/home/why-choose-us-content";
import WhyChooseUsSection from "../components/home/why-choose-us-section";
import NavBar from "../components/ui/nav-bar";

export default function Home() {
  return (
    <>
      <NavBar />
      <div className="font-sans items-center !pt-0 justify-items-center min-h-screen p-0 pb-20 gap-16 sm:p-20">
        <Header />
        <WhyChooseUsSection />
        <WhyChooseUsContent
          variation={1}
          title="Authentic Experiences"
          description="Discover unique stays and local experiences that connect you with the heart of your destination."
        />
        <WhyChooseUsContent
          variation={2}
          title="Verified Properties"
          description="All our properties are carefully vetted to ensure quality, safety, and comfort during your stay."
        />
        <WhyChooseUsContent
          variation={2}
          title="Best Price Guarantee"
          description="We offer competitive rates and transparent pricing with no hidden fees or surprises."
        />
        <FeaturedProperties />
        <Testimonials />
      </div>
    </>
  );
}

interface WhyChooseUsContent {
    variation: 1 | 2
    title: string
    description: string
}

export default function WhyChooseUsContent({variation, title, description} : WhyChooseUsContent) {
  return (
    <section className="w-screen h-screen relative overflow-hidden">
      {variation === 1 ? (
        // Image Grid - 3 images
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {/* Left image - spans full height */}
          <div 
            className="col-span-1 row-span-2 bg-cover bg-center"
            style={{ backgroundImage: "url(/resort.jpg)" }}
          />
          
          {/* Top right image */}
          <div 
            className="col-span-1 row-span-1 bg-cover bg-center"
            style={{ backgroundImage: "url(/resort.jpg)" }}
          />
          
          {/* Bottom right image */}
          <div 
            className="col-span-1 row-span-1 bg-cover bg-center"
            style={{ backgroundImage: "url(/resort.jpg)" }}
          />
        </div>
      ) : (
        // Single full-screen image
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/resort.jpg)" }}
        />
      )}

      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Centered text content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-8 z-10">
          <h1 className=" text-5xl md:text-7xl lg:text-8xl text-white mb-6">
            {title}
          </h1>
        </div>
      </div>
    </section>
  );
}

export default function FeaturedProperties() {
  // Sample properties - replace with your actual data
  const properties = [
    { id: 1, image: "/resort.jpg", name: "Property 1" },
    { id: 2, image: "/resort.jpg", name: "Property 2" },
    { id: 3, image: "/resort.jpg", name: "Property 3" },
    { id: 4, image: "/resort.jpg", name: "Property 4" },
    { id: 5, image: "/resort.jpg", name: "Property 5" },
    { id: 6, image: "/resort.jpg", name: "Property 6" },
  ];

  return (
    <section className="w-screen h-screen flex flex-col justify-center bg-primary-foreground px-8 md:px-16 lg:px-24">
      {/* Title and Description */}
      <div className="mb-8 md:mb-12">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-gradient-primary">
          Featured Properties
        </h2>
        <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl">
          Discover our handpicked selection of exceptional properties, 
          each offering unique experiences and unparalleled comfort.
        </p>
      </div>

      {/* Horizontal Scrolling Properties */}
      <div className="overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div className="flex gap-6 pb-4">
          {properties.map((property) => (
            <div
              key={property.id}
              className="flex-shrink-0 w-[300px] h-[400px] md:w-[350px] md:h-[450px] lg:w-[400px] lg:h-[500px] rounded-lg overflow-hidden bg-cover bg-center hover:scale-105 transition-transform duration-300 cursor-pointer"
              style={{ backgroundImage: `url(${property.image})` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

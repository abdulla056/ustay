import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Star } from "lucide-react";

export default function Testimonials() {
  // Sample testimonials - replace with your actual data
  const testimonials = [
    {
      id: 1,
      name: "Sarah Johnson",
      location: "New York, USA",
      review:
        "An unforgettable experience! The property exceeded all expectations. The attention to detail and exceptional service made our stay truly memorable.",
      rating: 5,
    },
    {
      id: 2,
      name: "Michael Chen",
      location: "Singapore",
      review:
        "Perfect getaway destination. Beautiful property, amazing amenities, and wonderful staff. We'll definitely be coming back!",
      rating: 5,
    },
    {
      id: 3,
      name: "Emma Williams",
      location: "London, UK",
      review:
        "Absolutely stunning! From the moment we arrived, everything was perfect. The views, the comfort, the hospitality - everything was world-class.",
      rating: 5,
    },
  ];

  return (
    <section className="w-screen h-screen flex flex-col justify-center bg-background px-8 md:px-16 lg:px-24 py-20">
      {/* Title */}
      <div className="mb-12 text-center">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-gradient-primary">
          What Our Guests Say
        </h2>
        <p className="text-lg md:text-xl text-muted-foreground">
          Real experiences from real travelers
        </p>
      </div>

      {/* Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto w-full">
        {testimonials.map((testimonial) => (
          <Card
            key={testimonial.id}
            // className="hover:shadow-xl transition-shadow duration-300"
          >
            <CardHeader>
              {/* Rating Stars */}
              <div className="flex gap-1 mb-2">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 text-yellow-500 fill-yellow-500"
                  />
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {/* Review Text */}
              <CardDescription className="text-sm md:text-base leading-relaxed">
                "{testimonial.review}"
              </CardDescription>
            </CardContent>
            <CardFooter className="flex-col items-start">
              <CardTitle className="text-base">{testimonial.name}</CardTitle>
              <CardDescription className="text-sm">
                {testimonial.location}
              </CardDescription>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}

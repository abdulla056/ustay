import { Button } from "../ui/button";

interface Header {
  variation?: "home" | "microsite";
}

export default function Header({ variation = "home" }: Header) {
  return (
    <div
      className="w-screen h-auto aspect-[16/9] bg-cover bg-center bg-no-repeat justify-center flex items-center relative"
      style={{ backgroundImage: "url(/resort.jpg)" }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
      <div className="flex flex-col">
        <div className="flex flex-row justify-end align-bottom gap-2">
          <span className="title text-gradient-primary self-end">UStay</span>
            <h1 className="font-light italic text-white self-end">Properties</h1>
        </div>
        <Button className="relative z-10">
          {" "}
          {variation === "home"
            ? "This is home button"
            : "This is other button"}
        </Button>
      </div>
    </div>
  );
}

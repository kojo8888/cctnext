import { CMS_NAME } from "../lib/constants";

export default function Intro() {
  return (
    <section className="flex-col md:flex-row flex items-center md:justify-between mt-16 mb-16 md:mb-12 font-mono">
      <h1 className="text-5xl md:text-8xl font-bold tracking-tighter leading-tight md:pr-8">
        Tips & Tricks.
      </h1>
      <h1 className="text-center md:text-left text-lg mt-14 md:pl-8">
        Ein Blog zum Thema Rennradfahren.
      </h1>
    </section>
  );
}

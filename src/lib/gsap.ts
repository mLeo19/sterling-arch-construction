import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// gsap/ScrollTrigger touch the DOM, so this module must only ever run in the
// browser. Every file that imports it is a "use client" component, but we
// still guard here in case of SSR module evaluation, and so the plugins are
// registered exactly once no matter how many components import this file.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export { gsap, ScrollTrigger };

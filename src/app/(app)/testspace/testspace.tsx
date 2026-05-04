"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";
import type { CSSProperties } from "react";

import { PageHeader } from "@/components/ui/page-header";
import type { DailyRunVisit } from "@/lib/db/daily-run";

const mowerPath =
  "M 58 38 L 58 399 C 58 412 68 422 81 422 L 98 422 C 111 422 121 412 121 399 L 121 38 C 121 25 131 15 144 15 L 161 15 C 174 15 184 25 184 38 L 184 399 C 184 412 194 422 207 422 L 224 422 C 237 422 247 412 247 399 L 247 38 C 247 25 257 15 270 15 L 287 15 C 300 15 310 25 310 38 L 310 399 C 310 412 320 422 333 422 L 350 422 C 363 422 373 412 373 399 L 373 38";

export function Testspace({ previewVisit }: { previewVisit: DailyRunVisit | null }) {
  void previewVisit;
  const progress = useMotionValue(0);
  const offsetDistance = useTransform(progress, (value) => `${value * 100}%`);
  const mowerScale = useTransform(progress, [0, 1], [1.25, 1]);
  const mowerTrackStyle = {
    offsetDistance,
    scale: mowerScale,
    offsetPath: `path("${mowerPath}")`,
    offsetRotate: "auto 90deg",
    WebkitOffsetPath: `path("${mowerPath}")`,
    WebkitOffsetRotate: "auto 90deg",
  } as CSSProperties;

  useEffect(() => {
    const controls = animate(progress, 1, {
      duration: 8,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
    });
    return () => controls.stop();
  }, [progress]);

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title="Testspace"
        description="Workspace for roughing in and reviewing new view ideas before promoting them into app structure."
      />

      <section className="-mx-4 md:-mx-6 lg:-mx-8">
        <div className="min-h-[calc(100vh-13rem)] border-y border-emerald-200/80 bg-gradient-to-b from-[#eef5ef] to-[#dce8de] p-4 sm:p-6">
          <div className="relative h-[calc(100vh-17rem)] min-h-[440px] w-full rounded-xl border border-emerald-200/80 bg-white/70 shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 451 437"
              className="absolute inset-0 h-full w-full p-6"
              aria-hidden="true"
            >
              <rect x="24" y="24" width="403" height="389" rx="22" fill="#1f5f34" />
              <motion.path
                d={mowerPath}
                fill="transparent"
                strokeWidth="38"
                stroke="#7fd86a"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pathLength: progress }}
              />
              <motion.path
                d={mowerPath}
                fill="transparent"
                strokeWidth="4"
                stroke="rgba(217,246,196,0.35)"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ pathLength: progress }}
              />
            </svg>

            <motion.div
              className="absolute left-0 top-0 h-14 w-14"
              style={mowerTrackStyle}
            >
              <div className="h-full w-full rounded-full border border-[#4fa936] bg-gradient-to-b from-[#8be266] via-[#66cc33] to-[#2e9e2e] p-2 shadow-[0_4px_0_#2a7a2f,0_6px_10px_rgba(18,75,30,0.28)]">
                <div
                  className="h-full w-full"
                  style={{
                    backgroundColor: "#ffffff",
                    WebkitMaskImage: "url('/LOAM_Mower_Icon.svg')",
                    maskImage: "url('/LOAM_Mower_Icon.svg')",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

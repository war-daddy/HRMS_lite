import React from "react";

function Svg(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export const IconGrid = (p: React.SVGProps<SVGSVGElement>) => (
  <Svg className={`icon ${p.className || ""}`} {...p}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="8" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
    <rect x="13" y="13" width="8" height="8" rx="2" />
  </Svg>
);

export const IconUsers = (p: React.SVGProps<SVGSVGElement>) => (
  <Svg className={`icon ${p.className || ""}`} {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="3" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a3 3 0 0 1 0 5.75" />
  </Svg>
);

export const IconCalendar = (p: React.SVGProps<SVGSVGElement>) => (
  <Svg className={`icon ${p.className || ""}`} {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </Svg>
);

export const IconPlus = (p: React.SVGProps<SVGSVGElement>) => (
  <Svg className={`icon ${p.className || ""}`} {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Svg>
);


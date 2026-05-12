import localFont from "next/font/local";

export const gtPlanar = localFont({
  src: [
    {
      path: "../../fonts/GT-Planar-Regular-Trial.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-planar",
  display: "swap",
});

export const gtAmerica = localFont({
  src: [
    {
      path: "../../fonts/GT-America-Standard-Regular-Trial.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/GT-America-Standard-Regular-Italic-Trial.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-marketing",
  display: "swap",
});

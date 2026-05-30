import { Metadata } from "next";

export const generateMetadata = ({
  title = `${process.env.NEXT_PUBLIC_APP_NAME ?? "NammaMarga"} - AI-Powered Civic Infrastructure for Bangalore`,
  description = `${process.env.NEXT_PUBLIC_APP_NAME ?? "NammaMarga"} helps citizens report civic issues, BBMP track resolution, and communities verify fixes — powered by AI.`,
  image = "/thumbnail.png",
  icons = {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string | null;
  icons?: Metadata["icons"];
  noIndex?: boolean;
} = {}): Metadata => ({
  title,
  description,
  icons,
  openGraph: {
    title,
    description,
    ...(image && { images: [{ url: image }] }),
  },
  twitter: {
    title,
    description,
    ...(image && { card: "summary_large_image", images: [image] }),
  },
  ...(noIndex && { robots: { index: false, follow: false } }),
});

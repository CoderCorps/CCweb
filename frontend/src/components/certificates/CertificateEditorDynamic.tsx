import dynamic from "next/dynamic";

export const CertificateCanvasEditor = dynamic(
  () => import("./CertificateCanvasEditor"),
  { ssr: false }
);


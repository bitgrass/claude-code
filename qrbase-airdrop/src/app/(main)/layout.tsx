import { Providers } from "@/components/Providers";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}

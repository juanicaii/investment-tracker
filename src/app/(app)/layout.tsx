import { Nav } from "@/components/nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="mx-auto px-6 py-8 max-w-7xl">{children}</main>
    </div>
  );
}

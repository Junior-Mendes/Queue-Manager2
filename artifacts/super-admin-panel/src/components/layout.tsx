import { Link, useLocation } from "wouter";
import { UserButton, useUser } from "@clerk/react";
import { LayoutDashboard, Building2, FileText, Shield, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const nav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tenants", href: "/tenants", icon: Building2 },
  { name: "Plans", href: "/plans", icon: FileText },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();

  const NavLinks = () => (
    <>
      <div className="flex h-14 items-center border-b px-6">
        <Shield className="h-5 w-5 mr-2 text-sidebar-primary" />
        <span className="text-lg font-bold text-sidebar-foreground">SaaS Admin</span>
      </div>
      <nav className="grid gap-1 px-4 py-4">
        {nav.map((item) => {
          const isActive = location === item.href || location === item.href + "/";
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
              data-testid={`link-nav-${item.name.toLowerCase()}`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Sidebar for desktop */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-sidebar sm:flex">
        <NavLinks />
        <div className="mt-auto border-t border-sidebar-border p-4 flex items-center gap-3">
          <UserButton />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium text-sidebar-foreground truncate">{user?.fullName || "User"}</span>
            <span className="text-xs text-sidebar-foreground/60 truncate">{user?.primaryEmailAddress?.emailAddress}</span>
          </div>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar">
              <NavLinks />
            </SheetContent>
          </Sheet>
          <span className="text-lg font-bold">SaaS Admin</span>
          <div className="ml-auto">
            <UserButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}

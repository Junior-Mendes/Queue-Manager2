import { Link, useLocation } from "wouter";
import { UserButton, useUser } from "@clerk/react";
import {
  LayoutDashboard,
  Store,
  Users,
  Scissors,
  Calendar,
  ListOrdered,
  Settings,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const allNav = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["tenant_admin", "operator"] },
  { name: "Queues", href: "/queue", icon: ListOrdered, roles: ["tenant_admin", "operator"] },
  { name: "Appointments", href: "/appointments", icon: Calendar, roles: ["tenant_admin", "operator"] },
  { name: "Businesses", href: "/businesses", icon: Store, roles: ["tenant_admin"] },
  { name: "Services", href: "/services", icon: Scissors, roles: ["tenant_admin"] },
  { name: "Professionals", href: "/professionals", icon: Users, roles: ["tenant_admin"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["tenant_admin", "operator"] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const role = (user?.publicMetadata?.role as string) || "operator";

  const navigation = allNav.filter((item) => item.roles.includes(role));

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const isActive = location === item.href || location === item.href + "/";
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            data-testid={`link-nav-${item.name.toLowerCase()}`}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Sidebar for desktop */}
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-14 items-center border-b px-6">
          <span className="text-lg font-bold">SalonPanel</span>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-4">
            <NavLinks />
          </nav>
        </div>
        <div className="mt-auto border-t p-4 flex items-center gap-3">
          <UserButton />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.fullName || "User"}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</span>
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
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-14 items-center border-b px-6">
                <span className="text-lg font-bold">SalonPanel</span>
              </div>
              <nav className="grid gap-1 p-4">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>
          <span className="text-lg font-bold">SalonPanel</span>
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

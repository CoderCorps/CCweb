import os

path = "frontend/src/app/(platform)/layout.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update lucide-react imports to include Menu and X
old_lucide = """import {
  LayoutDashboard,
  FolderGit2,
  UserCircle,
  ClipboardList,
  LogOut,
  Terminal,
  ChevronRight,
  Settings,
  Users,
  FileText,
  Award
} from "lucide-react";"""

new_lucide = """import {
  LayoutDashboard,
  FolderGit2,
  UserCircle,
  ClipboardList,
  LogOut,
  Terminal,
  ChevronRight,
  Settings,
  Users,
  FileText,
  Award,
  Menu,
  X
} from "lucide-react";"""

assert old_lucide in content, "old_lucide not found"
content = content.replace(old_lucide, new_lucide, 1)

# 2. Add mobileMenuOpen and isMac state
old_state = "  const [cmdOpen, setCmdOpen] = useState(false);"
new_state = """  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Detect OS for keyboard shortcut hint
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.userAgent));
    }
  }, []);"""

assert old_state in content, "old_state not found"
content = content.replace(old_state, new_state, 1)

# 3. Update aside element and add backdrop overlay
old_aside = """      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border bg-muted/30 dark:bg-card/95 backdrop-blur-md flex flex-col justify-between fixed top-0 bottom-0 left-0 z-30">
        <div>
          {/* Brand header */}
          <div className="h-16 flex items-center px-6 border-b border-border">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={32} height={32} className="object-contain" style={{ height: "auto" }} unoptimized priority />
              <span className="font-bold text-lg text-foreground">Coder<span className="text-primary">Corps</span></span>
            </Link>
          </div>"""

new_aside = """      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`w-64 border-r border-border bg-card/95 backdrop-blur-md flex flex-col justify-between fixed top-0 bottom-0 left-0 z-50 md:z-30 transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
        aria-label="Platform Sidebar Navigation"
      >
        <div>
          {/* Brand header with mobile close button */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-border">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={32} height={32} className="object-contain" style={{ height: "auto" }} unoptimized priority />
              <span className="font-bold text-lg text-foreground">Coder<span className="text-primary">Corps</span></span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>"""

assert old_aside in content, "old_aside not found"
content = content.replace(old_aside, new_aside, 1)

# 4. Update main content wrapper pl-0 md:pl-64 and header with hamburger
old_main = """      {/* Main Content Area */}
      <div className="grow pl-64 min-h-screen flex flex-col">
        {/* Top bar header */}
        <header className="h-16 border-b border-border/40 bg-card/60 backdrop-blur-sm sticky top-0 flex items-center justify-between px-8 z-20">
          <h2 className="text-sm font-semibold text-foreground font-mono uppercase tracking-wider">
            {pathname === "/dashboard" ? "ENGINEERING DASHBOARD"
              : pathname === "/today" ? "TODAY'S STANDUP"
                : pathname.startsWith("/projects") ? "LABS WORKSPACE"
                  : pathname.startsWith("/portfolio") ? "MY PORTFOLIO"
                    : pathname.startsWith("/settings") ? "ACCOUNT SETTINGS"
                      : pathname === "/mentor/reviews" ? "REVIEWS BOARD"
                        : pathname === "/mentor/reports" ? "STANDUP REPORTS"
                          : pathname === "/mentor/students" ? "STUDENTS ROSTER"
                            : pathname.startsWith("/messages") ? "DIRECT MESSAGES"
                              : "CODERCORPS PLATFORM"}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono hover:text-foreground transition-colors border border-border/40 rounded px-2 py-1 bg-card/40 hover:bg-card/80"
              title="Open command palette"
            >
              <span>⌘K</span>
            </button>
            <span className="text-xs text-muted-foreground font-mono hidden sm:block">
              STATUS: <span className="text-emerald-400">ACTIVE</span>
            </span>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Dynamic page contents */}
        <main className="grow p-8">
          {children}
        </main>
      </div>"""

new_main = """      {/* Main Content Area */}
      <div className="grow pl-0 md:pl-64 min-h-screen flex flex-col w-full">
        {/* Top bar header */}
        <header className="h-16 border-b border-border/40 bg-card/60 backdrop-blur-sm sticky top-0 flex items-center justify-between px-4 sm:px-8 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-xs sm:text-sm font-semibold text-foreground font-mono uppercase tracking-wider truncate">
              {pathname === "/dashboard" ? "ENGINEERING DASHBOARD"
                : pathname === "/today" ? "TODAY'S STANDUP"
                  : pathname.startsWith("/projects") ? "LABS WORKSPACE"
                    : pathname.startsWith("/portfolio") ? "MY PORTFOLIO"
                      : pathname.startsWith("/settings") ? "ACCOUNT SETTINGS"
                        : pathname === "/mentor/reviews" ? "REVIEWS BOARD"
                          : pathname === "/mentor/reports" ? "STANDUP REPORTS"
                            : pathname === "/mentor/students" ? "STUDENTS ROSTER"
                              : pathname.startsWith("/messages") ? "DIRECT MESSAGES"
                                : "CODERCORPS PLATFORM"}
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-mono hover:text-foreground transition-colors border border-border/40 rounded px-2 py-1 bg-card/40 hover:bg-card/80"
              title="Open command palette"
            >
              <span>{isMac ? "⌘K" : "Ctrl+K"}</span>
            </button>
            <span className="text-xs text-muted-foreground font-mono hidden lg:block">
              STATUS: <span className="text-emerald-400">ACTIVE</span>
            </span>
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Dynamic page contents */}
        <main className="grow p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>"""

assert old_main in content, "old_main not found"
content = content.replace(old_main, new_main, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS: layout.tsx mobile sidebar fixed!")

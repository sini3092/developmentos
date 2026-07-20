export type NavItemConfig = {
  title: string
  href: string
  badge?: number
  icon:
    | "home"
    | "inbox"
    | "projects"
    | "calendar"
    | "settings"
    | "tasks"
    | "roadmap"
    | "chat"
    | "github"
}

export const mainNavItems: NavItemConfig[] = [
  { title: "Home", href: "/", icon: "home" },
  { title: "Inbox", href: "/inbox", icon: "inbox" },
]

export const projectNavItems: NavItemConfig[] = [
  { title: "Projects", href: "/projects", icon: "projects" },
]

export const secondaryNavItems: NavItemConfig[] = [
  { title: "Calendar", href: "/calendar", icon: "calendar" },
]

export const settingsNavItem: NavItemConfig = {
  title: "Settings",
  href: "/settings",
  icon: "settings",
}

export const projectSectionNav = [
  { title: "Overview", href: "overview", icon: "home" },
  { title: "Tasks", href: "tasks", icon: "tasks" },
  { title: "Roadmap", href: "roadmap", icon: "roadmap" },
  { title: "Chat", href: "channels", icon: "chat" },
  { title: "GitHub", href: "github", icon: "github" },
] as const satisfies ReadonlyArray<{
  title: string
  href: string
  icon: NavItemConfig["icon"]
}>

export type ProjectSectionNavItem = (typeof projectSectionNav)[number]

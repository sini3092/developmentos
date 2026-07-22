import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  BookOpen,
  Calendar,
  FolderKanban,
  GitBranch,
  Home,
  Inbox,
  ListTodo,
  MessageSquare,
  ScrollText,
  Settings,
} from "lucide-react"

import type { NavItemConfig, ProjectSectionNavItem } from "@/lib/constants/navigation"

export const navIcons: Record<NavItemConfig["icon"], LucideIcon> = {
  home: Home,
  inbox: Inbox,
  projects: FolderKanban,
  calendar: Calendar,
  settings: Settings,
  tasks: ListTodo,
  roadmap: BarChart3,
  chat: MessageSquare,
  github: GitBranch,
  lore: ScrollText,
  design: BookOpen,
}

export function getNavIcon(icon: NavItemConfig["icon"] | ProjectSectionNavItem["icon"]) {
  return navIcons[icon]
}

import { BookOpen } from "lucide-react"

import {
  DesignDocumentEditor,
  DesignDocumentHeader,
} from "@/components/knowledge/design-document-editor"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { requireProject } from "@/lib/auth/project-context"
import { requireDesignDocument } from "@/lib/auth/knowledge-context"

type DesignDocumentPageProps = {
  params: Promise<{ slug: string; docSlug: string }>
}

export default async function DesignDocumentPage({ params }: DesignDocumentPageProps) {
  const { slug, docSlug } = await params
  const { project, canManage, currentMembership } = await requireProject(slug)
  const document = await requireDesignDocument(project.id, docSlug)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={document.title}
        description={document.summary ?? "Design document"}
        icon={BookOpen}
      >
        <DesignDocumentHeader slug={slug} />
      </PageHeader>
      <ProjectNav slug={slug} canManage={canManage} />
      <DesignDocumentEditor document={document} slug={slug} canEdit={canEdit} />
    </div>
  )
}

import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ProjectSidebar } from "@/components/ProjectSidebar";
import { ProjectHeader } from "@/components/ProjectHeader";

interface Props {
  children: ReactNode;
  projectId: string;
  projectName: string;
  projectDomain: string | null;
}

export const ProjectLayout = ({ children, projectId, projectName, projectDomain }: Props) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <ProjectSidebar projectId={projectId} />
        <div className="flex-1 flex flex-col">
          <ProjectHeader projectName={projectName} projectDomain={projectDomain} />
          <main className="flex-1 overflow-auto bg-muted/10">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

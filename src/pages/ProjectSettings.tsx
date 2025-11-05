import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { AlertTriangle } from "lucide-react";

interface Props {
  projectId: string;
  projectName: string;
}

export const ProjectSettings = ({ projectId, projectName }: Props) => {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2">Settings</h2>
        <p className="text-muted-foreground">Manage your project settings and preferences</p>
      </div>

      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Irreversible actions that will permanently affect your project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <p className="font-medium">Delete this project</p>
              <p className="text-sm text-muted-foreground">
                Once deleted, this project and all its data cannot be recovered.
              </p>
            </div>
            <DeleteProjectDialog projectId={projectId} projectName={projectName} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

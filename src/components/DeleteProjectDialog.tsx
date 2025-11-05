import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  projectName: string;
}

export const DeleteProjectDialog = ({ projectId, projectName }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== projectName) {
      toast({
        variant: "destructive",
        title: "Project name doesn't match",
        description: "Please type the exact project name to confirm deletion.",
      });
      return;
    }

    setDeleting(true);

    try {
      // Delete all related data (cascade will handle most of this via RLS)
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      toast({
        title: "Project deleted",
        description: "The project and all its data have been permanently deleted.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to delete project",
        description: error.message,
      });
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete Project
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              This action cannot be undone. This will permanently delete the project{" "}
              <span className="font-semibold text-foreground">{projectName}</span> and all
              associated data including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Google Search Console connections</li>
              <li>GSC query data</li>
              <li>Keyword clusters</li>
              <li>Page speed metrics</li>
              <li>Competitors</li>
              <li>Content briefs</li>
              <li>Tasks and sync schedules</li>
            </ul>
            <div className="space-y-2 pt-4">
              <Label htmlFor="confirm">
                Type <span className="font-semibold">{projectName}</span> to confirm:
              </Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={projectName}
                disabled={deleting}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={confirmText !== projectName || deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Project"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

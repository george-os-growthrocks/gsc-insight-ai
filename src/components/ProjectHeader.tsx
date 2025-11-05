import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ArrowLeft, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import logo from "@/assets/logo.png";

interface Props {
  projectName: string;
  projectDomain: string | null;
}

export const ProjectHeader = ({ projectName, projectDomain }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <header className="h-14 border-b bg-background flex items-center px-4 gap-4">
      <SidebarTrigger />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/dashboard")}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back</span>
      </Button>
      
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <img src={logo} alt="" className="h-5 w-5 flex-shrink-0" />
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-bold truncate">{projectName}</h1>
          {projectDomain && (
            <>
              <span className="text-muted-foreground hidden sm:inline">·</span>
              <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                {projectDomain}
              </span>
            </>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleSignOut}>
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const GscCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");

    if (error) {
      toast({
        variant: "destructive",
        title: "Authorization failed",
        description: error,
      });
      navigate("/dashboard");
      return;
    }

    if (!code) {
      toast({
        variant: "destructive",
        title: "No authorization code",
        description: "Missing authorization code from Google",
      });
      navigate("/dashboard");
      return;
    }

    try {
      const stateJson = sessionStorage.getItem("gsc_oauth_state");
      if (!stateJson) {
        throw new Error("OAuth state not found");
      }

      const state = JSON.parse(stateJson);
      sessionStorage.removeItem("gsc_oauth_state");

      // Exchange code for tokens
      const { error: exchangeError } = await supabase.functions.invoke("gsc-oauth", {
        body: {
          action: "exchange_code",
          code,
          projectId: state.projectId,
          userId: state.userId,
          propertyUrl: state.propertyUrl,
          redirectUri: state.redirectUri,
        },
      });

      if (exchangeError) throw exchangeError;

      toast({
        title: "Connected!",
        description: "Google Search Console connected successfully",
      });

      navigate(`/project/${state.projectId}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: error.message,
      });
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-lg">Connecting to Google Search Console...</p>
      </div>
    </div>
  );
};

export default GscCallback;

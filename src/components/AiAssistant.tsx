import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  projectId: string;
}

export const AiAssistant = ({ projectId }: Props) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("seo-assistant", {
        body: {
          messages: [...messages, userMessage],
          projectId,
        },
      });

      if (error) throw error;

      if (data?.response) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error("Error calling AI:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to get AI response",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">SEO AI Assistant</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Ask me anything about your SEO strategy, tasks, or best practices. I'm trained as an SEO
          Manager to help you prioritize and execute tasks effectively.
        </p>

        <div className="space-y-4">
          <ScrollArea className="h-[400px] w-full border rounded-lg p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Start a conversation with your SEO AI Assistant
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground ml-8"
                        : "bg-muted mr-8"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
                {loading && (
                  <div className="p-4 rounded-lg bg-muted mr-8">
                    <p className="text-sm text-muted-foreground">Thinking...</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about SEO strategies, task prioritization, or next steps..."
              rows={3}
              className="resize-none"
            />
            <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-muted/50">
        <h4 className="font-semibold mb-2">Example questions:</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>What should I prioritize first based on my current tasks?</li>
          <li>How can I improve my featured snippet opportunities?</li>
          <li>What's the best approach to fix cannibalization issues?</li>
          <li>How do I optimize for quick win keywords?</li>
          <li>What content should I create for low CTR pages?</li>
        </ul>
      </Card>
    </div>
  );
};

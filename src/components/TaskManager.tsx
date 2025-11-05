import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, Circle, Trash2, MessageSquare } from "lucide-react";

interface Task {
  id: string;
  type: string;
  priority: number;
  page: string;
  query: string | null;
  reason: string;
  recommendation: string;
  status: string;
  comments: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  position: number | null;
  created_at: string;
}

interface Props {
  projectId: string;
}

export const TaskManager = ({ projectId }: Props) => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComments, setEditComments] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seo_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading tasks",
        description: error.message,
      });
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from("seo_tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating task",
        description: error.message,
      });
    } else {
      fetchTasks();
      toast({
        title: "Task updated",
        description: `Status changed to ${newStatus}`,
      });
    }
  };

  const updateTaskComments = async (taskId: string) => {
    const { error } = await supabase
      .from("seo_tasks")
      .update({ comments: editComments })
      .eq("id", taskId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating comments",
        description: error.message,
      });
    } else {
      fetchTasks();
      setEditingId(null);
      setEditComments("");
      toast({
        title: "Comments saved",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("seo_tasks").delete().eq("id", taskId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error deleting task",
        description: error.message,
      });
    } else {
      fetchTasks();
      toast({
        title: "Task deleted",
      });
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 85) return "destructive";
    if (priority >= 70) return "default";
    return "secondary";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in_progress":
        return "outline";
      default:
        return "secondary";
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    if (filterType !== "all" && task.type !== filterType) return false;
    return true;
  });

  const taskTypes = Array.from(new Set(tasks.map((t) => t.type)));

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {taskTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {filteredTasks.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            No tasks yet. Analyze GSC data to generate SEO tasks.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="p-6 hover:shadow-elevated transition-all">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getPriorityColor(task.priority)}>
                        Priority: {task.priority}
                      </Badge>
                      <Badge variant="outline">{task.type}</Badge>
                      <Badge variant={getStatusColor(task.status)}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg">{task.page}</h3>
                    {task.query && (
                      <p className="text-sm text-muted-foreground">Query: {task.query}</p>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-sm font-medium mb-1">Reason:</p>
                        <p className="text-sm text-muted-foreground">{task.reason}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">Recommendation:</p>
                        <p className="text-sm text-muted-foreground">{task.recommendation}</p>
                      </div>
                    </div>
                    {(task.impressions || task.clicks || task.ctr || task.position) && (
                      <div className="flex gap-4 text-xs text-muted-foreground pt-2">
                        {task.impressions && <span>Impressions: {task.impressions}</span>}
                        {task.clicks && <span>Clicks: {task.clicks}</span>}
                        {task.ctr && <span>CTR: {(task.ctr * 100).toFixed(2)}%</span>}
                        {task.position && <span>Position: {task.position.toFixed(1)}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {task.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskStatus(task.id, "in_progress")}
                      >
                        <Circle className="h-4 w-4 mr-2" />
                        Start
                      </Button>
                    ) : task.status === "in_progress" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskStatus(task.id, "completed")}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateTaskStatus(task.id, "pending")}
                      >
                        Reopen
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  {editingId === task.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editComments}
                        onChange={(e) => setEditComments(e.target.value)}
                        placeholder="Add comments..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateTaskComments(task.id)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditComments("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {task.comments ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Comments:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {task.comments}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(task.id);
                              setEditComments(task.comments || "");
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Edit Comments
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(task.id);
                            setEditComments("");
                          }}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Add Comments
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

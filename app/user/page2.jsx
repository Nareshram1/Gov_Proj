"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function UserPage() {
  const [tasks, setTasks] = useState([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Retrieve user from session storage
    const storedUser = sessionStorage.getItem("user");
    if (!storedUser) {
      router.replace("/"); // Redirect if no user session
      return;
    }

    const userData = JSON.parse(storedUser);
    setUser(userData);

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, status, coordinates, due_date")
        .eq("assigned_to", userData.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching tasks:", error);
      } else {
        setTasks(data);
      }
    };

    fetchTasks();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("user"); // Clear session
    router.replace("/"); // Redirect to login
  };

  const handleUpload = async (taskId, file) => {
    if (typeof window === "undefined") return;

    const { data, error } = await supabase.storage
      .from("task_documents")
      .upload(`documents/${taskId}/${file.name}`, file);
    
    if (error) {
      console.error("Error uploading file:", error);
      return;
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ document: data.path })
      .eq("id", taskId);

    if (updateError) {
      console.error("Error updating task with document:", updateError);
    } else {
      setTasks(tasks.map(task => task.id === taskId ? { ...task, document: data.path } : task));
    }
  };

  const handleUpdateStatus = async (taskId) => {
    if (typeof window === "undefined") return;

    const { error } = await supabase
      .from("tasks")
      .update({ status: "in_progress" })
      .eq("id", taskId);

    if (error) {
      console.error("Error updating task status:", error);
    } else {
      setTasks(tasks.map(task => task.id === taskId ? { ...task, status: "in_progress" } : task));
    }
  };

  if (!user) return <p>Loading...</p>;

  const filteredTasks = tasks.filter(task => 
    taskStatusFilter === "all" || task.status === taskStatusFilter
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-xl p-6 w-full max-w-4xl mx-auto">
        
        {/* Welcome Message & Logout Button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-700">
            Welcome, {user.username} 🎉
          </h2>
          <button 
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>

        {/* Task Filter Dropdown */}
        <select
          className="p-2 border border-gray-300 rounded-lg mb-4"
          value={taskStatusFilter}
          onChange={(e) => setTaskStatusFilter(e.target.value)}
        >
          <option value="all">All Tasks</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        
        {/* Task Display */}
        <div className="grid grid-cols-2 gap-4">
          {filteredTasks.map(task => {
            const isDisabled = task.status === "in_progress";

            return (
              <div 
                key={task.id} 
                className={`p-4 rounded-md shadow-lg bg-gray-200 ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <h3 className="font-semibold">{task.title}</h3>
                <p className="text-sm">{task.description}</p>
                <p className="text-sm">Due: {task.due_date}</p>
                <p className="text-sm">Location: {task.coordinates}</p>
                <p className="text-sm font-medium">Status: {task.status}</p>
                
                <input 
                  type="file" 
                  className="mt-2 w-full p-2 border rounded-lg" 
                  onChange={(e) => handleUpload(task.id, e.target.files[0])} 
                  disabled={isDisabled}
                />
                
                <button 
                  onClick={() => handleUpdateStatus(task.id)} 
                  className="mt-2 w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
                  disabled={isDisabled || task.status === "in_progress" || task.status === "completed"}
                >
                  Mark as In Progress
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

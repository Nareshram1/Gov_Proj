"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Dynamically import MapContainer component with no SSR
const MapWithNoSSR = dynamic(
  () => import('./MapComponent'),
  { ssr: false }
);

export default function AdminPage() {
  const router = useRouter();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [taskCoordinates, setTaskCoordinates] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("assign");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    // Set isClient to true once component mounts
    setIsClient(true);
    
    // Check for user session and set user data
    const storedUser = sessionStorage?.getItem("user");
    if (!storedUser) {
      router.replace("/"); // Redirect if no user session
      return;
    }
    
    const userData = JSON.parse(storedUser);
    setUser(userData);
    
    // Fetch users from the "users" table
    const fetchUsers = async () => {
      const { data: usersData, error } = await supabase
        .from("users")
        .select("id, username")
        .eq("is_admin", false)
        .eq("department", userData.department);

      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setUsers(usersData);
      }
    };

    // Fetch tasks with a join to get the assigned user's name
    const fetchTasks = async () => {
      const { data: tasksData, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          assigned_by,
          assigned_to,
          coordinates,
          due_date,
          updated_at
        `)
        .eq("assigned_by", userData.id)
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("Error fetching tasks:", error);
      } else {
        setTasks(tasksData);
      }
    };

    fetchUsers();
    fetchTasks();
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("user"); // Clear session
      router.replace("/"); // Redirect to login
    }
  };

  const handleAssignTask = async () => {
    if (!taskTitle.trim() || !taskDescription.trim() || !selectedUser || !taskCoordinates || !taskDueDate) {
      alert("Please fill all required fields");
      return;
    }
    
    if (!user) return;
    
    const adminId = user.id;

    const { data, error } = await supabase
      .from("tasks")
      .insert([
        {
          title: taskTitle,
          description: taskDescription,
          assigned_by: adminId,
          assigned_to: selectedUser,
          status: "pending",
          coordinates: taskCoordinates,
          due_date: taskDueDate,
        },
      ]);

    if (error) {
      console.error("Error assigning task:", error);
      alert("Failed to assign task");
    } else {
      // Reload tasks after insertion
      const { data: updatedTasks, error: fetchError } = await supabase
        .from("tasks")
        .select()
        .eq("assigned_by", adminId)
        .order("updated_at", { ascending: false });
        
      if (!fetchError) {
        setTasks(updatedTasks);
      }
      
      // Reset form
      setTaskTitle("");
      setTaskDescription("");
      setSelectedUser("");
      setTaskCoordinates("");
      setTaskDueDate("");
      setShowLocationPicker(false);
      alert("Task assigned successfully");
    }
  };

  const handleLocationConfirm = (coordinates) => {
    setTaskCoordinates(coordinates);
    setShowLocationPicker(false);
  };

  const filteredTasks = tasks.filter(task => 
    taskStatusFilter === "all" || task.status === taskStatusFilter
  );

  const updateTaskStatus = async (taskId, status) => {
    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId);
      
    if (error) {
      console.error("Error updating task status:", error);
      alert("Failed to update task status");
    } else {
      setTasks(tasks.map(task => (task.id === taskId ? { ...task, status } : task)));
    }
  };
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Show loading state until client-side code runs
  if (!isClient || !user) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md p-4">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">Admin Dashboard</h1>
            </div>
            
            {/* Welcome message and logout button */}
            <div className="flex items-center">
              <h2 className="hidden sm:block text-sm lg:text-lg font-semibold text-gray-700 mr-2 sm:mr-4">
                Welcome, {user.username} 🎉
              </h2>
              <button 
                className="bg-red-500 text-white px-2 py-1 sm:px-4 sm:py-2 text-sm rounded-lg hover:bg-red-600"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="mt-2 sm:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center px-3 py-2 border rounded text-gray-700 border-gray-400 hover:text-gray-900 hover:border-gray-900"
            >
              <span className="sr-only">Open menu</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
              <span className="ml-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
            </button>
          </div>
          
          {/* Mobile menu */}
          <div className={`${mobileMenuOpen ? 'block' : 'hidden'} sm:hidden mt-2`}>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => handleTabChange("assign")}
                className={`px-3 py-2 rounded-md text-sm font-medium text-left 
                  ${activeTab === "assign" 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-600 hover:bg-gray-200"}`}
              >
                Assign Task
              </button>
              <button
                onClick={() => handleTabChange("view")}
                className={`px-3 py-2 rounded-md text-sm font-medium text-left
                  ${activeTab === "view" 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-600 hover:bg-gray-200"}`}
              >
                Task Viewer
              </button>
              <button
                onClick={() => handleTabChange("requests")}
                className={`px-3 py-2 rounded-md text-sm font-medium text-left
                  ${activeTab === "requests" 
                    ? "bg-blue-600 text-white" 
                    : "text-gray-600 hover:bg-gray-200"}`}
              >
                Requests
              </button>
            </div>
          </div>

          {/* Desktop Tab navigation */}
          <div className="hidden sm:flex mt-4 space-x-4">
            <button
              onClick={() => setActiveTab("assign")}
              className={`px-3 py-2 rounded-md text-sm font-medium 
                ${activeTab === "assign" 
                  ? "bg-blue-600 text-white" 
                  : "text-gray-600 hover:bg-gray-200"}`}
            >
              Assign Task
            </button>
            <button
              onClick={() => setActiveTab("view")}
              className={`px-3 py-2 rounded-md text-sm font-medium 
                ${activeTab === "view" 
                  ? "bg-blue-600 text-white" 
                  : "text-gray-600 hover:bg-gray-200"}`}
            >
              Task Viewer
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-3 py-2 rounded-md text-sm font-medium 
                ${activeTab === "requests" 
                  ? "bg-blue-600 text-white" 
                  : "text-gray-600 hover:bg-gray-200"}`}
            >
                Requests
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-2 sm:p-4">
        {activeTab === "requests" && (
          <div className="bg-white shadow-lg rounded-xl p-3 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">In Progress Tasks</h2>
            {tasks.filter(task => task.status === "in_progress").length > 0 ? (
              <div className="space-y-4">
                {tasks.filter(task => task.status === "in_progress").map(task => (
                  <div key={task.id} className="border p-3 sm:p-4 rounded-lg mb-4 bg-gray-50">
                    <h3 className="text-md sm:text-lg font-bold">{task.title}</h3>
                    <p className="text-sm sm:text-base"><strong>Description:</strong> {task.description}</p>
                    <p className="text-sm sm:text-base"><strong>Assigned To:</strong> {
                      users.find(u => u.id === task.assigned_to)?.username || task.assigned_to
                    }</p>
                    <p className="text-sm sm:text-base"><strong>Due Date:</strong> {task.due_date}</p>
                    <p className="text-sm sm:text-base"><strong>Location:</strong> {task.coordinates}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button 
                        onClick={() => updateTaskStatus(task.id, "completed")} 
                        className="bg-green-500 text-white px-3 py-1 text-sm sm:px-4 sm:py-2 rounded-lg hover:bg-green-600"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => updateTaskStatus(task.id, "pending")} 
                        className="bg-red-500 text-white px-3 py-1 text-sm sm:px-4 sm:py-2 rounded-lg hover:bg-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No in-progress tasks found</p>
            )}
          </div>
        )}
        
        {activeTab === "assign" && (
          <div className="w-full max-w-lg mx-auto bg-white shadow-lg rounded-xl p-3 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-4">Assign Task</h2>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg mb-2"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="" disabled>
                Select User
              </option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-lg mb-2"
              placeholder="Task Title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <textarea
              className="w-full p-2 border border-gray-300 rounded-lg mb-2"
              placeholder="Task Description"
              rows="3"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
            />
            <label className="block text-gray-700 mb-1">
                Due Date
            </label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-lg mb-2"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
            <div className="mb-2">
              <label className="block text-gray-700 mb-1">
                Task Location
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  className="flex-grow p-2 border border-gray-300 rounded-lg sm:rounded-r-none"
                  placeholder="Coordinates"
                  value={taskCoordinates}
                  readOnly
                />
                <button
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg sm:rounded-l-none hover:bg-blue-600"
                >
                  {showLocationPicker ? 'Hide Map' : 'Pick Location'}
                </button>
              </div>
            </div>
            {showLocationPicker && isClient && (
              <MapWithNoSSR onLocationConfirm={handleLocationConfirm} />
            )}
            <button
              onClick={handleAssignTask}
              className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 mt-2"
            >
              Assign Task
            </button>
          </div>
        )}
        
        {activeTab === "view" && (
          <div className="bg-white shadow-lg rounded-xl p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-700">Assigned Tasks</h2>
              <select
                className="p-2 border border-gray-300 rounded-lg w-full sm:w-auto"
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
              >
                <option value="all">All Tasks</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            {/* Mobile view for tasks */}
            <div className="sm:hidden">
              {filteredTasks.length > 0 ? (
                <div className="space-y-4">
                  {filteredTasks.map((task) => (
                    <div key={task.id} className="border p-3 rounded-lg bg-gray-50">
                      <h3 className="font-medium text-lg">{task.title}</h3>
                      <p className="text-sm mt-1"><strong>Description:</strong> {task.description}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <p><strong>Assigned To:</strong> {users.find(u => u.id === task.assigned_to)?.username || task.assigned_to}</p>
                        <p><strong>Due:</strong> {task.due_date}</p>
                        <p><strong>Location:</strong> <span className="text-xs">{task.coordinates}</span></p>
                        <p>
                          <strong>Status:</strong>{' '}
                          <span 
                            className={`
                              px-2 py-0.5 rounded-full text-xs 
                              ${task.status === 'pending' ? 'bg-yellow-200 text-yellow-600' : 
                                task.status === 'in_progress' ? 'bg-blue-200 text-blue-600' : 
                                'bg-green-200 text-green-600'}
                            `}
                          >
                            {task.status}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No tasks found</p>
              )}
            </div>
            
            {/* Desktop view for tasks */}
            <div className="hidden sm:block">
              {filteredTasks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left">Title</th>
                        <th className="px-4 py-2 text-left">Assigned To</th>
                        <th className="px-4 py-2 text-left">Due Date</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map((task) => (
                        <tr key={task.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2">{task.title}</td>
                          <td className="px-4 py-2">{users.find(u => u.id === task.assigned_to)?.username || task.assigned_to}</td>
                          <td className="px-4 py-2">{task.due_date}</td>
                          <td className="px-4 py-2">
                            <span 
                              className={`
                                px-2 py-0.5 rounded-full text-xs 
                                ${task.status === 'pending' ? 'bg-yellow-200 text-yellow-600' : 
                                  task.status === 'in_progress' ? 'bg-blue-200 text-blue-600' : 
                                  'bg-green-200 text-green-600'}
                              `}
                            >
                              {task.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No tasks found</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
"use client";
import React, { useState, useEffect, useCallback } from "react"; // Import useCallback
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  File,
  Download,
  Eye,
  X,
  FileText,
  Loader2,
  RefreshCw, // Import Refresh icon
} from "lucide-react";
import { SnackbarProvider, useSnackbar } from "notistack";

// For the task location picker map we already have a dynamically imported Map component
const MapWithNoSSR = dynamic(() => import("./MapComponent"), { ssr: false });
const LocationPreview = dynamic(() => import("../../components/LocationPreview"), { ssr: false });

// --- Helper: parseLocation ---
const parseLocation = (coordinatesString) => {
  // ... (keep existing parseLocation function)
  if (!coordinatesString) return null;

  // Check if it's a JSON string with location name
  try {
    const locationData = JSON.parse(coordinatesString);
    if (locationData.name) {
      return {
        name: locationData.name,
        coordinates:
          locationData.lat && locationData.lng
            ? [locationData.lat, locationData.lng]
            : null,
      };
    }
  } catch (e) {
    // Not a JSON string, continue with other parsing attempts
  }

  // Check if coordinates are in "lat,lng" format
  const coordsPattern = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
  const match = coordinatesString.match(coordsPattern);

  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[3]);
    return {
      name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      coordinates: [lat, lng],
    };
  }

  // If nothing else works, just return the string as the name
  return {
    name: coordinatesString,
    coordinates: null,
  };
};

// --- Helper: formatDate ---
const formatDate = (dateStr) => {
  // ... (keep existing formatDate function)
  if (!dateStr) return "";
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateStr).toLocaleDateString(undefined, options);
};

function AdminContent() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

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
  const [isLoading, setIsLoading] = useState(false); // <-- New state for loading
  const [isReloading, setIsReloading] = useState(false); // <-- New state for reload button specifically

  // --- Helper function to get today's date in YYYY-MM-DD format ---
  const getTodayDateString = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    return localToday.toISOString().split("T")[0];
  };

  const todayDate = getTodayDateString();

  // --- Fetch Users Logic --- (Using useCallback)
  const fetchUsers = useCallback(async (currentUser) => {
    if (!currentUser) return;
    console.log("Fetching users for department:", currentUser.department);
    const { data: usersData, error } = await supabase
      .from("users")
      .select("id, username")
      .eq("is_admin", false)
      .eq("department", currentUser.department);

    if (error) {
      console.error("Error fetching users:", error);
      enqueueSnackbar("Error fetching users", { variant: "error" });
      return null; // Indicate error
    } else {
      console.log("Fetched users:", usersData);
      setUsers(usersData);
      return usersData; // Return data on success
    }
  }, [enqueueSnackbar]); // Dependencies for useCallback


  // --- Fetch Tasks Logic --- (Using useCallback)
  const fetchTasks = useCallback(async (currentUser) => {
    if (!currentUser) return;
    console.log("Fetching tasks assigned by:", currentUser.id);
    const { data: tasksData, error } = await supabase
      .from("tasks")
      .select(
        `
          id,
          title,
          description,
          status,
          assigned_by,
          assigned_to,
          coordinates,
          due_date,
          updated_at,
          document
        `
      )
      .eq("assigned_by", currentUser.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      enqueueSnackbar("Error fetching tasks", { variant: "error" });
      return null; // Indicate error
    } else {
      console.log("Fetched tasks:", tasksData);
      setTasks(tasksData);
      return tasksData; // Return data on success
    }
  }, [enqueueSnackbar]); // Dependencies for useCallback

  // --- Initial Setup Effect ---
  useEffect(() => {
    setIsClient(true);
    // Get user session and redirect if not present
    const storedUser = sessionStorage?.getItem("user");
    if (!storedUser) {
      router.replace("/");
      return;
    }
    const userData = JSON.parse(storedUser);
    setUser(userData);

    // Initial data fetch
    const loadInitialData = async (currentUser) => {
        if (!currentUser) return;
        setIsLoading(true);
        await Promise.all([fetchUsers(currentUser), fetchTasks(currentUser)]);
        setIsLoading(false);
    };

    loadInitialData(userData);

  }, [router, fetchUsers, fetchTasks]); // Add fetch functions to dependencies

  // --- Reload Data Handler ---
  const handleReloadData = async () => {
    if (!user || isReloading) return; // Prevent reload if no user or already reloading

    setIsReloading(true); // Set reloading state specifically for the button
    enqueueSnackbar("Refreshing data...", { variant: "info", autoHideDuration: 1500 });

    try {
      // Fetch both users and tasks concurrently
      const results = await Promise.all([fetchUsers(user), fetchTasks(user)]);
      // Check if fetches were successful (they return data, not null)
      if (results[0] !== null && results[1] !== null) {
           enqueueSnackbar("Data refreshed successfully!", { variant: "success" });
      } else {
          // Error snackbars are shown within fetch functions
          enqueueSnackbar("Failed to refresh some data.", { variant: "warning" });
      }
    } catch (error) {
      console.error("Error during data reload:", error);
      enqueueSnackbar("An unexpected error occurred during refresh.", { variant: "error" });
    } finally {
      setIsReloading(false); // Reset reloading state
    }
  };


  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("user");
      router.replace("/");
    }
  };

  const handleAssignTask = async () => {
    if (
      !taskTitle.trim() ||
      !taskDescription.trim() ||
      !selectedUser ||
      !taskCoordinates ||
      !taskDueDate
    ) {
      enqueueSnackbar("Please fill all required fields", { variant: "warning" });
      return;
    }
    if (!user) return;

    setIsLoading(true); // Show loading indicator during assignment
    const adminId = user.id;
    const { error: insertError } = await supabase.from("tasks").insert([
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

    if (insertError) {
      console.error("Error assigning task:", insertError);
      enqueueSnackbar("Failed to assign task", { variant: "error" });
    } else {
      // Re-fetch tasks to update the list
      await fetchTasks(user); // Use the refactored fetchTasks

      // Reset form
      setTaskTitle("");
      setTaskDescription("");
      setSelectedUser("");
      setTaskCoordinates("");
      setTaskDueDate("");
      setShowLocationPicker(false);
      enqueueSnackbar("Task assigned successfully", { variant: "success" });
      setActiveTab('view'); // Optionally switch to view tab
    }
    setIsLoading(false); // Hide loading indicator
  };

  const handleLocationConfirm = (coordinates) => {
    setTaskCoordinates(coordinates);
    setShowLocationPicker(false);
  };

  const filteredTasks = tasks.filter(
    (task) => taskStatusFilter === "all" || task.status === taskStatusFilter
  );

  const updateTaskStatus = async (taskId, status) => {
    setIsLoading(true); // Indicate loading
    const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
    if (error) {
      console.error("Error updating task status:", error);
      enqueueSnackbar("Failed to update task status", { variant: "error" });
    } else {
      // Update local state immediately for better UX
      setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status } : task)));
      // Optionally re-fetch for consistency, though local update is often sufficient
      // await fetchTasks(user);
      enqueueSnackbar("Task status updated", { variant: "success" });
    }
    setIsLoading(false); // Stop loading indicator
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Show main loading indicator on initial load or during operations
  if (!isClient || (isLoading && !isReloading)) { // Only show full screen loader on initial load or major ops
    return (
      <div className="flex justify-center items-center h-screen">
         <Loader2 className="animate-spin text-blue-600" size={48} />
         <span className="ml-3 text-lg text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!user) {
     // This case should ideally be handled by the redirect, but good as a fallback
    return <div className="flex justify-center items-center h-screen">Redirecting...</div>;
  }


  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Enhanced Navigation Header */}
      <nav className="bg-white shadow-md p-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center gap-4"> {/* Added gap */}
          <div className="flex items-center flex-shrink-0"> {/* Added flex-shrink-0 */}
            <h1 className="flex items-center text-xl md:text-2xl font-bold text-gray-800">
              <FileText className="mr-2" size={24} /> Admin Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink"> {/* Added flex-shrink */}
            <h2 className="hidden sm:block text-base md:text-lg font-semibold text-gray-700 truncate"> {/* Added truncate */}
              Welcome, {user.username} 🎉
            </h2>
            {/* --- Reload Button --- */}
            <button
                onClick={handleReloadData}
                disabled={isReloading} // Disable while reloading
                className={`p-2 rounded-full text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition duration-200 ease-in-out ${isReloading ? 'cursor-not-allowed' : ''}`}
                title="Refresh Data"
            >
                {isReloading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                    <RefreshCw className="h-5 w-5" />
                )}
            </button>
             {/* --- Logout Button --- */}
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition duration-200 ease-in-out flex items-center gap-1 text-sm flex-shrink-0" // Added flex-shrink-0
              onClick={handleLogout}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span> {/* Hide text on small screens */}
            </button>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
         {/* ... (keep existing mobile tab navigation) ... */}
        <div className="mt-4 sm:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-between w-full px-4 py-2 border rounded text-gray-700 hover:text-gray-900 hover:border-gray-900"
          >
            <span className="flex items-center">
                {activeTab === "assign" && <FileText className="inline mr-2" size={16} />}
                {activeTab === "view" && <Eye className="inline mr-2" size={16} />}
                {activeTab === "requests" && <File className="inline mr-2" size={16} />}
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </span>
            <svg className={`h-5 w-5 transform transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {mobileMenuOpen && (
            <div className="mt-3 flex flex-col space-y-2 border rounded shadow-md p-2 bg-white">
              <button onClick={() => handleTabChange("assign")} className={`w-full px-4 py-2 rounded-md text-left flex items-center ${activeTab === "assign" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}>
                <FileText className="inline mr-2" size={16} /> Assign Task
              </button>
              <button onClick={() => handleTabChange("view")} className={`w-full px-4 py-2 rounded-md text-left flex items-center ${activeTab === "view" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}>
                <Eye className="inline mr-2" size={16} /> Task Viewer
              </button>
              <button onClick={() => handleTabChange("requests")} className={`w-full px-4 py-2 rounded-md text-left flex items-center ${activeTab === "requests" ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}>
                <File className="inline mr-2" size={16} /> Requests
              </button>
            </div>
          )}
        </div>


        {/* Desktop Tab Navigation */}
        {/* ... (keep existing desktop tab navigation) ... */}
         <div className="hidden sm:flex mt-4 justify-center space-x-6 border-t pt-4">
          <button onClick={() => setActiveTab("assign")} className={`px-4 py-2 rounded-md flex items-center ${activeTab === "assign" ? "bg-blue-600 text-white shadow-md" : "text-gray-700 hover:bg-gray-200"}`}>
            <FileText className="inline mr-2" size={16} /> Assign Task
          </button>
          <button onClick={() => setActiveTab("view")} className={`px-4 py-2 rounded-md flex items-center ${activeTab === "view" ? "bg-blue-600 text-white shadow-md" : "text-gray-700 hover:bg-gray-200"}`}>
            <Eye className="inline mr-2" size={16} /> Task Viewer
          </button>
           <button onClick={() => setActiveTab("requests")} className={`px-4 py-2 rounded-md flex items-center ${activeTab === "requests" ? "bg-blue-600 text-white shadow-md" : "text-gray-700 hover:bg-gray-200"}`}>
            <File className="inline mr-2" size={16} /> Requests
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow p-4 md:p-6">
        {/* --- Requests Tab --- */}
        {activeTab === "requests" && (
          <div className="bg-white shadow-lg rounded-xl p-6">
            {/* ... (keep existing requests tab content) ... */}
             <h2 className="flex items-center text-xl sm:text-2xl font-semibold text-gray-800 mb-4">
              <FileText className="mr-2" size={24} /> In Progress Tasks
            </h2>
             {/* Add loading indicator specifically for this section if needed */}
             {isLoading && <div className="text-center py-4"><Loader2 className="animate-spin inline-block mr-2"/> Loading requests...</div>}
            {tasks.filter(task => task.status === "in_progress").length > 0 ? (
              <div className="space-y-6">
                {tasks.filter(task => task.status === "in_progress").map(task => (
                  <div key={task.id} className="border p-4 sm:p-6 rounded-lg bg-white shadow hover:shadow-lg transition-shadow">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3">
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-800">{task.title}</h3>
                        <p className="text-gray-600 mt-1 text-sm sm:text-base">{task.description}</p>
                      </div>
                      <span className="mt-2 sm:mt-0 bg-blue-100 text-blue-800 px-3 py-1 rounded text-xs sm:text-sm font-medium self-start sm:self-center">
                        In Progress
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                       <div>
                        <span className="font-medium text-gray-700">Assigned To:</span>{" "}
                        {users.find(u => u.id === task.assigned_to)?.username || `ID: ${task.assigned_to.substring(0, 8)}...`}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Due Date:</span> {formatDate(task.due_date)}
                      </div>
                       <div className="md:col-span-2">
                        <span className="font-medium text-gray-700 block mb-1">Location:</span>
                        {task.coordinates ? (
                          <LocationPreview
                            location={parseLocation(task.coordinates)}
                          />
                        ) : <span className="text-gray-500">Not specified</span>}
                      </div>
                    </div>
                     {task.document && (
                      <DocumentActions
                        documentUrl={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-documents/${task.document}`}
                        documentName={task.document.split("/").pop()}
                      />
                    )}
                     <div className="mt-4 flex space-x-4">
                       <button
                        onClick={() => updateTaskStatus(task.id, "completed")}
                        disabled={isLoading} // Disable button when loading
                        className={`flex items-center bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                           {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Eye className="mr-2" size={16} />}
                           Approve
                       </button>
                       <button
                         onClick={() => updateTaskStatus(task.id, "pending")}
                         disabled={isLoading} // Disable button when loading
                         className={`flex items-center bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                       >
                         {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <X className="mr-2" size={16} />}
                         Reject
                       </button>
                     </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No in-progress tasks found</p>
            )}
          </div>
        )}

        {/* --- Assign Task Tab --- */}
        {activeTab === "assign" && (
          <div className="max-w-lg mx-auto bg-white shadow-lg rounded-xl p-6">
            {/* ... (keep existing assign task form, add disabled state to button) ... */}
             <h2 className="flex items-center text-xl sm:text-2xl font-semibold text-gray-800 mb-6">
              <FileText className="mr-2" size={24} /> Assign New Task
            </h2>
             <select
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                disabled={isLoading || users.length === 0} // Disable if loading or no users
             >
              <option value="" disabled>
                {users.length === 0 ? "No users available" : "Select User"}
              </option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
            <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Task Title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                disabled={isLoading}
             />
            <textarea
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Task Description"
                rows="3"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                disabled={isLoading}
            />
             <label className="block text-gray-700 mb-2 font-medium">Due Date</label>
             <input
                type="date"
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                min={todayDate}
                disabled={isLoading}
             />
            <label className="block text-gray-700 mb-2 font-medium">Task Location</label>
             <div className="flex flex-col sm:flex-row gap-3 mb-4">
               <input
                  type="text"
                  className="flex-grow p-3 border border-gray-300 rounded-lg sm:rounded-r-none bg-gray-50" // Make read-only input slightly different
                  placeholder="Select location using map ->"
                  value={taskCoordinates}
                  readOnly
                  disabled={isLoading}
               />
               <button
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  className={`flex items-center justify-center bg-blue-500 text-white px-4 py-3 rounded-lg sm:rounded-l-none hover:bg-blue-600 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isLoading}
               >
                 {showLocationPicker ? "Hide Map" : "Pick Location"}
               </button>
             </div>
             {showLocationPicker && isClient && (
                <div className="mb-4 border rounded-lg overflow-hidden">
                    <MapWithNoSSR onLocationConfirm={handleLocationConfirm} />
                </div>
             )}
             <button
                onClick={handleAssignTask}
                className={`w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 flex items-center justify-center transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading} // Disable while assigning
             >
                {isLoading ? (
                    <Loader2 className="animate-spin mr-2" size={18} />
                ) : (
                    <FileText className="mr-2" size={18} />
                )}
                {isLoading ? "Assigning..." : "Assign Task"}
             </button>
          </div>
        )}

        {/* --- View Tasks Tab --- */}
        {activeTab === "view" && (
          <div className="bg-white shadow-lg rounded-xl p-6">
             {/* ... (keep existing view tab, update table/list display) ... */}
             <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
               <h2 className="flex items-center text-xl sm:text-2xl font-semibold text-gray-800 whitespace-nowrap">
                 <Eye className="mr-2" size={24} /> Assigned Tasks
               </h2>
                {/* Add loading indicator */}
               {isLoading && !isReloading && <Loader2 className="animate-spin text-blue-500"/> }
               <select
                className="p-3 border border-gray-300 rounded-lg w-full sm:w-auto bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                disabled={isLoading}
                >
                 <option value="all">All Statuses</option>
                 <option value="pending">Pending</option>
                 <option value="in_progress">In Progress</option>
                 <option value="completed">Completed</option>
               </select>
             </div>

            {/* Mobile view */}
            <div className="sm:hidden">
              {filteredTasks.length > 0 ? (
                <div className="space-y-6">
                  {filteredTasks.map(task => (
                    <div key={task.id} className="border p-4 rounded-lg bg-gray-50 shadow">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-lg mb-1">{task.title}</h3>
                        <span className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                            task.status === "pending" ? "bg-yellow-100 text-yellow-700" : task.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                            }`}>
                            {task.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 mb-2">
                        {task.description}
                      </p>
                      <div className="mt-2 text-sm space-y-1 border-t pt-2">
                        <p><strong>Assigned To:</strong> {users.find(u => u.id === task.assigned_to)?.username || `ID: ${task.assigned_to.substring(0, 8)}...`}</p>
                        <p><strong>Due:</strong> {formatDate(task.due_date)}</p>
                        <div>
                          <strong className="block mb-1">Location:</strong>
                          {task.coordinates ? (
                              <LocationPreview location={parseLocation(task.coordinates)} />
                          ) : <span className="text-gray-500">Not specified</span>}
                        </div>
                      </div>
                      {task.document ? (
                        <div className="mt-3 border-t pt-3">
                          <DocumentActions
                            documentUrl={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-documents/${task.document}`}
                            documentName={task.document.split("/").pop()}
                          />
                        </div>
                      ) : (
                         <p className="text-gray-400 text-xs mt-2 pt-2 border-t">No document attached</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-6">No tasks found matching the filter.</p>
              )}
            </div>

            {/* Desktop view */}
            <div className="hidden sm:block">
              {filteredTasks.length > 0 ? (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full table-auto">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredTasks.map(task => (
                        <tr key={task.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
                            <div className="text-xs text-gray-500 truncate max-w-xs">{task.description}</div>
                          </td>
                           <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{users.find(u => u.id === task.assigned_to)?.username || `ID: ${task.assigned_to.substring(0, 8)}...`}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{formatDate(task.due_date)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                task.status === "pending" ? "bg-yellow-100 text-yellow-800" : task.status === "in_progress" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                                }`}>
                                {task.status.replace('_', ' ')}
                            </span>
                          </td>
                           <td className="px-4 py-3 whitespace-nowrap">
                             {task.document ? (
                              <DocumentActions
                                documentUrl={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-documents/${task.document}`}
                                documentName={task.document.split("/").pop()}
                              />
                            ) : (
                              <span className="text-gray-400 text-xs">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-6">No tasks found matching the filter.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Document Viewer Component --- (Keep existing)
const DocumentViewer = ({ isOpen, onClose, documentUrl, documentName }) => {
    // ... (keep existing DocumentViewer component code) ...
      const [viewerType, setViewerType] = useState("default");
      const [viewerLoading, setViewerLoading] = useState(true); // Start loading true
      useEffect(() => {
        // Reset loading state when viewer opens or documentUrl changes
        if (isOpen) {
          setViewerLoading(true);
          // Determine initial viewer type based on file extension
          const fileExtension = documentName ? documentName.split(".").pop().toLowerCase() : "";
           const isOfficeDoc = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(fileExtension);
           if (isOfficeDoc) {
               setViewerType('office'); // Default to office viewer for office docs
           } else {
                setViewerType('default'); // Reset to default for others (pdf, image, etc.)
           }
        } else {
            setViewerLoading(false); // Ensure loading is false when closed
        }
      }, [isOpen, documentName, documentUrl]);


      if (!isOpen) return null;

      const fileExtension = documentName ? documentName.split(".").pop().toLowerCase() : "";
      const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(fileExtension);
      const isPdf = fileExtension === "pdf";
      const isOfficeDoc = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(fileExtension);

      const encodedUrl = encodeURIComponent(documentUrl);
      const officeOnlineUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`;
      const googleDocsUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;

      const handleViewerChange = (type) => {
        if (viewerType !== type) { // Only change and set loading if type is different
            setViewerType(type);
            setViewerLoading(true); // Set loading when switching viewers
        }
      };

    // Function to call when iframe/img finishes loading
    const handleLoadEnd = () => {
        setViewerLoading(false);
    };
    // Function to handle iframe errors (optional but good)
     const handleError = () => {
         setViewerLoading(false);
         console.error("Error loading document viewer iframe.");
        // Optionally show an error message to the user
     };


      return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[1000] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col relative shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center p-3 sm:p-4 border-b bg-gray-50 rounded-t-lg">
              <h3 className="flex items-center font-semibold text-base sm:text-lg text-gray-800 truncate">
                <FileText className="mr-2 flex-shrink-0" size={20} />
                <span className="truncate">{documentName || "Document"}</span>
              </h3>
              <div className="flex items-center space-x-2">
                {/* Download button in header for quick access */}
                <a
                    href={documentUrl}
                    download={documentName || 'document'}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                    title="Download"
                    
                >
                    <Download size={18} />
                </a>
                 <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-red-600" title="Close">
                    <X size={20} />
                 </button>
              </div>
            </div>

            {/* Viewer Type Selector (for Office Docs) */}
            {isOfficeDoc && (
              <div className="border-b px-3 py-2 bg-gray-100 z-10">
                <div className="flex space-x-2 text-xs sm:text-sm">
                   <span className="text-gray-600 font-medium self-center mr-2">Preview using:</span>
                  <button
                    onClick={() => handleViewerChange("office")}
                    className={`px-3 py-1 rounded ${viewerType === "office" ? "bg-blue-100 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-200"}`}
                  >
                    Microsoft
                  </button>
                  <button
                    onClick={() => handleViewerChange("google")}
                    className={`px-3 py-1 rounded ${viewerType === "google" ? "bg-blue-100 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-200"}`}
                  >
                    Google
                  </button>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-grow overflow-auto p-1 sm:p-2 relative bg-gray-200">
              {/* Loader Overlay */}
              {viewerLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-20">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                   <span className="ml-3 text-gray-600">Loading preview...</span>
                </div>
              )}

              {/* Document Content */}
              <div className="w-full h-full min-h-[60vh] flex items-center justify-center">
                 {isImage ? (
                    <img
                      src={documentUrl}
                      alt={documentName || "Document Preview"}
                      className="max-w-full max-h-[80vh] object-contain mx-auto"
                      onLoad={handleLoadEnd}
                      onError={handleError} // Handle image load error
                     />
                 ) : isPdf ? (
                    <iframe
                      // src={`${documentUrl}#view=FitH`} // FitH might not work everywhere, safer without or just #view=fit
                      src={documentUrl}
                       className="w-full h-full min-h-[70vh] border-0" // Use min-h instead of h-full sometimes helps
                      title={documentName || "PDF Document"}
                      onLoad={handleLoadEnd}
                      onError={handleError}
                     />
                 ) : isOfficeDoc ? (
                    <div className="w-full h-full">
                         {viewerType === "office" ? (
                            <iframe
                              src={officeOnlineUrl}
                              className="w-full h-full min-h-[70vh] border-0"
                              title={documentName || "Office Document (Microsoft Viewer)"}
                              onLoad={handleLoadEnd}
                              onError={handleError}
                            />
                         ) : viewerType === "google" ? (
                             <iframe
                              src={googleDocsUrl}
                              className="w-full h-full min-h-[70vh] border-0"
                              title={documentName || "Office Document (Google Viewer)"}
                              onLoad={handleLoadEnd}
                              onError={handleError}
                            />
                         ) : (
                            // Fallback if no viewer selected (shouldn't happen with default)
                            <div className="text-center py-12 text-gray-600">Select a viewer option above.</div>
                         )}
                    </div>
                 ) : (
                    // Fallback for unsupported types
                     <div className="text-center py-12 px-4">
                        <File className="mx-auto mb-4 text-gray-400" size={48} />
                        <p className="text-gray-600 mb-2">This file type cannot be previewed directly.</p>
                        <p className="text-sm text-gray-500 mb-4">File: {documentName}</p>
                        <a
                            href={documentUrl}
                            download={documentName || 'document'}
                            
                            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <Download className="mr-2" size={16} /> Download File
                        </a>
                    </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      );
};

// --- Document Actions Component --- (Keep existing)
const DocumentActions = ({ documentUrl, documentName }) => {
   // ... (keep existing DocumentActions component code) ...
     const [isViewerOpen, setIsViewerOpen] = useState(false);
      const fileExtension = documentName ? documentName.split(".").pop().toLowerCase() : "";
      const isPreviewable = ["jpg", "jpeg", "png", "gif", "svg", "webp", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(fileExtension);

      const getFileIcon = () => {
         if (["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(fileExtension)) return <FileText size={16} className="mr-2 flex-shrink-0 text-gray-600" />;
         if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(fileExtension)) return <Eye size={16} className="mr-2 flex-shrink-0 text-gray-600" />; // Use Eye for images maybe?
         return <File size={16} className="mr-2 flex-shrink-0 text-gray-600" />;
      };

      return (
        <div className="mt-3 pt-3 border-t border-gray-200">
           <div className="flex items-center space-x-2 mb-2 text-sm">
             {getFileIcon()}
             <span className="font-medium text-gray-700 truncate" title={documentName}>
               {documentName || "Attached Document"}
             </span>
           </div>
           <div className="flex items-center space-x-3">
             {isPreviewable && (
                 <button
                     onClick={() => setIsViewerOpen(true)}
                     className="flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-xs sm:text-sm"
                     title="Preview Document"
                 >
                    <Eye className="mr-1.5" size={14} /> View
                 </button>
             )}
             <a
                href={documentUrl}
                download={documentName || 'document'}
                className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-xs sm:text-sm"
                title="Download Document"
             >
               <Download className="mr-1.5" size={14} /> Download
             </a>
           </div>
           {isPreviewable && (
              <DocumentViewer
                isOpen={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
                documentUrl={documentUrl}
                documentName={documentName}
              />
           )}
         </div>
      );
};

// --- Main Export ---
export default function AdminPage() {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }} // Position snackbars
    >
      <AdminContent />
    </SnackbarProvider>
  );
}
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SnackbarProvider, enqueueSnackbar } from 'notistack';
import dynamic from "next/dynamic";
import { RefreshCw } from 'lucide-react';

const LocationPreview = dynamic(() => import("../../components/LocationPreview"), { ssr: false });

export default function UserPage() {
  const [tasks, setTasks] = useState([]);
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchTasks = useCallback(async (userData) => {
    if (!userData) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, description, status, coordinates, due_date, document")
      .eq("assigned_to", userData.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      enqueueSnackbar('Failed to load tasks', { variant: 'error' });
    } else {
      setTasks(data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedUser = sessionStorage.getItem("user");
    if (!storedUser) {
      router.replace("/");
      return;
    }

    const userData = JSON.parse(storedUser);
    setUser(userData);
    fetchTasks(userData);
  }, [router, fetchTasks]);

  const handleRefresh = () => {
    if (user) {
      enqueueSnackbar("Refreshing tasks...", { variant: "info" });
      fetchTasks(user);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    router.replace("/");
  };

  const handleUpload = async (taskId, file) => {
    if (typeof window === "undefined" || !file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (!allowedTypes.includes(file.type)) {
      enqueueSnackbar('Only PDF or DOC/DOCX files are allowed', { variant: 'error' });
      return;
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      enqueueSnackbar('File size must be 20MB or less', { variant: 'error' });
      return;
    }

    enqueueSnackbar('Uploading file...', { variant: 'info' });

    let filePath = `documents/${taskId}/${file.name}`;
    let uploadResponse = await supabase.storage
      .from("task-documents")
      .upload(filePath, file);

    if (uploadResponse.error) {
      if (uploadResponse.error.message.includes("Duplicate") || uploadResponse.error.statusCode === "409") {
        const uniqueFileName = `${Date.now()}_${file.name}`;
        filePath = `documents/${taskId}/${uniqueFileName}`;
        enqueueSnackbar('File name exists, retrying with unique name...', { variant: 'info' });
        uploadResponse = await supabase.storage
          .from("task-documents")
          .upload(filePath, file);

        if (uploadResponse.error) {
          console.error("Error uploading file with unique name:", uploadResponse.error);
          enqueueSnackbar('Failed to upload file even with unique name', { variant: 'error' });
          return;
        }
      } else {
        console.error("Error uploading file:", uploadResponse.error);
        enqueueSnackbar(`Failed to upload file: ${uploadResponse.error.message}`, { variant: 'error' });
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ document: uploadResponse.data.path })
      .eq("id", taskId);

    if (updateError) {
      console.error("Error updating task with document:", updateError);
      enqueueSnackbar('Failed to update task record with document path', { variant: 'error' });
    } else {
      setTasks(tasks.map(task => task.id === taskId ? { ...task, document: uploadResponse.data.path } : task));
      enqueueSnackbar('File uploaded and task updated successfully', { variant: 'success' });
    }
  };

  const handleUpdateStatus = async (taskId) => {
    if (typeof window === "undefined") return;

    enqueueSnackbar('Updating status...', { variant: 'info' });

    const { error } = await supabase
      .from("tasks")
      .update({ status: "in_progress" })
      .eq("id", taskId);

    if (error) {
      console.error("Error updating task status:", error);
      enqueueSnackbar('Failed to update status', { variant: 'error' });
    } else {
      enqueueSnackbar('Status updated successfully', { variant: 'success' });
      setTasks(tasks.map(task => task.id === taskId ? { ...task, status: "in_progress" } : task));
    }
  };

  const parseLocation = (coordinatesString) => {
    if (!coordinatesString) return null;

    try {
      const locationData = JSON.parse(coordinatesString);
      const lat = parseFloat(locationData.lat);
      const lng = parseFloat(locationData.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        return {
          name: locationData.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          coordinates: [lat, lng]
        };
      } else if (locationData.name) {
        return { name: locationData.name, coordinates: null };
      }
    } catch (e) {}

    const coordsPattern = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
    const match = String(coordinatesString).match(coordsPattern);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[3]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return {
          name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          coordinates: [lat, lng]
        };
      }
    }

    if (typeof coordinatesString === 'string' && coordinatesString.trim().length > 0) {
      return {
        name: coordinatesString,
        coordinates: null
      };
    }

    return null;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  const filteredTasks = tasks.filter(task =>
    taskStatusFilter === "all" || task.status === taskStatusFilter
  );

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Invalid date format";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Pending</span>;
      case "in_progress":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In Progress</span>;
      case "completed":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status || 'Unknown'}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SnackbarProvider maxSnack={3} autoHideDuration={3000} />

      {/* Navbar */}
      <nav className="bg-white shadow-md p-4 fixed w-full top-0 z-[1000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-gray-800">
              Task<span className="text-blue-600">Manager</span>
            </h2>
            {user && (
              <div className="ml-4 p-2 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-700">
                  Welcome, {user.username || 'User'}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <RefreshCw className="h-5 w-5 mx-4 cursor-pointer text-blue-600 hover:text-blue-800 transition" onClick={handleRefresh} />
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition duration-200 ease-in-out flex items-center gap-2 text-sm"
              onClick={handleLogout}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold flex text-gray-900 mb-4 sm:mb-0">Your Tasks</h1>
          

          <div className="flex items-center">
            <label htmlFor="task-filter" className="mr-2 text-sm font-medium text-gray-700">
              Filter by status:
            </label>
            <select
              id="task-filter"
              className="p-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={taskStatusFilter}
              onChange={(e) => setTaskStatusFilter(e.target.value)}
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No tasks found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {taskStatusFilter === "all"
                ? "You don't have any tasks assigned to you yet."
                : `You don't have any ${taskStatusFilter} tasks.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map(task => {
              const isDisabled = task.status === "in_progress" || task.status === "completed";
              const location = parseLocation(task.coordinates); // location is now { name: string, coordinates: [lat, lng] | null } or null

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col" // Added flex flex-col
                >
                  <div className="p-5 flex-grow"> {/* Added flex-grow */}
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mr-2">{task.title}</h3> {/* Added mr-2 */}
                      {getStatusBadge(task.status)}
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-3">{task.description}</p>

                    <div className="space-y-3 mb-4">
                      {task.due_date && (
                        <div className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"> {/* Added flex-shrink-0 */}
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Due: {formatDate(task.due_date)}</span>
                        </div>
                      )}

                      {/* --- Location Section Start --- */}
                      {location && (
                        <div className="border border-gray-100 rounded-lg overflow-hidden">
                          {/* Location header */}
                          <div className="flex items-center text-sm text-gray-700 p-2 bg-gray-50 border-b border-gray-100">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"> {/* Added flex-shrink-0 */}
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-medium truncate">{location.name}</span> {/* Added truncate */}
                          </div>

                          {/* Replace MapContainer with LocationPreview component */}
                          {location.coordinates ? (
                             <LocationPreview location={location} />
                          ) : (
                             // Optional: Display a message if only name is available, no coords
                             <div className="p-2 text-xs text-gray-500 bg-gray-50">Map preview not available.</div>
                          )}
                        </div>
                      )}
                      {/* --- Location Section End --- */}

                    </div>
                  </div> {/* End flex-grow div */}

                  {/* Actions Footer */}
                  <div className="bg-gray-50 p-4 border-t border-gray-100">
                    {/* File upload section */}
                    <div className="mb-3">
                      <label
                        htmlFor={`file-upload-${task.id}`}
                        className={`relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`flex items-center justify-center p-2 border-2 border-dashed rounded-lg text-sm ${isDisabled ? 'border-gray-200' : 'border-gray-300 hover:border-gray-400'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-2 ${isDisabled ? 'text-gray-300' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className={isDisabled ? 'text-gray-500' : ''}>{task.document ? 'Replace document' : 'Upload document'}</span>
                          <input
                            id={`file-upload-${task.id}`}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="sr-only"
                            onChange={(e) => e.target.files && e.target.files.length > 0 && handleUpload(task.id, e.target.files[0])} // Added null check
                            disabled={isDisabled}
                            // Reset input value to allow uploading the same file again after removal/error
                            onClick={(event) => { (event.target).value = ''; }}
                          />
                        </div>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 text-center">PDF, DOC, DOCX (Max 20MB)</p>
                       {/* Optionally display uploaded file name */}
                       {task.document && (
                         <p className="mt-1 text-xs text-green-600 text-center truncate" title={task.document}>
                           Uploaded: {task.document.split('/').pop()} {/* Show only file name */}
                         </p>
                       )}
                    </div>

                    {/* Status update button */}
                    <button
                      onClick={() => handleUpdateStatus(task.id)}
                      className={`w-full rounded-md py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
                        isDisabled
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      disabled={isDisabled}
                    >
                      {task.status === "pending"
                        ? "Start Task"
                        : task.status === "in_progress"
                          ? "In Progress" // Button is disabled anyway, but text reflects state
                          : "Completed"} {/* Button is disabled */}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
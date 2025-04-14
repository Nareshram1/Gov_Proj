// --- MasterAdminContent.jsx ---
// Complete component code as of 2025-04-13 (includes Date Fix + Document Viewer)

"use client"; // Essential for using hooks and browser APIs

import React, { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; // Adjust path if needed
import {
  File, // Used in DocumentViewer fallback & DocumentActions icon
  Download, // Used in DocumentViewer & DocumentActions
  Eye, // Used in DocumentViewer & DocumentActions
  X, // Used in DocumentViewer
  FileText, // Used in DocumentViewer & DocumentActions icon
  Loader2, // Used in DocumentViewer & CRUD buttons
  RefreshCw,
  Check,
  Users,
  Building,
  ListTodo,
  PlusCircle,
  Trash2,
  Edit,
  Filter,
  LogOut,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { SnackbarProvider, useSnackbar } from "notistack";

// --- Dynamic Imports for Map/Location Components ---
// Ensure these paths are correct for your project structure
const MapWithNoSSR = dynamic(() => import("./MapComponent"), { ssr: false });
const LocationPreview = dynamic(
  () => import("../../components/LocationPreview"),
  {
    ssr: false,
  }
);

// --- Helper Function: Parse Location String ---
const parseLocation = (coordinatesString) => {
  if (!coordinatesString || typeof coordinatesString !== "string") return null;
  const coordsPattern = /^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/;
  const match = coordinatesString.match(coordsPattern);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[3]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        coordinates: [lat, lng],
      };
    }
  }
  try {
    const locationData = JSON.parse(coordinatesString);
    if (locationData && typeof locationData === "object") {
      const lat = parseFloat(locationData.lat);
      const lng = parseFloat(locationData.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        return {
          name: locationData.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          coordinates: [lat, lng],
        };
      }
      if (locationData.name) {
        return { name: locationData.name, coordinates: null };
      }
    }
  } catch (e) {
    /* Ignore JSON parsing error */
  }
  return { name: coordinatesString, coordinates: null };
};

// --- Helper Function: Format Date (FIXED) ---
const formatDate = (dateStr) => {
  if (!dateStr) return "No Date";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date string received:", dateStr);
      return "Invalid Date";
    }
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString(undefined, options);
  } catch (e) {
    console.error("Error formatting date:", dateStr, e);
    return "Invalid Date";
  }
};

// --- Helper Function: Get Today's Date String ---
const getTodayDateString = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - offset * 60 * 1000);
  return localToday.toISOString().split("T")[0];
};

// --- Document Viewer Component ---
const DocumentViewer = ({ isOpen, onClose, documentUrl, documentName }) => {
  const [viewerType, setViewerType] = useState("default");
  const [viewerLoading, setViewerLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setViewerLoading(true);
      const fileExtension = documentName
        ? documentName.split(".").pop().toLowerCase()
        : "";
      const isOfficeDoc = [
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
      ].includes(fileExtension);
      if (isOfficeDoc) {
        setViewerType("office");
      } else {
        setViewerType("default");
      }
    } else {
      setViewerLoading(false);
    }
  }, [isOpen, documentName, documentUrl]);

  if (!isOpen) return null;

  const fileExtension = documentName
    ? documentName.split(".").pop().toLowerCase()
    : "";
  const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(
    fileExtension
  );
  const isPdf = fileExtension === "pdf";
  const isOfficeDoc = [
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
  ].includes(fileExtension);

  const encodedUrl = encodeURIComponent(documentUrl);
  const officeOnlineUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`;
  const googleDocsUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;

  const handleViewerChange = (type) => {
    if (viewerType !== type) {
      setViewerType(type);
      setViewerLoading(true);
    }
  };

  const handleLoadEnd = () => {
    setViewerLoading(false);
  };
  const handleError = () => {
    setViewerLoading(false);
    console.error("Error loading document viewer iframe.");
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
            <a
              href={documentUrl}
              download={documentName || "document"}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800"
              title="Download"
            >
              <Download size={18} />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-red-600"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewer Type Selector (for Office Docs) */}
        {isOfficeDoc && (
          <div className="border-b px-3 py-2 bg-gray-100 z-[1000]">
            <div className="flex space-x-2 text-xs sm:text-sm">
              <span className="text-gray-600 font-medium self-center mr-2">
                Preview using:
              </span>
              <button
                onClick={() => handleViewerChange("office")}
                className={`px-3 py-1 rounded ${
                  viewerType === "office"
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                {" "}
                Microsoft{" "}
              </button>
              <button
                onClick={() => handleViewerChange("google")}
                className={`px-3 py-1 rounded ${
                  viewerType === "google"
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                {" "}
                Google{" "}
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
                onError={handleError}
              />
            ) : isPdf ? (
              <iframe
                src={documentUrl}
                className="w-full h-full min-h-[70vh] border-0"
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
                    title={
                      documentName || "Office Document (Microsoft Viewer)"
                    }
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
                  <div className="text-center py-12 text-gray-600">
                    Select a viewer option above.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <File className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-600 mb-2">
                  This file type cannot be previewed directly.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  File: {documentName}
                </p>
                <a
                  href={documentUrl}
                  download={documentName || "document"}
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

// --- Document Actions Component ---
const DocumentActions = ({ documentUrl, documentName }) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const fileExtension = documentName
    ? documentName.split(".").pop().toLowerCase()
    : "";
  const isPreviewable = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "svg",
    "webp",
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
  ].includes(fileExtension);

  const getFileIcon = () => {
    if (
      ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(
        fileExtension
      )
    )
      return (
        <FileText size={16} className="mr-2 flex-shrink-0 text-gray-600" />
      );
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(fileExtension))
      return <Eye size={16} className="mr-2 flex-shrink-0 text-gray-600" />; // Changed image icon to Eye
    return <File size={16} className="mr-2 flex-shrink-0 text-gray-600" />;
  };

  if (!documentUrl) {
    return <div className="text-xs text-gray-400 italic">No document URL</div>;
  }

  return (
    <div>
      <div className="flex items-center space-x-2 mb-1 text-sm">
        {getFileIcon()}
        <span
          className="font-medium text-gray-700 truncate"
          title={documentName}
        >
          {documentName || "Attached Document"}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        {isPreviewable && (
          <button
            onClick={() => setIsViewerOpen(true)}
            className="flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-xs"
            title="Preview Document"
          >
            <Eye className="mr-1" size={14} /> View
          </button>
        )}
        <a
          href={documentUrl}
          download={documentName || "document"}
          className="flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-xs"
          title="Download Document"
        >
          <Download className="mr-1" size={14} /> Download
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

// --- Main Component: MasterAdminContent ---
function MasterAdminContent() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  // --- State Variables ---
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [taskCoordinates, setTaskCoordinates] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [selectedAssignedBy, setSelectedAssignedBy] = useState("");
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allAdmins, setAllAdmins] = useState([]);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newUserDepartment, setNewUserDepartment] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalTasks: 0,
    departmentCounts: {},
    taskStatusCounts: {},
    tasksPerDepartment: {},
  });

  const todayDate = getTodayDateString();

  // --- Data Fetching Callbacks ---
  const fetchDepartments = useCallback(async () => {
    console.log("Fetching departments...");
    try {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("department")
        .not("department", "is", null);
      if (usersError) throw usersError;
      const uniqueDepartments = [
        ...new Set(usersData.map((item) => item.department).filter(Boolean)),
      ];
      const formattedDepartments = uniqueDepartments
        .sort()
        .map((dept) => ({ name: dept }));
      console.log("Fetched departments:", formattedDepartments);
      setDepartments(formattedDepartments);
      return formattedDepartments;
    } catch (error) {
      console.error("Error fetching departments:", error);
      enqueueSnackbar("Error fetching departments", { variant: "error" });
      return null;
    }
  }, [enqueueSnackbar]);

  const fetchAllUsers = useCallback(async () => {
    console.log("Fetching users...");
    try {
      const { data: usersData, error } = await supabase
        .from("users")
        .select("*")
        .order("department")
        .order("username");
      if (error) throw error;
      console.log("Fetched users:", usersData);
      setUsers(usersData);
      const admins = usersData.filter(
        (user) => user.is_admin || user.is_master_admin
      );
      setAllAdmins(admins);
      return usersData;
    } catch (error) {
      console.error("Error fetching users:", error);
      enqueueSnackbar("Error fetching users", { variant: "error" });
      return null;
    }
  }, [enqueueSnackbar]);

  const fetchAllTasks = useCallback(async () => {
    console.log("Fetching tasks...");
    try {
      const { data: tasksData, error } = await supabase
        .from("tasks")
        .select(
          `
            id, title, description, status, coordinates, due_date, created_at, updated_at,
            assigned_by, assigned_to, document,
            assigned_by_user:assigned_by(id, username, department),
            assigned_to_user:assigned_to(id, username, department)
          `
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      console.log("Fetched tasks:", tasksData);
      setTasks(tasksData);
      return tasksData;
    } catch (error) {
      console.error("Error fetching tasks:", error);
      enqueueSnackbar("Error fetching tasks", { variant: "error" });
      return null;
    }
  }, [enqueueSnackbar]);

  // --- Calculate Dashboard Stats ---
  const calculateStats = useCallback((usersData, tasksData, departmentsData) => {
    if (!usersData || !tasksData || !departmentsData) {
      console.warn("Cannot calculate stats, missing data:", {
        usersData,
        tasksData,
        departmentsData,
      });
      return;
    }
    console.log("Calculating stats...");
    const departmentCounts = {};
    const taskStatusCounts = { pending: 0, in_progress: 0, completed: 0 };
    const tasksPerDepartment = {};
    departmentsData.forEach((dept) => {
      departmentCounts[dept.name] = 0;
      tasksPerDepartment[dept.name] = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        total: 0,
      };
    });
    usersData.forEach((user) => {
      if (user.department && departmentCounts.hasOwnProperty(user.department)) {
        departmentCounts[user.department]++;
      } else if (user.department) {
        console.warn(
          `User ${user.username} has unknown department: ${user.department}`
        );
      }
    });
    tasksData.forEach((task) => {
      if (taskStatusCounts.hasOwnProperty(task.status)) {
        taskStatusCounts[task.status]++;
      }
      const taskDept = task.assigned_to_user?.department;
      if (taskDept && tasksPerDepartment.hasOwnProperty(taskDept)) {
        if (tasksPerDepartment[taskDept].hasOwnProperty(task.status)) {
          tasksPerDepartment[taskDept][task.status]++;
        }
        tasksPerDepartment[taskDept].total++;
      } else if (taskDept) {
        console.warn(
          `Task ${task.id} assigned to user in unknown department: ${taskDept}`
        );
      }
    });
    const newStats = {
      totalUsers: usersData.length,
      totalAdmins: usersData.filter(
        (user) => user.is_admin || user.is_master_admin
      ).length,
      totalTasks: tasksData.length,
      departmentCounts,
      taskStatusCounts,
      tasksPerDepartment,
    };
    console.log("Calculated Stats:", newStats);
    setStats(newStats);
  }, []);

  // --- Initial Setup Effect ---
  useEffect(() => {
    setIsClient(true);
    console.log("Component mounted, checking user...");
    const storedUser = sessionStorage?.getItem("user");
    if (!storedUser) {
      console.log("No user in session storage, redirecting to login.");
      router.replace("/");
      return;
    }
    try {
      const userData = JSON.parse(storedUser);
      console.log("User data found:", userData);
      if (!userData.is_master_admin) {
        enqueueSnackbar("Access denied. Only Master Admins allowed.", {
          variant: "error",
        });
        sessionStorage.removeItem("user");
        router.replace("/");
        return;
      }
      setUser(userData);
      const loadInitialData = async () => {
        console.log("Loading initial data...");
        setIsLoading(true);
        try {
          const [departmentsData, usersData, tasksData] = await Promise.all([
            fetchDepartments(),
            fetchAllUsers(),
            fetchAllTasks(),
          ]);
          if (departmentsData && usersData && tasksData) {
            calculateStats(usersData, tasksData, departmentsData);
          } else {
            console.error("Failed to load some initial data.");
            enqueueSnackbar("Failed to load some initial data.", {
              variant: "warning",
            });
          }
        } catch (error) {
          console.error("Error during initial data load:", error);
          enqueueSnackbar("Error loading initial data", { variant: "error" });
        } finally {
          console.log("Initial data load finished.");
          setIsLoading(false);
        }
      };
      loadInitialData();
    } catch (error) {
      console.error("Error parsing user data from session storage:", error);
      sessionStorage.removeItem("user");
      router.replace("/");
    }
  }, [router, fetchDepartments, fetchAllUsers, fetchAllTasks, calculateStats, enqueueSnackbar]);

  // --- Reload Data Handler ---
  const handleReloadData = useCallback(async () => {
    if (isReloading) return;
    console.log("Reloading data manually...");
    setIsReloading(true);
    enqueueSnackbar("Refreshing data...", {
      variant: "info",
      autoHideDuration: 1500,
    });
    try {
      const [departmentsData, usersData, tasksData] = await Promise.all([
        fetchDepartments(),
        fetchAllUsers(),
        fetchAllTasks(),
      ]);
      if (departmentsData && usersData && tasksData) {
        calculateStats(usersData, tasksData, departmentsData);
        enqueueSnackbar("Data refreshed successfully!", {
          variant: "success",
          autoHideDuration: 2000,
        });
      } else {
        enqueueSnackbar("Failed to refresh some data.", { variant: "warning" });
      }
    } catch (error) {
      console.error("Error during data reload:", error);
      enqueueSnackbar("An unexpected error occurred during refresh.", {
        variant: "error",
      });
    } finally {
      setIsReloading(false);
      console.log("Manual data reload finished.");
    }
  }, [ isReloading, fetchDepartments, fetchAllUsers, fetchAllTasks, calculateStats, enqueueSnackbar ]);

  // --- Logout Handler ---
  const handleLogout = () => {
    console.log("Logging out...");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("user");
      router.replace("/");
      enqueueSnackbar("Logged out successfully.", { variant: "info" });
    }
  };

  // --- Department CRUD Operations ---
  const handleCreateDepartment = async () => {
    const trimmedName = newDepartmentName.trim();
    if (!trimmedName) {
      enqueueSnackbar("Department name cannot be empty", { variant: "warning" });
      return;
    }
    if (
      departments.some(
        (dept) => dept.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      enqueueSnackbar(`Department "${trimmedName}" already exists`, {
        variant: "warning",
      });
      return;
    }
    console.log(`Attempting to create department: ${trimmedName}`);
    setIsLoading(true);
    try {
      const adminUsername = `Admin_${trimmedName.replace(/\s+/g, "_")}`;
      const defaultPassword = "admin@123";
      const { data: existingAdmin, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("username", adminUsername)
        .maybeSingle();
      if (checkError) throw checkError;
      if (existingAdmin) {
        throw new Error(
          `Admin user "${adminUsername}" already exists. Choose a different department name.`
        );
      }
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert([
          {
            username: adminUsername,
            is_admin: true,
            department: trimmedName,
            password: defaultPassword,
          },
        ])
        .select()
        .single();
      if (userError) throw userError;
      if (!newUser)
        throw new Error("Failed to create admin user for the department.");
      const newDept = { name: trimmedName };
      const updatedDepartments = [...departments, newDept].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      const updatedUsers = [...users, newUser].sort((a, b) =>
        a.username.localeCompare(b.username)
      );
      setDepartments(updatedDepartments);
      setUsers(updatedUsers);
      enqueueSnackbar(
        `Department "${trimmedName}" created with admin "${adminUsername}"`,
        { variant: "success" }
      );
      setNewDepartmentName("");
      calculateStats(updatedUsers, tasks, updatedDepartments);
    } catch (error) {
      console.error("Error creating department:", error);
      enqueueSnackbar(`Error creating department: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleUpdateDepartment = async () => {
    const trimmedName = newDepartmentName.trim();
    if (!editingDepartment || !trimmedName) {
      enqueueSnackbar("Department name cannot be empty", { variant: "warning" });
      return;
    }
    if (trimmedName === editingDepartment.name) {
      enqueueSnackbar("No changes detected.", { variant: "info" });
      setEditingDepartment(null);
      setNewDepartmentName("");
      return;
    }
    if (
      departments.some(
        (dept) =>
          dept.name.toLowerCase() === trimmedName.toLowerCase() &&
          dept.name !== editingDepartment.name
      )
    ) {
      enqueueSnackbar(`Department "${trimmedName}" already exists`, {
        variant: "warning",
      });
      return;
    }
    console.log(
      `Attempting to update department "${editingDepartment.name}" to "${trimmedName}"`
    );
    setIsLoading(true);
    try {
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ department: trimmedName })
        .eq("department", editingDepartment.name);
      if (userUpdateError) throw userUpdateError;
      const updatedDepartments = departments
        .map((dept) =>
          dept.name === editingDepartment.name ? { name: trimmedName } : dept
        )
        .sort((a, b) => a.name.localeCompare(b.name));
      setDepartments(updatedDepartments);
      const updatedUsers = users
        .map((u) =>
          u.department === editingDepartment.name
            ? { ...u, department: trimmedName }
            : u
        )
        .sort((a, b) => a.username.localeCompare(b.username));
      setUsers(updatedUsers);
      enqueueSnackbar(
        `Department "${editingDepartment.name}" updated to "${trimmedName}"`,
        { variant: "success" }
      );
      setNewDepartmentName("");
      setEditingDepartment(null);
      calculateStats(updatedUsers, tasks, updatedDepartments);
    } catch (error) {
      console.error("Error updating department:", error);
      enqueueSnackbar(`Error updating department: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteDepartment = async (departmentToDelete) => {
    if (!departmentToDelete) return;
    if (
      !confirm(
        `DELETE Department: "${departmentToDelete.name}"?\n\nThis CANNOT be undone.\n\nIt will also DELETE:\n- All users within this department.\n- All tasks assigned BY or TO users in this department.`
      )
    ) {
      return;
    }
    console.log(`Attempting to delete department: ${departmentToDelete.name}`);
    setIsLoading(true);
    try {
      const { data: usersInDept, error: findUsersError } = await supabase
        .from("users")
        .select("id")
        .eq("department", departmentToDelete.name);
      if (findUsersError) throw findUsersError;
      const userIdsToDelete = usersInDept.map((u) => u.id);
      if (userIdsToDelete.length > 0) {
        console.log(`Deleting tasks for user IDs: ${userIdsToDelete.join(", ")}`);
        const { error: tasksByError } = await supabase
          .from("tasks")
          .delete()
          .in("assigned_by", userIdsToDelete);
        if (tasksByError)
          console.error("Error deleting tasks assigned BY:", tasksByError);
        const { error: tasksToError } = await supabase
          .from("tasks")
          .delete()
          .in("assigned_to", userIdsToDelete);
        if (tasksToError)
          console.error("Error deleting tasks assigned TO:", tasksToError);
      } else {
        console.log("No users found in department, skipping task deletion.");
      }
      if (userIdsToDelete.length > 0) {
        console.log(`Deleting users: ${userIdsToDelete.join(", ")}`);
        const { error: usersError } = await supabase
          .from("users")
          .delete()
          .in("id", userIdsToDelete);
        if (usersError) throw usersError;
      }
      const remainingDepartments = departments.filter(
        (dept) => dept.name !== departmentToDelete.name
      );
      const remainingUsers = users.filter(
        (u) => u.department !== departmentToDelete.name
      );
      const refreshedTasks = (await fetchAllTasks()) || [];
      setDepartments(remainingDepartments);
      setUsers(remainingUsers);
      enqueueSnackbar(
        `Department "${departmentToDelete.name}" and associated data deleted`,
        { variant: "success" }
      );
      calculateStats(remainingUsers, refreshedTasks, remainingDepartments);
    } catch (error) {
      console.error("Error deleting department:", error);
      enqueueSnackbar(`Error deleting department: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- User CRUD Operations ---
  const resetUserForm = () => {
    setNewUsername("");
    setNewPassword("");
    setNewIsAdmin(false);
    setNewUserDepartment("");
    setEditingUser(null);
    setShowUserForm(false);
  };
  const handleCreateUser = async () => {
    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername || !newPassword.trim() || !newUserDepartment) {
      enqueueSnackbar("Username, Password, and Department are required", {
        variant: "warning",
      });
      return;
    }
    if (newPassword.trim().length < 6) {
      enqueueSnackbar("Password must be at least 6 characters long", {
        variant: "warning",
      });
      return;
    }
    console.log(`Attempting to create user: ${trimmedUsername}`);
    setIsLoading(true);
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("username", trimmedUsername)
        .maybeSingle();
      if (checkError) throw checkError;
      if (existingUser) {
        enqueueSnackbar(`Username "${trimmedUsername}" already exists`, {
          variant: "error",
        });
        setIsLoading(false);
        return;
      }
      const { data: createdUser, error: userError } = await supabase
        .from("users")
        .insert([
          {
            username: trimmedUsername,
            password: newPassword.trim(),
            is_admin: newIsAdmin,
            department: newUserDepartment,
          },
        ])
        .select()
        .single();
      if (userError) throw userError;
      if (!createdUser) throw new Error("User creation failed unexpectedly.");
      const updatedUsers = [...users, createdUser].sort((a, b) =>
        a.username.localeCompare(b.username)
      );
      setUsers(updatedUsers);
      enqueueSnackbar(`User "${trimmedUsername}" created successfully`, {
        variant: "success",
      });
      resetUserForm();
      calculateStats(updatedUsers, tasks, departments);
    } catch (error) {
      console.error("Error creating user:", error);
      enqueueSnackbar(`Error creating user: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleUpdateUser = async () => {
    const trimmedUsername = newUsername.trim();
    if (!editingUser || !trimmedUsername || !newUserDepartment) {
      enqueueSnackbar("Username and Department are required", {
        variant: "warning",
      });
      return;
    }
    const trimmedPassword = newPassword.trim();
    if (trimmedPassword && trimmedPassword.length < 6) {
      enqueueSnackbar("New password must be at least 6 characters long", {
        variant: "warning",
      });
      return;
    }
    console.log(`Attempting to update user ID: ${editingUser.id}`);
    setIsLoading(true);
    try {
      if (trimmedUsername !== editingUser.username) {
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("id")
          .eq("username", trimmedUsername)
          .neq("id", editingUser.id)
          .maybeSingle();
        if (checkError) throw checkError;
        if (existingUser) {
          enqueueSnackbar(`Username "${trimmedUsername}" already exists`, {
            variant: "error",
          });
          setIsLoading(false);
          return;
        }
      }
      const updateData = {
        username: trimmedUsername,
        is_admin: newIsAdmin,
        department: newUserDepartment,
      };
      if (trimmedPassword) {
        updateData.password = trimmedPassword;
      }
      const { data: updatedUser, error: userError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", editingUser.id)
        .select()
        .single();
      if (userError) throw userError;
      if (!updatedUser) throw new Error("User update failed unexpectedly.");
      const updatedUsers = users
        .map((u) => (u.id === editingUser.id ? updatedUser : u))
        .sort((a, b) => a.username.localeCompare(b.username));
      setUsers(updatedUsers);
      enqueueSnackbar(`User "${editingUser.username}" updated successfully`, {
        variant: "success",
      });
      resetUserForm();
      calculateStats(updatedUsers, tasks, departments);
    } catch (error) {
      console.error("Error updating user:", error);
      enqueueSnackbar(`Error updating user: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteUser = async (userToDelete) => {
    if (!userToDelete) return;
    if (userToDelete.is_master_admin) {
      enqueueSnackbar("Cannot delete the Master Admin account.", {
        variant: "error",
      });
      return;
    }
    if (userToDelete.id === user?.id) {
      enqueueSnackbar("You cannot delete your own account.", {
        variant: "error",
      });
      return;
    }
    if (
      !confirm(
        `DELETE User: "${userToDelete.username}"?\n\nThis CANNOT be undone.\n\nIt will also DELETE all tasks assigned BY or TO this user.`
      )
    ) {
      return;
    }
    console.log(
      `Attempting to delete user: ${userToDelete.username} (ID: ${userToDelete.id})`
    );
    setIsLoading(true);
    try {
      console.log(`Deleting tasks for user ID: ${userToDelete.id}`);
      const { error: tasksByError } = await supabase
        .from("tasks")
        .delete()
        .eq("assigned_by", userToDelete.id);
      if (tasksByError)
        console.error("Error deleting tasks assigned BY:", tasksByError);
      const { error: tasksToError } = await supabase
        .from("tasks")
        .delete()
        .eq("assigned_to", userToDelete.id);
      if (tasksToError)
        console.error("Error deleting tasks assigned TO:", tasksToError);
      const { error: userError } = await supabase
        .from("users")
        .delete()
        .eq("id", userToDelete.id);
      if (userError) throw userError;
      const remainingUsers = users.filter((u) => u.id !== userToDelete.id);
      setUsers(remainingUsers);
      const refreshedTasks = (await fetchAllTasks()) || [];
      enqueueSnackbar(`User "${userToDelete.username}" deleted successfully`, {
        variant: "success",
      });
      calculateStats(remainingUsers, refreshedTasks, departments);
    } catch (error) {
      console.error("Error deleting user:", error);
      enqueueSnackbar(`Error deleting user: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Task Operations ---
  const handleAssignTask = async () => {
    if (
      !taskTitle.trim() ||
      !taskDescription.trim() ||
      !selectedUser ||
      !taskCoordinates ||
      !taskDueDate ||
      !selectedAssignedBy
    ) {
      enqueueSnackbar(
        "Please fill all required fields: Title, Description, Assignee, Assigner, Location, Due Date",
        { variant: "warning", autoHideDuration: 3000 }
      );
      return;
    }
    if (new Date(taskDueDate) < new Date(todayDate)) {
      enqueueSnackbar("Due date cannot be in the past.", { variant: "warning" });
      return;
    }
    const parsedForValidation = parseLocation(taskCoordinates);
    if (!parsedForValidation?.coordinates) {
      enqueueSnackbar("Invalid location format. Please select using the map.", {
        variant: "warning",
      });
      return;
    }
    console.log("Attempting to assign task...");
    setIsLoading(true);
    try {
      const coordinatesToSave = taskCoordinates; // Save the string directly
      const { data: newTask, error: insertError } = await supabase
        .from("tasks")
        .insert([
          {
            title: taskTitle.trim(),
            description: taskDescription.trim(),
            assigned_by: selectedAssignedBy,
            assigned_to: selectedUser,
            status: "pending",
            coordinates: coordinatesToSave,
            due_date: taskDueDate,
            // document: null, // Explicitly null if no document support yet
          },
        ])
        .select(
          `*, assigned_by_user:assigned_by(id, username, department), assigned_to_user:assigned_to(id, username, department)`
        )
        .single();
      if (insertError) throw insertError;
      if (!newTask) throw new Error("Task assignment failed unexpectedly.");
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      setTaskTitle("");
      setTaskDescription("");
      setSelectedUser("");
      setSelectedAssignedBy("");
      setTaskCoordinates("");
      setTaskDueDate("");
      setShowLocationPicker(false);
      enqueueSnackbar("Task assigned successfully", { variant: "success" });
      calculateStats(users, updatedTasks, departments);
      setActiveTab("tasks");
    } catch (error) {
      console.error("Error assigning task:", error);
      enqueueSnackbar(`Failed to assign task: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleLocationConfirm = (locationData) => {
    console.log("Location confirmed:", locationData);
    const locationString = `${locationData.lat},${locationData.lng}`;
    setTaskCoordinates(locationString);
    setShowLocationPicker(false);
  };
  const openLocationPicker = () => {
    const parsedCurrent = parseLocation(taskCoordinates);
    const initialCenter = parsedCurrent?.coordinates
      ? { lat: parsedCurrent.coordinates[0], lng: parsedCurrent.coordinates[1] }
      : undefined;
    setShowLocationPicker(true);
  };
  const updateTaskStatus = async (taskId, newStatus) => {
    console.log(`Updating task ${taskId} to status ${newStatus}`);
    setIsLoading(true);
    try {
      const { data: updatedTask, error } = await supabase
        .from("tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", taskId)
        .select(
          `*, assigned_by_user:assigned_by(id, username, department), assigned_to_user:assigned_to(id, username, department)`
        )
        .single();
      if (error) throw error;
      if (!updatedTask) throw new Error("Task status update failed unexpectedly.");
      const updatedTasks = tasks.map((task) =>
        task.id === taskId ? updatedTask : task
      );
      setTasks(updatedTasks);
      enqueueSnackbar(`Task status updated to ${newStatus.replace("_", " ")}`, {
        variant: "success",
      });
      calculateStats(users, updatedTasks, departments);
    } catch (error) {
      console.error("Error updating task status:", error);
      enqueueSnackbar(`Failed to update task status: ${error.message}`, {
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Tab Handling ---
  const handleTabChange = (tab) => {
    console.log(`Switching tab to: ${tab}`);
    setActiveTab(tab);
    setMobileMenuOpen(false);
    if (tab !== "departments") {
      setNewDepartmentName("");
      setEditingDepartment(null);
    }
    if (tab !== "users") {
      resetUserForm();
    }
    if (tab !== "assign") {
      setTaskTitle("");
      setTaskDescription("");
      setSelectedUser("");
      setSelectedAssignedBy("");
      setTaskCoordinates("");
      setTaskDueDate("");
      setShowLocationPicker(false);
    }
  };

  // --- Filtered Tasks Memoization ---
  const getFilteredTasks = useCallback(() => {
    return tasks.filter((task) => {
      const statusMatch =
        taskStatusFilter === "all" || task.status === taskStatusFilter;
      const departmentMatch =
        departmentFilter === "all" ||
        (task.assigned_to_user &&
          task.assigned_to_user.department === departmentFilter);
      return statusMatch && departmentMatch;
    });
  }, [tasks, taskStatusFilter, departmentFilter]);

  // --- Memoized Parsed Coordinates for Assign Form ---
  const parsedTaskCoordinatesForForm = useMemo(
    () => parseLocation(taskCoordinates),
    [taskCoordinates]
  );

  // --- Render Logic ---
  if (!isClient || (isLoading && tasks.length === 0 && users.length === 0)) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <span className="text-lg text-gray-700 font-semibold">
          Loading Master Dashboard...
        </span>
        <span className="text-sm text-gray-500 mt-1">
          Please wait while we fetch the data.
        </span>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
        <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
        <span className="text-lg text-gray-700 font-semibold">
          Verifying Access...
        </span>
      </div>
    );
  }

  const filteredTasks = getFilteredTasks();

  // --- JSX Return ---
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Navigation Header */}
      <nav className="bg-white shadow-md sticky top-0 z-[1000]">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row */}
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center flex-shrink-0">
              <h1 className="flex items-center text-lg md:text-xl font-bold text-gray-800">
                <FileText className="mr-2 text-indigo-600" size={24} /> Master
                Admin
              </h1>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-4 flex-shrink-0">
              <h2 className="hidden lg:block text-sm md:text-base font-semibold text-gray-600 truncate">
                Welcome, {user.username}!
              </h2>
              <button
                onClick={handleReloadData}
                disabled={isReloading || isLoading}
                className={`p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition duration-150 ease-in-out ${
                  isReloading || isLoading
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }`}
                title="Refresh Data"
              >
                {isReloading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <RefreshCw className="h-5 w-5" />
                )}
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md transition duration-150 ease-in-out flex items-center gap-1.5 text-sm flex-shrink-0 shadow-sm"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
          {/* Desktop Tabs */}
          <div className="hidden sm:block border-t border-gray-200">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              {[
                { id: "dashboard", label: "Dashboard", icon: FileText },
                { id: "departments", label: "Departments", icon: Building },
                { id: "users", label: "Users", icon: Users },
                { id: "tasks", label: "View Tasks", icon: Eye },
                { id: "assign", label: "Assign Task", icon: ListTodo },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-150 ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                >
                  <tab.icon
                    className={`mr-1.5 h-5 w-5 ${
                      activeTab === tab.id
                        ? "text-indigo-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    }`}
                    aria-hidden="true"
                  />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          {/* Mobile Dropdown */}
          <div className="mt-2 pb-2 border-t border-gray-200 sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex items-center justify-between w-full px-3 py-2 border rounded text-gray-600 hover:text-gray-800 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-tab-menu"
            >
              <span className="flex items-center font-medium">
                {activeTab === "dashboard" && (
                  <>
                    <FileText className="inline mr-2 h-5 w-5 text-indigo-600" />{" "}
                    Dashboard
                  </>
                )}
                {activeTab === "departments" && (
                  <>
                    <Building className="inline mr-2 h-5 w-5 text-indigo-600" />{" "}
                    Departments
                  </>
                )}
                {activeTab === "users" && (
                  <>
                    <Users className="inline mr-2 h-5 w-5 text-indigo-600" />{" "}
                    Users
                  </>
                )}
                {activeTab === "tasks" && (
                  <>
                    <Eye className="inline mr-2 h-5 w-5 text-indigo-600" /> View
                    Tasks
                  </>
                )}
                {activeTab === "assign" && (
                  <>
                    <ListTodo className="inline mr-2 h-5 w-5 text-indigo-600" />{" "}
                    Assign Task
                  </>
                )}
              </span>
              <ChevronDown
                className={`h-5 w-5 transform transition-transform duration-150 ${
                  mobileMenuOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>
            {mobileMenuOpen && (
              <div
                id="mobile-tab-menu"
                className="mt-2 space-y-1 bg-white border rounded shadow-lg"
              >
                {[
                  { id: "dashboard", label: "Dashboard", icon: FileText },
                  { id: "departments", label: "Departments", icon: Building },
                  { id: "users", label: "Users", icon: Users },
                  { id: "tasks", label: "View Tasks", icon: Eye },
                  { id: "assign", label: "Assign Task", icon: ListTodo },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 ${
                      activeTab === tab.id
                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    aria-current={activeTab === tab.id ? "page" : undefined}
                  >
                    <tab.icon
                      className={`mr-2 h-5 w-5 ${
                        activeTab === tab.id
                          ? "text-indigo-600"
                          : "text-gray-400"
                      }`}
                      aria-hidden="true"
                    />
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-full mx-auto">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <section aria-labelledby="dashboard-title">
              <h2
                id="dashboard-title"
                className="text-2xl font-semibold text-gray-800 mb-5"
              >
                Dashboard Overview
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white shadow-md rounded-lg p-5 border-l-4 border-blue-500">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Total Users
                  </p>
                  <p className="text-3xl font-bold text-gray-800 flex items-center">
                    <Users size={24} className="mr-2 text-blue-500" />
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="bg-white shadow-md rounded-lg p-5 border-l-4 border-purple-500">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Total Admins
                  </p>
                  <p className="text-3xl font-bold text-gray-800 flex items-center">
                    <Users size={24} className="mr-2 text-purple-500" />
                    {stats.totalAdmins}
                  </p>
                </div>
                <div className="bg-white shadow-md rounded-lg p-5 border-l-4 border-green-500">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Total Tasks
                  </p>
                  <p className="text-3xl font-bold text-gray-800 flex items-center">
                    <ListTodo size={24} className="mr-2 text-green-500" />
                    {stats.totalTasks}
                  </p>
                </div>
                <div className="bg-white shadow-md rounded-lg p-5 border-l-4 border-yellow-500">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Tasks Pending
                  </p>
                  <p className="text-3xl font-bold text-gray-800 flex items-center">
                    <FileText size={24} className="mr-2 text-yellow-500" />{" "}
                    {stats.taskStatusCounts.pending || 0}
                  </p>
                </div>
                <div className="col-span-1 sm:col-span-2 lg:col-span-4 mt-6">
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">
                    Tasks by Department (Assigned To)
                  </h3>
                  <div className="bg-white shadow-md rounded-lg p-5 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Department
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Pending
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            In Progress
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Completed
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(stats.tasksPerDepartment).map(
                          ([deptName, counts]) => (
                            <tr key={deptName}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {deptName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                {counts.pending}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                {counts.in_progress}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                {counts.completed}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold text-center">
                                {counts.total}
                              </td>
                            </tr>
                          )
                        )}
                        {Object.keys(stats.tasksPerDepartment).length === 0 && (
                          <tr>
                            <td
                              colSpan="5"
                              className="text-center py-4 text-gray-500"
                            >
                              No department task data available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Departments Tab */}
          {activeTab === "departments" && (
            <section aria-labelledby="departments-title">
              <h2
                id="departments-title"
                className="text-2xl font-semibold text-gray-800 mb-5"
              >
                Manage Departments
              </h2>
              <div className="bg-white shadow-md rounded-lg p-5 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {editingDepartment
                    ? `Edit Department: ${editingDepartment.name}`
                    : "Create New Department"}
                </h3>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    placeholder="Department Name"
                    value={newDepartmentName}
                    onChange={(e) => setNewDepartmentName(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm"
                    aria-label="Department Name"
                  />
                  {editingDepartment ? (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={handleUpdateDepartment}
                        disabled={isLoading || !newDepartmentName.trim()}
                        className={`inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          isLoading || !newDepartmentName.trim()
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isLoading ? (
                          <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Update
                      </button>
                      <button
                        onClick={() => {
                          setEditingDepartment(null);
                          setNewDepartmentName("");
                        }}
                        className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateDepartment}
                      disabled={isLoading || !newDepartmentName.trim()}
                      className={`inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                        isLoading || !newDepartmentName.trim()
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      ) : (
                        <PlusCircle className="mr-2 h-4 w-4" />
                      )}
                      Create Department
                    </button>
                  )}
                </div>
                {editingDepartment && (
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Updating department name will update it for all
                    associated users.
                  </p>
                )}
                {!editingDepartment && (
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Creating a department also creates a default Admin
                    user (e.g., Admin_DeptName) with password 'admin@123'.
                  </p>
                )}
              </div>
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {departments.length > 0 ? (
                    departments.map((dept) => (
                      <li
                        key={dept.name}
                        className="px-4 py-3 sm:px-6 flex justify-between items-center hover:bg-gray-50 transition-colors duration-150"
                      >
                        <span className="text-sm font-medium text-gray-800">
                          {dept.name}
                        </span>
                        <div className="space-x-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              setEditingDepartment(dept);
                              setNewDepartmentName(dept.name);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            title={`Edit ${dept.name}`}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors duration-150"
                            disabled={isLoading}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(dept)}
                            title={`Delete ${dept.name}`}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors duration-150"
                            disabled={isLoading}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                      No departments found.
                    </li>
                  )}
                </ul>
              </div>
            </section>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <section aria-labelledby="users-title">
              <h2
                id="users-title"
                className="text-2xl font-semibold text-gray-800 mb-5"
              >
                Manage Users
              </h2>
              <div className="bg-white shadow-md rounded-lg p-5 mb-6">
                <button
                  onClick={() => setShowUserForm(!showUserForm)}
                  className="flex justify-between items-center w-full mb-3 text-lg font-medium text-gray-900"
                >
                  <span>
                    {editingUser
                      ? `Edit User: ${editingUser.username}`
                      : "Create New User"}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 transform transition-transform ${
                      showUserForm ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showUserForm && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      editingUser ? handleUpdateUser() : handleCreateUser();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label
                        htmlFor="username"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Username *
                      </label>
                      <input
                        type="text"
                        id="username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Password {editingUser ? "(Leave blank to keep current)" : "*"}{" "}
                      </label>
                      <input
                        type="password"
                        id="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required={!editingUser}
                        minLength={editingUser ? undefined : 6}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="userDepartment"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Department *
                      </label>
                      <select
                        id="userDepartment"
                        value={newUserDepartment}
                        onChange={(e) => setNewUserDepartment(e.target.value)}
                        required
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.name} value={dept.name}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="isAdmin"
                        type="checkbox"
                        checked={newIsAdmin}
                        onChange={(e) => setNewIsAdmin(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="isAdmin"
                        className="ml-2 block text-sm text-gray-900"
                      >
                        Assign Admin Role
                      </label>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className={`inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                          editingUser
                            ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                            : "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {isLoading ? (
                          <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        ) : editingUser ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <PlusCircle className="mr-2 h-4 w-4" />
                        )}
                        {editingUser ? "Update User" : "Create User"}
                      </button>
                      <button
                        type="button"
                        onClick={resetUserForm}
                        className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
              <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Username
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Department
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Role
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.length > 0 ? (
                      users.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {u.username} {u.is_master_admin ? "(Master)" : ""}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {u.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                u.is_admin || u.is_master_admin
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {u.is_master_admin
                                ? "Master"
                                : u.is_admin
                                ? "Admin"
                                : "User"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setNewUsername(u.username);
                                setNewPassword("");
                                setNewIsAdmin(u.is_admin);
                                setNewUserDepartment(u.department);
                                setShowUserForm(true);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              title={`Edit ${u.username}`}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors duration-150"
                              disabled={isLoading}
                            >
                              <Edit size={16} />
                            </button>
                            {!u.is_master_admin && u.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                title={`Delete ${u.username}`}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors duration-150"
                                disabled={isLoading}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-gray-500">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* View Tasks Tab */}
          {activeTab === "tasks" && (
            <section aria-labelledby="tasks-title">
              <h2
                id="tasks-title"
                className="text-2xl font-semibold text-gray-800 mb-5"
              >
                View All Tasks
              </h2>
              {/* Filters */}
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-white rounded-lg shadow">
                <div>
                  <label
                    htmlFor="statusFilter"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Filter by Status
                  </label>
                  <select
                    id="statusFilter"
                    value={taskStatusFilter}
                    onChange={(e) => setTaskStatusFilter(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="deptFilter"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Filter by Assignee's Department
                  </label>
                  <select
                    id="deptFilter"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.name} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Task List Table */}
              <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Title
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Assigned To (Dept)
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Assigned By (Dept)
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Due Date
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4"
                      >
                        Location
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Document
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {isLoading && filteredTasks.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center py-10">
                          <Loader2
                            className="animate-spin text-blue-500 mx-auto"
                            size={24}
                          />
                        </td>
                      </tr>
                    )}
                    {!isLoading && filteredTasks.length === 0 && (
                      <tr>
                        <td
                          colSpan="8"
                          className="text-center py-6 text-gray-500"
                        >
                          No tasks match the current filters.
                        </td>
                      </tr>
                    )}
                    {filteredTasks.map((task) => {
                      const parsedCoords = parseLocation(task.coordinates);
                      const documentPath = task.document;
                      const documentUrl = documentPath
                        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/task-documents/${documentPath}`
                        : null;
                      const documentName = documentPath
                        ? documentPath.substring(
                            documentPath.lastIndexOf("/") + 1
                          )
                        : null;

                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-gray-50 transition-colors duration-150"
                        >
                          <td className="px-4 py-4 align-top whitespace-nowrap text-sm font-medium text-gray-900">
                            {task.title}
                          </td>
                          <td className="px-4 py-4 align-top whitespace-nowrap text-sm text-gray-500">
                            {task.assigned_to_user?.username ?? "N/A"}
                            <span className="text-xs text-gray-400 ml-1">
                              ({task.assigned_to_user?.department ?? "N/A"})
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top whitespace-nowrap text-sm text-gray-500">
                            {task.assigned_by_user?.username ?? "N/A"}
                            <span className="text-xs text-gray-400 ml-1">
                              ({task.assigned_by_user?.department ?? "N/A"})
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top whitespace-nowrap text-sm text-center">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                task.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : task.status === "in_progress"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {task.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top whitespace-nowrap text-sm text-gray-500">
                            {formatDate(task.due_date)}
                          </td>
                          <td className="px-4 py-4 align-top text-sm text-gray-500">
                            <div className="flex items-center">
                              <MapPin
                                size={16}
                                className="text-gray-400 mr-1 flex-shrink-0"
                              />
                              <span
                                className="truncate"
                                title={task.coordinates}
                              >
                                {parsedCoords?.name ??
                                  task.coordinates ??
                                  "N/A"}
                              </span>
                            </div>
                            {parsedCoords?.coordinates && (
                              <div className="mt-1 w-full max-w-xs">
                                <LocationPreview location={parsedCoords} />
                              </div>
                            )}
                          </td>
                          {/* Document Cell */}
                          <td className="px-4 py-4 align-top text-sm text-gray-500">
                            {documentUrl && documentName ? (
                              <DocumentActions
                                documentUrl={documentUrl}
                                documentName={documentName}
                              />
                            ) : (
                              <span className="text-xs text-gray-400 italic">
                                None
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top whitespace-nowrap text-center text-sm font-medium space-x-1">
                            {task.status !== "pending" && (
                              <button
                                onClick={() =>
                                  updateTaskStatus(task.id, "pending")
                                }
                                title="Set to Pending"
                                className="p-1 text-red-500 hover:bg-red-100 rounded-full"
                                disabled={isLoading}
                              >
                                <X size={14} />
                              </button>
                            )}
                            {task.status !== "in_progress" && (
                              <button
                                onClick={() =>
                                  updateTaskStatus(task.id, "in_progress")
                                }
                                title="Set to In Progress"
                                className="p-1 text-yellow-600 hover:bg-yellow-100 rounded-full"
                                disabled={isLoading}
                              >
                                <RefreshCw size={14} />
                              </button>
                            )}
                            {task.status !== "completed" && (
                              <button
                                onClick={() =>
                                  updateTaskStatus(task.id, "completed")
                                }
                                title="Set to Completed"
                                className="p-1 text-green-500 hover:bg-green-100 rounded-full"
                                disabled={isLoading}
                              >
                                <Check size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Assign Task Tab */}
          {activeTab === "assign" && (
            <section aria-labelledby="assign-task-title">
              <h2
                id="assign-task-title"
                className="text-2xl font-semibold text-gray-800 mb-5"
              >
                Assign New Task
              </h2>
              <div className="bg-white shadow-md rounded-lg p-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAssignTask();
                  }}
                  className="space-y-5"
                >
                  <div>
                    <label
                      htmlFor="taskTitle"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Task Title *
                    </label>
                    <input
                      type="text"
                      id="taskTitle"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="taskDescription"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Description *
                    </label>
                    <textarea
                      id="taskDescription"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      required
                      rows="3"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="assignToUser"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Assign To User *
                      </label>
                      <select
                        id="assignToUser"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        required
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        <option value="">Select User</option>
                        {users
                          .filter((u) => !u.is_master_admin)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.username} ({u.department})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="assignedByAdmin"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Assigned By Admin *
                      </label>
                      <select
                        id="assignedByAdmin"
                        value={selectedAssignedBy}
                        onChange={(e) => setSelectedAssignedBy(e.target.value)}
                        required
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      >
                        <option value="">Select Admin</option>
                        {users
                          .filter((u) => u.is_admin || u.is_master_admin)
                          .map((admin) => (
                            <option key={admin.id} value={admin.id}>
                              {admin.username} ({admin.department})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="dueDate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Due Date *
                    </label>
                    <input
                      type="date"
                      id="dueDate"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      required
                      min={todayDate}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Location *
                    </label>
                    <div className="mt-1 flex items-center gap-3">
                      <input
                        type="text"
                        readOnly
                        value={
                          parsedTaskCoordinatesForForm?.name ??
                          taskCoordinates ??
                          ""
                        }
                        placeholder="Click button to select map location"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm cursor-pointer"
                        onClick={openLocationPicker}
                        title={taskCoordinates || "No location selected"}
                      />
                      <button
                        type="button"
                        onClick={openLocationPicker}
                        className="inline-flex items-center px-3 py-2 border border-indigo-600 rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex-shrink-0"
                      >
                        <MapPin size={16} className="mr-1" />
                        {taskCoordinates ? "Change" : "Select"} Location
                      </button>
                    </div>
                    {parsedTaskCoordinatesForForm?.coordinates &&
                      !showLocationPicker && (
                        <div className="mt-2 border rounded-lg overflow-hidden shadow w-full max-w-md">
                          <LocationPreview
                            location={parsedTaskCoordinatesForForm}
                          />
                        </div>
                      )}
                    {showLocationPicker && (
                      <div
                        className="mt-4 border rounded-lg overflow-hidden shadow-lg relative"
                        style={{ height: "400px" }}
                      >
                        <MapWithNoSSR
                          onLocationSelect={handleLocationConfirm}
                          initialCenter={
                            parsedTaskCoordinatesForForm?.coordinates
                              ? {
                                  lat: parsedTaskCoordinatesForForm
                                    .coordinates[0],
                                  lng: parsedTaskCoordinatesForForm
                                    .coordinates[1],
                                }
                              : undefined
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowLocationPicker(false)}
                          className="absolute top-2 right-2 bg-white p-1.5 rounded-full shadow text-gray-500 hover:text-red-600 z-10"
                          title="Close Map"
                          aria-label="Close map picker"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Add Document Upload Field Here if needed */}
                  {/*
                                    <div>
                                        <label htmlFor="taskDocument" className="block text-sm font-medium text-gray-700">Attach Document (Optional)</label>
                                        <input type="file" id="taskDocument" onChange={handleFileChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                                        {uploading && <span>Uploading...</span>}
                                    </div>
                                    */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                        isLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin mr-2 h-5 w-5" />
                      ) : (
                        <ListTodo className="mr-2 h-5 w-5" />
                      )}
                      Assign Task
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center p-4 mt-auto text-sm">
        Adolf Hitler &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

// --- Export Component Wrapped with SnackbarProvider ---
export default function MasterAdminPage() {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <MasterAdminContent />
    </SnackbarProvider>
  );
}
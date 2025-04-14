"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabaseClient"; // Assuming supabase is configured

export default function LoginPage() {
    const [user, setUser] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const [pwsAttempts, setPwdAttempts] = useState(0); // State to track password attempts
    const router = useRouter();

    const handleLogin = async () => {
        setError(""); // Clear previous errors on new attempt

        if (!user.username || !user.password) {
            setError("Please enter both username and password");
            return;
        }

        // Special case for 'mona' username (as per original code)
        // Note: This allows direct access to /mona bypassing attempt limits
        if (user.username === 'mona') {
            router.push('/mona');
            return;
        }

        // --- Check if already locked out ---
        // Optional: You could check here to prevent even querying the database if already locked out
        // if (pwsAttempts > 3) {
        //     setError("Too many failed login attempts. Please try again later or contact support.");
        //     // Optional: Redirect immediately if you want to enforce the lock even before another try
        //     // router.push('/mona');
        //     return;
        // }


        // --- Query Supabase for user ---
        // WARNING: Storing and comparing plain text passwords is a major security risk!
        // Use password hashing (e.g., bcrypt) in a real application.
        const { data, error: queryError } = await supabase // Renamed 'error' to avoid conflict with state variable
            .from("users")
            .select("*")
            .eq("username", user.username)
            .eq("password", user.password) // VERY INSECURE - DO NOT USE IN PRODUCTION
            .single(); // Fetch single record

        // --- Handle Login Failure ---
        if (queryError || !data) {
            const newAttemptCount = pwsAttempts + 1; // Calculate the new attempt count
            setPwdAttempts(newAttemptCount);       // Update the state

            // Check if the new attempt count exceeds the limit
            if (newAttemptCount >= 3) {
                setError("Too many failed login attempts."); // Set an appropriate error message
                router.push('/mona'); // Redirect to the 'mona' page
            } else {
                // Provide feedback on invalid credentials and remaining attempts (optional but good UX)
                setError(`Invalid username or password. Attempt ${newAttemptCount} of 3.`);
            }
            return; // Stop further execution since login failed
        }

        // --- Handle Login Success ---
        setPwdAttempts(0); // Reset attempt counter on successful login
        setError("");      // Clear any error messages

        // Store user details in sessionStorage (Consider secure alternatives like HttpOnly cookies if needed)
        sessionStorage.setItem("user", JSON.stringify(data));
        console.log("DATA", data.is_admin); // Keep console log as in original

        // Redirect based on user role
        if (data.is_master_admin) {
            router.push("/m10");
        } else if (data.is_admin) {
            router.replace("/admin"); // replace avoids adding login page to history
        } else {
            router.replace("/user");   // replace avoids adding login page to history
        }
    };

    return (
        <div className="flex min-h-screen justify-center items-center">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Display error messages */}
                    {error && <p className="text-red-500 mb-4">{error}</p>}
                    <div className="grid gap-4">
                        <div className="flex flex-col space-y-1.5"> {/* Improved spacing */}
                            <Label htmlFor="username">Username</Label> {/* Added htmlFor */}
                            <input
                                id="username" // Added id matching label
                                type="text"
                                placeholder="Enter username"
                                className="border p-2 rounded"
                                value={user.username} // Controlled component
                                onChange={(e) => {
                                    setUser({ ...user, username: e.target.value });
                                    setError(""); // Clear error when user types
                                }}
                            />
                        </div>
                        <div className="flex flex-col space-y-1.5"> {/* Improved spacing */}
                            <Label htmlFor="password">Password</Label> {/* Added htmlFor */}
                            <input
                                id="password" // Added id matching label
                                type="password"
                                placeholder="Enter password"
                                className="border p-2 rounded"
                                value={user.password} // Controlled component
                                onChange={(e) => {
                                    setUser({ ...user, password: e.target.value });
                                    setError(""); // Clear error when user types
                                }}
                                // Optional: Trigger login on Enter key press
                                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    {/* Disable button briefly after click or while loading? Consider adding loading state */}
                    <Button onClick={handleLogin}>Login</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
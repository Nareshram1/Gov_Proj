// "use client"
// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select"
// import { useRouter } from "next/navigation"
// export default function CardWithForm() {
//     const [user,setUser]=useState({
//         username:"",
//         password:""
//     });
//     const router = useRouter()
//     const handleLogin=()=>{
//         console.log("User: ",user);
//         if(user.username=="admin")
//         {
//             router.replace('/admin')
//         }
//         else
//         {
//             router.replace('/user')
//         }
//     }
//   return (
//     <div className="flex min-h-screen justify-center items-center">
//     <Card className="w-[350px]">
//       <CardHeader>
//         <CardTitle>Login</CardTitle>
//       </CardHeader>
//       <CardContent>
//         <form>
//           <div className="grid w-full items-center gap-4">
//             <div className="flex flex-col space-y-1.5 mt-8">
//               <Label htmlFor="name">Username</Label>
//               <input type="text" placeholder="Enter username"   onChange={(event) =>
//                                     setUser({ ...user, username: event.target.value })
//                                 } />
//             </div>
//             <div className="flex flex-col space-y-1.5 mt-8">
//               <Label htmlFor="framework">Password</Label>
//               <input type="password" placeholder="Enter password"   onChange={(event) =>
//                             setUser({ ...user, password: event.target.value })
//                         }/>
//             </div>
//           </div>
//         </form>
//       </CardContent>
//       <CardFooter className="flex justify-between">
//         {/* <Button variant="outline">Cancel</Button> */}
//         <Button onClick={handleLogin}>Login</Button>
//       </CardFooter>
//     </Card>
//     </div>
//   )
// }


"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
    const [user, setUser] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async () => {
        if (!user.username || !user.password) {
            setError("Please enter both username and password");
            return;
        }

        // Query Supabase for user
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("username", user.username)
            .eq("password", user.password)
            .single(); // Fetch single record

        if (error || !data) {
            setError("Invalid username or password");
            return;
        }

        // Store user details in sessionStorage
        sessionStorage.setItem("user", JSON.stringify(data));

        // Redirect based on user role
        if (data.is_admin) {
            router.replace("/admin");
        } else {
            router.replace("/user");
        }
    };

    return (
        <div className="flex min-h-screen justify-center items-center">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && <p className="text-red-500">{error}</p>}
                    <div className="grid gap-4">
                        <div className="flex flex-col">
                            <Label>Username</Label>
                            <input
                                type="text"
                                placeholder="Enter username"
                                className="border p-2 rounded"
                                onChange={(e) => setUser({ ...user, username: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col">
                            <Label>Password</Label>
                            <input
                                type="password"
                                placeholder="Enter password"
                                className="border p-2 rounded"
                                onChange={(e) => setUser({ ...user, password: e.target.value })}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button onClick={handleLogin}>Login</Button>
                </CardFooter>
            </Card>
        </div>
    );
}

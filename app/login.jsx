"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabaseClient" // Assuming supabase is configured
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [user, setUser] = useState({ username: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [pwdAttempts, setPwdAttempts] = useState(0)
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e) => {
    e?.preventDefault()
    setError("")

    if (!user.username || !user.password) {
      setError("Please enter both username and password.")
      return
    }

    setLoading(true)

    if (user.username === 'mona') {
      router.push('/mona')
      return
    }

    const { data, error: queryError } = await supabase
      .from("users")
      .select("*")
      .eq("username", user.username)
      .eq("password", user.password)
      .single()

    if (queryError || !data) {
      const newCount = pwdAttempts + 1
      setPwdAttempts(newCount)
      setLoading(false)

      if (newCount >= 3) {
        setError("Too many failed attempts. Redirecting...")
        router.push('/mona')
      } else {
        setError(`Invalid credentials (attempt ${newCount}/3).`)
        toast({ title: "Login Failed", description: `Attempt ${newCount} of 3`, variant: 'destructive' })
      }
      return
    }

    setPwdAttempts(0)
    setLoading(false)
    setError("")

    if (remember) {
      localStorage.setItem("user", JSON.stringify(data))
    } else {
      sessionStorage.setItem("user", JSON.stringify(data))
    }

    toast({ title: "Welcome back!", description: `Logged in as ${data.username}` })

    if (data.is_master_admin) router.push("/m10")
    else if (data.is_admin) router.replace("/admin")
    else router.replace("/user")
  }
  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="your.username"
                value={user.username}
                onChange={(e) => { setUser({ ...user, username: e.target.value }); setError("") }}
              />
            </div>

            <div className="space-y-1 relative">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={user.password}
                onChange={(e) => { setUser({ ...user, password: e.target.value }); setError("") }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-9"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked)}
              />
              <Label htmlFor="remember" className="text-sm">Remember me</Label>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

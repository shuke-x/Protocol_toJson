import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { KeyRound } from "lucide-react";

function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username required");
      return;
    }
    login(username.trim());
    nav("/builder");
  };

  return (
    <div className="max-w-xl">
      <Card className="border-white/5 bg-white/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/20 p-3 text-slate-900">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Login</CardTitle>
              <CardDescription>Auth is optional; logging in lets us remember your config state locally.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                placeholder="your-name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex items-center justify-between">
              <Badge variant="outline">Local only</Badge>
              <Button type="submit" className="gap-2">
                <KeyRound className="h-4 w-4" />
                Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;

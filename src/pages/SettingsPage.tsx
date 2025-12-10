import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";

function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="max-w-2xl space-y-4">
      <Card className="border-white/5 bg-white/5">
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Placeholder for password updates and profile settings. Login is optional; data stays on this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{user ? `Logged in as ${user.username}` : "Guest mode"}</Badge>
            <span className="text-muted-foreground">
              Sync is local-only; replace this with real API calls when backend is ready.
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" placeholder="Coming soon" disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-password">Password</Label>
              <Input id="settings-password" type="password" placeholder="Coming soon" disabled />
            </div>
          </div>
          <Button variant="ghost" disabled className="w-fit opacity-60">
            Save (disabled)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPage;

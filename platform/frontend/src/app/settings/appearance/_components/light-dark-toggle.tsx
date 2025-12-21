"use client";

import type { OrganizationThemeMode } from "@shared";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUpdateOrganization } from "@/lib/organization.query";

export function LightDarkToggle() {
  const { theme, setTheme } = useTheme();
  const updateOrganizationMutation = useUpdateOrganization(
    "Theme mode updated",
    "Failed to update theme mode",
  );

  const handleThemeChange = async (newTheme: OrganizationThemeMode) => {
    // Update UI immediately (localStorage)
    setTheme(newTheme);

    // Save to backend
    try {
      await updateOrganizationMutation.mutateAsync({
        themeMode: newTheme,
      });
    } catch (error) {
      // Error toast already shown by mutation
      // Revert UI change
      setTheme(theme || "system");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Mode</CardTitle>
        <CardDescription>
          Switch between light, dark, or system preference for your interface.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            className="flex-1 gap-2"
            onClick={() => handleThemeChange("light")}
            disabled={updateOrganizationMutation.isPending}
          >
            <Sun className="h-4 w-4" />
            Light
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            className="flex-1 gap-2"
            onClick={() => handleThemeChange("dark")}
            disabled={updateOrganizationMutation.isPending}
          >
            <Moon className="h-4 w-4" />
            Dark
          </Button>
          <Button
            variant={theme === "system" ? "default" : "outline"}
            className="flex-1 gap-2"
            onClick={() => handleThemeChange("system")}
            disabled={updateOrganizationMutation.isPending}
          >
            <Monitor className="h-4 w-4" />
            System
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

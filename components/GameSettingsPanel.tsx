"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Settings, Volume2, VolumeX, Video } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";

interface GameSettingsPanelProps {
  showBuzzerVolume?: boolean; // Show buzzer volume control (for players)
  showVideoVolume?: boolean; // Show video volume control
}

export function GameSettingsPanel({
  showBuzzerVolume = false,
  showVideoVolume = true,
}: GameSettingsPanelProps) {
  const { settings, setBuzzerVolume, setVideoVolume } = useSettings();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Game Settings</DialogTitle>
          <DialogDescription>
            Adjust volume and other game settings
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {showBuzzerVolume && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="buzzer-volume" className="text-sm font-medium">
                  Buzzer Volume
                </Label>
                <span className="text-sm text-muted-foreground">
                  {settings.buzzerVolume}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <VolumeX className="h-4 w-4 text-muted-foreground" />
                <Slider
                  id="buzzer-volume"
                  value={[settings.buzzerVolume]}
                  onValueChange={(value) => setBuzzerVolume(value[0])}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}

          {showVideoVolume && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="video-volume" className="text-sm font-medium">
                  Video Volume
                </Label>
                <span className="text-sm text-muted-foreground">
                  {settings.videoVolume}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <VolumeX className="h-4 w-4 text-muted-foreground" />
                <Slider
                  id="video-volume"
                  value={[settings.videoVolume]}
                  onValueChange={(value) => setVideoVolume(value[0])}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <Video className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Easy to add more settings here in the future */}
          {/* Example:
          <div className="space-y-3">
            <Label>New Setting</Label>
            <Switch ... />
          </div>
          */}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setOpen(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

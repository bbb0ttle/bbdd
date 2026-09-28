import { useUI } from "@/ui-state";
import { AddDialog } from "./add-dialog";
import { AboutDialog, StatsDialog } from "./info-dialogs";
import { SettingsDialog } from "./settings-dialog";
import {
  CategoryDialog,
  DeleteDialog,
  GlobalLimitsDialog,
  LimitsDialog,
  LocationDialog,
  NewTagDialog,
  RenameDialog,
  ShareDialog,
} from "./simple-dialogs";

export function DialogHost() {
  const { dialog: d } = useUI();
  if (!d) return null;
  switch (d.type) {
    case "add":
      return <AddDialog initialUrls={d.urls} initialFiles={d.files} />;
    case "delete":
      return <DeleteDialog hashes={d.hashes} />;
    case "location":
      return <LocationDialog hashes={d.hashes} />;
    case "rename":
      return <RenameDialog hash={d.hash} />;
    case "category":
      return <CategoryDialog edit={d.edit} assignTo={d.assignTo} />;
    case "newTag":
      return <NewTagDialog assignTo={d.assignTo} />;
    case "tags":
      return <NewTagDialog assignTo={d.hashes} />;
    case "limits":
      return <LimitsDialog hashes={d.hashes} />;
    case "share":
      return <ShareDialog hashes={d.hashes} />;
    case "globalLimits":
      return <GlobalLimitsDialog />;
    case "settings":
      return <SettingsDialog />;
    case "about":
      return <AboutDialog />;
    case "stats":
      return <StatsDialog />;
  }
}

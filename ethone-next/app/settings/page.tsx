import { SettingsFormProvider } from "@/components/settings/SettingsFormContext";
import SettingsLayout from "@/components/settings/SettingsLayout";

export default function SettingsPage() {
  return (
    <SettingsFormProvider>
      <SettingsLayout />
    </SettingsFormProvider>
  );
}

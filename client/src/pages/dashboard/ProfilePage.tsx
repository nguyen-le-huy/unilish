import { useSearchParams } from "react-router-dom";
import { ProfileOverview } from "@/features/profile/components/ProfileOverview";
import ProfileSettingsLayout from "@/features/profile/components/settings/ProfileSettingsLayout";
import { MyProfileView } from "@/features/profile/components/settings/MyProfileView";

export default function ProfilePage() {
    const [searchParams] = useSearchParams();
    const currentTab = searchParams.get("tab");

    // Default to 'overview' if no tab selected
    const tabToRender = currentTab || "overview";

    return (
        <ProfileSettingsLayout>
            {/* Overview Tab */}
            {tabToRender === "overview" && <ProfileOverview />}

            {/* Settings Tabs */}
            {tabToRender === "my-profile" && <MyProfileView />}

            {/* Placeholders for other tabs */}
            {tabToRender === "security" && <div>Security Settings Content</div>}
            {tabToRender === "teams" && <div>Teams Content</div>}
            {tabToRender === "team-member" && <div>Team Member Content</div>}
            {tabToRender === "notifications" && <div>Notifications Content</div>}
            {tabToRender === "billing" && <div>Billing Content</div>}
            {tabToRender === "data-export" && <div>Data Export Content</div>}
        </ProfileSettingsLayout>
    );
}

import { AdminExperienceClean } from "@/components/admin-experience-clean";
import { ScreenContainer } from "@/components/screen-container";

export default function AdminPage() {
  return (
    <ScreenContainer>
      <div className="page-header">
        <p className="eyebrow">Admin</p>
        <h1>MVP operations panel</h1>
        <p className="page-copy">
          Minimal admin surface for quotas, prompt profiles, capture analytics, and usage.
        </p>
      </div>
      <AdminExperienceClean />
    </ScreenContainer>
  );
}

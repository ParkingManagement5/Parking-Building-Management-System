import { User } from "lucide-react";
import { useEffect, useState } from "react";
import { profileApi } from "../../api/user/profileApi";
import { getRole, getUserId, getUsername } from "../../utils/auth";
import { unwrapApiData } from "../../utils/api";

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function normalizeRole(value) {
  return String(value || "DRIVER").trim().toUpperCase();
}

function roleLabel(value) {
  const role = normalizeRole(value);
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function roleBadgeClasses(value) {
  switch (normalizeRole(value)) {
    case "ADMIN":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    case "MANAGER":
      return "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300";
    case "STAFF":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  }
}

function roleAvatarClasses(value) {
  switch (normalizeRole(value)) {
    case "ADMIN":
      return "bg-rose-600 text-white shadow-sm shadow-rose-500/20 dark:bg-rose-500 dark:text-slate-950";
    case "MANAGER":
      return "bg-violet-600 text-white shadow-sm shadow-violet-500/20 dark:bg-violet-500 dark:text-slate-950";
    case "STAFF":
      return "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 dark:bg-emerald-500 dark:text-slate-950";
    default:
      return "bg-blue-600 text-white shadow-sm shadow-blue-500/20 dark:bg-blue-500 dark:text-slate-950";
  }
}

export default function DriverProfilePage() {
  const username = getUsername() || "driver";
  const role = normalizeRole(getRole() || "DRIVER");
  const userId = getUserId() || "Unknown";
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [profile, setProfile] = useState({
    userId,
    username,
    fullName: username,
    email: "",
    phone: "",
    status: "ACTIVE",
    createdAt: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const res = await profileApi.getMe();
        const data = unwrapApiData(res.data, null);

        if (!mounted || !data) {
          return;
        }

        setProfile({
          userId: data.userId ?? userId,
          username: data.username || username,
          fullName: data.fullName || "",
          email: data.email || "",
          phone: data.phone || "",
          status: data.status || "ACTIVE",
          createdAt: data.createdAt || "",
        });
      } catch (error) {
        if (mounted) {
          setProfileMessage(getErrorMessage(error, "Cannot load profile"));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [userId, username]);

  const initials = (profile.fullName || profile.username || username)
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage("");

    try {
      const res = await profileApi.updateMe({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
      });
      const data = unwrapApiData(res.data, null);

      if (data) {
        setProfile((prev) => ({
          ...prev,
          fullName: data.fullName || prev.fullName,
          email: data.email || prev.email,
          phone: data.phone || "",
          status: data.status || prev.status,
          createdAt: data.createdAt || prev.createdAt,
        }));
      }

      setProfileMessage(res.data?.message || "Profile updated successfully");
      setEditMode(false);
    } catch (error) {
      setProfileMessage(getErrorMessage(error, "Cannot update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    setSavingPassword(true);
    setPasswordMessage("");

    try {
      const res = await profileApi.changePassword(passwordForm);
      setPasswordMessage(res.data?.message || "Password updated successfully");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setPasswordMessage(getErrorMessage(error, "Cannot update password"));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div
            className={`flex size-16 items-center justify-center rounded-2xl text-xl font-bold ${roleAvatarClasses(
              role
            )}`}
          >
            {initials || "DR"}
          </div>
          <div>
            <h2 className="font-bold text-foreground">{profile.fullName || profile.username}</h2>
            <p className="text-sm text-muted-foreground">{profile.email || "No email yet"}</p>
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${roleBadgeClasses(
                role
              )}`}
            >
              {roleLabel(role)}
            </span>
          </div>
          <button
            onClick={() => setEditMode((value) => !value)}
            className="ml-auto bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            {editMode ? "Close Edit" : "Edit Profile"}
          </button>
        </div>

        {profileMessage ? (
          <div className="mb-4 rounded-xl bg-primary/5 px-3 py-2 text-sm text-primary dark:bg-primary/10">
            {profileMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading profile...</div>
        ) : null}

        {!loading && !editMode && (
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Full Name", profile.fullName || "Not available"],
              ["Username", profile.username || username],
              ["Email", profile.email || "Not available"],
              ["Phone", profile.phone || "Not available"],
              ["Member Since", formatDate(profile.createdAt)],
              ["Status", profile.status || "ACTIVE"],
            ].map(([key, value]) => (
              <div key={key}>
                <p className="text-xs text-muted-foreground mb-0.5">{key}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && editMode && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Full Name
              </label>
              <input
                value={profile.fullName}
                onChange={(event) => handleProfileChange("fullName", event.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Email
                </label>
                <input
                  value={profile.email}
                  onChange={(event) => handleProfileChange("email", event.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Phone
                </label>
                <input
                  value={profile.phone}
                  onChange={(event) => handleProfileChange("phone", event.target.value)}
                  placeholder="Enter phone"
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <User size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Reset Password</h3>
            <p className="text-xs text-muted-foreground">
              Connected to backend password update endpoint.
            </p>
          </div>
        </div>
        {passwordMessage ? (
          <div className="mb-3 rounded-xl bg-primary/5 px-3 py-2 text-sm text-primary dark:bg-primary/10">
            {passwordMessage}
          </div>
        ) : null}
        <div className="space-y-3">
          {["Current Password", "New Password", "Confirm New Password"].map((field) => (
            <div key={field}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {field}
              </label>
              <input
                type="password"
                value={passwordForm[
                  field === "Current Password"
                    ? "currentPassword"
                    : field === "New Password"
                      ? "newPassword"
                      : "confirmPassword"
                ]}
                onChange={(event) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    [
                      field === "Current Password"
                        ? "currentPassword"
                        : field === "New Password"
                          ? "newPassword"
                          : "confirmPassword"
                    ]: event.target.value,
                  }))
                }
                placeholder="........"
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
          ))}
          <button
            onClick={handlePasswordChange}
            disabled={savingPassword}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors mt-1 disabled:opacity-60"
          >
            {savingPassword ? "Updating..." : "Reset Password"}
          </button>
          <p className="text-xs text-muted-foreground">
            Session user id: {profile.userId || userId} - role: {roleLabel(role)}
          </p>
        </div>
      </div>
    </div>
  );
}

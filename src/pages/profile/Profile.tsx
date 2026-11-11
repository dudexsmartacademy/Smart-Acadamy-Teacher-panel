import { useState, useEffect, useRef } from "react";
import type { FormEvent, ChangeEvent } from "react";
import {
  BriefcaseBusiness,
  Building2,
  Camera,
  CheckCircle2,
  Edit,
  GraduationCap,
  Mail,
  Phone,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  X,
  AlertCircle,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  type ProfileData,
  getStoredTeacherProfile,
  saveStoredTeacherProfile,
  getTeacherInitials,
} from "../../lib/profileUtils";
import { teacherService } from "../../services/teacherService";
import { authService } from "../../services/authService";

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData>(getStoredTeacherProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileData>(profile);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [_isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Security & Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await teacherService.getProfile();
      if (res.data) {
        const loaded: ProfileData = {
          name: res.data.name || "",
          facultyId: res.data.facultyId || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
          department: res.data.department || "",
          designation: res.data.designation || "Assistant Professor",
          qualification: res.data.qualification || "",
          office: "Faculty Block B, Room 302",
          avatarUrl: res.data.avatarUrl || "",
        };
        setProfile(loaded);
        setFormData(loaded);
        saveStoredTeacherProfile(loaded);
      }
    }
    load();
  }, []);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleOpenEdit = () => {
    setFormData(profile);
    setIsEditing(true);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleCloseEdit = () => {
    setIsEditing(false);
  };

  const processImageFile = (file: File, callback: (base64Url: string) => void) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        callback(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleModalPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file, (base64Url) => {
      setFormData((prev) => ({ ...prev, avatarUrl: base64Url }));
    });
  };

  const handleDirectPhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file, async (base64Url) => {
      setIsSaving(true);
      setSaveError(null);
      const res = await teacherService.updateProfile({ avatarUrl: base64Url });
      setIsSaving(false);

      if (!res.success) {
        setSaveError(res.error || "Failed to update profile picture in database.");
        return;
      }

      const updated = { ...profile, avatarUrl: base64Url };
      setProfile(updated);
      saveStoredTeacherProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    });
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: "" }));
    if (modalFileInputRef.current) {
      modalFileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      alert("Full Name is required.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const res = await teacherService.updateProfile({
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      // Designation is admin-managed (protected column on teacher_profiles).
      qualification: formData.qualification.trim(),
      avatarUrl: formData.avatarUrl,
    });

    setIsSaving(false);

    if (!res.success) {
      setSaveError(res.error || "Failed to save profile changes to database.");
      return;
    }

    setProfile(formData);
    saveStoredTeacherProfile(formData);

    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match. Please re-enter.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await authService.changePassword(newPassword);
      if (!res.success) {
        setPasswordError(res.error || "Failed to update password.");
      } else {
        setPasswordSuccess("Password updated successfully! Use your new password on your next login.");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(null), 5000);
      }
    } catch {
      setPasswordError("Failed to update password. Please check your connection.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const currentInitials = getTeacherInitials(profile.name);
  const formInitials = getTeacherInitials(formData.name);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Teacher Profile
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your faculty profile details, photo, and contact information.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenEdit}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition"
        >
          <Edit size={16} />
          Edit Profile
        </button>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-sm transition">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <span>Profile details and photo updated and saved successfully!</span>
        </div>
      )}

      {/* Error Notification */}
      {saveError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm transition">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Profile Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Avatar / Summary Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {/* Avatar Container with upload trigger */}
            <div className="relative group">
              <div className="flex h-28 w-28 items-center justify-center rounded-full overflow-hidden bg-gray-900 ring-4 ring-[#e9ded0] shadow-md">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold tracking-wider text-white select-none">
                    {currentInitials}
                  </span>
                )}
              </div>

              {/* Quick Photo Upload Overlay Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white shadow-md border-2 border-white hover:bg-[#9c7449] transition-transform hover:scale-105"
                title="Upload or change profile picture"
                aria-label="Upload profile picture"
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleDirectPhotoChange}
                className="hidden"
              />
            </div>

            <h2 className="mt-4 text-xl font-bold text-gray-900">
              {profile.name}
            </h2>

            <p className="mt-1 text-sm font-medium text-gray-600">
              {profile.designation}
            </p>

            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3.5 py-1 text-xs font-semibold text-green-800">
              <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
              Active Faculty
            </span>
          </div>

          <div className="mt-6 space-y-3 border-t border-gray-100 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Faculty ID</p>
                <p className="text-sm font-semibold text-gray-900">
                  {profile.facultyId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                <GraduationCap size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="text-sm font-medium text-gray-900">
                  {profile.department}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Personal & Professional Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Personal Information
                </h2>
                <p className="text-xs text-gray-500">
                  Official teacher details and verified contact info
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                <Edit size={14} />
                Edit Details
              </button>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {/* Full Name */}
              <div className="flex items-start gap-3.5">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-500">
                  <User size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">Full Name</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 truncate">
                    {profile.name}
                  </p>
                </div>
              </div>

              {/* Faculty ID */}
              <div className="flex items-start gap-3.5">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-500">
                  <ShieldCheck size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">Faculty ID</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {profile.facultyId}
                  </p>
                </div>
              </div>

              {/* Email Address */}
              <div className="flex items-start gap-3.5">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-500">
                  <Mail size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">Email Address</p>
                  <p className="mt-1 text-sm font-medium text-gray-900 truncate">
                    {profile.email || "Not provided"}
                  </p>
                </div>
              </div>

              {/* Phone Number */}
              <div className="flex items-start gap-3.5">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-500">
                  <Phone size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">Phone Number</p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {profile.phone || "Not provided"}
                  </p>
                </div>
              </div>

              {/* Department */}
              <div className="flex items-start gap-3.5">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-500">
                  <Building2 size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">Department</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 truncate">
                    {profile.department}
                  </p>
                </div>
              </div>

              {/* Designation */}
              <div className="flex items-start gap-3.5">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-500">
                  <BriefcaseBusiness size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500">Designation</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 truncate">
                    {profile.designation}
                  </p>
                </div>
              </div>

              {/* Qualification & Degree */}
              <div className="flex items-start gap-3.5 sm:col-span-2">
                <div className="rounded-xl bg-gray-50 p-2.5 text-gray-500 shrink-0">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Qualification & Degree</p>
                  <p className="mt-1 text-sm font-medium text-gray-800 leading-relaxed">
                    {profile.qualification}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Password Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Account Security & Password
                  </h2>
                  <p className="text-xs text-gray-500">
                    Update your temporary password to a secure personal password
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800 self-start sm:self-auto">
                <ShieldCheck size={14} className="text-emerald-600" />
                Active Account
              </span>
            </div>

            {/* Notification Callout */}
            <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-900">
              <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                <Lock size={14} /> Temporary Password Replacement
              </p>
              <p className="mt-1 text-amber-800 leading-relaxed">
                If you signed in using an institutional temporary password dispatched to your email, we strongly advise changing it to a private password of your choice.
              </p>
            </div>

            {/* In-Card Success / Error Banner */}
            {passwordSuccess && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-medium text-green-800">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
                <AlertCircle size={16} className="text-red-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* New Password */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 transition"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 transition"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <span className="text-[11px] text-gray-500">
                  Must be at least 6 characters with numbers or symbols.
                </span>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 transition disabled:opacity-60 cursor-pointer"
                >
                  <Lock size={14} />
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal Dialog */}
      {isEditing && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs transition-opacity duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop click */}
          <div className="fixed inset-0" onClick={handleCloseEdit} />

          {/* Modal Container */}
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-900">
                  <Edit size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Edit Teacher Profile
                  </h3>
                  <p className="text-xs text-gray-500">
                    Update your faculty details, photo, and contact information
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseEdit}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Profile Photo Upload & Live Preview Section */}
              <div className="rounded-xl border border-[#e7ded3] bg-[#fffdf9] p-4 sm:p-5">
                <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Profile Picture
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  {/* Live Avatar Preview */}
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 ring-4 ring-[#e9ded0] shadow-sm">
                    {formData.avatarUrl ? (
                      <img
                        src={formData.avatarUrl}
                        alt="Profile Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold tracking-wider text-white select-none">
                        {formInitials}
                      </span>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => modalFileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 transition"
                      >
                        <Upload size={14} />
                        Upload Photo
                      </button>

                      {formData.avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                        >
                          <Trash2 size={14} />
                          Remove Photo
                        </button>
                      )}
                    </div>

                    <input
                      ref={modalFileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/gif"
                      onChange={handleModalPhotoChange}
                      className="hidden"
                    />

                    <p className="text-[11px] text-gray-500">
                      Upload PNG, JPG, or WEBP (max 5MB). When removed, your starting letter ({formInitials}) will be displayed automatically.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Prof. Alex Morgan"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {/* Faculty ID (Permanent) */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Faculty ID (Permanent)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formData.facultyId}
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3.5 py-2.5 text-sm text-gray-500 cursor-not-allowed"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="e.g. faculty.google@dudex.edu"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="e.g. +91 98765 43210"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    placeholder="e.g. Computer Science & Engineering"
                    className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Designation <span className="font-normal text-gray-400">(set by the administrator)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    readOnly
                    disabled
                    className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500 outline-none"
                  />
                </div>
              </div>

              {/* Qualification */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Qualification & Degrees
                </label>
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) =>
                    setFormData({ ...formData, qualification: e.target.value })
                  }
                  placeholder="e.g. M.Tech in Computer Science, Ph.D. in AI & Robotics"
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
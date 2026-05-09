"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import {
  createProfile,
  fetchProfile,
  parseResume,
  parseResumeFile,
  updateProfile,
} from "@/lib/api";
import type { ParsedResumeResponse, UserProfile } from "@/lib/types";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useLocalUserId } from "@/lib/useLocalUserId";

type EducationEntry = {
  school_name: string;
  degree: string;
  major: string;
  start_date: string;
  end_date: string;
  details: string;
};

type ExperienceEntry = {
  company_name: string;
  employment_type: string;
  job_title: string;
  start_date: string;
  end_date: string;
  details: string;
};

type ProjectEntry = {
  project_name: string;
  project_role: string;
  start_date: string;
  end_date: string;
  details: string;
};

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const t = useT();
  const userId = useLocalUserId();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [resume, setResume] = useState("");
  const [skills, setSkills] = useState("");
  const [sponsorshipNeed, setSponsorshipNeed] = useState(false);
  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const markUnsaved = () => {
    setHasUnsavedChanges(true);
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const emptyEducation = (): EducationEntry => ({
    school_name: "",
    degree: "",
    major: "",
    start_date: "",
    end_date: "",
    details: "",
  });

  const emptyExperience = (): ExperienceEntry => ({
    company_name: "",
    employment_type: "",
    job_title: "",
    start_date: "",
    end_date: "",
    details: "",
  });

  const emptyProject = (): ProjectEntry => ({
    project_name: "",
    project_role: "",
    start_date: "",
    end_date: "",
    details: "",
  });

  const applyParsedData = (data: ParsedResumeResponse) => {
    const basicInfo = data.basic_info || {};

    const parsedFullName = basicInfo.full_name || "";
    const parsedEmail = basicInfo.email || "";
    const parsedPhone = basicInfo.phone || "";
    const parsedLocation = basicInfo.location || "";

    if (!parsedFullName && !parsedEmail) {
      alert(
        t("app.profile.errMissingNameEmailParsed")
      );
      return false;
    }

    setFullName(parsedFullName);
    setEmail(parsedEmail);
    setPhone(parsedPhone);
    setLocation(parsedLocation);
    setSkills(Array.isArray(data.skills) ? data.skills.join(", ") : "");
    setEducation(Array.isArray(data.education) ? data.education : []);
    setExperiences(Array.isArray(data.experiences) ? data.experiences : []);
    setProjects(Array.isArray(data.projects) ? data.projects : []);
    setResume(data.raw_text || "");
    setHasUnsavedChanges(true);

    return true;
  };

  const applySavedProfile = (profile: UserProfile) => {
    const basicInfo = profile.basic_info || {};

    setFullName(basicInfo.full_name || "");
    setEmail(basicInfo.email || "");
    setPhone(basicInfo.phone || "");
    setLocation(basicInfo.location || "");
    setResume(profile.resume_text || "");
    setSkills(
      Array.isArray(profile.known_skills) ? profile.known_skills.join(", ") : ""
    );
    setEducation(Array.isArray(profile.education) ? profile.education : []);
    setExperiences(Array.isArray(profile.experiences) ? profile.experiences : []);
    setProjects(Array.isArray(profile.projects) ? profile.projects : []);
    setSponsorshipNeed(Boolean(profile.sponsorship_need));
    setHasUnsavedChanges(false);
  };

  useEffect(() => {
    if (!userId) return;

    const loadProfile = async () => {
      try {
        setLoadingProfile(true);
        const data = await fetchProfile(userId);
        applySavedProfile(data);
        setProfileExists(true);
      } catch {
        console.log("No existing profile found yet.");
        setProfileExists(false);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [userId]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!userId) {
      alert(t("app.profile.errAccountLoadingMoment"));
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);

    const allowed = [".txt", ".pdf", ".docx"];
    const lowerName = file.name.toLowerCase();
    const isAllowed = allowed.some((ext) => lowerName.endsWith(ext));

    if (!isAllowed) {
      alert(t("app.profile.errFileType"));
      event.target.value = "";
      return;
    }

    try {
      setParsing(true);

      if (lowerName.endsWith(".txt")) {
        const text = await file.text();
        setResume(text);
        const data = await parseResume(userId, text);
        const ok = applyParsedData(data);
        if (ok) {
          alert(
            t("app.profile.msgResumeParsed")
          );
        }
      } else {
        const data = await parseResumeFile(userId, file);
        const ok = applyParsedData(data);
        if (ok) {
          alert(
            t("app.profile.msgResumeParsed")
          );
        }
      }
    } catch (error) {
      console.error(error);
      alert(t("app.profile.errFileParse"));
    } finally {
      setParsing(false);
      event.target.value = "";
    }
  };

  const handleParse = async () => {
    if (!userId) {
      alert(t("app.profile.errAccountLoadingMoment"));
      return;
    }

    if (!resume.trim()) {
      alert(t("app.profile.errResumeRequiredForParse"));
      return;
    }

    try {
      setParsing(true);
      const data = await parseResume(userId, resume);
      const ok = applyParsedData(data);
      if (ok) {
        alert(
          t("app.profile.msgResumeParsed")
        );
      }
    } catch (error) {
      console.error(error);
      alert(t("app.profile.errParse"));
    } finally {
      setParsing(false);
    }
  };

  const updateEducation = (
    index: number,
    field: keyof EducationEntry,
    value: string
  ) => {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
    markUnsaved();
  };

  const updateExperience = (
    index: number,
    field: keyof ExperienceEntry,
    value: string
  ) => {
    const updated = [...experiences];
    updated[index] = { ...updated[index], [field]: value };
    setExperiences(updated);
    markUnsaved();
  };

  const updateProject = (
    index: number,
    field: keyof ProjectEntry,
    value: string
  ) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value };
    setProjects(updated);
    markUnsaved();
  };

  const addEducation = () => {
    setEducation([...education, emptyEducation()]);
    markUnsaved();
  };

  const addExperience = () => {
    setExperiences([...experiences, emptyExperience()]);
    markUnsaved();
  };

  const addProject = () => {
    setProjects([...projects, emptyProject()]);
    markUnsaved();
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
    markUnsaved();
  };

  const removeExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
    markUnsaved();
  };

  const removeProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
    markUnsaved();
  };

  const handleSubmit = async () => {
    if (!userId) {
      alert(t("app.profile.errAccountLoadingMoment"));
      return;
    }

    if (!resume.trim()) {
      alert(t("app.profile.errResumeRequired"));
      return;
    }

    if (!fullName.trim() && !email.trim()) {
      alert(
        t("app.profile.errMissingNameEmailProfile")
      );
      return;
    }

    try {
      setLoading(true);

      const payload: UserProfile = {
        user_id: userId,
        basic_info: {
          full_name: fullName,
          email,
          phone,
          location,
        },
        resume_text: resume,
        education,
        experiences,
        projects,
        target_roles: ["Data Scientist"],
        preferred_locations: ["US"],
        sponsorship_need: sponsorshipNeed,
        known_skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      if (profileExists) {
        await updateProfile(userId, payload);
        setHasUnsavedChanges(false);
        alert(t("app.profile.msgUpdated"));
      } else {
        await createProfile(payload);
        setProfileExists(true);
        setHasUnsavedChanges(false);
        alert(t("app.profile.msgSaved"));
      }
    } catch (error) {
      console.error(error);
      alert(t("app.profile.errSave"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen text-[var(--color-text-primary)]">
      <Header />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-bold text-[var(--color-text-accent)]">
          {t("app.profile.title")}
        </h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          {t("app.profile.subtitle")}
        </p>

        {loadingProfile && (
          <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4 text-[var(--color-text-secondary)]">
            {t("app.profile.loadingProfile")}
          </div>
        )}

        {!loadingProfile && profileExists && (
          <div className="mt-6 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-4 text-[var(--color-text-accent)]">
            {t("app.profile.loadedProfile")}
          </div>
        )}

        {hasUnsavedChanges && (
          <div className="mt-6 rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 p-4 text-sm text-[var(--color-text-accent)]">
            {t("app.profile.unsavedChanges", {
              action: profileExists
                ? t("app.profile.updateProfile")
                : t("app.profile.saveProfile"),
            })}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-accent)]">
            {t("app.profile.searchSettings")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
            {t("app.profile.searchSettingsBody")}
          </p>

          <label className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              className="mt-1"
              checked={sponsorshipNeed}
              onChange={(event) => {
                setSponsorshipNeed(event.target.checked);
                markUnsaved();
              }}
            />
            <span>
              {t("app.profile.sponsorshipNeed")}
              <span className="mt-1 block text-[var(--color-text-muted)]">
                {t("app.profile.sponsorshipHelp")}
              </span>
            </span>
          </label>
        </div>

        <div className="mt-10 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-accent)]">
            {t("app.profile.resumeInput")}
          </h2>

          <textarea
            className="mt-4 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-4 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            rows={10}
            value={resume}
            onChange={(e) => {
              setResume(e.target.value);
              markUnsaved();
            }}
            placeholder={t("app.profile.resumePlaceholder")}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="hidden"
            onChange={handleFileUpload}
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleChooseFile}
              className="rounded-lg border border-[var(--color-accent)]/40 bg-[var(--color-bg-elev-1)] px-4 py-2 text-[var(--color-text-accent)] hover:bg-[var(--color-bg-elev-2)] transition"
            >
              {parsing ? t("app.profile.processing") : t("app.profile.uploadResume")}
            </button>

            <button
              type="button"
              onClick={handleParse}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 font-medium text-[#011A55] hover:opacity-90 transition"
            >
              {parsing ? t("app.profile.parsing") : t("app.profile.parseResume")}
            </button>
          </div>

          {selectedFileName && (
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              {t("app.profile.selectedFile", { name: selectedFileName })}
            </p>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-accent)]">
            {t("app.profile.basicInfo")}
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                {t("app.profile.fullName")}
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  markUnsaved();
                }}
                placeholder={t("app.profile.fullName")}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                {t("app.profile.email")}
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  markUnsaved();
                }}
                placeholder={t("app.profile.email")}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                {t("app.profile.phone")}
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  markUnsaved();
                }}
                placeholder={t("app.profile.phone")}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                {t("app.profile.location")}
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  markUnsaved();
                }}
                placeholder={t("app.profile.location")}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-accent)]">
              {t("app.profile.education")}
            </h2>
            <button
              type="button"
              onClick={addEducation}
              className="rounded-lg border border-[var(--color-accent)]/40 px-3 py-1 text-sm text-[var(--color-text-accent)] hover:bg-[var(--color-bg-elev-2)] transition"
            >
              {t("app.profile.add")}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {education.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("app.profile.noEducation")}
              </p>
            ) : (
              education.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                      {t("app.profile.educationItem", { n: index + 1 })}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="rounded-lg border border-red-400/40 px-3 py-1 text-sm text-red-300 hover:bg-[var(--color-danger-bg)] transition"
                    >
                      {t("app.profile.delete")}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                        {t("app.profile.schoolName")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                        value={item.school_name}
                        onChange={(e) =>
                          updateEducation(index, "school_name", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                        {t("app.profile.degree")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                        value={item.degree}
                        onChange={(e) =>
                          updateEducation(index, "degree", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                        {t("app.profile.major")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                        value={item.major}
                        onChange={(e) =>
                          updateEducation(index, "major", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                          {t("app.profile.startDate")}
                        </label>
                        <input
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                          value={item.start_date}
                          onChange={(e) =>
                            updateEducation(index, "start_date", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                          {t("app.profile.endDate")}
                        </label>
                        <input
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                          value={item.end_date}
                          onChange={(e) =>
                            updateEducation(index, "end_date", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                      {t("app.profile.details")}
                    </label>
                    <textarea
                      rows={4}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                      value={item.details}
                      onChange={(e) =>
                        updateEducation(index, "details", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-accent)]">
              {t("app.profile.experience")}
            </h2>
            <button
              type="button"
              onClick={addExperience}
              className="rounded-lg border border-[var(--color-accent)]/40 px-3 py-1 text-sm text-[var(--color-text-accent)] hover:bg-[var(--color-bg-elev-2)] transition"
            >
              {t("app.profile.add")}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {experiences.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("app.profile.noExperience")}
              </p>
            ) : (
              experiences.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                      {t("app.profile.experienceItem", { n: index + 1 })}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeExperience(index)}
                      className="rounded-lg border border-red-400/40 px-3 py-1 text-sm text-red-300 hover:bg-[var(--color-danger-bg)] transition"
                    >
                      {t("app.profile.delete")}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                        {t("app.profile.companyName")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                        value={item.company_name}
                        onChange={(e) =>
                          updateExperience(index, "company_name", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                        {t("app.profile.employmentType")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                        value={item.employment_type}
                        onChange={(e) =>
                          updateExperience(
                            index,
                            "employment_type",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                        {t("app.profile.jobTitle")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                        value={item.job_title}
                        onChange={(e) =>
                          updateExperience(index, "job_title", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                          {t("app.profile.startDate")}
                        </label>
                        <input
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                          value={item.start_date}
                          onChange={(e) =>
                            updateExperience(index, "start_date", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                          {t("app.profile.endDate")}
                        </label>
                        <input
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                          value={item.end_date}
                          onChange={(e) =>
                            updateExperience(index, "end_date", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                      {t("app.profile.details")}
                    </label>
                    <textarea
                      rows={5}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                      value={item.details}
                      onChange={(e) =>
                        updateExperience(index, "details", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-accent)]">
              {t("app.profile.projects")}
            </h2>
            <button
              type="button"
              onClick={addProject}
              className="rounded-lg border border-[var(--color-accent)]/40 px-3 py-1 text-sm text-[var(--color-text-accent)] hover:bg-[var(--color-bg-elev-2)] transition"
            >
              {t("app.profile.add")}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {projects.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                {t("app.profile.noProjects")}
              </p>
            ) : (
              projects.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                      {t("app.profile.projectItem", { n: index + 1 })}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeProject(index)}
                      className="rounded-lg border border-red-400/40 px-3 py-1 text-sm text-red-300 hover:bg-[var(--color-danger-bg)] transition"
                    >
                      {t("app.profile.delete")}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                        {t("app.profile.projectName")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                        value={item.project_name}
                        onChange={(e) =>
                          updateProject(index, "project_name", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                        {t("app.profile.projectRole")}
                      </label>
                      <input
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                        value={item.project_role}
                        onChange={(e) =>
                          updateProject(index, "project_role", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:col-span-2">
                      <div>
                        <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                          {t("app.profile.startDate")}
                        </label>
                        <input
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                          value={item.start_date}
                          onChange={(e) =>
                            updateProject(index, "start_date", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                          {t("app.profile.endDate")}
                        </label>
                        <input
                          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                          value={item.end_date}
                          onChange={(e) =>
                            updateProject(index, "end_date", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                      {t("app.profile.details")}
                    </label>
                    <textarea
                      rows={5}
                      className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] focus:outline-none"
                      value={item.details}
                      onChange={(e) =>
                        updateProject(index, "details", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-accent)]">
            {t("app.profile.skills")}
          </h2>

          <div className="mt-4">
            <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
              {t("app.profile.skills")}
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-3 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
              value={skills}
              onChange={(e) => {
                setSkills(e.target.value);
                markUnsaved();
              }}
              placeholder={t("app.profile.skillsPlaceholder")}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="mt-8 w-full rounded-xl bg-[var(--color-accent)] py-3 font-semibold text-[#011A55] hover:opacity-90 transition"
        >
          {loading
            ? t("app.profile.saving")
            : profileExists
              ? t("app.profile.updateProfile")
              : t("app.profile.saveProfile")}
        </button>
      </section>
    </main>
  );
}

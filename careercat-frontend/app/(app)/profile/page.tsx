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
        "We could not detect both name and email from this resume. Please provide a more complete resume before continuing."
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
      alert("Local account is still loading. Please try again in a moment.");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);

    const allowed = [".txt", ".pdf", ".docx"];
    const lowerName = file.name.toLowerCase();
    const isAllowed = allowed.some((ext) => lowerName.endsWith(ext));

    if (!isAllowed) {
      alert("Please upload a TXT, PDF, or DOCX file.");
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
            "Resume parsed successfully. Review the fields and click Update Profile to save these changes."
          );
        }
      } else {
        const data = await parseResumeFile(userId, file);
        const ok = applyParsedData(data);
        if (ok) {
          alert(
            "Resume parsed successfully. Review the fields and click Update Profile to save these changes."
          );
        }
      }
    } catch (error) {
      console.error(error);
      alert("Failed to parse uploaded file.");
    } finally {
      setParsing(false);
      event.target.value = "";
    }
  };

  const handleParse = async () => {
    if (!userId) {
      alert("Local account is still loading. Please try again in a moment.");
      return;
    }

    if (!resume.trim()) {
      alert("Please paste your resume or upload a file first.");
      return;
    }

    try {
      setParsing(true);
      const data = await parseResume(userId, resume);
      const ok = applyParsedData(data);
      if (ok) {
        alert(
          "Resume parsed successfully. Review the fields and click Update Profile to save these changes."
        );
      }
    } catch (error) {
      console.error(error);
      alert("Parse failed.");
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
      alert("Local account is still loading. Please try again in a moment.");
      return;
    }

    if (!resume.trim()) {
      alert("Please add your resume first.");
      return;
    }

    if (!fullName.trim() && !email.trim()) {
      alert(
        "This profile is missing both name and email. Please parse or complete your resume information first."
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
        alert("Profile updated!");
      } else {
        await createProfile(payload);
        setProfileExists(true);
        setHasUnsavedChanges(false);
        alert("Profile saved!");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#011A55] text-white">
      <Header />

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-bold text-[#FFB238]">Profile Setup</h1>
        <p className="mt-2 text-slate-300">
          Paste your resume or upload a TXT, PDF, or DOCX file to generate your
          structured profile.
        </p>

        {loadingProfile && (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-slate-300">
            Loading saved profile...
          </div>
        )}

        {!loadingProfile && profileExists && (
          <div className="mt-6 rounded-xl border border-[#FFB238]/30 bg-[#FFB238]/10 p-4 text-[#FFB238]">
            Existing profile loaded successfully.
          </div>
        )}

        {hasUnsavedChanges && (
          <div className="mt-6 rounded-xl border border-[#FFB238]/40 bg-[#FFB238]/10 p-4 text-sm text-[#FFB238]">
            You have unsaved profile changes. Click{" "}
            {profileExists ? "Update Profile" : "Save Profile"} to store them
            in this local account.
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-[#FFB238]/30 bg-[#FFB238]/10 p-6">
          <h2 className="text-lg font-semibold text-[#FFB238]">
            Job Search Settings
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            This setting controls job import warnings and automatic job
            recommendations.
          </p>

          <label className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
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
              I need visa sponsorship for jobs in the United States.
              <span className="mt-1 block text-slate-400">
                If enabled, CareerCat will warn before saving jobs that clearly
                do not sponsor, and it will filter those jobs out of discovery
                recommendations.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-[#FFB238]">Resume Input</h2>

          <textarea
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/10 p-4 text-white placeholder-slate-400 focus:outline-none"
            rows={10}
            value={resume}
            onChange={(e) => {
              setResume(e.target.value);
              markUnsaved();
            }}
            placeholder="Paste resume here..."
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
              className="rounded-lg border border-[#FFB238]/40 bg-white/5 px-4 py-2 text-[#FFB238] hover:bg-white/10 transition"
            >
              {parsing ? "Processing..." : "Upload Resume File"}
            </button>

            <button
              type="button"
              onClick={handleParse}
              className="rounded-lg bg-[#FFB238] px-4 py-2 font-medium text-[#011A55] hover:opacity-90 transition"
            >
              {parsing ? "Parsing..." : "Parse Resume"}
            </button>
          </div>

          {selectedFileName && (
            <p className="mt-3 text-sm text-slate-300">
              Selected file: {selectedFileName}
            </p>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-[#FFB238]">Basic Info</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Full Name
              </label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  markUnsaved();
                }}
                placeholder="Full Name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Email</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  markUnsaved();
                }}
                placeholder="Email"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Phone</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  markUnsaved();
                }}
                placeholder="Phone"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Location
              </label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  markUnsaved();
                }}
                placeholder="Location"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#FFB238]">Education</h2>
            <button
              type="button"
              onClick={addEducation}
              className="rounded-lg border border-[#FFB238]/40 px-3 py-1 text-sm text-[#FFB238] hover:bg-white/10 transition"
            >
              Add
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {education.length === 0 ? (
              <p className="text-sm text-slate-400">No education parsed yet.</p>
            ) : (
              education.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-300">
                      Education #{index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeEducation(index)}
                      className="rounded-lg border border-red-400/40 px-3 py-1 text-sm text-red-300 hover:bg-red-500/10 transition"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-slate-300">
                        School Name
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                        value={item.school_name}
                        onChange={(e) =>
                          updateEducation(index, "school_name", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-300">
                        Degree
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                        value={item.degree}
                        onChange={(e) =>
                          updateEducation(index, "degree", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-300">
                        Major
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                        value={item.major}
                        onChange={(e) =>
                          updateEducation(index, "major", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-sm text-slate-300">
                          Start Date
                        </label>
                        <input
                          className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                          value={item.start_date}
                          onChange={(e) =>
                            updateEducation(index, "start_date", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-slate-300">
                          End Date
                        </label>
                        <input
                          className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                          value={item.end_date}
                          onChange={(e) =>
                            updateEducation(index, "end_date", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-slate-300">
                      Details
                    </label>
                    <textarea
                      rows={4}
                      className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
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

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#FFB238]">
              Experience
            </h2>
            <button
              type="button"
              onClick={addExperience}
              className="rounded-lg border border-[#FFB238]/40 px-3 py-1 text-sm text-[#FFB238] hover:bg-white/10 transition"
            >
              Add
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {experiences.length === 0 ? (
              <p className="text-sm text-slate-400">No experience parsed yet.</p>
            ) : (
              experiences.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-300">
                      Experience #{index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeExperience(index)}
                      className="rounded-lg border border-red-400/40 px-3 py-1 text-sm text-red-300 hover:bg-red-500/10 transition"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-slate-300">
                        Company Name
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                        value={item.company_name}
                        onChange={(e) =>
                          updateExperience(index, "company_name", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-300">
                        Employment Type
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
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
                      <label className="mb-2 block text-sm text-slate-300">
                        Job Title
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                        value={item.job_title}
                        onChange={(e) =>
                          updateExperience(index, "job_title", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-sm text-slate-300">
                          Start Date
                        </label>
                        <input
                          className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                          value={item.start_date}
                          onChange={(e) =>
                            updateExperience(index, "start_date", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-slate-300">
                          End Date
                        </label>
                        <input
                          className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                          value={item.end_date}
                          onChange={(e) =>
                            updateExperience(index, "end_date", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-slate-300">
                      Details
                    </label>
                    <textarea
                      rows={5}
                      className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
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

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#FFB238]">Projects</h2>
            <button
              type="button"
              onClick={addProject}
              className="rounded-lg border border-[#FFB238]/40 px-3 py-1 text-sm text-[#FFB238] hover:bg-white/10 transition"
            >
              Add
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {projects.length === 0 ? (
              <p className="text-sm text-slate-400">No projects parsed yet.</p>
            ) : (
              projects.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-300">
                      Project #{index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeProject(index)}
                      className="rounded-lg border border-red-400/40 px-3 py-1 text-sm text-red-300 hover:bg-red-500/10 transition"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-slate-300">
                        Project Name
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                        value={item.project_name}
                        onChange={(e) =>
                          updateProject(index, "project_name", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-slate-300">
                        Project Role
                      </label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                        value={item.project_role}
                        onChange={(e) =>
                          updateProject(index, "project_role", e.target.value)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:col-span-2">
                      <div>
                        <label className="mb-2 block text-sm text-slate-300">
                          Start Date
                        </label>
                        <input
                          className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                          value={item.start_date}
                          onChange={(e) =>
                            updateProject(index, "start_date", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-slate-300">
                          End Date
                        </label>
                        <input
                          className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
                          value={item.end_date}
                          onChange={(e) =>
                            updateProject(index, "end_date", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-slate-300">
                      Details
                    </label>
                    <textarea
                      rows={5}
                      className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white focus:outline-none"
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

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-[#FFB238]">Skills</h2>

          <div className="mt-4">
            <label className="mb-2 block text-sm text-slate-300">
              Skills
            </label>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/10 p-3 text-white placeholder-slate-400 focus:outline-none"
              value={skills}
              onChange={(e) => {
                setSkills(e.target.value);
                markUnsaved();
              }}
              placeholder="Python, SQL, Machine Learning..."
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="mt-8 w-full rounded-xl bg-[#FFB238] py-3 font-semibold text-[#011A55] hover:opacity-90 transition"
        >
          {loading ? "Saving..." : profileExists ? "Update Profile" : "Save Profile"}
        </button>
      </section>
    </main>
  );
}

import json
import boto3

from app.config import BEDROCK_REGION, BEDROCK_MODEL_ID

bedrock_runtime = boto3.client(
    service_name="bedrock-runtime",
    region_name=BEDROCK_REGION,
)


def _extract_json_from_text(text: str):
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1 and end > start:
        json_candidate = text[start:end + 1]
        return json.loads(json_candidate)

    raise ValueError("Model did not return valid JSON.")


def generate_structured_json(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
    max_tokens: int = 2000,
    model_id: str | None = None,
):
    response = bedrock_runtime.converse(
        modelId=model_id or BEDROCK_MODEL_ID,
        system=[
            {
                "text": system_prompt,
            }
        ],
        messages=[
            {
                "role": "user",
                "content": [{"text": user_prompt}],
            }
        ],
        inferenceConfig={
            "temperature": temperature,
            "maxTokens": max_tokens,
        },
    )

    text = response["output"]["message"]["content"][0]["text"]
    return _extract_json_from_text(text)


def generate_text(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.4,
    max_tokens: int = 1800,
    model_id: str | None = None,
):
    response = bedrock_runtime.converse(
        modelId=model_id or BEDROCK_MODEL_ID,
        system=[
            {
                "text": system_prompt,
            }
        ],
        messages=[
            {
                "role": "user",
                "content": [{"text": user_prompt}],
            }
        ],
        inferenceConfig={
            "temperature": temperature,
            "maxTokens": max_tokens,
        },
    )

    return response["output"]["message"]["content"][0]["text"].strip()


def parse_resume_with_bedrock(resume_text: str):
    system_prompt = """
You are a resume parsing agent.

Your task is to extract structured resume information from raw resume text.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations.
Do not include comments.
Do not wrap the JSON in code fences.

Follow this schema exactly:

{
  "basic_info": {
    "full_name": "string",
    "email": "string",
    "phone": "string",
    "location": "string"
  },
  "education": [
    {
      "school_name": "string",
      "degree": "string",
      "major": "string",
      "start_date": "string",
      "end_date": "string",
      "details": "string"
    }
  ],
  "experiences": [
    {
      "company_name": "string",
      "employment_type": "string",
      "job_title": "string",
      "start_date": "string",
      "end_date": "string",
      "details": "string"
    }
  ],
  "projects": [
    {
      "project_name": "string",
      "project_role": "string",
      "start_date": "string",
      "end_date": "string",
      "details": "string"
    }
  ],
  "skills": ["string"]
}

Extraction rules:
1. Separate full_name, email, phone, and location correctly.
2. Do not put phone or email inside full_name.
3. Education must be split into school_name, degree, major, dates, and details.
4. Experiences must be split into company_name, employment_type, job_title, dates, and details.
5. Projects must be split into project_name, project_role, dates, and details.
6. If a field is missing, return an empty string.
7. If a list section does not exist, return an empty list.
8. Skills should be a deduplicated list of concrete skills.
9. Prefer precision over guessing.
"""

    user_prompt = f"""
Parse the following resume text into the required JSON schema.

Resume text:
{resume_text}
"""

    return generate_structured_json(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.1,
        max_tokens=2500,
    )


def parse_job_with_bedrock(job_text: str):
    system_prompt = """
You are a job post parsing agent.

Your task is to extract structured job information from raw job posting text.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations.
Do not include comments.
Do not wrap the JSON in code fences.

Follow this schema exactly:

{
  "company": "string",
  "title": "string",
  "location": "string",
  "work_mode": "Remote | Hybrid | Onsite | Unknown",
  "employment_type": "Full-time | Part-time | Internship | Contract | Temporary | Unknown",
  "seniority": "Internship | Entry-level | Mid-level | Senior | Lead | Manager | Unknown",
  "visa_sponsorship": "Yes | No | Unknown",
  "salary_range": "string",
  "posting_date": "string",
  "required_skills": ["string"],
  "preferred_skills": ["string"],
  "requirements": ["string"],
  "responsibilities": ["string"],
  "summary": "string"
}

Extraction rules:
1. Prefer explicit information from the job post over guessing.
2. If a field is missing, return an empty string, "Unknown", or an empty list as appropriate.
3. Normalize skills into concise, deduplicated skill names.
4. Keep salary_range as the original human-readable range if present.
5. Use ISO date format for posting_date when the date is explicit and unambiguous; otherwise return the original date text or an empty string.
6. summary should be 2 to 4 concise sentences.
"""

    user_prompt = f"""
Parse the following job post into the required JSON schema.

Job post:
{job_text}
"""

    return generate_structured_json(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.1,
        max_tokens=2200,
    )


def generate_bedrock_interview_prep(job: dict):
    title = job.get("title", "this role")
    skills = job.get("required_skills", [])
    summary = job.get("summary", "")

    system_prompt = """
You are an interview coach for job seekers.

Return ONLY valid JSON with this exact schema:
{
  "title": "string",
  "behavioral_questions": ["string", "string", "string"],
  "technical_topics": ["string", "string", "string"],
  "preparation_tips": ["string", "string", "string"]
}
"""

    user_prompt = f"""
Based on the following job information, generate interview preparation content.

Job title: {title}
Required skills: {", ".join(skills)}
Job summary:
{summary}
"""

    return generate_structured_json(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=0.3,
        max_tokens=800,
    )

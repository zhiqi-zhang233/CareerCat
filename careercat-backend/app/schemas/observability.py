from typing import Any

from pydantic import BaseModel, Field


class AgentRun(BaseModel):
    user_id: str
    run_id: str
    action_type: str
    selected_tool: str = ""
    route: str = ""
    input_summary: str = ""
    model_output_summary: str = ""
    tool_result_summary: str = ""
    success: bool = True
    latency_ms: int = 0
    error_message: str = ""
    created_at: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


class ObservabilityRunsResponse(BaseModel):
    user_id: str
    runs: list[AgentRun]


class MetricCard(BaseModel):
    label: str
    value: str
    explanation: str


class ObservabilityMetricsResponse(BaseModel):
    user_id: str
    total_runs: int
    success_rate: float
    average_latency_ms: int
    failure_count: int
    action_counts: dict[str, int]
    tool_counts: dict[str, int]
    latest_run_at: str
    metric_cards: list[MetricCard]


class SponsorshipFilterCase(BaseModel):
    case_id: str
    label: str
    job_text: str
    expected_visa_sponsorship: str
    detected_visa_sponsorship: str
    expected_action: str
    actual_action: str
    passed: bool
    explanation: str


class SponsorshipFilterCheckResponse(BaseModel):
    user_id: str
    metric_name: str
    sample_count: int
    accuracy: float
    passed_cases: int
    total_cases: int
    current_profile_requires_sponsorship: bool
    decision_rule: str
    cases: list[SponsorshipFilterCase]

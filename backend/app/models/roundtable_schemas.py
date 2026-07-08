# ==============================================================================
# ROUNDTABLE SCHEMAS (models/roundtable_schemas.py)
# ==============================================================================
# Request/response models for the multi-character roundtable, plus the
# structured-output schemas handed to Gemini (response_schema) for the router,
# the character turns and the round synthesis.

from pydantic import BaseModel, Field
from typing import List, Literal, Optional


# ------------------------------------------------------------------------------
# Graph memory (mirrors frontend/src/types.ts — frontend owns merging/persistence)
# ------------------------------------------------------------------------------

class MemoryNode(BaseModel):
    id: str
    label: str = ""
    type: str = "concept"  # character | concept | project | event | belief
    summary: str = ""
    stance: Optional[float] = None   # -1..1 valence toward this node
    salience: float = 0.6            # 0..1
    mentions: int = 1
    createdAt: str = ""
    updatedAt: str = ""

    class Config:
        extra = "ignore"


class MemoryEdge(BaseModel):
    id: str
    source: str
    target: str
    relation: str = "related_to"
    stance: Optional[float] = None
    weight: float = 0.5
    note: Optional[str] = None
    createdAt: str = ""
    updatedAt: str = ""

    class Config:
        extra = "ignore"


class CharacterMemoryGraph(BaseModel):
    characterId: str
    version: int = 0
    nodes: List[MemoryNode] = []
    edges: List[MemoryEdge] = []
    updatedAt: str = ""

    class Config:
        extra = "ignore"


# ------------------------------------------------------------------------------
# Memory delta — emitted by each character turn, merged by the frontend
# ------------------------------------------------------------------------------

class DeltaNode(BaseModel):
    id: str = Field(description="Stable slug id: 'concept:dark-mode-pivot', 'char:anna', 'event:pitch-round', 'belief:speed-beats-polish'")
    label: str = Field(description="Short display label, max 60 chars")
    type: Literal["character", "concept", "project", "event", "belief"]
    summary: str = Field(description="What I (the character) now think about this, in MY voice, max 140 chars")
    stance: Optional[float] = Field(default=None, description="My valence toward it, -1 (despise) to 1 (champion)")


class DeltaNodeUpdate(BaseModel):
    id: str
    stance: Optional[float] = None
    summary: Optional[str] = None
    salience_boost: Optional[float] = Field(default=None, description="0..0.4 how much more this matters to me now")


class DeltaEdge(BaseModel):
    source: str = Field(description="Node id the relation starts from (usually 'char:<me>')")
    target: str
    relation: str = Field(description="believes|opposes|supports|distrusts|allied_with|proposed|lost_argument_to or short free-form")
    stance: Optional[float] = None
    note: Optional[str] = Field(default=None, description="One-line justification, max 120 chars")


class DeltaEdgeUpdate(BaseModel):
    id: str = Field(description="Edge id in the form 'source|relation|target'")
    stance: Optional[float] = None
    weight_boost: Optional[float] = None
    note: Optional[str] = None


class MemoryDelta(BaseModel):
    add_nodes: List[DeltaNode] = []
    update_nodes: List[DeltaNodeUpdate] = []
    add_edges: List[DeltaEdge] = []
    update_edges: List[DeltaEdgeUpdate] = []


# ------------------------------------------------------------------------------
# Gemini structured outputs
# ------------------------------------------------------------------------------

class RouterDecision(BaseModel):
    action: Literal["speak", "end_round"]
    next_speaker: Optional[str] = Field(default=None, description="characterId of who speaks next; required when action=speak")
    directive: Optional[str] = Field(default=None, description="One-line stage direction for the speaker, e.g. 'Rebut Anna's CAC estimate — you disagree'")
    reasoning: str = Field(description="One sentence: why this speaker / why the round ends")


class CharacterTurnOutput(BaseModel):
    inner_thought: str = Field(description="1-3 sentences of HIDDEN in-character strategy: what I really think and what I'm trying to do this turn")
    public_reply: str = Field(description="What I say out loud at the table, in my voice")
    stance_score: Optional[float] = Field(default=None, description="Pitch mode: my running score 0-10. Boardroom mode: my agreement with the current proposal -1..1")
    memory_delta: MemoryDelta


class ActionItem(BaseModel):
    owner: str = Field(description="characterId or 'user'")
    item: str


class BoardroomSynthesis(BaseModel):
    decision: str = Field(description="The board's decision in one or two sentences")
    rationale: str
    actionItems: List[ActionItem] = []
    dissent: Optional[str] = Field(default=None, description="Who dissented and why, if anyone")


class JudgeScore(BaseModel):
    judge: str = Field(description="characterId")
    score: float = Field(description="0-10")
    objection: str = Field(description="The judge's single biggest objection")


class PitchSynthesis(BaseModel):
    verdict: Literal["invest", "pass", "counteroffer"]
    scorecard: List[JudgeScore] = []
    summary: str


# ------------------------------------------------------------------------------
# Request
# ------------------------------------------------------------------------------

class RoundtableMessage(BaseModel):
    id: str
    sender: str   # "user" or a characterId
    text: str     # public transcript only — inner thoughts are never echoed back

    class Config:
        extra = "ignore"


class SeatedCharacter(BaseModel):
    characterId: str
    memory: CharacterMemoryGraph

    class Config:
        extra = "ignore"


class RoundtableRequest(BaseModel):
    text: str
    mode: str = "boardroom"  # "boardroom" | "pitch"
    participants: List[SeatedCharacter] = []
    history: List[RoundtableMessage] = []
    customApiKey: Optional[str] = None
    selectedModel: Optional[str] = "gemini-3.5-flash"
    responseLength: Optional[str] = "medium"
    maxTurns: int = 8  # server clamps 3..10

    class Config:
        extra = "ignore"

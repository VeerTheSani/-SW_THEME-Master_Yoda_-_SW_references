#!/usr/bin/env python3
"""
Generate visual diagrams explaining Master Yoda backend code concepts.
Creates PNG images for: FastAPI flow, Pydantic models, Roundtable orchestrator,
Memory graphs, Provider decision tree, Character system, and syntax guide.
"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, ConnectionPatch
import numpy as np
import os

OUTPUT_DIR = r"C:\Users\sanis\Redeem\(SW_theme)_MasterYoda\code_visuals"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Color palette - Star Wars dark theme
DARK_BG = '#0a0e1a'
PANEL_BG = '#131829'
BORDER = '#2a3050'
GOLD = '#ffd700'
BLUE = '#4299e1'
GREEN = '#48bb78'
PURPLE = '#9f7aea'
ORANGE = '#ed8936'
RED = '#f56565'
CYAN = '#64ffda'
TEXT = '#e0e6f0'
TEXT_DIM = '#8892b0'

def save_fig(name):
    path = os.path.join(OUTPUT_DIR, f"{name}.png")
    plt.savefig(path, dpi=200, facecolor=DARK_BG, edgecolor='none', bbox_inches='tight')
    plt.close()
    print(f"  ✅ {name}.png")
    return path

# ============================================================
# 1. FASTAPI REQUEST LIFECYCLE
# ============================================================
def draw_fastapi_flow():
    fig, ax = plt.subplots(figsize=(14, 5))
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(DARK_BG)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 5)
    ax.axis('off')

    # Title
    ax.text(7, 4.6, 'FastAPI Request Lifecycle — /api/yoda/generate', 
            fontsize=16, color=GOLD, ha='center', weight='bold')

    boxes = [
        (0.5, 2.5, 2.5, 1.5, '🌐 Frontend\n(React)', BLUE, 
         'POST /api/yoda/generate\n{text, mode, character,\nhistory, customApiKey?}'),
        (3.5, 2.5, 2.5, 1.5, '🎯 endpoints.py\ngenerate_response()', GREEN,
         '① validate & strip text\n② enforce_size_limits()\n③ resolve API key\n④ validate_relay_url()\n⑤ apply_server_default()'),
        (6.5, 3.5, 2.5, 1.2, '📋 models/schemas.py\nGenerationRequest', PURPLE,
         'Pydantic validation\nautomatically rejects\nmalformed JSON (422)'),
        (6.5, 1.3, 2.5, 1.2, '🧠 services/\nprompts.py', PURPLE,
         'get_system_instruction()\nbuilds character prompt\nfrom mode, ragebaitLevel'),
        (9.5, 2.5, 2.5, 1.5, '🔌 services/\nllm_service.py', ORANGE,
         'call_gemini()\nOR\ncall_openai_compatible()\n→ HTTP request to LLM'),
        (12.5, 2.5, 2.5, 1.5, '🤖 LLM Provider\n(Gemini / OpenRouter)', RED,
         'Returns generated\nreply text'),
    ]

    for x, y, w, h, title, color, desc in boxes:
        box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1",
                             facecolor=PANEL_BG, edgecolor=color, linewidth=2)
        ax.add_patch(box)
        ax.text(x + w/2, y + h - 0.25, title, fontsize=10, color=color, 
                ha='center', va='top', weight='bold')
        ax.text(x + w/2, y + 0.2, desc, fontsize=8, color=TEXT_DIM, 
                ha='center', va='bottom', linespacing=1.3)

    # Arrows
    arrows = [
        ((3.0, 3.25), (3.5, 3.25)),  # frontend -> endpoints
        ((6.0, 3.25), (6.5, 3.55)),  # endpoints -> schemas
        ((6.0, 2.5), (6.5, 1.9)),    # endpoints -> prompts
        ((9.0, 3.25), (9.5, 3.25)),  # prompts -> llm_service
        ((12.0, 3.25), (12.5, 3.25)), # llm_service -> provider
    ]
    for (x1, y1), (x2, y2) in arrows:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color=CYAN, lw=2))

    # Fallback path
    fallback_box = FancyBboxPatch((3.5, 0.3), 2.5, 1.2, boxstyle="round,pad=0.1",
                                  facecolor='#2a1a1a', edgecolor=RED, linewidth=2, linestyle='--')
    ax.add_patch(fallback_box)
    ax.text(4.75, 1.3, '⚠️ Fallback Path', fontsize=9, color=RED, ha='center', weight='bold')
    ax.text(4.75, 0.6, 'generate_offline_response()\nif KEY_UNCONFIGURED or\nQUOTA_EXCEEDED', 
            fontsize=7, color=TEXT_DIM, ha='center')

    ax.annotate('', xy=(4.75, 1.0), xytext=(4.75, 2.5),
                arrowprops=dict(arrowstyle='->', color=RED, lw=1.5, linestyle='--'))

    # Response
    resp_box = FancyBboxPatch((9.5, 0.3), 3.5, 1.2, boxstyle="round,pad=0.1",
                              facecolor='#1a3a2a', edgecolor=GREEN, linewidth=2)
    ax.add_patch(resp_box)
    ax.text(11.25, 1.3, '✅ Success Response', fontsize=9, color=GREEN, ha='center', weight='bold')
    ax.text(11.25, 0.6, '{reply, isFallback: false,\nactualModelUsed, modelFallbackOccurred}',
            fontsize=7, color=TEXT_DIM, ha='center')

    ax.annotate('', xy=(11.25, 1.0), xytext=(12.0, 2.5),
                arrowprops=dict(arrowstyle='->', color=GREEN, lw=1.5))

    save_fig("01_fastapi_request_flow")

# ============================================================
# 2. PYDANTIC MODEL ANATOMY
# ============================================================
def draw_pydantic_anatomy():
    fig, ax = plt.subplots(figsize=(14, 8))
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(DARK_BG)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 8)
    ax.axis('off')

    ax.text(7, 7.5, 'Pydantic Model Anatomy — From Your Code', 
            fontsize=16, color=GOLD, ha='center', weight='bold')

    # GenerationRequest model
    ax.text(1, 6.8, '📋 GenerationRequest (schemas.py)', fontsize=12, color=BLUE, weight='bold')

    fields = [
        (0.5, 5.8, 'text: str', 'Required — user message', GREEN),
        (0.5, 5.2, 'mode: str = "roast"', 'Default = "roast"', CYAN),
        (0.5, 4.6, 'character: str = "yoda"', 'Default = "yoda"', CYAN),
        (0.5, 4.0, 'isUnhinged: bool = False', 'Default False', CYAN),
        (0.5, 3.4, 'customApiKey: str | None = None', 'Optional — BYO key', ORANGE),
        (0.5, 2.8, 'providerBaseUrl: str | None = None', 'Optional — BYO relay', ORANGE),
        (0.5, 2.2, 'selectedModel: str = "gemini-3.5-flash"', 'Default model', CYAN),
        (0.5, 1.6, 'powerSource: str | None = None', 'Who pays? (house/server_gemini)', PURPLE),
        (0.5, 1.0, 'history: List[ChatMessage] = []', 'Nested model validation!', BLUE),
        (0.5, 0.4, 'ragebaitLevel: float = 0.5', '0.2–1.0 troll intensity', RED),
    ]

    for x, y, field, desc, color in fields:
        ax.text(x, y, field, fontsize=10, color=color, family='monospace', va='center')
        ax.text(x + 4.5, y, f'# {desc}', fontsize=9, color=TEXT_DIM, family='monospace', va='center')

    # Explanation boxes
    explanations = [
        (5.5, 5.5, 3.5, 1.8, '🔑 Key Syntax', [
            'str = "default"  → optional with default',
            'str | None = None  → optional, no default',
            'List[ChatMessage]  → nested validation',
            'Field(description="...")  → doubles as AI prompt!',
        ]),
        (9.5, 5.5, 4, 1.8, '⚡ What FastAPI Does Automatically', [
            '1. Parses JSON body',
            '2. Validates every field',
            '3. Coerces types (int→str)',
            '4. Rejects extra fields (extra="ignore")',
            '5. Returns 422 on error — your code never runs!',
        ]),
        (5.5, 3.2, 4, 2, '📦 ChatMessage Nested Model', [
            'class ChatMessage(BaseModel):',
            '    id: str',
            '    sender: str  # "user" or "model"',
            '    text: str',
            '',
            'class Config:',
            '    extra = "ignore"  # drop unknown fields',
        ]),
        (9.5, 3.2, 4, 2, '🎯 Roundtable Schemas (Bigger!)', [
            'MemoryNode / MemoryEdge  — graph nodes & edges',
            'CharacterMemoryGraph    — per-character knowledge',
            'DeltaNode / DeltaEdge   — what AI can change',
            'AdminDecision           — moderator picks speakers',
            'CharacterTurnOutput     — inner_thought + public_reply',
            'TurnScore               — adjudicator grades (-10..10)',
            'BoardroomSynthesis      — final verdict',
        ]),
    ]

    for x, y, w, h, title, lines in explanations:
        box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1",
                             facecolor=PANEL_BG, edgecolor=BORDER, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x + 0.15, y + h - 0.2, title, fontsize=11, color=GOLD, weight='bold')
        for i, line in enumerate(lines):
            ax.text(x + 0.15, y + h - 0.55 - i * 0.28, line, fontsize=9, color=TEXT, family='monospace' if 'class' in line or 'extra' in line else 'sans-serif')

    save_fig("02_pydantic_model_anatomy")

# ============================================================
# 3. ROUNDTABLE ORCHESTRATOR FLOW
# ============================================================
def draw_roundtable_flow():
    fig, ax = plt.subplots(figsize=(16, 9))
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(DARK_BG)
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 9)
    ax.axis('off')

    ax.text(8, 8.5, 'Roundtable Orchestrator — /api/roundtable/generate', 
            fontsize=16, color=GOLD, ha='center', weight='bold')
    ax.text(8, 8.1, '3 AI characters debate · Streamed as NDJSON (newline-delimited JSON)', 
            fontsize=10, color=TEXT_DIM, ha='center')

    # Pipeline selection
    pipeline_box = FancyBboxPatch((0.5, 6.8), 15, 1.3, boxstyle="round,pad=0.1",
                                   facecolor='#1a1a3a', edgecolor=BLUE, linewidth=2)
    ax.add_patch(pipeline_box)
    ax.text(8, 7.8, '🔀 PIPELINE SELECTION', fontsize=12, color=BLUE, ha='center', weight='bold')
    ax.text(8, 7.3, '@name mentioned? → run_direct_reply    |    No API key? → run_offline_roundtable    |    Else → run_admin_roundtable (real thing)',
            fontsize=9, color=TEXT, ha='center')

    # Main flow boxes
    stages = [
        (0.5, 4.8, 3, 1.8, '📥 INPUT\nValidation', BLUE, [
            'exactly 3 distinct chars',
            'size limits (nodes/edges)',
            'resolve key + provider',
            'optional moderator brain',
        ]),
        (4, 4.8, 3.5, 1.8, '🧠 ADMIN DECISION\n(gemini-3.1-flash-lite)', PURPLE, [
            'build_admin_prompt()',
            'picks 1–3 speakers',
            'decides close_round?',
            '_sanitize_admin_decision()',
        ]),
        (8, 4.8, 3.5, 1.8, '🗣️ CHARACTER TURNS\n(user-selected model)', GREEN, [
            'recall_subgraph() — deterministic',
            'build_character_turn_prompt()',
            'LLM → CharacterTurnOutput',
            'sanitize_delta() — caps at 4 nodes/6 edges',
            'parallel OR sequential',
        ]),
        (12, 4.8, 3.5, 1.8, '⚖️ ADJUDICATOR\n(optional, moderator brain)', ORANGE, [
            'build_scorekeeper_prompt()',
            'independent critic',
            'TurnScore: -10..+10',
            'never breaks the round',
        ]),
    ]

    for x, y, w, h, title, color, lines in stages:
        box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1",
                             facecolor=PANEL_BG, edgecolor=color, linewidth=2)
        ax.add_patch(box)
        ax.text(x + w/2, y + h - 0.2, title, fontsize=11, color=color, ha='center', weight='bold')
        for i, line in enumerate(lines):
            ax.text(x + 0.1, y + h - 0.5 - i * 0.3, line, fontsize=8.5, color=TEXT, family='monospace' if '()' in line else 'sans-serif')

    # Arrows between stages
    for i in range(3):
        x1 = stages[i][0] + stages[i][2]
        y1 = stages[i][1] + stages[i][3]/2
        x2 = stages[i+1][0]
        y2 = stages[i+1][1] + stages[i+1][3]/2
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color=CYAN, lw=2))

    # Synthesis & Stream
    bottom_boxes = [
        (0.5, 2.5, 7, 1.8, '📊 SYNTHESIS (only if close_round)', GREEN, [
            'build_synthesis_prompt() with stance_scores',
            'BoardroomSynthesis: decision + rationale + action_items + dissent',
            'PitchSynthesis: invest/pass/counteroffer + judge scorecard',
            'Fallback: _naive_synthesis() from stance averages',
        ]),
        (8.5, 2.5, 7, 1.8, '📤 NDJSON STREAM (StreamingResponse)', CYAN, [
            'Each event = one JSON line + "\\n"',
            'Events: round_start → router_decision → turn_start →',
            'memory_recall → turn_complete → turn_score →',
            'round_synthesis → round_end',
            'Headers: no-cache, X-Accel-Buffering: no',
        ]),
    ]

    for x, y, w, h, title, color, lines in bottom_boxes:
        box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1",
                             facecolor=PANEL_BG, edgecolor=color, linewidth=2)
        ax.add_patch(box)
        ax.text(x + w/2, y + h - 0.2, title, fontsize=11, color=color, ha='center', weight='bold')
        for i, line in enumerate(lines):
            ax.text(x + 0.1, y + h - 0.5 - i * 0.3, line, fontsize=8.5, color=TEXT)

    # Offline demo
    offline_box = FancyBboxPatch((0.5, 0.3), 15, 1.8, boxstyle="round,pad=0.1",
                                  facecolor='#2a1a1a', edgecolor=RED, linewidth=2, linestyle='--')
    ax.add_patch(offline_box)
    ax.text(8, 1.8, '🛟 OFFLINE / KEYLESS DEMO MODE', fontsize=12, color=RED, ha='center', weight='bold')
    ax.text(8, 1.3, 'run_offline_roundtable(): deterministic scripted round · same NDJSON events · canned character lines · hardcoded stance scores',
            fontsize=9, color=TEXT, ha='center')
    ax.text(8, 0.7, 'run_offline_direct_reply(): single @name reply · run_direct_reply() with fallback lines · no LLM calls at all',
            fontsize=9, color=TEXT_DIM, ha='center')

    save_fig("03_roundtable_orchestrator_flow")

# ============================================================
# 4. MEMORY GRAPH VISUALIZATION
# ============================================================
def draw_memory_graph():
    fig, ax = plt.subplots(figsize=(14, 7))
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(DARK_BG)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 7)
    ax.axis('off')

    ax.text(7, 6.6, 'Per-Character Memory Graph — How Characters Remember', 
            fontsize=16, color=GOLD, ha='center', weight='bold')
    ax.text(7, 6.2, 'Backend is STATELESS — frontend sends full graph per request, backend returns Delta', 
            fontsize=10, color=TEXT_DIM, ha='center')

    # Two character graphs side by side
    chars = [
        (2, 3.5, '🟢 YODA', '#4299e1', [
            ('concept:dark-mode', 'concept', 2.5, 5.0),
            ('char:ragebaiter', 'character', 1.0, 3.5),
            ('belief:patience', 'belief', 3.5, 2.5),
            ('project:pivot', 'project', 1.0, 1.5),
        ]),
        (9, 3.5, '😡 RAGEBAITER', '#ed8936', [
            ('concept:mid', 'concept', 9.5, 5.0),
            ('char:yoda', 'character', 11.0, 3.5),
            ('belief:ratio', 'belief', 9.5, 2.0),
            ('project:clout', 'project', 11.5, 1.5),
        ]),
    ]

    type_colors = {
        'concept': ('#2a3a6a', '#4299e1'),
        'character': ('#3a2a5a', '#9f7aea'),
        'belief': ('#2a4a3a', '#48bb78'),
        'project': ('#4a3a1a', '#ed8936'),
    }

    for cx, cy, name, name_color, nodes in chars:
        ax.text(cx, cy + 2.3, name, fontsize=13, color=name_color, ha='center', weight='bold')
        
        for label, ntype, nx, ny in nodes:
            bg, border = type_colors[ntype]
            box = FancyBboxPatch((nx - 0.7, ny - 0.25), 1.4, 0.5, boxstyle="round,pad=0.05",
                                 facecolor=bg, edgecolor=border, linewidth=1.5)
            ax.add_patch(box)
            ax.text(nx, ny, label, fontsize=7.5, color=TEXT, ha='center', va='center', family='monospace')

        # Draw edges between nodes
        edges = [
            (nodes[0][2:], nodes[1][2:], 'distrusts'),
            (nodes[0][2:], nodes[2][2:], 'values'),
            (nodes[1][2:], nodes[3][2:], 'mocks'),
        ]
        for (x1, y1), (x2, y2), rel in edges:
            ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                        arrowprops=dict(arrowstyle='->', color=TEXT_DIM, lw=1, linestyle=':'))
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            ax.text(mx, my + 0.15, rel, fontsize=6, color=TEXT_DIM, ha='center', style='italic')

    # MemoryDelta explanation
    delta_box = FancyBboxPatch((0.5, 0.2), 13, 2.3, boxstyle="round,pad=0.1",
                                facecolor=PANEL_BG, edgecolor=PURPLE, linewidth=2)
    ax.add_patch(delta_box)
    ax.text(7, 2.3, '📝 MemoryDelta — What One Turn Can Change', fontsize=12, color=PURPLE, ha='center', weight='bold')
    
    delta_lines = [
        'add_nodes:    [DeltaNode(id, label, type, summary, stance?)]  — MAX 4 per turn',
        'update_nodes: [DeltaNodeUpdate(id, label?, summary?, stance?)] — MAX 6 per turn',
        'add_edges:    [DeltaEdge(id, source, target, relation, stance?, weight?, note?)] — MAX 6 per turn',
        'update_edges: [DeltaEdgeUpdate(id, relation?, stance?, weight?, note?)]',
        '',
        'sanitize_delta() enforces caps, validates IDs (char:/concept:/project:/event:/belief:),',
        'clips summaries to 140 chars, stances to [-1, 1]. Frontend merges deltas into its stored graph.',
    ]
    for i, line in enumerate(delta_lines):
        ax.text(1, 1.9 - i * 0.25, line, fontsize=9, color=TEXT if line else TEXT_DIM, family='monospace')

    # Recall function
    recall_box = FancyBboxPatch((0.5, -0.5), 13, 1.5, boxstyle="round,pad=0.1",
                                 facecolor='#1a2a4a', edgecolor=BLUE, linewidth=1.5)
    ax.add_patch(recall_box)
    ax.text(1, 0.5, '🔍 recall_subgraph(graph, query_text, seated_ids) → (nodes, edges)', fontsize=9, color=BLUE, weight='bold')
    ax.text(1, 0.1, '1. Tokenize query (remove stopwords)  2. Score nodes by token overlap × salience × recency  3. Return top-K nodes + edges between them',
            fontsize=8, color=TEXT_DIM, family='monospace')

    save_fig("04_memory_graph_visualization")

# ============================================================
# 5. PROVIDER DECISION TREE
# ============================================================
def draw_provider_tree():
    fig, ax = plt.subplots(figsize=(14, 8))
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(DARK_BG)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 8)
    ax.axis('off')

    ax.text(7, 7.5, '"Who Pays?" — Provider Decision Tree (apply_server_default)', 
            fontsize=16, color=GOLD, ha='center', weight='bold')
    ax.text(7, 7.1, 'powerSource from frontend decides whose API key serves the request', 
            fontsize=10, color=TEXT_DIM, ha='center')

    # Tree nodes
    nodes = [
        # (x, y, w, h, text, color, border_color)
        (7, 6.2, 3, 0.8, 'powerSource\nfrom request', BLUE, CYAN),
        
        # Level 1
        (1.5, 4.8, 2.5, 0.7, '"house"', PURPLE, PURPLE),
        (5, 4.8, 2.5, 0.7, '"server_gemini"', BLUE, BLUE),
        (8.5, 4.8, 2.5, 0.7, 'custom provider\nor custom key', ORANGE, ORANGE),
        (12, 4.8, 2.5, 0.7, 'None (legacy)', TEXT_DIM, BORDER),
        
        # Level 2 results
        (1.5, 3.3, 2.5, 1.0, 'Operator\'s relay\nDEFAULT_PROVIDER_*\nModel = operator\'s choice', PURPLE, PURPLE),
        (5, 3.3, 2.5, 1.0, 'Google Gemini\nOperator\'s GEMINI_API_KEY\nModel = visitor picks', BLUE, BLUE),
        (8.5, 3.3, 2.5, 1.0, 'Visitor\'s relay URL\nVisitor\'s API key\nModel = visitor picks', ORANGE, ORANGE),
        (12, 3.3, 2.5, 1.0, 'Implicit priority:\n1. client relay\n2. client Google key\n3. operator relay\n4. operator Gemini\n5. OFFLINE', TEXT_DIM, BORDER),
        
        # Fallback
        (7, 1.5, 4, 0.8, '🛟 OFFLINE FALLBACK\ngenerate_offline_response() / run_offline_roundtable()', RED, RED),
    ]

    for x, y, w, h, text, fill, border in nodes:
        box = FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="round,pad=0.1",
                             facecolor=fill if fill != TEXT_DIM else PANEL_BG, 
                             edgecolor=border, linewidth=2)
        ax.add_patch(box)
        ax.text(x, y, text, fontsize=9, color=TEXT if fill != TEXT_DIM else TEXT_DIM, 
                ha='center', va='center', weight='bold' if fill in (PURPLE, BLUE, ORANGE, RED) else 'normal')

    # Arrows
    arrows = [
        ((7, 5.8), (1.5, 5.15)),  # house
        ((7, 5.8), (5, 5.15)),    # server_gemini
        ((7, 5.8), (8.5, 5.15)),  # custom
        ((7, 5.8), (12, 5.15)),   # legacy
        ((1.5, 4.1), (1.5, 3.8)), # house result
        ((5, 4.1), (5, 3.8)),     # server_gemini result
        ((8.5, 4.1), (8.5, 3.8)), # custom result
        ((12, 4.1), (12, 3.8)),   # legacy result
        # all legacy paths -> fallback
        ((1.5, 2.8), (5, 1.9)),
        ((5, 2.8), (7, 1.9)),
        ((8.5, 2.8), (9, 1.9)),
        ((12, 2.8), (7, 1.9)),
    ]
    for (x1, y1), (x2, y2) in arrows:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color=CYAN, lw=1.5))

    # Security callout
    sec_box = FancyBboxPatch((0.5, 0.2), 13, 1.0, boxstyle="round,pad=0.1",
                              facecolor='#2a1a1a', edgecolor=RED, linewidth=2)
    ax.add_patch(sec_box)
    ax.text(7, 0.8, '🔒 CRITICAL SECURITY RULE', fontsize=11, color=RED, ha='center', weight='bold')
    ax.text(7, 0.4, 'resolve_api_key(): if providerBaseUrl is set → server\'s GEMINI_API_KEY is NEVER sent to that URL (prevents key exfiltration / SSRF)',
            fontsize=9, color=TEXT, ha='center')

    save_fig("05_provider_decision_tree")

# ============================================================
# 6. CHARACTER SYSTEM
# ============================================================
def draw_character_system():
    fig, ax = plt.subplots(figsize=(14, 8))
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(DARK_BG)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 8)
    ax.axis('off')

    ax.text(7, 7.5, 'Character Registry — services/characters.py', 
            fontsize=16, color=GOLD, ha='center', weight='bold')
    ax.text(7, 7.1, 'Single source of truth for every AI persona — used by both single-chat and roundtable', 
            fontsize=10, color=TEXT_DIM, ha='center')

    characters = [
        (1, 5.5, '🟢 MASTER YODA', '#4299e1', {
            'title': 'Grand Strategist',
            'voice': 'OSV syntax · "Hmmm", "yes", "young one" · weighs long horizon',
            'boardroom': 'Vision & ethics · 5-year view · warns against fear-driven choices',
            'pitch': 'Gut-feel partner · judges founder temperament/honesty',
            'temp': '0.85',
            'offline_thought': '"Cloudy, the API key is. Improvise from ancient wisdom, I must."',
            'offline_boardroom': ['"Decide in fear, we must not. Five years ahead, look..."',
                                  '"Short-term wins, the path to long-term ruin they can be."'],
            'offline_pitch': ['"Hear the founder\'s heart, I do — but ready, the numbers are not."',
                              '"Judge the pitch by its deck, I do not. Judge the builder, I do."'],
        }),
        (5.5, 5.5, '😡 RAGEBAITER', '#ed8936', {
            'title': 'Internet Troll',
            'voice': 'Smug, sarcastic, YouTube/Discord slang · "mid", "L", "who let you cook"',
            'boardroom': 'Contrarian · punctures groupthink · devil\'s advocate',
            'pitch': 'Skeptic · tears apart hype · demands receipts',
            'temp': '1.0+ (varies by ragebaitLevel)',
            'offline_thought': '"lmao no key? bet. watch me cook with zero context 🤷‍♂️"',
            'offline_boardroom': ['"L take ngl. this proposal mid af no cap 💀"',
                                  '"ratioed by my own shadow. skill issue fr 📉"'],
            'offline_pitch': ['"who let this founder cook 💀 deck got more holes than swiss cheese"',
                              '"pass. come back when you got actual traction not vibes 🤷‍♂️"'],
        }),
        (10, 5.5, '👑 PALPACCIO', '#9f7aea', {
            'title': 'Dark Strategist',
            'voice': 'Calculated, manipulative, Sith rhetoric · "power", "control", "order"',
            'boardroom': 'Ruthless pragmatist · ends justify means · fears weakness',
            'pitch': 'Cutthroat investor · wants unfair advantage · moats > mission',
            'temp': '0.9',
            'offline_thought': '"The API key is irrelevant. Power requires no permission."',
            'offline_boardroom': ['"Fear drives the market. We monetize the fear."',
                                  '"Ethics are for those who cannot afford ruthlessness."'],
            'offline_pitch': ['"Invest. The founder\'s desperation is... useful."',
                              '"Counteroffer. We take 51% and the IP. Non-negotiable."'],
        }),
    ]

    for cx, cy, name, color, data in characters:
        # Character card
        card = FancyBboxPatch((cx - 1.5, cy - 2.5), 3, 5.5, boxstyle="round,pad=0.1",
                               facecolor=PANEL_BG, edgecolor=color, linewidth=2)
        ax.add_patch(card)
        ax.text(cx, cy + 2.8, name, fontsize=12, color=color, ha='center', weight='bold')
        ax.text(cx, cy + 2.3, data['title'], fontsize=9, color=TEXT_DIM, ha='center', style='italic')
        
        y = cy + 1.7
        for key, val in data.items():
            if key in ('offline_boardroom', 'offline_pitch'):
                continue
            ax.text(cx - 1.3, y, f'{key}:', fontsize=8, color=GOLD, ha='left', weight='bold')
            if isinstance(val, list):
                for v in val:
                    y -= 0.22
                    ax.text(cx - 1.3, y, f'  {v}', fontsize=7, color=TEXT_DIM, ha='left')
            else:
                ax.text(cx - 1.3, y, f'  {val}', fontsize=7.5, color=TEXT, ha='left')
            y -= 0.28

        # Offline lines
        y = cy - 1.5
        for mode, lines in [('boardroom', data['offline_boardroom']), ('pitch', data['offline_pitch'])]:
            ax.text(cx - 1.3, y, f'offline[{mode}]:', fontsize=7, color=ORANGE, ha='left', weight='bold')
            for v in lines:
                y -= 0.2
                ax.text(cx - 1.3, y, f'  "{v[:45]}..."', fontsize=6.5, color=TEXT_DIM, ha='left')
            y -= 0.1

    # Ragebait bands
    band_box = FancyBboxPatch((0.5, 0.2), 13, 1.8, boxstyle="round,pad=0.1",
                               facecolor='#2a1a2a', edgecolor=RED, linewidth=2)
    ax.add_patch(band_box)
    ax.text(7, 1.8, '🌡️ RAGEBAIT INTENSITY BANDS (rage_prompt_for function)', fontsize=11, color=RED, ha='center', weight='bold')
    bands = [
        '0.0–0.2: "extremely mild, polite, hesitant troll · apologizes frequently"',
        '0.2–0.5: "mild, passive-aggressive · subtle sarcasm · YouTube/Discord slang"',
        '0.5–0.8: "standard smug troll · \'mid\', \'L\', \'who let you cook\'"',
        '0.8–1.0: "MAXIMAL toxic troll · emojis 😭🤡😂🤣 · capslock · NPC, lilbro, get a job, broke, mid, ratioed!"',
    ]
    for i, b in enumerate(bands):
        ax.text(1, 1.4 - i * 0.28, b, fontsize=8.5, color=TEXT, family='monospace')

    save_fig("06_character_system")

# ============================================================
# 7. PYTHON SYNTAX QUICK REFERENCE (from your code)
# ============================================================
def draw_syntax_guide():
    fig, ax = plt.subplots(figsize=(14, 10))
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(DARK_BG)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 10)
    ax.axis('off')

    ax.text(7, 9.6, 'Python / FastAPI / Pydantic Syntax Guide — From Your Codebase', 
            fontsize=16, color=GOLD, ha='center', weight='bold')

    sections = [
        (0.5, 8.2, 6.5, 1.3, '🔧 Type Hints & Union', BLUE, [
            'str | None        # Union[str, None] — Python 3.10+',
            'List[ChatMessage] # Generic — needs: from typing import List',
            'Optional[str]     # = str | None  (legacy typing)',
            'tuple[str, str, str]  # fixed-length tuple',
            'Dict[str, CharacterSpec]  # dict with string keys',
        ]),
        (7, 8.2, 6.5, 1.3, '🏷️ Literal & Field', PURPLE, [
            'Literal["boardroom", "pitch"]  # restricts to exact values',
            'Field(description="...")       # pydantic.Field — metadata + AI prompt!',
            'Field(default=None, ge=-10, le=10)  # validation constraints',
            'Annotated[str, Field(...)]     # Python 3.9+ combined',
        ]),
        (0.5, 6.5, 6.5, 1.5, '⚡ Async / Await', GREEN, [
            'async def generate_response(req: GenerationRequest):',
            '    reply = await call_gemini(...)  # pauses until done',
            '',
            'async def roundtable_generate(req: RoundtableRequest):',
            '    async def ndjson_stream():',
            '        async for event in generator:  # async iterator',
            '            yield json.dumps(event) + "\\n"',
            '    return StreamingResponse(ndjson_stream(), ...)',
        ]),
        (7, 6.5, 6.5, 1.5, '🎯 Decorators & Dependency Injection', ORANGE, [
            '@router.post("/yoda/generate")  # registers route',
            'async def generate_response(req: GenerationRequest):',
            '    # FastAPI auto-validates req against schema',
            '',
            'app.add_middleware(CORSMiddleware, ...)',
            'app.include_router(api_router, prefix="/api")',
            '# noqa: E402  → silences "import not at top" lint',
        ]),
        (0.5, 4.6, 6.5, 1.8, '📦 Pydantic Models (Your Patterns)', CYAN, [
            'class GenerationRequest(BaseModel):',
            '    text: str',
            '    mode: str = "roast"',
            '    customApiKey: str | None = None',
            '    history: List[ChatMessage] = []',
            '',
            'class Config:',
            '    extra = "ignore"  # drop unknown fields',
            '',
            '# Nested validation — history items validated too!',
        ]),
        (7, 4.6, 6.5, 1.8, '🧱 Dataclasses (CharacterSpec)', RED, [
            '@dataclass(frozen=True)  # immutable!',
            'class CharacterSpec:',
            '    id: str',
            '    name: str',
            '    voice: str',
            '    temperature: float',
            '    offline_lines: Dict[str, List[str]]',
            '         = field(default_factory=dict)  # mutable default!',
            '    single_chat: Optional[Dict] = None',
        ]),
        (0.5, 2.5, 13, 2.0, '🛡️ Error Handling Patterns (from endpoints.py)', RED, [
            'try:',
            '    reply = await call_gemini(...)',
            'except Exception as e:',
            '    err_msg = str(e).lower()',
            '    if "quota" in err_msg or "rate limit" in err_msg:',
            '        fallback = generate_offline_response(...)  # graceful!',
            '        return {"reply": fallback, "isFallback": True, "fallbackReason": "QUOTA_EXCEEDED"}',
            '    raise HTTPException(status_code=500, detail=f"Error: {e[:300]}")',
            '',
            '# Size limits — enforced server-side:',
            'if len(text) > MAX_TEXT_CHARS: raise HTTPException(413, "Message too long")',
            '# SSRF guard — blocks private IPs:',
            'if ip.is_private or ip.is_loopback: raise HTTPException(400, "Blocked")',
        ]),
    ]

    for x, y, w, h, title, color, lines in sections:
        box = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1",
                             facecolor=PANEL_BG, edgecolor=color, linewidth=1.5)
        ax.add_patch(box)
        ax.text(x + 0.1, y + h - 0.2, title, fontsize=11, color=color, weight='bold')
        for i, line in enumerate(lines):
            c = TEXT if line and not line.startswith('#') else (TEXT_DIM if line else TEXT)
            ax.text(x + 0.1, y + h - 0.45 - i * 0.25, line, fontsize=8.5, color=c, family='monospace')

    save_fig("07_python_syntax_guide")

# ============================================================
# RUN ALL
# ============================================================
if __name__ == "__main__":
    print(f"Generating diagrams in: {OUTPUT_DIR}")
    print()
    
    draw_fastapi_flow()
    draw_pydantic_anatomy()
    draw_roundtable_flow()
    draw_memory_graph()
    draw_provider_tree()
    draw_character_system()
    draw_syntax_guide()
    
    print()
    print("✅ All 7 diagrams generated!")
    print(f"📁 Location: {OUTPUT_DIR}")
#!/usr/bin/env python3
"""Compare two knowledge graph JSON files side by side.

Usage:
    python compare_graphs.py graph_a.json graph_b.json
    python compare_graphs.py graph_a.json graph_b.json --save comparison.png
    python compare_graphs.py graph_a.json graph_b.json --label-a "Original" --label-b "New"
"""

import json
import sys
import argparse
from pathlib import Path
from collections import Counter

try:
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    import matplotlib.gridspec as gridspec
    import networkx as nx
except ImportError:
    print("Required packages not found. Install with:")
    print("  pip install matplotlib networkx")
    sys.exit(1)


# ── Color schemes ────────────────────────────────────────────────────────────

TYPE_COLORS = {
    "architecture":  "#E74C3C",
    "technique":     "#3498DB",
    "component":     "#2ECC71",
    "optimization":  "#F39C12",
    "training":      "#9B59B6",
    "tokenization":  "#1ABC9C",
    "theory":        "#E67E22",
    "application":   "#34495E",
}
DEFAULT_NODE_COLOR = "#95A5A6"

RELATIONSHIP_COLORS = {
    "builds_on":      "#3498DB",
    "optimizes":      "#E74C3C",
    "requires":       "#F39C12",
    "evolves_to":     "#9B59B6",
    "variant_of":     "#1ABC9C",
    "component_of":   "#2ECC71",
    "alternative_to": "#E67E22",
    "enables":        "#95A5A6",
}
DEFAULT_EDGE_COLOR = "#BDC3C7"

LEVEL_SIZES = {
    "foundational":  2000,
    "intermediate":  1400,
    "advanced":      900,
    "frontier":      600,
}
DEFAULT_NODE_SIZE = 1000

# Shared vs. unique node border colors
BORDER_SHARED   = "#2C3E50"   # dark → shared with other graph
BORDER_UNIQUE   = "#FF4757"   # red  → only in this graph


# ── Helpers ──────────────────────────────────────────────────────────────────

def load(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build_nx(data: dict) -> nx.DiGraph:
    G = nx.DiGraph()
    for node in data.get("nodes", []):
        G.add_node(node["id"], **node)
    for edge in data.get("edges", []):
        G.add_edge(edge["source"], edge["target"], **edge)
    return G


def draw_graph(
    ax: plt.Axes,
    G: nx.DiGraph,
    shared_ids: set,
    title: str,
    pos: dict | None = None,
) -> dict:
    """Draw a single graph onto ax. Returns the layout positions."""
    n = G.number_of_nodes()
    if pos is None:
        pos = nx.spring_layout(G, k=2.5 / (n ** 0.5 + 1), seed=42)

    # Draw nodes
    for node_id, attrs in G.nodes(data=True):
        node_color = TYPE_COLORS.get(attrs.get("type", ""), DEFAULT_NODE_COLOR)
        size = LEVEL_SIZES.get(attrs.get("level", ""), DEFAULT_NODE_SIZE)
        is_shared = node_id in shared_ids
        border_color = BORDER_SHARED if is_shared else BORDER_UNIQUE
        lw = 3 if is_shared else 2

        nx.draw_networkx_nodes(
            G, pos,
            nodelist=[node_id],
            node_color=node_color,
            node_size=size,
            ax=ax,
            alpha=0.85,
            edgecolors=border_color,
            linewidths=lw,
        )

    # Draw edges
    edge_groups: dict[str, list] = {}
    for u, v, attrs in G.edges(data=True):
        r = attrs.get("relationship", "")
        edge_groups.setdefault(r, []).append((u, v))

    for rel, edge_list in edge_groups.items():
        nx.draw_networkx_edges(
            G, pos,
            edgelist=edge_list,
            edge_color=RELATIONSHIP_COLORS.get(rel, DEFAULT_EDGE_COLOR),
            ax=ax,
            arrows=True,
            arrowsize=16,
            arrowstyle="-|>",
            width=1.6,
            alpha=0.60,
            connectionstyle="arc3,rad=0.1",
        )

    # Labels
    labels = {n: G.nodes[n].get("name", n) for n in G.nodes()}
    nx.draw_networkx_labels(G, pos, labels=labels, font_size=7, ax=ax, font_weight="bold")

    n_shared = sum(1 for nid in G.nodes() if nid in shared_ids)
    n_unique = G.number_of_nodes() - n_shared
    ax.set_title(
        f"{title}\n{G.number_of_nodes()} nodes  ·  {G.number_of_edges()} edges"
        f"  │  shared {n_shared}  ·  unique {n_unique}",
        fontsize=11, pad=8,
    )
    ax.axis("off")
    return pos


def draw_bar_comparison(ax: plt.Axes, counter_a: Counter, counter_b: Counter,
                        label_a: str, label_b: str, title: str) -> None:
    """Draw a grouped bar chart comparing two counters."""
    all_keys = sorted(set(counter_a) | set(counter_b))
    x = range(len(all_keys))
    w = 0.35

    vals_a = [counter_a.get(k, 0) for k in all_keys]
    vals_b = [counter_b.get(k, 0) for k in all_keys]

    bars_a = ax.bar([i - w / 2 for i in x], vals_a, w, label=label_a, color="#E74C3C", alpha=0.8)
    bars_b = ax.bar([i + w / 2 for i in x], vals_b, w, label=label_b, color="#3498DB", alpha=0.8)

    for bar in list(bars_a) + list(bars_b):
        h = bar.get_height()
        if h > 0:
            ax.text(bar.get_x() + bar.get_width() / 2, h + 0.05, str(int(h)),
                    ha="center", va="bottom", fontsize=8)

    ax.set_xticks(list(x))
    ax.set_xticklabels(all_keys, rotation=30, ha="right", fontsize=8)
    ax.set_ylabel("Count", fontsize=9)
    ax.set_title(title, fontsize=10)
    ax.legend(fontsize=8)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.yaxis.set_major_locator(plt.MaxNLocator(integer=True))


def draw_diff_summary(ax: plt.Axes, data_a, data_b, label_a, label_b,
                      shared_ids, only_a_ids, only_b_ids,
                      shared_edges, only_a_edges, only_b_edges) -> None:
    """Render a text-based diff summary."""
    ax.axis("off")
    lines = [
        f"{'':>4}{'NODES':^30}{'EDGES':^30}",
        f"{'':>4}{'-'*58}",
        f"  Total      {len(data_a['nodes']):>5} (A) vs {len(data_b['nodes']):<5} (B)     "
        f"  {len(data_a['edges']):>5} (A) vs {len(data_b['edges']):<5} (B)",
        f"  Shared     {len(shared_ids):>25}      {len(shared_edges):>25}",
        f"  Only in A  {len(only_a_ids):>25}      {len(only_a_edges):>25}",
        f"  Only in B  {len(only_b_ids):>25}      {len(only_b_edges):>25}",
        "",
        f"  Nodes only in {label_a}:",
    ]
    for nid in sorted(only_a_ids):
        lines.append(f"    [-]  {nid}")
    lines.append(f"  Nodes only in {label_b}:")
    for nid in sorted(only_b_ids):
        lines.append(f"    [+]  {nid}")

    text = "\n".join(lines)
    ax.text(0.02, 0.98, text, transform=ax.transAxes,
            va="top", ha="left", fontsize=8,
            fontfamily="monospace",
            bbox=dict(boxstyle="round,pad=0.5", facecolor="#F8F9FA", edgecolor="#DEE2E6"))
    ax.set_title("Diff Summary", fontsize=10)


# ── Main ─────────────────────────────────────────────────────────────────────

def compare(path_a: Path, path_b: Path,
            label_a: str, label_b: str,
            save_path: Path | None = None) -> None:

    data_a = load(path_a)
    data_b = load(path_b)

    G_a = build_nx(data_a)
    G_b = build_nx(data_b)

    ids_a = set(G_a.nodes())
    ids_b = set(G_b.nodes())
    shared_ids  = ids_a & ids_b
    only_a_ids  = ids_a - ids_b
    only_b_ids  = ids_b - ids_a

    edges_a = {(u, v) for u, v in G_a.edges()}
    edges_b = {(u, v) for u, v in G_b.edges()}
    shared_edges = edges_a & edges_b
    only_a_edges = edges_a - edges_b
    only_b_edges = edges_b - edges_a

    print(f"\n{'='*56}")
    print(f"  {label_a}: {len(ids_a)} nodes, {len(edges_a)} edges")
    print(f"  {label_b}: {len(ids_b)} nodes, {len(edges_b)} edges")
    print(f"  Shared nodes  : {len(shared_ids)}")
    print(f"  Only in {label_a:<8}: {sorted(only_a_ids)}")
    print(f"  Only in {label_b:<8}: {sorted(only_b_ids)}")
    print(f"{'='*56}\n")

    # ── Figure layout ────────────────────────────────────────────────────────
    fig = plt.figure(figsize=(22, 16))
    fig.suptitle(f"Knowledge Graph Comparison\n{label_a}  vs  {label_b}",
                 fontsize=14, fontweight="bold", y=0.98)

    gs = gridspec.GridSpec(
        2, 3,
        figure=fig,
        height_ratios=[2.2, 1],
        hspace=0.40,
        wspace=0.30,
    )

    ax_a    = fig.add_subplot(gs[0, 0])   # original graph
    ax_b    = fig.add_subplot(gs[0, 1])   # new graph
    ax_diff = fig.add_subplot(gs[0, 2])   # diff text

    ax_types = fig.add_subplot(gs[1, 0:2])  # node type bar chart (wide)
    ax_rels  = fig.add_subplot(gs[1, 2])    # relationship bar chart

    # ── Draw graphs ──────────────────────────────────────────────────────────
    draw_graph(ax_a, G_a, shared_ids, label_a)
    draw_graph(ax_b, G_b, shared_ids, label_b)

    # ── Diff summary ─────────────────────────────────────────────────────────
    draw_diff_summary(
        ax_diff, data_a, data_b, label_a, label_b,
        shared_ids, only_a_ids, only_b_ids,
        shared_edges, only_a_edges, only_b_edges,
    )

    # ── Bar charts ───────────────────────────────────────────────────────────
    type_a = Counter(n.get("type", "?") for n in data_a["nodes"])
    type_b = Counter(n.get("type", "?") for n in data_b["nodes"])
    draw_bar_comparison(ax_types, type_a, type_b, label_a, label_b, "Node Type Distribution")

    rel_a = Counter(e.get("relationship", "?") for e in data_a["edges"])
    rel_b = Counter(e.get("relationship", "?") for e in data_b["edges"])
    draw_bar_comparison(ax_rels, rel_a, rel_b, label_a, label_b, "Relationship Distribution")

    # ── Shared / unique node legend ───────────────────────────────────────────
    legend_handles = [
        mpatches.Patch(facecolor="white", edgecolor=BORDER_SHARED, linewidth=3,
                       label=f"Shared node ({len(shared_ids)})"),
        mpatches.Patch(facecolor="white", edgecolor=BORDER_UNIQUE, linewidth=2,
                       label="Unique to this graph"),
    ]
    for t, c in TYPE_COLORS.items():
        legend_handles.append(mpatches.Patch(color=c, label=t))

    fig.legend(
        handles=legend_handles,
        title="Node border / type color",
        loc="lower center",
        ncol=6,
        fontsize=8,
        title_fontsize=9,
        framealpha=0.9,
        bbox_to_anchor=(0.5, 0.0),
    )

    plt.subplots_adjust(bottom=0.08)

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"Saved → {save_path}")
    else:
        plt.show()


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare two knowledge graph JSON files")
    parser.add_argument("graph_a", help="First graph (e.g. original)")
    parser.add_argument("graph_b", help="Second graph (e.g. new)")
    parser.add_argument("--label-a", default=None,
                        help="Label for graph A (default: filename)")
    parser.add_argument("--label-b", default=None,
                        help="Label for graph B (default: filename)")
    parser.add_argument("--save", "-s", metavar="OUTPUT", default=None,
                        help="Save image to file instead of showing")
    args = parser.parse_args()

    path_a = Path(args.graph_a)
    path_b = Path(args.graph_b)

    for p in (path_a, path_b):
        if not p.exists():
            print(f"Error: file not found: {p}")
            sys.exit(1)

    label_a = args.label_a or path_a.stem
    label_b = args.label_b or path_b.stem
    save_path = Path(args.save) if args.save else None

    compare(path_a, path_b, label_a, label_b, save_path)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Visualize a knowledge graph from graph.json using matplotlib + networkx.

Usage:
    python visualize_graph.py                          # looks for graph.json in current dir
    python visualize_graph.py path/to/graph.json       # specific file
    python visualize_graph.py path/to/graph.json --save output.png  # save instead of show
"""

import json
import sys
import argparse
from pathlib import Path

try:
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    import networkx as nx
except ImportError:
    print("Required packages not found. Install with:")
    print("  pip install matplotlib networkx")
    sys.exit(1)


# Node type → color
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

# Edge relationship → color
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

# Node level → size
LEVEL_SIZES = {
    "foundational":  2000,
    "intermediate":  1400,
    "advanced":      900,
    "frontier":      600,
}
DEFAULT_NODE_SIZE = 1000


def load_graph(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def build_nx_graph(data: dict) -> nx.DiGraph:
    G = nx.DiGraph()
    for node in data.get("nodes", []):
        G.add_node(node["id"], **node)
    for edge in data.get("edges", []):
        G.add_edge(edge["source"], edge["target"], **edge)
    return G


def visualize(graph_path: Path, save_path: Path | None = None, layout: str = "spring") -> None:
    data = load_graph(graph_path)
    G = build_nx_graph(data)

    n_nodes = G.number_of_nodes()
    n_edges = G.number_of_edges()
    print(f"Loaded: {n_nodes} nodes, {n_edges} edges")

    # Choose layout
    if layout == "spring":
        pos = nx.spring_layout(G, k=2.5 / (n_nodes ** 0.5 + 1), seed=42)
    elif layout == "kamada":
        pos = nx.kamada_kawai_layout(G)
    elif layout == "circular":
        pos = nx.circular_layout(G)
    elif layout == "spectral":
        pos = nx.spectral_layout(G)
    else:
        pos = nx.spring_layout(G, seed=42)

    fig, ax = plt.subplots(figsize=(18, 13))

    # Draw nodes grouped by type for consistent coloring
    node_groups: dict[str, list] = {}
    for node_id, attrs in G.nodes(data=True):
        t = attrs.get("type", "")
        node_groups.setdefault(t, []).append(node_id)

    for node_type, node_ids in node_groups.items():
        sizes = [LEVEL_SIZES.get(G.nodes[n].get("level", ""), DEFAULT_NODE_SIZE) for n in node_ids]
        nx.draw_networkx_nodes(
            G, pos,
            nodelist=node_ids,
            node_color=TYPE_COLORS.get(node_type, DEFAULT_NODE_COLOR),
            node_size=sizes,
            ax=ax,
            alpha=0.88,
        )

    # Draw edges grouped by relationship type
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
            arrowsize=18,
            arrowstyle="-|>",
            width=1.8,
            alpha=0.65,
            connectionstyle="arc3,rad=0.1",
        )

    # Node labels (use human-readable name if available)
    labels = {n: G.nodes[n].get("name", n) for n in G.nodes()}
    nx.draw_networkx_labels(G, pos, labels=labels, font_size=7.5, ax=ax, font_weight="bold")

    # --- Legends ---
    # Node types
    used_types = set(G.nodes[n].get("type", "") for n in G.nodes())
    type_patches = [
        mpatches.Patch(color=TYPE_COLORS.get(t, DEFAULT_NODE_COLOR), label=t)
        for t in sorted(used_types) if t
    ]
    legend1 = ax.legend(
        handles=type_patches, title="Node Type",
        loc="lower left", fontsize=8, title_fontsize=9,
        framealpha=0.9,
    )
    ax.add_artist(legend1)

    # Edge relationships
    used_rels = set(attrs.get("relationship", "") for _, _, attrs in G.edges(data=True))
    rel_patches = [
        mpatches.Patch(color=RELATIONSHIP_COLORS.get(r, DEFAULT_EDGE_COLOR), label=r)
        for r in sorted(used_rels) if r
    ]
    ax.legend(
        handles=rel_patches, title="Relationship",
        loc="lower right", fontsize=8, title_fontsize=9,
        framealpha=0.9,
    )

    # Node size legend
    size_handles = [
        mpatches.Patch(color="#888888", label=f"{level} (size {sz})")
        for level, sz in LEVEL_SIZES.items()
    ]
    legend3 = ax.legend(
        handles=size_handles, title="Level (node size)",
        loc="upper left", fontsize=8, title_fontsize=9,
        framealpha=0.9,
    )
    ax.add_artist(legend3)

    ax.set_title(
        f"Knowledge Graph  ·  {n_nodes} nodes  ·  {n_edges} edges\n{graph_path}",
        fontsize=13, pad=12,
    )
    ax.axis("off")
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"Saved to {save_path}")
    else:
        plt.show()


def main() -> None:
    parser = argparse.ArgumentParser(description="Visualize a knowledge graph from graph.json")
    parser.add_argument(
        "graph",
        nargs="?",
        default="graph.json",
        help="Path to graph.json (default: ./graph.json)",
    )
    parser.add_argument(
        "--save", "-s",
        metavar="OUTPUT",
        default=None,
        help="Save image to file instead of showing (e.g. --save graph.png)",
    )
    parser.add_argument(
        "--layout", "-l",
        choices=["spring", "kamada", "circular", "spectral"],
        default="spring",
        help="Graph layout algorithm (default: spring)",
    )
    args = parser.parse_args()

    graph_path = Path(args.graph)
    if not graph_path.exists():
        print(f"Error: file not found: {graph_path}")
        sys.exit(1)

    save_path = Path(args.save) if args.save else None
    visualize(graph_path, save_path=save_path, layout=args.layout)


if __name__ == "__main__":
    main()

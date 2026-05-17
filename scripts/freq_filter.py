#!/usr/bin/env python3
"""
scripts/freq_filter.py — Wordfreq-based obscurity filter for dictionary.json

Reads public/dictionary.json (built by process-dict.ts), applies a word-frequency
threshold using the `wordfreq` library, merges data/allowlist.txt, and overwrites
public/dictionary.json with the filtered result.

Usage:
    python3 scripts/freq_filter.py                   # default threshold 3e-8
    python3 scripts/freq_filter.py --threshold=1e-7  # stricter
    python3 scripts/freq_filter.py --dry-run         # stats only, no write
"""

import json
import sys
import argparse
from pathlib import Path

try:
    from wordfreq import word_frequency
except ImportError:
    print("Error: wordfreq not installed. Run: pip3 install wordfreq", file=sys.stderr)
    sys.exit(1)

SAMPLE_REJECTS = 30  # rejected words printed for review


def main() -> None:
    parser = argparse.ArgumentParser(description="Frequency-filter dictionary.json")
    parser.add_argument("--threshold", type=float, default=3e-8,
                        help="Minimum word_frequency score (default: 3e-8)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print stats without writing output")
    args = parser.parse_args()

    root = Path(__file__).parent.parent
    dict_path = root / "public" / "dictionary.json"
    allowlist_path = root / "data" / "allowlist.txt"

    # ── Load inputs ────────────────────────────────────────────────────────────

    with open(dict_path) as f:
        words: list[str] = json.load(f)
    print(f"Input:      {len(words):>6} words  ({dict_path.name})")

    allowlist: set[str] = set()
    if allowlist_path.exists():
        for line in allowlist_path.read_text().splitlines():
            w = line.strip().lower()
            if w and not w.startswith("#") and w.isalpha():
                allowlist.add(w)
        print(f"Allowlist:  {len(allowlist):>6} words  ({allowlist_path.name})")

    # ── Score and partition ────────────────────────────────────────────────────

    approved: list[str] = []
    rejected: list[tuple[str, float]] = []

    for word in words:
        freq = word_frequency(word, "en")
        if freq >= args.threshold or word in allowlist:
            approved.append(word)
        else:
            rejected.append((word, freq))

    # Add allowlist words not already in dictionary (new additions)
    approved_set = set(approved)
    new_from_allowlist = [w for w in allowlist if w not in approved_set]
    approved.extend(new_from_allowlist)

    approved_sorted = sorted(set(approved))

    # ── Report ─────────────────────────────────────────────────────────────────

    print(f"Threshold:  {args.threshold:.2e}")
    print(f"Approved:   {len(approved_sorted):>6} words")
    print(f"Rejected:   {len(rejected):>6} words")
    if new_from_allowlist:
        print(f"Added (allowlist only): {', '.join(sorted(new_from_allowlist))}")

    # Show highest-frequency rejects — these are words near the threshold worth reviewing
    near_threshold = [(w, f) for w, f in rejected if f > 0]
    near_threshold.sort(key=lambda x: -x[1])
    if near_threshold:
        print(f"\nHighest-frequency rejects (review for allowlist candidates):")
        for word, freq in near_threshold[:SAMPLE_REJECTS]:
            print(f"  {word:<15} {freq:.2e}")

    zero_freq = [w for w, f in rejected if f == 0]
    print(f"\nZero-frequency words removed: {len(zero_freq)}")
    if zero_freq[:10]:
        print(f"  Sample: {', '.join(zero_freq[:10])}")

    # ── Write ──────────────────────────────────────────────────────────────────

    if not args.dry_run:
        with open(dict_path, "w") as f:
            json.dump(approved_sorted, f)
        print(f"\nWrote {len(approved_sorted)} words → {dict_path}")
    else:
        print("\n(dry-run: no files written)")


if __name__ == "__main__":
    main()

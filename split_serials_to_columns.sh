#!/usr/bin/env bash
set -euo pipefail

input="${1:-docs/data/listing.csv}"
output="${2:-docs/data/listing_with_codes.csv}"

if [[ ! -f "$input" ]]; then
  echo "Fichier introuvable : $input" >&2
  exit 1
fi

python3 - "$input" "$output" <<'PY'
import csv
import sys
from pathlib import Path

input_path = Path(sys.argv[1])
output_path = Path(sys.argv[2])
output_path.parent.mkdir(parents=True, exist_ok=True)

with input_path.open("r", newline="", encoding="utf-8-sig") as fh:
    rows = list(csv.reader(fh))

if not rows:
    raise SystemExit("Le fichier est vide")

header = rows[0]
new_header = list(header)
new_rows = []

serial_idx = None
if "Numéro de série" in header:
    serial_idx = header.index("Numéro de série")
    parts_by_row = []
    for row in rows[1:]:
        value = row[serial_idx].strip() if serial_idx < len(row) else ""
        codes = [part.strip() for part in value.split("/") if part.strip()]
        if not codes:
            codes = [""]
        parts_by_row.append(codes)

    max_count = max(len(parts) for parts in parts_by_row)
    max_count = max(2, min(max_count, 4))
    new_header = header[:serial_idx] + [f"Code {i:02d}" for i in range(1, max_count + 1)] + header[serial_idx + 1 :]

    for row, parts in zip(rows[1:], parts_by_row):
        new_row = row[:serial_idx]
        for i in range(max_count):
            new_row.append(parts[i] if i < len(parts) else "")
        new_row.extend(row[serial_idx + 1 :])
        new_rows.append(new_row)
else:
    new_rows = [list(row) for row in rows[1:]]

if "Date" in new_header:
    date_idx = new_header.index("Date")
    parts_by_row = []
    for row in new_rows:
        value = row[date_idx].strip() if date_idx < len(row) else ""
        dates = [part.strip() for part in value.split("/") if part.strip()]
        if not dates:
            dates = [""]
        parts_by_row.append(dates)

    max_count = max(len(parts) for parts in parts_by_row)
    max_count = max(2, min(max_count, 4))
    new_header = new_header[:date_idx] + [f"Date {i:02d}" for i in range(1, max_count + 1)] + new_header[date_idx + 1 :]

    updated_rows = []
    for row, parts in zip(new_rows, parts_by_row):
        new_row = row[:date_idx]
        for i in range(max_count):
            new_row.append(parts[i] if i < len(parts) else "")
        new_row.extend(row[date_idx + 1 :])
        updated_rows.append(new_row)
    new_rows = updated_rows

if "Code 02" in new_header:
    code2_idx = new_header.index("Code 02")
    for row in new_rows:
        if code2_idx < len(row):
            value = row[code2_idx].strip()
            if value.startswith("SNS") and not value.endswith("-USA"):
                row[code2_idx] = value + "-USA"

with output_path.open("w", newline="", encoding="utf-8") as fh:
    writer = csv.writer(fh, lineterminator="\n")
    writer.writerow(new_header)
    for row in new_rows:
        writer.writerow(row)

print(f"CSV écrit : {output_path}")
PY

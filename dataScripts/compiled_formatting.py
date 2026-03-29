#!/usr/bin/env python3
"""
Format compiled representative Open Food Facts data into the simplified JSON
shape used by the current visualization.
"""

import argparse
import json
import os


def normalize_code(value):
	if value is None:
		return None
	return str(value)


def normalize_text(value, default=None):
	if value is None:
		return default
	text = str(value).strip()
	return text if text else default


def normalize_grade(value):
	if value is None:
		return None
	text = str(value).strip().lower()
	return text if text else None


def normalize_categories_tags(record):
	tags = record.get("categories_tags")
	if tags is None:
		return None
	if isinstance(tags, list):
		return [str(tag) for tag in tags]
	if isinstance(tags, str):
		text = tags.strip()
		if not text:
			return None
		return [part.strip() for part in text.split(",") if part.strip()]
	return None


def format_record(record):
	return {
		"code": normalize_code(record.get("code")),
		"product_name": normalize_text(
			record.get("product_name")
			or record.get("product_name_en")
			or record.get("generic_name"),
			default="Unknown product"
		),
		"brands": normalize_text(record.get("brands"), default="unknown"),
		"nutriscore_grade": normalize_grade(record.get("nutriscore_grade")) or "unknown",
		"ecoscore_grade": normalize_grade(record.get("ecoscore_grade")),
		"categories_tags": normalize_categories_tags(record)
	}


def load_input_records(input_file):
	with open(input_file, "r", encoding="utf-8") as file_obj:
		raw_text = file_obj.read().strip()

	if not raw_text:
		return []

	# Support both JSON arrays and line-delimited JSON.
	if raw_text.startswith("["):
		parsed = json.loads(raw_text)
		if not isinstance(parsed, list):
			raise ValueError("Expected top-level JSON array in input file")
		return parsed

	records = []
	for line_number, line in enumerate(raw_text.splitlines(), start=1):
		line = line.strip()
		if not line:
			continue
		try:
			records.append(json.loads(line))
		except json.JSONDecodeError as exc:
			raise ValueError(f"Invalid JSON on line {line_number}: {exc}") from exc
	return records


def format_compiled_data(input_file, output_file):
	if not os.path.exists(input_file):
		print(f"Error: Input file '{input_file}' not found.")
		return False

	print(f"Reading compiled data from: {input_file}")
	try:
		input_records = load_input_records(input_file)
	except (OSError, ValueError, json.JSONDecodeError) as exc:
		print(f"Error reading input file: {exc}")
		return False

	formatted_records = [format_record(record) for record in input_records if isinstance(record, dict)]

	print(f"Input records read: {len(input_records):,}")
	print(f"Formatted records written: {len(formatted_records):,}")

	try:
		with open(output_file, "w", encoding="utf-8") as file_obj:
			json.dump(formatted_records, file_obj, ensure_ascii=False, indent=2)
		print(f"Successfully wrote formatted data to: {output_file}")
		print(f"Output file size: {os.path.getsize(output_file) / (1024 * 1024):.2f} MB")
		return True
	except OSError as exc:
		print(f"Error writing output file: {exc}")
		return False


def main():
	parser = argparse.ArgumentParser(
		description="Format compiled representative Open Food Facts data for the visualization.",
		formatter_class=argparse.RawDescriptionHelpFormatter,
		epilog="""
Examples:
  python compiled_formatting.py
  python compiled_formatting.py compiled_representatives.json
  python compiled_formatting.py compiled_representatives.json -o filtered_sample1.json
		"""
	)

	parser.add_argument(
		"input",
		nargs="?",
		default="compiled_representatives.json",
		help="Input compiled file (default: compiled_representatives.json in current directory)"
	)
	parser.add_argument(
		"-o", "--output",
		default="filtered_sample1.json",
		help="Output JSON file (default: filtered_sample1.json in same directory as input)"
	)

	args = parser.parse_args()

	input_path = os.path.abspath(args.input)
	if os.path.dirname(args.output):
		output_path = os.path.abspath(args.output)
	else:
		output_path = os.path.join(os.path.dirname(input_path), args.output)

	print("=" * 60)
	print("Open Food Facts Compiled Data Formatter")
	print("=" * 60)
	print()

	success = format_compiled_data(input_path, output_path)

	print()
	if success:
		print("Compilation formatting completed successfully.")
		print(f"Output file: {output_path}")
		return 0

	print("Compilation formatting failed.")
	return 1


if __name__ == "__main__":
	raise SystemExit(main())

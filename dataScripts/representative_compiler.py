#!/usr/bin/env python3
"""
Compile representative data points from the Open Food Facts JSONL file.
Reads a large JSONL dataset and selects 10,000 representative data points,
writing them to a new file for visualization purposes.
"""

import json
import random
import os
import argparse

def compile_representatives(input_file, output_file, sample_size=10000):
    """
    Read a JSONL file and compile representative data points.
    
    Args:
        input_file (str): Path to the input JSONL file
        output_file (str): Path to the output JSON file
        sample_size (int): Number of representative data points to compile (default: 10000)
    """
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        return False
    
    if sample_size <= 0:
        print("Error: sample_size must be greater than 0.")
        return False

    print(f"Reading data from: {input_file}")
    print(f"Target sample size: {sample_size}")
    print("Sampling strategy: reservoir sampling (constant memory)")

    reservoir = []
    valid_count = 0
    malformed_count = 0

    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError as e:
                    malformed_count += 1
                    if malformed_count <= 5:
                        print(f"Warning: Failed to parse JSON at line {line_num}: {e}")
                    continue

                valid_count += 1
                if len(reservoir) < sample_size:
                    reservoir.append(record)
                else:
                    # Replace elements with gradually decreasing probability.
                    j = random.randint(1, valid_count)
                    if j <= sample_size:
                        reservoir[j - 1] = record

                if valid_count % 1_000_000 == 0:
                    print(f"  Progress: {valid_count:,} valid records processed...")
    
    except IOError as e:
        print(f"Error reading input file: {e}")
        return False

    print(f"Total valid records read: {valid_count:,}")
    print(f"Malformed JSON lines skipped: {malformed_count:,}")

    if valid_count == 0:
        print("Error: No valid records found in the input file.")
        return False

    if valid_count <= sample_size:
        selected_records = reservoir
        print(f"Using all {valid_count:,} valid records (fewer than target {sample_size:,})")
    else:
        selected_records = reservoir
        print(f"Reservoir sampled {sample_size:,} representative data points")

    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(selected_records, f, ensure_ascii=False, indent=2)
        
        print(f"Successfully wrote {len(selected_records)} records to: {output_file}")
        print(f"Output file size: {os.path.getsize(output_file) / (1024*1024):.2f} MB")
        return True
    
    except IOError as e:
        print(f"Error writing output file: {e}")
        return False


def main():
    """Main entry point with command-line argument parsing."""
    parser = argparse.ArgumentParser(
        description="Compile representative data points from an Open Food Facts JSONL file.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python representative_compiler.py
  python representative_compiler.py openfoodfacts-products.jsonl
    python representative_compiler.py openfoodfacts-products.jsonl --output mydata.json --sample 5000
        python representative_compiler.py products.jsonl -o output.json -s 15000 --seed 42
        """
    )
    
    parser.add_argument(
        'input',
        nargs='?',
        default='openfoodfacts-products.jsonl',
        help='Input JSONL file (default: openfoodfacts-products.jsonl in current directory)'
    )
    parser.add_argument(
        '-o', '--output',
        default='compiled_representatives.json',
        help='Output file name (default: compiled_representatives.json in same directory as input)'
    )
    parser.add_argument(
        '-s', '--sample',
        type=int,
        default=10000,
        help='Number of representative data points to compile (default: 10000)'
    )
    parser.add_argument(
        '--seed',
        type=int,
        default=None,
        help='Optional random seed for reproducible sampling'
    )
    
    args = parser.parse_args()

    if args.seed is not None:
        random.seed(args.seed)
        print(f"Using random seed: {args.seed}")
    
    # Resolve paths relative to current working directory
    input_path = os.path.abspath(args.input)
    
    # If output is just a filename (no path), put it in the same directory as input
    if os.path.dirname(args.output):
        output_path = os.path.abspath(args.output)
    else:
        output_path = os.path.join(os.path.dirname(input_path), args.output)
    
    print("=" * 60)
    print("Open Food Facts Representative Data Compiler")
    print("=" * 60)
    print()
    
    success = compile_representatives(input_path, output_path, sample_size=args.sample)
    
    print()
    if success:
        print("✓ Compilation completed successfully!")
        print(f"Output file: {output_path}")
    else:
        print("✗ Compilation failed.")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())

#!/usr/bin/env python3
"""
Compile representative data points from the Open Food Facts JSONL file.
Reads a large JSONL dataset and selects 10,000 representative data points,
writing them to a new file for visualization purposes.
"""

import json
import random
import os
import sys
import argparse
from pathlib import Path

def compile_representatives(input_file, output_file, sample_size=10000):
    """
    Read a JSONL file and compile representative data points.
    
    Args:
        input_file (str): Path to the input JSONL file
        output_file (str): Path to the output text file
        sample_size (int): Number of representative data points to compile (default: 10000)
    """
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        return False
    
    print(f"Reading data from: {input_file}")
    print(f"Target sample size: {sample_size}")
    
    # First pass: count total records and collect all records
    records = []
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                    records.append(record)
                except json.JSONDecodeError as e:
                    print(f"Warning: Failed to parse JSON at line {line_num}: {e}")
                    continue
                
                # Print progress every 100,000 records
                if line_num % 100000 == 0:
                    print(f"  Progress: {line_num} records read...")
    
    except IOError as e:
        print(f"Error reading input file: {e}")
        return False
    
    total_records = len(records)
    print(f"Total records read: {total_records}")
    
    if total_records == 0:
        print("Error: No valid records found in the input file.")
        return False
    
    # Sample or use all records if fewer than sample_size
    if total_records <= sample_size:
        selected_records = records
        print(f"Using all {total_records} records (fewer than target {sample_size})")
    else:
        # Randomly sample records for representative distribution
        selected_records = random.sample(records, sample_size)
        print(f"Randomly sampled {sample_size} representative data points")
    
    # Write output file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            for record in selected_records:
                json_line = json.dumps(record, ensure_ascii=False)
                f.write(json_line + '\n')
        
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
  python representative_compiler.py openfoodfacts-products.jsonl --output mydata.txt --sample 5000
  python representative_compiler.py -i products.jsonl -o output.txt -s 15000
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
        default='compiled_representatives.txt',
        help='Output file name (default: compiled_representatives.txt in same directory as input)'
    )
    parser.add_argument(
        '-s', '--sample',
        type=int,
        default=10000,
        help='Number of representative data points to compile (default: 10000)'
    )
    
    args = parser.parse_args()
    
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

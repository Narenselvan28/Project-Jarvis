import os

target_file = 'sample.txt'
base_dir = os.path.abspath('.')

excluded_dirs = {
    'node_modules', '.git', '__pycache__', '.pytest_cache', 'dist', 'build', '.vscode', '.idea', 'brain', '.gemini'
}

included_extensions = {
    '.py', '.js', '.jsx', '.html', '.css', '.bat', '.json', '.txt', '.md', '.sql', '.yaml', '.yml'
}

excluded_files = {
    'package-lock.json', 'sample.txt', '.env', 'expressions.txt', 'manufacturing.db'
}

files_to_dump = []
for root, dirs, files in os.walk(base_dir):
    dirs[:] = [d for d in dirs if d not in excluded_dirs]
    for file in sorted(files):
        if file in excluded_files:
            continue
        ext = os.path.splitext(file)[1].lower()
        if ext in included_extensions or file in {'Dockerfile', '.env.example', '.gitignore'}:
            rel_path = os.path.relpath(os.path.join(root, file), base_dir)
            files_to_dump.append(rel_path)

files_to_dump.sort()

with open(target_file, 'w', encoding='utf-8', errors='replace') as out_f:
    out_f.write("# ================================================================================\n")
    out_f.write(f"# REFLOW & IGNITRRON COMPLETE CODEBASE CONSOLIDATION\n")
    out_f.write(f"# Total Files: {len(files_to_dump)}\n")
    out_f.write("# ================================================================================\n\n")
    
    count = 0
    for rel_path in files_to_dump:
        full_path = os.path.join(base_dir, rel_path)
        try:
            with open(full_path, 'r', encoding='utf-8', errors='replace') as in_f:
                content = in_f.read()
            out_f.write("=" * 80 + "\n")
            out_f.write(f"FILE: {rel_path}\n")
            out_f.write("=" * 80 + "\n")
            out_f.write(content)
            out_f.write("\n\n")
            count += 1
        except Exception as e:
            print(f"Error reading {rel_path}: {e}")

print(f"Successfully consolidated {count} files into {target_file}")
print(f"Total file size: {os.path.getsize(target_file):,} bytes")

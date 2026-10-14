"""Read declaration hashes and licensing without extracting or executing package files."""
import hashlib
import json
import re
import sys
import tarfile

with tarfile.open(sys.argv[1], 'r:gz') as archive:
    files = {entry.name: entry for entry in archive.getmembers() if entry.isfile()}
    license_path = next((name for name in files if re.fullmatch(r'package/licen[cs]e(?:\.md|\.txt)?', name, re.I)), None)
    def read(name):
        if files[name].size > 16 * 1024 * 1024:
            raise ValueError('Unexpectedly large source file')
        return archive.extractfile(files[name]).read()
    print(json.dumps({
        'license': read(license_path).decode() if license_path else None,
        'licensePath': license_path.removeprefix('package/') if license_path else None,
        'apiFiles': [{'path': name.removeprefix('package/'), 'sha256': hashlib.sha256(read(name)).hexdigest()} for name in sorted(files) if name.endswith('.d.ts') and '/node_modules/' not in name],
        'index': read('package/index.d.ts').decode() if 'package/index.d.ts' in files else '',
    }))

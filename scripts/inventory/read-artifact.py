"""Read verified package declarations as data, without extracting or executing them."""
import hashlib
import json
import pathlib
import sys
import tarfile

with tarfile.open(sys.argv[1], 'r:gz') as archive:
    files = {}
    for entry in archive.getmembers():
        if not entry.isfile():
            continue
        path = pathlib.PurePosixPath(entry.name)
        if path.is_absolute() or '..' in path.parts or path.parts[0] != 'package':
            raise ValueError('Unsafe package member')
        name = str(path.relative_to('package'))
        if name in files:
            raise ValueError('Duplicate package member: ' + name)
        files[name] = entry
    def read(name):
        entry = files[name]
        if entry.size > 16 * 1024 * 1024:
            raise ValueError('Unexpectedly large declaration')
        return archive.extractfile(entry).read().decode('utf-8')
    declarations = {
        name: read(name) for name in sorted(files)
        if name.endswith(('.d.ts', '.d.mts', '.d.cts')) and '/node_modules/' not in name
    }
    print(json.dumps({
        'manifest': json.loads(read('package.json')),
        'files': declarations,
        'licenses': {name: read(name) for name in files if name.lower() in ('license', 'license.md', 'license.txt')},
        'hashes': [
            {'path': name, 'sha256': hashlib.sha256(text.encode()).hexdigest()}
            for name, text in declarations.items() if name.endswith('.d.ts')
        ],
    }))

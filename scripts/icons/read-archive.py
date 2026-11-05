"""Read the integrity-checked icon archive as data; never extract or execute it."""
import hashlib
import json
import pathlib
import re
import sys
import tarfile

with tarfile.open(sys.argv[1], 'r:gz') as archive:
    entries = {}
    for member in archive.getmembers():
        path = pathlib.PurePosixPath(member.name)
        if path.is_absolute() or '..' in path.parts or path.parts[0] != 'package':
            raise ValueError('Unsafe icon archive member')
        if not member.isfile():
            if not member.isdir():
                raise ValueError('Unexpected non-file icon archive member')
            continue
        name = str(path.relative_to('package'))
        if name in entries or member.size > 16 * 1024 * 1024:
            raise ValueError('Duplicate or oversized icon archive member')
        entries[name] = member

    def read(name):
        return archive.extractfile(entries[name]).read().decode('utf-8')

    sources = {name: read(name) for name in sorted(entries)
               if re.fullmatch(r'[A-Za-z0-9_$]+\.(?:mjs|js|d\.ts|d\.mts)', name)
               or name in ('utils/createSvgIcon.mjs', 'utils/createSvgIcon.js',
                           'utils/createSvgIcon.d.ts', 'utils/createSvgIcon.d.mts')}
    print(json.dumps({
        'manifest': json.loads(read('package.json')),
        'license': read('LICENSE'),
        'readme': read('README.md'),
        'files': sources,
        'declarations': [{'path': name, 'sha256': hashlib.sha256(read(name).encode()).hexdigest()}
                         for name in sorted(entries) if name.endswith('.d.ts')],
    }))

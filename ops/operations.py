#!/usr/bin/env python3
"""Local SIPP backups, isolated restore checks and origin monitoring."""
import argparse
import datetime as dt
import fcntl
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import time
import urllib.request

REPO = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('SIPP_BACKUP_ROOT', REPO.parent / 'backups' / 'sipp-auto'))


def run(*args, **kwargs):
    return subprocess.run(args, check=True, timeout=kwargs.pop('timeout', 600), **kwargs)


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


def write_state(name, state):
    target = ROOT / f'latest-{name}.json'
    temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(state, indent=2) + '\n')
    temporary.replace(target)


def digest(path):
    checksum = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            checksum.update(block)
    return checksum.hexdigest()


def backup():
    folder = ROOT / dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    folder.mkdir(mode=0o700)
    database, uploads = folder / 'database.dump', folder / 'uploads.tar.gz'
    with database.with_suffix('.part').open('wb') as output:
        run('docker', 'exec', 'casn_postgres', 'sh', '-c', 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc', stdout=output)
    database.with_suffix('.part').replace(database)
    with uploads.with_suffix('.part').open('wb') as output:
        run('docker', 'exec', 'casn_backend', 'tar', 'czf', '-', '-C', '/app', 'uploads', stdout=output)
    uploads.with_suffix('.part').replace(uploads)
    images = run('docker', 'inspect', '--format', '{{.Name}} {{.Image}}', 'casn_backend', 'casn_frontend', capture_output=True, text=True).stdout
    (folder / 'images.txt').write_text(images)
    state = {'status': 'ok', 'completedAt': now(), 'directory': str(folder), 'databaseBytes': database.stat().st_size, 'uploadBytes': uploads.stat().st_size,
             'checksums': {path.name: digest(path) for path in (database, uploads)}}
    (folder / 'manifest.json').write_text(json.dumps(state, indent=2) + '\n')
    write_state('backup', state)
    return state


def restore_check():
    source = json.loads((ROOT / 'latest-backup.json').read_text())
    if source.get('status') != 'ok':
        raise RuntimeError('Backup terakhir belum berhasil')
    folder = Path(source['directory']).resolve()
    if not folder.is_relative_to(ROOT.resolve()):
        raise RuntimeError('Lokasi backup di luar direktori yang diizinkan')
    for name in ('database.dump', 'uploads.tar.gz'):
        if digest(folder / name) != source['checksums'][name]:
            raise RuntimeError(f'Checksum tidak cocok: {name}')
    # Membaca seluruh gzip memastikan arsip tidak terpotong/korup.
    with gzip.open(folder / 'uploads.tar.gz', 'rb') as stream:
        for _ in iter(lambda: stream.read(1024 * 1024), b''):
            pass
    with tarfile.open(folder / 'uploads.tar.gz', 'r:gz') as archive:
        files = sum(1 for member in archive if member.isfile())
    container = f'sipp-restore-check-{os.getpid()}'
    try:
        run('docker', 'run', '-d', '--rm', '--network', 'none', '--name', container,
            '--tmpfs', '/var/lib/postgresql/data:rw,size=536870912', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=sipp_restore', 'postgres:16-alpine', stdout=subprocess.DEVNULL)
        for attempt in range(60):
            ready = subprocess.run(['docker', 'exec', container, 'pg_isready', '-U', 'postgres', '-d', 'sipp_restore'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
            if ready.returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError('Database uji pemulihan belum siap')
        with (folder / 'database.dump').open('rb') as stream:
            run('docker', 'exec', '-i', container, 'pg_restore', '-U', 'postgres', '-d', 'sipp_restore', '--exit-on-error', '--no-owner', stdin=stream)
        sql = 'SELECT json_build_object(\'users\',(SELECT count(*) FROM "User"),\'locations\',(SELECT count(*) FROM "Location"),\'items\',(SELECT count(*) FROM "LocationItem"),\'migrations\',(SELECT count(*) FROM "_prisma_migrations"))'
        counts = json.loads(run('docker', 'exec', container, 'psql', '-U', 'postgres', '-d', 'sipp_restore', '-Atc', sql, capture_output=True, text=True).stdout)
        state = {'status': 'ok', 'completedAt': now(), 'backupDirectory': str(folder), 'counts': counts, 'uploadFiles': files}
        write_state('restore-check', state)
        return state
    finally:
        subprocess.run(['docker', 'rm', '-f', container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)


def health():
    request = urllib.request.Request('http://127.0.0.1/api/v1/health/ready', headers={'Host': os.environ.get('SIPP_HOST', 'sipp.nbp.co.id')})
    with urllib.request.urlopen(request, timeout=15) as response:
        payload = json.load(response)
        if payload.get('status') != 'ok':
            raise RuntimeError('Pemeriksaan kesiapan gagal')
    state = {'status': 'ok', 'completedAt': now()}
    write_state('health', state)
    return state


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['backup', 'restore-check', 'health'])
    args = parser.parse_args()
    os.umask(0o077)
    ROOT.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (ROOT / f'.{args.action}.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        started = time.monotonic()
        try:
            state = {'backup': backup, 'restore-check': restore_check, 'health': health}[args.action]()
            state['durationSeconds'] = round(time.monotonic() - started, 2)
            write_state(args.action, state)
            print(json.dumps(state))
        except Exception as error:
            # Pesan tidak menyertakan kredensial database.
            write_state(args.action, {'status': 'failed', 'completedAt': now(), 'error': type(error).__name__})
            raise


if __name__ == '__main__':
    main()

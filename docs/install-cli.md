# Install Outlayo CLI

## Quick install

```bash
curl -fsSL https://outlayo.com/install.sh | sh
```

## Recommended secure install (inspect before run)

```bash
curl -fsSL https://outlayo.com/install.sh -o install.sh
less install.sh
chmod +x install.sh
./install.sh
```

## Recommended verified install (checksum + optional commit pin)

```bash
curl -fsSL https://outlayo.com/install.sh -o install.sh
curl -fsSL https://outlayo.com/checksums/install.sh.sha256 -o install.sh.sha256
shasum -a 256 install.sh
OUTLAYO_INSTALL_SH_SHA256=<expected-sha> OUTLAYO_INSTALL_SCRIPT_PATH=./install.sh ./install.sh
```

Optional pinned revision:

```bash
OUTLAYO_EXPECTED_COMMIT=<git-commit-sha> ./install.sh
```

## Installer behavior

- clones or updates Outlayo source under `~/.outlayo` (override with `OUTLAYO_HOME`)
- installs dependencies with npm
- creates `outlayo` shim in `~/.local/bin` (override with `OUTLAYO_BIN_DIR`)

## Environment overrides

- `OUTLAYO_REPO` - git URL for installer source
- `OUTLAYO_HOME` - install directory
- `OUTLAYO_BIN_DIR` - shim output directory
- `OUTLAYO_INSTALL_SH_SHA256` - expected installer script SHA-256
- `OUTLAYO_INSTALL_SCRIPT_PATH` - local installer file path used for checksum verification
- `OUTLAYO_EXPECTED_COMMIT` - expected git commit hash after clone/update

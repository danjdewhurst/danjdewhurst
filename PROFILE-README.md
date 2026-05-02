# GitHub Profile README Setup

For a personal GitHub profile bio, create a public repository named exactly:

```text
danjdewhurst
```

GitHub will render `README.md` from that repository on the profile page for `https://github.com/danjdewhurst`.

A repository named `.github` is different:

- `username/.github` can hold default community health files for your own repositories.
- `organization/.github` can show an organization profile using `profile/README.md`.
- It is not the usual way to add a personal profile bio.

## Publish

From this directory:

```bash
gh repo create danjdewhurst --public --source=. --remote=origin --push
```

If the repo already exists, use:

```bash
git remote add origin git@github.com:danjdewhurst/danjdewhurst.git
git push -u origin main
```

# Store links site (upload this folder to Netlify)

A 2-page static site that satisfies both stores' **live privacy policy URL**
requirement without owning a domain.

```
docs/site/
├── index.html      → https://<your-site>.netlify.app/          (support URL)
└── privacy.html    → https://<your-site>.netlify.app/privacy.html  (privacy policy)
```

No build step, no JavaScript, no third-party requests — so the page makes no
network calls beyond serving itself, which matches what the privacy policy
claims about tracking.

## Upload (drag & drop, ~30 seconds)

1. Open <https://app.netlify.com/drop>
2. Drag the **`docs/site` folder** onto the page
3. Netlify gives you a URL like `https://random-name-12345.netlify.app`
   - click **Domain settings → Change site name** to something readable, e.g.
     `studenthub-ai.netlify.app`
4. Verify in a **private/incognito window**:
   - `https://<your-site>.netlify.app/privacy.html` renders (not a download)
   - it loads over **https://** with no certificate warning

## Then paste the URLs into

| File | Value |
|---|---|
| `apps/mobile-app/store/ios/en-US/privacy_policy_url.txt` | `https://<your-site>.netlify.app/privacy.html` |
| `apps/mobile-app/store/android/privacy_policy_url.txt` | `https://<your-site>.netlify.app/privacy.html` |
| `apps/mobile-app/store/ios/en-US/support_url.txt` | `https://<your-site>.netlify.app/` |
| `apps/mobile-app/store/ios/en-US/marketing_url.txt` | *(optional — delete this line to omit)* |

## Updating the policy later

Edit `privacy.html`, then drag the folder onto Netlify again (or connect the
repo and let Netlify redeploy). Keep `docs/privacy-policy.md` and
`privacy.html` in sync — the markdown is the source of truth in the repo.

> **Do not upload `privacy-policy.md` directly.** Netlify would serve it as a
> file download with `Content-Type: text/markdown`, and an app reviewer opening
> the link would download it instead of reading it — which counts as a
> non-working privacy policy and fails review.

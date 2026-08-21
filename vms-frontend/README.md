# Fleet Dispatch — Frontend

A plain HTML/CSS/JS frontend for your Django REST Framework Vehicle Management System. No build step, no npm — open it in a browser and it talks straight to your API.

## Files

```
vms-frontend/
├── index.html        the whole app shell (login + dashboard/vehicles/drivers/assignments)
├── css/style.css      styling
├── js/api.js           fetch wrapper: JWT storage, auto refresh-on-401, one function per endpoint
├── js/app.js            router + page rendering + modals
└── README.md
```

## 1. Enable CORS on the Django backend

Browsers block cross-origin requests by default, and your API (`127.0.0.1:8000`) is a different origin from wherever this frontend is served. Install `django-cors-headers`:

```bash
pip install django-cors-headers
```

In `config/settings.py`:

```python
INSTALLED_APPS = [
    ...,
    "corsheaders",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",   # as high as possible, before CommonMiddleware
    "django.middleware.common.CommonMiddleware",
    ...,
]

# Dev only — for production, allowlist your real frontend origin instead
CORS_ALLOW_ALL_ORIGINS = True
```

## 2. Run the frontend

Because `js/app.js` is loaded as an ES module (`<script type="module">`), you need to serve the files over `http://`, not open `index.html` directly via `file://`. From inside `vms-frontend/`:

```bash
python3 -m http.server 5500
```

Then visit `http://127.0.0.1:5500`.

Any static server works (VS Code's "Live Server", `npx serve`, etc.) — the app has no build dependencies.

## 3. Point it at your backend

By default the app calls `http://127.0.0.1:8000`. To change it, edit the one line near the top of `index.html`:

```html
<script>window.VMS_API_BASE = 'http://127.0.0.1:8000';</script>
```

## 4. Sign in

Use the same credentials as your Django superuser/admin (`admin` / `Admin@123` from your docs), or a driver account. The **Admin / Driver** toggle on the login screen is a UI-only preference — it just decides whether create/edit/delete buttons are shown. The backend still enforces permissions independently, so a driver account will get a clear error toast if it tries something admin-only.

## Notes on the "Create driver" form

Your API's `POST /api/drivers/` expects a `user` field — the numeric ID of an **existing Django `User`**. There's no self-serve registration endpoint in your spec, so before creating a driver profile in the UI, create the underlying user first (via `/admin/` or a `createsuperuser`/shell script), then use that user's ID in the "New driver" form.

## Notes on the dashboard

The app calls `GET /api/dashboard/` first. If that endpoint isn't implemented yet in your backend, it automatically falls back to deriving the same numbers from `/api/vehicles/` and `/api/drivers/` list counts, so the dashboard works either way.

## What's implemented

- JWT login, access + refresh token storage, silent refresh on 401
- Vehicles: list, search, filter (status/condition), ordering, pagination, create, edit, delete
- Drivers: list, search, filter (availability), ordering, pagination, create, edit, delete, license-expiry warning
- Assignments: list, search, filter (active/ended), ordering, pagination, create (from available drivers/vehicles only), unassign, delete
- Dashboard stat cards with fallback if `/api/dashboard/` isn't built yet

## What you may want to add later

- Real role detection from the JWT/user profile instead of the login-screen toggle, once your backend exposes a role field
- A "create Django user" flow if you want driver onboarding to happen entirely from this UI

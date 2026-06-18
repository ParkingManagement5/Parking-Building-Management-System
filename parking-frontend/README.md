# Parking Frontend

## Local dev

Default local setup uses the Vite proxy in `.env`:

```env
VITE_API_URL=/api/v1
```

Run the backend on `http://localhost:8080`, then start the frontend:

```bash
npm run dev
```

## Share FE with ngrok and keep real BE data

When another person opens your frontend through ngrok, `/api` proxy is no longer enough. The frontend must call your backend through a public ngrok URL.

1. Start backend locally on port `8080`.
2. Open a backend tunnel:

```bash
ngrok http 8080
```

3. Copy the HTTPS ngrok URL for backend, for example:

```text
https://abc123.ngrok-free.app
```

4. Replace `.env` temporarily with:

```env
VITE_API_URL=https://abc123.ngrok-free.app/api/v1
```

You can also copy from `.env.ngrok.example`.

5. Restart frontend:

```bash
npm run dev
```

6. Open a frontend tunnel:

```bash
ngrok http 5173
```

7. Share the frontend ngrok URL with testers.

## Quick switch back to local

After ngrok testing, set `.env` back to:

```env
VITE_API_URL=/api/v1
```

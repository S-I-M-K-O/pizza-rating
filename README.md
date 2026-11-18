## Features

- 🍕 **Rate Pizzerias**: Submit ratings from 1-6 with optional comments
- 📱 **Mobile-First Design**: Fully responsive interface optimized for phones and tablets
- 🌐 **Multi-Device Access**: Share ratings across devices on your network
- ⭐ **Smart Sorting**: Pizzerias and ratings sorted by highest scores first
- ⚡ **Real-time Updates**: See new ratings instantly across all devices
- 🎨 **Modern UI**: Beautiful gradient design with smooth animations
- ✅ **Form Validation**: Client-side validation with helpful error messages
- 🔄 **Loading States**: Visual feedback during form submission
- 📏 **Consistent Sizing**: Uniform form elements across all devices
- 🧹 **Duplicate Prevention**: Automatic normalization of pizzeria names (removes extra spaces, converts to title case)

## Setup and Running

### Prerequisites
- Docker and Docker Compose installed

### Run the Project

```bash
task up          # or: docker compose up --build -d
```

Common tasks (needs [Task](https://taskfile.dev), `brew install go-task`):

| Task | What it does |
|---|---|
| `task up` / `task down` | Start / stop the app |
| `task logs` | Follow container logs |
| `task dev` | Run the backend locally with `go run` |
| `task check` | gofmt check, `go vet` and tests with the race detector |
| `task backup` | Copy the ratings file to `backend/data/backups/` |

Run `task` to list everything.

Then open in your browser:
```
http://localhost
```

### Mobile & Tablet Usage

The app is fully optimized for mobile devices with:

- **Responsive Design**: Adapts seamlessly from phones to tablets to desktops
- **Touch-Friendly**: All buttons and inputs meet accessibility standards (44px minimum)
- **No Zoom Issues**: Prevents iOS zoom on form focus with proper font sizing
- **Consistent Layout**: Form elements maintain uniform sizing across all devices
- **Network Sharing**: Access from any device on your WiFi network
- **Fast Loading**: Optimized for mobile connections

**For mobile access**: Other devices on your network can access the app at `http://YOUR_COMPUTER_IP` (find your computer's IP address and share it with others).

The backend will be running on: `http://localhost:8080`

## How to Use

### Adding a Rating

1. Fill in the **Rate a pizzeria** form:
   - **Pizzeria**: pick an existing one from the suggestions or type a new name
   - **Your name**: remembered in your browser for next time
   - **Score**: tap a slice, 1 to 6 (6 is best)
   - **Comment**: optional, up to 500 characters

2. Click **Add rating**. The leaderboard updates right away.

You can also open a pizzeria's ratings on the leaderboard and click **Rate …** to prefill the form.

### Viewing Ratings

The leaderboard ranks pizzerias by average score (equal averages share a rank). Expand a pizzeria to read every rating and comment.

### Data Storage

Ratings are stored in `backend/data/data.json`. The `backend/data/` directory is mounted into the container, and every save writes a temp file and renames it into place, so the file is never left half-written. If the file is malformed, the backend refuses to start rather than overwrite it.

The server validates every rating: score 1–6, pizzeria name and reviewer required (max 80 / 40 characters), comment max 500 characters.

## Technical Details

- **Frontend**: Plain HTML/CSS/JavaScript
- **Backend**: Go HTTP server
- **API Endpoints**:
  - `GET /api/pizzerias` - Retrieve all pizzerias and ratings
  - `POST /api/rating` - Submit a new rating (`{"pizzeria", "reviewer", "score", "comment"}`); returns `400` with `{"error": "..."}` on invalid input



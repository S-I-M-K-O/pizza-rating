# Pizza Rating App

A web application for rating pizzerias and viewing ratings from other users.

## Setup and Running

### Prerequisites
- Docker and Docker Compose installed

### Run the Project

```bash
docker compose up --build
```

Then open in your browser:
```
http://localhost
```

**For mobile access**: Other devices on your network can access the app at `http://YOUR_COMPUTER_IP` (find your computer's IP address and share it with others).

The backend will be running on: `http://localhost:8080`

## How to Use

### Adding a Rating

1. Fill in the form on the webpage:
   - **Pizzeria Name**: The name of the pizzeria you want to rate
   - **Your Name**: Your reviewer name
   - **Score**: Rate from 1-6 (6 being the best)
   - **Comment**: Optional comment about your experience

2. Click **Submit Rating**

3. Your rating will be added to the database and the page will refresh to show your new rating

### Viewing Ratings

All pizzerias and their ratings are displayed automatically below the form. You can see:
- Pizzeria name with average rating
- Individual ratings from reviewers with their scores and comments

### Data Storage

Ratings are stored in `backend/data.json` which persists between sessions due to Docker volumes.

## Technical Details

- **Frontend**: Plain HTML/CSS/JavaScript
- **Backend**: Go HTTP server
- **API Endpoints**:
  - `GET /api/pizzerias` - Retrieve all pizzerias and ratings
  - `POST /api/rating` - Submit a new rating



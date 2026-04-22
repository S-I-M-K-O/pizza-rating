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



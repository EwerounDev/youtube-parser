# YouTube Parser - Server Version DEPRECATED
# Use this instead: https://github.com/EwerounDev/youtube-parser-go

Server version of YouTube parser with direct requests to YouTube and CORS configuration.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd parser
npm install
```

### 2. Start Server

```bash
npm start
```

Server will start on `http://localhost:3002`

### 3. Open Test Page

Open in browser: `http://localhost:3002/server-test.html`

## 📁 File Structure

```
parser/
├── server.js              # Main server
├── client-parser.js       # Client library
├── server-test.html       # Test page
├── package.json           # Dependencies
└── README.md             # Documentation
```

## 🔧 API Endpoints

### Search Videos
```
GET /api/search?q=EXAMPLE&maxResults=50&filterOfficial=true&minDuration=40
```

### Popular Videos
```
GET /api/trending?region=RU&filterOfficial=true&minDuration=40
```

### Video Information
```
GET /api/video/:videoId
```

### Server Status
```
GET /api/status
```

### Server Statistics
```
GET /api/stats
```

## 💻 Usage in Code

### Client Library

```javascript
// Create parser instance
const parser = new ClientYouTubeParser('http://localhost:3002');

// Search videos
const results = await parser.searchVideos('example', {
    maxResults: 10,
    filterOfficial: false,
    minDuration: 40
});

// Get popular videos
const trending = await parser.getPopularVideos({
    region: 'RU',
    filterOfficial: true,
    minDuration: 40
});

// Video information
const videoInfo = await parser.getVideoInfo('videoId');

// Check server availability
const isAvailable = await parser.checkAvailability();
```

### Direct HTTP Requests

```javascript
// Search
const response = await fetch('http://localhost:3002/api/search?q=example');
const data = await response.json();

// Popular
const trending = await fetch('http://localhost:3002/api/trending');
const data = await trending.json();
```

## ⚙️ Settings

### Search Parameters

- `q` - search query (required)
- `maxResults` - maximum number of results (1-50, default 50)
- `filterOfficial` - official channels filter (true/false, default false)
- `minDuration` - minimum duration in seconds (default 40)

### Trending Parameters

- `region` - region (default RU)
- `filterOfficial` - official channels filter
- `minDuration` - minimum duration

## 🔄 How It Works

### Direct Requests to YouTube

Server makes direct HTTP requests to YouTube with proper headers:

- `User-Agent` - mimics browser
- `Accept` - accepts HTML content
- `Accept-Language` - Russian language
- `Accept-Encoding` - compression support
- `DNT` - Do Not Track
- `Connection` - keep-alive
- `Upgrade-Insecure-Requests` - HTTPS

### HTML Parsing

1. **JSON data** - extracts `ytInitialData` from HTML
2. **Regular expressions** - fallback parsing method
3. **Filtering** - official channels and duration

## 🛠️ Development

### Run in Development Mode

```bash
npm run dev
```

Uses nodemon for automatic reload on changes.

### Logging

Server outputs detailed logs:
- YouTube requests
- Parsing errors
- Request statistics

## 🔒 Security

- CORS configured for all origins (`*`)
- Request timeouts (15 seconds)
- Input validation
- YouTube error handling

## 📊 Monitoring

### Server Statistics

```javascript
const stats = await parser.getServerStats();
console.log(`Server: ${stats.server}, Method: ${stats.method}`);
```

### Server Status

```javascript
const isAvailable = await parser.checkAvailability();
console.log(`Server available: ${isAvailable}`);
```

## 🚨 Troubleshooting

### Server Won't Start

1. Check that port 3002 is free
2. Make sure all dependencies are installed
3. Check Node.js version (>=14.0.0)

### CORS Errors

1. Make sure server is running
2. Check server URL in client code
3. Check CORS settings in server.js

### YouTube Blocking Requests

1. Server uses proper browser headers
2. Check internet connection
3. YouTube may temporarily block IP for frequent requests

### No Search Results

1. Check search query correctness
2. Try disabling filters
3. Reduce minimum duration

## 📝 Examples

### Complete Usage Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>YouTube Parser Test</title>
</head>
<body>
    <input type="text" id="searchInput" placeholder="Search...">
    <button onclick="search()">Search</button>
    <div id="results"></div>

    <script src="client-parser.js"></script>
    <script>
        const parser = new ClientYouTubeParser('http://localhost:3002');

        async function search() {
            const query = document.getElementById('searchInput').value;
            try {
                const results = await parser.searchVideos(query, {
                    maxResults: 5,
                    filterOfficial: true,
                    minDuration: 40
                });
                
                document.getElementById('results').innerHTML = 
                    results.map(video => `
                        <div>
                            <h3>${video.snippet.title}</h3>
                            <p>${video.snippet.channelTitle}</p>
                        </div>
                    `).join('');
            } catch (error) {
                console.error('Error:', error);
            }
        }
    </script>
</body>
</html>
```

## 🆚 Advantages Over Proxy

### ✅ Direct Requests
- No dependency on external proxy services
- Maximum speed
- Reliability

### ✅ Full Control
- Header configuration
- Error handling
- Logging

### ✅ Security
- No data transmission through third parties
- Request control
- Protection from blocks

## 📄 License

MIT License 
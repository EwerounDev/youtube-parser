const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;


app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname)));


async function fetchYouTubeData(url) {
    try {
        console.log(`Request to YouTube: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 15000 
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        return html;

    } catch (error) {
        console.error('Error requesting YouTube:', error);
        throw error;
    }
}


function parseYouTubeHTML(html) {
    try {
        console.log('Starting HTML parsing...');
        
        
        const ytInitialDataMatch = html.match(/var ytInitialData = ({.+?});/);
        if (ytInitialDataMatch) {
            console.log('Found ytInitialData, parsing JSON...');
            try {
                const data = JSON.parse(ytInitialDataMatch[1]);
                const results = extractVideosFromData(data);
                if (results.length > 0) {
                    console.log(`Found ${results.length} videos via JSON`);
                    return results;
                }
            } catch (error) {
                console.log('JSON parsing error:', error.message);
            }
        }

        
        const ytInitialDataMatch2 = html.match(/ytInitialData["\s]*[:=]\s*({.+?});/);
        if (ytInitialDataMatch2) {
            console.log('Found ytInitialData (format 2), parsing JSON...');
            const data = JSON.parse(ytInitialDataMatch2[1]);
            const results = extractVideosFromData(data);
            if (results.length > 0) {
                console.log(`Found ${results.length} videos via JSON (format 2)`);
                return results;
            }
        }

        
        console.log('Using regex parsing...');
        const regexResults = parseWithRegex(html);
        if (regexResults.length > 0) {
            console.log(`Found ${regexResults.length} videos via regex`);
            return regexResults;
        }

        
        console.log('Using data-attributes parsing...');
        const dataResults = parseWithDataAttributes(html);
        if (dataResults.length > 0) {
            console.log(`Found ${dataResults.length} videos via data-attributes`);
            return dataResults;
        }

        console.log('Could not find videos with any method');
        return [];

    } catch (error) {
        console.error('HTML parsing error:', error);
        return [];
    }
}


function extractVideosFromData(data) {
    const videos = [];
    
    const extractVideos = (obj, path = '') => {
        if (!obj || typeof obj !== 'object') return;
        
        
        if (obj.videoId && obj.title) {
            videos.push({
                id: { videoId: obj.videoId },
                snippet: {
                    title: obj.title,
                    channelTitle: obj.channelName || obj.authorName || obj.channelTitle || '',
                    thumbnails: {
                        default: { url: `https://i.ytimg.com/vi/${obj.videoId}/default.jpg` },
                        medium: { url: obj.thumbnail || obj.thumbnailUrl || `https://i.ytimg.com/vi/${obj.videoId}/mqdefault.jpg` },
                        high: { url: `https://i.ytimg.com/vi/${obj.videoId}/hqdefault.jpg` },
                        standard: { url: `https://i.ytimg.com/vi/${obj.videoId}/sddefault.jpg` },
                        maxres: { url: `https://i.ytimg.com/vi/${obj.videoId}/maxresdefault.jpg` }
                    }
                },
                contentDetails: {
                    duration: formatDuration(obj.lengthSeconds || obj.duration || 0)
                }
            });
            return;
        }
        
        
        if (obj.contents && Array.isArray(obj.contents)) {
            console.log('Found contents structure, searching for videos...');
            obj.contents.forEach((item, index) => {
                if (item.itemSectionRenderer && item.itemSectionRenderer.contents) {
                    item.itemSectionRenderer.contents.forEach(content => {
                        extractVideos(content, path + `.contents[${index}]`);
                    });
                }
            });
            return;
        }
        
        
        if (obj.twoColumnSearchResultsRenderer && obj.twoColumnSearchResultsRenderer.primaryContents) {
            console.log('Found twoColumnSearchResultsRenderer structure...');
            extractVideos(obj.twoColumnSearchResultsRenderer.primaryContents, path + '.twoColumnSearchResultsRenderer');
            return;
        }
        
        
        if (obj.sectionListRenderer && obj.sectionListRenderer.contents) {
            console.log('Found sectionListRenderer structure...');
            obj.sectionListRenderer.contents.forEach((section, index) => {
                extractVideos(section, path + `.sectionListRenderer[${index}]`);
            });
            return;
        }
        
        
        if (obj.videoRenderer && obj.videoRenderer.videoId) {
            const video = obj.videoRenderer;
            videos.push({
                id: { videoId: video.videoId },
                snippet: {
                    title: video.title?.runs?.[0]?.text || video.title?.simpleText || 'Unknown Title',
                    channelTitle: video.ownerText?.runs?.[0]?.text || video.channelName || 'Unknown Channel',
                    thumbnails: {
                        default: { url: video.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${video.videoId}/default.jpg` },
                        medium: { url: video.thumbnail?.thumbnails?.[1]?.url || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg` },
                        high: { url: video.thumbnail?.thumbnails?.[2]?.url || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg` },
                        standard: { url: video.thumbnail?.thumbnails?.[3]?.url || `https://i.ytimg.com/vi/${video.videoId}/sddefault.jpg` },
                        maxres: { url: video.thumbnail?.thumbnails?.[4]?.url || `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg` }
                    }
                },
                contentDetails: {
                    duration: formatDuration(video.lengthText?.simpleText || '0:00')
                }
            });
            return;
        }
        
        
        if (obj.itemSectionRenderer && obj.itemSectionRenderer.contents) {
            console.log('Found itemSectionRenderer structure...');
            obj.itemSectionRenderer.contents.forEach((content, index) => {
                extractVideos(content, path + `.itemSectionRenderer[${index}]`);
            });
            return;
        }
        
        
        if (obj.compactVideoRenderer && obj.compactVideoRenderer.videoId) {
            const video = obj.compactVideoRenderer;
            videos.push({
                id: { videoId: video.videoId },
                snippet: {
                    title: video.title?.simpleText || video.title?.runs?.[0]?.text || 'Unknown Title',
                    channelTitle: video.shortBylineText?.runs?.[0]?.text || 'Unknown Channel',
                    thumbnails: {
                        default: { url: video.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${video.videoId}/default.jpg` },
                        medium: { url: video.thumbnail?.thumbnails?.[1]?.url || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg` },
                        high: { url: video.thumbnail?.thumbnails?.[2]?.url || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg` },
                        standard: { url: video.thumbnail?.thumbnails?.[3]?.url || `https://i.ytimg.com/vi/${video.videoId}/sddefault.jpg` },
                        maxres: { url: video.thumbnail?.thumbnails?.[4]?.url || `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg` }
                    }
                },
                contentDetails: {
                    duration: formatDuration(video.lengthText?.simpleText || '0:00')
                }
            });
            return;
        }
        
        
        if (path.length < 10) { 
            if (Array.isArray(obj)) {
                obj.forEach((item, index) => extractVideos(item, path + `[${index}]`));
            } else {
                Object.entries(obj).forEach(([key, value]) => {
                    extractVideos(value, path + `.${key}`);
                });
            }
        }
    };
    
    extractVideos(data);
    console.log(`Extracted ${videos.length} videos from JSON data`);
    return videos;
}


function parseWithRegex(html) {
    const videos = [];
    const seenVideoIds = new Set();
    
    
    const videoIdPatterns = [
        /watch\?v=([a-zA-Z0-9_-]+)/g,
        /"videoId":"([a-zA-Z0-9_-]+)"/g,
        /videoId=([a-zA-Z0-9_-]+)/g
    ];
    
    let allVideoIds = [];
    videoIdPatterns.forEach(pattern => {
        const matches = html.match(pattern);
        if (matches) {
            matches.forEach(match => {
                const videoId = match.includes('"') ? match.match(/"([a-zA-Z0-9_-]+)"/)[1] : match.split('=')[1];
                if (videoId && !seenVideoIds.has(videoId)) {
                    seenVideoIds.add(videoId);
                    allVideoIds.push(videoId);
                }
            });
        }
    });
    
    console.log(`Found ${allVideoIds.length} unique videoIds via regex`);
    
    
    const titlePatterns = [
        /"title":"([^"]+)"/g,
        /title="([^"]+)"/g,
        /"text":"([^"]+)"/g
    ];
    
    let allTitles = [];
    titlePatterns.forEach(pattern => {
        const matches = html.match(pattern);
        if (matches) {
            matches.forEach(match => {
                const title = match.match(/["']([^"']+)["']/)[1];
                if (title && title.length > 5 && title.length < 200) {
                    allTitles.push(title);
                }
            });
        }
    });
    
    console.log(`Found ${allTitles.length} titles via regex`);
    
    
    const thumbnailPatterns = [
        /"thumbnailUrl":"([^"]+)"/g,
        /"url":"([^"]*i\.ytimg\.com[^"]*)"/g,
        /src="([^"]*i\.ytimg\.com[^"]*)"/g
    ];
    
    let allThumbnails = [];
    thumbnailPatterns.forEach(pattern => {
        const matches = html.match(pattern);
        if (matches) {
            matches.forEach(match => {
                const thumbnail = match.match(/["']([^"']+)["']/)[1];
                if (thumbnail && thumbnail.includes('i.ytimg.com')) {
                    allThumbnails.push(thumbnail);
                }
            });
        }
    });
    
    console.log(`Found ${allThumbnails.length} thumbnails via regex`);
    
    
    allVideoIds.forEach((videoId, index) => {
        const title = allTitles[index] || `Video ${index + 1}`;
        const thumbnail = allThumbnails[index] || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        
        videos.push({
            id: { videoId: videoId },
            snippet: {
                title: title,
                channelTitle: 'Unknown Channel',
                thumbnails: {
                    default: { url: `https://i.ytimg.com/vi/${videoId}/default.jpg` },
                    medium: { url: thumbnail },
                    high: { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` },
                    standard: { url: `https://i.ytimg.com/vi/${videoId}/sddefault.jpg` },
                    maxres: { url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` }
                }
            },
            contentDetails: {
                duration: 'PT0M0S'
            }
        });
    });
    
    return videos;
}


function parseWithDataAttributes(html) {
    const videos = [];
    
    
    const videoIdMatches = html.match(/data-video-id="([a-zA-Z0-9_-]+)"/g);
    const titleMatches = html.match(/data-title="([^"]+)"/g);
    const channelMatches = html.match(/data-channel="([^"]+)"/g);
    
    if (videoIdMatches) {
        videoIdMatches.forEach((match, index) => {
            const videoId = match.match(/data-video-id="([a-zA-Z0-9_-]+)"/)[1];
            const title = titleMatches && titleMatches[index] 
                ? titleMatches[index].match(/data-title="([^"]+)"/)[1] 
                : 'Unknown Title';
            const channel = channelMatches && channelMatches[index]
                ? channelMatches[index].match(/data-channel="([^"]+)"/)[1]
                : 'Unknown Channel';
            
            videos.push({
                id: { videoId: videoId },
                snippet: {
                    title: title,
                    channelTitle: channel,
                                    thumbnails: {
                    default: { url: `https://i.ytimg.com/vi/${videoId}/default.jpg` },
                    medium: { url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` },
                    high: { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` },
                    standard: { url: `https://i.ytimg.com/vi/${videoId}/sddefault.jpg` },
                    maxres: { url: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` }
                }
                },
                contentDetails: {
                    duration: 'PT0M0S'
                }
            });
        });
    }
    
    return videos;
}


function formatDuration(input) {
    if (!input) return 'PT0M0S';
    
    
    if (typeof input === 'string' && input.startsWith('PT')) {
        return input;
    }
    
    
    if (typeof input === 'string' && input.includes(':')) {
        const parts = input.split(':');
        if (parts.length === 2) {
            
            const minutes = parseInt(parts[0]);
            const seconds = parseInt(parts[1]);
            return `PT${minutes}M${seconds}S`;
        } else if (parts.length === 3) {
            
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            const seconds = parseInt(parts[2]);
            return `PT${hours}H${minutes}M${seconds}S`;
        }
    }
    
    
    if (typeof input === 'number' || !isNaN(input)) {
        const seconds = parseInt(input);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        let duration = 'PT';
        if (hours > 0) duration += `${hours}H`;
        if (minutes > 0) duration += `${minutes}M`;
        duration += `${secs}S`;
        
        return duration;
    }
    
    return 'PT0M0S';
}


function filterOfficialChannels(videos) {
    return videos.filter(video => {
        const channelTitle = video.snippet.channelTitle;
        return channelTitle && channelTitle.endsWith(' - Topic');
    });
}


function filterByDuration(videos, minSeconds = 40) {
    return videos.filter(video => {
        const duration = video.contentDetails.duration;
        if (!duration) return false;
        
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return false;
        
        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        
        return totalSeconds >= minSeconds;
    });
}




app.get('/api/search', async (req, res) => {
    try {
        const { q: query, maxResults = 50, filterOfficial = 'false', minDuration = 40 } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        console.log(`Search: ${query}`);

        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        console.log(`Search URL: ${searchUrl}`);
        
        const html = await fetchYouTubeData(searchUrl);
        console.log(`Received HTML size: ${html.length} characters`);
        
        const results = parseYouTubeHTML(html);
        console.log(`Parsing results: ${results.length} videos`);

        
        let filteredResults = results;
        
        if (filterOfficial === 'true') {
            filteredResults = filterOfficialChannels(filteredResults);
        }
        
        if (minDuration) {
            filteredResults = filterByDuration(filteredResults, parseInt(minDuration));
        }

        const finalResults = filteredResults.slice(0, parseInt(maxResults));

        res.json({
            success: true,
            results: finalResults,
            total: finalResults.length,
            query: query
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            error: error.message,
            success: false 
        });
    }
});


app.get('/api/trending', async (req, res) => {
    try {
        const { region = 'RU', filterOfficial = 'false', minDuration = 40 } = req.query;

        console.log('Getting popular videos');

        const trendingUrl = `https://www.youtube.com/feed/trending?region=${region}`;
        const html = await fetchYouTubeData(trendingUrl);
        const results = parseYouTubeHTML(html);

        
        let filteredResults = results;
        
        if (filterOfficial === 'true') {
            filteredResults = filterOfficialChannels(filteredResults);
        }
        
        if (minDuration) {
            filteredResults = filterByDuration(filteredResults, parseInt(minDuration));
        }

        res.json({
            success: true,
            results: filteredResults,
            total: filteredResults.length
        });

    } catch (error) {
        console.error('Error getting trends:', error);
        res.status(500).json({ 
            error: error.message,
            success: false 
        });
    }
});


app.get('/api/video/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;

        console.log(`Getting video information: ${videoId}`);

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const html = await fetchYouTubeData(videoUrl);
        const results = parseYouTubeHTML(html);

        if (results.length > 0) {
            res.json({
                success: true,
                video: results[0]
            });
        } else {
            res.status(404).json({
                error: 'Video not found',
                success: false
            });
        }

    } catch (error) {
        console.error('Error getting video:', error);
        res.status(500).json({ 
            error: error.message,
            success: false 
        });
    }
});


app.get('/api/status', async (req, res) => {
    try {
        const testUrl = 'https://www.youtube.com';
        await fetchYouTubeData(testUrl);
        
        res.json({
            success: true,
            status: 'available',
            message: 'Parser is working'
        });

    } catch (error) {
        res.json({
            success: false,
            status: 'unavailable',
            message: error.message
        });
    }
});


app.get('/api/stats', (req, res) => {
    res.json({
        server: 'YouTube Parser Server',
        version: '1.0.0',
        method: 'Direct YouTube requests',
        cors: 'enabled',
        port: PORT
    });
});


app.listen(PORT, () => {
    console.log(`🚀 YouTube Parser Server started on port ${PORT}`);
    console.log(`📡 API available at: http://localhost:${PORT}/api`);
    console.log(`🌐 Test page: http://localhost:${PORT}/server-test.html`);
});

module.exports = app;

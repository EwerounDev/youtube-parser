class ClientYouTubeParser {
    constructor(serverUrl = "http://localhost:3002") {
        this.serverUrl = serverUrl;
        this.apiBase = `${serverUrl}/api`;
    }

    async searchVideos(query, options = {}) {
        const { maxResults = 50, filterOfficial = false, minDuration = 40 } = options;

        try {
            const params = new URLSearchParams({
                q: query,
                maxResults: maxResults,
                filterOfficial: filterOfficial.toString(),
                minDuration: minDuration,
            });

            const response = await fetch(`${this.apiBase}/search?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Search error");
            }

            return data.results;
        } catch (error) {
            console.error("Error searching videos:", error);
            throw error;
        }
    }

    async getPopularVideos(options = {}) {
        const { region = "RU", filterOfficial = false, minDuration = 40 } = options;

        try {
            const params = new URLSearchParams({
                region: region,
                filterOfficial: filterOfficial.toString(),
                minDuration: minDuration,
            });

            const response = await fetch(`${this.apiBase}/trending?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Error getting trends");
            }

            return data.results;
        } catch (error) {
            console.error("Error getting popular videos:", error);
            throw error;
        }
    }

    async getVideoInfo(videoId) {
        try {
            const response = await fetch(`${this.apiBase}/video/${videoId}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || "Video not found");
            }

            return data.video;
        } catch (error) {
            console.error("Error getting video information:", error);
            throw error;
        }
    }

    async checkAvailability() {
        try {
            const response = await fetch(`${this.apiBase}/status`);

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error("Error checking server availability:", error);
            return false;
        }
    }

    async getServerStats() {
        try {
            const response = await fetch(`${this.apiBase}/stats`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error getting server statistics:", error);
            throw error;
        }
    }

    filterOfficialChannels(videos) {
        return videos.filter((video) => {
            const channelTitle = video.snippet.channelTitle;
            return channelTitle && channelTitle.endsWith(" - Topic");
        });
    }

    filterByDuration(videos, minSeconds = 40) {
        return videos.filter((video) => {
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

    formatDuration(duration) {
        if (!duration) return "0:00";

        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return "0:00";

        const hours = parseInt(match[1] || 0);
        const minutes = parseInt(match[2] || 0);
        const seconds = parseInt(match[3] || 0);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, "0")}`;
        }
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = ClientYouTubeParser;
} else if (typeof window !== "undefined") {
    window.ClientYouTubeParser = ClientYouTubeParser;
}

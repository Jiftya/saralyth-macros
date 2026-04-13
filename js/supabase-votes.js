// Supabase votes client - uses publishable key for public voting
const SUPABASE_URL = 'https://wlqlevebosrjscuotkif.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yTqIWghbBdDMeFR9yNupDw_1jyLxkfm';

async function supabaseQuery(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...options.headers,
    };
    
    const response = await fetch(url, {
        ...options,
        headers,
    });
    
    if (!response.ok) {
        throw new Error(`Supabase query failed: ${response.status}`);
    }
    
    return response.json();
}

export const supabaseVotes = {
    // Get votes for a macro
    async getVotes(macroFileUrl) {
        try {
            const result = await supabaseQuery(`/votes?macro_file_url=eq.${encodeURIComponent(macroFileUrl)}`);
            if (Array.isArray(result) && result.length > 0) {
                const vote = result[0];
                return { up: vote.up_count || 0, down: vote.down_count || 0 };
            }
            return { up: 0, down: 0 };
        } catch (e) {
            console.warn('Failed to fetch votes from Supabase:', e);
            return { up: 0, down: 0 };
        }
    },

    // Cast a vote (increment or decrement)
    async vote(macroFileUrl, direction) {
        try {
            const votes = await this.getVotes(macroFileUrl);
            const newUp = direction === 'up' ? votes.up + 1 : votes.up;
            const newDown = direction === 'down' ? votes.down + 1 : votes.down;
            
            // Upsert vote
            const result = await supabaseQuery('/votes', {
                method: 'POST',
                body: JSON.stringify({
                    macro_file_url: macroFileUrl,
                    up_count: newUp,
                    down_count: newDown,
                }),
                headers: { Prefer: 'resolution=merge-duplicates' },
            });
            
            return { up: newUp, down: newDown };
        } catch (e) {
            console.error('Failed to cast vote:', e);
            throw e;
        }
    },
};

const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;
const currentVersion = "1.2";

createApp({
    setup() {
        const posts = ref([]);
        const isLoading = ref(true);
        const searchQuery = ref('');
        const searchType = ref('all');
        const isModalOpen = ref(false);
        const isFormOpen = ref(false);
        const isSettingsOpen = ref(false);
        const activePost = ref({});
        const activeJsonContent = ref('');
        const activeFileName = ref('');
        const activeFileSize = ref('0 KB');
        const activeDescription = ref('');
        const activeVideoMp4 = ref('');
        const showCopied = ref(false);
        const showFullCode = ref(false);
        const theme = ref(localStorage.getItem('theme') || 'dark');
        const fontSize = ref(localStorage.getItem('fontSize') || 'normal');
        const compactMode = ref(localStorage.getItem('compactMode') === 'true');
        const autoExpand = ref(localStorage.getItem('autoExpand') === 'true');
        const showDescriptions = ref(localStorage.getItem('showDescriptions') !== 'false');

        // Supabase config
        const SUPABASE_URL = 'https://wlqlevebosrjscuotkif.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_yTqIWghbBdDMeFR9yNupDw_1jyLxkfm';

        const voteStore = ref({});

        const getPostVotes = (post) => {
            return voteStore.value[post.fileUrl] || { up: 0, down: 0 };
        };

        const castVote = async (post, direction) => {
            const key = post.fileUrl;
            const current = voteStore.value[key] || { up: 0, down: 0 };
            const newVotes = {
                up: direction === 'up' ? current.up + 1 : current.up,
                down: direction === 'down' ? current.down + 1 : current.down,
            };
            voteStore.value = { ...voteStore.value, [key]: newVotes };

            try {
                const url = `${SUPABASE_URL}/rest/v1/votes?macro_file_url=eq.${encodeURIComponent(key)}`;
                const body = { macro_file_url: key, up_count: newVotes.up, down_count: newVotes.down };
                let res = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (res.status === 404) {
                    res = await fetch(`${SUPABASE_URL}/rest/v1/votes`, {
                        method: 'POST',
                        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });
                }
            } catch (e) {
                console.error('Vote save failed:', e);
            }
        };

        const loadVotesFromSupabase = async () => {
            try {
                const result = await fetch(`${SUPABASE_URL}/rest/v1/votes`, {
                    headers: { 'apikey': SUPABASE_KEY },
                }).then(r => r.json());
                if (Array.isArray(result)) {
                    result.forEach(v => {
                        voteStore.value[v.macro_file_url] = { up: v.up_count || 0, down: v.down_count || 0 };
                    });
                }
            } catch (e) {
                console.warn('Could not load votes from Supabase - votes unavailable');
            }
        };

        const getStarRating = (post) => {
            const { up, down } = getPostVotes(post);
            const total = up + down;
            if (!total) return 0;
            return Math.max(1, Math.round((up / total) * 5));
        };

        watch(theme, (value) => {
            document.documentElement.classList.toggle('light-theme', value === 'light');
            localStorage.setItem('theme', value);
        }, { immediate: true });

        watch(fontSize, (value) => {
            localStorage.setItem('fontSize', value);
            document.documentElement.style.fontSize = value === 'large' ? '18px' : value === 'small' ? '14px' : '16px';
        }, { immediate: true });

        watch(compactMode, (value) => {
            localStorage.setItem('compactMode', value);
        });

        watch(autoExpand, (value) => {
            localStorage.setItem('autoExpand', value);
        });

        watch(showDescriptions, (value) => {
            localStorage.setItem('showDescriptions', value);
        });

        const isLongCode = computed(() => activeJsonContent.value.split('\n').length > 50);

        const displayedCode = computed(() => {
            if (showFullCode.value || !isLongCode.value) return activeJsonContent.value;
            return activeJsonContent.value.split('\n').slice(0, 50).join('\n') + '\n\n... (Code limited to 50 lines for performance)';
        });

        const openModal = async (post) => {
            activePost.value = post;
            activeFileName.value = post.fileUrl ? post.fileUrl.split('/').pop() : 'macro.json';
            showFullCode.value = false;
            activeDescription.value = '';
            activeVideoMp4.value = post.mp4Url || '';
            isModalOpen.value = true;
            document.body.style.overflow = 'hidden';

            try {
                const res = await fetch(post.fileUrl);
                if (!res.ok) {
                    activeJsonContent.value = `// Error: HTTP ${res.status}`;
                    return;
                }
                const data = await res.json();
                activeJsonContent.value = JSON.stringify(data, null, 4);
                const size = res.headers.get("content-length");
                activeFileSize.value = size ? (size / 1024).toFixed(1) + " KB" : "Unknown";
                nextTick(() => { setTimeout(() => { Prism.highlightAll(); }, 50); });
            } catch (e) {
                activeJsonContent.value = `// Error: ${e.message}`;
            }

            if (post.folder) {
                try {
                    const textRes = await fetch(`${post.folder}/description.txt`);
                    if (textRes.ok) {
                        activeDescription.value = await textRes.text();
                    }
                } catch (e) {}
            }
        };

        const revealCode = () => {
            showFullCode.value = true;
            nextTick(() => { Prism.highlightAll(); });
        };

        const copyMacroLink = () => {
            const cleanUrl = window.location.origin + window.location.pathname;
            const shareUrl = `${cleanUrl}?macro=${encodeURIComponent(activePost.value.title)}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
                showCopied.value = true;
                setTimeout(() => { showCopied.value = false; }, 2000);
            });
        };

        const toggleTheme = () => { theme.value = theme.value === 'dark' ? 'light' : 'dark'; };
        const goToApplications = () => { window.location.href = '/applications'; };

        onMounted(async () => {
            loadVotesFromSupabase();
            try {
                let postsUrl = '/posts.json';
                if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                    postsUrl = '//seralyth-macros.online/posts.json?v=' + Date.now();
                }
                const res = await fetch(postsUrl);
                if (!res.ok) throw new Error('Failed to fetch posts');
                posts.value = await res.json();

                const urlParams = new URLSearchParams(window.location.search);
                const macroParam = urlParams.get('macro');
                if (macroParam) {
                    const found = posts.value.find(p => p.title.toLowerCase() === macroParam.toLowerCase());
                    if (found) openModal(found);
                }
            } catch (e) {
                try {
                    const retry = await fetch('/posts.json');
                    posts.value = await retry.json();
                } catch (err) {}
            } finally {
                isLoading.value = false;
            }
        });

        const closeModal = () => { isModalOpen.value = false; document.body.style.overflow = ''; };
        const getEmbedUrl = (url) => {
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
        };

        const filteredPosts = computed(() => {
            const q = searchQuery.value.toLowerCase().trim();
            if (!q) return posts.value;

            return posts.value.filter(post => {
                const title = (post.title || '').toLowerCase();
                const author = (post.author || '').toLowerCase();
                const message = (post.message || '').toLowerCase();
                const folder = (post.folder || '').toLowerCase();
                const tags = (post.tags || []).join(' ').toLowerCase();
                const type = (post.type || '').toLowerCase();
                const any = [title, author, message, folder, tags, type].join(' ');

                if (searchType.value === 'title') return title.includes(q);
                if (searchType.value === 'author') return author.includes(q) || any.includes(q);
                if (searchType.value === 'tag') return tags.includes(q) || any.includes(q);
                if (searchType.value === 'map') return folder.includes(q) || title.includes(q) || any.includes(q);
                if (searchType.value === 'type') return type.includes(q) || any.includes(q);
                return any.includes(q);
            });
        });

        const creatorCount = computed(() => {
            const creators = new Set(
                posts.value
                    .map(post => (post.author || '').toLowerCase().trim())
                    .filter(name => name && name !== 'unknown')
            );
            return Math.max(creators.size, 1);
        });

        return {
            posts, isLoading, searchQuery, searchType, filteredPosts, creatorCount, isModalOpen, isFormOpen, isSettingsOpen, activePost,
            activeJsonContent, activeFileName, activeFileSize, activeDescription, activeVideoMp4, openModal, closeModal, getEmbedUrl,
            copyMacroLink, showCopied, showFullCode, revealCode, displayedCode, isLongCode, currentVersion, toggleTheme,
            theme, goToApplications, fontSize, compactMode, autoExpand, showDescriptions,
            getPostVotes, castVote, getStarRating
        };
    }
}).mount('#app');

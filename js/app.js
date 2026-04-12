const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;
const currentVersion = "1.2";

createApp({
    setup() {
        const posts = ref([]);
        const isLoading = ref(true);
        const searchQuery = ref('');
        const searchType = ref('title');
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
            try {
                const res = await fetch('//seralyth-macros.online/posts.json?v=' + Date.now());
                posts.value = await res.json();

                const urlParams = new URLSearchParams(window.location.search);
                const macroParam = urlParams.get('macro');
                if (macroParam) {
                    const found = posts.value.find(p => p.title.toLowerCase() === macroParam.toLowerCase());
                    if (found) openModal(found);
                }
            } catch (e) {
                try {
                    const retry = await fetch('posts.json');
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
            return posts.value.filter(p => searchType.value === 'title' ? p.title?.toLowerCase().includes(q) : p.author?.toLowerCase().includes(q));
        });

        const creatorCount = computed(() => [...new Set(posts.value.map(post => post.author))].length);

        return {
            posts, isLoading, searchQuery, searchType, filteredPosts, creatorCount, isModalOpen, isFormOpen, isSettingsOpen, activePost,
            activeJsonContent, activeFileName, activeFileSize, activeDescription, activeVideoMp4, openModal, closeModal, getEmbedUrl,
            copyMacroLink, showCopied, showFullCode, revealCode, displayedCode, isLongCode, currentVersion, toggleTheme,
            theme, goToApplications, fontSize, compactMode, autoExpand, showDescriptions
        };
    }
}).mount('#app');

Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, { configurable: true, 
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get POLL_OPTION_LABELS () {
        return POLL_OPTION_LABELS;
    },
    get adminAnalyticsService () {
        return adminAnalyticsService;
    },
    get buildAdminAnalyticsReport () {
        return buildAdminAnalyticsReport;
    },
    get calculateActiveUsers () {
        return calculateActiveUsers;
    },
    get calculateEventFunnelMetrics () {
        return calculateEventFunnelMetrics;
    },
    get calculateNotificationMetrics () {
        return calculateNotificationMetrics;
    },
    get calculatePercentage () {
        return calculatePercentage;
    },
    get calculateUserPreferenceMetrics () {
        return calculateUserPreferenceMetrics;
    },
    get calculateWatchlistItemMetrics () {
        return calculateWatchlistItemMetrics;
    },
    get formatPollMetrics () {
        return formatPollMetrics;
    },
    get formatRecentEvents () {
        return formatRecentEvents;
    }
});
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
const POLL_OPTION_LABELS = {
    tv_shows: 'TV Shows and Series support',
    import_lists: '1-Click import from Letterboxd/Trakt/IMDb',
    debrid_filters: 'Real-Debrid and provider source filtering',
    share_lists: 'Public list sharing with friends',
    other: 'Other community ideas'
};
function calculatePercentage(part, total) {
    return total > 0 ? Math.round(part / total * 100) : 0;
}
function calculateActiveUsers(rawEvents = [], now = Date.now()) {
    const active24hSet = new Set();
    const active7dSet = new Set();
    const active30dSet = new Set();
    for (const ev of rawEvents){
        if (!ev || !ev.created_at) continue;
        const evTime = new Date(ev.created_at).getTime();
        if (isNaN(evTime)) continue;
        const diff = now - evTime;
        const identifier = ev.user_id || ev.metadata?.ip || ev.metadata?.source || null;
        if (!identifier) continue;
        if (diff <= ONE_DAY_MS) active24hSet.add(identifier);
        if (diff <= SEVEN_DAYS_MS) active7dSet.add(identifier);
        if (diff <= THIRTY_DAYS_MS) active30dSet.add(identifier);
    }
    return {
        activeUsers24h: active24hSet.size,
        activeUsers7d: active7dSet.size,
        activeUsers30d: active30dSet.size
    };
}
function calculateUserPreferenceMetrics(users = []) {
    let trackWatchlistUsers = 0;
    let autoSyncUsers = 0;
    let syncPreviouslyWatchedUsers = 0;
    let quality1080pUsers = 0;
    let quality4kUsers = 0;
    let totalListsCount = 0;
    let usersWithCustomListsCount = 0;
    const userSettingsMap = new Map();
    for (const u of users){
        if (!u) continue;
        if (u.id) {
            userSettingsMap.set(u.id, u.settings || {});
        }
        const s = u.settings || {};
        if (s.trackWatchlistWatched !== false) trackWatchlistUsers++;
        if (s.autoSyncWatched) autoSyncUsers++;
        if (s.syncPreviouslyWatched) syncPreviouslyWatchedUsers++;
        if (s.minQuality === '4k') {
            quality4kUsers++;
        } else {
            quality1080pUsers++;
        }
        const lists = u.customLists || [];
        if (lists.length > 0) {
            usersWithCustomListsCount++;
            totalListsCount += lists.length;
        }
    }
    return {
        userSettingsMap,
        trackWatchlistUsers,
        autoSyncUsers,
        syncPreviouslyWatchedUsers,
        quality1080pUsers,
        quality4kUsers,
        totalListsCount,
        usersWithCustomListsCount
    };
}
function calculateWatchlistItemMetrics(allUserItems = [], userSettingsMap, isItemReadyFn) {
    let readyCount = 0;
    let waitingCount = 0;
    let watchedCount = 0;
    let activeWatchlistCount = 0;
    for (const entry of allUserItems){
        const item = entry?.item;
        if (!item) continue;
        const isWatched = Boolean(item.isWatched || item.watched);
        if (isWatched) {
            watchedCount++;
            continue;
        }
        activeWatchlistCount++;
        const userSettings = userSettingsMap.get(entry.userId) || {};
        const userMinQuality = userSettings.minQuality || '1080p';
        const isReady = isItemReadyFn ? isItemReadyFn(item, userMinQuality) : Boolean(item.has1080pPlus || item.isReady);
        if (isReady) {
            readyCount++;
        } else {
            waitingCount++;
        }
    }
    return {
        readyCount,
        waitingCount,
        watchedCount,
        activeWatchlistCount
    };
}
/**
 * Checks whether an event is a duplicate or misattributed QR scan event.
 */ function isIgnoredOrDuplicateQrEvent(ev, serverScanTimestamps) {
    if (ev?.event_name !== 'qr_code_scanned') return false;
    // 1. Mislabeled configure clicks from desktop/web Stremio
    if (ev?.metadata?.source === 'stremio_configure') {
        return true;
    }
    // 2. Client-side mirror event when a server event exists within 60s
    const hasIp = Boolean(ev?.metadata?.ip);
    if (!hasIp && ev?.metadata?.source === 'stremio_tv_qr' && ev?.created_at) {
        const evTime = new Date(ev.created_at).getTime();
        if (!isNaN(evTime)) {
            const isDuplicate = serverScanTimestamps.some((serverTime)=>Math.abs(serverTime - evTime) <= 60000);
            if (isDuplicate) return true;
        }
    }
    return false;
}
function calculateEventFunnelMetrics(rawEvents = []) {
    let manifestCopiedCount = 0;
    let installClickedCount = 0;
    let qrScannedCount = 0;
    let curatedListAddedEvents = 0;
    const eventCounts = {};
    // Collect genuine server QR scan timestamps for client deduplication
    const serverScanTimestamps = [];
    for (const ev of rawEvents){
        if (ev?.event_name === 'qr_code_scanned' && ev?.metadata?.ip && ev?.created_at) {
            const t = new Date(ev.created_at).getTime();
            if (!isNaN(t)) serverScanTimestamps.push(t);
        }
    }
    for (const ev of rawEvents){
        const name = ev?.event_name;
        if (!name) continue;
        if (name === 'qr_code_scanned') {
            if (isIgnoredOrDuplicateQrEvent(ev, serverScanTimestamps)) {
                continue;
            }
            qrScannedCount++;
        } else if (name === 'addon_manifest_copied') {
            manifestCopiedCount++;
        } else if (name === 'addon_install_clicked') {
            installClickedCount++;
        } else if (name === 'curated_list_added') {
            curatedListAddedEvents++;
        }
        eventCounts[name] = (eventCounts[name] || 0) + 1;
    }
    const eventsBreakdown = Object.entries(eventCounts).map(([eventName, count])=>({
            eventName,
            count
        })).sort((a, b)=>b.count - a.count);
    return {
        manifestCopiedCount,
        installClickedCount,
        qrScannedCount,
        curatedListAddedEvents,
        eventsBreakdown
    };
}
function formatPollMetrics(pollResults = {}) {
    const totalPollVotes = pollResults?.totalVotes || 0;
    const rawVotes = pollResults?.breakdown || pollResults?.votes || {};
    const breakdown = Object.entries(rawVotes).map(([option, count])=>{
        const label = POLL_OPTION_LABELS[option] || option;
        const countNum = Number(count || 0);
        return {
            option: label,
            rawOption: option,
            count: countNum,
            percentage: calculatePercentage(countNum, totalPollVotes)
        };
    }).sort((a, b)=>b.count - a.count);
    const rawFeedback = pollResults?.customFeedback || pollResults?.feedbackList || [];
    const customFeedback = (Array.isArray(rawFeedback) ? rawFeedback : []).map((fb)=>({
            customText: fb.customText || fb.text || fb.custom_text || '',
            option: POLL_OPTION_LABELS[fb.option] || fb.option || '',
            createdAt: fb.createdAt || fb.created_at || ''
        })).filter((fb)=>Boolean(fb.customText));
    return {
        totalVotes: totalPollVotes,
        breakdown,
        customFeedback
    };
}
function formatRecentEvents(rawEvents = [], limit = 20) {
    return (rawEvents || []).slice(0, limit).map((ev)=>({
            eventName: ev.event_name,
            createdAt: ev.created_at,
            metadata: ev.metadata
        }));
}
function calculateNotificationMetrics(users = [], rawEvents = []) {
    let enabledUsers = 0;
    let emailUsers = 0;
    let telegramUsers = 0;
    let discordUsers = 0;
    for (const u of users){
        const s = u?.settings || {};
        if (!s.notificationsEnabled) continue;
        enabledUsers++;
        if (s.emailNotificationsEnabled) emailUsers++;
        if (s.telegramNotificationsEnabled && s.telegramChatId) telegramUsers++;
        if (s.discordNotificationsEnabled && (s.discordWebhookUrl || s.hasDiscordWebhook)) {
            discordUsers++;
        }
    }
    let sentTotal = 0;
    let sentEmail = 0;
    let sentTelegram = 0;
    let sentDiscord = 0;
    let clickedTotal = 0;
    let clickedEmail = 0;
    let clickedTelegram = 0;
    let clickedDiscord = 0;
    for (const ev of rawEvents){
        if (!ev) continue;
        if (ev.event_name === 'notification_sent') {
            const channels = Array.isArray(ev.metadata?.channels) ? ev.metadata.channels : [];
            sentTotal += channels.length || 1;
            if (channels.includes('email')) sentEmail++;
            if (channels.includes('telegram')) sentTelegram++;
            if (channels.includes('discord')) sentDiscord++;
        } else if (ev.event_name === 'notification_link_clicked') {
            clickedTotal++;
            const ch = ev.metadata?.channel;
            if (ch === 'email') clickedEmail++;
            else if (ch === 'telegram') clickedTelegram++;
            else if (ch === 'discord') clickedDiscord++;
        }
    }
    return {
        enabledUsers,
        enabledPercent: calculatePercentage(enabledUsers, users.length),
        emailUsers,
        telegramUsers,
        discordUsers,
        sentTotal,
        sentEmail,
        sentTelegram,
        sentDiscord,
        clickedTotal,
        clickedEmail,
        clickedTelegram,
        clickedDiscord
    };
}
function buildAdminAnalyticsReport(snapshot) {
    const users = snapshot.users || [];
    const allUserItems = snapshot.allUserItems || [];
    const rawEvents = snapshot.rawEvents || [];
    const totalUsers = users.length;
    const activeUsers = calculateActiveUsers(rawEvents);
    const prefs = calculateUserPreferenceMetrics(users);
    const itemMetrics = calculateWatchlistItemMetrics(allUserItems, prefs.userSettingsMap, snapshot.isItemReady);
    const funnel = calculateEventFunnelMetrics(rawEvents);
    const notifications = calculateNotificationMetrics(users, rawEvents);
    const pollResults = formatPollMetrics(snapshot.pollResults);
    const recentEvents = formatRecentEvents(rawEvents, 20);
    const totalWatchlistItems = itemMetrics.activeWatchlistCount;
    const totalTrackedItems = allUserItems.length;
    const avgMoviesPerUser = totalUsers > 0 ? Number((totalWatchlistItems / totalUsers).toFixed(1)) : 0;
    return {
        kpis: {
            totalUsers,
            activeUsers24h: activeUsers.activeUsers24h,
            activeUsers7d: activeUsers.activeUsers7d,
            activeUsers30d: activeUsers.activeUsers30d,
            totalWatchlistItems,
            totalTrackedItems,
            readyWatchlistItems: itemMetrics.readyCount,
            waitingWatchlistItems: itemMetrics.waitingCount,
            watchedWatchlistItems: itemMetrics.watchedCount,
            avgMoviesPerUser,
            totalCustomLists: prefs.totalListsCount
        },
        serviceAdoption: {
            addon: {
                manifestCopiedCount: funnel.manifestCopiedCount,
                installClickedCount: funnel.installClickedCount,
                qrScannedCount: funnel.qrScannedCount
            },
            watchedSync: {
                trackWatchlistUsers: prefs.trackWatchlistUsers,
                trackWatchlistPercent: calculatePercentage(prefs.trackWatchlistUsers, totalUsers),
                autoSyncUsers: prefs.autoSyncUsers,
                autoSyncPercent: calculatePercentage(prefs.autoSyncUsers, totalUsers),
                syncPreviouslyWatchedUsers: prefs.syncPreviouslyWatchedUsers,
                syncPreviouslyWatchedPercent: calculatePercentage(prefs.syncPreviouslyWatchedUsers, totalUsers)
            },
            quality: {
                quality1080pUsers: prefs.quality1080pUsers,
                quality4kUsers: prefs.quality4kUsers,
                quality1080pPercent: calculatePercentage(prefs.quality1080pUsers, totalUsers),
                quality4kPercent: calculatePercentage(prefs.quality4kUsers, totalUsers)
            },
            customLists: {
                usersWithCustomLists: prefs.usersWithCustomListsCount,
                curatedListAddedEvents: funnel.curatedListAddedEvents
            },
            notifications
        },
        topMovies: snapshot.topMovies || [],
        pollResults,
        eventsBreakdown: funnel.eventsBreakdown,
        recentEvents,
        generatedAt: new Date().toISOString()
    };
}
const adminAnalyticsService = {
    calculatePercentage,
    calculateActiveUsers,
    calculateUserPreferenceMetrics,
    calculateWatchlistItemMetrics,
    calculateEventFunnelMetrics,
    calculateNotificationMetrics,
    formatPollMetrics,
    formatRecentEvents,
    buildAdminAnalyticsReport
};

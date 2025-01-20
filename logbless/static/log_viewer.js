window.onload = async function () {
    const CHUNK_SIZE = 500;
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}/;

    let groupedLogs = [];

    let visibleStartAll = 0;
    let visibleEndAll = -1;

    let isSearchMode = false;

    let filteredIndexes = [];

    let visibleStartSearch = 0;
    let visibleEndSearch = -1;

    const logContainer = document.getElementById("log-container");
    const dateFilter = document.getElementById("date-filter");
    const levelFilter = document.getElementById("log-type-filter");
    const searchInput = document.getElementById("search");
    const searchButton = document.getElementById("search-button");
    const refreshButton = document.getElementById("refresh-button");
    const topButton = document.getElementById("top-button");
    const bottomButton = document.getElementById("bottom-button");


    function groupLogs(lines) {
        const result = [];
        let current = '';
        lines.forEach(line => {
            if (DATE_REGEX.test(line)) {
                if (current) {
                    result.push(current.trim());
                }
                current = line;
            } else {
                current += '\n' + line;
            }
        });
        if (current) {
            result.push(current.trim());
        }
        return result;
    }

    function highlightLog(log) {
        return log
            .replace(
                /\b(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})\b/g,
                '<span class="log-date">$1</span>'
            )
            .replace(
                /\b(INFO|ERROR|DEBUG|WARN)\b/g,
                '<span class="log-level $1">$1</span>'
            )
            .replace(
                /\(([a-zA-Z0-9_.\-]+\.py)\)/g,
                '(<span class="log-path">$1</span>)'
            );
    }

    function renderWindow(startIndex, endIndex, mode = 'replace', sourceArray = groupedLogs) {
        if (startIndex > endIndex || startIndex < 0) {
            return;
        }
        let html = '';
        for (let i = startIndex; i <= endIndex; i++) {
            const log = sourceArray[i];
            html += `<div class="log-line" data-index="${i}">${highlightLog(log)}</div>`;
        }

        if (mode === 'replace') {
            logContainer.innerHTML = html;
        } else if (mode === 'prepend') {
            const oldScrollHeight = logContainer.scrollHeight;
            const oldScrollTop = logContainer.scrollTop;

            logContainer.innerHTML = html + logContainer.innerHTML;

            const newScrollHeight = logContainer.scrollHeight;
            logContainer.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
        } else if (mode === 'append') {
            logContainer.innerHTML += html;
        }
    }

    function goToBottomAll() {
        const total = groupedLogs.length;
        if (total === 0) {
            logContainer.innerHTML = '(пусто)';
            visibleStartAll = 0;
            visibleEndAll = -1;
            return;
        }
        visibleEndAll = total - 1;
        visibleStartAll = Math.max(0, visibleEndAll - CHUNK_SIZE + 1);
        renderWindow(visibleStartAll, visibleEndAll, 'replace', groupedLogs);
        logContainer.scrollTop = logContainer.scrollHeight;
    }


    function justUpdate() {
        const oldEnd = visibleEndAll;
        const newEnd = groupedLogs.length - 1;

        if (newEnd > oldEnd) {
            renderWindow(oldEnd + 1, newEnd, 'append', groupedLogs);
            visibleEndAll = newEnd;
        }
    }

    function goToTopAll() {
        const total = groupedLogs.length;
        if (total === 0) {
            logContainer.innerHTML = '(пусто)';
            visibleStartAll = 0;
            visibleEndAll = -1;
            return;
        }
        visibleStartAll = 0;
        visibleEndAll = Math.min(CHUNK_SIZE - 1, total - 1);
        renderWindow(visibleStartAll, visibleEndAll, 'replace', groupedLogs);
        logContainer.scrollTop = 0;
    }

    function initAllLogs(scrollToBottom = true) {
        if (groupedLogs.length === 0) {
            logContainer.innerHTML = '(Ничего не найдено)';
            visibleStartAll = 0;
            visibleEndAll = -1;
            return;
        }
        if (scrollToBottom) {
            goToBottomAll();
        } else {
            justUpdate()
        }
    }

    function onScrollAllLogs() {
        if (groupedLogs.length === 0) return;
        const scrollTop = logContainer.scrollTop;
        const scrollHeight = logContainer.scrollHeight;
        const clientHeight = logContainer.clientHeight;

        if (scrollTop < 200 && visibleStartAll > 0) {
            const chunkSize = CHUNK_SIZE;
            const newEnd = visibleStartAll - 1;
            const newStart = Math.max(0, visibleStartAll - chunkSize);

            renderWindow(newStart, newEnd, 'prepend', groupedLogs);
            visibleStartAll = newStart;
        }

        if (scrollTop + clientHeight > scrollHeight - 200 && visibleEndAll < groupedLogs.length - 1) {
            const chunkSize = CHUNK_SIZE;
            const newStart = visibleEndAll + 1;
            const newEnd = Math.min(groupedLogs.length - 1, visibleEndAll + chunkSize);

            renderWindow(newStart, newEnd, 'append', groupedLogs);
            visibleEndAll = newEnd;
        }
    }

    function jumpToDate(dateString) {
        const idx = groupedLogs.findIndex(log => log.includes(dateString));
        if (idx === -1) {
            isSearchMode = true
            logContainer.innerHTML = `Дата ${dateString} не найдена`;
            visibleStartAll = 0;
            visibleEndAll = -1;
            return;
        }
        const halfWindow = 200;
        let start = Math.max(0, idx - halfWindow);
        let end = Math.min(groupedLogs.length - 1, start + CHUNK_SIZE - 1);

        if (idx > end) {
            end = idx + 1;
        }
        if (end > groupedLogs.length - 1) {
            end = groupedLogs.length - 1;
        }

        visibleStartAll = start;
        visibleEndAll = end;
        renderWindow(start, end, 'replace', groupedLogs);

        const lines = logContainer.querySelectorAll('.log-line');
        let found = null;
        for (const line of lines) {
            if (line.textContent.includes(dateString)) {
                found = line;
                break;
            }
        }
        if (found) {
            document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
            found.classList.add('highlight');
            logContainer.scrollTop = found.offsetTop - 150;
        }
    }

    function initSearchMode() {
        if (filteredIndexes.length === 0) {
            logContainer.innerHTML = '(Нет совпадений)';
            visibleStartSearch = 0;
            visibleEndSearch = -1;
            return;
        }
        visibleEndSearch = filteredIndexes.length - 1;
        visibleStartSearch = Math.max(0, visibleEndSearch - CHUNK_SIZE + 1);

        renderSearchWindow('replace');

        logContainer.scrollTop = logContainer.scrollHeight;
    }

    function renderSearchWindow(mode) {
        if (visibleStartSearch > visibleEndSearch) return;

        let html = '';
        for (let i = visibleStartSearch; i <= visibleEndSearch; i++) {
            const realIndex = filteredIndexes[i]; // индекс в groupedLogs
            const logText = groupedLogs[realIndex];
            html += `<div class="log-line" data-index="${realIndex}">${highlightLog(logText)}</div>`;
        }
        if (mode === 'replace') {
            logContainer.innerHTML = html;
        } else if (mode === 'prepend') {
            const oldScrollHeight = logContainer.scrollHeight;
            const oldScrollTop = logContainer.scrollTop;

            logContainer.innerHTML = html + logContainer.innerHTML;

            const newScrollHeight = logContainer.scrollHeight;
            logContainer.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
        } else if (mode === 'append') {
            logContainer.innerHTML += html;
        }
    }

    function onScrollSearchMode() {
        if (filteredIndexes.length === 0) return;

        const scrollTop = logContainer.scrollTop;
        const scrollHeight = logContainer.scrollHeight;
        const clientHeight = logContainer.clientHeight;

        if (scrollTop < 200 && visibleStartSearch > 0) {
            visibleStartSearch = Math.max(0, visibleStartSearch - CHUNK_SIZE);
            renderSearchWindow('prepend');
        }

        if (scrollTop + clientHeight > scrollHeight - 200 && visibleEndSearch < filteredIndexes.length - 1) {
            visibleEndSearch = Math.min(filteredIndexes.length - 1, visibleEndSearch + CHUNK_SIZE);
            renderSearchWindow('append');
        }
    }


    function doFilter(text, date, level) {
        const lowText = text.toLowerCase();
        const results = [];
        for (let i = 0; i < groupedLogs.length; i++) {
            const log = groupedLogs[i];
            if (text && !log.toLowerCase().includes(lowText)) {
                continue;
            }
            if (date && !log.includes(date)) {
                continue;
            }
            if (level && !log.includes(level)) {
                continue;
            }
            results.push(i);
        }
        return results;
    }


    function performSearch() {
        const text = searchInput.value.trim();
        const date = dateFilter.value.trim();
        const level = levelFilter.value.trim();

        if (!text && !date && !level) {
            isSearchMode = false;
            initAllLogs(true);
            return;
        }

        if (date && !text && !level) {
            isSearchMode = false;
            jumpToDate(date);
            return;
        }

        isSearchMode = true;
        filteredIndexes = doFilter(text, date, level);
        initSearchMode();
    }

    async function refreshAllLogs(scrollToBottom = false) {
        try {
            const response = await fetch('/update', {
                method: 'GET',
                credentials: 'include',
            });
            if (response.ok) {
                let data = await response.text();
                data = data.trim();
                if (data.startsWith('"') && data.endsWith('"')) {
                    data = data.slice(1, -1);
                }
                const lines = data.replace(/\\n/g, '\n').split('\n');
                groupedLogs = groupLogs(lines);

                if (!isSearchMode) {
                    initAllLogs(scrollToBottom);
                } else {
                    const text = searchInput.value.trim();
                    const date = dateFilter.value.trim();
                    filteredIndexes = doFilter(text, date);
                    initSearchMode();
                }
            } else {
                console.error('Ошибка при получении логов:', response.statusText);
            }
        } catch (err) {
            console.error('Ошибка сети:', err);
        }
    }

    await refreshAllLogs(true);

    logContainer.addEventListener('scroll', () => {
        if (isSearchMode) {
            onScrollSearchMode();
        } else {
            onScrollAllLogs();
        }
    });

    setInterval(() => {
        refreshAllLogs(false);
    }, 1000);

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    dateFilter.addEventListener('change', performSearch);
    levelFilter.addEventListener('change', performSearch);

    refreshButton.addEventListener('click', () => {
        searchInput.value = '';
        dateFilter.value = '';
        levelFilter.value = '';
        isSearchMode = false;
        initAllLogs(true);
    });

    topButton.addEventListener('click', () => {
        if (!isSearchMode) {
            goToTopAll();
        } else {
            visibleStartSearch = 0;
            visibleEndSearch = Math.min(filteredIndexes.length - 1, CHUNK_SIZE - 1);
            renderSearchWindow('replace');
            logContainer.scrollTop = 0;
        }
    });
    bottomButton.addEventListener('click', () => {
        if (!isSearchMode) {
            goToBottomAll();
        } else {
            visibleEndSearch = filteredIndexes.length - 1;
            visibleStartSearch = Math.max(0, visibleEndSearch - (CHUNK_SIZE - 1));
            renderSearchWindow('replace');
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    });

}
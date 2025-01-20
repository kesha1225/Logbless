window.onload = async function () {
    const CHUNK_SIZE = 500;
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}/;

    let groupedLogs = [];

    let visibleStartAll = 0;
    let visibleEndAll = -1;

    let isSearchMode = false;
    let isDateJumpMode = false;

    let filteredIndexes = [];

    let visibleStartSearch = 0;
    let visibleEndSearch = -1;

    const logContainer = document.getElementById("log-container");
    const levelFilter = document.getElementById("log-type-filter");
    const searchInput = document.getElementById("search");
    const searchButton = document.getElementById("search-button");
    const refreshButton = document.getElementById("refresh-button");
    const topButton = document.getElementById("top-button");
    const bottomButton = document.getElementById("bottom-button");
    const startDate = document.getElementById("startDate");
    const startTime = document.getElementById("startTime");
    const endDate = document.getElementById("endDate");
    const endTime = document.getElementById("endTime");


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
            return;
        }

        if (!isDateJumpMode) {
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

    function parseDate(str) {
        const parts = str.split('-');
        if (parts.length !== 3) return null;
        const dd = parseInt(parts[2], 10) || 1;
        const mm = parseInt(parts[1], 10) - 1 || 0;
        const yyyy = parseInt(parts[0], 10) || 1970;
        return new Date(yyyy, mm, dd, 0, 0, 0, 0);
    }

    function parseTime(str) {
        if (!str) return [0, 0];
        const [hh, mm] = str.split(':');
        return [
            parseInt(hh, 10) || 0,
            parseInt(mm, 10) || 0
        ];
    }

    function jumpToDate(dateString, dateTimeString) {
        const dateObj = parseDate(dateString);
        if (!dateObj) {
            isSearchMode = true;
            logContainer.innerHTML = `Некорректная дата: "${dateString}"`;
            visibleStartAll = 0;
            visibleEndAll = -1;
            return;
        }

        let idx;
        let bestDate;

        idx = groupedLogs.findIndex(log => log.includes(dateString));
        if (idx === -1) {
            isSearchMode = true;
            logContainer.innerHTML = `Дата "${dateString}" не найдена`;
            visibleStartAll = 0;
            visibleEndAll = -1;
            return;
        }

        if (!dateTimeString) {
            bestDate = dateString
        } else {
            let [hours, minutes] = parseTime(dateTimeString || '');
            dateObj.setHours(hours, minutes, 0, 0);

            let bestDiff = Number.MAX_SAFE_INTEGER;

            for (let i = 0; i < groupedLogs.length; i++) {
                const log = groupedLogs[i];
                const match = log.match(DATE_REGEX);
                if (!match) continue;

                const parts = match[0].split(/[\s:\-,]+/);

                if (parts.length < 3) continue;
                const dd = parseInt(parts[2], 10) || 1;
                const mm = parseInt(parts[1], 10) - 1 || 0;
                const yy = parseInt(parts[0], 10) || 1970;

                let HH = 0, MM = 0, SS = 0, MS = 0;
                if (parts[3]) HH = parseInt(parts[3], 10) || 0;
                if (parts[4]) MM = parseInt(parts[4], 10) || 0;
                if (parts[5]) SS = parseInt(parts[5], 10) || 0;
                if (parts[6]) MS = parseInt(parts[6], 10) || 0;

                const logDate = new Date(yy, mm, dd, HH, MM, SS, MS);


                const diff = Math.abs(logDate.getTime() - dateObj.getTime());
                if (diff < bestDiff) {
                    bestDiff = diff;
                    idx = i;

                    let year = new Intl.DateTimeFormat('en', {year: 'numeric'}).format(logDate);
                    let month = new Intl.DateTimeFormat('en', {month: '2-digit'}).format(logDate);
                    let day = new Intl.DateTimeFormat('en', {day: '2-digit'}).format(logDate);
                    let hour = new Intl.DateTimeFormat('en', {hour: '2-digit', hourCycle: 'h23'}).format(logDate);
                    let minute = new Intl.DateTimeFormat('en', {minute: '2-digit'}).format(logDate);
                    let seconds = new Intl.DateTimeFormat('en', {second: '2-digit'}).format(logDate);
                    bestDate = `${year}-${month}-${day} ${hour}:${minute}:${seconds}`
                }
            }
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
            if (line.textContent.includes(bestDate)) {
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

    function initSearchMode(scrollToBottom = true) {
        if (filteredIndexes.length === 0) {
            logContainer.innerHTML = '(Нет совпадений)';
            visibleStartSearch = 0;
            visibleEndSearch = -1;
            return;
        }

        if (scrollToBottom) {
            visibleEndSearch = filteredIndexes.length - 1;
            visibleStartSearch = Math.max(0, visibleEndSearch - CHUNK_SIZE + 1);
        }


        renderSearchWindow('replace');

        if (scrollToBottom) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }

    }

    function renderSearchWindow(mode) {
        if (visibleStartSearch > visibleEndSearch) return;

        let html = '';

        for (let i = visibleStartSearch; i <= visibleEndSearch; i++) {
            const realIndex = filteredIndexes[i];
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


    function doFilter(text, level) {
        const lowText = text.toLowerCase();
        const results = [];

        const startDateValue = startDate.value;
        const startTimeValue = startTime.value

        const endDateValue = endDate.value;
        const endTimeValue = endTime.value

        let startDateD = null

        let endDateD = null

        if (startDateValue) {
            startDateD = new Date(startDateValue);
        }
        if (endDateValue) {
            endDateD = new Date(endDateValue);
        }

        for (let i = 0; i < groupedLogs.length; i++) {
            const log = groupedLogs[i];
            if (text && !log.toLowerCase().includes(lowText)) continue;
            if (level && !log.includes(level)) continue;

            if (startDateD && endDateD) {
                if (startTimeValue) {
                    let [hours, minutes] = parseTime(startTimeValue || '');
                    startDateD.setHours(hours, minutes, 0, 0);
                } else {
                    startDateD.setHours(0, 0, 0, 0);
                }
                if (endTimeValue) {
                    let [hours, minutes] = parseTime(endTimeValue || '');
                    endDateD.setHours(hours, minutes, 0, 0);
                } else {
                    endDateD.setHours(23, 59, 0, 0);
                }

                const match = log.match(DATE_REGEX);
                if (!match) continue;
                const dtStr = match[0].trim();
                let dtParsed = null;
                if (dtStr) {
                    const parts = dtStr.split(/[\s:\-,]+/);
                    if (parts.length >= 3) {
                        const [yyyy, mm, dd, HH, MM, SS, MMM] = parts;
                        dtParsed = new Date(
                            parseInt(yyyy, 10),
                            parseInt(mm, 10) - 1,
                            parseInt(dd, 10),
                            parseInt(HH, 10),
                            parseInt(MM, 10),
                        );
                    }
                }
                if (!dtParsed) {
                    continue;
                }

                if (startDateD && (dtParsed < startDateD)) {
                    continue;
                }
                if (endDateD && (dtParsed > endDateD)) {
                    continue;
                }
            }

            results.push(i);
        }
        return results;
    }


    function performSearch() {
        const text = searchInput.value.trim();
        const level = levelFilter.value.trim();
        const hasDateRange = startDate.value || endDate.value;
        if (!text && !level && !hasDateRange) {
            isSearchMode = false;
            isDateJumpMode = false
            initAllLogs(true);
            return;
        }
        if (!text && !level && startDate.value && !endDate.value) {
            isSearchMode = false;
            isDateJumpMode = true;
            jumpToDate(startDate.value, startTime.value);
            return;
        }

        isSearchMode = true;
        isDateJumpMode = false
        filteredIndexes = doFilter(text, level);
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

                if (!isSearchMode || isDateJumpMode) {
                    initAllLogs(scrollToBottom);
                } else {
                    const text = searchInput.value.trim();
                    const level = levelFilter.value.trim();
                    filteredIndexes = doFilter(text, level);
                    initSearchMode(scrollToBottom);
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
        console.log(isSearchMode)
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
    levelFilter.addEventListener('change', performSearch);

    startDate.addEventListener('change', updateTimeFields);
    endDate.addEventListener('change', updateTimeFields);
    startDate.addEventListener('change', performSearch);
    endDate.addEventListener('change', performSearch);
    endTime.addEventListener('change', performSearch);
    startTime.addEventListener('change', performSearch);

    levelFilter.addEventListener('change', performSearch);
    refreshButton.addEventListener('click', () => {
        searchInput.value = '';
        startDate.value = '';
        endDate.value = '';
        startTime.value = '';
        endTime.value = '';
        levelFilter.value = '';
        isSearchMode = false;
        initAllLogs(true);
        updateTimeFields()
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


    function updateTimeFields() {
        startTime.value = '';
        endTime.value = '';

        startTime.disabled = !startDate.value;
        endTime.disabled = !endDate.value;
    }


    updateTimeFields();
}
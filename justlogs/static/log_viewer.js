window.onload = function () {
    let allLogs = [];
    const logContainer = document.getElementById("log-container");
    const searchInput = document.getElementById("search");
    const dateFilter = document.getElementById("date-filter");
    const searchButton = document.getElementById("search-button");
    const refreshButton = document.getElementById("refresh-button");
    const logTypeFilter = document.getElementById("log-type-filter");

    const scrollToBottom = () => {
        logContainer.scrollTop = logContainer.scrollHeight;
    };

    const highlightLogs = (text) => {
        const logLines = text.split('\n');
        const groupedLogs = [];
        let currentLog = '';

        const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}/;

        logLines.forEach(line => {
            if (dateRegex.test(line)) {
                if (currentLog) {
                    groupedLogs.push(currentLog.trim());
                }
                currentLog = line;
            } else {
                currentLog += '\n' + line;
            }
        });

        if (currentLog) {
            groupedLogs.push(currentLog.trim());
        }

        const highlightedLogs = groupedLogs.map(log => {
            return `<div class="log-line">` +
                log
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
                    ) +
                `</div>`;
        }).join('');

        logContainer.innerHTML = highlightedLogs;
    };

    const scrollToLineContaining = (text, scrollBottom = true) => {
        const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}/;

        let currentLog = '';
        const groupedLogs = [];

        allLogs.forEach(line => {
            if (dateRegex.test(line)) {
                if (currentLog) {
                    groupedLogs.push(currentLog.trim());
                }
                currentLog = line;
            } else {
                currentLog += '\n' + line;
            }
        });

        if (currentLog) {
            groupedLogs.push(currentLog.trim());
        }

        const targetLog = groupedLogs.find(log => log.includes(text));

        if (targetLog) {
            highlightLogs(groupedLogs.join('\n').replace(/\\n/g, "\n"));

            const logLines = logContainer.querySelectorAll(".log-line");
            const targetIndex = groupedLogs.indexOf(targetLog);
            const targetElement = logLines[targetIndex];

            if (targetElement) {
                if (scrollBottom) {
                    logContainer.scrollTop = Math.max(0, targetElement.offsetTop - 140);
                }
                targetElement.classList.add('highlight');
                setTimeout(() => {
                    targetElement.classList.remove('highlight');
                }, 1000);
            }
        }
    };

    const refreshAllLogs = async () => {
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

                allLogs = data.replace(/\\n/g, "\n").split('\n');

                searchLogs(false)
            } else if (response.status === 401) {
                console.error("User not authenticated");
            } else {
                console.error("Ошибка при получении логов:", response.statusText);
            }
        } catch (error) {
            console.error("Ошибка сети:", error);
        }
    };

    const refreshLogs = async (scrollBottom = true) => {
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

                allLogs = data.replace(/\\n/g, "\n").split('\n');
                highlightLogs(data.replace(/\\n/g, "\n"));

                if (scrollBottom) {
                    scrollToBottom();
                }

            } else if (response.status === 401) {
                console.error("User not authenticated");
            } else {
                console.error("Ошибка при получении логов:", response.statusText);
            }
        } catch (error) {
            console.error("Ошибка сети:", error);
        }
    };

    const searchLogs = (scrollBottom = true) => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedDate = dateFilter.value;
        const selectedLogType = logTypeFilter.value; // Получаем выбранный тип лога

        if (!searchTerm && !selectedDate && !selectedLogType) {
            refreshLogs(scrollBottom);
            return;
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}/;

        const groupedLogs = [];
        let currentLog = '';

        allLogs.forEach(line => {
            if (dateRegex.test(line)) {
                if (currentLog) {
                    groupedLogs.push(currentLog.trim());
                }
                currentLog = line;
            } else {
                currentLog += '\n' + line;
            }
        });

        if (currentLog) {
            groupedLogs.push(currentLog.trim());
        }

        const filteredLogs = groupedLogs.filter(log => {
            const matchesSearchTerm = searchTerm ? log.toLowerCase().includes(searchTerm) : true;
            const matchesDate = selectedDate ? log.includes(selectedDate) : true;
            const matchesLogType = selectedLogType ? log.includes(selectedLogType) : true;
            return matchesSearchTerm && matchesDate && matchesLogType;
        });

        highlightLogs(filteredLogs.join('\n'));

        if (scrollBottom) {
            scrollToBottom();
        }
    };

    let lastSelectedDate = null;

    const filterByDate = (scrollBottom = true) => {
        const selectedDate = dateFilter.value;

        if (!selectedDate) {
            refreshLogs();
            return;
        }

        const searchTerm = searchInput.value.toLowerCase();

        if (searchTerm && selectedDate) {
            searchLogs();
            return;
        }

        lastSelectedDate = selectedDate;
        scrollToLineContaining(selectedDate, scrollBottom);
    };

    setInterval(refreshAllLogs, 500);

    refreshButton.addEventListener('click', () => {
        searchInput.value = '';
        dateFilter.value = '';
        refreshLogs();
    });
    dateFilter.addEventListener('change', filterByDate);

    searchButton.addEventListener('click', () => {
        searchLogs(true)
    });

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === "Enter") {
            searchLogs();
        }
    });

    searchInput.addEventListener('input', () => {
        if (searchInput.value === '') {
            searchLogs(true);
        }
    });

    logTypeFilter.addEventListener('change', () => {
        searchLogs(true);
    });

    refreshLogs();
};
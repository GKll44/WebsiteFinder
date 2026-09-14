/* app.js —— 搜索与渲染主逻辑 */
(function () {
    "use strict";

    /* 从全局读取站点数据 */
    var SITE_DB = window.SITE_DB || [];

    /* 页面元素 */
    var input = document.querySelector('input[type="search"]');
    var btn = input ? input.nextElementSibling : null;
    var resultsEl = document.getElementById("results");

    var MAX_RESULTS = 12;

    /* 工具函数 */
    function normalize(str) {
        return String(str == null ? "" : str)
            .toLowerCase()
            .replace(/[\s\u3000\-_·・,，.。!！?？'"“”‘’()（）]/g, "");
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    /* 子序列匹配：如 "mc" 可命中 "minecraft" */
    function isSubsequence(needle, hay) {
        var i = 0;
        for (var j = 0; j < hay.length && i < needle.length; j++) {
            if (hay[j] === needle[i]) i++;
        }
        return i === needle.length;
    }

    /* 打分：名称 100 / 外号 90 / 描述 20，精确 > 前缀 > 包含 > 模糊 */
    function scoreSite(site, nq) {
        var best = 0;

        function judge(text, weight) {
            if (!text) return;
            var s = 0;
            if (text === nq) {
                s = weight + 30;
            } else if (text.indexOf(nq) === 0) {
                s = weight + 15;
            } else if (text.indexOf(nq) > -1) {
                s = weight;
            } else if (nq.length >= 2 && isSubsequence(nq, text)) {
                s = weight * 0.35;
            }
            if (s > best) best = s;
        }

        judge(normalize(site.name), 100);
        (site.aliases || []).forEach(function (a) { judge(normalize(a), 90); });
        judge(normalize(site.desc), 20);

        return best;
    }

    /* 渲染 */
    function renderIdle() {
        resultsEl.innerHTML = '<span class="hint">搜索一个试试！</span>';
    }

    function renderEmpty(query) {
        resultsEl.innerHTML =
            '<span class="hint">(°ー°〃)</span>' +
            '<span class="hint">没有找到相关网站...</span>';
    }

    function renderList(sites) {
        resultsEl.innerHTML = sites.map(cardHTML).join("");
    }

    function cardHTML(site) {
        var aliasTags = (site.aliases || [])
            .slice(0, 5)
            .map(function (a) { return '<span class="alias-tag">' + escapeHtml(a) + "</span>"; })
            .join("");

        var aliasBlock = aliasTags ? '<div class="alias-row">' + aliasTags + "</div>" : "";
        var links = site.links || [];

        if (links.length === 1) {
            return '<a class="link-card" href="' + escapeHtml(links[0].url) + '" target="_blank" rel="noopener noreferrer">' +
                "<h3>" + escapeHtml(site.name) + "</h3>" +
                "<p>" + escapeHtml(site.desc) + "</p>" +
                aliasBlock +
                "</a>";
        }

        var linkButtons = links.map(function (l) {
            return '<a href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener noreferrer">' +
                escapeHtml(l.label) + "</a>";
        }).join("");

        return '<div class="link-card">' +
            "<h3>" + escapeHtml(site.name) + "</h3>" +
            "<p>" + escapeHtml(site.desc) + "</p>" +
            aliasBlock +
            '<div class="link-row">' + linkButtons + "</div>" +
            "</div>";
    }

    /* 搜索主逻辑 */
    function search(rawQuery) {
        var query = String(rawQuery == null ? "" : rawQuery).trim();

        if (!query) {
            renderIdle();
            return;
        }

        var nq = normalize(query);
        if (!nq) {
            renderIdle();
            return;
        }

        var scored = [];
        for (var i = 0; i < SITE_DB.length; i++) {
            var s = scoreSite(SITE_DB[i], nq);
            if (s > 0) scored.push({ site: SITE_DB[i], score: s, index: i });
        }

        scored.sort(function (a, b) {
            if (b.score !== a.score) return b.score - a.score;
            return a.index - b.index;
        });

        if (!scored.length) {
            renderEmpty(query);
            return;
        }

        renderList(scored.slice(0, MAX_RESULTS).map(function (x) { return x.site; }));
    }

    /* 事件绑定 */
    if (btn) {
        btn.addEventListener("click", function () {
            search(input.value);
        });
    }

    if (input) {
        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.keyCode === 13) {
                e.preventDefault();
                search(input.value);
            }
        });

        var timer = null;
        input.addEventListener("input", function () {
            if (timer) clearTimeout(timer);
            timer = setTimeout(function () {
                search(input.value);
            }, 180);
        });
    }

    /* 初始化 */
    renderIdle();
})();
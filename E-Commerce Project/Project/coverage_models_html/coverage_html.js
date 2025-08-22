coverage = {};

coverage.assign_shortkeys = function () {
    $("*[class*='shortkey_']").each(function (i, e) {
        $.each($(e).attr("class").split(" "), function (i, c) {
            if (/^shortkey_/.test(c)) {
                $(document).bind('keydown', c.substr(9), function () {
                    $(e).click();
                });
            }
        });
    });
};

coverage.wire_up_help_panel = function () {
    $("#keyboard_icon").click(function () {
        $(".help_panel").show();
        var koff = $("#keyboard_icon").offset();
        var poff = $("#panel_icon").position();
        $(".help_panel").offset({
            top: koff.top - poff.top,
            left: koff.left - poff.left
        });
    });
    $("#panel_icon").click(function () {
        $(".help_panel").hide();
    });
};

coverage.index_ready = function ($) {
    var sort_list = [];
    var cookie_name = "COVERAGE_INDEX_SORT";
    var i;

    if (document.cookie.indexOf(cookie_name) > -1) {
        var cookies = document.cookie.split(";");
        for (i = 0; i < cookies.length; i++) {
            var parts = cookies[i].split("=");
            if ($.trim(parts[0]) === cookie_name && parts[1]) {
                sort_list = eval("[[" + parts[1] + "]]");
                break;
            }
        }
    }

    $.tablesorter.addWidget({
        id: "persistentSort",
        format: function (table) {
            if (table.config.sortList.length === 0 && sort_list.length > 0) {
                $(table).trigger('sorton', [sort_list]);
            }
            else {
                sort_list = table.config.sortList;
            }
        }
    });

    var headers = [];
    var col_count = $("table.index > thead > tr > th").length;

    headers[0] = { sorter: 'text' };
    for (i = 1; i < col_count - 1; i++) {
        headers[i] = { sorter: 'digit' };
    }
    headers[col_count - 1] = { sorter: 'percent' };

    $("table.index").tablesorter({
        widgets: ['persistentSort'],
        headers: headers
    });

    coverage.assign_shortkeys();
    coverage.wire_up_help_panel();

    $(window).unload(function () {
        document.cookie = cookie_name + "=" + sort_list.toString() + "; path=/";
    });
};

coverage.pyfile_ready = function ($) {
    var frag = location.hash;
    if (frag.length > 2 && frag[1] === 'n') {
        $(frag).addClass('highlight');
        coverage.set_sel(parseInt(frag.substr(2), 10));
    }
    else {
        coverage.set_sel(0);
    }

    $(document)
        .bind('keydown', 'j', coverage.to_next_chunk_nicely)
        .bind('keydown', 'k', coverage.to_prev_chunk_nicely)
        .bind('keydown', '0', coverage.to_top)
        .bind('keydown', '1', coverage.to_first_chunk);

    $(".button_toggle_run").click(function (evt) { coverage.toggle_lines(evt.target, "run"); });
    $(".button_toggle_exc").click(function (evt) { coverage.toggle_lines(evt.target, "exc"); });
    $(".button_toggle_mis").click(function (evt) { coverage.toggle_lines(evt.target, "mis"); });
    $(".button_toggle_par").click(function (evt) { coverage.toggle_lines(evt.target, "par"); });

    coverage.assign_shortkeys();
    coverage.wire_up_help_panel();
};

coverage.toggle_lines = function (btn, cls) {
    btn = $(btn);
    var hide = "hide_" + cls;
    if (btn.hasClass(hide)) {
        $("#source ." + cls).removeClass(hide);
        btn.removeClass(hide);
    }
    else {
        $("#source ." + cls).addClass(hide);
        btn.addClass(hide);
    }
};

coverage.line_elt = function (n) {
    return $("#t" + n);
};

coverage.num_elt = function (n) {
    return $("#n" + n);
};

coverage.code_container = function () {
    return $(".linenos");
};

coverage.set_sel = function (b, e) {
    coverage.sel_begin = b;
    coverage.sel_end = (e === undefined) ? b + 1 : e;
};

coverage.to_top = function () {
    coverage.set_sel(0, 1);
    coverage.scroll_window(0);
};

coverage.to_first_chunk = function () {
    coverage.set_sel(0, 1);
    coverage.to_next_chunk();
};

coverage.is_transparent = function (color) {
    return color === "transparent" || color === "rgba(0, 0, 0, 0)";
};

coverage.to_next_chunk = function () {
    var c = coverage;
    var probe = c.sel_end;
    while (true) {
        var probe_line = c.line_elt(probe);
        if (probe_line.length === 0) {
            return;
        }
        var color = probe_line.css("background-color");
        if (!c.is_transparent(color)) {
            break;
        }
        probe++;
    }
    var begin = probe;
    var next_color = color;
    while (next_color === color) {
        probe++;
        probe_line = c.line_elt(probe);
        next_color = probe_line.css("background-color");
    }
    c.set_sel(begin, probe);
    c.show_selection();
};

coverage.to_prev_chunk = function () {
    var c = coverage;
    var probe = c.sel_begin - 1;
    var probe_line = c.line_elt(probe);
    if (probe_line.length === 0) {
        return;
    }
    var color = probe_line.css("background-color");
    while (probe > 0 && c.is_transparent(color)) {
        probe--;
        probe_line = c.line_elt(probe);
        if (probe_line.length === 0) {
            return;
        }
        color = probe_line.css("background-color");
    }
    var end = probe + 1;
    var prev_color = color;
    while (prev_color === color) {
        probe--;
        probe_line = c.line_elt(probe);
        prev_color = probe_line.css("background-color");
    }
    c.set_sel(probe + 1, end);
    c.show_selection();
};

coverage.line_at_pos = function (pos) {
    var l1 = coverage.line_elt(1),
        l2 = coverage.line_elt(2),
        result;
    if (l1.length && l2.length) {
        var l1_top = l1.offset().top,
            line_height = l2.offset().top - l1_top,
            nlines = (pos - l1_top) / line_height;
        if (nlines < 1) {
            result = 1;
        }
        else {
            result = Math.ceil(nlines);
        }
    }
    else {
        result = 1;
    }
    return result;
};

coverage.selection_ends_on_screen = function () {
    if (coverage.sel_begin === 0) {
        return 0;
    }
    var top = coverage.line_elt(coverage.sel_begin);
    var next = coverage.line_elt(coverage.sel_end - 1);
    return (
        (top.isOnScreen() ? 1 : 0) +
        (next.isOnScreen() ? 1 : 0)
    );
};

coverage.to_next_chunk_nicely = function () {
    coverage.finish_scrolling();
    if (coverage.selection_ends_on_screen() === 0) {
        var win = $(window);
        coverage.select_line_or_chunk(coverage.line_at_pos(win.scrollTop()));
    }
    coverage.to_next_chunk();
};

coverage.to_prev_chunk_nicely = function () {
    coverage.finish_scrolling();
    if (coverage.selection_ends_on_screen() === 0) {
        var win = $(window);
        coverage.select_line_or_chunk(coverage.line_at_pos(win.scrollTop() + win.height()));
    }
    coverage.to_prev_chunk();
};

coverage.select_line_or_chunk = function (lineno) {
    var c = coverage;
    var probe_line = c.line_elt(lineno);
    if (probe_line.length === 0) {
        return;
    }
    var the_color = probe_line.css("background-color");
    if (!c.is_transparent(the_color)) {
        var probe = lineno;
        var color = the_color;
        while (probe > 0 && color === the_color) {
            probe--;
            probe_line = c.line_elt(probe);
            if (probe_line.length === 0) {
                break;
            }
            color = probe_line.css("background-color");
        }
        var begin = probe + 1;
        probe = lineno;
        color = the_color;
        while (color === the_color) {
            probe++;
            probe_line = c.line_elt(probe);
            color = probe_line.css("background-color");
        }
        coverage.set_sel(begin, probe);
    }
    else {
        coverage.set_sel(lineno);
    }
};

coverage.show_selection = function () {
    var c = coverage;
    c.code_container().find(".highlight").removeClass("highlight");
    for (var probe = c.sel_begin; probe > 0 && probe < c.sel_end; probe++) {
        c.num_elt(probe).addClass("highlight");
    }
    c.scroll_to_selection();
};

coverage.scroll_to_selection = function () {
    if (coverage.selection_ends_on_screen() < 2) {
        var top = coverage.line_elt(coverage.sel_begin);
        var top_pos = parseInt(top.offset().top, 10);
        coverage.scroll_window(top_pos - 30);
    }
};

coverage.scroll_window = function (to_pos) {
    $("html,body").animate({ scrollTop: to_pos }, 200);
};

coverage.finish_scrolling = function () {
    $("html,body").stop(true, true);
};

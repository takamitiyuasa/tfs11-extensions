TFS.module("Bigsan.TFSExtensions.EnhancedTaskBoard", [
    "TFS.Host"
], function () {
    var wiManager = TFS.OM.TfsTeamProjectCollection.getDefault().getService(TFS.WorkItemTracking.WorkItemStore).workItemManager;
    var res = TFS.Resources.Common;
    function log(msg) {
        console.log(msg);
    }
    function addCssRules() {
        var styleHtml = [
            '<style id="etb" type="text/css">', 
            '.daysAgo { float: left; padding: 0 4px; color: white; background: darkgreen; line-height: 18px; }', 
            '.daysAgo.recent { background: darkred; }', 
            '.tbPivotItem .daysAgo { margin-right: 4px; }', 
            '.tbPivotItem .witRemainingWork { float: left; margin-right: 4px; }', 
            '.tbPivotItem .pivot-state { line-height: 18px; font-weight: bold; border: dotted 1px gray; background: #ddd; padding: 0 2px; }', 
            '.tbPivotItem .ellipsis { float: left; }', 
            '.tbPivotItem .ellipsis + .daysAgo { margin: 1px 4px 0 4px; }', 
            '.pivot-state.non-committed { background: red; color: white; }', 
            '.wiid { margin-right: 4px; font-size: 80%; text-decoration: underline; }', 
            '.daysAgo + .witTitle > .wiid { margin-left: 4px; }', 
            '.tile-dimmed { opacity: 0.2; }', 
            '</style>'
        ].join("");
        $("head").append(styleHtml);
    }
    function addIdToWorkItem(id) {
        var tile = $("#tile-" + id);
        var targets = tile;
        var action = TFS.Host.history.getCurrentState().action || "stories";
        if(action == "stories") {
            var pbi = $("#taskboard-table_p" + id);
            var pbi_summary = pbi.closest(".taskboard-row").next();
            targets = targets.add(pbi).add(pbi_summary);
        }
        targets.each(function (idx, el) {
            if($(el).find(".wiid").length == 0) {
                $(el).find(".witTitle").prepend("<strong class='wiid' />");
            }
            $(el).find(".witTitle .wiid").text(id);
        });
    }
    function addExtraInfoToWorkItem(id, data) {
        var action = TFS.Host.history.getCurrentState().action || "stories";
        var msecsAgo = (new Date()).getTime() - data.changedDate.getTime();
        var daysAgo = (msecsAgo / 86400000).toFixed(1);
        var daysAgoElement = $("<div class='daysAgo'>" + daysAgo + "d</div>").attr("title", "Last Changed: " + data.changedDate.toLocaleString());
        if(daysAgo < "2") {
            daysAgoElement.addClass("recent");
        }
        var tile = $("#tile-" + id);
        tile.find(".daysAgo").remove();
        tile.find(".witExtra").prepend(daysAgoElement.clone());
        var pbiCell = $("#taskboard-table_p" + id);
        if(pbiCell.length > 0 && action == "stories") {
            var summaryRow = pbiCell.closest(".taskboard-row").next();
            pbiCell.find(".daysAgo, .pivot-state").remove();
            summaryRow.find(".daysAgo, .pivot-state").remove();
            var stateElement = $("<span class='pivot-state'>" + data.state + "</span>");
            if(data.state != "Committed") {
                stateElement.addClass("non-committed");
            }
            pbiCell.find(".tbPivotItem .witRemainingWork").before(daysAgoElement.clone()).after(stateElement.clone());
            summaryRow.find(".tbPivotItem").append(daysAgoElement.clone()).append(stateElement.clone());
        }
    }
    function addToolbarButtons() {
        $(".hub-pivot-content").css("top", "+=40px");
        $("<div class='toolbar hub-pivot-toolbar'></div>").insertAfter($(".hub-pivot"));
        TFS.UI.Controls.Menus.MenuBar.createIn($(".hub-pivot-toolbar"), {
            items: [
                {
                    id: "expandAll",
                    text: res.ExpandAll,
                    title: res.ExpandAllToolTip,
                    showText: false,
                    icon: "icon-tree-expand-all"
                }, 
                {
                    id: "collapseAll",
                    text: res.CollapseAll,
                    title: res.CollapseAllToolTip,
                    showText: false,
                    icon: "icon-tree-collapse-all"
                }
            ],
            executeAction: function (e) {
                var cmd = e.get_commandName();
                switch(cmd) {
                    case "expandAll":
                        $(".taskboard-row-summary::visible").each(function (idx, el) {
                            $(el).prev().find(".taskboard-expander").click();
                        });
                        break;
                    case "collapseAll":
                        $(".taskboard-row-summary:not(:visible)").each(function (idx, el) {
                            $(el).prev().find(".taskboard-expander").click();
                        });
                        break;
                }
            }
        });
    }
    function addSelectFilter(title) {
        var template = [
            '<div class="select pivot-filter enhance" title="{title}">', 
            '<span class="title">{title}</span>', 
            '<ul class="pivot-filter-items">', 
            '<li class="pivot-filter-item" data-value="on" title="ON"><a href="#">ON</a></li>', 
            '<li class="pivot-filter-item selected" data-value="off" title="OFF"><a href="#">OFF</a></li>', 
            '</ul>', 
            '</div>'
        ].join("");
        return $(template).attr("title", title).find(".title").text(title).end().prependTo($(".filters:first"));
    }
    function toggleMaximizeWorkspace(max) {
        if(max) {
            $(".header-section").animate({
                "margin-top": "-=91px"
            });
            $(".content-section").animate({
                "top": "-=91px"
            });
        } else {
            $(".header-section").animate({
                "margin-top": "+=91px"
            });
            $(".content-section").animate({
                "top": "+=91px"
            });
        }
    }
    function getAllIds() {
        return $(".tbTile, .taskboard-parent[id]").map(function (idx, item) {
            return item.id.match(/\d+$/)[0];
        }).get();
    }
    function queryWorkItems(ids, callback) {
        wiManager.beginGetWorkItems(ids, function (items) {
            callback(items);
        });
    }
    function initQuery() {
        log("initQuery");
        var ids = getAllIds();
        $.each(ids, function (idx, item) {
            return addIdToWorkItem(item);
        });
        queryWorkItems(ids, function (workitems) {
            $.each(workitems, function (idx, wi) {
                var id = wi.getFieldValue("System.Id");
                var state = wi.getFieldValue("System.State");
                var changedDate = wi.getFieldValue("System.ChangedDate").value;
                addExtraInfoToWorkItem(id, {
                    changedDate: changedDate,
                    state: state
                });
            });
            log("queryWorkItems done");
        });
    }
    addCssRules();
    addToolbarButtons();
    var maxWksFilter = addSelectFilter("maximize workspace");
    TFS.Host.UI.PivotFilter.ensureEnhancements(maxWksFilter);
    maxWksFilter.bind("changed", function (n, t) {
        var val = t.value == "on";
        toggleMaximizeWorkspace(val);
    });
    wiManager.attachWorkItemChanged(function (sender, ea) {
        if(ea.change == "reset" || ea.change == "save-completed") {
            var wi = ea.workItem;
            var id = wi.getFieldValue("System.Id");
            var state = wi.getFieldValue("System.State");
            var changedDate = wi.getFieldValue("System.ChangedDate").value;
            window.setTimeout(function () {
                addIdToWorkItem(id);
                addExtraInfoToWorkItem(id, {
                    changedDate: changedDate,
                    state: state
                });
            }, 500);
        }
    });
    TFS.Host.history.attachNavigate("stories", function () {
        initQuery();
        log("onNaviage: stories");
    }, true);
    TFS.Host.history.attachNavigate("team", function () {
        log("onNavigate: team");
    }, true);
    initQuery();
});
